// Painel lateral com a página de opções, aberto pelo popup na aba do Spotify.
// As mudanças aparecem na letra ao lado na hora, sem trocar de aba.
(() => {
  const { api, findScrollParent, MAIN_HOLDER_SELECTOR } = globalThis.LyriLang;

  const PANEL_CLASS = 'lyrilang-panel';
  const OPEN_CLASS = 'lyrilang-panel-open';
  const PANEL_URL = api.runtime.getURL('options/options.html?panel');
  // Origem das páginas da extensão (chrome-extension://id ou moz-extension://uuid).
  const EXTENSION_ORIGIN = api.runtime.getURL('').replace(/\/$/, '');
  const CLOSE_MESSAGE = 'lyrilang:closePanel';
  const GAP = 8;
  // Sem as barras do Spotify na página, usa a altura aproximada delas.
  const FALLBACK_TOP = 64;
  const FALLBACK_BOTTOM = 96;
  // Com a letra tocando e o mouse parado, o Spotify esconde as barras de cima e de baixo e a
  // área da letra cresce; o painel confere a posição de tempos em tempos enquanto está aberto.
  const PLACE_INTERVAL = 250;

  let panel = null;
  let removeTimer = null;
  let placeTimer = null;

  // Mesma altura da área da letra; sem a letra aberta, entre o cabeçalho e a barra do player.
  function panelBounds() {
    const holder = document.querySelector(MAIN_HOLDER_SELECTOR);
    const area = holder && findScrollParent(holder)?.getBoundingClientRect();
    if (area?.height) return { top: area.top, bottom: area.bottom };
    const nav = document.querySelector('[data-testid="global-nav-bar"]');
    const player = document.querySelector('[data-testid="now-playing-bar"]');
    return {
      top: nav ? nav.getBoundingClientRect().bottom : FALLBACK_TOP,
      bottom: player ? player.getBoundingClientRect().top - GAP : innerHeight - FALLBACK_BOTTOM,
    };
  }

  // A altura vai explícita: um iframe com top e bottom não estica (fica com 150px).
  // Em janelas baixas a área da letra passa da tela (o Spotify tem altura mínima); o painel
  // fica dentro da parte visível para o fim dele continuar alcançável.
  function placePanel() {
    if (!panel) return;
    const area = panelBounds();
    const top = Math.max(area.top, 0);
    const bottom = Math.min(area.bottom, innerHeight - GAP);
    const height = `${Math.max(0, Math.round(bottom - top))}px`;
    if (panel.style.height !== height) panel.style.height = height;
    panel.style.top = `${Math.round(top)}px`;
  }

  function openPanel() {
    clearTimeout(removeTimer);
    if (!panel) {
      panel = document.createElement('iframe');
      panel.className = PANEL_CLASS;
      panel.title = 'LyriLang';
      panel.src = PANEL_URL;
      // Só entra depois de carregar, para não deslizar vazio.
      panel.addEventListener('load', () => requestAnimationFrame(() => panel?.classList.add(OPEN_CLASS)), { once: true });
      document.body.append(panel);
    } else {
      panel.classList.add(OPEN_CLASS);
    }
    placePanel();
    panel.focus();
    clearInterval(placeTimer);
    placeTimer = setInterval(placePanel, PLACE_INTERVAL);
    addEventListener('resize', placePanel);
    addEventListener('keydown', onKeyDown, true);
  }

  // Remove o iframe depois da animação; ao abrir de novo, a página carrega com os valores atuais.
  function closePanel() {
    if (!panel) return;
    const closing = panel;
    closing.classList.remove(OPEN_CLASS);
    clearInterval(placeTimer);
    removeEventListener('resize', placePanel);
    removeEventListener('keydown', onKeyDown, true);
    removeTimer = setTimeout(() => {
      closing.remove();
      if (panel === closing) panel = null;
    }, 400);
  }

  function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    closePanel();
  }

  // O botão de fechar e o Esc dentro do painel avisam por postMessage.
  addEventListener('message', (event) => {
    if (event.origin === EXTENSION_ORIGIN && event.data?.type === CLOSE_MESSAGE) closePanel();
  });

  api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== 'openPanel') return false;
    openPanel();
    sendResponse({ opened: true });
    return false;
  });
})();
