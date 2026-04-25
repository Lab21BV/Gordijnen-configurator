// ── Gordijn Configurator — Supabase DB helper ─────────────────
// Vereist: supabase-config.js geladen vóór dit script.
// Valt terug op localStorage wanneer Supabase niet geconfigureerd is.
// ─────────────────────────────────────────────────────────────

const DB_TABLE  = 'artikelen';
const LS_KEY    = 'gordijn_artikelen';

// ── ARTIKEL_FIELDS ────────────────────────────────────────────
// Single source of truth voor alle artikel-velden. Wordt gebruikt voor:
//   - CSV-template + kolom-mapping in import.html
//   - Preview tabel + opgeslagen artikelen tabel
//   - Veld-uitleg + hint-field lijst
//   - Artikel-specificaties aside in index.html
//   - Zoho CRM mapping (api-namen voor toekomstige sync)
//
// Per veld:
//   key         — interne JS/DB key (snake_case).
//   label       — volledig label (CSV header, modal labels).
//   short       — verkorte kolomkop in tabellen.
//   required    — verplicht bij import.
//   aliases     — andere namen die als CSV-header herkend worden.
//   zoho_api    — kolomnaam in Zoho CRM (Products module). null = niet syncen.
//   render      — rendering-hint voor tabellen: text|number|currency|yesno|enum|tags.
//   desc        — uitleg in de veld-uitleg tabel.
//   preview     — true = kolom in CSV-preview tabel.
//   saved       — true = kolom in opgeslagen artikelen tabel.
//   local_only  — true = leeft alleen in localStorage, niet in Supabase.
const ARTIKEL_FIELDS = [
  { key: 'artikelnummer',        label: 'Artikelnummer',                    short: 'Artikelnr.',  required: true,
    aliases: ['artikelnummer','artikel nr','artikel_nr','article','artnr','art.nr','art nr','art_nr','code','sku','item'],
    zoho_api: 'Product_Code', render: 'text',
    desc: 'Unieke code die dit artikel identificeert (bijv. <em>ART-001</em>). Verplicht veld.',
    preview: true,  saved: true },
  { key: 'gordijn_type',         label: 'Gordijn type',                     short: 'Type',        required: false,
    aliases: ['gordijn type','gordijn_type','type gordijn','type','overgordijn','inbetween','gordijntype'],
    zoho_api: 'Gordijn_Type', render: 'enum',
    desc: '<em>Overgordijn</em> (zwaar, decoratief) of <em>Inbetween</em> (licht, lichtdoorlatend). Bepaalt het tabblad in de configurator.',
    preview: true,  saved: true },
  { key: 'omschrijving',         label: 'Omschrijving',                     short: 'Omschrijving', required: false,
    aliases: ['omschrijving','naam','name','description','desc','omschr'],
    zoho_api: 'Product_Name', render: 'text',
    desc: 'Vrije naam of beschrijving van de stof, bijv. <em>"Linnen naturel"</em>.',
    preview: true,  saved: true },
  { key: 'hoogte_stof',          label: 'Hoogte stof (cm)',                 short: 'H stof',      required: false,
    aliases: ['hoogte stof','hoogte_stof','stofhoogte','height fabric','fabric height','hoogte','max hoogte'],
    zoho_api: 'Hoogte_Stof', render: 'number',
    desc: 'Maximale hoogte van de stofrol. Voor banenstof onbeperkt (10000 = placeholder).',
    preview: true,  saved: true },
  { key: 'breedte_stof',         label: 'Breedte stof (cm)',                short: 'B stof',      required: false,
    aliases: ['breedte stof','breedte_stof','stofbreedte','fabric width','width fabric','breedte','rolbreedte'],
    zoho_api: 'Breedte_Stof', render: 'number',
    desc: 'Rolbreedte van de stof. Voor kamerhoog onbeperkt (10000 = placeholder).',
    preview: true,  saved: true },
  { key: 'patroon',              label: 'Patroon',                          short: 'Patroon',     required: false,
    aliases: ['patroon','pattern','patroontype'],
    zoho_api: 'Patroon', render: 'enum',
    desc: '<em>Uni</em> (egaal) of <em>Patroon</em> (met herhaling). Bij patroon wordt de snijhoogte afgerond op hele rapporten.',
    preview: true,  saved: true },
  { key: 'patroonhoogte',        label: 'Patroonhoogte (cm)',               short: 'Patr.hoogte', required: false,
    aliases: ['patroonhoogte','patroon hoogte','rapport','patroonhoogte (cm)','pattern height'],
    zoho_api: 'Patroonhoogte', render: 'number',
    desc: 'Verticale rapporthoogte (cm). Alleen relevant bij Patroon.',
    preview: true,  saved: true },
  { key: 'patroonbreedte',       label: 'Patroonbreedte (cm)',              short: 'Patr.breedte', required: false,
    aliases: ['patroonbreedte','patroon breedte','pattern width'],
    zoho_api: 'Patroonbreedte', render: 'number',
    desc: 'Horizontale rapportbreedte (cm). Informatief; niet in de berekening gebruikt.',
    preview: false, saved: true },
  { key: 'prijs_per_m1',         label: 'Inkoopprijs per m¹ (€)',           short: 'Inkoop/m¹',   required: false,
    aliases: ['inkoopprijs','inkoopprijs per m1','inkoopprijs per m¹','inkoop','inkoop/m','inkoop per m','inkoop m1','prijs per m1','prijs per m¹','prijs/m1','prijs/m','prijs per meter','price','prijs','cost'],
    zoho_api: 'Inkoopprijs_M1', render: 'currency',
    desc: 'Inkoopprijs per lopende meter stof. Basis voor de auto-verkoopprijs formule (testartikelen).',
    preview: true,  saved: true },
  { key: 'verkoopprijs_per_m1',  label: 'Verkoopprijs per m¹ incl. btw (€)', short: 'Verkoop/m¹', required: false,
    aliases: ['verkoopprijs','verkoop','verkoopprijs per m1','verkoopprijs per m¹','verkoop incl btw','verkoop/m','verkoop per m','sales price','retail price','rrp'],
    zoho_api: 'Verkoopprijs_M1', render: 'currency',
    desc: 'Verkoopprijs per lopende meter incl. btw, handmatig ingevuld door Victor. Heeft voorrang op de auto-formule.',
    preview: false, saved: true },
  { key: 'krimpercentage',       label: 'Krimpercentage (%)',               short: 'Krimp%',      required: false,
    aliases: ['krimpercentage','krimp','shrinkage','krimp %','krimpp'],
    zoho_api: 'Krimpercentage', render: 'number',
    desc: 'Verwachte krimp na wasbeurt. <em>Informatief</em> — niet in de berekening.',
    preview: true,  saved: true },
  { key: 'kamerhoog',            label: 'Kamerhoog',                        short: 'KH',          required: false,
    aliases: ['kamerhoog','kamerhoog?','room height','kamer hoog'],
    zoho_api: 'Kamerhoog', render: 'yesno',
    desc: '<em>Ja</em> = kamerhoge verwerking (1 baan). <em>Nee</em> = banenstof (meerdere banen).',
    preview: true,  saved: true },
  { key: 'lichtdoorlatenheid',   label: 'Lichtdoorlatenheid',               short: 'Licht',       required: false,
    aliases: ['lichtdoorlatenheid','licht','transparantie','transparancy','light','lichtdoorl'],
    zoho_api: 'Lichtdoorlatenheid', render: 'enum',
    desc: 'Lichtklasse: Transparant / Semi transparant / Lichtblokkade / Dimout / Blackout.',
    preview: true,  saved: true },
  { key: 'voeren',               label: 'Voeren (default)',                 short: 'Voeren',      required: false,
    aliases: ['voeren','voering','lined','lining'],
    zoho_api: 'Voering_Default', render: 'enum',
    desc: 'Default voering-suggestie. Eindgebruiker kiest in de configurator zelf: Geen voering / Semi-transparant / Verduisterend.',
    preview: true,  saved: true },
  { key: 'voering_prijs_per_m1', label: 'Voering prijs per m¹ (€)',         short: 'Voer.prijs',  required: false,
    aliases: ['voering prijs','voering_prijs','voering prijs per m1','voering prijs per m¹','lining price'],
    zoho_api: 'Voering_Prijs_M1', render: 'currency',
    desc: 'Inkoopprijs voeringstof per meter. Laat 0 voor de 60%-fallback (60% van inkoopprijs stof).',
    preview: false, saved: true },
  { key: 'kantelbaar',           label: 'Kantelbaar',                       short: 'Kant.',       required: false,
    aliases: ['kantelbaar','tiltable','kantel'],
    zoho_api: 'Kantelbaar', render: 'yesno',
    desc: '<em>Ja</em> = mag 90° gekanteld verwerkt worden bij hoogte-overschrijding. Patroon-stof is automatisch <em>Nee</em>.',
    preview: true,  saved: true },
  { key: 'doubleface',           label: 'Doubleface',                       short: 'D.face',      required: false,
    aliases: ['doubleface','double face','double-face','reversible'],
    zoho_api: 'Doubleface', render: 'yesno',
    desc: 'Aan beide zijden afgewerkt; geschikt voor tweezijdig gebruik.',
    preview: false, saved: true },
  { key: 'brandvertragend',      label: 'Brandvertragend',                  short: 'BR',          required: false,
    aliases: ['brandvertragend','brandwerend','fire retardant','fire','fr'],
    zoho_api: 'Brandvertragend', render: 'yesno',
    desc: 'Voldoet aan brandvertragende normen (FR). Relevant voor projecten / publieke ruimtes.',
    preview: true,  saved: true },
  { key: 'akoestiek',            label: 'Akoestiek klasse',                 short: 'Akoest.',     required: false,
    aliases: ['akoestiek','akoestiek klasse','acoustic','acoustic class','akoestiekklasse'],
    zoho_api: 'Akoestiek', render: 'enum',
    desc: 'Geluidsabsorberende klasse: — / A / B.',
    preview: false, saved: true },
  { key: 'verzwaaringskoord',    label: 'Verzwaaringskoord',                short: 'Verzw.',      required: false,
    aliases: ['verzwaaringskoord','verzwaring','weight cord','weighting'],
    zoho_api: 'Verzwaaringskoord', render: 'yesno',
    desc: '<em>Ja</em> = onderzoom 2 cm (koord ingewerkt). <em>Nee</em> = onderzoom 15 cm. Loodveter wordt dan automatisch uitgeschakeld.',
    preview: false, saved: true },
  { key: 'samenstelling',        label: 'Samenstelling',                    short: 'Samenst.',    required: false,
    aliases: ['samenstelling','composition','materiaal','material','fiber','vezel'],
    zoho_api: 'Samenstelling', render: 'text',
    desc: 'Vezelsamenstelling, bijv. <em>"100% Polyester"</em>.',
    preview: true,  saved: true },
  { key: 'kleuren',              label: 'Kleuren',                          short: 'Kleuren',     required: false,
    aliases: ['kleuren','kleur','colors','colour','colours','color'],
    zoho_api: null, render: 'tags', local_only: true,
    desc: 'Komma- of puntkomma-gescheiden kleurnamen. Vult de Kleur-dropdown in de configurator. Leeg → fictieve set toegekend.',
    preview: false, saved: true },
];

// Afgeleid: kolommen die daadwerkelijk in Supabase staan.
const DB_FIELDS = ARTIKEL_FIELDS.filter(f => !f.local_only).map(f => f.key);
// Afgeleid: velden die alleen in localStorage leven.
const LOCAL_EXTRA_FIELDS = ARTIKEL_FIELDS.filter(f => f.local_only).map(f => f.key);

function getField(key) { return ARTIKEL_FIELDS.find(f => f.key === key); }

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

// HTML-escape utility — gedeeld door index.html en import.html.
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Verkoopprijs incl. btw — auto-formule (inkoop × 3, omhoog afgerond naar xx.95).
// Alleen geldig voor testartikelen; in productie bepaalt Victor de verkoopprijs
// handmatig via het veld `verkoopprijs_per_m1`.
function verkoopPrijs95(inkoop) {
  const n = parseFloat(inkoop);
  if (isNaN(n) || n <= 0) return null;
  const x = n * 3;
  const f = Math.floor(x);
  return (x <= f + 0.95) ? f + 0.95 : f + 1.95;
}

// Effectieve verkoopprijs/m¹ voor een artikel.
// 1. Als `verkoopprijs_per_m1` handmatig is ingevuld (door Victor) → die waarde.
// 2. Anders fallback naar de auto-formule (testartikelen).
// Geeft { prijs, bron: 'handmatig'|'auto' } of null.
function getVerkoopPrijs(article) {
  if (!article) return null;
  const manual = parseFloat(article.verkoopprijs_per_m1);
  if (!isNaN(manual) && manual > 0) {
    return { prijs: manual, bron: 'handmatig' };
  }
  const auto = verkoopPrijs95(article.prijs_per_m1);
  return auto !== null ? { prijs: auto, bron: 'auto' } : null;
}

// Stof-afmetingen normaliseren met placeholder 10000 (= "onbeperkt"):
//   Kamerhoog (Ja): breedte_stof  is rolengte → onbeperkt → 10000.
//   Banenstof (Nee): hoogte_stof  is rolengte → onbeperkt → 10000.
async function seedAfmetingenPlaceholders(saved) {
  const toUpdate = [];
  Object.keys(saved).forEach(nr => {
    const a = saved[nr];
    const isKH = String(a.kamerhoog || '').toLowerCase() === 'ja';
    let changed = false;
    if (isKH && String(a.breedte_stof) !== '10000') {
      a.breedte_stof = '10000';
      changed = true;
    }
    if (!isKH && String(a.hoogte_stof) !== '10000') {
      a.hoogte_stof = '10000';
      changed = true;
    }
    if (changed) toUpdate.push(a);
  });
  if (toUpdate.length > 0) await dbUpsertArticles(toUpdate);
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
