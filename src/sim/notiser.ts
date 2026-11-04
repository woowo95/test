// Notiserna (steg 5.4.3): små meddelanden om det som hänt, som ligger kvar tills spelaren tar bort dem och läses ett i taget.
// Fem slag (Björn efter bildstil v105) i NOTIS_SLAG: samma brev med olika sigill (symbolen sym_notis_<slag>). Varje sorts
// notis är en rad i NOTISER (slaget, rubriken, hur viktig den är). Byn sparar dem i s.notiser (en egen del i sparfilen, inte
// i loggen på 400 rader). Samma sort samma dygn (kalenderns år) slås ihop till en notis med flera rader, så att listan inte blir
// hundratals rader efter en lång bortavaro. Drar ingen slump och ändrar inget annat i byn, så levande läget och ikappräkningen
// får samma notiser. En ny sorts notis är en rad i NOTISER och ett anrop `notis(s, id, text, ids, plats)` där det händer.
import { State } from './typer';
import { kalender } from './tid';

export type NotisSlag = 'fara' | 'dod' | 'folk' | 'framsteg' | 'handel';
export const NOTIS_SLAG: Record<NotisSlag, { namn: string; farg: string; bild: string }> = {
  fara: { namn: 'Fara', farg: 'rost', bild: 'sym_notis_fara' },
  dod: { namn: 'Död', farg: 'kol', bild: 'sym_notis_dod' },
  folk: { namn: 'Folket', farg: 'oliv', bild: 'sym_notis_folk' },
  framsteg: { namn: 'Framsteg', farg: 'senap', bild: 'sym_notis_framsteg' },
  handel: { namn: 'Handel', farg: 'skiffer', bild: 'sym_notis_handel' },
};
// vikt: 3 = viktigast (visas först i genomgången), 1 = minst
export const NOTISER: Record<string, { slag: NotisSlag; rubrik: string; vikt: number }> = {
  varsel: { slag: 'fara', rubrik: 'Något är på väg', vikt: 3 },
  motgang: { slag: 'fara', rubrik: 'En motgång', vikt: 3 },
  anfall: { slag: 'fara', rubrik: 'Fara nära byn', vikt: 3 },
  strid: { slag: 'fara', rubrik: 'Strid', vikt: 2 },
  dod: { slag: 'dod', rubrik: 'Död i byn', vikt: 3 },
  fodd: { slag: 'folk', rubrik: 'Ett barn föddes', vikt: 2 },
  inflytt: { slag: 'folk', rubrik: 'Ny i byn', vikt: 2 },
  utflytt: { slag: 'folk', rubrik: 'Lämnade byn', vikt: 2 },
  ledare: { slag: 'folk', rubrik: 'Ny ledare', vikt: 3 },
  par: { slag: 'folk', rubrik: 'Ett nytt par', vikt: 1 },
  teknik: { slag: 'framsteg', rubrik: 'Ny kunskap', vikt: 2 },
  mastare: { slag: 'framsteg', rubrik: 'Byns första mästare', vikt: 2 },
  hus: { slag: 'framsteg', rubrik: 'Ett nytt hus', vikt: 2 },
  masterverk: { slag: 'framsteg', rubrik: 'Ett mästerverk', vikt: 1 },
  byte: { slag: 'handel', rubrik: 'Byte med handlaren', vikt: 1 },
  gast: { slag: 'handel', rubrik: 'En gäst', vikt: 1 },
};
export const NOTIS = {
  max: 300, // högst så många notiser sparas; den äldsta lästa (annars den äldsta) tas bort när det blir fler
  rader: 12, // högst så många rader i en ihopslagen notis (n räknar alla)
};

export interface Notis {
  nr: number; id: string; t: number; ar: number; // t = när den senast fick en rad, ar = kalenderns år (dygnet)
  rader: string[]; n: number; // raderna (högst NOTIS.rader, de senaste) och hur många det blev
  ids: number[]; plats?: { x: number; y: number }; last?: boolean; // vem den gäller, var, och om spelaren läst den
}
export interface Notiser { nr: number; lista: Notis[] }

export function notis(s: State, id: string, text: string, ids: number[] = [], plats?: { x: number; y: number }) {
  if (!NOTISER[id]) throw new Error(`okänd notis: ${id}`);
  const N = (s.notiser ??= { nr: 0, lista: [] }), ar = kalender(s, s.now).ar;
  let n = N.lista.find(x => x.id === id && x.ar === ar);
  if (!n) {
    n = { nr: ++N.nr, id, t: s.now, ar, rader: [], n: 0, ids: [] };
    N.lista.push(n);
    if (N.lista.length > NOTIS.max) { const i = N.lista.findIndex(x => x.last); N.lista.splice(i < 0 ? 0 : i, 1); }
  }
  n.t = s.now; n.n++; n.last = undefined;
  n.rader.push(text); if (n.rader.length > NOTIS.rader) n.rader.shift();
  for (const i of ids) if (!n.ids.includes(i)) n.ids.push(i);
  if (plats) n.plats = plats;
  return n;
}
// de som finns, viktigast och senast först (genomgången, ui/notiser.ts)
export const notiserNu = (s: State) => (s.notiser?.lista ?? []).slice().sort((a, b) => NOTISER[b.id].vikt - NOTISER[a.id].vikt || b.t - a.t);
export const olasta = (s: State) => (s.notiser?.lista ?? []).filter(n => !n.last).length;
export function lasNotis(s: State, nr: number) { const n = s.notiser?.lista.find(x => x.nr === nr); if (n) n.last = true; }
export function taBortNotis(s: State, nr?: number) { // utan nr: alla
  if (!s.notiser) return;
  s.notiser.lista = nr === undefined ? [] : s.notiser.lista.filter(x => x.nr !== nr);
}
