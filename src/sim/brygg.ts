// Bryggningen (steg 9.6.12–9.6.13, Mat, matlagning och dryck: Drycker upptäcks i steg). Bryggkaret är en station med innehåll
// (t.sats): satsen ligger i karet medan den jäser och syns där med sin färg. Arbetet är kort (BRYGG.prepMin och tappMin) och
// väntan lång; ingen arbetar medan det jäser. Under BRYGG.kall grader stannar jäsningen, utom i ett kar inne i ett hus. När
// satsen är klar silas den och hälls upp i stora lerkrukor, och karet är tomt igen. Vinet och ölet är rader i VATSKOR
// (vatskor.ts) och står i krukorna, där vinet blir bättre med tiden (MOGNAD i tunna.ts). Registret BRYGD har en rad per dryck.
import { balans } from './balans';
import { isFood } from './saker';
import { foodDays } from './ekonomi';
import { buffert, villHaAv, Materialslag } from './forradsmal';
import { count, forstaGang, gjort, living, log } from './folk';
import { Station, isKlar, stationerOf } from './stationer';
import { DAY, HOUR, MIN, Person, State } from './typer';
import { temperature } from './vader';
import { getable, takeMaterial } from './behov';
import { VATSKOR, fyllVatska, karRymmer, ledigFor, taVatska, vatskaAv, VatskaId } from './vatskor';
import { knows } from './teknik';
import { fylldSack } from './agande';
import { olTillKyrkan } from './kyrka';
import { kyrkaId } from './egendom';

export const BRYGG = balans('brygg', {
  prepMin: 3, // så många minuter tar det att lägga en sats i karet
  tappMin: 2, // och att sila och hälla upp den i krukorna
  kall: 5, // under så många grader stannar jäsningen, utom inne i ett hus
  maltKorn: 4, // så mycket korn blöts och torkas till lika mycket malt (steg 9.6.13), på TORK.maltDygn dygn
  maltMin: 2, // och så många minuters arbete
  surForsta: 0.3, // den första satsen öl i ett kar blir sur med den här chansen
  olVin: 2, // byn kommer på ölet när den har korn och gjort vin så här många gånger
  brannMin: 2, // så många minuter tar det att hälla en kruka vin eller en sats öl i brännpannan (steg 10.7.26)
  brannKok: 30, // så många minuter kokar pannan medan dess eld brinner
  brannVin: 5, brannOl: 8, // så mycket vin eller öl en bränning tar
  brannVana: 10, // chansen att få 2 sprit i stället för 1 är färdigheten i matlagning delad med det här
  mjodVin: 2, // och på mjödet när den har honung och gjort vin så här många gånger (steg 10.7.25)
});
// dryckerna som bryggs: det som läggs i karet, hur många dygn satsen jäser och hur mycket den ger. tek = tekniken
export interface BrygdDef { namn: string; tek: string; av: Record<string, number>; vatten: boolean; dygn: number; ger: number; gor: string } // gor = uppgiftens text
export const BRYGD: Record<string, BrygdDef> = {
  vin: { namn: 'Vin', tek: 'bryggkar', av: { bar: 10 }, vatten: true, dygn: 3, ger: 5, gor: 'Krossar bär med vatten i bryggkaret.' }, // 10 bär krossas med vatten och jäser i 3 dygn
  ol: { namn: 'Öl', tek: 'ol', av: { malt: 4, rolleka: 1 }, vatten: true, dygn: 2, ger: 8, gor: 'Lägger malt, vatten och rölleka i bryggkaret.' }, // maltet, vatten och rölleka (steg 9.6.13)
  svagdricka: { namn: 'Svagdricka', tek: 'ol', av: { malt: 2 }, vatten: true, dygn: 1, ger: 8, gor: 'Lägger lite malt och vatten i bryggkaret till svagdricka.' }, // lite malt och vatten (steg 10.7.24)
  mjod: { namn: 'Mjöd', tek: 'mjod', av: { honung: 3 }, vatten: true, dygn: 4, ger: 5, gor: 'Löser honungskakor i vatten i bryggkaret.' }, // honungen jäser till mjöd (steg 10.7.25)
};
export type BrygdId = VatskaId;
export const BRYGD_LIST = Object.keys(BRYGD) as BrygdId[];

export const karen = (s: State) => stationerOf(s).filter(t => t.k === 'bryggkar' && isKlar(t));
// det p kan göra vid karen: hälla upp en klar sats (när en ledig stor kruka finns) eller lägga en ny sats i ett tomt kar
export function bryggVal(s: State, p: Person): { act: 'brygga' | 'tappa' | 'malta' | 'branna'; kar: Station; v: BrygdId } | undefined {
  for (const kar of karen(s)) {
    const sats = kar.sats;
    if (kar.bran && kar.bran.kvar <= 0 && ledigFor(s, 'sprit')) return { act: 'tappa', kar, v: 'sprit' }; // spriten i brännpannan (steg 10.7.26)
    if (sats?.klar && ledigFor(s, sats.v)) return { act: 'tappa', kar, v: sats.v };
  }
  // karet brygger den dryck byn har störst brist på mot sitt förrådsmål (steg 10.7.24): öl och svagdricka delar maltet
  const brist = (v: BrygdId) => { const m = villHaAv(s, v as Materialslag); return m > 0 ? 1 - vatskaAv(s, v) / m : 0; };
  const vilka = BRYGD_LIST.filter(v => knows(p, BRYGD[v].tek) && vatskaAv(s, v) < villHaAv(s, v as Materialslag)).sort((a, b) => brist(b) - brist(a)); // så mycket som dricks (steg 10.2.12)
  for (const kar of karen(s)) {
    if (kar.sats) continue;
    for (const v of vilka) {
      const d = BRYGD[v];
      if (d.vatten && !fylldSack(s)) continue;
      // det som också är mat (bären) har sitt värde som mat i förrådsmålen (steg 10.2.1): det bryggs bara av när maten räcker
      // över bufferten, så att vinet ärver bristen på mat
      if (Object.entries(d.av).every(([k, n]) => getable(s, p, k) >= n && !(isFood(k) && foodDays(s) < buffert(s, 'mat')))) return { act: 'brygga', kar, v };
    }
  }
  // brännpannan (steg 10.7.26): när byn vill ha sprit och har en kruka vin eller en sats öl att bränna
  for (const kar of karen(s)) if (kar.bran && kar.bran.kvar > 0 && !stationBrinner(kar) && eldKan(s, p, kar)) return { act: 'branna', kar, v: 'sprit' }; // pannans eld slocknade innan spriten var klar: den eldas igen
  if (knows(p, 'sprit') && vatskaAv(s, 'sprit') < villHaAv(s, 'sprit' as Materialslag) && brannAv(s)) for (const kar of karen(s)) if (kar.med?.includes('brannpanna') && !kar.bran && eldKan(s, p, kar)) return { act: 'branna', kar, v: 'sprit' };
  // maltet (steg 9.6.13): kornet blöts och hängs på en torkställning med plats, när en dryck av malt saknar malt
  const tork = torkarna(s).find(t => TORK.rymd - (t.tork ?? []).reduce((n, q) => n + q.n, 0) >= BRYGG.maltKorn), kar0 = karen(s)[0];
  const maltV = vilka.find(v => BRYGD[v].av.malt && getable(s, p, 'malt') < BRYGD[v].av.malt);
  if (kar0 && tork && maltV && !maltHanger(s) && getable(s, p, 'korn') - utsadeKrok.av(s, 'korn') >= BRYGG.maltKorn) return { act: 'malta', kar: tork, v: maltV };
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
// ---------- brännpannan (steg 10.7.26, Mat, matlagning och dryck: Spriten) ----------
// Pannan är ett tillbehör på bryggkaret med en egen liten eld (ELDSTATIONER.bryggkar). Bränningen har tre led: en kruka vin eller
// en sats öl hälls i pannan (BRYGG.brannMin), pannan kokar BRYGG.brannKok minuter medan elden brinner (stepStationsEld), och spriten
// hälls upp i en liten lerkruka (tappa). Den som har vana får 2 sprit, annars 1
// det som bränns: vinet eller ölet som byn har mest av mot det den vill ha, om det räcker till en bränning
const BRANN: Partial<Record<VatskaId, number>> = { vin: BRYGG.brannVin, ol: BRYGG.brannOl };
function brannAv(s: State): VatskaId | undefined {
  let bast: VatskaId | undefined, bv = -Infinity;
  for (const v of Object.keys(BRANN) as VatskaId[]) {
    const har = vatskaAv(s, v), n = BRANN[v]!;
    if (har < n) continue;
    const r = har / Math.max(1, villHaAv(s, v as Materialslag));
    if (r > bv) { bv = r; bast = v; }
  }
  return bast;
}
export function brannKlar(s: State, p: Person, ref?: number) {
  const kar = karen(s).find(t => t.id === ref && t.med?.includes('brannpanna')), v = brannAv(s);
  if (!kar || kar.bran || !v || !stationBrinner(kar)) return; // en bränning som redan går har fått sin ved
  taVatska(s, v, BRANN[v]!); // de tomma krukorna blir kvar
  kar.bran = { n: rnd(s, 'mat', p) < (p.skill.matlagning ?? 0) / BRYGG.brannVana ? 2 : 1, kvar: BRYGG.brannKok * MIN };
  count(s, 'brant_' + v); gjort(s, p, 'brant', 1);
  if (forstaGang(s, 'brannForsta')) log(s, `${p.name} hällde ${VATSKOR[v].namn.toLowerCase()} i brännpannan och eldade under den.`, 'world', [p.id]);
}
// så många timmar pannans eld behöver brinna: det som är kvar av bränningen, eller en hel bränning för den som ska börja
brannKrok.tim = (_s, t) => { const b = (t as Station).bran; return (b ? Math.max(0, b.kvar) : BRYGG.brannKok * MIN) / HOUR; };
// mjödet (steg 10.7.25): byn kommer på det när den har honung och har gjort vin några gånger
export function mjodUpptackt(s: State) {
  if ((s.stat?.brygt_vin ?? 0) < BRYGG.mjodVin || amountOf(s, 'honung') < 1 || living(s).some(p => knows(p, 'mjod'))) return;
  const nya = living(s).filter(p => knows(p, 'bryggkar'));
  for (const p of nya) learn(s, p, TEK.mjod);
  if (nya.length && forstaGang(s, 'mjodForsta')) log(s, `${nya[0].name} förstår att honungen kan jäsa i vatten som bären till vin.`, 'world', [nya[0].id]);
}
// arbetet är klart (KLAR i steg.ts): en ny sats i karet, eller den klara satsen upphälld i krukorna
export function bryggKlar(s: State, p: Person, ref?: number) {
  const kar = karen(s).find(t => t.id === ref) ?? karen(s)[0];
  if (!kar) return;
  if (kar.bran && kar.bran.kvar <= 0) { // spriten hälls upp i en liten lerkruka (steg 10.7.26)
    const t = ledigFor(s, 'sprit');
    if (t) { fyllVatska(s, 'sprit', kar.bran.n, t); count(s, 'sprit', kar.bran.n); kar.bran = undefined; if (forstaGang(s, 'spritForsta')) log(s, `${p.name} hällde upp byns första sprit ur brännpannan.`, 'world', [p.id]); return; }
  }
  if (kar.sats?.klar) {
    let n = kar.sats.n;
    for (let t = ledigFor(s, kar.sats.v); t && n > 0; t = ledigFor(s, kar.sats.v)) {
      const m = Math.min(n, karRymmer(t)); fyllVatska(s, kar.sats.v, m, t); n -= m;
      const tr = kar.sats.v === 'ol' ? olTillKyrkan(s, p) : undefined; // öl vid högtiden (steg 10.3.23): den som följer budet ger kyrkan krukan
      if (tr) { t.agare = kyrkaId(tr.id); count(s, 'ol_kyrkan'); }
    }
    count(s, 'tappat_' + kar.sats.v, kar.sats.n - n);
    if (n > 0) kar.sats.n = n; else kar.sats = undefined;
    return;
  }
  if (kar.sats) return;
  const b = bryggVal(s, p); // (materialet kan ha tagits medan man arbetade: då kan valet vara ett annat arbete eller ett annat kar)
  if (b?.act !== 'brygga' || b.kar !== kar) return;
  const v = b.v;
  const d = BRYGD[v], sack = d.vatten ? fylldSack(s) : undefined;
  if (d.vatten && !sack) return;
  for (const [k, n] of Object.entries(d.av)) takeMaterial(s, p, k, n);
  if (sack) sack.inne = undefined;
  const forsta = !(kar.brygt ?? 0); // karet behåller jästen; den första satsen tar dubbelt så lång tid (steg 9.6.13)
  const malt = !!d.av.malt; // det som bryggs av malt (ölet och svagdrickan)
  kar.sats = { v, n: d.ger, jas: 0, dygn: d.dygn * (malt && forsta ? 2 : 1), ...(malt && forsta && rnd(s, 'mat', p) < BRYGG.surForsta ? { sur: 1 as const } : {}) };
  kar.brygt = (kar.brygt ?? 0) + 1;
  count(s, 'brygt_' + v);
  specialSats(s, p, v, Object.keys(d.av), ageIndex(s), VATSKOR[v].namn); // byns egen dryck (steg 10.7.29)
  if (forstaGang(s, 'brygd_' + v)) log(s, `${p.name} lade byns första sats ${d.namn.toLowerCase()} i bryggkaret.`, 'world', [p.id]);
}
// en gång i timmen (steg.ts): satserna jäser när det är varmt nog eller karet står inne, och blir klara
export function stepBrygg(s: State) {
  olUpptackt(s); mjodUpptackt(s);
  const varmt = temperature(s) >= BRYGG.kall;
  for (const kar of karen(s)) {
    const sats = kar.sats;
    if (!sats || sats.klar || !(varmt || kar.inne)) continue;
    sats.jas += HOUR;
    if (sats.jas >= sats.dygn * DAY) { if (sats.sur) { kar.sats = undefined; count(s, 'surSats'); continue; } sats.klar = 1; count(s, 'jast_' + sats.v); } // en sur sats hälls ut
  }
}
export type { VatskaId };
import { TORK, torkarna } from './matlagning';
import { utsadeKrok } from './ratter';
import { TEK, learn } from './teknik';
import { rnd } from './slump';
import { amountOf } from './lager';
import { brannKrok, eldKan, stationBrinner } from './stationseld';
import { specialSats } from './special';
import { ageIndex } from './tid';
