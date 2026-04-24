// ── Gordijn Configurator — Supabase DB helper ─────────────────
// Vereist: supabase-config.js geladen vóór dit script.
// Valt terug op localStorage wanneer Supabase niet geconfigureerd is.
// ─────────────────────────────────────────────────────────────

const DB_TABLE  = 'artikelen';
const LS_KEY    = 'gordijn_artikelen';

// Kolommen die daadwerkelijk in de Supabase-tabel bestaan (zie schema.sql).
const DB_FIELDS = [
  'artikelnummer','gordijn_type','omschrijving','hoogte_stof','breedte_stof',
  'patroon','patroonhoogte','patroonbreedte','prijs_per_m1',
  'krimpercentage','kamerhoog','lichtdoorlatenheid','voeren',
  'voering_prijs_per_m1','kantelbaar','doubleface','brandvertragend',
  'akoestiek','verzwaaringskoord','samenstelling',
];
// Velden die alleen lokaal leven (niet in Supabase). Blijven bij merge behouden.
const LOCAL_EXTRA_FIELDS = ['kleuren'];

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

// Strip keys that don't exist in Supabase so the row is accepted.
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
  const items = Array.isArray(articles) ? articles : Object.values(articles);

  // LocalStorage bewaart het volledige artikel (incl. lokale extra velden).
  const local = lsLoad();
  items.forEach(a => {
    if (a && a.artikelnummer) local[a.artikelnummer] = { ...local[a.artikelnummer], ...a };
  });
  lsSave(local);

  const sb = dbClient();
  if (!sb) return { error: null, source: 'local' };

  // Supabase krijgt alleen de kolommen die in de tabel bestaan.
  const rows = items.map(toRow);
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
    // Schema-mismatch / netwerkfout → val terug op localStorage zonder die te overschrijven.
    return { data: lsLoad(), error, source: 'local' };
  }

  // Merge Supabase-rij met bestaande lokale extra velden (bijv. kleuren).
  const local = lsLoad();
  const obj = {};
  (data || []).forEach(r => {
    const existingLocal = local[r.artikelnummer] || {};
    const merged = { ...r };
    LOCAL_EXTRA_FIELDS.forEach(f => {
      if (existingLocal[f] !== undefined) merged[f] = existingLocal[f];
    });
    obj[r.artikelnummer] = merged;
  });
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

// ── Kleuren helpers (gedeeld tussen configurator en import) ──
const KLEUR_POOLS = [
  // Neutraal & naturel
  ['Wit','Gebroken wit','Crème','Ivoor','Ecru','Naturel','Champagne','Zand','Beige','Taupe','Lichtgrijs','Warm grijs','Koel grijs','Zilvergrijs','Grijs'],
  // Grijs & antraciet
  ['Wit','Gebroken wit','Platina','Zilvergrijs','Lichtgrijs','Warm grijs','Koel grijs','Grijs','Smoky','Donkergrijs','Antraciet','Grafiet','Carbon','Onyx','Zwart'],
  // Warm & hout
  ['Crème','Zand','Beige','Hazelnoot','Caramel','Cognac','Licht eiken','Eiken','Donker eiken','Walnoot','Mocha','Chocolade','Bruin','Taupe','Antraciet'],
  // Blauw
  ['Wit','Ecru','Lichtblauw','Hemelsblauw','Denim','Jeansblauw','Aquamarijn','Petroleum','Blauw','Marine','Donkerblauw','Navy','Indigo','Grijs','Antraciet','Zwart'],
  // Groen & aarde
  ['Gebroken wit','Naturel','Mintgroen','Salie','Jade','Olijf','Khaki','Mosgroen','Bosgroen','Donkergroen','Taupe','Beige','Bruin','Antraciet','Zwart'],
  // Warm & contrast
  ['Wit','Crème','Poederroze','Oudroze','Zalm','Koraal','Terracotta','Roest','Rood','Bordeaux','Aubergine','Mosterd','Oker','Cognac','Grijs','Zwart'],
  // Koel & modern
  ['Wit','Gebroken wit','Platina','Zilvergrijs','IJsblauw','Lichtblauw','Lavendel','Lila','Mauve','Grijs','Antraciet','Navy','Denim','Zwart','Onyx','Carbon'],
  // Rijk & decoratief
  ['Crème','Champagne','Goud','Koper','Terracotta','Cognac','Bordeaux','Aubergine','Indigo','Navy','Petroleum','Bosgroen','Olijf','Chocolade','Walnoot','Zwart'],
];

function parseKleuren(str) {
  return String(str || '')
    .split(/[;,]/)
    .map(s => s.trim())
    .filter(Boolean);
}

// Vul fictieve kleuren aan (14–16 per artikel) voor artikelen met < 10 kleuren.
// Kleuren leven alleen in localStorage (geen Supabase-kolom).
async function seedKleuren(saved) {
  let changed = false;
  let i = 0;
  Object.keys(saved).sort().forEach(nr => {
    if (parseKleuren(saved[nr].kleuren).length < 10) {
      saved[nr].kleuren = KLEUR_POOLS[i % KLEUR_POOLS.length].join(', ');
      i++;
      changed = true;
    }
  });
  if (changed) {
    const local = lsLoad();
    Object.keys(saved).forEach(nr => {
      local[nr] = { ...local[nr], ...saved[nr] };
    });
    lsSave(local);
  }
}
