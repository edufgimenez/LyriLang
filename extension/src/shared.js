// Compartilhado entre o content script e o popup.
globalThis.LyriLang ??= (() => {
  const api = globalThis.browser ?? globalThis.chrome;

  const LANGUAGES = [
    'pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh-CN', 'zh-TW', 'ru',
    'nl', 'pl', 'tr', 'ar', 'hi', 'sv', 'uk', 'id', 'he', 'el',
  ];

  function defaultLang() {
    const ui = api.i18n.getUILanguage?.() || 'en';
    if (LANGUAGES.includes(ui)) return ui;
    const base = ui.split('-')[0];
    if (base === 'zh') return 'zh-CN';
    return LANGUAGES.includes(base) ? base : 'en';
  }

  async function getSettings() {
    const stored = await api.storage.sync.get({ enabled: true, targetLang: null });
    return { enabled: stored.enabled, targetLang: stored.targetLang || defaultLang() };
  }

  return { api, LANGUAGES, getSettings };
})();
