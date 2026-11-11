// Striden på kartan (system 10.1, "Striden på kartan" i designdokumentet). En strid sker på kartans rutor, i samma värld som
// allt annat: den som slåss är personen själv, på sin ruta, med sin egen hälsa. Reglerna för själva slaget är stridens
// (strid.ts: träff och miss, parering, skador, ork, stridsmod och hot); här finns det som kopplar dem till världen.
//   - Varje strid som pågår ligger i s.kartStrider och stegas framåt med byn (kartStridSteg), ett stridssteg i taget. Den räknas
//     aldrig om från början och aldrig färdigt i förväg.
//   - Platsen är kartan: kämpens x och y är personens, före och efter varje stridssteg, och väggar och vatten är världens.
//   - Såret sätts på personen när slaget träffar, blodet är personens blod, och den som dör är död i samma ögonblick
//     (världen som striden frågar, StridVarld i strid.ts). Inget förs tillbaka efteråt.
//   - Medan en strid pågår går hela byn i korta steg (STRID.kortSteg, nastaSteg), så att alla väljer om hela tiden.
//   - Den som står nära ser striden och väljer i valet av aktivitet (raden slagsmal i ARBETEN, val.ts): gå emellan, gå undan
//     eller fortsätta med sitt. Valet är en poäng ur empatin, modet, banden till dem som slåss och blodtörsten (narStridVal).
// Steg 10.1.4 flyttar slagsmålet efter ett gräl hit; leken, brottningen, rånen och ledarstriden kommer i 10.1.7 och rövarna
// och djuren i stegen efter.
import { balans } from './balans';
import { blocked, freeNear } from './byggnad';
import { ALDER, ageOf, alive, byId, count, gjort, living, log, relKey, stat } from './folk';
import { KROPPSDELAR, forlora, skada } from './halsa';
import { blodas } from './blod';
import { blodtorst } from './humor';
import { isFamily, ranEfter, setRanStrid } from './behov';
import { EFTER, Efter, FAROR, gastKrok } from './efterstrid';
import { ovning } from './folk';
import { eldPlats } from './karta';
import { avbryt } from './lager';
import { die } from './liv';
import { lista, och } from './ord';
import { handelse, larma } from './rykten';
import { clamp, rnd } from './slump';
import { AVSIKTER, Avsikt, Kampe, SLAGSMAL, STRID, laggTill, Strid, StridVarld, efterStrid, foljet, iVarlden, nyStrid, personKampe, skilj, slagen, slitKastat, starKvar, stridRad, stridSteg, vadretIStriden } from './strid';
import { ledareOf } from './styre';
import { Act, H, HOUR, Person, SEC, State, W } from './typer';
import { upplev } from './uppvaxt';
import { husPlats, kanterna } from './varg';
const BEAT_SEK = 300; // byns vanliga steg (BEAT i steg.ts)

export const KARTSTRID = balans('kartstrid', {
  ser: 12, // den som är vaken och står så här nära en strid ser den (rutor)
  // valet för den som ser ett slagsmål (narStridVal): poängen för att gå emellan ...
  skiljaBas: -0.5, skiljaEmpati: 0.6, skiljaMod: 0.5, skiljaBand: 0.8, skiljaLedare: 0.7, // ... grunden, och per tio steg empati och mod över 10, bandet till den hen står närmast (0–1) och om hen är byns ledare
  // ... och för att gå undan
  undanBas: -0.4, undanMod: 0.8, undanBarn: 1.2, undanTorst: 0.6, // grunden, per tio steg mod under 10, ett barn, och gånger de slåendes blodtörst
  brus: 0.3, // slumpen i valet (0–brus på varje poäng)
  undanR: 10, // den som går undan går så här långt från striden
  skiljNara: 1.6, // den som går emellan måste komma så här nära
  skiljChans: 0.12, // chansen per sekund att de slutar när någon står emellan, gånger 1 + (karisma + styrka − 20) / 20 ...
  skiljLedare: 2, // ... gånger detta för byns ledare ...
  skiljTorst: 3, // ... delat med 1 + detta gånger den blodtörstigastes blodtörst
});

// en strid som pågår på kartan. val = vad de som sett striden valt (personens id: skilja, undan eller kvar), fri = de som lämnat den
export interface KartStrid {
  id: number; st: Strid; orsak: string; t0: number; rest: number; // rest = sekunder som inte räckt till ett helt stridssteg än
  val?: Record<number, 'skilja' | 'undan' | 'kvar'>; fri?: number[]; skild?: number; // skild = den som gick emellan
  efter?: Efter; // det som ska ske när striden är slut (registret EFTER i efterstrid.ts, steg 10.1.7)
}
// pågår en strid av det slaget (ett rån, en holmgång, striden om ledarskapet …)?
export const stridPagar = (s: State, typ: string, om?: (e: Efter) => boolean) => kartStrider(s).some(g => g.efter?.typ === typ && (!om || om(g.efter)));
export const kartStrider = (s: State): KartStrid[] => s.kartStrider ?? [];
// striden personen är med i (som kämpe som inte lämnat den)
export function kartStridAv(s: State, p: Person) { return kartStrider(s).find(g => !g.fri?.includes(p.id) && g.st.kampar.some(k => k.pid === p.id)); }
const personAv = (s: State, k: Kampe) => k.pid === undefined ? undefined : byId(s, k.pid);
const lekAv = (a: Avsikt) => !!(AVSIKTER[a] as { lek?: true }).lek;
const sportAv = (a: Avsikt) => !!(AVSIKTER[a] as { sport?: true }).sport;

// ---------- slagen till bilden (steg 10.1.5, "Ett slag är en händelse") ----------
// När spelet visas (stridBild.pa, som spar i steg.ts) läggs varje anfall här i samma ögonblick som det sker: när (spelets tid),
// hur länge (vapnets takt), vem som anföll och vem det gällde (personernas id), var de stod, vapnet och hur det gick. Bilden
// (ui/stridbild.ts) tar emot dem och spelar just de slagen. Det här läses aldrig av simuleringen
export interface SlagBild { strid: number; t: number; l: number; fran?: number; mot?: number; fx: number; fy: number; mx: number; my: number; v?: string; kast?: 1; utfall: string }
export const stridBild = { pa: false, slag: [] as SlagBild[] };
// vägen den som slåss rör sig sparas för bilden som annan gång (spar i steg.ts sätter kroken, så att filerna inte importerar varandra i cirkel)
export const bildKrok: { spara?: (s: State, p: Person) => void } = {};
function tillBilden(g: KartStrid, n0: number) {
  const st = g.st;
  for (const h of slagen(st)) {
    if (h.rad < n0) continue;
    const a = st.kampar.find(k => k.id === h.fran), b = st.kampar.find(k => k.id === h.mot);
    if (!a || !b) continue;
    if (stridBild.slag.length > 400) stridBild.slag.shift(); // ingen tar emot dem (ikappräkningen): de äldsta faller bort
    stridBild.slag.push({ strid: g.id, t: g.t0 + h.t * SEC, l: h.l * SEC, fran: a.pid, mot: b.pid, fx: a.x, fy: a.y, mx: b.x, my: b.y, v: h.v ?? a.vapen, kast: h.kast, utfall: h.utfall });
  }
}

// ---------- korta steg när faran är nära ----------
// faran är nära så länge en strid pågår på kartan (fler faror kommer med rövarna och djuren)
export const KARTSTRID_PROV = { alltid: false }; // proven: byn går i korta steg också utan strid (npm run kortsteg mäter att arbetet går som vanligt)
export const faraNara = (s: State) => KARTSTRID_PROV.alltid || kartStrider(s).length > 0 || FAROR.some(f => f(s));
// längden på byns nästa steg (sekunder): korta steg medan faran är nära, annars det som är kvar av femminuterssteget som de
// korta stegen avbröt (s.stegRest), annars ett helt. Spelet och ikappräkningen frågar samma sak, så att stegen blir desamma
export function nastaSteg(s: State) { return faraNara(s) ? STRID.kortSteg : s.stegRest ?? BEAT_SEK; }
// ett steg om d sekunder är taget: hur mycket som är kvar av femminuterssteget
export function stegTaget(s: State, d: number) {
  const kvar = (s.stegRest ?? BEAT_SEK) - d;
  if (kvar > 1e-6 && kvar < BEAT_SEK) s.stegRest = Math.round(kvar * 1000) / 1000; else delete s.stegRest;
}

// ---------- striden börjar ----------
// dit den som flyr springer: sitt hus, annars elden
function flyMal(s: State, p: Person) { if (p.gast) return kanterna(p.x, p.y)[0]; /* en gäst flyr mot närmaste kanten av kartan */ const h = husPlats(s, p) ?? (() => { const e = eldPlats(s); return freeNear(s, e.x + 0.5, e.y + 1.5); })(); return { x: h.x, y: h.y }; }
const stridsUppgift = (s: State, p: Person, why: string) => { p.task = { act: 'strid', phase: 'do', tx: p.x, ty: p.y, until: s.now + (STRID.maxTid + 60) * SEC, carry: 0, why }; };
// en strid börjar mellan två sidor av folk, där de står. Den stegas sedan med byn (kartStridSteg)
export function kartStridBorja(s: State, avsikt: Avsikt, sidor: [Person[], Person[]], orsak: string, efter?: Efter): KartStrid {
  const lek = lekAv(avsikt), sport = sportAv(avsikt);
  const kampar = sidor.flatMap((sida, sd) => sida.map(p => ({ ...personKampe(s, p, 0, sd as 0 | 1, p.x, p.y), fly: flyMal(s, p) })));
  kampar.forEach((k, i) => { k.id = i + 1; });
  foljet(s, kampar);
  const st = nyStrid({ avsikt, w: W, h: H, ...vadretIStriden(s), kampar }, Math.floor(rnd(s, 'strid') * 2147483647));
  st.karta = true;
  const g: KartStrid = { id: s.kartStridNr = (s.kartStridNr ?? 0) + 1, st, orsak, t0: s.now, rest: 0, ...(efter ? { efter } : {}) };
  (s.kartStrider ??= []).push(g);
  count(s, 'strid_' + avsikt); count(s, 'kartStrid');
  if (!sport) for (const p of [...sidor[0], ...sidor[1]]) { avbryt(s, p); stridsUppgift(s, p, orsak); } // brottaren är kvar i matchen (steg 9.2.92)
  if (!lek) larma(s, 'slagsmål', kampar.length, [...sidor[0], ...sidor[1]].filter(p => p.task?.act !== 'sova')); // de som slåss ropar (steg 3.7.11)
  return g;
}

// en till ger sig in i en strid som pågår, där hen står (steg 10.1.14): den som kommer till när sidorna möts
export function kartStridMed(s: State, g: KartStrid, p: Person, sida: 0 | 1) {
  if (g.st.slut || g.st.kampar.some(k => k.pid === p.id && !g.fri?.includes(p.id))) return;
  if (g.fri?.includes(p.id)) return; // den som lämnat striden går inte in i den igen
  const id = Math.max(0, ...g.st.kampar.map(k => k.id)) + 1;
  laggTill(g.st, { ...personKampe(s, p, id, sida, p.x, p.y), fly: flyMal(s, p) });
  avbryt(s, p); stridsUppgift(s, p, g.orsak);
  count(s, 'kartStridMed');
}

// ---------- världen striden frågar ----------
function varldAv(s: State, g: KartStrid): StridVarld {
  const lek = lekAv(g.st.avsikt), sport = sportAv(g.st.avsikt);
  return {
    vagg: (x, y) => x < 0 || y < 0 || x >= W || y >= H || blocked(s, x, y),
    // såret sitter på personen när slaget träffar
    skada: (k, w, av) => {
      const p = personAv(s, k);
      if (!p || p.died !== undefined) return false;
      if (sport && w.g < STRID.lek) return false; // brottningen: de svaga slagen gör ont men blir ingen skada (steg 9.2.92)
      const dog = !!skada(s, p, w.d, w.k, w.g, g.efter?.typ === 'rovare' ? 'rovare' : 'drap', g.efter?.typ === 'rovare' && !p.gast ? 'i en strid med rövare' : `i ${lek ? 'ett lekslagsmål' : 'en strid'} med ${av.namn}`);
      if (w.fast && p.skador?.length) p.skador[p.skador.length - 1].fast = 1; // spjutet sitter kvar till vården (steg 3.7.7)
      if (!dog && w.av && !(KROPPSDELAR[w.d] as { livsviktig?: true }).livsviktig) forlora(s, p, w.d, 'höggs av'); // olyckshugget (steg 9.5.22)
      count(s, 'kartSar');
      return dog;
    },
    // den som dör i striden är död direkt
    fall: (k, h) => {
      const p = personAv(s, k);
      if (h !== 'dod' || !p || p.died !== undefined) return;
      const hit = [...g.st.logg].reverse().find(q => (q.h === 'traff' || q.h === 'hugg') && q.b === k.id), av = hit ? personAv(s, g.st.kampar.find(o => o.id === hit.a)!) : undefined;
      if (p.gast) { gastKrok.dod?.(s, p, av); if (p.died === undefined) { p.died = s.now; p.cause = 'i en strid'; } return; } // en gäst (rövaren): kroken i rovare.ts
      if (g.efter?.typ === 'rovare') { count(s, 'dodRovare'); die(s, p, 'rovare'); return; }
      count(s, 'drap'); die(s, p, 'drap');
      for (const o of g.st.kampar) { const q = o.sida !== k.sida ? personAv(s, o) : undefined; if (q && alive(q)) upplev(s, q, 'dodade', p.name); } // den som dödade minns det (steg 4.1.1.2)
    },
  };
}

// världen för en strid på prov (testarenan och scenarierna, steg 10.1.6): kartans väggar och vatten där byn ligger, och provets
// egna väggar som rutor (rutans index). Inget sätts på någon person: de som är med i arenan påverkas inte
export function provVarld(s: State | undefined, vaggar: ReadonlySet<number>): StridVarld {
  return { vagg: (x, y) => x < 0 || y < 0 || x >= W || y >= H || vaggar.has(Math.floor(y) * W + Math.floor(x)) || (!!s && blocked(s, x, y)) };
}

// ---------- striden stegas med byn ----------
export function kartStridSteg(s: State, dtSec: number) {
  if (!s.kartStrider?.length) return;
  for (const g of [...s.kartStrider]) {
    const st = g.st, v = varldAv(s, g), sport = sportAv(st.avsikt);
    g.rest += dtSec;
    while (g.rest >= STRID.tick - 1e-9 && !st.slut) {
      g.rest -= STRID.tick;
      // kämpen är personen: platsen och blodet är personens före stridssteget ...
      for (const k of st.kampar) {
        const p = personAv(s, k); if (!p) continue;
        if (p.died !== undefined) { if (k.lage !== 'dod') { k.lage = 'dod'; k.mal = undefined; } continue; } // dog av något annat
        if (!g.fri?.includes(p.id)) { k.x = p.x; k.y = p.y; }
        k.blod = p.blod ?? 1;
      }
      skiljSteg(s, g);
      const n0 = st.logg.length;
      iVarlden(v, () => stridSteg(st));
      if (stridBild.pa) tillBilden(g, n0);
      // ... och efter det
      for (const k of st.kampar) {
        const p = personAv(s, k); if (!p || p.died !== undefined || g.fri?.includes(p.id)) continue;
        if (p.x !== k.x || p.y !== k.y) { p.x = k.x; p.y = k.y; if (p.gast) gastKrok.spara?.(s, p); else bildKrok.spara?.(s, p); }
        p.blod = clamp(k.blod, 0, 1);
        if (sport) continue; // brottaren har matchen som uppgift
        if (k.lage === 'ger' || k.lage === 'borta') { // har lämnat striden: väljer på nytt
          (g.fri ??= []).push(p.id);
          if (g.efter?.egen && !p.gast) p.gavSig = s.now; // flydde eller gav upp för rövarna: gömmer sig sedan (rovarSkydd i rovare.ts)
          if (p.task?.act === 'strid') p.task.until = s.now;
        } else if (k.lage === 'strid' || k.lage === 'flykt') { // den som står eller flyr är kvar i striden, också när en skada avbrutit det hen gjorde
          if (p.task?.act !== 'strid') { avbryt(s, p); stridsUppgift(s, p, g.orsak); } else { p.task.tx = p.x; p.task.ty = p.y; }
        } else if (p.task?.act === 'strid') { p.task.tx = p.x; p.task.ty = p.y; } // den som ligger: kroppen och hälsan avgör vad hen gör sedan
      }
    }
    if (st.slut) kartStridSlut(s, g);
  }
  if (!s.kartStrider.length) delete s.kartStrider;
}

// den som gått emellan och står hos dem som slåss får dem ibland att sluta
function skiljSteg(s: State, g: KartStrid) {
  const star = g.st.kampar.filter(starKvar);
  if (star.length < 2 || lekAv(g.st.avsikt) || g.efter?.egen) return;
  const mx = star.reduce((a, k) => a + k.x, 0) / star.length, my = star.reduce((a, k) => a + k.y, 0) / star.length;
  const torst = Math.max(0, ...star.map(k => k.st.torst ?? 0));
  for (const p of living(s)) {
    if (p.task?.act !== 'skilja' || p.task.ref !== g.id || Math.hypot(p.x - mx, p.y - my) > KARTSTRID.skiljNara) continue;
    const kraft = Math.max(0.2, 1 + (stat(p, 'karisma', s.now) + stat(p, 'styrka', s.now) - 20) / 20) * (ledareOf(s) === p ? KARTSTRID.skiljLedare : 1);
    if (rnd(s, 'strid', p) >= KARTSTRID.skiljChans * STRID.tick * kraft / (1 + KARTSTRID.skiljTorst * torst)) continue;
    skilj(g.st); g.skild = p.id; count(s, 'skilda');
    p.task.until = s.now;
    return;
  }
}

// ---------- striden är slut ----------
function kartStridSlut(s: State, g: KartStrid) {
  const st = g.st, lek = lekAv(st.avsikt), vinnare = st.slut!.vinnare;
  const sidor = ([0, 1] as const).map(sd => st.kampar.filter(k => k.sida === sd).map(k => personAv(s, k)).filter((p): p is Person => !!p)) as [Person[], Person[]];
  const namn = (sd: 0 | 1) => lista(sidor[sd].map(p => p.name));
  const ids = [...sidor[0], ...sidor[1]].map(p => p.id);
  const skiljare = g.skild !== undefined ? byId(s, g.skild) : undefined;
  if (g.efter?.egen) { // den som började striden tar själv hand om följderna (rövarna)
    for (const k of st.kampar) { const p = personAv(s, k); if (p && p.died === undefined && p.task?.act === 'strid') p.task.until = s.now; }
    (s.stridRapporter ??= []).push({ t: s.now, orsak: g.orsak, vinnare, n: st.kampar.length }); count(s, 'strider'); count(s, 'kartStridSlut');
    s.kartStrider = s.kartStrider!.filter(x => x !== g);
    EFTER[g.efter.typ]?.(s, g.efter, vinnare, g);
    return;
  }
  if (skiljare) log(s, `${namn(0)} och ${namn(1)} slogs (${g.orsak}). ${skiljare.name} gick emellan, och de slutade.`, 'rel', [...ids, skiljare.id]);
  else if (!lek) stridRad(s, st, namn, g.orsak, ids);
  for (const k of st.kampar) {
    const p = personAv(s, k); if (!p || p.died !== undefined) continue;
    const mot = sidor[1 - k.sida];
    gjort(s, p, 'slagsmal'); if (vinnare === k.sida) gjort(s, p, 'vann');
    const kast = st.logg.filter(r => r.a === k.id && r.kast), vada = st.logg.filter(r => r.a === k.id && r.h === 'vada').length;
    if (kast.length) { gjort(s, p, 'kast', kast.length); const tr = kast.filter(r => r.h !== 'miss').length - vada; if (tr > 0) gjort(s, p, 'kastTraff', tr); }
    slitKastat(s, p, st, k);
    if (k.kryper) blodas(s, p.x, p.y, 'kryp', k.kryper * STRID.krypBlod); // släpspåret efter den som kröp undan (steg 3.7.19)
    efterStrid(s, st, k, p, mot, sidor[k.sida], o => personAv(s, o), lek, vinnare);
    if (p.task?.act === 'strid') p.task.until = s.now; // striden är slut: hen väljer på nytt
  }
  if (g.efter) EFTER[g.efter.typ]?.(s, g.efter, vinnare, g); // det den som började striden väntade på (steg 10.1.7)
  // vinnaren blir ett rykte i byn (steg 3.3.1): de som såg det minns det
  if (!lek && vinnare !== -1) for (const p of sidor[vinnare]) if (p.health > 0 && alive(p) && sidor[1 - vinnare][0]) handelse(s, p, 'vannSlagsmal', sidor[1 - vinnare][0]);
  // rapporten sparas (steg 8.8.10); själva striden går inte att räkna om, för den skedde i världen
  (s.stridRapporter ??= []).push({ t: s.now, orsak: g.orsak, vinnare, n: st.kampar.length });
  count(s, 'strider'); count(s, 'kartStridSlut');
  s.kartStrider = s.kartStrider!.filter(x => x !== g);
}

// ---------- den som ser en strid ----------
// vad p väljer när hen ser ett slagsmål (raden slagsmal i ARBETEN, val.ts): gå emellan, gå undan eller ingenting. Poängen
// räknas en gång per strid och person, ur empatin, modet, banden till dem som slåss och deras blodtörst
export function narStridVal(s: State, p: Person): { act: Act; why: string; spot: { x: number; y: number }; dur: number; ref: number } | undefined {
  for (const g of kartStrider(s)) {
    const st = g.st;
    if (lekAv(st.avsikt) || g.efter?.egen || st.kampar.some(k => k.pid === p.id)) continue; // rövarnas strid har sina egna roller (rovare.ts)
    const star = st.kampar.filter(starKvar);
    if (star.length < 2) continue;
    const mx = star.reduce((a, k) => a + k.x, 0) / star.length, my = star.reduce((a, k) => a + k.y, 0) / star.length;
    const d = Math.hypot(p.x - mx, p.y - my);
    let v = g.val?.[p.id];
    if (!v) {
      if (d > KARTSTRID.ser) continue;
      const a = ageOf(p, s.now), folk = st.kampar.map(k => personAv(s, k)).filter((q): q is Person => !!q && alive(q));
      const band = Math.max(0, ...folk.map(q => isFamily(p, q) ? 1 : clamp((s.rels[relKey(p.id, q.id)]?.op ?? 0) / 100, 0, 1)));
      const torst = Math.max(0, ...folk.map(q => blodtorst(s, q)));
      const brus = () => rnd(s, 'strid', p) * KARTSTRID.brus;
      const skilja = a < ALDER.vuxen ? -Infinity : KARTSTRID.skiljaBas + KARTSTRID.skiljaEmpati * (stat(p, 'empati', s.now) - 10) / 10 + KARTSTRID.skiljaMod * (stat(p, 'mod', s.now) - 10) / 10
        + KARTSTRID.skiljaBand * band + (ledareOf(s) === p ? KARTSTRID.skiljaLedare : 0) + brus();
      const undan = KARTSTRID.undanBas + KARTSTRID.undanMod * (10 - stat(p, 'mod', s.now)) / 10 + (a < ALDER.vuxen ? KARTSTRID.undanBarn : 0) + KARTSTRID.undanTorst * torst + brus();
      v = skilja > 0 && skilja >= undan ? 'skilja' : undan > 0 ? 'undan' : 'kvar';
      (g.val ??= {})[p.id] = v; count(s, 'serStrid_' + v);
    }
    if (v === 'skilja') return { act: 'skilja', why: `Går emellan ${och(star.map(k => k.namn))}`, spot: { x: mx, y: my }, dur: HOUR / 12, ref: g.id };
    if (v === 'undan' && d < KARTSTRID.undanR) {
      const l = d || 1, f = freeNear(s, clamp(mx + (p.x - mx) / l * (KARTSTRID.undanR + 1), 1, W - 2), clamp(my + (p.y - my) / l * (KARTSTRID.undanR + 1), 1, H - 2));
      return { act: 'undanStrid', why: `Går undan från slagsmålet mellan ${och(star.map(k => k.namn))}`, spot: { x: f.x, y: f.y }, dur: HOUR / 30, ref: g.id };
    }
  }
  return undefined;
}
// de som ser en strid och vill något annat än det de gör avbryter det, så att de väljer på nytt (en gång per strid och person)
export function serStriden(s: State) {
  for (const g of kartStrider(s)) {
    if (lekAv(g.st.avsikt) || g.efter?.egen) continue;
    for (const p of living(s)) {
      if (g.val?.[p.id] || !p.task || p.task.act === 'sova' || p.task.act === 'strid' || p.task.act === 'medvetslos' || p.svimmat) continue;
      const d = narStridVal(s, p);
      if (d && p.task.act !== d.act) { avbryt(s, p); p.task = undefined; }
    }
  }
}

// ett gräl (samtal.ts) kan bli ett slagsmål, oftare hos den blodtörstiga. Det börjar där de står och stegas sedan med byn
export function gralBlirSlagsmal(s: State, a: Person, b: Person) {
  if (ageOf(a, s.now) < ALDER.smabarn || ageOf(b, s.now) < ALDER.smabarn || a.task?.act === 'strid' || b.task?.act === 'strid' || !alive(a) || !alive(b)) return;
  if (rnd(s, 'strid', a) >= SLAGSMAL.gral * (1 + SLAGSMAL.gralTorst * blodtorst(s, a))) return;
  kartStridBorja(s, 'slagsmal', [[a], [b]], 'efter ett gräl');
  handelse(s, a, 'sla', b); // den som började slagsmålet slog först
}

// testläget: de två vakna vuxna som står närmast varandra börjar slåss, där de står (samma strid som efter ett gräl)
export function testSlagsmal(s: State): { ok: boolean; text: string } {
  const folk = living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen && p.task?.act !== 'sova' && p.task?.act !== 'strid' && !p.svimmat);
  let par: [Person, Person] | undefined, bd = Infinity;
  for (const a of folk) for (const b of folk) if (a.id < b.id) { const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < bd) { bd = d; par = [a, b]; } }
  if (!par) return { ok: false, text: 'Det finns inte två vakna vuxna som kan slåss' };
  kartStridBorja(s, 'slagsmal', [[par[0]], [par[1]]], 'i testläget');
  return { ok: true, text: `${par[0].name} och ${par[1].name} börjar slåss` };
}

// ---------- striderna mellan bybor (steg 10.1.7) ----------
// rånet (steg 3.7.17, behov.ts): slagsmålet sker på kartan, och rånaren tar saken om hen vinner (ranEfter)
setRanStrid((s, p, offer, orsak, behov) => { kartStridBorja(s, 'slagsmal', [[p], [offer]], orsak, { typ: 'ran', p: p.id, offer: offer.id, behov }); });
EFTER.ran = (s, e, vinnare) => ranEfter(s, e.p as number, e.offer as number, e.behov as string, vinnare === 0);
// medan ett barn leker: kastlek ger träffsäkerhet, och ibland brottas hen med ett annat barn som leker nära
export function lekSteg(s: State, p: Person, dtSec: number) {
  const h = dtSec / 3600;
  ovning(p, 'traff', SLAGSMAL.kast * h);
  if (rnd(s, 'strid', p) >= SLAGSMAL.lek * h || kartStridAv(s, p)) return;
  const andra = s.people.filter(q => q !== p && q.health > 0 && alive(q) && q.task?.act === 'leka' && q.task.phase === 'do' && Math.hypot(q.x - p.x, q.y - p.y) <= SLAGSMAL.lekNara && !kartStridAv(s, q));
  if (!andra.length) return;
  kartStridBorja(s, 'lek', [[p], [andra[Math.floor(rnd(s, 'strid', p) * andra.length)]]], 'på lek');
}
