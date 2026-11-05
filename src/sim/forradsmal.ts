// Förråden (steg 6.2.13, "Arbetsordningen (Förråden)" i designdokumentet): registret FORRADSMAL har en rad per resurs med
// två mål. Bufferten är det byn behöver för att klara sig tills den kan hämta mer: under den är resursen ett behov under
// Försörjning (val.ts), och behovet växer ju mer som fattas. Lyxtaket ligger över bufferten: mellan dem fylls resursen bara
// när inget annat finns på Förbättra, och över taket arbetar ingen för den. Målen räknas i dygn som förrådet räcker, och
// räknas om en gång i timmen (och när ledarens påbud om förrådet ändras). Seden Förutseende och påbudet (styre.ts) höjer
// båda. En ny resurs är en ny rad (steg 6.2.14).
import { balans } from './balans';
import { Pabud, pabud } from './styre';
import { HOUR, State } from './typer';

export const FORRAD = balans('forrad', {
  forsiktig: 0.25, // en försiktig by (seden Förutseende eller påbudet) vill ha så mycket större förråd
  behovTomt: 3.2, behovMax: 3.5, // vikten av ett tomt förråd under Försörjning, och den högsta vikten
  // mat: förrådets dygn dämpar vikten ner till Min när förrådet räcker så länge byn vill (bufferten) ...
  matDygn: 1.1, matMin: 0.4,
  matMatt: 2, matMinMatt: 0.04, // ... och sedan vidare ner till MinMatt vid taket, Matt gånger bufferten: då upphör matarbetet nästan (steg 3.10.9)
  vedDygn: 2, vedMin: 0.15, // ... och för ved
  vedMatt: 12, vedMinMatt: 0.01, // över taket (Matt gånger bufferten) sjunker golvet mot MinMatt, som ligger där vid dubbla tiden (steg 6.1.5)
});

export interface Forradsmal {
  dygn: number; // förrådets dygn räknas mot så här många (gånger försiktigheten) ...
  min: number; // ... och vid bufferten väger behovet så här mycket
  matt: number; // lyxtaket: så här många gånger bufferten
  minMatt: number; // vid taket väger behovet så här lite
  pabud: Pabud; // ledarens påbud om förrådet (styre.ts)
}
export const FORRADSMAL = {
  mat: { dygn: FORRAD.matDygn, min: FORRAD.matMin, matt: FORRAD.matMatt, minMatt: FORRAD.matMinMatt, pabud: 'matlager' },
  ved: { dygn: FORRAD.vedDygn, min: FORRAD.vedMin, matt: FORRAD.vedMatt, minMatt: FORRAD.vedMinMatt, pabud: 'vedlager' },
} as const satisfies Record<string, Forradsmal>;
export type Resurs = keyof typeof FORRADSMAL;

// bufferten i dygn för förrådsseden eller påbudet v, och extra (den som anar en hård vinter, motgang.ts)
export const onskatDygn = (k: Resurs, v: number, extra = 0) => { const r = FORRADSMAL[k]; return r.dygn * (1 + FORRAD.forsiktig * v + extra) * (FORRAD.behovTomt - r.min); };

// byns mål, räknade en gång i timmen (inte sparade: de räknas ur påbudet)
interface Mal { key: string; buffert: number; tak: number }
const cache = new WeakMap<State, Record<string, Mal>>();
function mal(s: State, k: Resurs): Mal {
  const v = pabud(s, FORRADSMAL[k].pabud), key = `${Math.floor(s.now / HOUR)}:${v}`, c = cache.get(s) ?? {};
  let m = c[k];
  if (!m || m.key !== key) { const b = onskatDygn(k, v); m = c[k] = { key, buffert: b, tak: FORRADSMAL[k].matt * b }; cache.set(s, c); }
  return m;
}
// bufferten och lyxtaket i dygn. extra: p:s aning om en hård vinter (räknas då direkt)
export const buffert = (s: State, k: Resurs, extra = 0) => extra ? onskatDygn(k, pabud(s, FORRADSMAL[k].pabud), extra) : mal(s, k).buffert;
export const lyxtak = (s: State, k: Resurs, extra = 0) => extra ? FORRADSMAL[k].matt * buffert(s, k, extra) : mal(s, k).tak;
