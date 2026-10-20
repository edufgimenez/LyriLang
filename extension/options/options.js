const { api, DEFAULT_COLORS, isHexColor, getSettings, localizePage } = globalThis.LyriLang;

const toggle = document.getElementById('customColors');
const fields = document.getElementById('colorFields');
const preview = document.getElementById('preview');
const restoreButton = document.getElementById('restore');
const inputs = Object.fromEntries(
  [...document.querySelectorAll('input[data-color]')].map((input) => [input.dataset.color, input])
);

// Arrastar o seletor dispara muitos eventos; o storage.sync tem limite de escritas por minuto.
const SAVE_DELAY = 400;

let colors = { ...DEFAULT_COLORS };
let saveTimer = null;

function renderPreview() {
  for (const key of Object.keys(inputs)) {
    document.querySelector(`[data-hex="${key}"]`).textContent = colors[key].toUpperCase();
    preview.style.setProperty(`--c-${key}`, colors[key]);
  }
  fields.disabled = !toggle.checked;
  preview.classList.toggle('off', !toggle.checked);
}

function syncInputs() {
  for (const [key, input] of Object.entries(inputs)) input.value = colors[key];
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = null;
  api.storage.sync.set({ colors });
}

for (const [key, input] of Object.entries(inputs)) {
  input.addEventListener('input', () => {
    if (!isHexColor(input.value)) return;
    colors = { ...colors, [key]: input.value.toLowerCase() };
    renderPreview();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_DELAY);
  });
  input.addEventListener('change', save);
}

toggle.addEventListener('change', () => {
  renderPreview();
  api.storage.sync.set({ customColors: toggle.checked });
});

restoreButton.addEventListener('click', () => {
  colors = { ...DEFAULT_COLORS };
  syncInputs();
  renderPreview();
  save();
});

// Mantém o botão em sincronia se o popup mudar a opção com esta página aberta.
api.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !('customColors' in changes)) return;
  toggle.checked = changes.customColors.newValue === true;
  renderPreview();
});

localizePage();
getSettings().then((settings) => {
  colors = settings.colors;
  toggle.checked = settings.customColors;
  syncInputs();
  renderPreview();
});
