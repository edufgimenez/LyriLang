const { api, LANGUAGES, getSettings } = globalThis.LyriLang;

const enabledInput = document.getElementById('enabled');
const langSelect = document.getElementById('targetLang');
const permissionBox = document.getElementById('permission');
const grantButton = document.getElementById('grant');
const clearCacheButton = document.getElementById('clearCache');
const cacheStatus = document.getElementById('cacheStatus');

const origins = api.runtime.getManifest().host_permissions;
const uiLang = api.i18n.getUILanguage?.() || 'en';
const t = (key, ...subs) => api.i18n.getMessage(key, subs);

function localize() {
  document.documentElement.lang = uiLang;
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
}

function fillLanguages() {
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

// O resultado aparece no próprio botão por alguns segundos, sem mudar o layout.
const CLEAR_FEEDBACK_MS = 2500;

clearCacheButton.addEventListener('click', async () => {
  clearCacheButton.disabled = true;
  let message;
  let ok = false;
  try {
    const res = await api.runtime.sendMessage({ type: 'clearCache' });
    if (!res || res.error) throw new Error(res?.error);
    message =
      res.removed === 0 ? t('cacheClearedNone')
        : res.removed === 1 ? t('cacheClearedOne')
          : t('cacheClearedMany', String(res.removed));
    ok = true;
  } catch {
    message = t('cacheClearFailed');
  }
  clearCacheButton.textContent = ok ? `✓ ${message}` : message;
  clearCacheButton.classList.toggle('done', ok);
  cacheStatus.textContent = message;
  setTimeout(() => {
    clearCacheButton.textContent = t('clearCache');
    clearCacheButton.classList.remove('done');
    clearCacheButton.disabled = false;
  }, CLEAR_FEEDBACK_MS);
});

const manifest = api.runtime.getManifest();
localize();
document.getElementById('about').href = manifest.homepage_url;
document.getElementById('version').textContent = `v${manifest.version}`;
fillLanguages();
getSettings().then(({ enabled, targetLang }) => {
  enabledInput.checked = enabled;
  langSelect.value = targetLang;
});
refreshPermission();
