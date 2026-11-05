/* ==========================================================================
   semantic-worker.js — NIKORA semantic search (module Web Worker)
   Runs Transformers.js off the main thread. Embeds products + queries and
   returns cosine similarities. Vectors are cached in IndexedDB.
   ========================================================================== */
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const DB_NAME = 'nikora-semantic-v1';
const STORE = 'vectors';
const BATCH = 8;

let extractorPromise = null;
let vectors = new Map();      // productId -> Float32Array
let generation = 0;           // bumps on every new index request (cancels stale ones)
const queryCache = new Map(); // normalized query -> Float32Array

const send = (type, data = {}) => self.postMessage({ type, ...data });

/* ---------- Model ---------- */
function loadModel() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL_ID, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (p) => {
        if (p.status === 'progress') send('progress', { file: p.file, progress: p.progress });
      },
    });
  }
  return extractorPromise;
}

async function embed(texts) {
  const extractor = await loadModel();
  const out = await extractor(texts, { pooling: 'mean', normalize: true });
  const dim = out.dims[1];
  return texts.map((_, i) => out.data.slice(i * dim, (i + 1) * dim));
}

/* ---------- IndexedDB vector cache ---------- */
let dbPromise = null;
const getDB = () =>
  (dbPromise ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  }));

async function cacheGet(key) {
  const db = await getDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => resolve(null);
  });
}

async function cachePut(key, value) {
  const db = await getDB();
  if (!db) return;
  try { db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key); } catch { /* non-fatal */ }
}

function hash(str) { // FNV-1a
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
const cacheKey = (text) => `${MODEL_ID}|${text.length}|${hash(text)}`;

/* ---------- Indexing ---------- */
async function indexProducts(items, gen) {
  const next = new Map();
  const missing = [];

  for (const it of items) {
    const key = cacheKey(it.text);
    const hit = await cacheGet(key);
    if (hit) next.set(it.id, hit);
    else missing.push({ ...it, key });
  }

  for (let i = 0; i < missing.length; i += BATCH) {
    if (gen !== generation) return; // superseded by a newer index request
    const chunk = missing.slice(i, i + BATCH);
    const vecs = await embed(chunk.map((c) => c.text));
    chunk.forEach((c, j) => { next.set(c.id, vecs[j]); cachePut(c.key, vecs[j]); });
    send('indexProgress', { done: Math.min(i + BATCH, missing.length), total: missing.length });
  }

  if (gen !== generation) return;
  vectors = next;
  send('indexed', { count: next.size, embedded: missing.length });
}

/* ---------- Querying ---------- */
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

async function embedQuery(text) {
  const key = text.trim().toLowerCase();
  if (queryCache.has(key)) return queryCache.get(key);
  const [vec] = await embed([text]);
  queryCache.set(key, vec);
  if (queryCache.size > 50) queryCache.delete(queryCache.keys().next().value);
  return vec;
}

/* ---------- Messages ---------- */
self.onmessage = async ({ data }) => {
  try {
    switch (data.type) {
      case 'warmup':
        await loadModel();
        send('ready');
        break;
      case 'index':
        await indexProducts(data.items, ++generation);
        break;
      case 'query': {
        const q = await embedQuery(data.text);
        const hits = [];
        for (const [id, vec] of vectors) hits.push({ id, score: dot(q, vec) });
        send('results', { requestId: data.requestId, hits });
        break;
      }
    }
  } catch (err) {
    send('error', { requestId: data.requestId, message: String(err?.message || err) });
  }
};
