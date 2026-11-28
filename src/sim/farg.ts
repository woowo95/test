// ---------- färgningen (steg 13.3.2, Fler kläder: Färgade kläder och mode i fliken Människan) ----------
// Färgen sitter på plagget som kvaliteten (Ting.farg) och är ingen egen sak: "Blå tunika av lin". Färgerna är rader i FARGER:
// namnet, växterna ett bad tar (ett eller flera sätt) och rampen i paletten (palett.ts). Blandfärgerna har de två färger de
// blandas av: ett bad i den ena färgen på ett plagg i den andra ger blandfärgen, i vilken ordning som helst, och ett bad i en
// färg som inte blandas med plaggets byter färgen. Bara plagg av lin och ylle tar färg.
// Den som kan Färgning och äger ett plagg av lin eller ylle badar det vid örtköket (handlingen farga): plagget, växterna,
// vattnet ur en fylld säck och en ledig lerkruka, som blir kvar tom. Valet är en rad i FORBATTRA (val.ts): poängen är smaken för
// färgen, anseendet den ger och värdet den lägger på plagget, minus maten i växterna (bären) när byn är hungrig. Smaken för en
// färg ligger i p.smak med 'f:' före (rykten.ts); var den kommer ifrån är steg 13.3.5.
import { balans } from './balans';
import { Person, State, Task } from './typer';
import { Ting, allaTing, harReceptVatten, taReceptVatten } from './agande';
import { KLADMATERIAL, kladAv } from './klader';
import { getable, takeMaterial } from './behov';
import { ALDER, ageOf, count, forstaGang, gjort, living, log, ovning } from './folk';
import { knows } from './teknik';
import { RYKTE, ryktbarhet, smakAv } from './rykten';
import { fargKrok } from './fargkrok';
import { ledigKruka } from './matlagning';
import { isKlar, stationDef, stationFor, stationerOf, type Station } from './stationer';
import { grundvarde, varuVarde, vardeKrok, ARBETE } from './varde';
import { SAKER, sakNamn, namnKrok } from './saker';
import { foodDaysAll } from './ekonomi';
import { buffert } from './forradsmal';
import { getRel, isParent } from './folk';
import { hash3 } from './slump';
import { drarSed } from './seder';
import { gudarOf, troOf, type GudOmr } from './religion';
import { arPrast } from './kultlatt';
import { clamp } from './slump';
import { personHand } from './personlogg';

export const FARG = balans('farg', {
  min: 3, // ett bad tar så här många minuter (Arbetstider: en liten sak)
  ans: 0.03, // ett färgat plagg ger så här mycket anseende gånger 1 + byns smak för färgen (rykten.ts)
  tanke: 0.02, // den som bär en färg hen tycker om får en så här stor tanke, gånger smaken
  vSmak: 1, // i valet: smaken för färgen ...
  vAns: 10, // ... anseendet (FARG.ans gånger detta) ...
  vVarde: 0.5, // ... och värdet färgen lägger på plagget, som en del av plaggets eget värde ...
  vMat: 0.05, matMatt: 0.1, // ... minus maten i växterna gånger detta, gånger matMatt + hur hungrig byn är (0 till 1)
  ovning: 0.02,
});

export interface FargDef { namn: string; adj: string; ramp: string; av?: Record<string, number>[]; blandas?: [string, string] }
export const FARGER = {
  gult: { namn: 'Gult', adj: 'Gul', ramp: 'senap', av: [{ rolleka: 2 }] },
  rott: { namn: 'Rött', adj: 'Röd', ramp: 'rost', av: [{ mara: 2 } as Record<string, number>, { krapp: 1 }] },
  brunt: { namn: 'Brunt', adj: 'Brun', ramp: 'jord', av: [{ naver: 2 }] },
  svart: { namn: 'Svart', adj: 'Svart', ramp: 'kol', av: [{ naver: 2, malm: 1 }] },
  blatt: { namn: 'Blått', adj: 'Blå', ramp: 'bla', av: [{ vejde: 2 }] },
  lila: { namn: 'Lila', adj: 'Lila', ramp: 'lila', av: [{ bar: 4 }], blandas: ['rott', 'blatt'] },
  gront: { namn: 'Grönt', adj: 'Grön', ramp: 'oliv', blandas: ['gult', 'blatt'] },
} satisfies Record<string, FargDef>;
export type FargId = keyof typeof FARGER;
const DEF: Record<string, FargDef> = FARGER;
export const FARG_LIST = Object.keys(FARGER) as FargId[];
// färgerna som har ett eget bad (de andra blandas bara)
const BAD = FARG_LIST.filter(f => DEF[f].av);
// växterna som någon färg tar, och hur många ett bad tar som mest (förrådsmålen, forradsmal.ts)
export const FARGVAXTER: Record<string, number> = {};
for (const f of BAD) for (const a of DEF[f].av!) for (const k in a) FARGVAXTER[k] = Math.max(FARGVAXTER[k] ?? 0, a[k]);

// färgen plagget får av ett bad i färgen bad, när det är färgat fore
export const efterBad = (fore: string | undefined, bad: string) => FARG_LIST.find(f => { const b = DEF[f].blandas; return !!b && fore !== bad && b.includes(fore!) && b.includes(bad); }) ?? bad;
// tar plagget färg: av lin eller ylle
export const tarFarg = (k: string) => { const r = kladAv(k); return !!r && (KLADMATERIAL[r.mat].slag === 'tyg' || KLADMATERIAL[r.mat].slag === 'ull'); };
// ett bads värde: de billigaste växterna och arbetet. En blandfärg har krävt två bad
const badVarde = (f: string) => Math.min(...DEF[f].av!.map(a => varuVarde(a))) + FARG.min / 60 * ARBETE;
export const fargVarde = (f: string | undefined): number => !f || !DEF[f] ? 0 : DEF[f].blandas ? fargVarde(DEF[f].blandas![0]) + fargVarde(DEF[f].blandas![1]) : badVarde(f);
vardeKrok.farg = (t: Ting) => t.farg ? fargVarde(t.farg) * t.c : 0;
namnKrok.farg = (t: { k: string; farg?: string }) => t.farg && DEF[t.farg] ? `${DEF[t.farg].adj} ${sakNamn(t.k).toLowerCase()}` : undefined;

// smaken för färgen f hos p, och hos byn (snittet bland de levande)
export const fargSmak = (p: Person, f: string | undefined) => f ? smakAv(p, 'f:' + f) : 0;
export function bynsSmak(s: State, f: string) { const l = living(s); return l.length ? l.reduce((a, p) => a + fargSmak(p, f), 0) / l.length : 0; }
// anseendet ett plagg i färgen f ger den som bär det (rykten.ts)
export const fargAnseende = (s: State, f: string | undefined) => f ? FARG.ans * (1 + bynsSmak(s, f)) : 0;
fargKrok.anseende = fargAnseende;
Object.assign(fargKrok.vaxter, FARGVAXTER);
// byns mode: färgen med högst smak i snitt
export const bynsMode = (s: State) => FARG_LIST.reduce<{ f?: FargId; v: number }>((b, f) => { const v = bynsSmak(s, f); return v > b.v ? { f, v } : b; }, { v: 0 }).f;

// växterna till ett bad i färgen bad som p kan få nu: det första sättet där allt finns
export const badAv = (s: State, p: Person, bad: string) => DEF[bad]?.av?.find(a => Object.entries(a).every(([k, n]) => getable(s, p, k) >= n));
// maten i växterna (bären är mat)
const matI = (a: Record<string, number>) => Object.entries(a).reduce((m, [k, n]) => m + n * (SAKER[k]?.mat ?? 0), 0);

// det som p kan bada: plaggen av lin och ylle hen äger (på sig eller i förrådet), och hens färdiga mattor (steg 13.3.3), med värdet utan färg
type Badbart = { id: number; farg?: string; varde: number; matta?: Station; t?: Ting };
const mattorAv = (s: State, p: Person) => stationerOf(s).filter(m => m.ag === p.id && m.k.startsWith('matta_') && isKlar(m));
const mattVarde = (m: Station) => varuVarde(stationDef(m.k)?.av ?? {});
function badbart(s: State, p: Person): Badbart[] {
  const ut: Badbart[] = allaTing(s).filter(t => t.agare === p.id && (t.bar === undefined || t.bar === p.id) && tarFarg(t.k)).map(t => ({ id: t.id, farg: t.farg, varde: grundvarde(t.k), t }));
  for (const m of mattorAv(s, p)) ut.push({ id: m.id, farg: m.farg, varde: mattVarde(m), matta: m });
  return ut;
}

// det bästa badet p kan ge ett av sina plagg eller sina mattor nu: det som badas, färgen i badet, färgen det får och poängen
// (raden farga i FORBATTRA, val.ts). Bara den vuxna som kan Färgning, med ett örtkök, vatten och en ledig kruka. Mattan ger
// inget anseende; den bärs till örtköket och badas hel, med samma växter som ett plagg
export function fargVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || !knows(p, 'fargning') || !stationFor(s, 'farga', p) || !harReceptVatten(s) || !ledigKruka(s)) return undefined;
  const saker = badbart(s, p);
  if (!saker.length) return undefined;
  const hunger = clamp(1 - foodDaysAll(s) / Math.max(1e-9, buffert(s, 'mat')), 0, 1);
  let bast: { t: Badbart; bad: FargId; blir: FargId; sc: number } | undefined;
  for (const bad of BAD) {
    const a = badAv(s, p, bad);
    if (!a) continue;
    const kost = FARG.vMat * matI(a) * (FARG.matMatt + hunger);
    for (const t of saker) {
      const blir = efterBad(t.farg, bad) as FargId;
      if (blir === t.farg) continue;
      const ans = t.matta ? 0 : FARG.vAns * (fargAnseende(s, blir) - fargAnseende(s, t.farg));
      const sc = FARG.vSmak * (fargSmak(p, blir) - fargSmak(p, t.farg)) + ans + FARG.vVarde * (fargVarde(blir) - fargVarde(t.farg)) / Math.max(1e-9, t.varde) - kost;
      if (sc > (bast?.sc ?? 0)) bast = { t, bad, blir, sc };
    }
  }
  return bast;
}
// arbetets tool: färgen i badet, med matta: före när det är en matta som badas (ref är då stationen, inte ett plagg)
export const fargTool = (bad: string, matta: boolean) => (matta ? 'matta:' : '') + bad;
const lasTool = (tool?: string) => ({ matta: !!tool?.startsWith('matta:'), bad: tool?.replace(/^matta:/, '') });
// växterna som hämtas till badet (HAMTAS i hamtning.ts)
export const fargaHamtas = (s: State, p: Person, tk: Task) => { const { bad } = lasTool(tk.tool); return bad ? badAv(s, p, bad) ?? DEF[bad]?.av?.[0] : undefined; };
// när badet är klart: plagget eller mattan (task.ref, en matta när tool börjar med matta:) får färgen, om hen äger det och allt finns
export function fargaKlar(s: State, p: Person, tk: Task) {
  const { bad, matta } = lasTool(tk.tool);
  const m = matta ? stationerOf(s).find(q => q.id === tk.ref && q.ag === p.id && q.k.startsWith('matta_')) : undefined;
  const t = matta ? undefined : allaTing(s).find(q => q.id === tk.ref && q.agare === p.id && (q.bar === undefined || q.bar === p.id) && tarFarg(q.k));
  if ((!t && !m) || !bad) return;
  const a = badAv(s, p, bad);
  if (!a || !harReceptVatten(s) || !ledigKruka(s)) { count(s, 'fargMiste'); return; }
  for (const [k, n] of Object.entries(a)) takeMaterial(s, p, k, n);
  taReceptVatten(s); // vattnet ur säcken; krukan står kvar tom
  const fore = (t ?? m)!.farg, blir = efterBad(fore, bad);
  if (t) t.farg = blir; else m!.farg = blir;
  ovning(p, 'hantverk', FARG.ovning); gjort(s, p, 'fargat'); count(s, 'fargat'); count(s, 'fargat_' + blir);
  if (m) count(s, 'fargatMatta');
  const sak = t ? sakNamn(t.k).toLowerCase() : (stationDef(m!.k)?.namn ?? 'matta').toLowerCase();
  const namn = `${DEF[blir].adj.toLowerCase()} ${sak}`;
  personHand(s, p, 'fargade', fore ? `Badade ${m ? 'sin matta' : 'sitt plagg'} igen och fick ${m ? 'den' : 'det'} ${DEF[blir].namn.toLowerCase()}: ${namn}.` : `Färgade ${m ? 'sin matta' : 'sitt plagg'} vid örtköket: ${namn}.`);
  if (forstaGang(s, 'forstaFarg')) log(s, `${p.name} badade ${m ? 'en matta' : 'ett plagg'} med växter vid örtköket och fick byns första färgade ${m ? 'matta' : 'plagg'}: ${namn}.`, 'world', [p.id]);
  if (DEF[blir].blandas && forstaGang(s, 'forstaBlandfarg')) log(s, `${p.name} badade ${m ? 'en' : 'ett'} ${(m ? DEF[fore!].adj : DEF[fore!].namn).toLowerCase()} ${m ? 'matta' : 'plagg'} i ${DEF[bad].namn.toLowerCase()} och fick ${m ? 'den' : 'det'} ${DEF[blir].namn.toLowerCase()}.`, 'world', [p.id]);
}
// färgerna p har på sig och tycker om: den största smaken (för tanken i steg.ts)
export function barGillad(p: Person, pa: Ting[]) { let v = 0; for (const t of pa) if (t.farg) v = Math.max(v, fargSmak(p, t.farg)); return v; }

// ---------- var smaken för en färg kommer ifrån (steg 13.3.5, Färgade kläder och mode i fliken Människan) ----------
// Smaken för en färg ligger i p.smak med 'f:' före och bleknar inte av sig själv. När smaken för en färg växer sjunker hens
// andra färger lika mycket tillsammans (de hen tycker om, efter hur mycket), så att en ny favorit tränger undan den gamla.
// Källorna är rader i FARGSMAK; födseln, minnena och samtalet anropas där det händer (fargkrok.ts), barndomen, förebilden,
// tron och Förnyelsen en gång i timmen (stepFargsmak, raden färgsmaken i TAKTER).
export const FSMAK = balans('fargsmak', {
  fodd: 0.3, foddV: 0.4, // så stor del föds med en favoritfärg, och så stark är den
  barn: 0.004, // per timme: barnet nära en förälder som bär färgen
  forebild: 0.002, // per timme: den som är nära någon med högre anseende som bär färgen
  trad: 1, // den som drar åt Tradition får så här mycket mer av förebilden (gånger hur mycket hen drar) när färgen är byns mode
  ny: 1, nyFa: 0.25, // den som drar åt Förnyelse får så mycket mer av förebilden när färgen bärs av färre än nyFa av byn ...
  nyManga: 0.5, nyTappa: 0.003, // ... och tappar per timme smaken för en färg som fler än nyManga av byn bär
  samtal: 0.05, // i ett samtal får den andra så mycket av en favoritfärg, om de står varandra nära
  gava: 0.15, gavaOp: 20, // en färgad gåva av någon man tycker om (relationen över gavaOp)
  sorg: 0.2, // den som sörjer får tycke för den dödas färg
  vald: 0.25, // avsmak för färgen den bar som anföll eller rånade en
  tro: 0.003, prast: 3, // per timme: de troende mot trons färg gånger styrkan i tron (0 till 1), prästen så här många gånger mer
});
export interface FargSmakDef { namn: string; text: string }
export const FARGSMAK = {
  fodd: { namn: 'Födseln', text: 'några föds med en favoritfärg' },
  barndom: { namn: 'Barndomen', text: 'barnet får tycke för den färg föräldrarna bär' },
  forebild: { namn: 'Förebilden', text: 'den som är nära någon med högre anseende som bär färgen, och samtalen' },
  minnen: { namn: 'Minnena', text: 'en färgad gåva, den dödas färg och avsmak för färgen hos den som anföll eller rånade' },
  tro: { namn: 'Tron', text: 'de troende tycker om trons färg, prästerna mest' },
  sed: { namn: 'Tradition mot Förnyelse', text: 'Tradition härmar modet, Förnyelse söker det få bär och tappar det alla bär' },
} satisfies Record<string, FargSmakDef>;
// våldet som ger avsmak för den våldsammes färg (handelserna i rykten.ts)
const VALD = new Set(['ranVald', 'sla', 'misshandel']);
// trons färg: guden tron föddes med, eller den äldsta som finns kvar (GUDAR i religion.ts, Trons färg i fliken Samhället)
export const GUDFARG: Record<GudOmr, FargId> = { aska: 'blatt', sjon: 'blatt', skord: 'gult', doden: 'svart', jakt: 'gront', elden: 'rott', vintern: 'blatt', solen: 'gult', atten: 'brunt', kriget: 'rott', hantverk: 'brunt' };
export function trosFarg(s: State, troId: number | undefined): FargId | undefined {
  const tr = troOf(s, troId);
  if (!tr?.gudar?.length) return undefined;
  const g = tr.gudar[0].slut === undefined ? tr.gudar[0] : gudarOf(tr)[0];
  return g ? GUDFARG[g.omr[0]] : undefined;
}

// smaken för färgen f växer (eller sjunker) med d; när den växer sjunker de andra färgerna hen tycker om lika mycket tillsammans
export function fargSmaka(p: Person, f: string, d: number) {
  const k = 'f:' + f, fore = smakAv(p, k), v = clamp(fore + d, -1, 1), okat = v - fore;
  if (Math.abs(v) < 1e-3) { if (p.smak) delete p.smak[k]; } else (p.smak ??= {})[k] = v;
  if (okat <= 0 || !p.smak) return;
  const andra = FARG_LIST.filter(g => g !== f && (p.smak![`f:${g}`] ?? 0) > 0), sum = andra.reduce((a, g) => a + p.smak![`f:${g}`], 0);
  if (sum <= 0) return;
  const ta = Math.min(okat, sum);
  for (const g of andra) { const kk = `f:${g}`, n = p.smak[kk] - ta * p.smak[kk] / sum; if (n < 1e-3) delete p.smak[kk]; else p.smak[kk] = n; }
}
// favoritfärgen: den hen tycker mest om, om den är en favorit (RYKTE.smakFavorit)
export const favoritFarg = (p: Person) => FARG_LIST.reduce<{ f?: FargId; v: number }>((b, f) => { const v = smakAv(p, 'f:' + f); return v > b.v ? { f, v } : b; }, { v: RYKTE.smakFavorit - 1e-9 }).f;
// färgerna p bär (plaggen hen har på sig)
const barFarger = (s: State, p: Person) => { const ut = new Set<string>(); for (const t of allaTing(s)) if (t.bar === p.id && t.farg) ut.add(t.farg); return ut; };
// den första färgen en person bär (för minnena)
export const barFarg = (s: State, p: Person) => allaTing(s).find(t => t.bar === p.id && t.farg)?.farg;

// födseln: räknad ur platsen i slumpen (hash), så att den inte tar något ur slumpen och inte ändrar något annat
fargKrok.fodd = (s: State, p: Person) => {
  if (hash3(s.seed, p.id, 131) >= FSMAK.fodd) return;
  fargSmaka(p, FARG_LIST[Math.floor(hash3(s.seed, p.id, 132) * FARG_LIST.length)], FSMAK.foddV);
};
// samtalet: b får av a:s favoritfärg när de står varandra nära
fargKrok.samtal = (a: Person, b: Person, op: number) => { if (op < 20) return; const f = favoritFarg(a); if (f) fargSmaka(b, f, FSMAK.samtal); };
// minnena: våldet, den döda och gåvan
fargKrok.handelse = (s: State, p: Person, h: string, offer: Person) => { if (!VALD.has(h)) return; const f = barFarg(s, p); if (f) fargSmaka(offer, f, -FSMAK.vald); };
fargKrok.dodFarg = (s: State, p: Person) => barFarg(s, p);
fargKrok.sorjer = (q: Person, f: string) => fargSmaka(q, f, FSMAK.sorg);
fargKrok.gava = (s: State, g: Person, m: Person, ting: { farg?: string }[]) => {
  const f = ting.find(t => t.farg)?.farg;
  if (f && getRel(s, m, g).op > FSMAK.gavaOp) fargSmaka(m, f, FSMAK.gava);
};

// en gång i timmen (TAKTER i steg.ts): barndomen, förebilden, tron och Förnyelsen. h = timmarna sedan sist
export function stepFargsmak(s: State, h = 1) {
  const folk = living(s);
  if (!folk.length) return;
  const bar = new Map(folk.map(p => [p, barFarger(s, p)]));
  if (![...bar.values()].some(b => b.size) && !s.tron?.length) return; // ingen bär någon färg och ingen tro: inget att räkna
  const andel: Record<string, number> = {};
  for (const b of bar.values()) for (const f of b) andel[f] = (andel[f] ?? 0) + 1 / folk.length;
  const mode = bynsMode(s);
  const ans = new Map<Person, number>();
  const ansOf = (p: Person) => { let v = ans.get(p); if (v === undefined) { v = ryktbarhet(s, p.id).a; ans.set(p, v); } return v; };
  for (const p of folk) {
    const nara = folk.filter(q => q !== p && bar.get(q)!.size && Math.hypot(q.x - p.x, q.y - p.y) < RYKTE.syn);
    if (ageOf(p, s.now) < ALDER.vuxen) {
      // barndomen: färgerna föräldrarna nära bär
      for (const q of nara) if (isParent(q, p)) for (const f of bar.get(q)!) fargSmaka(p, f, FSMAK.barn * h);
    } else if (nara.length) {
      // förebilden: den med högre anseende som bär färgen, och seden Tradition mot Förnyelse
      const lean = clamp(drarSed(s, p, 'nyfikenhet'), -1, 1), mitt = ansOf(p);
      const sett = new Set<string>();
      for (const q of nara) if (ansOf(q) > mitt) for (const f of bar.get(q)!) sett.add(f);
      for (const f of sett) {
        const extra = (lean < 0 && f === mode ? FSMAK.trad * -lean : 0) + (lean > 0 && (andel[f] ?? 0) < FSMAK.nyFa ? FSMAK.ny * lean : 0);
        fargSmaka(p, f, FSMAK.forebild * (1 + extra) * h);
      }
    }
    // Förnyelsen tappar smaken för det de flesta bär
    if (ageOf(p, s.now) >= ALDER.vuxen) { const lean = drarSed(s, p, 'nyfikenhet'); if (lean > 0) for (const f in andel) if (andel[f] > FSMAK.nyManga && smakAv(p, 'f:' + f) > 0) fargSmaka(p, f, -FSMAK.nyTappa * Math.min(1, lean) * h); }
    // tron: mot trons färg, mer ju starkare hen tror, prästen mest
    const tf = trosFarg(s, p.tro);
    if (tf) fargSmaka(p, tf, FSMAK.tro * (p.troStyrka ?? 0) / 100 * (arPrast(s, p) ? FSMAK.prast : 1) * h);
  }
}
