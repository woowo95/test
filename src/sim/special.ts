import { ganger } from './ord';
// ---------- byns egna rätter och drycker (steg 10.7.29, Mat, matlagning och dryck: Specialrecept, Specialblandningar) ----------
// Ett specialrecept är byns eget namn på en sort: en rätt (huvudingrediensen, kategorin och nivån) eller en dryck (raden i VATSKOR).
// Rätten eller drycken är samma sak i förrådet som förut. Namnet kommer när en skicklig kock lagar en fin rätt eller en
// festmåltid, eller lägger en sats i karet: chansen är SPECIAL.chans per sats och halveras för varje namn byn redan har. Namnet
// byggs som mästerverkens, av kockens namn, tidsåldern och kategorin (Runas höstgryta). Sorten räknas sedan varje gång den lagas,
// och efter SPECIAL.tradition gånger är den en tradition: en rad i krönikan, och den som äter eller dricker den får en liten tanke.
// I samtalen berättar den som tycker om byns egen rätt om den, och den som lyssnar får tycke för den
import { DAY, HOUR, Person, State } from './typer';
import { balans } from './balans';
import { count, log } from './folk';
import { rnd } from './slump';
import { gen } from './ord';
import { kronika } from './historik';
import { KATEGORIER, rattInfo, smakSak } from './ratter';
import { smaka, smakAv, RYKTE } from './rykten';
import { delade } from './berattelser';
import { tanke } from './tankar';

export const SPECIAL = balans('special', {
  chans: 0.05, // chansen per sats att den skickliga kocken ger sorten ett namn ...
  skill: 6, // ... när hen har minst så här mycket i matlagning
  tradition: 10, // efter så många satser är sorten en tradition
  glad: 0.02, gladTim: 6, // tanken för den som äter eller dricker en tradition, och hur många timmar den varar
});
export interface Special { sort: string; namn: string; kock: number; av: string[]; t: number; n: number; trad?: 1 }
const ARSORD = ['vinter', 'vår', 'sommar', 'höst'];
// sorten för saken k: rätten utan hållbarheten (r_kott_gryta_fin), eller drycken
export const sortAv = (k: string) => { const r = rattInfo(k); return r ? `r_${r.huvud}_${r.kat}_${r.niva}` : k; };
export const specialAv = (s: State, k: string) => s.special?.find(x => x.sort === sortAv(k));
// byns eget namn på saken k, eller undefined
export const egetNamn = (s: State, k: string) => specialAv(s, k)?.namn;
// det sista ordet i namnet: kategorin för en rätt (festmåltiden heter fest), drycken för en dryck
const ordAv = (sort: string, dryck: string) => { const r = rattInfo(sort); return r ? r.kat === 'grop' ? 'fest' : KATEGORIER[r.kat].namn : dryck.toLowerCase(); };
// en sats av saken k är lagad av p (kokaKlar, gropKlar, bryggKlar): räknas om sorten har ett namn, annars kan den få ett
export function specialSats(s: State, p: Person, k: string, av: string[], ai: number, dryck = '') {
  const sort = sortAv(k), l = (s.special ??= []), x = l.find(q => q.sort === sort);
  if (x) {
    x.n++;
    if (x.n === SPECIAL.tradition && !x.trad) { x.trad = 1; const t = `${x.namn} har lagats ${ganger(x.n)} och är byns tradition.`; log(s, t, 'world', [p.id]); kronika(s, t, 'mat'); count(s, 'specialTradition'); }
    return;
  }
  if ((p.skill.matlagning ?? 0) < SPECIAL.skill || rnd(s, 'mat', p) >= SPECIAL.chans * Math.pow(0.5, l.length)) return;
  const namn = `${gen(p.name)} ${ARSORD[ai]}${ordAv(sort, dryck)}`;
  l.push({ sort, namn, kock: p.id, av, t: s.now, n: 1 });
  count(s, 'special');
  log(s, `${p.name} lagade något som byn börjat kalla ${namn}.`, 'world', [p.id]);
}
// den som äter eller dricker en tradition får en liten tanke
export function specialTanke(s: State, p: Person, per: Record<string, number>) {
  for (const k in per) if (per[k] > 0 && specialAv(s, k)?.trad) { tanke(p, 'byggsRatt', s.now, { v: SPECIAL.glad, tid: SPECIAL.gladTim * HOUR }); return; }
}
// i ett samtal berättar a om byns egna rätt som a tycker bäst om, och b, som står a nära, får tycke för den (som matsmaken, rykten.ts)
export function berattaSpecial(s: State, a: Person, b: Person, op: number) {
  if (op < 20 || !s.special?.length) return;
  const x = s.special.map(q => ({ q, v: smakAv(a, 'm:' + smakSak(q.sort)) + (q.kock === a.id ? 1 : 0) })).filter(y => y.v > 0).sort((y, z) => z.v - y.v)[0]?.q;
  if (!x) return;
  smaka(b, 'm:' + smakSak(x.sort), RYKTE.smakSprid);
  delade('special', undefined, x.namn);
}
// namnet på byns egen rätt med huvudingrediensen h, till budet om högtidens rätt (den som lagats flest gånger)
export const specialHuvud = (s: State, h: string) => (s.special ?? []).filter(x => rattInfo(x.sort)?.huvud === h).sort((a, b) => b.n - a.n)[0]?.namn;
// texten i sakens ruta: vem som först lagade den och av vad
export function specialText(s: State, k: string, namn: (k: string) => string) {
  const x = specialAv(s, k);
  if (!x) return '';
  const kock = s.people.find(q => q.id === x.kock)?.name ?? 'någon';
  return `Byns egen ${rattInfo(x.sort) ? 'rätt' : 'dryck'}, först lagad av ${kock} för ${Math.round((s.now - x.t) / DAY)} dygn sedan av ${x.av.map(namn).join(', ').toLowerCase()}. Lagad ${x.n} ${x.n === 1 ? 'gång' : 'gånger'}${x.trad ? ', en tradition' : ''}.`;
}
