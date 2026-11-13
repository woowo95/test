// ---------- stationernas egna eldar (steg 10.2.85–10.2.86) ----------
// Örtköket, bakugnen och rökeriet har var sin eld, som lagerelden: den som ska arbeta där lägger på ved och tänder den, den
// brinner så länge veden räcker och glöder sedan en stund, och ved som läggs på medan den glöder brinner utan att tändas.
// Arbetet där går bara när den brinner: den som kokar i örtköket eldar först, degen gräddas och köttet röks bara medan elden
// brinner. Veden går åt i elden och inte i recepten. Varje station med eld är en rad i registret ELDSTATIONER, och elden
// ligger på stationen (Station.eld). Örtkökets eld värmer lite den som står nära (heatAt i eld.ts).
import { balans } from './balans';
import { getable, takeMaterial } from './behov';
import { count, forstaGang, log } from './folk';
import { HOUR, Person, SEC, State, Task } from './typer';
import { STATION, Station, isKlar, stationDef, stationerOf, vidStation } from './stationer';

export const STATIONSELD = balans('stationseld', {
  glodTim: 2, // så många timmar glöder elden när veden brunnit upp; ved som läggs på då brinner utan att tändas
  tandMin: 2, // så många minuter tar det att tända en kall eld, före arbetet
});
// burn = ved i timmen, max = så många ved som ryms, varme/radie = hur mycket och hur långt den värmer (0 = inte alls),
// tim = så många timmar elden behöver brinna för arbetet act (utöver arbetet självt), kravs = arbetet går inte utan elden
export interface EldStation { burn: number; max: number; varme: number; radie: number; tim?: (s: State, t: Station) => number; kravs: boolean }
export const ELDSTATIONER: Record<string, EldStation> = {
  ortkok: { burn: 1, max: 3, varme: 0.35, radie: 2.5, kravs: true }, // en ved räcker en timme: flera kokningar i rad delar på den
  bakugn: { burn: 1.5, max: 3, varme: 0, radie: 0, tim: () => bakKrok.passivTim(), kravs: true }, // degen gräddas medan elden brinner
  rokeri: { burn: 0.25, max: 4, varme: 0, radie: 0, tim: () => rokKrok.dygn() * 24, kravs: false }, // man tar ner det rökta också när elden är släckt
};
// krokarna sätts av matlagning.ts (den läses efter den här filen)
export const bakKrok = { passivTim: () => 25 / 60 };
export const rokKrok = { dygn: () => 1 };
export const eldDef = (t: Station) => ELDSTATIONER[t.k];
export const stationBrinner = (t?: Station) => !!t?.eld?.lit;
const glod = (s: State, t: Station) => !t.eld?.lit && (t.eld?.glod ?? 0) > s.now;
// stationen med eld som p står vid och arbetar med act
export function eldStationVid(s: State, p: { x: number; y: number }, act: string) {
  return stationerOf(s).find(t => eldDef(t) && isKlar(t) && stationDef(t.k)?.gor.includes(act as never) && (at => Math.hypot(p.x - at.x, p.y - at.y) < STATION.vidBank)(vidStation(t)));
}
// p kan arbeta med act vid en station med eld: den brinner, eller det finns ved att tända den med
export const eldKan = (s: State, p: Person, t?: Station) => !t || !eldDef(t) || stationBrinner(t) || getable(s, p, 'ved') >= 1;
// p lägger ved på stationens eld så att den räcker timmar timmar, hela ved och högst så många som ryms, och tänder den om den är
// kall. Svarar med minuterna det tog att tända (0 när den brann eller glödde), eller undefined när den inte brinner
export function elda(s: State, p: Person, t: Station, timmar: number) {
  const d = eldDef(t)!, e = (t.eld ??= { ved: 0 });
  const behov = Math.max(Math.ceil(Math.max(0, timmar * d.burn - e.ved) - 1e-9), e.lit || e.ved > 0 ? 0 : 1), n = Math.min(behov, Math.floor(d.max - e.ved + 1e-9), Math.floor(getable(s, p, 'ved') + 1e-9));
  if (n > 0) { takeMaterial(s, p, 'ved', n); e.ved += n; count(s, 'stationsVed', n); }
  if (e.lit || e.ved <= 0) return e.lit ? 0 : undefined;
  const kall = !glod(s, t);
  e.lit = 1; e.glod = undefined;
  if (kall) { count(s, 'stationsEldTand'); if (forstaGang(s, 'stationsEld_' + t.k)) log(s, `${p.name} tände elden i byns ${stationDef(t.k)?.namn.toLowerCase() ?? t.k}.`, 'world', [p.id]); }
  return kall ? STATIONSELD.tandMin : 0;
}
// framme vid arbetet (paborjat.ts): vid en station med eld eldar man först. Brinner den inte, och arbetet kräver den, blir det
// inget arbete. Svarar med minuterna det tog att tända, eller false när arbetet inte går
export function eldaForst(s: State, p: Person, tk: Task): number | false {
  const t = eldStationVid(s, p, tk.act);
  if (!t) return 0;
  const d = eldDef(t)!, arb = Math.max(0, tk.until - s.now, tk.arbTid ?? 0) / HOUR + (d.tim?.(s, t) ?? 0);
  const m = elda(s, p, t, arb);
  if (m === undefined && d.kravs) { count(s, 'stationsEldUtan'); return false; }
  return m ?? 0;
}
// stationernas eldar brinner (TAKTER i steg.ts): veden brinner upp, elden slocknar och glöder, glöden dör. Medan den brinner
// gräddas degen i bakugnen och röks det som hänger i rökeriet
export function stepStationsEld(s: State, dt: number) {
  for (const t of stationerOf(s)) {
    const e = t.eld;
    if (!e) continue;
    if (!e.lit) { if (e.glod !== undefined && e.glod <= s.now) e.glod = undefined; continue; }
    const d = eldDef(t);
    if (!d) { t.eld = undefined; continue; }
    const tim = Math.min(dt / 3600, e.ved / d.burn), ms = tim * HOUR;
    e.ved = Math.max(0, e.ved - tim * d.burn);
    if (t.deg) t.deg.kvar -= ms;
    for (const q of t.tork ?? []) q.rok = (q.rok ?? 0) + ms;
    if (e.ved <= 1e-9) { e.ved = 0; e.lit = undefined; e.glod = s.now - (dt * SEC - ms) + STATIONSELD.glodTim * HOUR; count(s, 'stationsEldUt'); }
  }
}
// rökeriet behöver ved (matlagning.ts väljer då att röka): något hänger och röks inte klart innan elden slocknar, och p har ved
export function rokVed(s: State, p: Person, klart: (t: Station) => number) {
  if (getable(s, p, 'ved') < 1) return false;
  return stationerOf(s).some(t => t.k === 'rokeri' && isKlar(t) && (t.tork?.length ?? 0) > 0 && (t.eld?.ved ?? 0) / ELDSTATIONER.rokeri.burn < klart(t) && (t.eld?.ved ?? 0) <= ELDSTATIONER.rokeri.max - 1);
}
// värmen från stationernas eldar på platsen (x, y), som lagerelden: avtar med avståndet ut till radien
export function stationsVarme(s: State, x: number, y: number) {
  let v = 0;
  for (const t of stationerOf(s)) {
    const d = t.eld?.lit ? eldDef(t) : undefined;
    if (!d || !d.varme) continue;
    const at = eldPlatsAv(t), r = Math.hypot(x - at.x, y - at.y);
    if (r < d.radie) v = Math.max(v, d.varme * (1 - r / d.radie));
  }
  return v;
}
// var elden är i stationen: i örtkökets härd (den första delen), annars mitt i stationen
export function eldPlatsAv(t: Station) {
  const del = t.delar?.[0];
  if (del) return { x: del.x + 0.5, y: del.y + 1 };
  const d = stationDef(t.k);
  return { x: t.x + (d?.w ?? 1) / 2, y: t.y + (d?.h ?? 1) / 2 };
}
