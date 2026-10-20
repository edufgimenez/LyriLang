const {
  api,
  DEFAULT_COLORS,
  WALLPAPER_KEY,
  MAX_WALLPAPER_DIM,
  WALLPAPER_FITS,
  isHexColor,
  isImageDataUrl,
  buildWallpaperLayers,
  getSettings,
  getWallpaper,
  localizePage,
} = globalThis.LyriLang;

// Arrastar os controles dispara muitos eventos; o storage.sync tem limite de escritas por minuto.
const SAVE_DELAY = 400;
// A imagem é reduzida e convertida para JPEG antes de ser guardada. 2560px cobre a área
// da letra em tela cheia mesmo em telas com zoom de 125-150%.
const MAX_IMAGE_SIDE = 2560;
const JPEG_QUALITY = 0.85;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
// Versão pequena e desfocada usada para preencher as laterais no encaixe "imagem inteira".
const BLUR_WIDTH = 320;
const BLUR_RADIUS = 12;
// Imagens mais estreitas que isto (largura/altura) começam em "imagem inteira".
const PORTRAIT_RATIO = 1.2;
// Acima desta ampliação estimada, avisamos que a imagem pode ficar borrada.
const MAX_SHARP_UPSCALE = 1.2;

const t = (key) => api.i18n.getMessage(key);
const $ = (id) => document.getElementById(id);

const toggle = $('customColors');
const fields = $('colorFields');
const preview = $('preview');
const restoreButton = $('restore');
const bgColorRow = $('bgColorRow');
const imageRows = $('imageRows');
const thumb = $('wallpaperThumb');
const noImage = $('noImage');
const pickButton = $('pickImage');
const removeButton = $('removeImage');
const fileInput = $('imageFile');
const imageError = $('imageError');
const positionRow = $('positionRow');
const positionInput = $('wallpaperPosition');
const positionValue = $('positionValue');
const lowResNote = $('lowResNote');
const dimInput = $('wallpaperDim');
const dimValue = $('dimValue');
const shadowInput = $('textShadow');
const modeInputs = [...document.querySelectorAll('input[name="backgroundMode"]')];
const fitInputs = [...document.querySelectorAll('input[name="wallpaperFit"]')];
const colorInputs = Object.fromEntries(
  [...document.querySelectorAll('input[data-color]')].map((input) => [input.dataset.color, input])
);

let colors = { ...DEFAULT_COLORS };
let backgroundMode = 'color';
let wallpaperDim = 0;
let wallpaperFit = 'cover';
let wallpaperPosition = 50;
let wallpaper = null; // { dataUrl, blurDataUrl, width, height }
const saveTimers = {};

function saveLater(key, getValue) {
  clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(() => saveNow(key, getValue()), SAVE_DELAY);
}

function saveNow(key, value) {
  clearTimeout(saveTimers[key]);
  api.storage.sync.set({ [key]: value });
}

function positionLabel(value) {
  if (value === 0) return t('positionTop');
  if (value === 50) return t('positionCenter');
  if (value === 100) return t('positionBottom');
  return `${value}%`;
}

// Estima quanto a imagem será ampliada na área da letra desta tela (≈75% x 80% da tela).
function estimatedUpscale() {
  if (!wallpaper?.width || !wallpaper?.height) return 0;
  const areaWidth = screen.width * 0.75;
  const areaHeight = screen.height * 0.8;
  const fit = wallpaperFit === 'contain' ? Math.min : Math.max;
  return fit(areaWidth / wallpaper.width, areaHeight / wallpaper.height) * devicePixelRatio;
}

function render() {
  for (const key of Object.keys(colorInputs)) {
    document.querySelector(`[data-hex="${key}"]`).textContent = colors[key].toUpperCase();
    preview.style.setProperty(`--c-${key}`, colors[key]);
  }

  const imageMode = backgroundMode === 'image';
  for (const input of modeInputs) input.checked = input.value === backgroundMode;
  for (const input of fitInputs) input.checked = input.value === wallpaperFit;
  bgColorRow.hidden = imageMode;
  imageRows.hidden = !imageMode;

  thumb.hidden = !wallpaper;
  if (wallpaper) thumb.src = wallpaper.dataUrl;
  noImage.hidden = Boolean(wallpaper);
  removeButton.hidden = !wallpaper;

  positionRow.hidden = wallpaperFit !== 'cover';
  positionInput.value = wallpaperPosition;
  positionValue.textContent = positionLabel(wallpaperPosition);
  dimInput.value = wallpaperDim;
  dimValue.textContent = `${wallpaperDim}%`;

  const lowRes = estimatedUpscale() > MAX_SHARP_UPSCALE;
  lowResNote.hidden = !lowRes;
  if (lowRes) lowResNote.textContent = t(wallpaperFit === 'cover' ? 'lowResCover' : 'lowResContain');

  preview.style.backgroundImage = '';
  preview.style.background = imageMode && wallpaper
    ? buildWallpaperLayers(wallpaper, { wallpaperDim, wallpaperFit, wallpaperPosition })
    : '';
  preview.style.backgroundColor = 'var(--c-background)';
  preview.classList.toggle('shadow', shadowInput.checked);

  fields.disabled = !toggle.checked;
  preview.classList.toggle('off', !toggle.checked);
}

function syncColorInputs() {
  for (const [key, input] of Object.entries(colorInputs)) input.value = colors[key];
}

function showImageError(key) {
  imageError.textContent = t(key);
  imageError.hidden = false;
}

async function processImage(file) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // Desenha um pouco maior que o canvas para o desfoque não escurecer as bordas.
    const blur = document.createElement('canvas');
    blur.width = BLUR_WIDTH;
    blur.height = Math.max(1, Math.round((BLUR_WIDTH * bitmap.height) / bitmap.width));
    const ctx = blur.getContext('2d');
    ctx.filter = `blur(${BLUR_RADIUS}px)`;
    const pad = BLUR_RADIUS * 2;
    ctx.drawImage(bitmap, -pad, -pad, blur.width + pad * 2, blur.height + pad * 2);

    const result = {
      dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
      blurDataUrl: blur.toDataURL('image/jpeg', 0.7),
      width: canvas.width,
      height: canvas.height,
    };
    if (!isImageDataUrl(result.dataUrl) || !isImageDataUrl(result.blurDataUrl)) {
      throw new Error('imagem inválida');
    }
    return result;
  } finally {
    bitmap.close?.();
  }
}

for (const [key, input] of Object.entries(colorInputs)) {
  input.addEventListener('input', () => {
    if (!isHexColor(input.value)) return;
    colors = { ...colors, [key]: input.value.toLowerCase() };
    render();
    saveLater('colors', () => colors);
  });
  input.addEventListener('change', () => saveNow('colors', colors));
}

for (const input of modeInputs) {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    backgroundMode = input.value;
    render();
    saveNow('backgroundMode', backgroundMode);
  });
}

for (const input of fitInputs) {
  input.addEventListener('change', () => {
    if (!input.checked || !WALLPAPER_FITS.includes(input.value)) return;
    wallpaperFit = input.value;
    render();
    saveNow('wallpaperFit', wallpaperFit);
  });
}

pickButton.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  fileInput.value = '';
  if (!file) return;
  imageError.hidden = true;
  if (file.size > MAX_FILE_SIZE) {
    showImageError('imageTooLarge');
    return;
  }
  try {
    const processed = await processImage(file);
    await api.storage.local.set({ [WALLPAPER_KEY]: { ...processed, updatedAt: Date.now() } });
    wallpaper = processed;
    backgroundMode = 'image';
    // Fotos em retrato ou quadradas começam inteiras; paisagens preenchem a área.
    wallpaperFit = processed.width / processed.height < PORTRAIT_RATIO ? 'contain' : 'cover';
    wallpaperPosition = 50;
    render();
    api.storage.sync.set({ backgroundMode, wallpaperFit, wallpaperPosition });
  } catch (err) {
    console.warn('[LyriLang] falha ao usar a imagem:', err);
    showImageError('imageError');
  }
});

removeButton.addEventListener('click', async () => {
  await api.storage.local.remove(WALLPAPER_KEY);
  wallpaper = null;
  backgroundMode = 'color';
  imageError.hidden = true;
  render();
  saveNow('backgroundMode', backgroundMode);
});

positionInput.addEventListener('input', () => {
  wallpaperPosition = Math.min(100, Math.max(0, Number(positionInput.value)));
  render();
  saveLater('wallpaperPosition', () => wallpaperPosition);
});
positionInput.addEventListener('change', () => saveNow('wallpaperPosition', wallpaperPosition));

dimInput.addEventListener('input', () => {
  wallpaperDim = Math.min(MAX_WALLPAPER_DIM, Math.max(0, Number(dimInput.value)));
  render();
  saveLater('wallpaperDim', () => wallpaperDim);
});
dimInput.addEventListener('change', () => saveNow('wallpaperDim', wallpaperDim));

shadowInput.addEventListener('change', () => {
  render();
  saveNow('textShadow', shadowInput.checked);
});

toggle.addEventListener('change', () => {
  render();
  saveNow('customColors', toggle.checked);
});

restoreButton.addEventListener('click', () => {
  colors = { ...DEFAULT_COLORS };
  syncColorInputs();
  render();
  saveNow('colors', colors);
});

// Mantém o botão em sincronia se o popup mudar a opção com esta página aberta.
api.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !('customColors' in changes)) return;
  toggle.checked = changes.customColors.newValue === true;
  render();
});

localizePage();
Promise.all([getSettings(), getWallpaper()]).then(([settings, storedWallpaper]) => {
  colors = settings.colors;
  backgroundMode = settings.backgroundMode;
  wallpaperDim = settings.wallpaperDim;
  wallpaperFit = settings.wallpaperFit;
  wallpaperPosition = settings.wallpaperPosition;
  wallpaper = storedWallpaper;
  toggle.checked = settings.customColors;
  shadowInput.checked = settings.textShadow;
  syncColorInputs();
  render();
});
