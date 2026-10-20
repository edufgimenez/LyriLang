(() => {
  const { api, getSettings } = globalThis.LyriLang;

  const LINE_SELECTOR = '[data-testid="lyrics-line"]';
  const TR_CLASS = 'lyrilang-tr';
  const REQUEST_DELAY = 150;
  const MAX_RETRY_DELAY = 60_000;
  const MAX_CACHED_LINES = 3000;

  let settings = { enabled: false, targetLang: 'en' };
  const translations = new Map(); // linha original -> tradução ('' = sem tradução)
  const pending = new Set();
  let generation = 0; // muda quando o idioma ou o liga/desliga mudam
  let requestTimer = null;
  let retryDelay = 0;

  const observer = new MutationObserver(() => {
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

  api.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'sync' || !('enabled' in changes || 'targetLang' in changes)) return;
    settings = await getSettings();
    reset();
  });

  getSettings().then((s) => {
    settings = s;
    observer.observe(document.body, { childList: true, subtree: true });
    if (settings.enabled) scheduleRequest(0);
  });
})();
