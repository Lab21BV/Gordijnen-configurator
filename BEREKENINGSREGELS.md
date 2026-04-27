# Gordijnen-configurator — Berekeningsregels & richtlijnen

Samenvatting van alle regels die de configurator hanteert. Wijzig altijd zowel
`index.html` (UI + JS) als `gordijn_configurator.deluge` (Zoho-script) wanneer
één van deze regels verandert.

---

## 1. Configuratie-volgorde

1. **Type gordijn** — Overgordijn of Inbetween (filter op artikellijst).
2. **Klaarmaten** — KlaarBreedte + KlaarHoogte (cm).
3. **Artikel kiezen** — uit gefilterde lijst met feasibility-badge.
4. **Kleur** — per artikel (5–16 fictieve kleuren via `KLEUR_POOLS`).
5. **Bevestiging** — Plafond op de dag / Wand op de dag / In de dag.
6. **Plooi & verdeling** — plooi, aantal delen, vliesband.
7. **Voering** — type, kleur, prijs.
8. **Afwerking & toeslagen** — verzwaaringskoord, lock, loodveter.
9. **Bediening** — laatste stap (Opstrek L/R, Tuimelen L/R, Middenstroom, Koordloos).

---

## 2. Plooi & plooifactoren

| Plooi | Factor |
|---|---|
| Wave (default) | 2.00 |
| Dubbel retour | 2.50 |
| Enkel retour | 2.10 |
| Dubbel | 2.35 |
| Enkel | 1.80 |

Volgorde in dropdown: Wave → Dubbel retour → Enkel retour → Dubbel → Enkel.

---

## 3. Aantal delen

- **Stel** = 2 stuks (links + rechts samen).
- **1 deel links** = 1 stuk.
- **1 deel rechts** = 1 stuk.

Geen invloed op effectieve breedte: alle drie dekken de volledige rail.
Wel invloed op zijzomen-toeslag (zie §5) en op de retour-marge (§4).

---

## 4. Retourplooi-marge (Lab21-richtlijn)

Bij **Enkel retour** of **Dubbel retour** wordt de klaarbreedte kunstmatig
aangepast — voor zowel **Stel** als **1 deel links/rechts**:

```
klaarbreedte >= 300 cm  → retourMarge = 10% × klaarbreedte
klaarbreedte <  300 cm  → retourMarge = 30 cm
effectieveBreedte = klaarbreedte + retourMarge
```

**Reden** — bij een retour-/zigzag-plooi steekt de stof naar achteren uit; zonder
slack worden de plooien plat getrokken bij sluiten en ontstaan kieren bij de
zijkanten of in het midden (bij Stel).

- **10%-regel** voor grotere ramen (rail 6 m → 60 cm extra).
- **30 cm-regel** als minimum bij kleinere ramen (rail 1,5 m → 10% = 15 cm
  onvoldoende voor diepe retourplooien).

> **Inmeet-tip:** rail moet minimaal 7–10 cm van de wand om te voorkomen dat de
> plooien tegen de muur schuren.

---

## 5. Zijzomen (alleen kamerhoog)

- **ZIJZOOM_CM = 12 cm** per zijde, dubbele vouw → 3 cm zichtbare afwerking.
- **Per stuk gordijn**: 2 × 12 = **24 cm** extra stofbreedte (beide zijzomen).
- **Stel**: 2 × 24 = **48 cm**.
- **1 deel**: 1 × 24 = **24 cm**.

Banenstof krijgt **geen** zijzoomtoeslag in breedte (per baan zit de zijzoom
binnen de rolbreedte).

```
benodigdeStofbreedte (kamerhoog) = effectieveBreedte × plooi + aantalDelen × 24
benodigdeStofbreedte (banenstof) = effectieveBreedte × plooi
```

---

## 6. Snijhoogte (lengte per baan)

```
rawSnijhoogte = klaarhoogte + vliesband + onderzoom
```

### 6a. Vliesband (bovenzoom)

Keuze: 8 / 10 / 12 / 15 cm. **Default 10 cm**.

### 6b. Onderzoom

| Conditie | Onderzoom |
|---|---|
| Lock = Ja | 0 cm (afgelockt) |
| Verzwaaringskoord = Ja | 2 cm |
| anders | 15 cm (gestoomde onderzoom) |

### 6c. Patroon-rapport

Bij **Patroon = Patroon** en `patroonhoogte > 0`:

```
rapporten = ⌈rawSnijhoogte ÷ patroonhoogte⌉
vereistSnijhoogte = rapporten × patroonhoogte
```

Het patroon mag nooit doormidden gesneden worden — snijhoogte rondt naar boven
af op een heel rapport.

**Patroon-stof kantelt nooit:** kantelbaar wordt geforceerd op **Nee** (zou
het patroon 90° draaien — visueel onacceptabel). Bij feasibility en compute()
wordt de kantelbaar-fallback dus uitgeschakeld voor patroon-artikelen.

---

## 7. Scenario A — Kamerhoog

Stof rolt verticaal: hoogte van de rol = `hoogte_stof` (max ~300 cm),
roleinden-richting (originele "breedte_stof") is onbeperkt → opgeslagen als
**10000 cm**.

### 7a. Rechtop (default)

Past wanneer `vereistSnijhoogte ≤ hoogte_stof`.

```
aantalBanen   = 1
totaalMetrage = benodigdeStofbreedte ÷ 100
```

### 7b. Gekanteld (alleen als kantelbaar = Ja, **niet bij patroon**)

Bij `vereistSnijhoogte > hoogte_stof` met kantelbare uni-stof: stof wordt 90°
gedraaid; de oorspronkelijke hoogte wordt baan-breedte.

```
koordVerlies     = (verzwaaringskoord = Ja) ? 2 cm : 0
baanBreedteEff   = hoogte_stof − koordVerlies
aantalBanen      = ⌈benodigdeStofbreedte ÷ baanBreedteEff⌉
totaalMetrage    = aantalBanen × vereistSnijhoogte ÷ 100
```

**Verzwaaringskoord bij kanteling:** koord wordt weggesneden (−2 cm in baan-breedte).

### 7c. Niet mogelijk

`vereistSnijhoogte > hoogte_stof` én (kantelbaar = Nee óf patroon = Patroon)
→ artikel als "Niet mogelijk" gemarkeerd.

---

## 8. Scenario B — Banenstof

Stof rolt horizontaal: rolbreedte = `breedte_stof` (typisch 140 cm),
lengte (originele "hoogte_stof") onbeperkt → opgeslagen als **10000 cm**.

```
aantalBanen      = ⌈benodigdeStofbreedte ÷ breedte_stof⌉
lengtePerBaan    = vereistSnijhoogte             (incl. eventueel rapport)
totaalCm         = aantalBanen × lengtePerBaan
totaalMetrage_m  = totaalCm ÷ 100
```

**Geen hoogte-begrenzing**, geen kanteling.

---

## 9. Voering

Opties: **Geen voering** / **Semi-transparant** / **Verduisterend**.
Voering-prijs en -kleur verschijnen alleen wanneer voering ≠ Geen voering.

```
voeringPrijs/m¹ = (voering_prijs_per_m1 > 0)
                  ? voering_prijs_per_m1
                  : prijs_per_m1 × 0.60       (60%-fallback)
voeringKosten   = totaalMetrage × voeringPrijs/m¹
```

**Voering-kleuren** (5 fictief): Wit, Beige, Taupe, Grijs, Antraciet.

---

## 10. Prijsberekening

Stofprijs is gebaseerd op **verkoopprijs incl. btw**, niet op inkoop:

```
stofPrijs   = totaalMetrage × verkoopPrijs/m¹
totaalPrijs = stofPrijs (+ voeringKosten als van toepassing)
```

### Verkoopprijs/m¹ — bron-prioriteit

1. **Handmatig (`verkoopprijs_per_m1` veld)** — door Victor ingevuld in productie. Dit veld heeft altijd voorrang.
2. **Auto-formule** — alleen voor testartikelen waar `verkoopprijs_per_m1` leeg of 0 is:

```
verkoopPrijs/m¹ = inkoop × 3, omhoog afgerond naar het eerstvolgende xx.95
```

Voorbeeld auto: inkoop € 12,34 → verkoop € 37,95.

Implementatie:
- `verkoopPrijs95(inkoop)` — pure formule.
- `getVerkoopPrijs(article)` — geeft `{ prijs, bron: 'handmatig'|'auto' }` of `null`.

In de breakdown wordt expliciet vermeld of de prijs handmatig of auto is.

**Voering** rekent nog op inkoop-basis (custom prijs of 60% fallback van inkoop).

---

## 11. Stof-afmetingen normalisatie

Bij elke load wordt via `seedAfmetingenPlaceholders()`:

| Type | Veld | Waarde |
|---|---|---|
| Kamerhoog (Ja) | `breedte_stof` | 10000 (= onbeperkte rol-lengte) |
| Banenstof (Nee) | `hoogte_stof` | 10000 (= onbeperkte rol-lengte) |

In de aside (`Artikel specificaties`) tonen we voor de onbeperkte richting
**"Niet relevant"** in plaats van het getal.

---

## 12. Waarschuwingen

### MAX_STUK_BREEDTE_CM = 600

```
als effectieveBreedte > 600 cm → waarschuwing:
  "verdeel het gordijn in 1 deel links + 1 deel rechts"
```

### Hoogte overschreden

- Kamerhoog + niet kantelbaar (of patroon) → fout, berekening stopt.
- Kamerhoog + kantelbaar uni-stof → waarschuwing + gekanteld scenario.

---

## 13. Loodveter & Verzwaaringskoord

- **Verzwaaringskoord = Ja** → onderzoom = 2 cm; loodveter wordt automatisch
  uitgeschakeld (forceer Nee + disable input). Beide tegelijk heeft geen zin.
- **Lock = Ja** → onderzoom = 0 cm (overschrijft de verzwaaringskoord-regel).

---

## 14. Artikel-specificaties (aside)

Vaste, alleen-lezen weergave per gekozen artikel:

- **Identificatie**: Artikelnummer, Gordijn type, Omschrijving, Verkoopprijs incl. btw.
- **Afmetingen stof**: Hoogte stof, Breedte stof (één van beide "Niet relevant" — zie §11).
- **Patroon**: Patroon (Uni/Patroon), Patroonhoogte (— "Niet relevant" bij Uni —), Patroonbreedte.
- **Eigenschappen**: Kamerhoog, Lichtdoorlatenheid, Krimpercentage (informatief, niet in berekening).
- **Overige kenmerken**: Kantelbaar, Doubleface, Brandvertragend, Akoestiek, Samenstelling.

Inkoopprijs is **niet** zichtbaar (alleen verkoopprijs incl. btw).
Selects in de aside tonen geen dropdown-pijl meer (puur waarde-display).

---

## 15. Filter-uitleg (boven artikellijst)

3 actieve filters:

1. Gordijn type (gekozen in stap 1).
2. Hoogtegrens voor kamerhoog: `klaarhoogte + vliesband + onderzoom ≤ hoogte_stof`.
3. Verzw. (verzwaaringskoord) bepaalt onderzoom: 2 cm of 15 cm; bij Lock = 0.

---

## 16. Architectuur — bestanden

| Bestand | Rol |
|---|---|
| `index.html` | Configurator (stappen 1–9, berekening, artikel-aside). |
| `import.html` | CSV/Excel-import + opgeslagen artikelen-overzicht. |
| `db.js` | Supabase + localStorage CRUD, kleuren-pools, seed-migraties, `esc()`, `verkoopPrijs95()`. |
| `supabase-config.js` | URL + anon key. |
| `schema.sql` | Supabase tabel-definitie. |
| `gordijn_configurator.deluge` | Zoho Creator script — gespiegeld op `index.html` logica. |
| `start.sh` | Lokale server (Python http.server of Node fallback). |

**Opgeslagen artikelen-tabel** (import.html) toont per artikel: Artikelnr, Type,
Omschrijving, H stof, B stof (= 10000 voor kamerhoog), Patroon, Patroonhoogte
(= 0 bij Uni), Inkoop/m¹, Verkoop/m¹ incl. btw, Krimp%, KH, Licht, Voeren,
Voer.prijs, Kantelbaar, D.face, BR, Akoest, Verzw, Samenstelling, Kleuren.

---

## 18. Zoho CRM — veld-mapping

De configurator gaat aangesloten worden op Zoho CRM (module: **Products**). De
mapping tussen onze interne keys en Zoho API-namen is master-gedefinieerd in
`ARTIKEL_FIELDS` in `db.js`. `import.html` toont deze mapping in de veld-uitleg.

| Interne key | Zoho API (Products) | Zoho veldtype |
|---|---|---|
| artikelnummer | Product_Code | Single Line |
| gordijn_type | Gordijn_Type | Picklist |
| omschrijving | Product_Name | Single Line |
| hoogte_stof | Hoogte_Stof | Number |
| breedte_stof | Breedte_Stof | Number |
| patroon | Patroon | Picklist |
| patroonhoogte | Patroonhoogte | Decimal |
| patroonbreedte | Patroonbreedte | Decimal |
| prijs_per_m1 | Inkoopprijs_M1 | Currency |
| verkoopprijs_per_m1 | Verkoopprijs_M1 | Currency |
| krimpercentage | Krimpercentage | Percent |
| kamerhoog | Kamerhoog | Checkbox |
| lichtdoorlatenheid | Lichtdoorlatenheid | Picklist |
| voeren | Voering_Default | Picklist |
| voering_prijs_per_m1 | Voering_Prijs_M1 | Currency |
| kantelbaar | Kantelbaar | Checkbox |
| doubleface | Doubleface | Checkbox |
| brandvertragend | Brandvertragend | Checkbox |
| akoestiek | Akoestiek | Picklist |
| verzwaaringskoord | Verzwaaringskoord | Checkbox |
| samenstelling | Samenstelling | Single Line |
| geschikte_plooi | Geschikte_Plooi *(local-only voor nu)* | Multi-Select Picklist |
| geschikt_vouwgordijn | Geschikt_Vouwgordijn *(local-only voor nu)* | Picklist |
| kleuren | *(local-only)* | — |

`gordijn_configurator.deluge` gebruikt deze API-namen voor `input.<Field>` —
zie sectie 2 van het deluge-bestand.

---

## 17. Synchronisatie-regel

`index.html` is leidend voor de business-logica. Bij elke wijziging in:

- plooifactoren (PLOOI)
- ZIJZOOM_CM, MAX_STUK_BREEDTE_CM, DEFAULT_BAND_CHECK
- onderzoom-regels
- snijhoogte / patroon-rapport
- kanteling-formules
- retour-marge
- voering-fallback
- aantalDelen-toeslag

→ `gordijn_configurator.deluge` ook bijwerken in dezelfde commit.

---

## 19. Plooi-geschiktheid & vouwgordijn-flag

Twee artikel-velden sturen UI-waarschuwingen, niet de berekening.

**`geschikte_plooi`** — Multi-Select Picklist (`Wave`, `Dubbel retour`,
`Enkel retour`, `Dubbel`, `Enkel`). Komma-/puntkomma-gescheiden in de DB.

- Leeg → geen restrictie (alle plooien toegestaan).
- Bij keuze van niet-geschikte plooi: waarschuwingsbanner — niet blokkerend.
- Plooi-dropdown markeert niet-geschikte opties met "⚠ niet geschikt".
- Aside-sectie *Verwerkingsmogelijkheden* toont badges: groen = toegelaten,
  doorgestreept-grijs = uitgesloten.

**`geschikt_vouwgordijn`** — Picklist (`Ja`, `Nee`, `Ja (ongevoerd)`).
Informatief — niet in metrage of prijs.

Volgorde van `PLOOI_OPTIES` (in `db.js`) is leidend — gedeeld door
`index.html`, de configurator-dropdown en seed-helpers. Wijziging vereist
ook update van `plooi_*` constanten in `gordijn_configurator.deluge`.
