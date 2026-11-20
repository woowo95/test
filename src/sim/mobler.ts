// Möblerna i hemmet (system 12.4, Arbetsstationer och möbler). Möblerna är rader i STATIONER (stationer.ts) och talen står i
// blocket STATION där; här finns det som gäller flera av dem.
// Hemmen blir finare (steg 10.2.69): en möbel med `ersatter` byts mot den enklare sorten när familjen som äger den har något
// över (hemOverskott i byggplan.ts). Bristen är det största överskottet bland ägarna till de enklare möblerna (finareBrist), platsen
// är den enklare möbelns (siteErsatt), och när bygget börjar tas den isär och den nya får dess ägare och tillbehör (ersatt).
// Pallen och stolen (steg 12.4.4): sittplatserna vid bordet har tre nivåer (SATEN i stationer.ts): stubben, pallen och stolen.
// De görs vid snickarbänken (gruppen sate i SAKER) så många som det finns platser vid borden hemma som familjen har råd att göra
// finare (sateMal), och ställs sedan vid bordet (projektet satta, sattaKlar), där det bättre byter ut det sämre. Den som sitter
// vilar mer (sittVila) och får en bättre tanke av måltiden (sittGlad) ju bättre platsen är, och väljer den bästa lediga (ledigPlats)
// Sängen (steg 12.4.3) byts så mot halmbädden: den vilar mer (vila i raden, baddVila), och ett par vars sängar står intill
// varandra får tanken Sov bredvid sin käresta (bredvidKaresta)
import { HUS } from './byggnader';
import { hemOverskott } from './byggplan';
import { ALDER, ageOf, byId, count, familjOf, forstaGang, living, log, think } from './folk';
import { addTool, ingenHar, tingOf } from './agande';
import { type Rum, roomAt, husById } from './byggnad';
import { sovPlats } from './byggnader';
import { gruppOf } from './saker';
import { knows } from './teknik';
import { Task, W } from './typer';
import { put } from './lager';
import { tileOf } from './mark';
import { HOUR, Person, State } from './typer';
import { SATEN, STATION, type Station, bordPlatser, bordenOf, moblerKrok, isKlar, sateNiva, stationDef, stationRutor, stationerOf, storlekAv, taBort } from './stationer';

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
moblerKrok.site = siteErsatt; moblerKrok.ersatt = ersatt;
import { finareKrok } from './forradsmal';
finareKrok.brist = finareBrist;

// ---------- pallen och stolen (steg 12.4.4) ----------
const SITTER = new Set(['maltid', 'samtal', 'beratta', 'vila']);
// bordet och platsens nummer på rutan (x, y)
export function sateVid(s: State, x: number, y: number) {
  const i = Math.floor(y) * W + Math.floor(x);
  if (!stationRutor(s).sitt.has(i)) return undefined;
  for (const t of bordenOf(s)) { const j = bordPlatser(t).findIndex(q => q.y * W + q.x === i); if (j >= 0) return { t, i: j }; }
  return undefined;
}
const nivaHar = (s: State, p: Person) => { if (!p.task || p.task.phase !== 'do' || !SITTER.has(p.task.act)) return 0; const v = sateVid(s, p.x, p.y); return v ? sateNiva(v.t, v.i) : 0; };
// så mycket mer vila per timme den som sitter på en pall eller stol får
export const sittVila = (s: State, p: Person) => s.stationer?.length ? STATION.sittVila * nivaHar(s, p) : 0;
// tanken av måltiden vid bordet gånger detta
export const sittGlad = (s: State, p: Person) => 1 + STATION.sittGlad * nivaHar(s, p);
// den bästa nivån byn kan göra: stolen när någon kan tekniken Stol, pallen när någon kan snickarbänken
const bastNiva = (s: State) => living(s).some(q => knows(q, 'stol')) ? SATEN.stol : living(s).some(q => knows(q, 'snickarbank')) ? SATEN.pall : 0;
// platserna vid borden i familjernas hus där familjen har något över, med en sämre sittplats än den bästa byn kan göra
function finarePlatser(s: State, niva = bastNiva(s)) {
  const ut: { t: Station; i: number; x: number; y: number }[] = [];
  if (niva <= 0) return ut;
  const rika = new Map<number, boolean>();
  for (const t of bordenOf(s)) {
    const r = roomAt(s, t.x, t.y), h = r && husById(s, r.hus);
    if (h?.ag === undefined) continue;
    if (!rika.has(h.ag)) rika.set(h.ag, hemOverskott(s, h.ag) > 0);
    if (!rika.get(h.ag)) continue;
    bordPlatser(t).forEach((q, i) => { if (sateNiva(t, i) < niva) ut.push({ t, i, x: q.x, y: q.y }); });
  }
  return ut;
}
export const sateMal = (s: State) => finarePlatser(s).length;
// den bästa lediga pallen eller stolen i byn
const friSate = (s: State) => tingOf(s).filter(t => gruppOf(t.k) === 'sate' && ingenHar(t) && !t.halv).sort((a, b) => (SATEN[b.k] ?? 0) - (SATEN[a.k] ?? 0) || a.id - b.id)[0];
// platsen där den lediga sittplatsen gör mest nytta: den sämsta platsen hemma som den är bättre än
export function sattaPlats(s: State) {
  const f = friSate(s);
  if (!f) return undefined;
  return finarePlatser(s, SATEN[f.k] ?? 0).sort((a, b) => sateNiva(a.t, a.i) - sateNiva(b.t, b.i) || a.t.id - b.t.id || a.i - b.i)[0];
}
// framme (KLAR.satta i steg.ts): sittplatsen ställs på platsen vid bordet, och det sämre den byter ut blir en ledig sak i byn
export function sattaKlar(s: State, p: Person, tk: Task) {
  const f = friSate(s), v = sateVid(s, tk.tx, tk.ty);
  if (!f || !v || v.t.id !== tk.ref || (SATEN[f.k] ?? 0) <= sateNiva(v.t, v.i)) return;
  const gammal = v.t.sate?.[v.i];
  const sate = v.t.sate ?? (v.t.sate = []);
  while (sate.length < bordPlatser(v.t).length) sate.push('');
  sate[v.i] = f.k;
  s.ting = tingOf(s).filter(q => q !== f);
  if (gammal) addTool(s, gammal, p);
  count(s, 'sateStald');
  if (forstaGang(s, 'sateForsta_' + f.k)) log(s, `${p.name} ställde ${f.k === 'stol' ? 'en stol' : 'en pall'} vid bordet, där det förut stod en ${gammal === 'pall' ? 'pall' : 'stubbe'}.`, 'world', [p.id]);
}
finareKrok.sate = sateMal;
moblerKrok.sittGlad = sittGlad; moblerKrok.sattaPlats = sattaPlats;

// ---------- vaggan (steg 12.4.5) ----------
// Spädbarnet (under ALDER.smabarn) sover i en ledig vagga i rummet där föräldern sover, i stället för hos föräldern (boende i
// byggnader.ts), och sover bättre där (vila i raden). Ett hem med ett spädbarn vill ha en vagga: rummen där ett spädbarn sover
// hos föräldern utan en vagga
function vaggaRummen(s: State) {
  const ut: Rum[] = [];
  for (const q of living(s)) {
    if (ageOf(q, s.now) >= ALDER.smabarn) continue;
    const i = sovPlats(s, q); if (i === undefined) continue;
    const t = stationRutor(s).at.get(i);
    if (t && stationDef(t.k)?.vagga) continue; // sover redan i en vagga
    const r = roomAt(s, i % W, Math.floor(i / W));
    if (r && !ut.includes(r) && !stationerOf(s).some(v => stationDef(v.k)?.vagga && !isKlar(v) && roomAt(s, v.x, v.y) === r)) ut.push(r); // en vagga som byggs där räknas
  }
  return ut;
}
export const vaggaRum = (s: State) => vaggaRummen(s)[0];
finareKrok.vagga = s => vaggaRummen(s).length ? 1 : 0;
moblerKrok.vaggaRum = vaggaRum;
