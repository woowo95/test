// Bryggningen (steg 9.6.12–9.6.13, Mat, matlagning och dryck: Drycker upptäcks i steg). Bryggkaret är en station med innehåll
// (t.sats): satsen ligger i karet medan den jäser och syns där med sin färg. Arbetet är kort (BRYGG.prepMin och tappMin) och
// väntan lång; ingen arbetar medan det jäser. Under BRYGG.kall grader stannar jäsningen, utom i ett kar inne i ett hus. När
// satsen är klar silas den och hälls upp i stora lerkrukor, och karet är tomt igen. Vinet och ölet är rader i VATSKOR
// (vatskor.ts) och står i krukorna, där vinet blir bättre med tiden (vinKvalitet). Registret BRYGD har en rad per dryck.
import { balans } from './balans';
import { count, forstaGang, living, log } from './folk';
import { Station, isKlar, stationerOf } from './stationer';
import { DAY, HOUR, Person, State } from './typer';
import { temperature } from './vader';
import { getable, takeMaterial } from './behov';
import { fyllVatska, karRymmer, ledigFor, vatskaAv, VatskaId } from './vatskor';
import { knows } from './teknik';
import { Ting, fylldSack } from './agande';

export const BRYGG = balans('brygg', {
  prepMin: 3, // så många minuter tar det att lägga en sats i karet
  tappMin: 2, // och att sila och hälla upp den i krukorna
  kall: 5, // under så många grader stannar jäsningen, utom inne i ett hus
  vill: 10, // byn vill ha så mycket av varje dryck i krukorna
  maltKorn: 4, // så mycket korn blöts och torkas till lika mycket malt (steg 9.6.13), på TORK.maltDygn dygn
  maltMin: 2, // och så många minuters arbete
  surForsta: 0.3, // den första satsen öl i ett kar blir sur med den här chansen
  olVin: 2, // byn kommer på ölet när den har korn och gjort vin så här många gånger
});
// dryckerna som bryggs: det som läggs i karet, hur många dygn satsen jäser och hur mycket den ger. tek = tekniken
export interface BrygdDef { namn: string; tek: string; av: Record<string, number>; vatten: boolean; dygn: number; ger: number }
export const BRYGD: Record<'vin' | 'ol', BrygdDef> = {
  vin: { namn: 'Vin', tek: 'bryggkar', av: { bar: 10 }, vatten: true, dygn: 3, ger: 5 }, // 10 bär krossas med vatten och jäser i 3 dygn
  ol: { namn: 'Öl', tek: 'ol', av: { malt: 4, rolleka: 1 }, vatten: true, dygn: 2, ger: 8 }, // maltet, vatten och rölleka (steg 9.6.13)
};
export type BrygdId = keyof typeof BRYGD;
export const BRYGD_LIST = Object.keys(BRYGD) as BrygdId[];
// vinet blir bättre med tiden i krukan: det går att dricka direkt, är bättre efter 5 dygn och bäst efter 15 (kvaliteten 2–4)
export const vinKvalitet = (s: State, t: Ting) => t.inne?.t === undefined ? 2 : s.now - t.inne.t >= 15 * DAY ? 4 : s.now - t.inne.t >= 5 * DAY ? 3 : 2;

export const karen = (s: State) => stationerOf(s).filter(t => t.k === 'bryggkar' && isKlar(t));
// det p kan göra vid karen: hälla upp en klar sats (när en ledig stor kruka finns) eller lägga en ny sats i ett tomt kar
export function bryggVal(s: State, p: Person): { act: 'brygga' | 'tappa' | 'malta'; kar: Station; v: BrygdId } | undefined {
  for (const kar of karen(s)) {
    const sats = kar.sats;
    if (sats?.klar && ledigFor(s, sats.v)) return { act: 'tappa', kar, v: sats.v };
  }
  for (const kar of karen(s)) {
    if (kar.sats) continue;
    for (const v of BRYGD_LIST) {
      const d = BRYGD[v];
      if (!knows(p, d.tek) || vatskaAv(s, v) >= BRYGG.vill || (d.vatten && !fylldSack(s))) continue;
      if (Object.entries(d.av).every(([k, n]) => getable(s, p, k) >= n)) return { act: 'brygga', kar, v };
    }
  }
  // maltet (steg 9.6.13): kornet blöts och hängs på en torkställning med plats, när ölet saknar malt
  const tork = torkarna(s).find(t => TORK.rymd - (t.tork ?? []).reduce((n, q) => n + q.n, 0) >= BRYGG.maltKorn), kar0 = karen(s)[0];
  if (kar0 && tork && knows(p, BRYGD.ol.tek) && vatskaAv(s, 'ol') < BRYGG.vill && getable(s, p, 'malt') < BRYGD.ol.av.malt && !maltHanger(s) && getable(s, p, 'korn') - (RATT.spara.korn ?? 0) >= BRYGG.maltKorn) return { act: 'malta', kar: tork, v: 'ol' };
  return undefined;
}
const maltHanger = (s: State) => torkarna(s).some(t => (t.tork ?? []).some(q => q.k === MALTKORN));
export const MALTKORN = 'maltkorn'; // det blötta kornet som hänger på torkställningen
// kornet blöts och hängs upp (KLAR för malta)
export function maltaKlar(s: State, p: Person, ref?: number) {
  const t = torkarna(s).find(x => x.id === ref) ?? torkarna(s)[0];
  if (!t || getable(s, p, 'korn') < BRYGG.maltKorn) return;
  const ag = takeMaterial(s, p, 'korn', BRYGG.maltKorn);
  (t.tork ??= []).push({ k: MALTKORN, n: BRYGG.maltKorn, t: s.now, ag: { ...ag } });
  count(s, 'maltat', BRYGG.maltKorn);
}
// ölet (steg 9.6.13): byn kommer på det när den har korn och har gjort vin några gånger
export function olUpptackt(s: State) {
  if ((s.stat?.brygt_vin ?? 0) < BRYGG.olVin || living(s).some(p => knows(p, 'ol'))) return;
  const nya = living(s).filter(p => knows(p, 'bryggkar') && knows(p, 'sadesodling'));
  for (const p of nya) learn(s, p, TEK.ol);
  if (nya.length && forstaGang(s, 'olForsta')) log(s, `${nya[0].name} förstår att kornet kan jäsa till öl som bären till vin.`, 'world', [nya[0].id]);
}
// arbetet är klart (KLAR i steg.ts): en ny sats i karet, eller den klara satsen upphälld i krukorna
export function bryggKlar(s: State, p: Person, ref?: number) {
  const kar = karen(s).find(t => t.id === ref) ?? karen(s)[0];
  if (!kar) return;
  if (kar.sats?.klar) {
    let n = kar.sats.n;
    for (let t = ledigFor(s, kar.sats.v); t && n > 0; t = ledigFor(s, kar.sats.v)) { const m = Math.min(n, karRymmer(t)); fyllVatska(s, kar.sats.v, m, t); n -= m; }
    count(s, 'tappat_' + kar.sats.v, kar.sats.n - n);
    if (n > 0) kar.sats.n = n; else kar.sats = undefined;
    return;
  }
  if (kar.sats) return;
  const v = bryggVal(s, p)?.v;
  if (!v) return;
  const d = BRYGD[v], sack = d.vatten ? fylldSack(s) : undefined;
  if (d.vatten && !sack) return;
  for (const [k, n] of Object.entries(d.av)) takeMaterial(s, p, k, n);
  if (sack) sack.inne = undefined;
  const forsta = !(kar.brygt ?? 0); // karet behåller jästen; den första satsen tar dubbelt så lång tid (steg 9.6.13)
  kar.sats = { v, n: d.ger, jas: 0, dygn: d.dygn * (v === 'ol' && forsta ? 2 : 1), ...(v === 'ol' && forsta && rnd(s, 'mat', p) < BRYGG.surForsta ? { sur: 1 as const } : {}) };
  kar.brygt = (kar.brygt ?? 0) + 1;
  count(s, 'brygt_' + v);
  if (forstaGang(s, 'brygd_' + v)) log(s, `${p.name} lade byns första sats ${d.namn.toLowerCase()} i bryggkaret.`, 'world', [p.id]);
}
// en gång i timmen (steg.ts): satserna jäser när det är varmt nog eller karet står inne, och blir klara
export function stepBrygg(s: State) {
  olUpptackt(s);
  const varmt = temperature(s) >= BRYGG.kall;
  for (const kar of karen(s)) {
    const sats = kar.sats;
    if (!sats || sats.klar || !(varmt || kar.inne)) continue;
    sats.jas += HOUR;
    if (sats.jas >= sats.dygn * DAY) { if (sats.sur) { kar.sats = undefined; count(s, 'surSats'); continue; } sats.klar = 1; count(s, 'jast_' + sats.v); } // en sur sats hälls ut
  }
}
export const harBrygd = (s: State) => living(s).some(p => BRYGD_LIST.some(v => knows(p, BRYGD[v].tek)));
export type { VatskaId };
import { TORK, torkarna } from './matlagning';
import { RATT } from './ratter';
import { TEK, learn } from './teknik';
import { rnd } from './slump';
