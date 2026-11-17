// ---------- platserna läggs ut i världen (steg 11.2.13–11.2.14, Flera samhällen: Världen i tal: landmärkena) ----------
// Byarna placeras när världen skapas: en byplats ligger på mark som byns rad i LANDMARKEN tillåter (slätt eller skog), högst
// BYPLATS.vattenAvst rutor från sötvatten (sjö, myr eller flod) och inte på en annan bys karta (en världsruta är en bykarta).
// Varje lämplig ruta blir en by med chansen BYPLATS.byTathet, räknad ur världens frö med en hash, så att ingen regel säger hur
// nära en granne ligger eller hur många byar en ö får: en by kan ha tur eller otur med sina grannar. Huvudbyn läggs sist på en
// ledig lämplig ruta med samma regler, också den vald med en hash.
// De övriga platserna (steg 11.2.14) läggs ut efter sina rader i LANDMARKEN: varje landruta får en plats av sorten med chansen
// i radens täthet, om marken passar och ingen annan plats ligger för nära (avståndet i raden).
import { balans } from './balans';
import { hash3 } from './slump';
import { LANDMARK_IDS, LANDMARKEN, LandmarkDef, hinder, laggPlats, VarldPlats } from './landmarken';
import { huvudRad } from './radtal';
import { State } from './typer';
import { MARK_IDS, VARLDMARK, VarldMark } from './varldmark';
import { Varlden, varldMark } from './varlden';

export const BYPLATS = balans('byplats', {
  byTathet: 0.03, // chansen att en lämplig ruta blir en by
  vattenAvst: 2, // en by ligger högst så många världsrutor från sötvatten
});

// sötvatten på rutan: en sjö, en myr eller en flod (inte havet)
const sotvatten = (v: VarldMark, i: number) => v.flod[i] > 0 || (VARLDMARK[MARK_IDS[v.mark[i]]].vatten && MARK_IDS[v.mark[i]] !== 'hav');
// rutorna där en by får ligga när marken och vattnet räknas (avståndet till andra platser prövar laggPlats)
export function byRutor(v: VarldMark): number[] {
  const r = BYPLATS.vattenAvst, ut: number[] = [];
  for (let y = 0; y < v.h; y++) for (let x = 0; x < v.w; x++) {
    const i = y * v.w + x, m = MARK_IDS[v.mark[i]];
    if (m !== 'slatt' && m !== 'skog') continue;
    let nara = false;
    for (let dy = -r; dy <= r && !nara; dy++) for (let dx = -r; dx <= r && !nara; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < v.w && yy < v.h && sotvatten(v, yy * v.w + xx)) nara = true;
    }
    if (nara) ut.push(i);
  }
  return ut;
}
// byarna i en ny värld
export function laggByar(vl: Varlden, v: VarldMark) {
  for (const i of byRutor(v)) if (hash3(vl.fro, i, 0x42594152) < BYPLATS.byTathet) laggPlats(vl, v, 'by', i % v.w, Math.floor(i / v.w), 0);
}
// huvudbyn på en ledig byplats, vald med en hash ur världens frö; den hör till huvudbyns rad
export function laggHuvudby(s: State): VarldPlats | undefined {
  const vl = s.varld, v = varldMark(s), r = huvudRad(s);
  if (!vl || !v || !r) return undefined;
  const fanns = vl.platser?.find(p => p.by === r.nr);
  if (fanns) return fanns;
  const lediga = byRutor(v).filter(i => !hinder(vl, v, 'by', i % v.w, Math.floor(i / v.w)));
  if (!lediga.length) return undefined;
  const i = lediga[Math.floor(hash3(vl.fro, 0x48554644, 1) * lediga.length)]!;
  const p = laggPlats(vl, v, 'by', i % v.w, Math.floor(i / v.w), s.founded, { by: r.nr, namn: r.namn });
  if (p) { r.x = p.x; r.y = p.y; }
  return p;
}
// de övriga platserna i en ny värld: heliga platser, gravhögar, runstenar, fyndplatser och rastplatser (de rader i LANDMARKEN
// som har en täthet), efter byarna
export function laggOvriga(vl: Varlden, v: VarldMark) {
  const sorter = LANDMARK_IDS.filter(k => (LANDMARKEN[k] as LandmarkDef).tathet);
  for (let i = 0; i < v.w * v.h; i++) {
    if (!VARLDMARK[MARK_IDS[v.mark[i]]].land) continue;
    for (const [n, k] of sorter.entries()) if (hash3(vl.fro, i, 0x504c4100 + n) < (LANDMARKEN[k] as LandmarkDef).tathet!) laggPlats(vl, v, k, i % v.w, Math.floor(i / v.w), 0);
  }
}
