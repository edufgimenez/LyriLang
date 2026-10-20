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

clearCacheButton.addEventListener('click', async () => {
  clearCacheButton.disabled = true;
  try {
    const res = await api.runtime.sendMessage({ type: 'clearCache' });
    if (!res || res.error) throw new Error(res?.error);
    cacheStatus.textContent =
      res.removed === 0 ? t('cacheClearedNone')
        : res.removed === 1 ? t('cacheClearedOne')
          : t('cacheClearedMany', String(res.removed));
  } catch {
    cacheStatus.textContent = t('cacheClearFailed');
  } finally {
    clearCacheButton.disabled = false;
  }
});

localize();
document.getElementById('about').href = api.runtime.getManifest().homepage_url;
fillLanguages();
getSettings().then(({ enabled, targetLang }) => {
  enabledInput.checked = enabled;
  langSelect.value = targetLang;
});
refreshPermission();
