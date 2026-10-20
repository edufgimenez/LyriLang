const { api, LANGUAGES, getSettings } = globalThis.LyriLang;

const enabledInput = document.getElementById('enabled');
const langSelect = document.getElementById('targetLang');
const permissionBox = document.getElementById('permission');
const grantButton = document.getElementById('grant');

const origins = api.runtime.getManifest().host_permissions;

function fillLanguages() {
  const uiLang = api.i18n.getUILanguage?.() || 'pt-BR';
  const names = new Intl.DisplayNames([uiLang], { type: 'language' });
  const options = LANGUAGES.map((code) => {
    const name = names.of(code) ?? code;
    return { code, label: name.charAt(0).toLocaleUpperCase(uiLang) + name.slice(1) };
  }).sort((a, b) => a.label.localeCompare(b.label, uiLang));

  for (const { code, label } of options) langSelect.add(new Option(label, code));
}

async function refreshPermission() {
  const granted = await api.permissions.contains({ origins });
  permissionBox.hidden = granted;
}

enabledInput.addEventListener('change', () => {
  api.storage.sync.set({ enabled: enabledInput.checked });
});

langSelect.addEventListener('change', () => {
  api.storage.sync.set({ targetLang: langSelect.value });
});

// permissions.request precisa ser chamado direto no clique, sem await antes.
grantButton.addEventListener('click', () => {
  api.permissions.request({ origins }).then(refreshPermission);
});

fillLanguages();
getSettings().then(({ enabled, targetLang }) => {
  enabledInput.checked = enabled;
  langSelect.value = targetLang;
});
refreshPermission();
