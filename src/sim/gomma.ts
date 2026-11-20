// ---------- gömmorna längs leden (steg 12.1.9, Flera samhällen: Farten i tal) ----------
// Det ett sällskap släpper för att komma undan (utvägen släppa utrustning, UTVAGAR.slappa i resa.ts) läggs i en gömma: en plats i
// världen (LANDMARKEN.gomma, hemlig och tillfällig) med det släppta som innehåll i hela saker, som ligger kvar RESA.gommaDygn dygn.
// Resenärerna har varit där och minns gömman som ett fynd (fyndId för platsen, sorten gomma) med värdet av det som ligger i den.
// Fyndet berättas och väger som mål för en resa som andra fynd (RESMAL.uppdrag), och den som kommer dit tar det som ryms i
// packningen; resten ligger kvar. Den som finner gömman tom minns det. När tiden gått upphör platsen, och det som låg där är borta
import { count } from './folk';
import { laggPlats, varldPlatsNr, type VarldPlats } from './landmarken';
import { larOrt, O_BESOKT } from './ort';
import { barDjurAlla, barResenar, FYNDSETT, GOMMAKROK, packVikt, RESA, resenarer, UPPDRAGFRAM, type Sallskap } from './resa';
import { viktOf } from './saker';
import { fyndId, larUppdrag } from './uppdrag';
import { grundvarde } from './varde';
import { varldMark } from './varlden';
import { DAY, Person, State } from './typer';

const gommaAt = (s: State, nr: number) => { const vl = s.varld, p = vl && varldPlatsNr(vl, nr); return p?.k === 'gomma' ? p : undefined; };
export const gommaVarde = (p: VarldPlats) => Object.entries(p.inne ?? {}).reduce((a, [k, n]) => a + n * grundvarde(k), 0);

// sällskapet sl gömmer saker vid sin ruta vid tiden t: platsen läggs på rutan eller den närmaste lediga rutan intill (en gömma får
// inte ligga på en annan plats); finns ingen ledig ruta ligger sakerna kvar utan gömma och är borta
export function laggGomma(s: State, sl: Sallskap, saker: Record<string, number>, t: number): VarldPlats | undefined {
  const vl = s.varld, v = varldMark(s);
  if (!vl || !v || sl.ruta === undefined) return undefined;
  const x0 = sl.ruta % v.w, y0 = Math.floor(sl.ruta / v.w);
  let p: VarldPlats | undefined;
  for (let r = 0; r <= 2 && !p; r++) for (let dy = -r; dy <= r && !p; dy++) for (let dx = -r; dx <= r && !p; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = x0 + dx, y = y0 + dy;
    if (x < 0 || y < 0 || x >= v.w || y >= v.h) continue;
    p = laggPlats(vl, v, 'gomma', x, y, t, { till: t + RESA.gommaDygn * DAY, by: sl.by });
  }
  if (!p) return undefined;
  p.inne = {};
  for (const [k, n] of Object.entries(saker)) if (Math.floor(n) >= 1) p.inne[k] = Math.floor(n);
  for (const q of resenarer(s, sl)) { larOrt(s, q, p.nr, O_BESOKT, 1, { t }); saGomma(s, q, p.nr, t); } // de som gömde det minns var
  count(s, 'resa gömma');
  return p;
}

// q har sett gömman och minns det som ligger där (värdet 0 när den är tom)
export function saGomma(s: State, q: Person, nr: number, t: number) {
  const p = gommaAt(s, nr);
  if (!p) return;
  const v = Math.round(gommaVarde(p)), l = larUppdrag(s, q, fyndId(nr), 1, { t, v, mal: nr, k: 'gomma' });
  l.v = v; l.t = t; l.c = 1; l.src = undefined; l.led = 0;
}
FYNDSETT.gomma = saGomma;
GOMMAKROK.lagg = laggGomma;

// sällskapet som kommer till gömman tar det som ryms i packningen, det mest värda per vikt först; resten ligger kvar
UPPDRAGFRAM.gomma = (s, sl) => {
  const p = gommaAt(s, sl.mal);
  if (!p) return undefined;
  const namn = 'Gömman', fick: Record<string, number> = {}, inne = p.inne ?? {};
  let plats = resenarer(s, sl).reduce((a, q) => a + barResenar(s, q), 0) + barDjurAlla(s, sl) - packVikt(sl);
  for (const k of Object.keys(inne).sort((a, b) => grundvarde(b) / Math.max(0.1, viktOf(b)) - grundvarde(a) / Math.max(0.1, viktOf(a)))) {
    const n = Math.min(inne[k]!, Math.floor(Math.max(0, plats) / Math.max(1e-9, viktOf(k))));
    if (n < 1) continue;
    fick[k] = n; inne[k]! -= n; plats -= n * viktOf(k);
    if (inne[k]! <= 0) delete inne[k];
  }
  if (!Object.keys(fick).length) return { namn, hur: 'tomt', fick, text: `Gömman vid ${p.namn} var tom, eller lasten fick inte plats.` };
  count(s, 'gömma hämtad');
  return { namn, hur: 'klart', fick, text: `Hämtade det som låg i gömman vid ${p.namn}${Object.keys(inne).length ? '; resten fick ligga kvar' : ''}.` };
};
