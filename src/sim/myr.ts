// Myren (steg 12.1.1, Landskapet och järnet: Myrar). Myren är blöt mark i låglandet nära vattnet. Inget går att bygga där
// (underMinnet i sjo.ts frågar paMyr), den är långsam att gå på (markFart i vag.ts), och när marken är blöt efter regn står
// den under vatten och är ännu långsammare. Inga träd växer på myren (startForest och growGround i mark.ts). Myrarna ligger
// glest: hälften av byarna har ingen, de andra en eller två, var och en en rund fläck med slingrig kant på 25 till 65 rutor, lagd
// på den lägsta av några platser en bit från byplatsen (närmast vattnet). En by på en världsruta med myr (VARLDMARK) har alltid
// myr. Myren ligger aldrig nära byplatsen, där elden och det första lagret står. Myren är ett eget lager ovanpå kartan: rutan är jord som förut, så en karta utan myr är som den alltid varit
import { balans } from './balans';
import { fbm, getMap, hash, perKarta, vnoise } from './karta';
import { H, OX, OY, State, T, W, inMap, markNu } from './typer';
import type { MarkId } from './varldmark';
import type { Ground } from './vag';

export const MYR = balans('myr', {
  ingen: 0.5, // så stor del av byarna har ingen myr ...
  tva: 0.85, // ... och under detta i slumpen har byn en myr, över det två
  narmast: 12, langst: 45, // en myr ligger så här många rutor från byplatsen (där elden och det första lagret står)
  forsok: 12, // så många platser prövas för varje myr, och den lägsta (närmast vattnet i kartans höjd) vinner
  radie: 3, radieSpann: 1.5, // myrens radie i rutor: radie till radie + radieSpann (ungefär 25 till 65 rutor)
  kant: 0.5, // så mycket kanten slingrar sig (del av radien)
  fartTorr: 0.85, // myren går man så här fort på ...
  fartVatten: 0.75, // ... och när den står under vatten så här (marken bromsar som mest till 0,75, steg 6.2.7)
  vattenFukt: 0.6, // över så här mycket fukt i marken (VaderMinne.fukt, vader.ts) står myren under vatten
  malmAndel: 0.2, // så stor del av myrens rutor har malm (steg 12.1.2, malm.ts) ...
  malmFull: 4, // ... och så mycket malm har en full ruta
});
// torvens tal (steg 12.1.3, torv.ts). De står här, i myrens fil, så att eldens bränsle (eld.ts) kan läsa dem utan att ladda resten
export const TORV = balans('torv', {
  perTur: 8, // så mycket torv en tur ger (två fulla händer) ...
  min: 8, // ... på så här många minuter (en tur att samla, efter arbetstiderna)
  varde: 0.5, // en torv värmer som så här mycket ved
  torkGanger: 3, // blöt torv torkar så här många gånger långsammare än blöt ved (BLOTVED.torkTim: 72 timmar ute, 36 under tak)
  vedFall: 0.7, // bränsle (i ved) per minut när man fäller och hugger ett träd nära byn, med vägen (en stam ger 6 ved och 5 grenar)
  vedGrenar: 0.3, // ... och när man samlar grenar, för den som inte har ett träd att fälla
});
// en by på en världsruta med myr (VARLDMARK) har alltid myr, och fler
const MYRAR_MARK: Partial<Record<MarkId, number>> = { myr: 2 };

// myren på kartan: 1 = myr, 0 = inte, undefined = ingen myr alls. Räknas en gång per karta, bara ur fröet som kartan. Platserna
// räknas från den gamla kartans hörn (OX, OY), så att myren ligger kvar när kartan växer
export const myrOf = perKarta(seed => {
  const m = getMap(seed), h0 = hash(seed, 71, 1), extra = MYRAR_MARK[markNu() as MarkId] ?? 0;
  const antal = (h0 < MYR.ingen ? 0 : h0 < MYR.tva ? 1 : 2) + extra;
  if (!antal) return undefined;
  const a = new Uint8Array(W * H), fx = m.fire.x - OX, fy = m.fire.y - OY;
  const jord = (x: number, y: number) => inMap(x, y) && (m.tiles[y * W + x] === T.Gras || m.tiles[y * W + x] === T.Skog);
  let n = 0;
  for (let k = 0; k < antal; k++) {
    let bast: { x: number; y: number } | undefined, bh = Infinity;
    for (let j = 0; j < MYR.forsok; j++) {
      const v = hash(seed, 72 + k, j) * Math.PI * 2, d = MYR.narmast + hash(seed, 73 + k, j) * (MYR.langst - MYR.narmast);
      const gx = Math.round(fx + Math.cos(v) * d), gy = Math.round(fy + Math.sin(v) * d), x = gx + OX, y = gy + OY;
      if (!jord(x, y)) continue;
      const hh = fbm(seed, gx, gy);
      if (hh < bh) { bh = hh; bast = { x, y }; }
    }
    if (!bast) continue;
    const r = MYR.radie + hash(seed, 74 + k, 0) * MYR.radieSpann, R = Math.ceil(r * (1 + MYR.kant));
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const x = bast.x + dx, y = bast.y + dy;
      if (!jord(x, y) || a[y * W + x]) continue;
      if (Math.hypot(x - m.fire.x, y - m.fire.y) < MYR.narmast - R) continue;
      const kant = r * (1 - MYR.kant / 2 + MYR.kant * vnoise(seed + 61 + k, (x - OX) / 2.5, (y - OY) / 2.5));
      if (Math.hypot(dx, dy) <= kant) { a[y * W + x] = 1; n++; }
    }
  }
  return n ? a : undefined;
});
// malmen i en orörd ruta (lagret malm i FYND, steg 12.1.2): fläckar på myren, var femte ruta ungefär, räknat ur fröet
export const myrMalm = (s: State, i: number) => myrOf(s.seed)?.[i] === 1 && hash(s.seed + 81, i % W - OX, Math.floor(i / W) - OY) < MYR.malmAndel ? MYR.malmFull : 0;
export const harMyr = (s: State) => !!myrOf(s.seed);
export const paMyr = (s: State, i: number) => myrOf(s.seed)?.[i] === 1;
// står myren under vatten nu: marken är blöt efter regnet (fukten räknas varje timme i vader.ts)
export const myrUnderVatten = (s: State) => harMyr(s) && (s.vader?.fukt ?? 0) >= MYR.vattenFukt;
// gångfarten på en myrruta (markFart i vag.ts): torr myr eller myr under vatten
export const myrFart = (g: Ground) => g.myrVatten ? MYR.fartVatten : MYR.fartTorr;
// en rad i TAKTER (steg.ts), varje timme: marken får veta om myren står under vatten, så att gången och vägsökningen vet det
export function myrSteg(s: State, g: Ground) {
  const a = myrOf(s.seed);
  if (!a) { g.myr = undefined; g.myrVatten = undefined; return; }
  g.myr = a;
  if (myrUnderVatten(s)) g.myrVatten = true; else delete g.myrVatten;
}
