(() => {
  const { api, getSettings, getWallpaper, buildWallpaperLayers, WALLPAPER_KEY } = globalThis.LyriLang;

  const LINE_SELECTOR = '[data-testid="lyrics-line"]';
  const TR_CLASS = 'lyrilang-tr';
  const REQUEST_DELAY = 150;
  const MAX_RETRY_DELAY = 60_000;
  const MAX_CACHED_LINES = 3000;

  const COLORS_STYLE_ID = 'lyrilang-colors';
  const WALLPAPER_ATTR = 'data-lyrilang-wallpaper';
  const CLEAR_ATTR = 'data-lyrilang-clear';
  // Container da letra na tela principal (o painel lateral também define as variáveis).
  const MAIN_HOLDER_SELECTOR =
    '[style*="--lyrics-color-background"]:not([data-testid="lyrics-npv-section"])';
  const APPEARANCE_KEYS = [
    'customColors', 'colors', 'backgroundMode', 'wallpaperDim', 'wallpaperFit', 'wallpaperPosition', 'textShadow',
  ];

  let settings = { enabled: false, targetLang: 'en', customColors: false, colors: null };
  let wallpaper = null; // { dataUrl, blurDataUrl, width, height }
  let wallpaperScroller = null;
  let wallpaperCheckPending = false;
  const translations = new Map(); // linha original -> tradução ('' = sem tradução)
  const pending = new Set();
  let generation = 0; // muda quando o idioma ou o liga/desliga mudam
  let requestTimer = null;
  let retryDelay = 0;

  const observer = new MutationObserver(() => {
    if (wallpaperActive()) scheduleWallpaperCheck();
    if (!settings.enabled) return;
    // Síncrono: o Spotify recria as linhas o tempo todo e a tradução não pode piscar.
    applyAll();
    scheduleRequest();
  });

  function getOriginal(line) {
    let text = '';
    for (const node of line.childNodes) {
      if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains(TR_CLASS)) continue;
      text += node.textContent;
    }
    return text.trim();
  }

  function applyAll() {
    for (const line of document.querySelectorAll(LINE_SELECTOR)) {
      const original = getOriginal(line);
      const translated = original ? translations.get(original) : undefined;
      const existing = line.querySelector(`:scope > .${TR_CLASS}`);

      if (!translated || translated.toLowerCase() === original.toLowerCase()) {
        existing?.remove();
        continue;
      }
      if (existing) {
        if (existing.textContent !== translated) existing.textContent = translated;
        continue;
      }
      const el = document.createElement('div');
      el.className = TR_CLASS;
      el.lang = settings.targetLang;
      el.dir = 'auto';
      el.textContent = translated;
      line.append(el);
    }
  }

  function removeAll() {
    document.querySelectorAll(`.${TR_CLASS}`).forEach((el) => el.remove());
  }

  function scheduleRequest(delay = REQUEST_DELAY) {
    if (requestTimer) return;
    requestTimer = setTimeout(() => {
      requestTimer = null;
      requestMissing();
    }, delay);
  }

  async function requestMissing() {
    if (!settings.enabled) return;

    const missing = new Set();
    for (const line of document.querySelectorAll(LINE_SELECTOR)) {
      const original = getOriginal(line);
      if (original && !translations.has(original) && !pending.has(original)) missing.add(original);
    }
    if (!missing.size) return;

    const lines = [...missing];
    const gen = generation;
    lines.forEach((l) => pending.add(l));

    try {
      const res = await api.runtime.sendMessage({ type: 'translate', lines, target: settings.targetLang });
      if (gen !== generation) return;
      if (!res || res.error) throw new Error(res?.error ?? 'sem resposta do background');

      if (translations.size > MAX_CACHED_LINES) translations.clear();
      lines.forEach((l, i) => translations.set(l, res.translations[i] ?? ''));
      retryDelay = 0;
      applyAll();
    } catch (err) {
      if (!api.runtime?.id) {
        // A extensão foi recarregada ou removida; este script ficou órfão.
        observer.disconnect();
        return;
      }
      if (gen !== generation) return;
      console.warn('[LyriLang] falha ao traduzir:', err);
      retryDelay = retryDelay ? Math.min(retryDelay * 2, MAX_RETRY_DELAY) : 2000;
      clearTimeout(requestTimer);
      requestTimer = null;
      scheduleRequest(retryDelay);
    } finally {
      if (gen === generation) lines.forEach((l) => pending.delete(l));
    }
  }

  function reset() {
    generation++;
    translations.clear();
    pending.clear();
    clearTimeout(requestTimer);
    requestTimer = null;
    retryDelay = 0;
    removeAll();
    if (settings.enabled) scheduleRequest(0);
  }

  function wallpaperActive() {
    return settings.customColors && settings.backgroundMode === 'image' && Boolean(wallpaper);
  }

  // O Spotify define as cores da letra em variáveis CSS inline no container
  // (--lyrics-color-*). Sobrescrevemos as variáveis, sem depender das classes,
  // que mudam a cada versão do Spotify.
  function applyAppearance() {
    let style = document.getElementById(COLORS_STYLE_ID);
    if (!settings.customColors) {
      style?.remove();
      markWallpaperScroller();
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.id = COLORS_STYLE_ID;
      (document.head ?? document.documentElement).append(style);
    }
    const { background, active, inactive } = settings.colors;
    const rules = [`[style*="--lyrics-color-background"] {
  --lyrics-color-background: ${background} !important;
  --lyrics-color-active: ${active} !important;
  --lyrics-color-passed: ${active} !important;
  --lyrics-color-inactive: ${inactive} !important;
  --lyrics-color-messaging: ${inactive} !important;
}`];
    if (wallpaperActive()) {
      rules.push(`${MAIN_HOLDER_SELECTOR} { --lyrics-color-background: transparent !important; }`);
      rules.push(`[${WALLPAPER_ATTR}] {
  background: ${buildWallpaperLayers(wallpaper, settings)} !important;
  background-color: ${background} !important;
}`);
      rules.push(`[${CLEAR_ATTR}] { background: none !important; }`);
    }
    if (settings.textShadow) {
      rules.push(`${MAIN_HOLDER_SELECTOR} ${LINE_SELECTOR} { text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8); }`);
    }
    style.textContent = rules.join('\n');
    markWallpaperScroller();
  }

  // A imagem vai no elemento que rola a letra: o fundo de um elemento com rolagem
  // fica parado enquanto o conteúdo passa por cima, como um papel de parede.
  function markWallpaperScroller() {
    const holder = wallpaperActive() ? document.querySelector(MAIN_HOLDER_SELECTOR) : null;
    if (!(holder && wallpaperScroller?.isConnected && wallpaperScroller.contains(holder))) {
      wallpaperScroller?.removeAttribute(WALLPAPER_ATTR);
      wallpaperScroller = holder ? findScrollParent(holder) : null;
      wallpaperScroller?.setAttribute(WALLPAPER_ATTR, '');
    }
    clearCoveringLayers(holder);
  }

  // O Spotify muda as camadas o tempo todo; verifica no máximo uma vez por quadro.
  function scheduleWallpaperCheck() {
    if (wallpaperCheckPending) return;
    wallpaperCheckPending = true;
    requestAnimationFrame(() => {
      wallpaperCheckPending = false;
      markWallpaperScroller();
    });
  }

  // Camadas grandes do Spotify entre o elemento que rola e a letra, que pintam um fundo
  // próprio (ex.: o degradê do "modo cinema" em faixas com videoclipe), cobririam a imagem.
  function clearCoveringLayers(holder) {
    const covering = new Set();
    if (holder && wallpaperScroller) {
      const minWidth = wallpaperScroller.clientWidth * 0.9;
      const minHeight = wallpaperScroller.clientHeight * 0.5;
      for (let node = holder; node && node !== wallpaperScroller; node = node.parentElement) {
        const parent = node.parentElement;
        if (!parent) break;
        const candidates = parent === wallpaperScroller ? [...parent.children] : [parent, ...parent.children];
        for (const el of candidates) {
          if (el === holder || holder.contains(el)) continue;
          if (paintsLargeBackground(el, minWidth, minHeight)) covering.add(el);
        }
      }
    }
    for (const el of document.querySelectorAll(`[${CLEAR_ATTR}]`)) {
      if (!covering.has(el)) el.removeAttribute(CLEAR_ATTR);
    }
    for (const el of covering) el.setAttribute(CLEAR_ATTR, '');
  }

  function paintsLargeBackground(el, minWidth, minHeight) {
    const rect = el.getBoundingClientRect();
    if (rect.width < minWidth || rect.height < minHeight) return false;
    // Já marcada: o fundo calculado agora é transparente por causa da própria marcação.
    if (el.hasAttribute(CLEAR_ATTR)) return true;
    const style = getComputedStyle(el);
    return style.backgroundImage !== 'none' || !/^(transparent|rgba\(.*,\s*0\))$/.test(style.backgroundColor);
  }

  function findScrollParent(el) {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
    }
    return null;
  }

  api.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'local') {
      if (!(WALLPAPER_KEY in changes)) return;
      wallpaper = await getWallpaper();
      applyAppearance();
      return;
    }
    if (area !== 'sync') return;
    const translationChanged = 'enabled' in changes || 'targetLang' in changes;
    const appearanceChanged = APPEARANCE_KEYS.some((key) => key in changes);
    if (!translationChanged && !appearanceChanged) return;
    settings = await getSettings();
    if (appearanceChanged) applyAppearance();
    if (translationChanged) reset();
  });

  Promise.all([getSettings(), getWallpaper()]).then(([s, storedWallpaper]) => {
    settings = s;
    wallpaper = storedWallpaper;
    applyAppearance();
    observer.observe(document.body, { childList: true, subtree: true });
    if (settings.enabled) scheduleRequest(0);
  });
})();
