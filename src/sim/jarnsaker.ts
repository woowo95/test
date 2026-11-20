// Järnredskapen (steg 12.2.6, Landskapet och järnet: Järnet: Järnsakerna, Vad en järnyxa kostar). Järnyxan, järnkniven och lien
// är rader i redskapens grupper (yxa, kniv, skara; steg 12.2.5) med högre rang än stensaken, så att de tas före den. De smids i
// smedjan och bara där (handlingen smida, smedja.ts): ett projekt per sak, vars brist är hur stor del av det byn vill ha av
// gruppen som ännu inte är av järn, så att järnet ersätter stenen. Ett järnredskap arbetar tre gånger så fort (redskapets rad
// i arbetet: fart, eller ger där arbetet ger saker), håller fyra till fem gånger så länge (haller) och ger oftare bra kvalitet
// där det som görs har kvalitet (kvalitet). En järnsak kräver också stensakens teknik
import { balans } from './balans';
import { getable, takeMaterial } from './behov';
import { ALDER, ageOf, count, forstaGang, log } from './folk';
import { Person, State, Task } from './typer';
import { addTool, nTools, skrotKrok } from './agande';
import { addTo, put } from './lager';
import { SAKER } from './saker';
import { knows } from './teknik';
import { isKlar, kvVid, nyttVid, stationerOf, vidStation } from './stationer';
import { eldKan } from './stationseld';
import { laggTillProjekt } from './projekt';
import { villAv } from './forradsmal';
import { grundvarde } from './varde';
import { nyKvalitet } from './kvalitet';
import { clamp } from './slump';

export const JARNSAK = balans('jarnsak', {
  ersatt: 0.6, // ett järnredskap som ersätter ett av sten är värt så här mycket av det som saknas i gruppen (projektets vikt)
  lieFart: 3, // lien slår ängen så här många gånger fortare än skäran (slåttern har ingen redskapsrad)
  omSkrot: 2, // så många järnskrot smids om till ett järn (steg 12.2.7) ...
  omMin: 3, // ... på så här många minuter
});
export const LIE_FART = JARNSAK.lieFart;
// sakerna som smids, gruppen de hör till, stensakens teknik och texten när den smids
export interface JarnsakDef { grupp: string; tek: string; text: string; forsta: string }
export const JARNSAKER: Record<string, JarnsakDef> = {
  jarnyxa: { grupp: 'yxa', tek: 'yxa', text: 'Smider en järnyxa på städet.', forsta: '{namn} smidde byns första järnyxa. Den fäller ett träd på en tredjedel av tiden.' },
  jarnkniv: { grupp: 'kniv', tek: 'kniv', text: 'Smider en järnkniv på städet.', forsta: '{namn} smidde byns första järnkniv.' },
  lie: { grupp: 'skara', tek: 'kniv', text: 'Smider en lie på städet.', forsta: '{namn} smidde byns första lie. Med den slås ängen tre gånger så fort som med skäran.' },
  isborr: { grupp: 'isborr', tek: 'smedja', text: 'Smider en isborr.', forsta: '{namn} smidde byns första isborr. Den borrar genom den tjockaste isen.' }, // steg 12.2.11
  eldstal: { grupp: 'eldstal', tek: 'smedja', text: 'Smider ett eldstål.', forsta: '{namn} smidde byns första eldstål. Mot en flinta ger det gnistor som tänder på ett par försök.' }, // steg 12.2.12
  svard: { grupp: 'svard', tek: 'vapensmide', text: 'Smider ett svärd.', forsta: '{namn} smidde byns första svärd, det första som bara är ett vapen.' }, // steg 12.2.9
  sag: { grupp: 'sag', tek: 'klyvplats', text: 'Smider en såg.', forsta: '{namn} smidde byns första såg. Vid klyvplatsen blir en planka klar på en tredjedel av tiden.' }, // steg 12.5.1
  jarnspjut: { grupp: 'spjut', tek: 'flintspjut', text: 'Smider en spets av järn och surrar den på ett skaft.', forsta: '{namn} smidde byns första järnspjut.' }, // steg 12.2.8
};
// smedjan som p kan smida vid nu: färdig, och ässjan brinner eller det finns kol att tända den med
const smedjan = (s: State, p: Person) => stationerOf(s).find(t => t.k === 'smedja' && isKlar(t) && eldKan(s, p, t));
const receptAv = (k: string) => SAKER[k]?.skaffa?.av ?? {};
// p kan smida k: kan smide och stensakens teknik, har en smedja och materialet
export const kanSmida = (s: State, p: Person, k: string) => ageOf(p, s.now) >= ALDER.vuxen && knows(p, 'smedja') && knows(p, JARNSAKER[k].tek) && !!smedjan(s, p) && Object.entries(receptAv(k)).every(([m, n]) => getable(s, p, m) >= n);
// hur stor del av det byn vill ha av gruppen som ännu inte är av järn
export const jarnBrist = (s: State, k: string) => { const g = JARNSAKER[k].grupp, v = villAv(s, g); return v > 0 ? clamp((v - nTools(s, k)) / v, 0, 1) : 0; };
// det som hämtas till städet (HAMTAS i hamtning.ts): materialet i receptet
export const smidaHamtas = (tk: Task) => tk.tool === 'jarn' ? { jarnskrot: JARNSAK.omSkrot } : tk.tool && JARNSAKER[tk.tool] ? { ...receptAv(tk.tool) } : undefined;
// smidet är klart (KLAR i steg.ts): materialet tas, och saken blir p:s, med en kvalitet efter smedjan
export function smidaKlar(s: State, p: Person, tk: Task) {
  if (tk.tool === 'jarn') { omsmidKlar(s, p); return; }
  const k = tk.tool, d = k ? JARNSAKER[k] : undefined;
  if (!k || !d || !Object.entries(receptAv(k)).every(([m, n]) => getable(s, p, m) >= n)) return;
  for (const [m, n] of Object.entries(receptAv(k))) takeMaterial(s, p, m, n);
  const t = addTool(s, k, p); t.av = p.id; t.gjord = s.now;
  nyKvalitet(s, p, t, kvVid(s, p, 'smida'), SAKER[k]!.namn.toLowerCase());
  nyttVid(s, t); // sågen läggs vid klyvplatsen om dess plats står tom, och blir byns (steg 12.5.1)
  count(s, 'smitt_' + k);
  if (forstaGang(s, 'smitt_' + k)) log(s, d.forsta.replace('{namn}', p.name), 'world', [p.id]);
}
// ett projekt per järnsak (projekt.ts): vid städet i smedjan
laggTillProjekt(Object.fromEntries(Object.entries(JARNSAKER).map(([k, d]) => [k, {
  namn: SAKER[k]!.namn, vikt: JARNSAK.ersatt,
  brist: (s: State) => jarnBrist(s, k),
  kostnad: () => grundvarde(k),
  kan: (s: State, p: Person) => kanSmida(s, p, k),
  recept: (s: State, p: Person) => ageOf(p, s.now) >= ALDER.vuxen && knows(p, 'smedja') && knows(p, d.tek) && stationerOf(s).some(t => t.k === 'smedja' && isKlar(t)) ? { av: { ...receptAv(k) } } : undefined,
  uppgift: (s: State, p: Person) => { const t = smedjan(s, p); return t && { act: 'smida' as const, text: d.text, min: SAKER[k]!.skaffa!.min!, tool: k, spot: vidStation(t), ref: t.id }; },
}])));

// ---------- järnskrotet (steg 12.2.7, Järnet: Järnskrotet) ----------
// En järnsak som går sönder lämnar 1 järnskrot för varje järn i receptet (redskapSlitet i agande.ts), och 2 järnskrot smids om
// till 1 järn i smedjan på 3 minuter. Omsmidet är ett sätt att få järn: projektet jarn (brann.ts) smider om när skrotet räcker,
// och blåser annars
skrotKrok.f = (s, k) => { const n = receptAv(k).jarn ?? 0; if (n > 0 && SAKER[k]?.redskap) { addTo(s, 'jarnskrot', n); count(s, 'jarnskrot', n); } };
export const kanSmidaOm = (s: State, p: Person) => ageOf(p, s.now) >= ALDER.vuxen && knows(p, 'smedja') && !!smedjan(s, p) && getable(s, p, 'jarnskrot') >= JARNSAK.omSkrot;
export const omsmidUppgift = (s: State, p: Person) => { const t = smedjan(s, p); return t && { act: 'smida' as const, text: 'Smider om järnskrot till järn.', min: JARNSAK.omMin, tool: 'jarn', spot: vidStation(t), ref: t.id }; };
function omsmidKlar(s: State, p: Person) {
  if (getable(s, p, 'jarnskrot') < JARNSAK.omSkrot) return;
  const ag = takeMaterial(s, p, 'jarnskrot', JARNSAK.omSkrot), agare = Object.keys(ag).sort((a, b) => ag[b] - ag[a])[0];
  put(s, 'jarn', 1, agare !== undefined ? { [agare]: 1 } : undefined);
  count(s, 'omsmitt');
  if (forstaGang(s, 'omsmitt')) log(s, `${p.name} smidde om järnskrot till nytt järn.`, 'world', [p.id]);
}
