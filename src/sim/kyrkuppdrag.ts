// ---------- kyrkan utlyser (steg 11.13.29, Flera samhällen: Uppdragen i tal, och Religion) ----------
// En rad i kyrkans utgifter (KYRKUTGIFTER): när en by i världen med samma tro har svultit nyligen (VarldRad.svalt inom
// KYRKUPPDRAG.nodDygn dygn), och någon troende i huvudbyn känner till byn, kan kyrkan lägga undan KYRKUPPDRAG.belon hela saker
// av det den har mest av och utlysa hjälpen dit (UPPDRAG.hjalp, utlysaren kyrka). Vikten kommer ur skalan Öppen (en tro som
// ger åt andra) och ur hur stor del av byn som har tron. Det tas upp i trons krets som andra utgifter. Den som talar för tron
// vet om uppdraget och berättar det; tar tiden slut går belöningen tillbaka till kyrkans förråd
import { balans } from './balans';
import { count } from './folk';
import { kyrkansAv, kyrkansForrad, kyrkanTar, KYRKUTGIFTER, trosTalare } from './kyrka';
import { byPlats } from './landmarken';
import { findL } from './minne';
import { lever } from './rad';
import { BYSORTER, VarldRad } from './radtal';
import { skalaV, troende, troNamn, type Tro } from './religion';
import { belonVarde, larUppdrag, utlys } from './uppdrag';
import { DAY, State } from './typer';

export const KYRKUPPDRAG = balans('kyrkuppdrag', {
  nodDygn: 3, // en by som svultit för högst så många dygn (år i spelet) sedan behöver hjälp
  belon: 4, // så många hela saker lägger kyrkan undan
  andel: 30, // byn räknas som trosfränder när minst så stor andel (procent) har tron
});
// byarna med samma tro som svultit nyligen och som någon troende känner till, närmast först efter nöden
export function trosfrander(s: State, tr: Tro): VarldRad[] {
  const vl = s.varld;
  if (!vl) return [];
  const namn = troNamn(tr), folk = troende(s, tr);
  return (vl.rader ?? []).filter(r => r.nr !== vl.huvud && lever(vl, r) && BYSORTER[r.sort].folk && r.tro?.namn === namn && (r.tro.andel ?? 0) >= KYRKUPPDRAG.andel
    && r.svalt !== undefined && s.now - r.svalt <= KYRKUPPDRAG.nodDygn * DAY
    && !(vl.uppdrag ?? []).some(u => u.av.tro === tr.id && u.mal === byPlats(vl, r.nr)?.nr)
    && folk.some(p => { const q = byPlats(vl, r.nr); return !!q && !!findL(p, 'ort', q.nr); }))
    .sort((a, b) => b.svalt! - a.svalt! || a.nr - b.nr);
}
// det kyrkan har mest av, när den har minst KYRKUPPDRAG.belon hela
function belonSak(s: State, tr: Tro) {
  let bast: string | undefined, n = KYRKUPPDRAG.belon - 1;
  for (const k of Object.keys(kyrkansForrad(s, tr)).sort()) { const m = kyrkansAv(s, tr, k); if (m > n) { n = m; bast = k; } }
  return bast;
}
KYRKUTGIFTER.uppdrag = {
  namn: 'utlysa hjälp åt en by med samma tro',
  vikt: (s, tr) => {
    const v = skalaV(tr, 'oppen') ?? 50;
    return v < 50 && belonSak(s, tr) && trosfrander(s, tr).length ? (50 - v) / 50 + 0.1 : 0;
  },
  gor: (s, tr) => {
    const vl = s.varld, r = trosfrander(s, tr)[0], k = belonSak(s, tr), q = vl && r && byPlats(vl, r.nr);
    if (!vl || !r || !k || !q || !kyrkanTar(s, tr, k, KYRKUPPDRAG.belon)) return;
    const u = utlys(vl, 'hjalp', q.nr, { k: 'kyrka', tro: tr.id }, { [k]: KYRKUPPDRAG.belon }, s.now);
    if (!u) return;
    count(s, 'kyrka_utlyste');
    const p = trosTalare(s, tr);
    if (p) larUppdrag(s, p, u.id, 1, { t: s.now, v: belonVarde(u), mal: q.nr, k: 'hjalp' });
  },
};
