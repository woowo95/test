import { AGES, DAY, State, WEEK } from './typer';
import { balans } from './balans';

// ---------- tidsåldrarna ----------
// Tidsåldrarna numreras som AGES i typer.ts. Istiden är kall och mager, och hösten är inför den: då sparar och bygger byn
// mer. Skriv aldrig ai === 0 eller ai === 3; fråga iIstiden, foreIstiden eller kallTid
export const ISTID = 0, VAR = 1, SOMMAR = 2, HOST = 3;
export const iIstiden = (ai: number) => ai === ISTID; // under istiden
export const foreIstiden = (ai: number) => ai === HOST; // hösten, inför istiden
export const kallTid = (ai: number) => foreIstiden(ai) || iIstiden(ai); // inför och under istiden
// Balanstalen (regel 8): hur tidsåldern påverkar byn. Faktorerna gäller i tiden som metoden i namnet säger, annars 1
export const ARSTID = balans('arstid', {
  // vad byn väljer (val.ts)
  byggKall: 1.4, // bygget väger så mycket mer inför och under istiden
  vedKall: 1.3, // veden väger så mycket mer inför och under istiden
  // att skaffa och förvara
  hoPerTid: [0.25, 0.6, 1, 1.3], // hur mycket hö det finns att samla, per tidsålder (istid, vår, sommar, höst)
  grenarIstid: 0.6, // grenar går att samla så här mycket i istiden (eld.ts)
  tandIstid: 0.6, // chansen att tända elden är så här mycket av den vanliga i istiden (eld.ts)
  slitIstid: 1.5, // husen slits så här mycket fortare i istiden (bygg.ts)
  // hälsan: chansen per dygn att bli sjuk (steg.ts)
  sjukIstid: 0.12, // i istiden
  sjuk: 0.05, // annars
});

// ---------- kalendern ----------
// Ett år i spelet är ett dygn och byter vid midnatt. En tidsålder är en vecka, måndag 00.00 till söndag 24.00 (lokal tid).
// Bytet räknas efter kalendern, så sommartid flyttar det inte. Byns kalender (s.kal): tidsåldern a0 började t0 och slutar
// måndagen b0 (dagens nummer). En ny koloni börjar med vårtid fram till den måndag som ligger minst en vecka bort (7–13 dygn),
// och en äldre by kommer i fas när den läses in (inFas). Allt som frågar om tidsålder, dag eller år frågar kalender().
interface Kal { ai: number; dag: number; av: number; ar: number; start: number; slut: number } // dag av av i tidsåldern
const dagNr = (t: number) => { const d = new Date(t); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
const midnatt = (n: number) => { const d = new Date(n * DAY); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).getTime(); };
const mandag = (n: number) => n + (7 - (n + 3) % 7) % 7; // första måndagen från dag n (dag 0, 1 januari 1970, var en torsdag)
// en ny koloni: tidsåldern a0 från t0 till måndagen minst en vecka bort
export function nyKalender(t0: number, a0 = VAR) {
  const n = dagNr(t0);
  return { t0, a0, b0: mandag(midnatt(n) === t0 ? n + 7 : n + 8) };
}
// en by från före kalendern: tidsåldern som pågår slutar den måndag som ligger närmast dess vanliga slut och inte redan varit
export function inFas(s: State) {
  const k = Math.floor((s.now - s.founded) / WEEK), slut = s.founded + (k + 1) * WEEK;
  const fore = mandag(dagNr(slut) - 6), efter = fore + 7;
  const b0 = midnatt(fore) > s.now && slut - midnatt(fore) <= midnatt(efter) - slut ? fore : efter;
  return { t0: s.founded + k * WEEK, a0: (((VAR + k) % 4) + 4) % 4, b0 };
}
// Kalendern frågas många gånger varje steg, så det senaste svaret sparas per by. Svaret beror bara på dagen och
// på om tiden är före t0, så det gäller från fran till till (dagen, eller den del av den som ligger på samma sida
// om t0) så länge byns kalender och grundande är desamma. Byts tidszonen medan spelet går (en resa, datorns inställning)
// gäller det sparade svaret den gamla zonens dag till dess midnatt, och sedan den nya zonens. Det godtas: kalendern följer
// ändå den lokala tiden, och att fråga efter zonen vid varje anrop skulle kosta det som sparandet sparar.
const memo = new WeakMap<State, { fran: number; till: number; kal: State['kal']; founded: number; k: Kal }>();
export function kalender(s: State, t = s.now): Kal {
  const m = memo.get(s);
  if (m && t >= m.fran && t < m.till && m.kal === s.kal && m.founded === s.founded) return m.k;
  const c = s.kal ??= inFas(s), d = dagNr(t), ar = d - dagNr(s.founded) + 1;
  let k: Kal;
  if (d < c.b0 && t >= c.t0) k = { ai: c.a0, dag: d - dagNr(c.t0) + 1, av: c.b0 - dagNr(c.t0), ar, start: c.t0, slut: midnatt(c.b0) };
  else {
    const w = Math.floor((d - c.b0) / 7), n = c.b0 + 7 * w;
    k = { ai: ((c.a0 + 1 + w) % 4 + 4) % 4, dag: d - n + 1, av: 7, ar, start: midnatt(n), slut: midnatt(n + 7) };
  }
  let fran = midnatt(d), till = midnatt(d + 1);
  if (c.t0 > fran && c.t0 < till) { if (t < c.t0) till = c.t0; else fran = c.t0; }
  memo.set(s, { fran, till, kal: c, founded: s.founded, k });
  return k;
}
export const ageIndex = (s: State, t = s.now) => kalender(s, t).ai;
export const yearNo = (s: State, t = s.now) => kalender(s, t).ar;
// var i året: 0 = istidens början, 1 = vårtidens början … (med bråkdelen av tidsåldern som gått)
export function yearPos(s: State, t = s.now) { const k = kalender(s, t); return k.ai + (t - k.start) / (k.slut - k.start); }
// när tidsåldern ai börjar första gången efter att byns kalender började (för tester)
export function ageStart(s: State, ai: number) {
  const c = s.kal ??= inFas(s);
  return ai === c.a0 ? c.t0 : midnatt(c.b0 + 7 * (((ai - c.a0 - 1) % 4 + 4) % 4));
}
// klockslaget i timmar (lokal tid). Det frågas efter samma tidpunkt många gånger i varje steg, så det sparas
let memoT = NaN, memoH = 0;
export function hourOf(t: number) {
  if (t !== memoT) { const d = new Date(t); memoT = t; memoH = d.getHours() + d.getMinutes() / 60; }
  return memoH;
}
export function isLight(t: number) { const h = hourOf(t); return h >= 7 && h < 19; }
export function lightLevel(t: number) {
  const h = hourOf(t);
  if (h >= 7.5 && h < 18.5) return 1;
  if (h >= 6.5 && h < 7.5) return (h - 6.5);
  if (h >= 18.5 && h < 19.5) return 1 - (h - 18.5);
  return 0;
}
export function timeLabel(s: State, t: number) {
  if (t < s.founded) { const y = Math.ceil((s.founded - t) / DAY); return `${y} år före grundandet`; }
  return `År ${yearNo(s, t)}, ${AGES[ageIndex(s, t)].toLowerCase()}`;
}
