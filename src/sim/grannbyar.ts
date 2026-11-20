// ---------- grannbyarna (steg 11.2.15, Flera samhällen: grannklanerna blir världens byar) ----------
// Byns grannar är byarna i dess grannät i världen (grannat.ts). När byn grundas får varje sådan by en rad i världen, och raden
// bär huvudbyns förbindelse med den (raden.syn, en Klan i klaner.ts): hållningen till byn, de namngivna personerna, priserna och
// restiden dit till fots. Var de bor står som marken och riktningen ("skogen i öster"), och det som är sällsynt hos dem är det
// marken där har sällsynt (VARLDMARK). En familj som bryter sig ut ur byn slår sig ner på den närmaste lediga byplatsen som går
// att nå till fots och blir en ny by i världen. En sparad by från före v531 får sin värld, och dess grannklaner blir byarna i
// grannätet, i ordning efter avståndet, med sina namn och allt de visste om byn.
import { ALDER, ageOf, count, log } from './folk';
import { kronika } from './historik';
import { notis } from './notiser';
import { KLAN, Klan, KlanPerson, klanById, klanMellan, nyKlan } from './klaner';
import { eldPlats, getMap } from './karta';
import { byGrannar } from './grannat';
import { hinder, laggPlats, VarldPlats } from './landmarken';
import { byRutor } from './placering';
import { BYSORTER, radKrok, VarldRad } from './radtal';
import { FORHIST, forhistoria } from './forhistoria';
import { narmasteMal } from './vagval';
import { varldHandelse } from './varldkronika';
import { medVarld, varldMark } from './varlden';
import { hemPlats } from './ort'; // byns egen plats (steg 12.1.64)
import { MARK_IDS, VARLD, VARLDMARK, VarldMark } from './varldmark';
import { H, Person, State, T, W } from './typer';

const RIKTNING = ['öster', 'sydost', 'söder', 'sydväst', 'väster', 'nordväst', 'norr', 'nordost'];
// var en plats ligger sett från huvudbyn: marken där och väderstrecket
function hemAv(v: VarldMark, h: VarldPlats | undefined, p: VarldPlats) {
  const m = VARLDMARK[MARK_IDS[v.mark[p.y * v.w + p.x]]];
  const r = h ? RIKTNING[((Math.round(Math.atan2(p.y - h.y, p.x - h.x) / (Math.PI / 4)) % 8) + 8) % 8] : undefined;
  return { hem: r ? `${m.bestamd} i ${r}` : m.bestamd, sallsynt: [...m.sallsynt] };
}
// förbindelsen får sin rad i världen, på platsen
function nyRad(s: State, k: Klan, p: VarldPlats | undefined): VarldRad {
  const vl = s.varld!;
  const r: VarldRad = {
    nr: vl.nastaRad = (vl.nastaRad ?? 0) + 1, sort: 'by', namn: k.namn, grundad: p?.fran ?? s.now, t: s.now,
    tal: { folk: k.folk, mat: radKrok.startMat(k.folk), rikedom: k.resurser, silver: 0, styrka: k.styrka }, tek: [], fasta: [], syn: k,
    ...(p ? { x: p.x, y: p.y } : {}),
  };
  (vl.rader ??= []).push(r);
  if (p) { p.by = r.nr; p.namn = k.namn; }
  k.rad = r.nr;
  return r;
}
// förbindelsen ligger på platsen: var den bor, vad som är sällsynt där och restiden
function placera(s: State, k: Klan, p: VarldPlats | undefined, dygn: number | undefined) {
  const v = varldMark(s);
  if (p && v) { const h = hemAv(v, hemPlats(s), p); k.hem = h.hem; k.sallsynt = h.sallsynt; }
  if (dygn !== undefined) k.dygn = dygn;
  return nyRad(s, k, p);
}

// den närmaste lediga byplatsen som går att nå till fots från huvudbyn blir en ny by (utbrytning, en sparad klan utan by)
function nyPlats(s: State, namn: string): { p: VarldPlats; dygn: number } | undefined {
  const vl = medVarld(s), v = varldMark(s), h = hemPlats(s);
  if (!v || !h) return undefined;
  const lediga = new Set(byRutor(v).filter(i => !hinder(vl, v, 'by', i % v.w, Math.floor(i / v.w))));
  const [f] = narmasteMal(vl, v, h.y * v.w + h.x, lediga, 1, 'fots');
  const p = f && laggPlats(vl, v, 'by', f.till % v.w, Math.floor(f.till / v.w), s.now, { namn });
  if (!p) return undefined;
  p.grannar = byGrannar(vl, v, p, s.now);
  h.grannar = byGrannar(vl, v, h, s.now);
  return { p, dygn: Math.round(f.kostnad / VARLD.gangPerDygn * 100) / 100 };
}

// grannbyarna: varje by i huvudbyns grannät som inte har en rad får en, och en förbindelse med byn. Gamla klaner (en sparad by
// från före v531) tar byarna i ordning efter avståndet; de som blir över får en ny plats
// forhist: en ny värld får sin förhistoria (forhistoria.ts, steg 11.3.13; ingen när åldern är 0), och byarna i grannätet som lever efter den får en
// förbindelse med huvudbyn: namnet, folket, styrkan och rikedomen ur raden, ledaren som hövding och läggningen ur tron
export function nyaGrannbyar(s: State, gamla: Klan[] = [], forhist = true) {
  const vl = medVarld(s, forhist && FORHIST.ar > 0 ? forhistoria : undefined), h = hemPlats(s), kvar = [...gamla];
  for (const g of h?.grannar ?? []) {
    const p = vl.platser?.find(q => q.nr === g.nr);
    if (!p) continue;
    const r = p.by !== undefined ? vl.rader?.find(x => x.nr === p.by) : undefined;
    if (r && !r.syn && r.nr !== vl.huvud && BYSORTER[r.sort].folk && r.tal.folk > 0) { synFor(s, r, p, g.dygn); continue; }
    if (p.by !== undefined) continue;
    const k = kvar.shift() ?? nyKlan(s, klanMellan(s, KLAN.folk), klanMellan(s, KLAN.inst), p.namn, '');
    placera(s, k, p, g.dygn);
  }
  for (const k of kvar) { const n = nyPlats(s, k.namn); placera(s, k, n?.p, n?.dygn); }
}
// huvudbyns förbindelse med en by som redan finns i världen (förhistorien)
function synFor(s: State, r: VarldRad, p: VarldPlats, dygn: number) {
  const k = nyKlan(s, r.tal.folk, klanMellan(s, KLAN.inst), r.namn, '');
  k.styrka = r.tal.styrka; k.resurser = r.tal.rikedom; k.rad = r.nr;
  if (r.tro) k.krigisk = r.tro.krig;
  const l = r.ledare !== undefined ? r.fasta[r.ledare] : undefined, hv = k.personer.find(q => q.roll === 'hovding');
  if (l && hv) { hv.namn = l.namn; hv.sex = l.kon; hv.fodd = l.fodd; }
  const v = varldMark(s);
  if (v) { const h = hemAv(v, hemPlats(s), p); k.hem = h.hem; k.sallsynt = h.sallsynt; }
  k.dygn = dygn;
  r.syn = k;
}
// en ny grannby (scenarierna och utbrytningen): på den närmaste lediga byplatsen
export function nyGrannby(s: State, folk: number, inst: number, o: { namn?: string; personer?: KlanPerson[] } = {}): Klan {
  const n = nyPlats(s, o.namn ?? '');
  const k = nyKlan(s, folk, inst, o.namn ?? n?.p.namn ?? 'Grannbyn', '', o.personer);
  placera(s, k, n?.p, n?.dygn);
  return k;
}

// en familj flyttar ur en mycket stor by (emigrate i liv.ts, steg 4.4.4.1): de grundar en ny by i världen, uppkallad efter den
// första av grundarna, som tycker om byn de kom ifrån. De som flyttade är byns namngivna personer
export function utbrytning(s: State, grupp: Person[], pop: number) {
  if (pop < KLAN.utbrytFran || grupp.length < 2) return undefined;
  const vuxna = grupp.filter(p => ageOf(p, s.now) >= ALDER.vuxen), forst = vuxna[0] ?? grupp[0];
  const namn = `${forst.name}${/[sxz]$/.test(forst.name) ? '' : 's'} folk`;
  const per = grupp.map(p => ({ namn: p.name, sex: p.sex, roll: vuxna.includes(p) ? 'grundare' : 'barn', id: p.id } as KlanPerson));
  const k = nyGrannby(s, grupp.length, KLAN.utbrytInst, { namn, personer: per });
  k.utbrytare = true; k.grundad = s.now;
  k.styrka = Math.max(1, vuxna.length);
  const r = s.varld?.rader?.find(x => x.nr === k.rad);
  if (r) { r.grundad = s.now; r.fran = s.varld!.huvud; r.tal.styrka = k.styrka; varldHandelse(s.varld!, 'delad', s.now, { by: s.varld!.huvud, mot: r.nr }); }
  count(s, 'utbrytning');
  const text = `${namn} är en ny by vid ${k.hem}: ${grupp.map(p => p.name).join(', ')} som lämnade byn.`;
  log(s, text, 'world', grupp.map(p => p.id)); notis(s, 'utflytt', text, grupp.map(p => p.id));
  kronika(s, text, 'utbrytning');
  return k;
}

// ---------- rätt kant (steg 11.2.22, Flera samhällen: Världen i tal: bykartan och kartreceptet) ----------
// Bykartan och världskartan hänger ihop med väderstrecken: den som kommer från en grannby kommer in från den kant på bykartan
// som pekar mot grannbyn, och går ut åt samma håll. Kanten är där en rak linje från elden i grannbyns väderstreck når kartans
// kant; är det vatten där tas den närmaste punkten längs kanten som är land. Saknar byn eller grannbyn en plats i världen
// finns ingen sådan kant (undefined), och då gäller den närmaste kanten
const KANT = 0.3; // så långt in från kartans kant står den som kommer in
export const kantMot = (s: State, klan: number | undefined) => kantMotBy(s, klanById(s, klan)?.rad);
// kanten mot byn med raden nr i världen
export function kantMotBy(s: State, nr: number | undefined): { x: number; y: number } | undefined {
  const h = hemPlats(s), p = nr === undefined ? undefined : s.varld?.platser?.find(q => q.k === 'by' && q.by === nr);
  if (!h || !p || (p.x === h.x && p.y === h.y)) return undefined;
  const e = eldPlats(s), cx = e.x + 0.5, cy = e.y + 0.5, dx = p.x - h.x, dy = p.y - h.y;
  const tx = dx > 0 ? (W - KANT - cx) / dx : dx < 0 ? (KANT - cx) / dx : Infinity, ty = dy > 0 ? (H - KANT - cy) / dy : dy < 0 ? (KANT - cy) / dy : Infinity;
  const tt = Math.min(tx, ty), x = Math.min(W - KANT, Math.max(KANT, cx + dx * tt)), y = Math.min(H - KANT, Math.max(KANT, cy + dy * tt));
  // runt kanten medurs: en punkt per ruta, och den närmaste som är land
  const runt: { x: number; y: number }[] = [];
  for (let i = 0; i < W; i++) runt.push({ x: i + 0.5, y: KANT });
  for (let i = 0; i < H; i++) runt.push({ x: W - KANT, y: i + 0.5 });
  for (let i = W - 1; i >= 0; i--) runt.push({ x: i + 0.5, y: H - KANT });
  for (let i = H - 1; i >= 0; i--) runt.push({ x: KANT, y: i + 0.5 });
  const tiles = getMap(s.seed).tiles, land = (q: { x: number; y: number }) => tiles[Math.floor(q.y) * W + Math.floor(q.x)] !== T.Vatten;
  let n0 = 0, d0 = Infinity;
  runt.forEach((q, i) => { const d = Math.hypot(q.x - x, q.y - y); if (d < d0) { d0 = d; n0 = i; } });
  if (land({ x, y })) return { x, y };
  for (let n = 1; n <= runt.length >> 1; n++) for (const i of [n0 + n, n0 - n]) { const q = runt[(i + runt.length) % runt.length]; if (land(q)) return q; }
  return { x, y };
}
