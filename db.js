// ── Gordijn Configurator — Supabase DB helper ─────────────────
// Vereist: supabase-config.js geladen vóór dit script.
// Valt terug op localStorage wanneer Supabase niet geconfigureerd is.
// ─────────────────────────────────────────────────────────────

const DB_TABLE  = 'artikelen';
const LS_KEY    = 'gordijn_artikelen';

// Alle velden die in de tabel opgeslagen worden
const DB_FIELDS = [
  'artikelnummer','omschrijving','hoogte_stof','breedte_stof',
  'patroon','patroonhoogte','patroonbreedte','prijs_per_m1',
  'krimpercentage','kamerhoog','lichtdoorlatenheid','voeren',
  'voering_prijs_per_m1','kantelbaar','doubleface','brandvertragend',
  'akoestiek','verzwaaringskoord','samenstelling',
];

let _client = null;

function dbClient() {
  if (_client) return _client;
  if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL.includes('YOUR_PROJECT')) return null;
  try {
    _client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    return _client;
  } catch { return null; }
}

function dbConfigured() { return dbClient() !== null; }

// Strip unknown keys so Supabase doesn't reject the row
function toRow(article) {
  const row = {};
  DB_FIELDS.forEach(f => { row[f] = article[f] ?? ''; });
  return row;
}

// ── LocalStorage helpers ──────────────────────────────────────
function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
}
function lsSave(obj) { localStorage.setItem(LS_KEY, JSON.stringify(obj)); }

// ── CRUD ─────────────────────────────────────────────────────

async function dbUpsertArticles(articles) {
  // articles: array of article objects or single object
  const rows = (Array.isArray(articles) ? articles : Object.values(articles)).map(toRow);

  // Always save to localStorage
  const local = lsLoad();
  rows.forEach(r => { local[r.artikelnummer] = r; });
  lsSave(local);

  const sb = dbClient();
  if (!sb) return { error: null, source: 'local' };

  const { error } = await sb.from(DB_TABLE).upsert(rows, { onConflict: 'artikelnummer' });
  return { error, source: 'supabase' };
}

async function dbLoadAll() {
  const sb = dbClient();
  if (!sb) {
    const local = lsLoad();
    return { data: local, error: null, source: 'local' };
  }

  const { data, error } = await sb.from(DB_TABLE).select(DB_FIELDS.join(',')).order('artikelnummer');
  if (error) {
    // Fallback to localStorage on network error
    return { data: lsLoad(), error, source: 'local' };
  }

  // Convert array → object keyed by artikelnummer, and sync to localStorage
  const obj = {};
  (data || []).forEach(r => { obj[r.artikelnummer] = r; });
  lsSave(obj);
  return { data: obj, error: null, source: 'supabase' };
}

async function dbDeleteArticle(artikelnummer) {
  const local = lsLoad();
  delete local[artikelnummer];
  lsSave(local);

  const sb = dbClient();
  if (!sb) return { error: null };
  const { error } = await sb.from(DB_TABLE).delete().eq('artikelnummer', artikelnummer);
  return { error };
}

async function dbDeleteAll() {
  lsSave({});

  const sb = dbClient();
  if (!sb) return { error: null };
  const { error } = await sb.from(DB_TABLE).delete().neq('artikelnummer', '');
  return { error };
}
