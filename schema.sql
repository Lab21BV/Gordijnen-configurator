-- ── Gordijn Configurator — Supabase schema ──────────────────
-- Plak dit in: supabase.com → uw project → SQL Editor → Run
-- ────────────────────────────────────────────────────────────

create table if not exists artikelen (
  artikelnummer        text primary key,
  omschrijving         text default '',
  hoogte_stof          text default '',
  breedte_stof         text default '',
  patroon              text default '',
  patroonhoogte        text default '',
  patroonbreedte       text default '',
  prijs_per_m1         text default '',
  krimpercentage       text default '',
  kamerhoog            text default '',
  lichtdoorlatenheid   text default '',
  voeren               text default '',
  voering_prijs_per_m1 text default '',
  kantelbaar           text default '',
  doubleface           text default '',
  brandvertragend      text default '',
  akoestiek            text default '',
  verzwaaringskoord    text default '',
  samenstelling        text default '',
  updated_at           timestamptz default now()
);

-- Auto-update updated_at bij elke wijziging
create or replace function _set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_artikelen_updated_at on artikelen;
create trigger trg_artikelen_updated_at
  before update on artikelen
  for each row execute function _set_updated_at();

-- Row Level Security — publiek lezen en schrijven (anon key)
alter table artikelen enable row level security;

drop policy if exists "public_select" on artikelen;
drop policy if exists "public_insert" on artikelen;
drop policy if exists "public_update" on artikelen;
drop policy if exists "public_delete" on artikelen;

create policy "public_select" on artikelen for select using (true);
create policy "public_insert" on artikelen for insert with check (true);
create policy "public_update" on artikelen for update using (true) with check (true);
create policy "public_delete" on artikelen for delete using (true);
