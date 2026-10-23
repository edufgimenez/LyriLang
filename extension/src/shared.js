// Compartilhado entre o content script, o popup e a página de opções.
globalThis.LyriLang ??= (() => {
  const api = globalThis.browser ?? globalThis.chrome;

  const LANGUAGES = [
    'pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh-CN', 'zh-TW', 'ru',
    'nl', 'pl', 'tr', 'ar', 'hi', 'sv', 'uk', 'id', 'he', 'el',
  ];

  // Cores da letra: fundo, linha atual e outras linhas (próximas e já cantadas).
  const DEFAULT_COLORS = { background: '#163041', active: '#ffffff', inactive: '#9fb3c8' };

  const isHexColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

  // Wallpaper: a imagem fica só no storage.local (grande demais para o sync).
  const WALLPAPER_KEY = 'wallpaper';
  const DEFAULT_WALLPAPER_DIM = 40; // % de escurecimento sobre a imagem
  const MAX_WALLPAPER_DIM = 80;
  // Encaixe: 'cover' preenche a área (corta o que sobra); 'contain' mostra a imagem
  // inteira, com uma versão desfocada dela preenchendo as laterais.
  const WALLPAPER_FITS = ['cover', 'contain'];
  // Ponto de foco do modo 'cover', em % da imagem (X e Y). O ponto escolhido fica sempre
  // visível, qualquer que seja o lado cortado. A chave do Y continua 'wallpaperPosition'
  // para manter o que já foi salvo quando só existia a posição vertical.
  const DEFAULT_WALLPAPER_POSITION = 50;
  // Tamanho da área da letra no Spotify, medido pelo content script. A página de opções
  // usa para mostrar a prévia e o recorte no formato real.
  const LYRICS_AREA_KEY = 'lyricsArea';
  // Container da letra na tela principal do Spotify (o painel lateral também define as variáveis).
  const MAIN_HOLDER_SELECTOR =
    '[style*="--lyrics-color-background"]:not([data-testid="lyrics-npv-section"])';

  const isImageDataUrl = (value) =>
    typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);

  const clampInt = (value, min, max, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
  };

  // Devolve { dataUrl, blurDataUrl, width, height } ou null. blurDataUrl pode faltar
  // em imagens salvas antes da versão desfocada existir.
  async function getWallpaper() {
    const { [WALLPAPER_KEY]: stored } = await api.storage.local.get(WALLPAPER_KEY);
    if (!isImageDataUrl(stored?.dataUrl)) return null;
    return {
      dataUrl: stored.dataUrl,
      blurDataUrl: isImageDataUrl(stored.blurDataUrl) ? stored.blurDataUrl : null,
      width: clampInt(stored.width, 0, 100000, 0),
      height: clampInt(stored.height, 0, 100000, 0),
    };
  }

  // Devolve { width, height, dpr } da última vez que a letra foi aberta, ou null.
  async function getLyricsArea() {
    const { [LYRICS_AREA_KEY]: stored } = await api.storage.local.get(LYRICS_AREA_KEY);
    const width = clampInt(stored?.width, 0, 20000, 0);
    const height = clampInt(stored?.height, 0, 20000, 0);
    if (!width || !height) return null;
    const dpr = Number(stored.dpr);
    return { width, height, dpr: Number.isFinite(dpr) && dpr > 0 && dpr <= 8 ? dpr : 1 };
  }

  // Camadas CSS do fundo: escurecimento por cima e a imagem embaixo. No modo 'contain'
  // a imagem aparece inteira e a versão desfocada preenche as laterais.
  function buildWallpaperLayers(wallpaper, { wallpaperDim, wallpaperFit, wallpaperPositionX, wallpaperPosition }) {
    const dim = wallpaperDim / 100;
    const layers = [`linear-gradient(rgba(0, 0, 0, ${dim}), rgba(0, 0, 0, ${dim}))`];
    if (wallpaperFit === 'contain') {
      layers.push(`url("${wallpaper.dataUrl}") center / contain no-repeat`);
      if (wallpaper.blurDataUrl) layers.push(`url("${wallpaper.blurDataUrl}") center / cover no-repeat`);
    } else {
      layers.push(`url("${wallpaper.dataUrl}") ${wallpaperPositionX}% ${wallpaperPosition}% / cover no-repeat`);
    }
    return layers.join(', ');
  }

  // Elemento que rola a letra (recebe o wallpaper e serve de referência para o painel de opções).
  function findScrollParent(el) {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
    }
    return null;
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
      wallpaperFit: 'cover',
      wallpaperPositionX: DEFAULT_WALLPAPER_POSITION,
      wallpaperPosition: DEFAULT_WALLPAPER_POSITION,
      textShadow: false,
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
      backgroundMode: stored.backgroundMode === 'image' ? 'image' : 'color',
      wallpaperDim: clampInt(stored.wallpaperDim, 0, MAX_WALLPAPER_DIM, DEFAULT_WALLPAPER_DIM),
      wallpaperFit: WALLPAPER_FITS.includes(stored.wallpaperFit) ? stored.wallpaperFit : 'cover',
      wallpaperPositionX: clampInt(stored.wallpaperPositionX, 0, 100, DEFAULT_WALLPAPER_POSITION),
      wallpaperPosition: clampInt(stored.wallpaperPosition, 0, 100, DEFAULT_WALLPAPER_POSITION),
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
    WALLPAPER_FITS,
    DEFAULT_WALLPAPER_POSITION,
    LYRICS_AREA_KEY,
    MAIN_HOLDER_SELECTOR,
    isHexColor,
    isImageDataUrl,
    buildWallpaperLayers,
    findScrollParent,
    getSettings,
    getWallpaper,
    getLyricsArea,
    localizePage,
  };
})();
