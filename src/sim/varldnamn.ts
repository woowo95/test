// ---------- namnen i världen (steg 11.2.12, Flera samhällen: Världen i tal: landmärkena) ----------
// Byarna och platserna i världen får namn ur namnregistret: en förled ur FORLED och en efterled som hör till sorten
// (VARLDNAMN: byar heter -by, -torp eller -vik, en gravhög -högen, en bro -bron). Namnet räknas ur världens frö och platsens
// nyckel med en hash, så att samma värld får samma namn utan att röra byns slump, och ett namn som redan finns i världen väljs
// aldrig igen. Förlederna gånger efterlederna räcker till fler byar och platser än en full värld rymmer.
import { hash3 } from './slump';
import { LandmarkId } from './landmarken';
import { Varlden } from './varlden';

// förlederna: natur, djur, träd, färger och gamla ord, utan namn på verkliga gudar
export const FORLED = [
  'Ek', 'Ask', 'Alm', 'Lind', 'Björk', 'Gran', 'Tall', 'Hassel', 'Rönn', 'Vide', 'Al', 'Lönn', 'Hägg', 'Sälg', 'Asp', 'En',
  'Sten', 'Häll', 'Berg', 'Mo', 'Sand', 'Grus', 'Ler', 'Myr', 'Mosse', 'Kärr', 'Sjö', 'Å', 'Bäck', 'Käll', 'Fors', 'Tjärn',
  'Varg', 'Björn', 'Räv', 'Hjort', 'Älg', 'Örn', 'Korp', 'Kråk', 'Svan', 'Trana', 'Uggle', 'Lo', 'Bäver', 'Utter', 'Hök', 'Gås',
  'Röd', 'Svart', 'Vit', 'Grå', 'Grön', 'Gull', 'Silver', 'Järn', 'Koppar', 'Mörk', 'Ljus', 'Kall', 'Varm', 'Djup', 'Hög', 'Lång',
  'Norr', 'Sör', 'Väster', 'Öster', 'Mellan', 'Ytter', 'Inner', 'Över', 'Neder', 'Gammel', 'Ny', 'Brand', 'Is', 'Snö', 'Vind', 'Dimm',
  'Ram', 'Hed', 'Lid', 'Ängs', 'Kulle', 'Dal', 'Näs', 'Holm', 'Rot', 'Stubb', 'Hall', 'Torv', 'Sol', 'Mån', 'Stjärn', 'Hamn',
] as const;
// efterlederna per sort av namn; ett som börjar med mellanslag tar förleden i genitiv
export interface NamnDef { efter: readonly string[] }
export const VARLDNAMN = {
  by: { efter: ['by', 'torp', 'sta', 'stad', 'hem', 'vik', 'näs', 'tuna', 'inge', 'ryd', 'bo', 'hult', 'ås', 'fors', 'holm', 'lösa'] },
  lager: { efter: ['lägret', 'vallen', 'kojan', 'hyddan'] }, // handelsläger, rövarläger och utpost
  ruin: { efter: ['tomten', 'ruinen', 'murarna', 'gärdet'] },
  helig: { efter: ['lunden', 'vi', 'harg', 'källan', 'stenen'] },
  grav: { efter: ['högen', 'kumlet', 'röset'] },
  runsten: { efter: ['stenen', 'runan', 'hällen'] },
  plats: { efter: ['backen', 'kullen', 'gläntan', 'udden', 'svackan', 'stigen'] }, // fyndplatser, rastplatser, gömmor och karavanrester
  bro: { efter: ['bron', 'spången', 'vadet', 'gatan'] },
} as const satisfies Record<string, NamnDef>;
export type NamnSlag = keyof typeof VARLDNAMN;
// vilken sorts namn en plats får
export const NAMNSLAG: Record<LandmarkId, NamnSlag> = {
  by: 'by', handelslager: 'lager', rovarlager: 'lager', utpost: 'lager', ruin: 'ruin', helig: 'helig', gravhog: 'grav', runsten: 'runsten',
  fyndplats: 'plats', karavanrest: 'plats', gomma: 'plats', rastplats: 'plats', bro: 'bro', spang: 'bro', passage: 'bro',
};

const gen = (n: string) => /s$/.test(n) ? n : n + 's';
function satt(forled: string, efter: string) {
  if (efter.startsWith(' ')) return gen(forled) + efter;
  return forled + (forled.endsWith('s') && efter[0] === 's' ? efter.slice(1) : efter); // Ängs + stad blir Ängstad
}
// namnen som redan finns i världen
export const namnIVarlden = (vl: Varlden) => new Set([...(vl.platser ?? []).map(p => p.namn), ...(vl.rader ?? []).map(r => r.namn)]);
// ett nytt namn av slaget, räknat ur världens frö och nyckeln (platsens nummer); aldrig ett som redan finns
export function varldNamn(vl: Varlden, slag: NamnSlag, nyckel: number, upptagna = namnIVarlden(vl)): string {
  const e = VARLDNAMN[slag].efter, n = FORLED.length * e.length;
  const start = Math.floor(hash3(vl.fro, nyckel, 0x4e414d4e) * n);
  for (let k = 0; k < n; k++) {
    const i = (start + k * 7919) % n, namn = satt(FORLED[i % FORLED.length]!, e[Math.floor(i / FORLED.length)]!);
    if (!upptagna.has(namn)) return namn;
  }
  // alla kombinationer tagna: samma namn med ett tal efter (händer inte i en värld av den här storleken)
  let k = 2; const bas = satt(FORLED[start % FORLED.length]!, e[0]!);
  while (upptagna.has(`${bas} ${k}`)) k++;
  return `${bas} ${k}`;
}
