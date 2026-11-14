// Bönen, de heliga platserna, ritualerna, prästen och profeten (system 8.5). Tre register: BONER (en rad per sorts bön), HELIGA_PLATSER (en rad
// per sort) och RITUALER (en rad per ritual). Graven och kroppen står i kvarlevor.ts, tron i religion.ts. Bön och offer påverkar nästan bara
// humöret och tron, och går aldrig före maten eller veden.
import { personHand } from './personlogg';
import { DAY, HOUR, MIN, Person, State, T, W, inMap } from './typer';
import { balans } from './balans';
import { clamp, rnd } from './slump';
import { ALDER, KROPP, ageOf, alive, byId, count, isParent, living, log, stat, think } from './folk';
import { kronika } from './historik';
import { upplev } from './uppvaxt';
import { TRO, Tro, andlighet, grunda, tecken, skalaV, troNamn, rymsBud, troOf, troende } from './religion';
import { ageIndex, ageStart } from './tid';
import { getMap } from './karta';
import { groundOf } from './mark';
import { FOREST } from './vag';
import { freeNear } from './byggnad';
import { eldPlats } from './karta';
import { addTo, amountOf, ownedStock, use } from './lager';
import { ata } from './naring';
import { budIn, foljer } from './kyrka';
import { FOOD } from './saker';
import { takeMaterial } from './behov';
import { kladAv } from './klader';
import { nyRitual, satEgendomVarde, satGravVarde } from './kultlatt';
import { grundvarde, tingVarde, varuVarde } from './varde';
satGravVarde(t => tingVarde(t)); // gravgåvan är den finaste saken (steg 10.3.5)
satEgendomVarde(o => varuVarde(o) / grundvarde('ved')); // kyrkans egendom i trons tyngd (steg 10.3.8)
import { isSick } from './sjukdom';

// farorna över byn (dangers i val.ts, som sätter den här när den laddas: val.ts läser det mesta i spelet)
let dangers: (s: State) => { kyla: boolean; svalt: boolean } = () => ({ kyla: false, svalt: false });
export const satFaror = (f: typeof dangers) => { dangers = f; };
// farorna nu, för de filer som inte kan läsa val.ts (djurhållningen frågar samma svältmått som valet av aktivitet, steg 10.2.1)
export const farorNu = (s: State) => dangers(s);
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
  vuxenTro: 3, // den unga får så här mycket tro av sitt vuxenblivande, de andra ritualens vanliga (steg 10.3.4)
  fastaTro: 4, // fastan ger tron så här mycket i stället för högtidens 3 (steg 10.3.3)
  offerTro: 2, offerInget: -0.02, // offret vid högtiden: tron hos den som offrar, och humöret hos den som inget har
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
// hur väl någon passar som präst: andligheten och karisman
export const prastRang = (s: State, p: Person) => andlighet(s, p) + stat(p, 'karisma', s.now) * 3;
function prastSteg(s: State, tr: Tro, folk: Person[]) {
  if (!rymsBud(s, tr, 2) || prastOf(s, tr)) return; // budet om en präst har storlek 2 (steg 10.3.12 gör det till ett bud)
  const kand = folk.filter(q => ageOf(q, s.now) >= ALDER.vuxen && andlighet(s, q) >= KULT.prastAnde && (!tr.prastRegel || tr.prastRegel === 'bada' || tr.prastRegel === q.sex));
  if (!kand.length) return;
  const p = kand.sort((a, b) => prastRang(s, b) - prastRang(s, a))[0];
  if (!tr.prastRegel) { const r = rnd(s, 'tro', p); tr.prastRegel = r < 0.34 ? 'k' : r < 0.67 ? 'm' : 'bada'; }
  if (tr.prastRegel !== 'bada' && tr.prastRegel !== p.sex) return;
  tr.prast = p.id; count(s, 'prast');
  const t = `${p.name} blev ${prastSort(tr, p.sex).toLowerCase()} i ${troNamn(tr).toLowerCase()}.`;
  log(s, t, 'rel', [p.id]); kronika(s, t, 'tro'); p.fame.push(`Blev ${prastSort(tr, p.sex).toLowerCase()}`); personHand(s, p, 'titel', `Blev ${prastSort(tr, p.sex).toLowerCase()}.`);
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
export interface Ritual { k: RitualId; start: number; slut: number; x: number; y: number; tro?: number; namn?: string; om?: number[]; gick?: number; form?: HogtidForm }
const vuxna = (s: State) => living(s).filter(p => ageOf(p, s.now) >= ALDER.smabarn);
const vidElden = (s: State) => { const f = eldPlats(s), q = freeNear(s, f.x + 0.5, f.y + 2); return q; };
export const RITUALER = {
  begravning: { namn: 'Begravning', tim: 1, humor: 0.05, tro: 2, vem: (s, r) => living(s).filter(p => p.tro === r.tro || r.om?.some(id => { const d = byId(s, id); return d && (isParent(p, d) || isParent(d, p) || p.partner === id); })), plats: (_s, r) => ({ x: r.x, y: r.y }) },
  brollop: { namn: 'Bröllop', tim: 2, humor: 0.08, huvud: 0.15, tro: 1, vem: vuxna, plats: (s, r) => { const tr = troOf(s, r.tro); return (tr && helig(s, tr)) ?? vidElden(s); } }, // välsignat (tron har budet, steg 10.3.3) vid trons heliga plats
  hogtid: { namn: 'Högtid', tim: 3, humor: 0.1, tro: 3, vem: (s, r) => living(s).filter(p => p.tro === r.tro), plats: (s, r) => { const tr = troOf(s, r.tro); return (tr && helig(s, tr)) ?? vidElden(s); } },
  dop: { namn: 'Dop', tim: 1, humor: 0.05, huvud: 0.1, tro: 1, vem: vuxna, plats: (s, r) => { const tr = troOf(s, r.tro); return (tr && helig(s, tr)) ?? vidElden(s); } }, // steg 10.3.4: huvud = föräldrarna
  vuxen: { namn: 'Vuxenblivande', tim: 1, humor: 0.05, huvud: 0.15, tro: 1, vem: vuxna, plats: (s, r) => { const tr = troOf(s, r.tro); return (tr && helig(s, tr)) ?? vidElden(s); } }, // huvud = den unga
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
    const tr = prast;
    for (const p of med) {
      think(p, r.namn ?? d.namn, (r.om?.includes(p.id) ? d.huvud ?? d.humor : d.humor) * ledd, s.now, 12 * HOUR);
      // en ritual ger tro bara till dem som har ritualens tro (steg 10.3.3); fastan ger mer
      if (r.tro !== undefined && p.tro === r.tro) p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + (r.form === 'fasta' ? KULT.fastaTro : r.k === 'vuxen' && r.om?.includes(p.id) ? KULT.vuxenTro : d.tro));
      p.task!.until = s.now;
    }
    if (r.k === 'hogtid' && tr) hogtidSlut(s, tr, r, med);
    count(s, 'ritual_' + r.k);
    s.ritual = undefined;
  }
  if (s.ritual || !s.ritualKo?.length) return;
  const n = s.ritualKo.shift()!, d = RDEF[n.k];
  if (n.k === 'brollop') valsigna(s, n);
  const at = d.plats(s, n);
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
// bröllopet (steg 10.3.3): byns fest hålls alltid. Har båda i paret samma tro och den har budet Bröllopet välsignas, hålls det vid trons
// heliga plats och de troende får tro. Ett bröllop bland de troende lyfter fram budet bland trons förslag (tr.brollop)
function valsigna(s: State, n: Ritual) {
  const [a, b] = (n.om ?? []).map(id => byId(s, id)), tr = a && b && a.tro !== undefined && a.tro === b.tro ? troOf(s, a.tro) : undefined;
  if (!tr) return;
  tr.brollop = s.now;
  if (budIn(tr, 'valsigna')) { n.tro = tr.id; count(s, 'brollop_valsignat'); }
}
// dopet och vuxenblivandet (steg 10.3.4): ett barn som fötts eller en ung som fyllt 14 under den senaste timmen. Tron är den första av
// den ungas egen (vid vuxenblivandet), moderns och faderns som har budet. Tvillingar välsignas tillsammans. Ingen tas upp i tron av ritualen
const troMedBud = (s: State, id: 'dop' | 'vuxen', ...vem: (Person | undefined)[]) => vem.map(q => troOf(s, q?.tro)).find(tr => budIn(tr, id));
function livsRiter(s: State) {
  const ny = living(s).filter(p => p.born > s.now - HOUR && p.born <= s.now), modrar = new Set<number>();
  for (const b of ny) {
    const m = byId(s, b.mother), f = byId(s, b.father);
    for (const q of [m, f]) { const tr = troOf(s, q?.tro); if (tr) tr.fodd = s.now; } // födseln bland de troende lyfter fram budet
    if (!m || modrar.has(m.id)) continue;
    modrar.add(m.id);
    const tr = troMedBud(s, 'dop', m, f);
    if (!tr) continue;
    const barn = ny.filter(q => q.mother === m.id);
    nyRitual(s, 'dop', { tro: tr.id, om: [m.id, ...(f ? [f.id] : [])], namn: `Dopet av ${barn.map(q => q.name).join(' och ')}` });
  }
  for (const p of living(s)) {
    if (ageOf(p, s.now) < ALDER.vuxen || ageOf(p, s.now - HOUR) >= ALDER.vuxen) continue;
    const m = byId(s, p.mother), f = byId(s, p.father);
    for (const q of [p, m, f]) { const tr = troOf(s, q?.tro); if (tr) tr.vuxen = s.now; }
    const tr = troMedBud(s, 'vuxen', p, m, f);
    if (tr) nyRitual(s, 'vuxen', { tro: tr.id, om: [p.id], namn: `${p.name} blir vuxen` });
  }
}
// högtiderna (steg 8.5.14 och 10.3.3): en tro har 0–4, var och en ett bud knutet till en tidsålder. Skalan Fest – Försakelse avgör bara hur
// många som föreslås; formen (gille eller fasta) sparas i budet när det antas och står kvar när skalan flyttar sig
export const hogtider = (tr: Tro) => { const f = skalaV(tr, 'fest') ?? 50; return f < KULT.fest ? 2 + (f < 25 ? 2 : 0) : f > 75 ? 0 : 1; };
export type HogtidForm = 'gille' | 'fasta';
const HOGTIDSNAMN = ['Isblotet', 'Vårfesten', 'Midsommarnatten', 'Skördenatten'];
const TIDSALDER = ['istiden', 'vårtiden', 'sommartiden', 'hösttiden'];
// budets värde: tidsålderns nummer och formen, t.ex. "2:gille"
export const hogtidVarde = (ai: number, form: HogtidForm) => `${ai}:${form}`;
export const hogtidAv = (v: unknown) => { const [a, f] = String(v).split(':'); return { ai: Number(a), form: (f === 'fasta' ? 'fasta' : 'gille') as HogtidForm }; };
export const hogtidNamn = (v: unknown) => { const { ai, form } = hogtidAv(v); return form === 'fasta' ? `Fastan i ${TIDSALDER[ai]}` : HOGTIDSNAMN[ai]; };
export const hogtidForm = (tr: Tro): HogtidForm => (skalaV(tr, 'fest') ?? 0) > KULT.forsakelse ? 'fasta' : 'gille';
// den högtid tron kan rösta in nu: tidsålderns, så länge tron har färre än skalan ger och inte redan har en i den här tidsåldern
export function hogtidNu(s: State, tr: Tro): string[] {
  const har = (tr.bud ?? []).filter(b => b.id === 'hogtid'), ai = ageIndex(s);
  return har.length >= hogtider(tr) || har.some(b => hogtidAv(b.v).ai === ai) ? [] : [hogtidVarde(ai, hogtidForm(tr))];
}
// högtiden firas en gång i sin tidsålder, första gången i samma tidsålder som den antogs
function hogtidSteg(s: State, tr: Tro) {
  const ai = ageIndex(s), st = ageStart(s, ai);
  if (tr.hogtid === st) return;
  const b = tr.bud?.find(x => x.id === 'hogtid' && hogtidAv(x.v).ai === ai);
  if (!b) return;
  tr.hogtid = st;
  nyRitual(s, 'hogtid', { tro: tr.id, namn: hogtidNamn(b.v), form: hogtidAv(b.v).form });
}
// när högtiden slutar: gillets mat eller fastans dygn, och offret av dem som följer budet
function hogtidSlut(s: State, tr: Tro, r: Ritual, med: Person[]) {
  const f = (tr.forrad ??= {});
  for (const p of med) {
    if (r.form === 'fasta') { if (p.tro === tr.id) p.fasta = s.now + DAY; }
    else { // gillet: en hel mat, ur kyrkans egendom först och annars ur den egna maten; den som inget har äter inte
      const k = FOOD.find(q => (f[q] ?? 0) >= 1);
      if (k) { f[k]--; ata(p, { [k]: KROPP.mattar }); count(s, 'gille_mat'); }
      else { const e = ownedStock(s, p), m = FOOD.filter(q => (e[q] ?? 0) >= 1).sort((a, b) => (e[b] ?? 0) - (e[a] ?? 0))[0]; if (m) { use(s, p, m, 1); ata(p, { [m]: KROPP.mattar }); count(s, 'gille_mat'); } }
    }
    // offret: den som följer budet lägger en hel mat, den hen äger mest av, på den heliga platsen, och den är borta
    if (p.tro !== tr.id || !budIn(tr, 'offer') || !foljer(p, 'offer')) continue;
    const e = ownedStock(s, p), m = FOOD.filter(q => (e[q] ?? 0) >= 1).sort((a, b) => (e[b] ?? 0) - (e[a] ?? 0))[0];
    if (m) { use(s, p, m, 1); p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + KULT.offerTro); count(s, 'offer'); }
    else think(p, 'Hade inget att offra', KULT.offerInget, s.now, 12 * HOUR);
  }
}
// ---------- varje timme ----------
export function kultTimme(s: State) {
  for (const p of living(s)) { bonSvar(s, p); profetSteg(s, p); }
  livsRiter(s);
  for (const tr of levande(s)) {
    const folk = troende(s, tr);
    if (!folk.length) continue;
    prastSteg(s, tr, folk);
    hogtidSteg(s, tr);
    if (rymsBud(s, tr, 1) && tr.x !== undefined && !s.heliga?.some(h => h.tro === tr.id)) helga(s, tr, tr.x, tr.y!, 'där tron föddes');
    const pr = prastOf(s, tr);
    if (pr && !s.ritual && !s.ritualKo?.some(r => r.k === 'leddBon' && r.tro === tr.id) && (tr.leddBon ?? 0) + 2 * DAY <= s.now && helig(s, tr)) { tr.leddBon = s.now; nyRitual(s, 'leddBon', { tro: tr.id }); }
  }
  if (Math.floor(s.now / HOUR) % 24 === 0) vanhelga(s);
  ritualTimme(s);
}
