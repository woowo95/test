// Möblerna i hemmet (system 12.4, Arbetsstationer och möbler). Möblerna är rader i STATIONER (stationer.ts) och talen står i
// blocket STATION där; här finns det som gäller flera av dem.
// Hemmen blir finare (steg 10.2.69): en möbel med `ersatter` byts mot den enklare sorten när familjen som äger den har något
// över (hemOverskott i byggplan.ts). Bristen är det största överskottet bland ägarna till de enklare möblerna (finareBrist), platsen
// är den enklare möbelns (siteErsatt), och när bygget börjar tas den isär och den nya får dess ägare och tillbehör (ersatt).
// Sängen (steg 12.4.3) byts så mot halmbädden: den vilar mer (vila i raden, baddVila), och ett par vars sängar står intill
// varandra får tanken Sov bredvid sin käresta (bredvidKaresta)
import { HUS } from './byggnader';
import { hemOverskott } from './byggplan';
import { byId, familjOf, think } from './folk';
import { put } from './lager';
import { tileOf } from './mark';
import { HOUR, Person, State } from './typer';
import { STATION, type Station, ersattKrok, isKlar, stationDef, stationRutor, stationerOf, storlekAv, taBort } from './stationer';

// de enklare möblerna som möbeln k kan ersätta: färdiga, med en ägare vars familj har något över, p:s familj först, sedan det
// största överskottet
function ersattbara(s: State, k: string, p?: Person) {
  const e = stationDef(k)?.ersatter;
  if (!e) return [];
  const fam = p ? new Set(familjOf(s, p.id).map(q => q.id)) : undefined;
  return stationerOf(s).filter(t => t.k === e && isKlar(t) && t.ag !== undefined && !!byId(s, t.ag))
    .map(t => ({ t, over: hemOverskott(s, t.ag!), egen: fam?.has(t.ag!) ? 1 : 0 })).filter(r => r.over > 0)
    .sort((a, b) => b.egen - a.egen || b.over - a.over || a.t.id - b.t.id);
}
// hur mycket byn vill byta: det största överskottet bland ägarna (0 till 1)
export const finareBrist = (s: State, k: string) => Math.min(1, ersattbara(s, k)[0]?.over ?? 0);
// platsen: där den enklare möbeln står
export function siteErsatt(s: State, k: string, p?: Person) {
  const t = ersattbara(s, k, p)[0]?.t;
  return t ? { x: t.x, y: t.y, ...(t.rot ? { rot: 1 as const } : {}), ...(t.inne ? { inne: 1 as const } : {}) } : undefined;
}
// den enklare möbeln tas isär när bygget av den nya börjar: en del av materialet kommer tillbaka, och den nya får ägaren och tillbehören
export function ersatt(s: State, gammal: Station, ny: Station) {
  if (gammal.ag !== undefined) ny.ag = gammal.ag;
  if (gammal.med?.length) ny.med = gammal.med;
  taBort(s, gammal);
  for (const [k, n] of Object.entries(stationDef(gammal.k)!.av)) { const m = Math.floor(n * HUS.rivTillbaka); if (m > 0) put(s, k, m); }
}
// vilan och tanken i bädden där p sover, när raden har egna (sängen); annars halmbäddens
export const baddVila = (s: State, p: Person) => { const t = stationRutor(s).at.get(tileOf(p.x, p.y)); return t && stationDef(t.k)?.vila; };
// rutorna två bäddar tar står intill varandra (sida mot sida eller hörn)
const intill = (a: Station, b: Station) => { const A = storlekAv(a), B = storlekAv(b); return a.x <= b.x + B.w && b.x <= a.x + A.w && a.y <= b.y + B.h && b.y <= a.y + A.h; };
// den som sover i en säng bredvid sin käresta, som sover i sängen intill
export function bredvidKaresta(s: State, p: Person) {
  const q = p.partner !== undefined ? byId(s, p.partner) : undefined;
  if (!q || q.task?.act !== 'sova') return;
  const r = stationRutor(s), a = r.at.get(tileOf(p.x, p.y)), b = r.at.get(tileOf(q.x, q.y));
  if (!a || !b || a === b || !stationDef(a.k)?.vila || !stationDef(b.k)?.vila || !intill(a, b)) return;
  think(p, 'Sov bredvid sin käresta', STATION.bredvidGlad, s.now, STATION.bredvidTim * HOUR);
}
ersattKrok.site = siteErsatt; ersattKrok.ersatt = ersatt;
import { finareKrok } from './forradsmal';
finareKrok.brist = finareBrist;
