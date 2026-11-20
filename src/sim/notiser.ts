// Notiserna (steg 5.4.3): små meddelanden om det som hänt, som ligger kvar tills spelaren tar bort dem och läses ett i taget.
// Fem slag (Björn efter bildstil v105) i NOTIS_SLAG: samma brev med olika sigill (symbolen sym_notis_<slag>). Varje sorts
// notis är en rad i NOTISER (slaget, rubriken, hur viktig den är). Byn sparar dem i s.notiser (en egen del i sparfilen, inte
// i loggen på 400 rader). Samma sort samma dygn (kalenderns år) slås ihop till en notis med flera rader, så att listan inte blir
// hundratals rader efter en lång bortavaro. Drar ingen slump och ändrar inget annat i byn, så levande läget och ikappräkningen
// får samma notiser. En ny sorts notis är en rad i NOTISER och ett anrop `notis(s, id, text, ids, plats)` där det händer.
import { State } from './typer';
import { kalender } from './tid';
import { personNotis, type Ton } from './personlogg';

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
  blodning: { slag: 'fara', rubrik: 'Förblöder', vikt: 3 }, // tiden kvar är kort (steg 9.5.14)
  infektion: { slag: 'fara', rubrik: 'Ett infekterat sår', vikt: 2 }, // feber och kallbrand (steg 9.5.24)
  // hälsans tecken (steg 9.5.31, registret HALSOTECKEN i halsonotiser.ts): en rad per tecken
  blodsteg: { slag: 'fara', rubrik: 'Svag av blodförlusten', vikt: 2 },
  blodigen: { slag: 'fara', rubrik: 'Såret blöder igen', vikt: 2 },
  blodstopp: { slag: 'folk', rubrik: 'Blödningen stoppad', vikt: 1 },
  svimmat: { slag: 'fara', rubrik: 'Medvetslös', vikt: 3 },
  infborjar: { slag: 'fara', rubrik: 'En infektion börjar', vikt: 2 },
  infborta: { slag: 'folk', rubrik: 'Infektionen är borta', vikt: 1 },
  benbrott: { slag: 'fara', rubrik: 'Ett benbrott', vikt: 2 },
  bensatt: { slag: 'folk', rubrik: 'Benet är satt', vikt: 1 },
  snett: { slag: 'fara', rubrik: 'Läker snett', vikt: 1 },
  avhuggen: { slag: 'fara', rubrik: 'En förlorad kroppsdel', vikt: 2 },
  dod: { slag: 'dod', rubrik: 'Död i byn', vikt: 3 },
  dodfodd: { slag: 'dod', rubrik: 'Ett barn dog vid födseln', vikt: 2 }, // förlossningen (steg 9.5.29)
  gravid: { slag: 'folk', rubrik: 'Väntar barn', vikt: 1 },
  fodd: { slag: 'folk', rubrik: 'Ett barn föddes', vikt: 2 },
  inflytt: { slag: 'folk', rubrik: 'Ny i byn', vikt: 2 },
  utflytt: { slag: 'folk', rubrik: 'Lämnade byn', vikt: 2 },
  ledare: { slag: 'folk', rubrik: 'Ny ledare', vikt: 3 },
  bynamn: { slag: 'folk', rubrik: 'Byns namn', vikt: 2 }, // dopet och namnbytet (steg 10.9.3)
  par: { slag: 'folk', rubrik: 'Ett nytt par', vikt: 1 },
  fram: { slag: 'folk', rubrik: 'Ett framträdande', vikt: 1 },
  match: { slag: 'folk', rubrik: 'En match', vikt: 1 },
  fest: { slag: 'folk', rubrik: 'En fest', vikt: 2 }, // högtiden med gille (steg 10.7.19)
  teknik: { slag: 'framsteg', rubrik: 'Ny kunskap', vikt: 2 },
  mastare: { slag: 'framsteg', rubrik: 'Byns första mästare', vikt: 2 },
  hus: { slag: 'framsteg', rubrik: 'Ett nytt hus', vikt: 2 },
  masterverk: { slag: 'framsteg', rubrik: 'Ett mästerverk', vikt: 1 },
  runsten: { slag: 'folk', rubrik: 'En runsten', vikt: 2 }, // steg 10.6.1
  skrift: { slag: 'folk', rubrik: 'En ny bok', vikt: 2 }, // bokens första del (steg 10.6.8)
  byte: { slag: 'handel', rubrik: 'Byte med handlaren', vikt: 1 },
  gast: { slag: 'handel', rubrik: 'En gäst', vikt: 1 },
  nyhet: { slag: 'handel', rubrik: 'Nyheter från världen', vikt: 2 },
  sandebud: { slag: 'handel', rubrik: 'Ett sändebud', vikt: 2 }, // en grannbys besked som nått byn (steg 11.6.23, liv.ts)
  resa: { slag: 'handel', rubrik: 'En resa', vikt: 2 }, // det stora i resans dagbok och redogörelsen när den kommit hem (steg 11.5.13, resa.ts) // en nyhet om en by som når byn (steg 11.4.13, ort.ts)
  sjuk: { slag: 'folk', rubrik: 'Sjukdom', vikt: 2 }, // någon insjuknar, blir sämre eller frisk (steg 9.5.4, sjukdom.ts)
  djurtorst: { slag: 'fara', rubrik: 'Ett djur dog av törst', vikt: 2 }, // steg 10.10.31
  retat: { slag: 'fara', rubrik: 'Uppretade bin', vikt: 2 }, // ett bo som retats upp och den som dött av bistick (steg 10.10.27)
  bin: { slag: 'framsteg', rubrik: 'Bina', vikt: 2 }, // byns första bisamhälle (steg 10.10.17) och ett samhälle som dör (steg 10.10.18)
  smitta: { slag: 'fara', rubrik: 'En smitta i byn', vikt: 3 }, // det första fallet av en sjukdom som smittar
  // de nya systemen (steg 12.1.137)
  dom: { slag: 'folk', rubrik: 'En dom', vikt: 2 }, // tinget eller ledaren dömde någon (styre.ts)
  avrattning: { slag: 'dod', rubrik: 'En avrättning', vikt: 3 }, // någon dömdes till döden (styre.ts)
  lag: { slag: 'folk', rubrik: 'En ny lag', vikt: 2 }, // byn stiftade en lag (lagar.ts)
  tro: { slag: 'folk', rubrik: 'En ny tro', vikt: 2 }, // en tro grundades i byn (religion.ts)
  skord: { slag: 'framsteg', rubrik: 'Den första skörden', vikt: 2 }, // byn skördade sitt första fält (odling.ts)
  tamdjur: { slag: 'framsteg', rubrik: 'Det första tamdjuret', vikt: 2 }, // byn fick sitt första tamdjur (tamdjur.ts)
};
export const NOTIS = {
  max: 300, // högst så många notiser sparas; den äldsta lästa (annars den äldsta) tas bort när det blir fler
  rader: 12, // högst så många rader i en ihopslagen notis (n räknar alla)
};

export interface Notis {
  nr: number; id: string; t: number; ar: number; // t = när den senast fick en rad, ar = kalenderns år (dygnet)
  rader: string[]; n: number; // raderna (högst NOTIS.rader, de senaste) och hur många det blev
  ids: number[]; plats?: { x: number; y: number }; last?: boolean; // vem den gäller, var, och om spelaren läst den
  fram?: number[]; // framträdandets nummer för varje rad (steg 5.4.7.1), 0 = inget
  match?: number[]; // matchens nummer för varje rad (steg 5.4.8.1), 0 = ingen
  resa?: number[]; // sällskapets nummer för varje rad (steg 11.5.13), 0 = inget
}
export interface Notiser { nr: number; lista: Notis[] }

export function notis(s: State, id: string, text: string, ids: number[] = [], plats?: { x: number; y: number }, ref: { fram?: number; match?: number; resa?: number; ton?: Ton | Record<number, Ton> } = {}) { // ref: framträdandet eller matchen raden pekar på; ton: god eller ond för dem den gäller, eller per person (personens händelser)
  if (!NOTISER[id]) throw new Error(`okänd notis: ${id}`);
  const N = (s.notiser ??= { nr: 0, lista: [] }), ar = kalender(s, s.now).ar;
  let n = N.lista.find(x => x.id === id && x.ar === ar);
  if (!n) {
    n = { nr: ++N.nr, id, t: s.now, ar, rader: [], n: 0, ids: [] };
    N.lista.push(n);
    if (N.lista.length > NOTIS.max) { const i = N.lista.findIndex(x => x.last); N.lista.splice(i < 0 ? 0 : i, 1); }
  }
  n.t = s.now; n.n++; n.last = undefined;
  for (const k of ['fram', 'match', 'resa'] as const) if (ref[k] || n[k]) { const v = (n[k] ??= n.rader.map(() => 0)); v.push(ref[k] ?? 0); }
  n.rader.push(text); if (n.rader.length > NOTIS.rader) { n.rader.shift(); n.fram?.shift(); n.match?.shift(); n.resa?.shift(); }
  for (const i of ids) if (!n.ids.includes(i)) n.ids.push(i);
  if (plats) n.plats = plats;
  personNotis(s, id, text, ids, ref.ton); // en rad hos dem den gäller (steg 9.2.107)
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
