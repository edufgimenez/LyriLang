// Compartilhado entre o content script, o popup e a página de opções.
globalThis.LyriLang ??= (() => {
  const api = globalThis.browser ?? globalThis.chrome;

  const LANGUAGES = [
    'pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh-CN', 'zh-TW', 'ru',
    'nl', 'pl', 'tr', 'ar', 'hi', 'sv', 'uk', 'id', 'he', 'el',
  ];

  // Cores da letra: fundo, linha atual (e já cantadas) e próximas linhas.
  const DEFAULT_COLORS = { background: '#163041', active: '#ffffff', inactive: '#9fb3c8' };

  const isHexColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

  // Wallpaper: a imagem fica só no storage.local (grande demais para o sync).
  const WALLPAPER_KEY = 'wallpaper';
  const DEFAULT_WALLPAPER_DIM = 40; // % de escurecimento sobre a imagem
  const MAX_WALLPAPER_DIM = 80;

  const isImageDataUrl = (value) =>
    typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);

  async function getWallpaper() {
    const { [WALLPAPER_KEY]: stored } = await api.storage.local.get(WALLPAPER_KEY);
    return isImageDataUrl(stored?.dataUrl) ? stored.dataUrl : null;
  }

  function defaultLang() {
    const ui = api.i18n.getUILanguage?.() || 'en';
    if (LANGUAGES.includes(ui)) return ui;
    const base = ui.split('-')[0];
    if (base === 'zh') return 'zh-CN';
    return LANGUAGES.includes(base) ? base : 'en';
  }

  async function getSettings() {
    const stored = await api.storage.sync.get({
      enabled: true,
      targetLang: null,
      customColors: false,
      colors: null,
      backgroundMode: 'color',
      wallpaperDim: DEFAULT_WALLPAPER_DIM,
      textShadow: false,
    });
    const colors = { ...DEFAULT_COLORS };
    for (const key of Object.keys(DEFAULT_COLORS)) {
      if (isHexColor(stored.colors?.[key])) colors[key] = stored.colors[key];
    }
    const dim = Number(stored.wallpaperDim);
    return {
      enabled: stored.enabled,
      targetLang: stored.targetLang || defaultLang(),
      customColors: stored.customColors === true,
      colors,
      backgroundMode: stored.backgroundMode === 'image' ? 'image' : 'color',
      wallpaperDim: Number.isFinite(dim)
        ? Math.min(MAX_WALLPAPER_DIM, Math.max(0, Math.round(dim)))
        : DEFAULT_WALLPAPER_DIM,
      textShadow: stored.textShadow === true,
    };
  }

  // Preenche os elementos com data-i18n usando os textos de _locales.
  function localizePage() {
    document.documentElement.lang = api.i18n.getUILanguage?.() || 'en';
    for (const el of document.querySelectorAll('[data-i18n]')) {
      el.textContent = api.i18n.getMessage(el.dataset.i18n);
    }
  }

  return {
    api,
    LANGUAGES,
    DEFAULT_COLORS,
    WALLPAPER_KEY,
    DEFAULT_WALLPAPER_DIM,
    MAX_WALLPAPER_DIM,
    isHexColor,
    isImageDataUrl,
    getSettings,
    getWallpaper,
    localizePage,
  };
})();
