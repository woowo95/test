import { LAG, efterlevs, lagGaller } from './lagar';
import { personHand } from './personlogg';

import { HOUR } from './typer';
import { ALDER, ageOf, living, log } from './folk';
import { clamp } from './slump';
import { DAY, Person, Seder, State } from './typer';
import { balans } from './balans';
import { kortTal } from './format';
import { ACTS, ACT_LIST } from './handlingar';
import { sedOppen } from './styre';
import { vikter } from './rost';
import { andlighet } from './religion';
import { UpplevelseTyp, upplevelseSed } from './uppvaxt';
import { INTRYCK, intryckStyrka } from './rykten';
import { byId } from './folk';

// ---------- balanstal (regel 8) ----------
// Sederna (arbete, gemenskap, barn, nyfikenhet, försiktighet, rang, från -1 till 1) rör sig långsamt mot det invånarna drar åt:
// var och en efter sin personlighet och de upplevelser hen minns (steg 4.5.4.9). Åldrarna för rösten i sederna och för yrkestaggarna står i ALDER (folk.ts)
export const SED = balans('seder', {
  fortInt: 0.5, fortBarn: 0.15, fortBarnlos: 0.05, // Förtjänst: intelligensen drar åt Förtjänst, barn åt Härkomst och barnlöshet åt Förtjänst
  krigAggr: 0.7, krigMod: 0.3, krigEmp: 0.5, // Krig: aggressionen och modet drar åt Krig, empatin åt Fred
  naturFlit: 0.5, naturEmp: 0.5, // Bruka: fliten drar åt Bruka, empatin åt Värna
  pratDra: 0.5, pratEmp: 0.5, // Pratsamhet: nyfikenheten och karisman drar åt Pratsamhet, empatin åt Förtegenhet
  varnaFran: -0.2, varnaTanke: 0.05, // den som drar mer åt Värna än så här blir ledsen, så här mycket per steg
  mitt: 10, // en vanlig människas egenskap (egenskaper går från 1 till 20) ...
  spann: 6, // ... och så mycket över eller under är ett helt steg åt ena hållet
  // åt vilket håll personen drar sederna, efter sin personlighet
  barnEmpati: 0.8, // barn: empatin gånger så här mycket ...
  barnForalder: 0.1, // ... och så mycket mer för den som själv är förälder
  forsMod: 0.7, // försiktighet: modet (omvänt) gånger så här mycket ...
  forsInt: 0.3, // ... och intelligensen gånger så här mycket
  rangDra: 0.5, // rangordning: modet minus empatin gånger så här mycket
  // inflytandet: hur mycket varje persons röst väger (efter ålder, ALDER), gånger 0,5 + karisma / rostKarisma
  rostUng: 0.5, // under ALDER.fullvuxen
  rostAldre: 1.5, // över ALDER.aldre
  rostBas: 0.5,
  rostKarisma: 20,
  minneSteg: 0.1, minneMax: 0.5, // minnet av en död drar så här mycket per steg i INTRYCK:s sedkolumn gånger minnets styrka, och alla minnen tillsammans högst minneMax per sed (steg 10.4.9)
  uppSteg: 0.1, // en upplevelse drar personens hållning så här mycket per steg i sedkolumnen (UPPLEVELSER i uppvaxt.ts, steg 4.5.4.9)
  snittVikt: 1.8, // målet för en sed är byns snitt gånger så här mycket, från -1 till 1
  rorDygn: 2, // sederna rör sig mot målet med en tidskonstant på så här många dygn
  // pliktkänslan (0 till 1): bas + (flit - mitt) * pliktFlit + (empati - mitt) * pliktEmpati + arbetsseden * pliktSed
  pliktBas: 0.6,
  pliktFlit: 0.035,
  pliktEmpati: 0.015,
  pliktSed: 0.08,
  pliktMin: 0.05,
  pliktMax: 0.98,
  vanaDygn: 4, // vanorna bleknar med en tidskonstant på så här många dygn (tiden räknas mot yrkestaggar)
  // yrkestaggar (bara namn, påverkar inte vad man gör): den som har en tagg behåller den lättare
  taggMinTim: 6, // minst så här många timmar av vanor för att få en tagg
  taggBehallMin: 0.8, // den som har taggen klarar så här stor del av taggens minsta andel ...
  taggKvot: 1.5, // ... och måste göra så här många gånger mer än snittet, annars taggKvotBehall
  taggKvotBehall: 1.2,
  taggMangaNy: 0.3, // ju fler som har samma tagg, desto svårare: 1 + taggMangaNy för varje annan (taggMangaBehall för den som har den)
  taggMangaBehall: 0.12,
  taggPoangBehall: 1.3, // den som har taggen får så här många gånger högre poäng
});

// ---------- seder ----------
const dev = (v: number) => (v - SED.mitt) / SED.spann;
// En sed per rad: namnen åt båda hållen och vad den gör (fliken Seder), och åt vilket håll en person drar seden efter
// sin personlighet (q = egenskaperna, barn = personen är förälder). Alla börjar på 0. Ordningen sparas, så nya seder läggs sist
interface SedDef { pos: string; neg: string; effect: string; dra: (q: Person['pot'], barn: boolean) => number }
const DEF = {
  arbete: { pos: 'Plikt', neg: 'Vila', effect: 'Pliktkänsla: hur mycket man arbetar för byn och hur mycket man vilar.', dra: q => dev(q.flit) },
  gemenskap: { pos: 'Sammanhållning', neg: 'Självförsörjning', effect: 'Hur mycket man bryr sig om att andra fryser och hjälper dem med elden, och hur stor del av det man skaffar som går till byn.', dra: q => dev(q.empati) },
  barn: { pos: 'Många barn', neg: 'Få barn', effect: 'Hur gärna par skaffar barn, och om barnen får leka eller måste hjälpa till.', dra: (q, barn) => dev(q.empati) * SED.barnEmpati + (barn ? SED.barnForalder : 0) },
  nyfikenhet: { pos: 'Förnyelse', neg: 'Tradition', effect: 'Hur snabbt invånarna lär sig nya färdigheter.', dra: q => dev((q.nyfikenhet + q.intelligens) / 2) },
  forsiktighet: { pos: 'Förutseende', neg: 'Dagens behov', effect: 'Hur stora förråd byn vill ha innan man slappnar av, och om elden hålls vid liv.', dra: q => -dev(q.mod) * SED.forsMod + dev(q.intelligens) * SED.forsInt },
  // den första vågskålen (steg 3.5.1): låst (står på 0) tills byn fått sin första ledare (sedOppen i styre.ts)
  fortjanst: { pos: 'Härkomst', neg: 'Förtjänst', effect: 'Den duglige eller släkten: Härkomst flyttar vikt till släkternas äldste och ger arv när ledaren byts.', dra: (q, barn) => -dev(q.intelligens) * SED.fortInt + (barn ? SED.fortBarn : -SED.fortBarnlos) },
  fejd: { pos: 'Fejd', neg: 'Förlikning', effect: 'Om konflikter löses med ord eller med styrka: Fejd flyttar vikt till krigarna, och ledaren kan störtas i strid.', dra: q => dev(q.aggression) - dev(q.empati) },
  krig: { pos: 'Krig', neg: 'Fred', effect: 'Om byn går i strid eller söker fred: Krig gör fler villiga att slåss.', dra: q => dev(q.aggression) * SED.krigAggr + dev(q.mod) * SED.krigMod - dev(q.empati) * SED.krigEmp }, // steg 8.4.11
  natur: { pos: 'Bruka', neg: 'Värna', effect: 'Om naturen är till för att brukas: fällda träd och dödade djur ger sämre humör för dem som drar åt Värna.', dra: q => dev(q.flit) * SED.naturFlit - dev(q.empati) * SED.naturEmp }, // steg 8.4.13
  andlig: { pos: 'Andlig', neg: 'Världslig', effect: 'Om makten kommer från folket eller från gudarna: Andlig flyttar vikt till prästerna, och kyrkan välsignar eller fördömer ledaren.', dra: () => 0 }, // steg 8.6.1: andligheten läggs till i drar() och sedLaggning
  rang: { pos: 'Envälde', neg: 'Folkstyre', effect: 'Hur mycket ledaren bestämmer: ledarens vikt i sederna och påbuden, och hur hårt ledaren straffar.', dra: q => (dev(q.mod) - dev(q.empati)) * SED.rangDra },
  // steg 10.8.6: låst tills byn berättat RYKTE.pratOppna dåliga rykten (rykten.ts). Den nyfikna och karismatiska drar åt Pratsamhet, den empatiska åt Förtegenhet
  prat: { pos: 'Pratsamhet', neg: 'Förtegenhet', effect: 'Hur fritt man talar om andra: i en pratsam by berättas rykten oftare och skvallret väger mindre, i en förtegen by tvärtom.', dra: q => (dev(q.nyfikenhet) + dev(q.karisma)) * SED.pratDra - dev(q.empati) * SED.pratEmp },
} satisfies Record<string, SedDef>;
export type Sed = keyof typeof DEF;
export const SEDER: Record<Sed, SedDef> = DEF;
export const SED_LIST = Object.keys(DEF) as Sed[];
const nollor = () => Object.fromEntries(SED_LIST.map(k => [k, 0])) as Record<Sed, number>;

export function newSeder(): Seder {
  return { v: nollor() };
}
// inflytande över sederna: vuxna och äldre väger mest, karismatiska hörs mer
export function influence(s: State, p: Person) {
  const a = ageOf(p, s.now);
  return (a < ALDER.vuxen ? 0 : a < ALDER.fullvuxen ? SED.rostUng : a > ALDER.aldre ? SED.rostAldre : 1) * (SED.rostBas + p.pot.karisma / SED.rostKarisma);
}
// åt vilket håll personen drar varje sed: personligheten plus de upplevelser hen minns (steg 4.5.4.9). Byns mål och personens
// övertygelser i personrutan
// de som har barn (levande eller döda), en gång i timmen: drar frågas för varje person varje timme och vid varje fällt träd
const foraldrarCache = new WeakMap<State, { key: string; ids: Set<number> }>();
function foraldrar(s: State) {
  const key = `${Math.floor(s.now / HOUR)}:${s.people.length}`, c = foraldrarCache.get(s);
  if (c?.key === key) return c.ids;
  const ids = new Set<number>();
  for (const q of s.people) { if (q.mother !== undefined) ids.add(q.mother); if (q.father !== undefined) ids.add(q.father); }
  foraldrarCache.set(s, { key, ids });
  return ids;
}
// hur p lutar mot Sammanhållning (-1 till 1): budgeten, lönen och skatten läser den
export const lutning = (s: State, p: Person) => clamp(drarSed(s, p, 'gemenskap'), -1, 1);
// x avrundat till närmaste fjärdedel, mellan 0 och 1
export const fjardedel = (x: number) => clamp(Math.round(x * 4) / 4, 0, 1);
export function drar(s: State, p: Person) {
  const barn = foraldrar(s).has(p.id), d = nollor();
  for (const k of SED_LIST) d[k] = SEDER[k].dra(p.pot, barn);
  d.andlig = (andlighet(s, p) - 50) / 50; // byns snitt av andlighet drar seden Världslig – Andlig (steg 8.6.1)
  for (const u of p.upp ?? []) {
    const e = upplevelseSed(u.k);
    if (e) for (const k in e) d[k as Sed] += e[k as Sed]! * SED.uppSteg;
  }
  for (const m of minnen(s, p).values()) for (const k in m.d) d[k as Sed] += m.d[k as Sed]!;
  return d;
}
// en enda seds dragning, samma tal som drar(s, p)[k] med samma tillägg i samma ordning (steg 12.1.104): för den som bara läser en sed
export function drarSed(s: State, p: Person, k: Sed) {
  let v = k === 'andlig' ? (andlighet(s, p) - 50) / 50 : SEDER[k].dra(p.pot, foraldrar(s).has(p.id));
  for (const u of p.upp ?? []) { const e = upplevelseSed(u.k)?.[k]; if (e !== undefined) v += e * SED.uppSteg; }
  for (const m of minnen(s, p).values()) { const x = m.d[k]; if (x !== undefined) v += x; }
  return v;
}
// minnena av de döda som drar personens hållning (steg 10.4.9): per död, INTRYCK:s sedkolumn gånger minnets styrka (styrka
// gånger säkerhet) gånger minneSteg. Tillsammans drar de högst minneMax per sed; blir det mer krymper alla lika mycket
export function minnen(s: State, p: Person) {
  const ut = new Map<number, { namn: string; k: string; v: number; d: Partial<Record<Sed, number>> }>();
  if (!p.intryck) return ut;
  const sum: Partial<Record<Sed, number>> = {};
  for (const e of p.intryck) {
    const sed = INTRYCK[e.k].sed; if (!sed) continue;
    const q = byId(s, e.om); if (q && q.died === undefined) continue; // den som flyttat eller är gäst lever
    const v = intryckStyrka(e) * SED.minneSteg;
    let m = ut.get(e.om); if (!m) ut.set(e.om, m = { namn: e.namn, k: e.k, v: 0, d: {} });
    if (v > m.v) { m.v = v; m.k = e.k; }
    for (const k in sed) { const x = sed[k as Sed]! * v; m.d[k as Sed] = (m.d[k as Sed] ?? 0) + x; sum[k as Sed] = (sum[k as Sed] ?? 0) + Math.abs(x); }
  }
  for (const k in sum) if (sum[k as Sed]! > SED.minneMax) { const f = SED.minneMax / sum[k as Sed]!; for (const m of ut.values()) if (m.d[k as Sed] !== undefined) m.d[k as Sed]! *= f; }
  return ut;
}
// rösterna i sederna: varje persons vikt (vikter i rost.ts, samma som sederTarget använder) och andelen av hela byns röst
// (Tyngsta röster i fliken Seder, steg 4.5.4.10). Störst först. En kopia sorteras: vikter är en cache som simuleringen
// går igenom i sin ordning, och fliken får inte ändra den (regel 2)
export function roster(s: State) {
  return [...vikter(s)].sort((a, b) => b.andel - a.andel).map(x => ({ ...x, w: x.andel }));
}
// det som format sederna (fliken Seder): hur mycket varje slags upplevelse drar byns mål, vägt efter inflytandet som i
// sederTarget, och hur många som minns den. Störst först
export function sedDrag(s: State) {
  const ppl = roster(s), tw = ppl.reduce((a, x) => a + x.w, 0);
  // en rad per slags upplevelse, och en per död som någon minns (om: hen, med intrycket som väger mest, steg 10.4.9)
  type Rad = { k?: UpplevelseTyp; om?: { id: number; namn: string; i: string }; n: Set<number>; d: Record<Sed, number> };
  const m = new Map<string, Rad>();
  for (const { p, w } of ppl) {
    for (const u of p.upp ?? []) {
      const e = upplevelseSed(u.k); if (!e) continue;
      let r = m.get(u.k); if (!r) m.set(u.k, r = { k: u.k, n: new Set(), d: nollor() });
      r.n.add(p.id);
      for (const k in e) if (sedOppen(s, k as Sed)) r.d[k as Sed] += e[k as Sed]! * SED.uppSteg * w / tw * SED.snittVikt;
    }
    for (const [id, mi] of minnen(s, p)) {
      let r = m.get('d' + id); if (!r) m.set('d' + id, r = { om: { id, namn: mi.namn, i: mi.k }, n: new Set(), d: nollor() });
      r.n.add(p.id);
      for (const k in mi.d) if (sedOppen(s, k as Sed)) r.d[k as Sed] += mi.d[k as Sed]! * w / tw * SED.snittVikt;
    }
  }
  const storst = (r: { d: Record<Sed, number> }) => Math.max(...SED_LIST.map(k => Math.abs(r.d[k])));
  return [...m.values()].map(r => ({ k: r.k, om: r.om, n: r.n.size, vem: [...r.n], d: r.d })).filter(r => storst(r) > 0).sort((a, b) => storst(b) - storst(a));
}
// invånarnas läggning (steg 11.1.11, bara för fliken Seder): det personligheten, föräldraskapet och andligheten drar varje sed,
// vägt som i sederTarget. Tillsammans med raderna i sedDrag är det byns mål för seden (innan det hålls inom −1 till 1)
export function sedLaggning(s: State): Record<Sed, number> {
  const t = nollor(), barn = foraldrar(s);
  for (const { p, andel } of vikter(s)) {
    if (!andel) continue;
    for (const k of SED_LIST) t[k] += SEDER[k].dra(p.pot, barn.has(p.id)) * andel;
    t.andlig += (andlighet(s, p) - 50) / 50 * andel;
  }
  for (const k of SED_LIST) t[k] = sedOppen(s, k) ? t[k] * SED.snittVikt : 0;
  return t;
}
export function sederTarget(s: State): Record<Sed, number> {
  const t = nollor();
  // varje persons vikt (steg 8.3.2, rost.ts), med ledaren och de andra som sederna flyttar vikt till
  for (const { p, andel } of vikter(s)) { if (!andel) continue; const d = drar(s, p); for (const k of SED_LIST) t[k] += d[k] * andel; }
  for (const k of SED_LIST) t[k] = sedOppen(s, k) ? clamp(t[k] * SED.snittVikt, -1, 1) : 0;
  return t;
}
// sederna rör sig långsamt mot det invånarna drar mot
export function stepSeder(s: State) {
  const sd = s.seder, dt = s.now - (sd.at ?? s.now);
  sd.at = s.now;
  if (dt <= 0) return;
  const t = sederTarget(s), f = 1 - Math.exp(-dt / (SED.rorDygn * DAY));
  for (const k of SED_LIST) sd.v[k] = (sd.v[k] ?? 0) + (t[k] - (sd.v[k] ?? 0)) * f;
}

// ---------- vilja ----------
// pliktkänsla 0–1: hur mycket personen jobbar för byn i stället för sig själv
// lagens del: arbetsplikten och samhällstjänsten (steg 8.4.1, 8.4.8), en gång för duty och pliktDelar (fynd 251)
const pliktLag = (s: State, p: Person) => (lagGaller(s, 'arbetsplikt') ? LAG.plikt * efterlevs(s) : 0) + ((p.tjanst ?? 0) > s.now ? LAG.plikt : 0);
export function duty(s: State, p: Person) {
  const lag = pliktLag(s, p);
  return clamp(SED.pliktBas + (p.pot.flit - SED.mitt) * SED.pliktFlit + (p.pot.empati - SED.mitt) * SED.pliktEmpati + s.seder.v.arbete * SED.pliktSed + lag, SED.pliktMin, SED.pliktMax);
}
// pliktkänslans delar för gränssnittet (steg 11.1.46): samma tal som duty räknar, var för sig. Ändrar inget i byn
export function pliktDelar(s: State, p: Person) {
  const lag = pliktLag(s, p);
  return { bas: SED.pliktBas, flit: (p.pot.flit - SED.mitt) * SED.pliktFlit, empati: (p.pot.empati - SED.mitt) * SED.pliktEmpati, sed: s.seder.v.arbete * SED.pliktSed, lag };
}
export const VANA_AR = SED.vanaDygn; // vanorna bleknar på så här många dygn (år i spelet), tårtan i personens Tiden (steg 11.1.46)
// Värna – Bruka (steg 8.4.13): fällda träd och dödade djur ger sämre humör för dem som drar åt Värna, mer ju starkare de tycker
export function naturTanke(s: State, t: 'tradFalldes') {
  if (!s.styre?.oppna?.includes('natur')) return;
  for (const p of living(s)) { const d = drarSed(s, p, 'natur'); if (d < SED.varnaFran) tanke(p, t, s.now, { v: SED.varnaTanke * d }); }
}
// tid räknas mot yrkestaggar och bleknar, så att de senaste åren väger mest
export const HABIT_FADE = SED.vanaDygn * DAY;
// vanornas timmar (vanor.ts): listan bredvid vanobjektet, och funktionerna som läser och skriver den
import { habitShare, habitTotal } from './vanor';
import { tanke } from './tankar';
export { addHabit, habitShare, habitTotal, skrivVanor, vana, vanaSumma } from './vanor';
// yrkestaggarna, i den ordning de prövas, med den minsta andel av tiden som ger taggen. Vilka handlingar som räknas till ett
// yrke står i handlingens rad (yrke i handlingar.ts). Ett nytt yrke blir en rad här och ett yrke på handlingarna
const YRKEN: Record<string, number> = {
  Mästare: 0.04, // den som prövar sig fram mycket (handlingen forsok, steg 4.2.2.3): försöken är få, så en liten andel räcker
  // de snävare yrkena (steg 7.5.5–7.5.8) går före de breda: den som mest slaktar är slaktare och inte jägare
  Slaktare: 0.1, Korgmakare: 0.06, Snickare: 0.1, Spjutmakare: 0.05, Skinnsömmare: 0.08, Garvare: 0.06, Stenhuggare: 0.08, Odlare: 0.15, Kock: 0.1, Vattenbärare: 0.06, Läkekunnig: 0.05,
  Lärare: 0.04, Vargjägare: 0.03, Kämpe: 0.03, Handlare: 0.05,
  // yrkena från de nya systemen (steg 12.1.139): snäva, så att den som mest brygger är bryggare och inte kock
  Skald: 0.05, Skrivare: 0.04, Bryggare: 0.06, Vävare: 0.08, Krukmakare: 0.04, // trons präst heter efter ämbetet, inte efter timmarna (yrkeNamn i styre.ts, steg 12.1.213)
  Herde: 0.08, Biodlare: 0.02, // den som mest vallar, mjölkar, klipper och matar djuren, och den som sköter bina (steg 12.1.32; handlingarnas yrke i handlingar.ts)
  Kolare: 0.04, // den som kolar och ser till milan (steg 12.2.2)
  Smed: 0.04, // den som blåser järn och smider (steg 12.2.3 och 12.2.4)
  Jägare: 0.2, Fiskare: 0.2, Samlare: 0.2, Trähuggare: 0.15, Hantverkare: 0.15, Byggare: 0.12, Berättare: 0.06, Eldvaktare: 0.02, Väktare: 0.08, Dagdrivare: 0.3,
};
// de snävare yrkenas handlingar (steg 7.5.5–7.5.8). En rad med ett yrke vars handling inte finns ännu räknas inte
const YRKE_AV: Partial<Record<string, string[]>> = {
  Slaktare: ['slakta', 'rensa'], Korgmakare: ['korg', 'nat'], Snickare: ['station', 'tillbehor', 'klyva_plank', 'gor_leksak', 'slagtra', 'mal', 'trumma', 'metspo', 'slanda', 'gor_pilar', 'skold', 'bage', 'lyra', 'krycka', 'traben', 'krok', 'bagborr', 'kalke', 'slade'], /* och träsakerna vid snickarbänken (steg 9.4.5) */ Spjutmakare: ['spjut'], Skinnsömmare: ['rock', 'skor', 'byxor', 'mossa', 'snoskor'], Garvare: ['garva'],
  Stenhuggare: ['hugga_sten'], Odlare: ['odla'], Kock: ['grilla', 'steka', 'koka_mat', 'gropa', 'koka_buljong', 'baka', 'torka', 'roka'], Vattenbärare: ['vatten'], Läkekunnig: ['varda'], Lärare: ['lara'], Vargjägare: ['vargjakt'], Kämpe: ['strid', 'forsvar', 'forsvarRovare'], Handlare: ['handla'],
  Skald: ['upptrada'], Skrivare: ['skriva', 'runsten', 'bok', 'gora_pergament', 'riva_black'], Bryggare: ['brygga', 'malta', 'tappa', 'branna'], // steg 12.1.139
  Vävare: ['spinna', 'vava', 'spinna_ull', 'vava_ull'], Krukmakare: ['lerkruka', 'lera'],
};
export const TAGS = Object.entries(YRKEN).map(([tag, min]) => ({ tag, min, acts: ACT_LIST.filter(a => ACTS[a].yrke === tag || YRKE_AV[tag]?.includes(a)) }));
// taggen går till den som gör något klart mer än andra i byn; den som redan har en tagg behåller den lättare
export function updateTags(s: State) {
  const ppl = living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen);
  const tot = new Map(ppl.map(p => [p, habitTotal(p)]));
  const avg = TAGS.map(t => ppl.reduce((a, p) => a + habitShare(p, t.acts, tot.get(p)), 0) / (ppl.length || 1));
  // ju fler som redan har ett yrke, desto svårare att få samma (bara namnet, det påverkar inte vad man gör)
  const holders = new Map<string, number>();
  for (const p of ppl) if (p.tag) holders.set(p.tag, (holders.get(p.tag) ?? 0) + 1);
  for (const p of ppl) {
    let best: string | undefined, br = 0;
    if (tot.get(p)! >= SED.taggMinTim) TAGS.forEach((t, i) => {
      const sh = habitShare(p, t.acts, tot.get(p)), keep = p.tag === t.tag, r = sh / (avg[i] || 1e-9);
      const many = 1 + (keep ? SED.taggMangaBehall : SED.taggMangaNy) * ((holders.get(t.tag) ?? 0) - (keep ? 1 : 0));
      if (sh >= t.min * (keep ? SED.taggBehallMin : 1) && r >= (keep ? SED.taggKvotBehall : SED.taggKvot) * many && r * (keep ? SED.taggPoangBehall : 1) / many > br) { best = t.tag; br = r * (keep ? SED.taggPoangBehall : 1) / many; }
    });
    if (best !== p.tag) {
      if (p.tag) holders.set(p.tag, holders.get(p.tag)! - 1);
      if (best) holders.set(best, (holders.get(best) ?? 0) + 1);
      p.tag = best;
      const txt = `${p.name} kallas nu för ${best?.toLowerCase()}.`;
      if (best && best !== 'Dagdrivare' && !p.kallad?.includes(best)) { (p.kallad ??= []).push(best); log(s, txt, 'skill', [p.id]); personHand(s, p, 'yrke', `Kallas nu för ${best.toLowerCase()}.`); }
    }
  }
}
export const dygn = (v: number) => `${kortTal(v)} dygn`;
