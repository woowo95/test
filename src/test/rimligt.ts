// Vakterna för det orimliga (steg 12.1.42, Att hitta felen: Vakterna för det orimliga). Testernas vakter larmar bara om det
// omöjliga (NaN, negativa förråd, folk i vattnet). Registret RIMLIGT har en rad per vakt för det som är möjligt men ologiskt:
// ett skäl som inte stämmer, en handling som inte hör till skälet, många som gör samma sak av samma skäl, den som står still
// mitt i arbetet, den som byter fram och tillbaka, den som är hungrig, fryser eller blöder länge fast hjälpen finns, och ett
// förråd långt över sitt tak. Varje vakt har sina gränser som balanstal (blocket RIM, prövas med t.ex. `BALANS="rimligt.nodTim=6" npm run rimligt`) och larmar med
// by, person och tid. Vakterna rättar inget i spelet: det som larmar rättas i systemen. Iakttagaren (Rimlig) följer en by medan
// den körs; npm run rimligt (rimligtkor.ts) kör den i några byar. Ett fynd från rapporten eller granskaren som går att mäta
// blir en ny rad här. Vakterna ligger inte i npm test, koll eller snabbkoll förrän byarna går igenom utan larm
import { ACTS, DAY, HOUR, KROPP, TORST, blodning, brasaStenMal, MATERIAL_LIST, Person, State, ageOf, ALDER, amountOf, balans, buffert, foodOf, living, materialTak, needStones, needTinder, sakNamn, underBuffert } from '../sim';

export const RIM = balans('rimligt', {
  marg: 1.25, // ett skäl om byns behov stämmer så länge förrådet är under bufferten gånger detta (behoven räknas en gång i timmen)
  kropp: 1.15, lat: 0.15, // ett skäl om kroppen stämmer så länge behovet är under sin gräns (och det den lata lägger till, högst lat) gånger kropp
  sammaAndel: 0.35, sammaMin: 4, // larmar när minst sammaMin och mer än så här stor del av de vuxna gör samma arbete av samma skäl
  stillaAndel: 0.3, stillaMin: 2, // larmar när den som arbetar stått still utanför själva arbetet mer än så stor del av minst stillaMin timmar arbete på ett dygn
  byten: 6, bytenMin: 30, // larmar när någon bytt mellan samma två arbeten så många gånger inom så många minuter (inte två steg i samma kedja, som att fälla och hugga)
  nodTim: 3, // larmar när någon varit hungrig, frusen eller blött så här många timmar fast hjälpen finns
  takGgr: 3, takMin: 30, takVaxt: 0.05, // larmar när ett material är mer än takGgr gånger sitt tak, minst takMin, och har vuxit mer än takVaxt sedan i går
});

export interface Larm { vakt: string; by: number; t: number; vem?: string; text: string; grupp?: string } // grupp: vad larmet gäller, så att utskriften kan räkna dem
// ett skäl som nämner ett behov: när skälet gäller (villkor), och vilka handlingar som hör till det
// Kroppens läge (fore) är det som gällde vid förra provet, före valet: den som börjat dricka har redan druckit lite när provet görs
interface Kropp { hunger: number; torst: number; warm: number }
interface SkalRad { m: RegExp; namn: string; villkor(s: State, p: Kropp): boolean; handling?(act: string): boolean }
const mat = (s: State) => (s.arbBehov?.mat ?? 0) < buffert(s, 'mat') * RIM.marg, ved = (s: State) => (s.arbBehov?.ved ?? 0) < buffert(s, 'ved') * RIM.marg;
export const SKAL: SkalRad[] = [
  { m: /^(Hjälper till\. )?Byn behöver mat/, namn: 'byn behöver mat', villkor: mat, handling: a => ACTS[a as keyof typeof ACTS]?.behov === 'mat' },
  { m: /^(Hjälper till\. )?Byn behöver ved/, namn: 'byn behöver ved', villkor: ved, handling: a => ACTS[a as keyof typeof ACTS]?.behov === 'ved' || a === 'falla' || a === 'hugga' }, // en fälld stam blir ved
  { m: /tändmaterial/, namn: 'byn behöver tändmaterial', villkor: s => needTinder(s), handling: a => a === 'samla' },
  { m: /^Byn behöver stenar/, namn: 'byn behöver stenar', villkor: s => needStones(s) || brasaStenMal(s) > 0, handling: a => a === 'samla' }, // stenarna till elden eller till en ny eldring
  { m: /^Byn behöver flinta/, namn: 'byn behöver flinta', villkor: s => underBuffert(s, 'flinta', 0) || underBuffert(s, 'flinta', -1), handling: a => a === 'samla' },
  { m: /^Är hungrig/, namn: 'är hungrig', villkor: (_s, p) => p.hunger < (KROPP.hungrig + RIM.lat) * RIM.kropp },
  { m: /^Är törstig/, namn: 'är törstig', villkor: (_s, p) => p.torst < (TORST.torstig + RIM.lat) * RIM.kropp },
  { m: /^Fryser/, namn: 'fryser', villkor: (_s, p) => p.warm < (KROPP.kallt + RIM.lat) * RIM.kropp },
];

// en vakt: namnet, och vad den prövar. ny: när någon börjat en ny uppgift; prov: varje prov (dt sekunder sedan förra); timme: en
// gång i timmen; dygn: en gång om dygnet
export interface Vakt { id: string; namn: string; ny?(r: Rimlig, p: Person): void; prov?(r: Rimlig, dt: number): void; timme?(r: Rimlig): void; dygn?(r: Rimlig): void }
interface Spar { task?: object; act?: string; x: number; y: number; byten: [number, string][]; arb: number; still: number; nod: Record<string, number>; kropp?: Kropp }
const vuxen = (s: State, p: Person) => ageOf(p, s.now) >= ALDER.vuxen && !p.gast && !p.fange;
const kort = (why: string) => why.replace(/\d+([,.]\d+)?/g, 'N').replace(/ för .* dygn$/, '');
export const RIMLIGT: Vakt[] = [
  { id: 'skal', namn: 'Skälet stämmer', ny: (r, p) => { const sp = r.spar(p), fore = sp.kropp ?? p; for (const k of SKAL) if (k.m.test(p.task!.why ?? '') && !k.villkor(r.s, fore)) r.larm('skal', `skälet "${p.task!.why}" (${k.namn}) stämmer inte: ${r.lage(p)}`, p, k.namn); } },
  { id: 'handling', namn: 'Handlingen och skälet hör ihop', ny: (r, p) => { for (const k of SKAL) if (k.handling && k.m.test(p.task!.why ?? '') && !k.handling(p.task!.act)) r.larm('handling', `${ACTS[p.task!.act]?.namn ?? p.task!.act} med skälet "${p.task!.why}"`, p, `${k.namn}: ${p.task!.act}`); } },
  { id: 'samma', namn: 'Inte för många gör samma sak av samma skäl', timme: r => {
    const vuxna = living(r.s).filter(p => vuxen(r.s, p)), n: Record<string, Person[]> = {};
    for (const p of vuxna) if (p.task && ACTS[p.task.act]?.arbete) (n[`${p.task.act}|${kort(p.task.why ?? '')}`] ??= []).push(p);
    for (const [k, ps] of Object.entries(n)) if (ps.length >= RIM.sammaMin && ps.length > vuxna.length * RIM.sammaAndel && r.forsta(`samma:${k}`, DAY)) r.larm('samma', `${ps.length} av ${vuxna.length} vuxna gör ${ACTS[ps[0].task!.act].namn.toLowerCase()} med skälet "${ps[0].task!.why}"`, undefined, ps[0].task!.act);
  } },
  { id: 'stilla', namn: 'Den som arbetar står inte still', prov: (r, dt) => {
    for (const p of living(r.s)) {
      const sp = r.spar(p), t = p.task, flytt = Math.hypot(p.x - sp.x, p.y - sp.y);
      if (t && ACTS[t.act]?.arbete) { sp.arb += dt; if (t.phase !== 'do' && flytt < 0.05) sp.still += dt; }
    }
  }, dygn: r => {
    for (const p of living(r.s)) {
      const sp = r.spar(p);
      if (sp.arb >= RIM.stillaMin * 3600 && sp.still > sp.arb * RIM.stillaAndel) r.larm('stilla', `stod still på vägen ${Math.round(sp.still / 60)} av ${Math.round(sp.arb / 60)} minuter arbete i dag`, p);
      sp.arb = sp.still = 0;
    }
  } },
  { id: 'byten', namn: 'Ingen byter fram och tillbaka', ny: (r, p) => {
    const sp = r.spar(p), b = sp.byten, gr = r.s.now - RIM.bytenMin * 60000;
    b.push([r.s.now, p.task!.act]); while (b.length && b[0][0] < gr) b.shift();
    const slag = new Set(b.map(x => x[1]));
    const [a1, a2] = [...slag] as (keyof typeof ACTS)[];
    if (slag.size === 2 && b.length > RIM.byten && ACTS[a1]?.arbete && ACTS[a2]?.arbete && !(ACTS[a1].slag && ACTS[a1].slag === ACTS[a2].slag)) { r.larm('byten', `bytte ${b.length - 1} gånger mellan ${[...slag].map(a => ACTS[a as keyof typeof ACTS]?.namn.toLowerCase() ?? a).join(' och ')} på ${RIM.bytenMin} minuter`, p, [...slag].sort().join(' och ')); b.length = 0; }
  } },
  { id: 'nod', namn: 'Ingen är hungrig, fryser eller blöder länge med hjälpen inom räckhåll', prov: (r, dt) => {
    const s = r.s, eld = s.fire.lit || (s.eldar ?? []).some(f => f.lit);
    for (const p of living(s)) {
      if (p.gast || p.fange) continue;
      const sp = r.spar(p);
      const fall: [string, boolean][] = [['hungrig', p.hunger < KROPP.hungrig && foodOf(s) >= 1], ['fryser', p.warm < KROPP.kallt && eld], ['blöder', blodning(p) > 0 && living(s).some(q => q !== p && vuxen(s, q) && !(q.task && ACTS[q.task.act]?.namn?.startsWith('Vårdar')))]];
      for (const [k, nu] of fall) {
        if (!nu) { delete sp.nod[k]; continue; }
        sp.nod[k] = (sp.nod[k] ?? 0) + dt;
        if (sp.nod[k] >= RIM.nodTim * 3600 && sp.nod[k] - dt < RIM.nodTim * 3600) r.larm('nod', `${k} i ${RIM.nodTim} timmar fast hjälpen finns: ${r.lage(p)}`, p, k);
      }
    }
  } },
  { id: 'tak', namn: 'Inget förråd växer långt över sitt tak', dygn: r => {
    for (const k of MATERIAL_LIST) {
      const n = amountOf(r.s, k), tak = materialTak(r.s, k), igar = r.igar.get(k);
      r.igar.set(k, n);
      if (igar !== undefined && n >= RIM.takMin && n > tak * RIM.takGgr && n > igar * (1 + RIM.takVaxt) && r.forsta(`tak:${k}`, 7 * DAY)) r.larm('tak', `${sakNamn(k).toLowerCase()} ${Math.floor(n)} (i går ${Math.floor(igar)}), taket ${Math.ceil(tak)}`, undefined, sakNamn(k).toLowerCase());
    }
  } },
];

// iakttagaren: följer byn s medan den körs. prov(dt) efter varje steg; larmen samlas i larmen
export class Rimlig {
  larmen: Larm[] = [];
  igar = new Map<string, number>(); // förråden i går (vakten tak)
  private sp = new Map<number, Spar>();
  private sist = new Map<string, number>();
  private timme = -1;
  private dag = -1;
  constructor(public s: State, public by: number) {}
  spar(p: Person): Spar { let x = this.sp.get(p.id); if (!x) this.sp.set(p.id, x = { x: p.x, y: p.y, byten: [], arb: 0, still: 0, nod: {} }); return x; }
  larm(vakt: string, text: string, p?: Person, grupp?: string) { this.larmen.push({ vakt, by: this.by, t: this.s.now, ...(p ? { vem: p.name } : {}), text, ...(grupp ? { grupp } : {}) }); }
  // första gången nyckeln larmar på så här lång tid
  forsta(k: string, ms: number) { const t = this.sist.get(k); if (t !== undefined && this.s.now - t < ms) return false; this.sist.set(k, this.s.now); return true; }
  lage(p: Person) { const s = this.s; return `mätt ${Math.round(p.hunger * 100)} %, törst ${Math.round(p.torst * 100)} %, värme ${Math.round(p.warm * 100)} %, mat ${(s.arbBehov?.mat ?? 0).toFixed(1)} dygn (buffert ${buffert(s, 'mat').toFixed(1)}), ved ${(s.arbBehov?.ved ?? 0).toFixed(1)} dygn (buffert ${buffert(s, 'ved').toFixed(1)})`; }
  prov(dt: number) {
    const s = this.s;
    for (const p of living(s)) {
      const sp = this.spar(p);
      if (p.task && p.task !== sp.task && !p.gast) for (const v of RIMLIGT) v.ny?.(this, p);
      if (p.task && p.task !== sp.task && p.task.act !== sp.act) sp.act = p.task.act;
      sp.task = p.task;
    }
    for (const v of RIMLIGT) v.prov?.(this, dt);
    for (const p of living(s)) { const sp = this.spar(p); sp.x = p.x; sp.y = p.y; sp.kropp = { hunger: p.hunger, torst: p.torst, warm: p.warm }; }
    const h = Math.floor(s.now / HOUR), d = Math.floor(s.now / DAY);
    if (h !== this.timme) { this.timme = h; for (const v of RIMLIGT) v.timme?.(this); }
    if (d !== this.dag) { if (this.dag >= 0) for (const v of RIMLIGT) v.dygn?.(this); this.dag = d; }
  }
}
