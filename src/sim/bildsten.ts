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
import { GUD_OMR, formNamn, gudarOf, troOf, type Gud } from './religion';
import { valjVariant, fyll, type Fyllning, type MallId } from './berattelser';
import { byId } from './folk';
import { kalender } from './tid';
import { hash3 } from './slump';

export interface BildMotiv {
  namn: string;
  vikt: number; // hur gärna en sådan händelse blir en bildsten (en strid mer än en uppfinning)
  h?: readonly HandelseTyp[]; // händelserna i ryktena: den egna bedriften och det man minns om andra
  upp?: readonly UpplevelseTyp[]; // upplevelserna personen själv varit med om
  gud?: true; // trons gudar: den troende minns när guden visade sig, och grundaren mest
  ting: Record<string, string>; // det som hände i bild, per händelse eller upplevelse (steg 13.9.16) ...
  ting0: string; // ... annars detta
  fig?: string; // den som avbildas, när det inte är personen stenen är om
  vad?: Record<string, string>; // vad som hände i ord, för en upplevelse vars text inte går att sätta efter namnet ({namn}, {om})
}
export const BILDMOTIV = {
  strid: { namn: 'En strid', vikt: 1, h: ['forsvarade', 'vargdodare', 'bjorndodare', 'vannSlagsmal'], upp: ['fallde', 'rovareBort'],
    ting: { forsvarade: 'rövare med yxor', vargdodare: 'en varg', bjorndodare: 'en stor björn', fallde: 'en varg', rovareBort: 'rövare som flyr' }, ting0: 'en fiende' },
  helig: { namn: 'Något heligt', vikt: 0.9, upp: ['bonHjalpte', 'tecken'], gud: true, vad: { bonHjalpte: '{namn}s bön i nöd fick svar', tecken: '{namn} var med om något ingen kunde förklara' }, ting: { tecken: 'ett tecken på himlen' }, ting0: 'den heliga platsen' },
  tavling: { namn: 'En tävling eller ett framträdande', vikt: 0.6, h: ['tavling', 'scenBra', 'turne', 'masterverk', 'perfekt'],
    ting: { tavling: 'segerns pris', scenBra: 'en lyra', turne: 'en lyra' }, ting0: 'sitt verk' },
  resa: { namn: 'En resa', vikt: 0.8, h: ['reste', 'uppdrag'], upp: ['flyttade'], ting: { uppdrag: 'en gammal ruin', flyttade: 'en ny by' }, ting0: 'en främmande by' },
  uppfinning: { namn: 'En uppfinning', vikt: 0.3, h: ['pahittig'], upp: ['egenTeknik', 'uppfinning'], ting: {}, ting0: 'något nytt' },
  byn: { namn: 'Byns händelser', vikt: 0.7, h: ['slackte', 'forutseende'], upp: ['hardVinter', 'svalt', 'brand', 'oversvamning', 'tornado'], fig: 'folket i byn',
    ting: { slackte: 'lågor över taken', forutseende: 'fulla förråd', hardVinter: 'snö som ligger djup över husen', svalt: 'tomma förråd', brand: 'lågor över taken', oversvamning: 'vatten som stiger', tornado: 'en virvelvind' }, ting0: 'byns hus' },
} satisfies Record<string, BildMotiv>;
export type BildMotivId = keyof typeof BILDMOTIV;
const MOTIV = BILDMOTIV as Record<BildMotivId, BildMotiv>;
const MOTIV_AV_H = new Map<string, BildMotivId>(), MOTIV_AV_UPP = new Map<string, BildMotivId>();
for (const id of Object.keys(MOTIV) as BildMotivId[]) { for (const h of MOTIV[id].h ?? []) MOTIV_AV_H.set(h, id); for (const u of MOTIV[id].upp ?? []) MOTIV_AV_UPP.set(u, id); }
export const motivAvHandelse = (h: string) => MOTIV_AV_H.get(h);

// en händelse som kan bli en bildsten: motivet, när, vem stenen är om, beviset (en händelse i ryktena) och vad som hände i ord
// k = händelsen eller upplevelsen (eller 'gud'), ting = det som hände i bild när det inte står i raden (guden, saken)
export interface BildHandelse { w: number; motiv: BildMotivId; k: string; t: number; om: { id: number; namn: string }; bev?: Bevis; vad: string; ting?: string }
const forsta = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
// lusten efter händelsen (bara de händelser som har ett motiv): vikten, motivets vikt och hur länge sedan (avtar till noll på stolthetDygn), gånger hur mycket man bryr sig
function lust(s: State, vikt: number, motiv: BildMotivId, t: number, ggr: number) {
  const kvar = 1 - (s.now - t) / (SKRIFT.stolthetDygn * DAY);
  return kvar > 0 ? SKRIFT.stolthet * vikt * MOTIV[motiv].vikt * kvar * ggr : 0;
}
// alla händelser p har lust att resa en bildsten om, med lusten; finns = det finns redan en sten om händelsen
export function bildHandelser(s: State, p: Person, finns: (om: number, t: number, motiv: BildMotivId) => boolean): BildHandelse[] {
  const ut: BildHandelse[] = [], egen = SKRIFT.egenBas + Math.max(0, SKRIFT.egenEmpati - stat(p, 'empati', s.now)) / SKRIFT.egenEmpati;
  const lagg = (w: number, motiv: BildMotivId, k: string, t: number, om: { id: number; namn: string }, vad: string, bev?: Bevis, ting?: string) => { if (w > 0 && !finns(om.id, t, motiv)) ut.push({ w, motiv, k, t, om, vad, ...(bev ? { bev } : {}), ...(ting ? { ting } : {}) }); };
  // den egna bedriften
  const b = p.bedrift, mb = b && motivAvHandelse(b.h);
  if (b && mb) lagg(lust(s, HANDELSER[b.h].vikt, mb, b.t, egen), mb, b.h, b.t, { id: p.id, namn: p.name }, bevisText(b, p.name).trim().replace(/\.$/, ''), { ...b, sett: undefined });
  // det man minns om andra: bedrifterna i intrycken, gånger säkerheten
  for (const i of p.intryck ?? []) for (const e of i.bev ?? []) {
    const m = motivAvHandelse(e.h);
    if (m && !e.falsk && HANDELSER[e.h].prestation) lagg(lust(s, HANDELSER[e.h].vikt, m, e.t, SKRIFT.andras * Math.min(1, i.c)), m, e.h, e.t, { id: i.om, namn: i.namn }, bevisText(e, i.namn).trim().replace(/\.$/, ''), { ...e, sett: undefined });
  }
  // det man själv varit med om
  for (const u of p.upp ?? []) {
    const m = MOTIV_AV_UPP.get(u.k);
    const egenText = MOTIV[m!]?.vad?.[u.k];
    if (m && u.t !== undefined) lagg(lust(s, SKRIFT.uppVikt, m, u.t, egen), m, u.k, u.t, { id: p.id, namn: p.name }, egenText ? fyll(egenText, { namn: p.name, om: u.om }) : `${p.name} ${forsta(UPPLEVELSER[u.k].text.replace(/\{om\}/, u.om ?? '').replace(/,? *$/, ''))}`);
  }
  // trons gudar: när guden visade sig, för grundaren som sin egen händelse
  const tr = troOf(s, p.tro);
  if (tr) for (const g of gudarOf(tr)) lagg(lust(s, SKRIFT.uppVikt, 'helig', g.t, tr.grundare === p.id ? egen : SKRIFT.andras), 'helig', 'gud', g.t, { id: p.id, namn: p.name }, `${g.namn} visade sig för de troende`, undefined, `${formNamn(g.form, true).toLowerCase()} ${g.namn}${g.i ? ` som ${g.i}` : ''}`);
  return ut;
}
// hur många bildstenar byn har om motivet
export const stenMotiv = (r: { motiv?: BildMotivId; bev?: Bevis[] }) => r.motiv ?? (r.bev?.[0] ? motivAvHandelse(r.bev[0].h) : undefined); // äldre stenar: ur beviset
export const bildstenarOm = (s: State, motiv: BildMotivId) => (s.runstenar ?? []).filter(r => r.bild && stenMotiv(r) === motiv).length;

// ---------- bildens text (steg 13.9.16) ----------
// Rutan vid ett tryck säger först vad bilderna föreställer och sedan vad de ska berätta. Bilden byggs ur radens motiv, ur det som
// hände (vem, vad och när) och ibland ett slumpat motiv (mallarna b_bild, b_extra, b_gud och b_berattar i berattelser.ts), och
// väljs när stenen reses och sparas i stenens text. Den som tror kan få sin gud med på en sten om en strid eller en resa
export const BILDSTEN = { extra: 0.35, gud: 0.4 } as const; // chansen för ett slumpat motiv och för ristarens gud
const NAR = ['en vinter', 'en vår', 'en sommar', 'en höst'];
const GUD_FOR: Partial<Record<BildMotivId, string[]>> = { strid: ['kriget', 'jakt', 'aska'], resa: ['solen', 'sjon', 'jakt'] }; // gudarna som helst följer med
export function bildText(s: State, ristare: Person, h: Pick<BildHandelse, 'motiv' | 'k' | 't' | 'om' | 'vad' | 'ting' | 'bev'>, id: number) {
  const rad = MOTIV[h.motiv], q = byId(s, h.om.id);
  const fig = rad.fig ?? (q ? (q.sex === 'k' ? 'en kvinna' : 'en man') : 'en man');
  const ting = h.ting ?? (h.motiv === 'uppfinning' || h.motiv === 'tavling' ? h.bev?.sak : undefined) ?? rad.ting[h.k] ?? rad.ting0;
  const f: Fyllning = { motiv: h.motiv, fig, ting, gud: h.k === 'gud', vad: h.vad, nar: NAR[kalender(s, h.t).ai] ?? NAR[0], ristare: ristare.name };
  const del = (m: MallId, n: number) => fyll(valjVariant(s, m, id * 8 + n, f, 0), f);
  let bild = del('b_bild', 1);
  const tr = troOf(s, ristare.tro), gudar = tr ? gudarOf(tr) : [], ff = GUD_FOR[h.motiv];
  if (ff && gudar.length && hash3(s.seed, id, 11, 0x2f6b9c1d, 5) < BILDSTEN.gud) {
    const g: Gud = gudar.find(x => x.omr.some(o => ff.includes(o))) ?? gudar[0]!;
    f.gud = `${formNamn(g.form, true).toLowerCase()} ${g.namn}`; f.omr = GUD_OMR[g.omr[0]!]?.om ?? '';
    bild += del('b_gud', 2);
  } else if (hash3(s.seed, id, 12, 0x2f6b9c1d, 5) < BILDSTEN.extra) bild += del('b_extra', 3);
  return `Stenen visar ${bild}. ${del('b_berattar', 4)}`;
}
