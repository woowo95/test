// ---------- graven (steg 11.13.28, Flera samhällen: Uppdragen i tal) ----------
// En gravhög i världen har gravgåvorna den döda fick med sig, i hela saker, räknade ur platsens frö första gången någon frågar
// (silver, ofta ett vapen och ibland ett plagg, registret GRAVGODS). Den som kommer till högen ser den och minns gåvorna som ett
// fynd (fyndId för platsen, sorten grav), som berättas och väger som mål för en resa som andra fynd. Att ta gåvorna är en
// handling som alla andra: ledaren tar dem om värdet är större än det det kostar, och det kostar mer ju mer ledarens tro säger
// att de döda lever vidare (skalan Livet efter), ju andligare ledaren är och ju mer byns sed drar åt Andlig, och mer för varje
// annan i sällskapet som ser det (ryktet: händelsen gravran ger intrycket tjuv hos dem). Den tomma högen är tom för alla.
// På den lilla kartan står högen vid mitten (PLATSRESTER.hog)
import { balans } from './balans';
import { count } from './folk';
import { varldPlatsNr, type VarldPlats } from './landmarken';
import { andlighet, skalaV, troOf } from './religion';
import { FYNDSETT, resenarer, UPPDRAGFRAM } from './resa';
import { handelse } from './rykten';
import { hash3 } from './slump';
import { fyndId, larUppdrag } from './uppdrag';
import { grundvarde } from './varde';
import { Person, State } from './typer';

export const GRAVFYND = balans('gravfynd', {
  silverMin: 2, silverMax: 12, // silvret i högen
  skam: 60, // det en lagom andlig ledare (50) utan tro tycker att det kostar att ta gåvorna (grundvärde) ...
  tro: 2, // ... gånger 1 + så mycket när tron säger att de döda lever vidare (Livet efter = 100) ...
  andlig: 1, // ... gånger 1 + så mycket för den helt andliga (100), och mindre för den världsliga ...
  sed: 0.5, // ... gånger 1 + så mycket när byns sed är helt Andlig (1), mindre när den är Världslig (−1) ...
  rykte: 20, // ... och så mycket till för varje annan i sällskapet som ser det
});
// det som kan ligga i en hög utöver silvret: saken och chansen
export const GRAVGODS: readonly { k: string; chans: number }[] = [
  { k: 'yxa', chans: 0.35 }, { k: 'flintspjut', chans: 0.35 }, { k: 'kniv', chans: 0.5 }, { k: 'tunika_ylle', chans: 0.25 },
];

// gåvorna i högen p, räknade ur platsens frö första gången
export function gravInne(p: VarldPlats): Record<string, number> {
  if (p.inne) return p.inne;
  const ut: Record<string, number> = {}, f = p.fro;
  ut.silver = GRAVFYND.silverMin + Math.floor(hash3(f, 1, 0, 0x6772) * (GRAVFYND.silverMax - GRAVFYND.silverMin + 1));
  GRAVGODS.forEach((g, i) => { if (hash3(f, 2, i, 0x6772) < g.chans) ut[g.k] = 1; });
  return (p.inne = ut);
}
export const gravVarde = (p: VarldPlats) => Object.entries(gravInne(p)).reduce((a, [k, n]) => a + n * grundvarde(k), 0);
const gravAt = (s: State, nr: number) => { const vl = s.varld, p = vl && varldPlatsNr(vl, nr); return p?.k === 'gravhog' ? p : undefined; };

// p har sett högen och minns gåvorna (värdet 0 när den är tom)
export function saGrav(s: State, p: Person, nr: number, t: number) {
  const q = gravAt(s, nr);
  if (!q) return;
  const v = Math.round(gravVarde(q)), l = larUppdrag(s, p, fyndId(nr), 1, { t, v, mal: nr, k: 'grav' });
  l.v = v; l.t = t; l.c = 1; l.src = undefined; l.led = 0;
}
FYNDSETT.grav = saGrav;

// det ledaren tycker att det kostar att ta gåvorna, med n i sällskapet (grundvärde)
export function gravSkam(s: State, led: Person, n: number) {
  const tr = troOf(s, led.tro), liv = tr ? (skalaV(tr, 'livet') ?? 50) / 100 : 0;
  const and = (andlighet(s, led) - 50) / 50, sed = s.seder?.v.andlig ?? 0;
  return GRAVFYND.skam * (1 + GRAVFYND.tro * liv) * Math.max(0, 1 + GRAVFYND.andlig * and) * Math.max(0, 1 + GRAVFYND.sed * sed) + GRAVFYND.rykte * Math.max(0, n - 1);
}

UPPDRAGFRAM.grav = (s, sl) => {
  const q = gravAt(s, sl.mal);
  if (!q) return undefined;
  const namn = 'Graven', folk = resenarer(s, sl), led = folk.find(p => p.id === sl.ledare) ?? folk[0], fick: Record<string, number> = {};
  const v = gravVarde(q);
  if (v <= 0 || !led) return { namn, hur: 'tomt', fick, text: `Högen vid ${q.namn} var redan plundrad.` };
  const skam = gravSkam(s, led, folk.length);
  if (skam >= v) { count(s, 'grav lat'); return { namn, hur: 'misslyckat', fick, text: `${led.name} stod vid högen vid ${q.namn} och lät gravgåvorna ligga.` }; }
  Object.assign(fick, q.inne); q.inne = {};
  for (const p of folk) if (p !== led) handelse(s, led, 'gravran', undefined, q.namn, p); // de andra i sällskapet såg det
  count(s, 'grav tog');
  return { namn, hur: 'klart', fick, text: `Bröt upp högen vid ${q.namn} och tog gravgåvorna.` };
};
