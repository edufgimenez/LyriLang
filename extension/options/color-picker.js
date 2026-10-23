// Seletor de cor próprio, usado no Firefox: lá o <input type="color"> abre a janela de cor do
// sistema (no Windows, a caixa "Cor" no canto da tela), que só aplica a cor no OK.
// Ele escreve no próprio input e dispara 'input' e 'change', como o seletor nativo.
globalThis.LyriLangColorPicker = (() => {
  const WIDTH = 240;
  const MARGIN = 8;
  const KEY_STEP = 0.01;
  const KEY_STEP_LARGE = 0.1;

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const toHex = (rgb) => '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
  const fromHex = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

  function hsvToRgb([h, s, v]) {
    const f = (n) => {
      const k = (n + h / 60) % 6;
      return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
    };
    return [f(5), f(3), f(1)];
  }

  function rgbToHsv(rgb) {
    const [r, g, b] = rgb.map((c) => c / 255);
    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);
    let h = 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, max ? d / max : 0, max];
  }

  function el(tag, className, attrs = {}) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  }

  let ui = null; // elementos do seletor, criados na primeira vez
  let target = null; // input sendo editado
  let hsv = [0, 0, 0];
  let changed = false;

  function build(t) {
    const root = el('div', 'picker', { role: 'dialog', 'aria-label': t('colorPicker') });
    root.hidden = true;
    const sv = el('div', 'picker-sv', { tabindex: '0', role: 'group', 'aria-label': t('colorSaturation') });
    const thumb = el('div', 'picker-sv-thumb');
    sv.append(thumb);

    const row = el('div', 'picker-row');
    const preview = el('span', 'picker-preview');
    const hue = el('input', 'picker-hue', { type: 'range', min: '0', max: '359', step: '1', 'aria-label': t('colorHue') });
    row.append(preview, hue);

    const fields = el('div', 'picker-fields');
    const field = (label, attrs) => {
      const wrap = el('label');
      const input = el('input', '', { spellcheck: 'false', autocomplete: 'off', ...attrs });
      wrap.append(input, Object.assign(el('span'), { textContent: label }));
      fields.append(wrap);
      return input;
    };
    const hex = field('HEX', { maxlength: '7' });
    const channels = ['R', 'G', 'B'].map((label) => field(label, { type: 'number', min: '0', max: '255' }));

    root.append(sv, row, fields);
    document.body.append(root);
    ui = { root, sv, thumb, preview, hue, hex, channels };

    sv.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      sv.setPointerCapture(event.pointerId);
      setFromPointer(event);
    });
    sv.addEventListener('pointermove', (event) => {
      if (sv.hasPointerCapture(event.pointerId)) setFromPointer(event);
    });
    sv.addEventListener('pointerup', commit);
    sv.addEventListener('keydown', (event) => {
      const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
      const move = moves[event.key];
      if (!move) return;
      event.preventDefault();
      const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
      hsv = [hsv[0], clamp(hsv[1] + move[0] * step, 0, 1), clamp(hsv[2] + move[1] * step, 0, 1)];
      apply();
    });

    hue.addEventListener('input', () => {
      hsv = [Number(hue.value), hsv[1], hsv[2]];
      apply();
    });
    hue.addEventListener('change', commit);

    hex.addEventListener('input', () => {
      const value = hex.value.trim().replace(/^#?/, '#');
      if (!/^#[0-9a-f]{6}$/i.test(value)) return;
      hsv = rgbToHsv(fromHex(value));
      apply('hex');
    });
    channels.forEach((input) => input.addEventListener('input', () => {
      if (input.value === '') return;
      hsv = rgbToHsv(channels.map((c) => clamp(Number(c.value) || 0, 0, 255)));
      apply('rgb');
    }));
    for (const input of [hex, ...channels]) {
      input.addEventListener('change', () => {
        commit();
        render();
      });
      // Sem o preventDefault, o Enter "clica" no input de cor que recebe o foco e reabre o seletor.
      input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        close({ refocus: true });
      });
    }

    // Fecha ao clicar fora (o clique no próprio input é tratado no attach).
    document.addEventListener('pointerdown', (event) => {
      if (target && !root.contains(event.target) && event.target !== target) close();
    }, true);
    // Em captura na janela: o Esc fecha só o seletor, não o painel lateral.
    addEventListener('keydown', (event) => {
      if (!target || event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      close({ refocus: true });
    }, true);
    addEventListener('resize', () => target && place());
  }

  function setFromPointer(event) {
    const rect = ui.sv.getBoundingClientRect();
    const s = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const v = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
    hsv = [hsv[0], s, v];
    apply();
  }

  // Grava a cor no input e avisa a página, como o seletor nativo faz enquanto arrasta.
  function apply(skip) {
    target.value = toHex(hsvToRgb(hsv));
    target.dispatchEvent(new Event('input', { bubbles: true }));
    changed = true;
    render(skip);
  }

  function commit() {
    if (!changed || !target) return;
    changed = false;
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function render(skip) {
    const rgb = hsvToRgb(hsv);
    const hex = toHex(rgb);
    ui.sv.style.setProperty('--hue', String(Math.round(hsv[0])));
    ui.thumb.style.left = `${hsv[1] * 100}%`;
    ui.thumb.style.top = `${(1 - hsv[2]) * 100}%`;
    ui.thumb.style.background = hex;
    ui.preview.style.background = hex;
    ui.hue.value = String(Math.round(hsv[0]));
    if (skip !== 'hex') ui.hex.value = hex.toUpperCase();
    if (skip !== 'rgb') ui.channels.forEach((input, i) => { input.value = String(Math.round(rgb[i])); });
  }

  // Abaixo do input, alinhado à direita; acima se não couber embaixo.
  function place() {
    const rect = target.getBoundingClientRect();
    const height = ui.root.offsetHeight;
    const below = rect.bottom + MARGIN + height <= innerHeight || rect.top - MARGIN - height < 0;
    const top = below ? rect.bottom + MARGIN : rect.top - MARGIN - height;
    const left = clamp(rect.right - WIDTH, MARGIN, innerWidth - WIDTH - MARGIN);
    ui.root.style.top = `${top + scrollY}px`;
    ui.root.style.left = `${left + scrollX}px`;
  }

  function open(input) {
    if (target) close();
    target = input;
    hsv = rgbToHsv(fromHex(input.value));
    changed = false;
    render();
    ui.root.hidden = false;
    place();
    ui.sv.focus();
  }

  // Pelo teclado, o foco volta para o input; num clique fora, fica onde a pessoa clicou.
  function close({ refocus = false } = {}) {
    if (!target) return;
    commit();
    ui.root.hidden = true;
    const input = target;
    target = null;
    if (refocus) input.focus();
  }

  function attach(inputs, t) {
    if (!ui) build(t);
    for (const input of inputs) {
      input.addEventListener('click', (event) => {
        event.preventDefault();
        if (target === input) close();
        else open(input);
      });
    }
  }

  return { attach };
})();
