// Bönen, de heliga platserna, ritualerna, prästen och profeten (system 8.5). Tre register: BONER (en rad per sorts bön), HELIGA_PLATSER (en rad
// per sort) och RITUALER (en rad per ritual). Graven och kroppen står i kvarlevor.ts, tron i religion.ts. Bön och offer påverkar nästan bara
// humöret och tron, och går aldrig före maten eller veden.
import { troshusPlats, troshusRum } from './troshus';
import { personHand } from './personlogg';
import { DAY, HOUR, MIN, Person, State, T, W, inMap } from './typer';
import { balans } from './balans';
import { clamp, rnd } from './slump';
import { ALDER, KROPP, ageOf, alive, byId, count, isParent, living, log, stat, think } from './folk';
import { kronika } from './historik';
import { tatKrok, upplev } from './uppvaxt';
import { SKRIFT } from './skriftTal';
import { TRO, Tro, andlighet, grunda, tecken, skalaV, troNamn, troOf, troende } from './religion';
import { ageIndex, ageStart } from './tid';
import { getMap } from './karta';
import { groundOf } from './mark';
import { FOREST } from './vag';
import { freeNear, roomAt } from './byggnad';
import { eldPlats } from './karta';
import { addTo, amountOf, ownedStock, use } from './lager';
import { ata } from './naring';
import { budIn, foljer, gravolKan, gravolSlut, hogtidKrav, hogtidMat, hogtidOlKvade, kyrkansAv, kyrkanTar, sorgkvade } from './kyrka';
import { kvarById, nara } from './kvarlevor';
import { FOOD } from './saker';
import { takeMaterial } from './behov';
import { kladAv } from './klader';
import { FEST, heligtDjurAv, matAvstar, nyRitual, satEgendomVarde, satGravVarde, vanhelgaPlats } from './kultlatt';
import { tamdjurOf } from './tamdjur';
import { grundvarde, tingVarde, varuVarde } from './varde';
import { och, tal } from './ord';
import { notis } from './notiser';
satGravVarde(t => tingVarde(t)); // gravgåvan är den finaste saken (steg 10.3.5)
satEgendomVarde(o => varuVarde(o) / grundvarde('ved')); // kyrkans egendom i trons tyngd (steg 10.3.8)
import { isSick } from './sjukdom';
import { prastMinns } from './rykten';

// farorna över byn (dangers i val.ts, som sätter den här när den laddas: val.ts läser det mesta i spelet)
let dangers: (s: State) => { kyla: boolean; svalt: boolean } = () => ({ kyla: false, svalt: false });
export const satFaror = (f: typeof dangers) => { dangers = f; };
// farorna nu, för de filer som inte kan läsa val.ts (djurhållningen frågar samma svältmått som valet av aktivitet, steg 10.2.1)
export const farorNu = (s: State) => dangers(s);
export const KULT = balans('kult', {
  heligR: 15, // man ber vid den närmaste heliga platsen inom så här många rutor, och röstar för en plats så nära hemmet (steg 10.3.10)
  heligTak: 3, // en tro har högst så här många heliga platser
  heligKand: 5, // så många rutor där en bön i nöd fick svar minns tron
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
  tystTro: 1, // tron den tysta begravningen ger (steg 10.4.5)
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
  const spot = helig(s, tr, p) ?? vidElden(s); // vid den närmaste heliga platsen, annars vid elden (steg 10.3.10)
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
  const id = (t.tool ?? 'vardag') as BonId, d = BDEF[id], f = (rokelse(s, p) ? KULT.starkare : 1) * (barTecken(s, p) ? KULT.starkare : 1) * (vidHeligtTing(s, p) ? KULT.starkare : 1);
  think(p, d.namn === 'Vardagsbön' ? 'Bad sin bön' : d.namn, d.ger.humor * f, s.now, 6 * HOUR);
  p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + d.ger.tro * f);
  count(s, 'bon_' + id);
  if (id === 'vardag') p.bonD = dygnNr(s.now);
  if (id === 'nod' || id === 'for') { p.bonNodD = dygnNr(s.now); p.bonVan = { t: s.now, o: id === 'nod' ? (dangers(s).svalt ? 'svalt' : 'kyla') : 'nara', ...(id === 'for' && t.ref !== undefined ? { vem: t.ref } : {}), x: Math.floor(p.x), y: Math.floor(p.y) }; }
  const h = heligVid(s, p.tro, p.x, p.y); if (h) h.boner = (h.boner ?? 0) + 1; // platsen räknar bönerna (steg 10.3.10)
  if (id === 'bikt') { p.skuld = 0; count(s, 'bikt'); }
}
// ber p i trons hus där ett heligt ting står på altaret (steg 10.3.20)?
const vidHeligtTing = (s: State, p: Person) => { const tr = troOf(s, p.tro); if (!tr || !(s.ting ?? []).some(t => t.helig === tr.id)) return false; const r = troshusRum(s, tr); return !!r && roomAt(s, Math.floor(p.x), Math.floor(p.y)) === r; };
const rokelse = (s: State, p: Person) => { if (amountOf(s, 'rokelse') < 1 || rnd(s, 'tro', p) > 0.2) return false; takeMaterial(s, p, 'rokelse', 1); return true; };
// bär prästen sin dräkt eller sin mask (steg 10.3.11)
export const barDrakt = (s: State, p: Person) => (s.ting ?? []).some(t => t.bar === p.id && (kladAv(t.k)?.plagg === 'prastdrakt' || kladAv(t.k)?.plagg === 'mask'));
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
    if (over) { upplev(s, p, 'bonHjalpte'); count(s, 'bon_hjalpte'); bonSvarPlats(s, p, b); tecken(s, p, 'bonSvar'); } else { upplev(s, p, 'bonInte'); p.tvivel = (p.tvivel ?? 0) + 1; count(s, 'bon_inte'); }
  }
}
// rutan där bönen i nöd hölls och fick svar blir en kandidat till en helig plats, också utan präst (steg 10.3.10)
const bonSvarPlats = (s: State, p: Person, v: NonNullable<Person['bonVan']>) => { const tr = troOf(s, p.tro); if (!tr) return; heligKandidat(tr, { x: v.x ?? Math.floor(p.x), y: v.y ?? Math.floor(p.y), t: s.now, om: `där ${p.name}s bön fick svar` }); };
export function heligKandidat(tr: Tro, k: { x: number; y: number; t: number; om: string }) {
  const l = (tr.heligKand ??= []);
  if (l.some(q => q.x === k.x && q.y === k.y)) return;
  l.push(k); if (l.length > KULT.heligKand) l.splice(0, l.length - KULT.heligKand);
}

// ---------- de heliga platserna (steg 8.5.5) ----------
export interface HeligDef { namn: string; ikon: string; passar(s: State, x: number, y: number): boolean }
export const HELIGA_PLATSER = {
  vatten: { namn: 'Det heliga vattnet', ikon: 'helig_vatten', passar: (s, x, y) => narVatten(s, x, y, 2) },
  lund: { namn: 'Den heliga lunden', ikon: 'helig_lund', passar: (s, x, y) => skogNara(s, x, y) >= 4 },
  trad: { namn: 'Det heliga trädet', ikon: 'helig_trad', passar: (s, x, y) => skogNara(s, x, y) >= 1 },
  sten: { namn: 'Den heliga stenen', ikon: 'helig_sten', passar: () => true },
} satisfies Record<string, HeligDef>;
export type HeligSlag = keyof typeof HELIGA_PLATSER;
export interface HeligPlats { x: number; y: number; k: HeligSlag; tro: number; t: number; om: string; skandad?: number; boner?: number; ritualer?: number } // boner och ritualer: hur många som hållits där (steg 10.3.10)
const narVatten = (s: State, x: number, y: number, r: number) => { const m = getMap(s.seed); for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inMap(x + dx, y + dy) && m.tiles[(y + dy) * W + x + dx] === T.Vatten) return true; return false; };
const skogNara = (s: State, x: number, y: number) => { const g = groundOf(s); let n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (inMap(x + dx, y + dy) && g.trees[(y + dy) * W + x + dx] >= FOREST) n++; return n; };
export const heligaOf = (s: State) => (s.heliga ??= []);
export const heligAt = (s: State, x: number, y: number) => s.heliga?.find(h => h.x === x && h.y === y);
// trons heliga platser som gäller (inte vanhelgade)
export const heligaFor = (s: State, tr: Tro) => (s.heliga ?? []).filter(q => q.tro === tr.id && !q.skandad);
// platsen där man står vid den heliga platsen: den första, eller den närmaste inom KULT.heligR från `nara`
export const helig = (s: State, tr: Tro, nara?: { x: number; y: number }) => {
  const l = heligaFor(s, tr);
  const h = nara ? l.filter(q => Math.hypot(q.x - nara.x, q.y - nara.y) <= KULT.heligR).sort((a, b) => Math.hypot(a.x - nara.x, a.y - nara.y) - Math.hypot(b.x - nara.x, b.y - nara.y))[0] : l[0];
  return h && { x: h.x + 0.5, y: h.y + 1.5 };
};
// den heliga plats som någon som står vid (x, y) är vid
const heligVid = (s: State, tro: number | undefined, x: number, y: number) => tro === undefined ? undefined : s.heliga?.find(h => h.tro === tro && !h.skandad && Math.abs(h.x + 0.5 - x) <= 1.5 && Math.abs(h.y + 1.5 - y) <= 1.5);
// kandidaterna till budet En helig plats (steg 10.3.10): platsen där tron föddes, trons helgons gravar och rutorna där en bön i nöd
// fick svar; den som hände först föreslås. När tron har KULT.heligTak platser är en ny ett byte mot den minst använda (steg 10.3.13)
export function heligaKandidater(s: State, tr: Tro) {
  const k: { x: number; y: number; t: number; om: string }[] = [];
  if (tr.x !== undefined) k.push({ x: tr.x, y: tr.y!, t: tr.t, om: 'där tron föddes' });
  for (const h of tr.helgon ?? []) { const g = s.gravar?.find(q => q.vem === h.id); if (g) k.push({ x: g.x, y: g.y, t: h.t, om: `där ${h.namn} ligger begravd` }); }
  k.push(...tr.heligKand ?? []);
  return k.filter(q => !s.heliga?.some(h => h.x === q.x && h.y === q.y)).sort((a, b) => a.t - b.t);
}
export function helga(s: State, tr: Tro, x: number, y: number, om: string) {
  if (heligaOf(s).some(h => h.tro === tr.id && h.x === x && h.y === y)) return;
  const k = (Object.keys(HELIGA_PLATSER) as HeligSlag[]).find(q => (HELIGA_PLATSER[q] as HeligDef).passar(s, x, y))!;
  heligaOf(s).push({ x, y, k, tro: tr.id, t: s.now, om }); count(s, 'helig');
  const t = `${HELIGA_PLATSER[k].namn}: platsen ${om} är nu helig för ${troNamn(tr).toLowerCase()}.`;
  log(s, t, 'rel', []); kronika(s, t, 'tro');
}

// ---------- prästen (steg 8.5.9) ----------
// sorten följer Var och en – Präster; vem som får bli präst följer buden Bara kvinnor och Bara män (steg 10.3.11), och regeln gäller när en präst utses
export const prastSort = (tr: Tro, k: 'k' | 'm') => { const v = skalaV(tr, 'prast') ?? 0; return v < 34 ? (k === 'k' ? 'Völva' : 'Schaman') : v < 67 ? (k === 'k' ? 'Gydja' : 'Gode') : 'Präst'; };
// får q bli präst i tron? Buden Bara kvinnor och Bara män stänger ute det andra könet (steg 10.3.11)
export const farBliPrast = (tr: Tro, q: Person): boolean => !(budInK(tr, 'prastKvinna') && q.sex !== 'k') && !(budInK(tr, 'prastMan') && q.sex !== 'm');
const budInK = (tr: Tro, id: string): boolean => !!tr.bud?.some(b => b.id === id);
export const prastOf = (s: State, tr: Tro) => { const q = byId(s, tr.prast); return q && alive(q) && q.tro === tr.id ? q : undefined; };
// hur väl någon passar som präst: andligheten och karisman
export const prastRang = (s: State, p: Person) => andlighet(s, p) + stat(p, 'karisma', s.now) * 3;
function prastSteg(s: State, tr: Tro, folk: Person[]) {
  if (!budInK(tr, 'prast') || prastOf(s, tr)) return; // en präst utses när tron har budet Tron ska ha en präst, och en ny när prästen dör eller lämnar tron (steg 10.3.12)
  const kand = folk.filter(q => ageOf(q, s.now) >= ALDER.vuxen && andlighet(s, q) >= KULT.prastAnde && farBliPrast(tr, q));
  if (!kand.length) return;
  const p = kand.sort((a, b) => prastRang(s, b) - prastRang(s, a))[0];
  tr.prast = p.id; count(s, 'prast');
  const t = `${p.name} blev ${prastSort(tr, p.sex).toLowerCase()} i ${troNamn(tr).toLowerCase()}.`;
  log(s, t, 'rel', [p.id]); kronika(s, t, 'tro'); p.fame.push(`Blev ${prastSort(tr, p.sex).toLowerCase()}`); personHand(s, p, 'titel', `Blev ${prastSort(tr, p.sex).toLowerCase()}.`);
}

// ---------- profeten (steg 8.5.10) ----------
// chansen att profetens syn grundar en ny tro och hur mycket den annars flyttar en skala
export const profetTal = (tr: Tro) => ({ nyTro: KULT.nyTro * (tr.skrift ? SKRIFT.heligNyTro : 1), skala: KULT.profetSkala * (tr.skrift ? SKRIFT.heligTrog : 1) });
function profetSteg(s: State, p: Person) {
  if (p.profet || p.tro === undefined || andlighet(s, p) < KULT.profetAnde || stat(p, 'karisma', s.now) < KULT.profetKarisma || rnd(s, 'tro', p) >= KULT.profetChans) return;
  const tr = troOf(s, p.tro);
  if (!tr) return;
  p.profet = true; count(s, 'profet'); p.fame.push('Fick en syn');
  // en tro med en helig skrift (steg 10.6.3): profeten grundar oftare en ny tro, på en ny tolkning av kvädena, och synen flyttar skalorna mindre
  if (rnd(s, 'tro', p) < profetTal(tr).nyTro && levande(s).length < TRO.takTro) {
    const t = `${p.name} fick en syn och lämnade ${troNamn(tr).toLowerCase()} för något nytt.`;
    log(s, t, 'rel', [p.id]); kronika(s, t, 'tro');
    p.tro = undefined; grunda(s, p, tr.skrift ? 'tolkning' : 'drom'); return;
  }
  const skala = (['natur', 'manga'] as const)[Math.floor(rnd(s, 'tro', p) * 2)], d = (rnd(s, 'tro', p) < 0.5 ? -1 : 1) * profetTal(tr).skala;
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
    vanhelgaPlats(s, annan); count(s, 'vanhelgad');
    const t = `Några från ${troNamn(tr).toLowerCase()} vanhelgade ${HELIGA_PLATSER[annan.k].namn.toLowerCase()}.`;
    log(s, t, 'rel', []); kronika(s, t, 'tro');
    for (const q of living(s)) if (q.tro === annan.tro) { q.troStyrka = Math.max(0, (q.troStyrka ?? 0) - 3); think(q, 'Någon vanhelgade vår heliga plats', -0.15, s.now, 2 * DAY); }
  }
}

// ---------- ritualerna (steg 8.5.6, 8.5.13, 8.5.14) ----------
export interface RitualDef { namn: string; tim: number; humor: number; tro: number; huvud?: number; mat?(r: Ritual): boolean; /* ritualen har en måltid: festmåltiden ur kokgropen lagas inför den (steg 10.7.28) */ vem(s: State, r: Ritual): Person[]; plats(s: State, r: Ritual): { x: number; y: number }; kan?(s: State, r: Ritual): boolean } // kan: hålls bara när det som går åt finns
export interface Ritual { k: RitualId; start: number; slut: number; x: number; y: number; tro?: number; namn?: string; om?: number[]; gick?: number; form?: HogtidForm; tyst?: true; fran?: number; kropp?: number } // fran = ritualen börjar tidigast då (vakan), kropp = den döda vakan sitter hos
const vuxna = (s: State) => living(s).filter(p => ageOf(p, s.now) >= ALDER.smabarn);
// p har en annan tro än tro, och den är sluten (Öppen – Sluten)
const slutenAnnan = (s: State, p: Person, tro?: number) => { const t = p.tro !== tro ? troOf(s, p.tro) : undefined; return !!t && (skalaV(t, 'oppen') ?? 0) >= KULT.slutenFran; };
const vidElden = (s: State) => { const f = eldPlats(s), q = freeNear(s, f.x + 0.5, f.y + 2); return q; };
export const RITUALER = {
  begravning: { namn: 'Begravning', tim: 1, humor: 0.05, tro: 2, vem: (s, r) => living(s).filter(p => (!r.tyst && p.tro === r.tro) || r.om?.some(id => { const d = byId(s, id); return d && (isParent(p, d) || isParent(d, p) || p.partner === id || d.partner === p.id); })), /* den tysta: bara familjen (steg 10.4.5) */ plats: (_s, r) => ({ x: r.x, y: r.y }) },
  brollop: { namn: 'Bröllop', tim: 2, humor: 0.08, huvud: 0.15, tro: 1, mat: () => true, vem: vuxna, plats: (s, r) => { const tr = troOf(s, r.tro); return (tr && helig(s, tr)) ?? vidElden(s); } }, // välsignat (tron har budet, steg 10.3.3) vid trons heliga plats
  // gillet är en fest för hela byn (steg 10.7.19): alla kommer utom de vars egen tro är en annan och sluten; fastan håller bara de troende
  hogtid: { namn: 'Högtid', tim: 3, humor: 0.1, tro: 3, mat: r => r.form !== 'fasta', vem: (s, r) => living(s).filter(p => p.tro === r.tro || r.form !== 'fasta' && !p.gast && !slutenAnnan(s, p, r.tro)), plats: (s, r) => { const tr = troOf(s, r.tro); return (tr && (troshusPlats(s, tr) ?? helig(s, tr))) ?? vidElden(s); } },
  dop: { namn: 'Dop', tim: 1, humor: 0.05, huvud: 0.1, tro: 1, vem: vuxna, plats: (s, r) => { const tr = troOf(s, r.tro); return (tr && helig(s, tr)) ?? vidElden(s); } }, // steg 10.3.4: huvud = föräldrarna
  vuxen: { namn: 'Vuxenblivande', tim: 1, humor: 0.05, huvud: 0.15, tro: 1, vem: vuxna, plats: (s, r) => { const tr = troOf(s, r.tro); return (tr && helig(s, tr)) ?? vidElden(s); } }, // huvud = den unga
  // vakan och gravölet (steg 10.4.12): de nära sitter hos kroppen (eller vid graven, om den redan begravts) kvällen efter dödsfallet,
  // och byns vuxna dricker gravöl vid elden efter begravningen
  vaka: { namn: 'Vaka', tim: 4, humor: 0.05, tro: 1, vem: (s, r) => living(s).filter(p => r.om?.some(id => nara(s, p, id))),
    plats: (s, r) => { const q = r.kropp !== undefined ? kvarById(s, r.kropp) : undefined, g = q ? undefined : (s.gravar ?? []).find(h => r.om?.includes(h.vem)); return q ?? g ?? { x: r.x, y: r.y }; } },
  gravol: { namn: 'Gravöl', tim: 2, humor: 0.08, tro: 1, vem: s => living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen), plats: s => vidElden(s), kan: (s, r) => gravolKan(s, troOf(s, r.tro)) },
  leddBon: { namn: 'Ledd bön', tim: 1, humor: 0.06, tro: 1.5, vem: (s, r) => living(s).filter(p => p.tro === r.tro), plats: (s, r) => { const tr = troOf(s, r.tro); return (tr && (troshusPlats(s, tr) ?? helig(s, tr))) ?? vidElden(s); } },
} satisfies Record<string, RitualDef>;
export type RitualId = keyof typeof RITUALER;
const RDEF: Record<RitualId, RitualDef> = RITUALER;
// en ritual med mat pågår, eller väntar i kön och börjar inom inom ms (steg 10.7.28): högtidens tid och bröllopets är kända i förväg
festKrok.vantar = (s, inom = Infinity) => (!!s.ritual && !!RDEF[s.ritual.k].mat?.(s.ritual)) || (s.ritualKo ?? []).some(r => !!RDEF[r.k].mat?.(r) && (r.fran ?? s.now) - s.now <= inom);
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
    const tr = r.tro !== undefined ? troOf(s, r.tro) : undefined, pr = tr && prastOf(s, tr);
    // prästen leder (steg 10.3.11): med budet om dräkten ger ritualen mer när prästen bär den och hälften så mycket tro och inget extra humör när den saknas
    const drakt = !!tr && budInK(tr, 'drakt'), bar = !!pr && barDrakt(s, pr);
    const ledd = pr && (!drakt || bar) ? KULT.starkare : 1, troF = !pr || !drakt ? 1 : bar ? KULT.starkare : 0.5;
    for (const p of med) {
      think(p, r.namn ?? d.namn, (r.om?.includes(p.id) ? d.huvud ?? d.humor : d.humor) * ledd, s.now, 12 * HOUR);
      // en ritual ger tro bara till dem som har ritualens tro (steg 10.3.3); fastan ger mer
      if (r.tro !== undefined && p.tro === r.tro) p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + (r.form === 'fasta' ? KULT.fastaTro : r.k === 'vuxen' && r.om?.includes(p.id) ? KULT.vuxenTro : r.tyst ? KULT.tystTro : d.tro) * troF);
      p.task!.until = s.now;
    }
    if (r.k === 'vuxen') for (const id of r.om ?? []) { const q = med.find(o => o.id === id); if (q) tatKrok.vuxen(s, q); } // vuxenblivandet kan märkas i huden (steg 10.7.5)
    if (r.k === 'hogtid' && tr) hogtidSlut(s, tr, r, med);
    if ((r.k === 'hogtid' || r.k === 'leddBon') && pr && med.includes(pr)) prastMinns(s, pr, med); // prästen berättar om en död (steg 10.6.14)
    if (r.k === 'begravning' && tr && r.om?.length) sorgkvade(s, tr, r.om[0]!, med);
    if (r.k === 'gravol' && tr) gravolSlut(s, tr, med);
    count(s, 'ritual_' + r.k);
    s.ritual = undefined;
  }
  if (s.ritual || !s.ritualKo?.length) return;
  // den första i kön vars tid har kommit (vakan väntar till kvällen efter dödsfallet); en ritual utan det som går åt hålls inte
  const i = s.ritualKo.findIndex(r => (r.fran ?? 0) <= s.now);
  if (i < 0) return;
  const n = s.ritualKo.splice(i, 1)[0]!, d = RDEF[n.k];
  if (d.kan && !d.kan(s, n)) { count(s, 'ritual_inte_' + n.k); return; }
  if (n.k === 'brollop') valsigna(s, n);
  const at = d.plats(s, n);
  s.ritual = { ...n, start: s.now, slut: s.now + d.tim * HOUR, x: at.x, y: at.y };
  const hp = heligVid(s, n.tro, at.x, at.y); if (hp) hp.ritualer = (hp.ritualer ?? 0) + 1; // platsen räknar ritualerna (steg 10.3.10)
  log(s, `${n.namn ?? d.namn} samlar byn.`, 'rel', []);
  if (n.k === 'brollop') festMat(s);
  if (n.k === 'begravning' && !s.stat?.ritual_begravning) count(s, 'ritual_forsta_begravning');
}
// bröllopets fest (steg 8.5.13): en hel sak mat per två i byn ur förrådet, av det byn har mest av, och alla blir mättare
function festMat(s: State) {
  if (festKrok.servera(s, living(s)).size) return; // festmåltiden ur kokgropen (steg 10.7.28)
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
  tr.hogtid = st; tr.hogtidDag = Math.floor(s.now / DAY); // dygnet är heligt (steg 10.3.16)
  const form = hogtidAv(b.v).form, namn = hogtidNamn(b.v);
  if (form === 'fasta') { nyRitual(s, 'hogtid', { tro: tr.id, namn, form }); return; }
  // gillet börjar klockan FEST.tim (steg 10.7.19), i dag eller i morgon om den tiden har gått; den dagen är festdagen
  const idag = Math.floor(s.now / DAY) * DAY, fran = idag + FEST.tim * HOUR >= s.now ? idag + FEST.tim * HOUR : idag + DAY + FEST.tim * HOUR;
  const r = { tro: tr.id, namn, form, fran };
  nyRitual(s, 'hogtid', r);
  const at = RDEF.hogtid.plats(s, { k: 'hogtid', start: s.now, slut: 0, x: 0, y: 0, ...r });
  if (s.fest && Math.floor(s.now / DAY) > s.fest.dag) festSlut(s);
  s.fest = { tro: tr.id, namn, dag: Math.floor(fran / DAY), x: at.x, y: at.y, at: 0, fram: [], vann: {} };
}
// när högtiden slutar: gillets mat eller fastans dygn, och offret av dem som följer budet
export function hogtidSlut(s: State, tr: Tro, r: Ritual, med: Person[]) {
  // djuroffret vid högtiden (steg 10.3.15): har tron ett heligt djur som är ett tamdjur offras ett av dem, och det är borta.
  // Ett vilt heligt djur offras inte
  if (r.form !== 'fasta' && budIn(tr, 'djuroffer')) for (const b of tr.bud ?? []) {
    if (b.id !== 'heligtDjur') continue;
    const d = tamdjurOf(s).find(q => q.art === heligtDjurAv(b.v).art);
    if (d) { d.dog = s.now; s.tamdjur = (s.tamdjur ?? []).filter(q => q !== d); count(s, 'heligtOffer'); for (const p of med) if (p.tro === tr.id) p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + KULT.offerTro); }
  }
  const grop = r.form === 'fasta' ? new Set<number>() : festKrok.servera(s, med.filter(p => !(p.tro === tr.id && budIn(tr, 'matKrav') && foljer(p, 'matKrav')))); // festmåltiden ur kokgropen (steg 10.7.28); den som följer budet om högtidens mat äter den
  for (const p of med) {
    if (r.form === 'fasta') { if (p.tro === tr.id) p.fasta = s.now + DAY; }
    else if (grop.has(p.id)) { count(s, 'gille_mat'); if (s.fest?.tro === tr.id) s.fest.at++; }
    else { // gillet: en hel mat, ur kyrkans egendom först och annars ur den egna maten; den som inget har äter inte. Med budet
      // Högtidens mat tas budets ingrediens först, och ingen äter det tron förbjuder hen (steg 10.3.16)
      const ord = hogtidMat(tr).filter(q => !matAvstar(s, p, q)), k = ord.find(q => kyrkansAv(s, tr, q) >= 1);
      let at = k;
      if (k && kyrkanTar(s, tr, k, 1)) { ata(p, { [k]: KROPP.mattar }); count(s, 'gille_mat'); count(s, 'atit', 1); if (s.fest?.tro === tr.id) s.fest.at++; } // en måltid som andra (atit, steg 10.7.19)
      else { const e = ownedStock(s, p), m = ord.filter(q => (e[q] ?? 0) >= 1).sort((a, b) => (hogtidKrav(tr, b) ? 1 : 0) - (hogtidKrav(tr, a) ? 1 : 0) || (e[b] ?? 0) - (e[a] ?? 0))[0]; at = m; if (m) { use(s, p, m, 1); ata(p, { [m]: KROPP.mattar }); count(s, 'gille_mat'); count(s, 'atit', 1); if (s.fest?.tro === tr.id) s.fest.at++; } }
      if (p.tro === tr.id && budIn(tr, 'matKrav') && foljer(p, 'matKrav') && !(at && hogtidKrav(tr, at))) think(p, 'Högtidens mat saknades', KULT.offerInget, s.now, 12 * HOUR);
      else if (at && hogtidKrav(tr, at)) count(s, 'hogtid_ratt');
    }
    // offret: den som följer budet lägger en hel mat, den hen äger mest av, på den heliga platsen, och den är borta
    if (p.tro !== tr.id || !budIn(tr, 'offer') || !foljer(p, 'offer')) continue;
    const e = ownedStock(s, p), m = FOOD.filter(q => (e[q] ?? 0) >= 1).sort((a, b) => (e[b] ?? 0) - (e[a] ?? 0))[0];
    if (m) { use(s, p, m, 1); p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + KULT.offerTro); count(s, 'offer'); }
    else think(p, 'Hade inget att offra', KULT.offerInget, s.now, 12 * HOUR);
  }
  if (r.form !== 'fasta') hogtidOlKvade(s, tr, med); // ölet och kvädet (steg 10.3.23)
}
// de som vann flest matcher under festen, högst tre
function vinnare(v: Record<string, number>) {
  const l = Object.entries(v).sort((a, b) => b[1] - a[1]), max = l[0]?.[1] ?? 0;
  if (!l.length) return [];
  const bast = l.filter(x => x[1] === max).slice(0, 3).map(x => x[0]);
  return [l.length === 1 ? `${bast[0]} vann` : `${och(bast)} vann flest matcher`];
}
// festen är slut (steg 10.7.19): notisen och krönikan säger hur många som åt, vem som uppträdde och vem som vann
function festSlut(s: State) {
  const f = s.fest!; s.fest = undefined;
  const delar = [f.at ? `${tal(f.at)} åt vid gillet` : 'ingen åt vid gillet', ...(f.fram.length ? [`${och(f.fram)} uppträdde`] : []), ...vinnare(f.vann)];
  const text = `${f.namn}: ${och(delar)}.`;
  log(s, text, 'rel', []); notis(s, 'fest', text, [], { x: f.x, y: f.y }); kronika(s, text, 'tro');
  count(s, 'fest');
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
    const pr = prastOf(s, tr);
    if (pr && !s.ritual && !s.ritualKo?.some(r => r.k === 'leddBon' && r.tro === tr.id) && (tr.leddBon ?? 0) + 2 * DAY <= s.now) { tr.leddBon = s.now; nyRitual(s, 'leddBon', { tro: tr.id }); } // vid den heliga platsen, eller vid elden innan tron har en (steg 10.3.10)
  }
  if (Math.floor(s.now / HOUR) % 24 === 0) vanhelga(s);
  if (s.fest && Math.floor(s.now / DAY) > s.fest.dag) festSlut(s); // festdagen är slut
  ritualTimme(s);
}
import { festKrok } from './ratter';
