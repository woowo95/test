import { HOUR_S, DAY, Person, State } from './typer';
import { balans } from './balans';
import { eldPlats } from './karta';
import { ALDER, ageOf, count, doingAct, forstaGang, living, log, ovning } from './folk';
import { coldOf, temperature } from './vader';
import { rnd } from './slump';
import { duty } from './seder';
import { amountOf, changed, isStored } from './lager';
import { bedFor } from './bygg';
import { ELD, Wish, emberOn, eldStyrka, fetchFuel, fuelFor, giveBack, hearthOf, woodDays } from './eld';
import { STATION, Station, stationById } from './stationer';
import { flintSpot } from './fynd';
import type { Uppgift } from './projekt';

// ---------- brasorna (steg 2.9.1) ----------
// Lägerelden är byns mitt och ligger kvar där den är. Men när byn vuxit och hyddorna ligger långt från den, och det är kallt
// och veden räcker gott, lägger byn en ring av stenar till en extra brasa nära sovplatserna: en station i registret STATIONER
// (stationer.ts), som byggs som de andra i projekten (projekt.ts) av vilken vuxen som helst, med sex stenar. Det byn vill ha
// (s.brasa) räknas varje timme: de som har sin sovplats långt från lägerelden och alla brasor, och nära varandra. I en by
// där var och en håller sig för sig själv (seden gemenskap) räcker ett kortare avstånd för att vilja ha en egen eld.
// Varje brasa är till för dem som har sin sovplats närmast den (BrasaEld.folk). Den tänds med en brand från lägerelden
// (utan flinta), av en vuxen bland dem som bär dit en famn ved, och fylls på som lägerelden, en i taget i byn och lägerelden
// först. Önskan om ved på den är det högsta någon av dess folk vill ha (fireWish i eld.ts). När bränslet tryter (slackDygn)
// fylls den inte på, så att den slocknar före lägerelden. Den värmer som lägerelden (heatAt i eld.ts), och dess folk värmer
// sig, arbetar och samtalar vid den när den brinner (spotFor i val.ts). Den ger ingen glöd och inget kol.
// En släckt brasa som ingen längre sover nära tas isär: genast när byn vill ha en brasa någon annanstans, annars efter
// tomDygn, och de sex stenarna läggs i en hög där den stod. Högen bärs in i lagret och stenarna används igen till nästa brasa.

// ---------- balanstal (regel 8) ----------
export const BRASA = balans('brasa', {
  langt: 7, // en sovplats ligger långt från elden när den är så här många rutor från lägerelden och alla brasor ...
  langtGem: 2, // ... och så här många rutor färre när seden gemenskap är -1 (var och en för sig), inget när den är 0 eller mer
  grupp: 2, // byn vill ha en brasa när så många har sin sovplats långt från elden och nära varandra ...
  samman: 4, // ... inom så här många rutor från varandra ...
  gruppFull: 4, // ... och vill ha den fullt ut när så många har det
  kyla: 0, // bara när kylan ute (coldOf i vader.ts) är över detta ...
  vedDygn: 4, // ... och bränslet i förrådet räcker så här många dygn (år i spelet) för varje eld, den nya brasan medräknad
  max: 2, // byn har högst så här många brasor
  slackDygn: 2, // ingen tänder eller fyller på en brasa när bränslet räcker kortare än så här många dygn för varje eld
  tomDygn: 3, // en släckt brasa som ingen sover nära tas isär efter så här många dygn
  letaMin: 120, // fattas stenarna går en i taget till stenarna och letar så här många minuter (projekt.ts)
});

// brasans eld: bränslet, om den brinner, när den tändes och slocknade, önskan om ved på den (som lägerelden: want, wantBy,
// wantWhy) och de som har sin sovplats närmast den (folk, räknas varje timme)
export interface BrasaEld { fuel: number; lit?: 1; litAt?: number; ut?: number; want?: number; wantBy?: number; wantWhy?: string; folk?: number[] }

const NONE: Station[] = [];
// de färdiga brasorna
export const brasorOf = (s: State) => s.stationer?.length ? s.stationer.filter(t => t.k === 'brasa' && t.kvar <= 0) : NONE;
export const brasaEld = (t: Station) => t.eld ??= { fuel: 0 };
// brasans styrka 0–1 (som lägerelden: fireHeat i eld.ts)
export const brasaHeat = (t: Station) => t.eld?.lit ? eldStyrka(t.eld.fuel) : 0;
// den brinnande brasa som p hör till (p har sin sovplats närmast den)
export const egenBrasa = (s: State, p: Person) => s.stationer?.length ? s.stationer.find(t => t.eld?.lit && t.eld.folk?.includes(p.id)) : undefined;
// platsen byn vill ha en brasa på (mitten av sovplatserna, siteBrasa i stationer.ts), om den vill ha en
export const brasaMal = (s: State) => s.brasa && s.brasa.vill > 0 ? s.brasa : undefined;
// hur mycket byn vill ha en brasa (0 till 1), för projektet
export const brasaBrist = (s: State) => s.brasa?.vill ?? 0;
// en sovplats långt från elden: kortare i en by där var och en håller sig för sig själv
const langt = (s: State) => BRASA.langt - BRASA.langtGem * Math.max(0, -s.seder.v.gemenskap);
// hur många dygn bränslet räcker för varje eld, med extra eldar till
const vedPerEld = (s: State, extra: number) => woodDays(s) / (brasorOf(s).length + 1 + extra);
// stenar som ligger i högar på marken (de från en brasa som tagits isär), på väg in i lagret
const stenPaMarken = (s: State) => (s.stackar ?? []).reduce((n, a) => a.k === 'sten' && !isStored(s, a.x, a.y) ? n + a.n : n, 0); // utanför lagret: amountOf räknar lagret
// byn behöver stenar till en brasa (eld.ts, needStones): den vill ha en, ingen är påbörjad och stenarna räcker inte
export const brasaSten = (s: State) => brasaBrist(s) > 0 && !(s.stationer ?? []).some(t => t.k === 'brasa' && t.kvar > 0) && amountOf(s, 'sten') + stenPaMarken(s) < STATION.brasaSten;
// stenarna letas som en del av projektet (projekt.ts): byn samlar sällan, så annars kommer brasan aldrig. En i taget, och
// bara den som får bygga en brasa. Stenarna hittas vid stenarna när byn behöver dem (forageItems i eld.ts)
export const kanLetaBrasaSten = (s: State, p: Person) => brasaSten(s) && ageOf(p, s.now) >= ALDER.ansvar && !living(s).some(q => q !== p && q.task?.sok);
export function brasaLeta(s: State, p: Person): Uppgift | undefined {
  const sp = flintSpot(s, p);
  return sp ? { act: 'samla', text: 'Letar efter stenar till en brasa vid stenarna.', min: BRASA.letaMin, spot: sp, sok: true } : undefined;
}

// ---------- varje timme ----------
// vem som hör till vilken brasa, de som sover långt från elden, vad byn vill ha, och brasorna som tas isär
export function stepBrasor(s: State) {
  const br = brasorOf(s);
  if (!br.length && !s.brasa && !(coldOf(temperature(s)) > BRASA.kyla && s.fire.lit)) return;
  const L = langt(s);
  const eldar = [{ x: eldPlats(s).x + 0.5, y: eldPlats(s).y + 0.5 }, ...br.map(t => ({ x: t.x + 0.5, y: t.y + 0.5 }))];
  for (const t of br) brasaEld(t).folk = [];
  const borta: { x: number; y: number }[] = [];
  for (const p of living(s)) {
    const b = bedFor(s, p);
    if (!b) continue;
    let bi = 0, bd = Infinity;
    for (let i = 0; i < eldar.length; i++) { const d = Math.hypot(b.x - eldar[i].x, b.y - eldar[i].y); if (d < bd) { bd = d; bi = i; } }
    if (bi > 0) br[bi - 1].eld!.folk!.push(p.id);
    if (bd > L) borta.push(b);
  }
  // gruppen: den som har flest andra långt borta inom samman rutor, och de som ligger där
  let grupp: { x: number; y: number }[] = [];
  for (const a of borta) {
    const g = borta.filter(b => Math.hypot(a.x - b.x, a.y - b.y) <= BRASA.samman);
    if (g.length > grupp.length) grupp = g;
  }
  const tomma = br.filter(t => !t.eld!.lit && !t.eld!.folk!.length);
  const vill = grupp.length >= BRASA.grupp && s.fire.lit && coldOf(temperature(s)) > BRASA.kyla && br.length - tomma.length < BRASA.max && vedPerEld(s, 1 - tomma.length) >= BRASA.vedDygn;
  s.brasa = vill ? { vill: Math.min(1, grupp.length / BRASA.gruppFull), x: grupp.reduce((n, b) => n + b.x, 0) / grupp.length, y: grupp.reduce((n, b) => n + b.y, 0) / grupp.length } : undefined;
  // en brasa som ingen sover nära tas isär: genast om byn vill ha en annanstans, annars när den stått släckt i tomDygn
  for (const t of tomma) if (vill || s.now - (t.eld!.ut ?? t.klar ?? s.now) >= BRASA.tomDygn * DAY) taIsar(s, t);
}
// brasan tas isär och stenarna läggs i en hög där den stod (en stack, som bärs in i lagret, haulJob i lager.ts)
function taIsar(s: State, t: Station) {
  s.stationer = (s.stationer ?? []).filter(q => q !== t);
  s.byggV = (s.byggV ?? 0) + 1; // rutan är ledig igen: vägarna och platserna räknas om
  const st = (s.stackar ??= []);
  let g = st.find(q => q.x === t.x && q.y === t.y && q.k === 'sten');
  if (!g) st.push(g = { x: t.x, y: t.y, k: 'sten', n: 0, c: 1 });
  g.n += STATION.brasaSten; changed(s);
  count(s, 'brasaIsar');
  log(s, 'En brasa som ingen längre sov nära togs isär. Stenarna ligger kvar och används till nästa brasa.', 'world');
}

// ---------- varje steg (stepFire i eld.ts) ----------
// brasorna brinner, var och en får sin önskan av sitt folk, och en person i taget tänder eller fyller på den som behöver det.
// cands = de vakna med sin önskan om ved, som stepFire räknat; ingen annan bär ved till någon eld
export function stepBrasaEld(s: State, dtSec: number, cands: { p: Person; w: Wish }[]) {
  const br = brasorOf(s);
  if (!br.length) return;
  const h = hearthOf(s.fire), now = s.now;
  for (const t of br) {
    const e = brasaEld(t);
    if (e.lit) {
      e.fuel -= Math.min(e.fuel, h.burn / HOUR_S * dtSec);
      if (e.fuel <= 1e-6) { e.fuel = 0; e.lit = undefined; e.ut = now; log(s, 'En brasa slocknade.', 'world'); }
    }
    let top: { p: Person; w: Wish } | undefined;
    for (const c of cands) if (e.folk?.includes(c.p.id) && (!top || c.w.v > top.w.v)) top = c;
    e.want = top?.w.v ?? 0; e.wantBy = top?.p.id; e.wantWhy = top?.w.why;
  }
  if (doingAct(s, 'elda') || vedPerEld(s, 0) < BRASA.slackDygn) return; // en i taget, och ingen ved till brasorna när den tryter
  for (const t of br) {
    const e = t.eld!, fyll = e.fuel * ELD.fyllMarg + ELD.fyllPlus;
    if (e.lit ? e.want! < fyll : !s.fire.lit && !emberOn(s) || e.want! < h.maxFuel * ELD.tandVill) continue; // den tänds med en brand från lägerelden
    let best: { p: Person; w: Wish } | undefined, bs = -1e9;
    for (const c of cands) {
      if (!e.folk?.includes(c.p.id) || (e.lit ? c.w.v < fyll : c.w.v < h.maxFuel * ELD.tandKandidat || ageOf(c.p, now) < ALDER.ansvar) || fuelFor(s, c.p) < ELD.hamtaMin) continue;
      const sc = (c.w.v - e.fuel) / h.maxFuel * (ELD.valjPlikt + duty(s, c.p)) - Math.hypot(c.p.x - t.x - 0.5, c.p.y - t.y - 0.5) / ELD.valjAvstand + rnd(s, 'eld') * ELD.valjBrus;
      if (sc > bs) { bs = sc; best = c; }
    }
    if (!best) continue;
    fetchFuel(s, best.p, e.lit ? best.w.why : `Ska tända brasan med en brand från lägerelden. ${best.w.why}`);
    if (best.p.task?.act === 'elda') best.p.task.ref = t.id;
    return;
  }
}
// p kommer fram till brasan med n ved (steg.ts): den tänds med en brand från lägerelden om den är släckt, och veden läggs på.
// Finns inte brasan längre, eller har lägerelden slocknat innan den hann tändas, går veden tillbaka till förrådet
export function addFuelBrasa(s: State, p: Person, id: number, n: number) {
  const t = stationById(s, id), e = t?.eld, max = hearthOf(s.fire).maxFuel;
  if (!e || !e.lit && !s.fire.lit && !emberOn(s)) { giveBack(s, n); return; }
  if (!e.lit) {
    e.lit = 1; e.litAt = s.now; e.ut = undefined;
    if (forstaGang(s, 'brasaTand')) p.fame.push('Tände byns första brasa');
    log(s, `${p.name} tände en brasa med en brand från lägerelden.`, 'world', [p.id]);
  }
  const put = Math.min(n, max - e.fuel);
  e.fuel += put; giveBack(s, n - put);
  ovning(p, 'elda', ELD.ovFyll);
}
// den brasa p bär ved till (task.ref), med sin önskan
export const brasaFor = (s: State, ref?: number) => ref === undefined ? undefined : stationById(s, ref);
