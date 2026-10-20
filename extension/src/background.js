const api = globalThis.browser ?? globalThis.chrome;

const GOOGLE_URL = 'https://translate.googleapis.com/translate_a/single';
const CHUNK_CHARS = 4500;
const LINE_CONCURRENCY = 4;
const CACHE_PREFIX = 'tr:';
const CACHE_MAX_ENTRIES = 200;

api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'translate') return false;
  translateLines(msg.lines, msg.target)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: String(err?.message ?? err) }));
  return true;
});

// Traduz `lines` para `target` e devolve as traduções na mesma ordem.
async function translateLines(lines, target) {
  const unique = [...new Set(lines)];
  const key = CACHE_PREFIX + target + ':' + (await sha1(unique.join('\n')));

  let entry = (await api.storage.local.get(key))[key];
  if (!entry) {
    const { translations, detected } = await translate(unique, target);
    entry = { t: translations, d: detected, at: Date.now() };
    await api.storage.local.set({ [key]: entry });
    pruneCache();
  }

  const byOriginal = new Map(unique.map((line, i) => [line, entry.t[i] ?? '']));
  return { translations: lines.map((line) => byOriginal.get(line)), detected: entry.d };
}

// Ponto único de troca do provedor de tradução.
async function translate(lines, target) {
  let detected = null;
  const translations = [];
  for (const chunk of chunkLines(lines)) {
    const result = await translateChunk(chunk, target);
    detected ??= result.detected;
    translations.push(...result.translations);
  }
  return { translations, detected };
}

async function translateChunk(lines, target) {
  const { text, detected } = await googleTranslate(lines.join('\n'), target);
  const translations = text.split('\n').map((s) => s.trim());
  if (translations.length === lines.length) return { translations, detected };

  // O tradutor juntou ou separou linhas: traduz uma a uma para manter o alinhamento.
  const perLine = await mapLimit(lines, LINE_CONCURRENCY, async (line) =>
    (await googleTranslate(line, target)).text.replace(/\n/g, ' ').trim()
  );
  return { translations: perLine, detected };
}

async function googleTranslate(text, target) {
  const params = new URLSearchParams({ client: 'gtx', sl: 'auto', tl: target, dt: 't' });
  const res = await fetch(`${GOOGLE_URL}?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ q: text }),
  });
  if (!res.ok) throw new Error(`Google Translate HTTP ${res.status}`);
  const data = await res.json();
  return {
    text: (data[0] ?? []).map((segment) => segment[0] ?? '').join(''),
    detected: data[2] ?? null,
  };
}

function chunkLines(lines) {
  const chunks = [];
  let current = [];
  let size = 0;
  for (const line of lines) {
    if (current.length && size + line.length + 1 > CHUNK_CHARS) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(line);
    size += line.length + 1;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function sha1(text) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function pruneCache() {
  const all = await api.storage.local.get(null);
  const entries = Object.entries(all).filter(([k]) => k.startsWith(CACHE_PREFIX));
  if (entries.length <= CACHE_MAX_ENTRIES) return;
  entries.sort(([, a], [, b]) => a.at - b.at);
  const stale = entries.slice(0, entries.length - CACHE_MAX_ENTRIES).map(([k]) => k);
  await api.storage.local.remove(stale);
}
