// ---------- förhistorien (steg 11.3.13, Flera samhällen: Förhistorien) ----------
// När en värld skapas läggs urbyar ut på en del av byplatserna (FORHIST.urbyar), med ett litet folk, och radens regler körs i
// världens perioder (varldslag.ts) från världens början, FORHIST.ar år (dygn) före huvudbyns grundande, fram till grundandet.
// Byar växer, delas och går under, ledare byts, tekniker kommer och glöms och tron sprids, med samma regler som efter
// grundandet; byar, ruiner och världens krönika är verkliga följder av dem. Byplatserna som ingen urby fick tas bort, så att
// marken är fri för de byar som grundas under förhistorien. Förhistorien räknas en gång, när världen skapas, och sparas med
// världen. Huvudbyn läggs sedan på en ledig plats (placering.ts) och får sin förbindelse med de byar i grannätet som lever
// (nyaGrannbyar i grannbyar.ts). En sparad by från före v531 får sin värld utan förhistoria.
import { balans } from './balans';
import { BYSORTER, radKrok, VarldRad } from './radtal';
import { hash3 } from './slump';
import { varldTill } from './varldslag';
import { varldHandelse } from './varldkronika';
import { Varlden } from './varlden';
import { VarldMark } from './varldmark';
import { laggGrannat } from './grannat';
import { DAY, State } from './typer';

export const FORHIST = balans('forhist', {
  ar: 400, // världens ålder när huvudbyn grundas, i år i spelet (dygn); datortiden mäts för 100, 200 och 400 år
  urbyar: 0.5, // så stor del av byplatserna får en urby när världen börjar
  folkMin: 4, folkMax: 10, // en urby har så många (hela personer)
});

// förhistorien i en ny värld, efter byplatserna och de andra platserna och före huvudbyn
export function forhistoria(s: State, vl: Varlden, v: VarldMark) {
  const borjan = vl.borjan = s.founded - Math.round(FORHIST.ar * DAY);
  const byar = (vl.platser ?? []).filter(p => p.k === 'by' && p.by === undefined);
  const ur = byar.filter(p => hash3(vl.fro, p.nr, 0x55524259) < FORHIST.urbyar);
  vl.platser = (vl.platser ?? []).filter(p => p.k !== 'by' || p.by !== undefined || ur.includes(p));
  vl.rader ??= [];
  for (const p of ur) {
    const folk = FORHIST.folkMin + Math.floor(hash3(vl.fro, p.nr, 0x464f4c4b) * (FORHIST.folkMax - FORHIST.folkMin + 1));
    const r: VarldRad = { nr: vl.nastaRad = (vl.nastaRad ?? 0) + 1, sort: 'by', namn: p.namn, x: p.x, y: p.y, grundad: borjan, t: borjan, tal: { folk, mat: radKrok.startMat(folk), rikedom: 0, silver: 0, styrka: 0 }, tek: [], fasta: [] };
    vl.rader.push(r);
    p.by = r.nr; p.fran = borjan;
    varldHandelse(vl, 'grundad', borjan, { by: r.nr });
  }
  laggGrannat(vl, v, borjan);
  varldTill(s, s.founded);
  for (const r of vl.rader) if (BYSORTER[r.sort].folk) r.t = s.founded;
}
