const {
  api,
  DEFAULT_COLORS,
  WALLPAPER_KEY,
  MAX_WALLPAPER_DIM,
  isHexColor,
  isImageDataUrl,
  getSettings,
  getWallpaper,
  localizePage,
} = globalThis.LyriLang;

// Arrastar os controles dispara muitos eventos; o storage.sync tem limite de escritas por minuto.
const SAVE_DELAY = 400;
// A imagem é reduzida e convertida para JPEG antes de ser guardada.
const MAX_IMAGE_SIDE = 1920;
const JPEG_QUALITY = 0.85;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

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
const dimInput = $('wallpaperDim');
const dimValue = $('dimValue');
const shadowInput = $('textShadow');
const modeInputs = [...document.querySelectorAll('input[name="backgroundMode"]')];
const colorInputs = Object.fromEntries(
  [...document.querySelectorAll('input[data-color]')].map((input) => [input.dataset.color, input])
);

let colors = { ...DEFAULT_COLORS };
let backgroundMode = 'color';
let wallpaperDim = 0;
let wallpaper = null;
const saveTimers = {};

function saveLater(key, getValue) {
  clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(() => saveNow(key, getValue()), SAVE_DELAY);
}

function saveNow(key, value) {
  clearTimeout(saveTimers[key]);
  api.storage.sync.set({ [key]: value });
}

function render() {
  for (const key of Object.keys(colorInputs)) {
    document.querySelector(`[data-hex="${key}"]`).textContent = colors[key].toUpperCase();
    preview.style.setProperty(`--c-${key}`, colors[key]);
  }

  const imageMode = backgroundMode === 'image';
  for (const input of modeInputs) input.checked = input.value === backgroundMode;
  bgColorRow.hidden = imageMode;
  imageRows.hidden = !imageMode;

  thumb.hidden = !wallpaper;
  if (wallpaper) thumb.src = wallpaper;
  noImage.hidden = Boolean(wallpaper);
  removeButton.hidden = !wallpaper;

  dimInput.value = wallpaperDim;
  dimValue.textContent = `${wallpaperDim}%`;

  const dim = wallpaperDim / 100;
  preview.style.backgroundImage = imageMode && wallpaper
    ? `linear-gradient(rgba(0, 0, 0, ${dim}), rgba(0, 0, 0, ${dim})), url("${wallpaper}")`
    : '';
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
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  if (!isImageDataUrl(dataUrl)) throw new Error('imagem inválida');
  return dataUrl;
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
    const dataUrl = await processImage(file);
    await api.storage.local.set({ [WALLPAPER_KEY]: { dataUrl, updatedAt: Date.now() } });
    wallpaper = dataUrl;
    backgroundMode = 'image';
    render();
    saveNow('backgroundMode', backgroundMode);
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
  wallpaper = storedWallpaper;
  toggle.checked = settings.customColors;
  shadowInput.checked = settings.textShadow;
  syncColorInputs();
  render();
});
