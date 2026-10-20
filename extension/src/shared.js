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
    });
    const colors = { ...DEFAULT_COLORS };
    for (const key of Object.keys(DEFAULT_COLORS)) {
      if (isHexColor(stored.colors?.[key])) colors[key] = stored.colors[key];
    }
    return {
      enabled: stored.enabled,
      targetLang: stored.targetLang || defaultLang(),
      customColors: stored.customColors === true,
      colors,
    };
  }

  // Preenche os elementos com data-i18n usando os textos de _locales.
  function localizePage() {
    document.documentElement.lang = api.i18n.getUILanguage?.() || 'en';
    for (const el of document.querySelectorAll('[data-i18n]')) {
      el.textContent = api.i18n.getMessage(el.dataset.i18n);
    }
  }

  return { api, LANGUAGES, DEFAULT_COLORS, isHexColor, getSettings, localizePage };
})();
