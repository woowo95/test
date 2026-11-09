// Bönen, de heliga platserna, ritualerna, prästen och profeten (system 8.5). Tre register: BONER (en rad per sorts bön), HELIGA_PLATSER (en rad
// per sort) och RITUALER (en rad per ritual). Graven och kroppen står i kvarlevor.ts, tron i religion.ts. Bön och offer påverkar nästan bara
// humöret och tron, och går aldrig före maten eller veden.
import { DAY, HOUR, MIN, Person, State, T, W, inMap } from './typer';
import { balans } from './balans';
import { clamp, rnd } from './slump';
import { ALDER, ageOf, alive, byId, count, isParent, living, log, stat, think } from './folk';
import { kronika } from './historik';
import { upplev } from './uppvaxt';
import { TRO, Tro, andlighet, grunda, tecken, skalaV, troNamn, troNiva, troOf, troende } from './religion';
import { ageIndex, ageStart } from './tid';
import { getMap } from './karta';
import { groundOf } from './mark';
import { FOREST } from './vag';
import { freeNear } from './byggnad';
import { eldPlats } from './karta';
import { addTo, amountOf } from './lager';
import { FOOD } from './saker';
import { takeMaterial } from './behov';
import { kladAv } from './klader';
import { nyRitual } from './kultlatt';
import { isSick } from './sjukdom';

// farorna över byn (dangers i val.ts, som sätter den här när den laddas: val.ts läser det mesta i spelet)
let dangers: (s: State) => { kyla: boolean; svalt: boolean } = () => ({ kyla: false, svalt: false });
export const satFaror = (f: typeof dangers) => { dangers = f; };
export const KULT = balans('kult', {
  ofta: 1.5, // bönens vikt på fritiden: andligheten delad med 100 gånger så här
  starkare: 1.5, // rökelse, trons tecken och prästens dräkt gör en bön så här mycket starkare
  nodAnde: 60, nodTro: 50, // bönen i nöd: den som har minst så här andlighet och tro
  hjalpDygn: 2, // går faran över inom så här många dygn (år i spelet) hjälpte bönen
  prastAnde: 55, // så andlig ska den som blir präst vara
  profetAnde: 88, profetKarisma: 13, profetChans: 0.0008, // profeten: andlighet, karisma och chansen per timme att få en syn
  nyTro: 0.3, // chansen att profeten grundar en ny tro i stället för att ändra den
  profetSkala: 18, // så mycket en syn flyttar trons skalor
  vanhelgaChans: 0.01, // chansen per dygn att en sluten tro vanhelgar en annan tros plats
  slutenFran: 70, // Öppen – Sluten: så sluten ska tron vara
  festMat: 0.15, // bröllopets fest gör alla så här mycket mättare (steg 8.5.13)
  fest: 50, forsakelse: 50, // Fest – Försakelse: över så här mycket på respektive sida (0 = Fest, 100 = Försakelse)
  bal: 4, // så mycket ved ett bål tar
  vattenR: 20, // ... och så här nära ska vattnet vara för att den döde läggs i vatten
});

// ---------- bönen (steg 8.5.2–8.5.4) ----------
export interface BonDef { namn: string; min: number; ger: { humor: number; tro: number }; text(s: State, p: Person, o?: string): string }
export const BONER = {
  vardag: { namn: 'Vardagsbön', min: 15, ger: { humor: 0.04, tro: 1 }, text: () => 'Ber sin bön' },
  tack: { namn: 'Tacksägelse', min: 10, ger: { humor: 0.06, tro: 2 }, text: (_s, _p, o) => `Tackar för ${o ?? 'det som gick väl'}` },
  nod: { namn: 'Bön i nöd', min: 30, ger: { humor: 0.08, tro: 2 }, text: (_s, _p, o) => `Ber om hjälp mot ${o ?? 'faran'}` },
  for: { namn: 'Bön för någon', min: 30, ger: { humor: 0.08, tro: 2 }, text: (_s, _p, o) => `Ber för ${o ?? 'någon nära'}` },
  bikt: { namn: 'Bikt', min: 20, ger: { humor: 0.05, tro: 1 }, text: () => 'Biktar sig' }, // steg 8.6.9
} satisfies Record<string, BonDef>;
export type BonId = keyof typeof BONER;
const BDEF: Record<BonId, BonDef> = BONER;
// vikten på fritiden: den andlige ber ofta, den oandlige aldrig
export const bonVikt = (s: State, p: Person) => p.tro === undefined ? 0 : andlighet(s, p) / 100 * KULT.ofta;
const dygnNr = (now: number) => Math.floor(now / DAY);
// fritidens bön: en gång om dagen. Tacksägelsen går före; helst vid den heliga platsen
export function bonFritid(s: State, p: Person): { id: BonId; o?: string; spot?: { x: number; y: number } } | undefined {
  const tr = troOf(s, p.tro);
  if (!tr) return undefined;
  const spot = helig(s, tr);
  if (p.tack) { const o = p.tack; p.tack = undefined; return { id: 'tack', o, spot }; }
  if (p.bonD === dygnNr(s.now)) return undefined;
  return { id: 'vardag', spot };
}
// bönen i nöd: bara den som är andlig och troende nog, en gång per fara och dygn, när en fara är över byn eller någon nära lider
export function bonNod(s: State, p: Person): { id: BonId; o: string; vem?: number } | undefined {
  if (p.tro === undefined || andlighet(s, p) < KULT.nodAnde || (p.troStyrka ?? 0) < KULT.nodTro || p.bonNodD === dygnNr(s.now)) return undefined;
  const f = dangers(s);
  if (f.svalt) return { id: 'nod', o: 'svälten' };
  if (f.kyla) return { id: 'nod', o: 'kylan' };
  const q = living(s).find(o => o !== p && (p.partner === o.id || isParent(p, o) || isParent(o, p)) && (o.skador?.some(w => w.g >= 0.5) || isSick(o, s.now)));
  return q ? { id: 'for', o: q.name, vem: q.id } : undefined;
}
// bönen är klar (KLAR i steg.ts): humör, tro, och en bön i nöd får svar inom några dygn (steg 8.5.4)
export function bonKlar(s: State, p: Person, t: { tool?: string; ref?: number; why?: string }) {
  const id = (t.tool ?? 'vardag') as BonId, d = BDEF[id], f = (rokelse(s, p) ? KULT.starkare : 1) * (barTecken(s, p) ? KULT.starkare : 1);
  think(p, d.namn === 'Vardagsbön' ? 'Bad sin bön' : d.namn, d.ger.humor * f, s.now, 6 * HOUR);
  p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + d.ger.tro * f);
  count(s, 'bon_' + id);
  if (id === 'vardag') p.bonD = dygnNr(s.now);
  if (id === 'nod' || id === 'for') { p.bonNodD = dygnNr(s.now); p.bonVan = { t: s.now, o: id === 'nod' ? (dangers(s).svalt ? 'svalt' : 'kyla') : 'nara', ...(id === 'for' && t.ref !== undefined ? { vem: t.ref } : {}) }; }
  if (id === 'bikt') { p.skuld = 0; count(s, 'bikt'); }
}
const rokelse = (s: State, p: Person) => { if (amountOf(s, 'rokelse') < 1 || rnd(s, 'tro', p) > 0.2) return false; takeMaterial(s, p, 'rokelse', 1); return true; };
const barTecken = (s: State, p: Person) => (s.ting ?? []).some(t => t.bar === p.id && (kladAv(t.k)?.plagg === 'tecken' || kladAv(t.k)?.plagg === 'prastdrakt'));
// bönen i andligheten (steg 8.5.4): en bön i nöd som hjälpte eller inte hjälpte blir en upplevelse
function bonSvar(s: State, p: Person) {
  const b = p.bonVan;
  if (!b) return;
  // bönen för en nära hjälpte om hen blivit frisk från sjukdomen och de svåra skadorna; dog hen hjälpte den inte
  const q = b.vem !== undefined ? byId(s, b.vem) : undefined, frisk = !!q && alive(q) && !isSick(q, s.now) && !q.skador?.some(w => w.g >= 0.5);
  const f = dangers(s), over = b.o === 'svalt' ? !f.svalt : b.o === 'kyla' ? !f.kyla : frisk;
  if (over || s.now - b.t >= KULT.hjalpDygn * DAY || b.o === 'nara' && (!q || !alive(q))) {
    p.bonVan = undefined;
    if (over) { upplev(s, p, 'bonHjalpte'); count(s, 'bon_hjalpte'); bonSvarPlats(s, p); tecken(s, p, 'bonSvar'); } else { upplev(s, p, 'bonInte'); p.tvivel = (p.tvivel ?? 0) + 1; count(s, 'bon_inte'); }
  }
}
// platsen där en bön i nöd fick svar blir helig, när tron har en präst (steg 8.5.5)
const bonSvarPlats = (s: State, p: Person) => { const tr = troOf(s, p.tro); if (tr && prastOf(s, tr)) helga(s, tr, Math.floor(p.x), Math.floor(p.y), `där ${p.name}s bön fick svar`); };

// ---------- de heliga platserna (steg 8.5.5) ----------
export interface HeligDef { namn: string; ikon: string; passar(s: State, x: number, y: number): boolean }
export const HELIGA_PLATSER = {
  vatten: { namn: 'Det heliga vattnet', ikon: 'helig_vatten', passar: (s, x, y) => narVatten(s, x, y, 2) },
  lund: { namn: 'Den heliga lunden', ikon: 'helig_lund', passar: (s, x, y) => skogNara(s, x, y) >= 4 },
  trad: { namn: 'Det heliga trädet', ikon: 'helig_trad', passar: (s, x, y) => skogNara(s, x, y) >= 1 },
  sten: { namn: 'Den heliga stenen', ikon: 'helig_sten', passar: () => true },
} satisfies Record<string, HeligDef>;
export type HeligSlag = keyof typeof HELIGA_PLATSER;
export interface HeligPlats { x: number; y: number; k: HeligSlag; tro: number; t: number; om: string; skandad?: number }
const narVatten = (s: State, x: number, y: number, r: number) => { const m = getMap(s.seed); for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inMap(x + dx, y + dy) && m.tiles[(y + dy) * W + x + dx] === T.Vatten) return true; return false; };
const skogNara = (s: State, x: number, y: number) => { const g = groundOf(s); let n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (inMap(x + dx, y + dy) && g.trees[(y + dy) * W + x + dx] >= FOREST) n++; return n; };
export const heligaOf = (s: State) => (s.heliga ??= []);
export const heligAt = (s: State, x: number, y: number) => s.heliga?.find(h => h.x === x && h.y === y);
export const helig = (s: State, tr: Tro) => { const h = s.heliga?.find(q => q.tro === tr.id && !q.skandad); return h && { x: h.x + 0.5, y: h.y + 1.5 }; };
export function helga(s: State, tr: Tro, x: number, y: number, om: string) {
  if (heligaOf(s).some(h => h.tro === tr.id && h.x === x && h.y === y)) return;
  const k = (Object.keys(HELIGA_PLATSER) as HeligSlag[]).find(q => (HELIGA_PLATSER[q] as HeligDef).passar(s, x, y))!;
  heligaOf(s).push({ x, y, k, tro: tr.id, t: s.now, om }); count(s, 'helig');
  const t = `${HELIGA_PLATSER[k].namn}: platsen ${om} är nu helig för ${troNamn(tr).toLowerCase()}.`;
  log(s, t, 'rel', []); kronika(s, t, 'tro');
}

// ---------- prästen (steg 8.5.9) ----------
// sorten följer Var och en – Präster; regeln om vem som får bli präst bestäms när den första utses och ändras aldrig
export const prastSort = (tr: Tro, k: 'k' | 'm') => { const v = skalaV(tr, 'prast') ?? 0; return v < 34 ? (k === 'k' ? 'Völva' : 'Schaman') : v < 67 ? (k === 'k' ? 'Gydja' : 'Gode') : 'Präst'; };
export const prastOf = (s: State, tr: Tro) => { const q = byId(s, tr.prast); return q && alive(q) && q.tro === tr.id ? q : undefined; };
function prastSteg(s: State, tr: Tro, folk: Person[]) {
  if (troNiva(tr) < 3 || prastOf(s, tr)) return;
  const kand = folk.filter(q => ageOf(q, s.now) >= ALDER.vuxen && andlighet(s, q) >= KULT.prastAnde && (!tr.prastRegel || tr.prastRegel === 'bada' || tr.prastRegel === q.sex));
  if (!kand.length) return;
  const p = kand.sort((a, b) => andlighet(s, b) + stat(b, 'karisma', s.now) * 3 - andlighet(s, a) - stat(a, 'karisma', s.now) * 3)[0];
  if (!tr.prastRegel) { const r = rnd(s, 'tro', p); tr.prastRegel = r < 0.34 ? 'k' : r < 0.67 ? 'm' : 'bada'; }
  if (tr.prastRegel !== 'bada' && tr.prastRegel !== p.sex) return;
  tr.prast = p.id; count(s, 'prast');
  const t = `${p.name} blev ${prastSort(tr, p.sex).toLowerCase()} i ${troNamn(tr).toLowerCase()}.`;
  log(s, t, 'rel', [p.id]); kronika(s, t, 'tro'); p.fame.push(`Blev ${prastSort(tr, p.sex).toLowerCase()}`);
}

// ---------- profeten (steg 8.5.10) ----------
function profetSteg(s: State, p: Person) {
  if (p.profet || p.tro === undefined || andlighet(s, p) < KULT.profetAnde || stat(p, 'karisma', s.now) < KULT.profetKarisma || rnd(s, 'tro', p) >= KULT.profetChans) return;
  const tr = troOf(s, p.tro);
  if (!tr) return;
  p.profet = true; count(s, 'profet'); p.fame.push('Fick en syn');
  if (rnd(s, 'tro', p) < KULT.nyTro && levande(s).length < TRO.takTro) {
    const t = `${p.name} fick en syn och lämnade ${troNamn(tr).toLowerCase()} för något nytt.`;
    log(s, t, 'rel', [p.id]); kronika(s, t, 'tro');
    p.tro = undefined; grunda(s, p, 'drom'); return;
  }
  const skala = (['natur', 'manga'] as const)[Math.floor(rnd(s, 'tro', p) * 2)], d = (rnd(s, 'tro', p) < 0.5 ? -1 : 1) * KULT.profetSkala;
  tr[skala] = clamp(tr[skala] + d, 0, 100);
  const t = `${p.name} fick en syn, och ${troNamn(tr).toLowerCase()} blev inte sig lik.`;
  log(s, t, 'rel', [p.id]); kronika(s, t, 'tro');
  (tr.profeter ??= []).push(p.id);
}
const levande = (s: State) => (s.tron ?? []).filter(t => t.slut === undefined);

// ---------- flera religioner och tolerans (steg 8.5.11) ----------
function vanhelga(s: State) {
  for (const tr of levande(s)) {
    if ((skalaV(tr, 'oppen') ?? 0) < KULT.slutenFran) continue;
    const annan = s.heliga?.find(h => h.tro !== tr.id && !h.skandad);
    if (!annan || rnd(s, 'tro') >= KULT.vanhelgaChans) continue;
    annan.skandad = s.now; count(s, 'vanhelgad');
    const t = `Några från ${troNamn(tr).toLowerCase()} vanhelgade ${HELIGA_PLATSER[annan.k].namn.toLowerCase()}.`;
    log(s, t, 'rel', []); kronika(s, t, 'tro');
    for (const q of living(s)) if (q.tro === annan.tro) { q.troStyrka = Math.max(0, (q.troStyrka ?? 0) - 3); think(q, 'Någon vanhelgade vår heliga plats', -0.15, s.now, 2 * DAY); }
  }
}

// ---------- ritualerna (steg 8.5.6, 8.5.13, 8.5.14) ----------
export interface RitualDef { namn: string; tim: number; humor: number; tro: number; huvud?: number; vem(s: State, r: Ritual): Person[]; plats(s: State, r: Ritual): { x: number; y: number } }
export interface Ritual { k: RitualId; start: number; slut: number; x: number; y: number; tro?: number; namn?: string; om?: number[]; gick?: number }
const vuxna = (s: State) => living(s).filter(p => ageOf(p, s.now) >= ALDER.smabarn);
const vidElden = (s: State) => { const f = eldPlats(s), q = freeNear(s, f.x + 0.5, f.y + 2); return q; };
export const RITUALER = {
  begravning: { namn: 'Begravning', tim: 1, humor: 0.05, tro: 2, vem: (s, r) => living(s).filter(p => p.tro === r.tro || r.om?.some(id => { const d = byId(s, id); return d && (isParent(p, d) || isParent(d, p) || p.partner === id); })), plats: (_s, r) => ({ x: r.x, y: r.y }) },
  brollop: { namn: 'Bröllop', tim: 2, humor: 0.08, huvud: 0.15, tro: 1, vem: vuxna, plats: vidElden },
  hogtid: { namn: 'Högtid', tim: 3, humor: 0.1, tro: 3, vem: (s, r) => living(s).filter(p => p.tro === r.tro), plats: (s, r) => { const tr = troOf(s, r.tro); return (tr && helig(s, tr)) ?? vidElden(s); } },
  leddBon: { namn: 'Ledd bön', tim: 1, humor: 0.06, tro: 1.5, vem: (s, r) => living(s).filter(p => p.tro === r.tro), plats: (s, r) => { const tr = troOf(s, r.tro); return (tr && helig(s, tr)) ?? vidElden(s); } },
} satisfies Record<string, RitualDef>;
export type RitualId = keyof typeof RITUALER;
const RDEF: Record<RitualId, RitualDef> = RITUALER;
// en rad i arbetsordningen (Tillfälle): den som ska vara med går dit medan ritualen pågår
export function ritualVal(s: State, p: Person) {
  const r = s.ritual;
  if (!r || !RDEF[r.k].vem(s, r).includes(p)) return undefined;
  return { spot: { x: r.x + (p.id % 5 - 2) * 0.6, y: r.y + 1 + (p.id % 3) * 0.6 }, dur: Math.max(MIN, r.slut - s.now), why: r.namn ?? RDEF[r.k].namn };
}
// varje timme: ritualen tar slut och ger det den ger, nästa i kön börjar på kvällen eller dagen
export function ritualTimme(s: State) {
  const r = s.ritual;
  if (r && s.now >= r.slut) {
    const d = RDEF[r.k], med = living(s).filter(p => p.task?.act === 'ritual');
    const prast = r.tro !== undefined ? troOf(s, r.tro) : undefined, ledd = prast && prastOf(s, prast) ? KULT.starkare : 1;
    for (const p of med) {
      think(p, r.namn ?? d.namn, (r.om?.includes(p.id) ? d.huvud ?? d.humor : d.humor) * ledd, s.now, 12 * HOUR);
      if (p.tro !== undefined) p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + d.tro);
      p.task!.until = s.now;
    }
    count(s, 'ritual_' + r.k);
    s.ritual = undefined;
  }
  if (s.ritual || !s.ritualKo?.length) return;
  const n = s.ritualKo.shift()!, d = RDEF[n.k], at = d.plats(s, n);
  s.ritual = { ...n, start: s.now, slut: s.now + d.tim * HOUR, x: at.x, y: at.y };
  log(s, `${n.namn ?? d.namn} samlar byn.`, 'rel', []);
  if (n.k === 'brollop') festMat(s);
  if (n.k === 'begravning' && !s.stat?.ritual_begravning) count(s, 'ritual_forsta_begravning');
}
// bröllopets fest (steg 8.5.13): en hel sak mat per två i byn ur förrådet, av det byn har mest av, och alla blir mättare
function festMat(s: State) {
  const folk = living(s), n = Math.ceil(folk.length / 2), k = FOOD.filter(q => amountOf(s, q) >= n).sort((a, b) => amountOf(s, b) - amountOf(s, a))[0];
  if (!k) return;
  addTo(s, k, -n); count(s, 'festmat');
  for (const p of folk) p.hunger = Math.min(1, p.hunger + KULT.festMat);
}
// högtiderna (steg 8.5.14): en tro har 0–4, var och en knuten till en tidsålder, och firas när den tidsåldern kommer. Fest ger fler, Försakelse färre
export const hogtider = (tr: Tro) => { const f = skalaV(tr, 'fest') ?? 50; return f < KULT.fest ? 2 + (f < 25 ? 2 : 0) : f > 75 ? 0 : 1; };
const HOGTIDSNAMN = ['Isblotet', 'Vårfesten', 'Midsommarnatten', 'Skördenatten'];
function hogtidSteg(s: State, tr: Tro) {
  if (troNiva(tr) < 2) return;
  const n = hogtider(tr), ai = ageIndex(s), st = ageStart(s, ai);
  if (!n || (tr.id + ai) % 4 >= n || tr.hogtid === st) return;
  tr.hogtid = st;
  const fasta = (skalaV(tr, 'fest') ?? 0) > KULT.forsakelse;
  nyRitual(s, 'hogtid', { tro: tr.id, namn: fasta ? `Fastan i ${['istiden', 'vårtiden', 'sommartiden', 'hösttiden'][ai]}` : HOGTIDSNAMN[ai] });
  if (fasta) for (const p of troende(s, tr)) { p.fasta = s.now + DAY; p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + 1); }
  else for (const p of troende(s, tr).slice(0, 3)) if (amountOf(s, 'bar') >= 1 && rnd(s, 'tro', p) < 0.5) { takeMaterial(s, p, 'bar', 1); p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + 2); count(s, 'offer'); } // offret: en hel sak läggs på den heliga platsen
}
// ---------- varje timme ----------
export function kultTimme(s: State) {
  for (const p of living(s)) { bonSvar(s, p); profetSteg(s, p); }
  for (const tr of levande(s)) {
    const folk = troende(s, tr);
    if (!folk.length) continue;
    prastSteg(s, tr, folk);
    hogtidSteg(s, tr);
    if (troNiva(tr) >= 2 && tr.x !== undefined && !s.heliga?.some(h => h.tro === tr.id)) helga(s, tr, tr.x, tr.y!, 'där tron föddes');
    const pr = prastOf(s, tr);
    if (pr && !s.ritual && !s.ritualKo?.some(r => r.k === 'leddBon' && r.tro === tr.id) && (tr.leddBon ?? 0) + 2 * DAY <= s.now && helig(s, tr)) { tr.leddBon = s.now; nyRitual(s, 'leddBon', { tro: tr.id }); }
  }
  if (Math.floor(s.now / HOUR) % 24 === 0) vanhelga(s);
  ritualTimme(s);
}
