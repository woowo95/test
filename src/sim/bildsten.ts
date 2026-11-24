// Bildstenens motiv (steg 13.9.15, Kultur, sport och konst: Bildstenens motiv, i fliken Samhället).
// Lusten att resa en bildsten kommer ur alla stora händelser personen varit med om eller minns, inte bara ur den egna bedriften:
// en strid, något heligt, en vunnen tävling eller ett framträdande, en lång resa eller ett uppdrag, en uppfinning och byns egna
// händelser. Varje sorts händelse är en rad i registret BILDMOTIV med sin vikt och de händelser (HANDELSER i rykten.ts) och
// upplevelser (UPPLEVELSER i uppvaxt.ts) som hör till den. Lusten minskar för varje bildsten byn redan har om samma sorts händelse,
// så att stenarna blandas av sig själva. En ny stor händelse får sin rad här (påfyllningen efter varje fas)
import { DAY, type Person, type State } from './typer';
import { SKRIFT } from './skriftTal';
import { stat } from './folk';
import { HANDELSER, bevisText, type Bevis, type HandelseTyp } from './rykten';
import { UPPLEVELSER, type UpplevelseTyp } from './uppvaxt';
import { gudarOf, troOf } from './religion';

export interface BildMotiv {
  namn: string;
  vikt: number; // hur gärna en sådan händelse blir en bildsten (en strid mer än en uppfinning)
  h?: readonly HandelseTyp[]; // händelserna i ryktena: den egna bedriften och det man minns om andra
  upp?: readonly UpplevelseTyp[]; // upplevelserna personen själv varit med om
  gud?: true; // trons gudar: den troende minns när guden visade sig, och grundaren mest
}
export const BILDMOTIV = {
  strid: { namn: 'En strid', vikt: 1, h: ['forsvarade', 'vargdodare', 'bjorndodare', 'vannSlagsmal'], upp: ['fallde', 'rovareBort'] },
  helig: { namn: 'Något heligt', vikt: 0.9, upp: ['bonHjalpte', 'tecken'], gud: true },
  tavling: { namn: 'En tävling eller ett framträdande', vikt: 0.6, h: ['tavling', 'scenBra', 'turne', 'masterverk', 'perfekt'] },
  resa: { namn: 'En resa', vikt: 0.8, h: ['reste', 'uppdrag'], upp: ['flyttade'] },
  uppfinning: { namn: 'En uppfinning', vikt: 0.3, h: ['pahittig'], upp: ['egenTeknik', 'uppfinning'] },
  byn: { namn: 'Byns händelser', vikt: 0.7, h: ['slackte', 'forutseende'], upp: ['hardVinter', 'svalt', 'brand', 'oversvamning', 'tornado'] },
} satisfies Record<string, BildMotiv>;
export type BildMotivId = keyof typeof BILDMOTIV;
const MOTIV = BILDMOTIV as Record<BildMotivId, BildMotiv>;
const MOTIV_AV_H = new Map<string, BildMotivId>(), MOTIV_AV_UPP = new Map<string, BildMotivId>();
for (const id of Object.keys(MOTIV) as BildMotivId[]) { for (const h of MOTIV[id].h ?? []) MOTIV_AV_H.set(h, id); for (const u of MOTIV[id].upp ?? []) MOTIV_AV_UPP.set(u, id); }
export const motivAvHandelse = (h: string) => MOTIV_AV_H.get(h);

// en händelse som kan bli en bildsten: motivet, när, vem stenen är om, beviset (en händelse i ryktena) och vad som hände i ord
export interface BildHandelse { w: number; motiv: BildMotivId; t: number; om: { id: number; namn: string }; bev?: Bevis; vad: string }
const forsta = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
// lusten efter händelsen (bara de händelser som har ett motiv): vikten, motivets vikt och hur länge sedan (avtar till noll på stolthetDygn), gånger hur mycket man bryr sig
function lust(s: State, vikt: number, motiv: BildMotivId, t: number, ggr: number) {
  const kvar = 1 - (s.now - t) / (SKRIFT.stolthetDygn * DAY);
  return kvar > 0 ? SKRIFT.stolthet * vikt * MOTIV[motiv].vikt * kvar * ggr : 0;
}
// alla händelser p har lust att resa en bildsten om, med lusten; finns = det finns redan en sten om händelsen
export function bildHandelser(s: State, p: Person, finns: (om: number, t: number, motiv: BildMotivId) => boolean): BildHandelse[] {
  const ut: BildHandelse[] = [], egen = SKRIFT.egenBas + Math.max(0, SKRIFT.egenEmpati - stat(p, 'empati', s.now)) / SKRIFT.egenEmpati;
  const lagg = (w: number, motiv: BildMotivId, t: number, om: { id: number; namn: string }, vad: string, bev?: Bevis) => { if (w > 0 && !finns(om.id, t, motiv)) ut.push({ w, motiv, t, om, vad, ...(bev ? { bev } : {}) }); };
  // den egna bedriften
  const b = p.bedrift, mb = b && motivAvHandelse(b.h);
  if (b && mb) lagg(lust(s, HANDELSER[b.h].vikt, mb, b.t, egen), mb, b.t, { id: p.id, namn: p.name }, bevisText(b, p.name).trim().replace(/\.$/, ''), { ...b, sett: undefined });
  // det man minns om andra: bedrifterna i intrycken, gånger säkerheten
  for (const i of p.intryck ?? []) for (const e of i.bev ?? []) {
    const m = motivAvHandelse(e.h);
    if (m && !e.falsk && HANDELSER[e.h].prestation) lagg(lust(s, HANDELSER[e.h].vikt, m, e.t, SKRIFT.andras * Math.min(1, i.c)), m, e.t, { id: i.om, namn: i.namn }, bevisText(e, i.namn).trim().replace(/\.$/, ''), { ...e, sett: undefined });
  }
  // det man själv varit med om
  for (const u of p.upp ?? []) {
    const m = MOTIV_AV_UPP.get(u.k);
    if (m && u.t !== undefined) lagg(lust(s, SKRIFT.uppVikt, m, u.t, egen), m, u.t, { id: p.id, namn: p.name }, `${p.name} ${forsta(UPPLEVELSER[u.k].text.replace(/,? ?\{om\}/, u.om ? ` ${u.om}` : ''))}`);
  }
  // trons gudar: när guden visade sig, för grundaren som sin egen händelse
  const tr = troOf(s, p.tro);
  if (tr) for (const g of gudarOf(tr)) lagg(lust(s, SKRIFT.uppVikt, 'helig', g.t, tr.grundare === p.id ? egen : SKRIFT.andras), 'helig', g.t, { id: p.id, namn: p.name }, `${g.namn} visade sig för de troende`);
  return ut;
}
// hur många bildstenar byn har om motivet
export const stenMotiv = (r: { motiv?: BildMotivId; bev?: Bevis[] }) => r.motiv ?? (r.bev?.[0] ? motivAvHandelse(r.bev[0].h) : undefined); // äldre stenar: ur beviset
export const bildstenarOm = (s: State, motiv: BildMotivId) => (s.runstenar ?? []).filter(r => r.bild && stenMotiv(r) === motiv).length;
