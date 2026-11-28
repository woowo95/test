// ---------- den väckta byn somnar (steg 11.13.12, Flera samhällen: Den väckta byn i tal) ----------
// Medan byn är väckt är byn sanningen: radens egna regler (maten, födda och döda, kunskapen och tron i rad.ts) står still för
// raden (r.vaken), medan det världen gör mot byn (anfall, handel, gåvor) fortsätter att ändra raden. När byn somnar läggs det
// byn själv ändrat sedan den byggts (talen i byn nu mot talen när den var byggd, lasRad) till raden, så att båda delarna finns kvar, och
// teknikerna någon i byn kan blir radens. Tillgången per varugrupp räknas om ur rikedomen (radVaror). Sist sparas en minnesbild:
// husen med väggarna, gravarna, de heliga platserna, lagerplatserna, fälten och hagarna. Vid nästa väckning byggs husen ur minnesbilden
// först, på samma platser, och resten av det som fanns ligger kvar (återbygget, steg 11.13.22); resten byggs på nytt ur raden som vanligt (BYGGARE i vackt.ts)
import type { Fn } from './byggnader';
import type { GravStil } from './kvarlevor';
import type { HeligSlag } from './kult';
import { bitsOf, housesOf, Hus, MATERIAL } from './byggnad';
import { count } from './folk';
import { lasRad, radNr, RADTAL_IDS } from './radtal';
import { State, useMap } from './typer';
import { faltOf, faltRutor, sammanfatta, type Falt, type Ruta } from './odling';
import { hagarOf, nyHage } from './hage';
import { changed } from './lager';
import { groundOf } from './mark';
import { nyaFasta } from './vacktfasta';

export interface VacktMinne {
  t: number;
  hus: { fn?: string; namn: string; x: number; y: number; w: number; h: number; rumFn?: Record<string, string>; vaggar: [number, number, string, string?][] }[]; // väggarna: x, y, material och dörren
  gravar: { x: number; y: number; t: number; namn: string; stil: GravStil }[];
  heliga: { x: number; y: number; k: HeligSlag; t: number; om: string }[];
  lager?: { x: number; y: number; w: number; h: number; namn?: string; slag?: 'mat' | 'material'; prio?: number }[]; // lagerplatserna ute (steg 11.13.22)
  falt?: { x: number; y: number; w: number; dir: number; n: number }[]; // fälten, utan ägare och gröda
  hagar?: { x: number; y: number; w: number; h: number }[];
  eld?: { x: number; y: number }; // elden, om den flyttats från där kartan lade den
}
// minnesbilden ur byn: de färdiga husen, gravarna och de heliga platserna som inte vanhelgats
export function minnesbild(b: State): VacktMinne {
  const delar = bitsOf(b);
  return {
    t: b.now,
    hus: housesOf(b).filter(h => h.klar !== undefined && h.flyttas === undefined).map(h => ({
      ...(h.fn ? { fn: h.fn } : {}), namn: h.namn, x: h.x, y: h.y, w: h.w, h: h.h, ...(h.rumFn ? { rumFn: { ...h.rumFn } } : {}),
      vaggar: delar.filter(q => q.hus === h.id).map(q => (q.dorr ? [q.x, q.y, q.m, q.dorr] : [q.x, q.y, q.m]) as [number, number, string, string?]),
    })),
    gravar: (b.gravar ?? []).map(g => ({ x: g.x, y: g.y, t: g.t, namn: g.namn, stil: g.stil })),
    heliga: (b.heliga ?? []).filter(q => !q.skandad).map(q => ({ x: q.x, y: q.y, k: q.k, t: q.t, om: q.om })),
    lager: (b.lagren ?? []).filter(z => z.hus === undefined).map(z => ({ x: z.x, y: z.y, w: z.w, h: z.h, ...(z.namn ? { namn: z.namn } : {}), ...(z.slag ? { slag: z.slag } : {}), ...(z.prio !== undefined ? { prio: z.prio } : {}) })),
    falt: faltOf(b).map(f => ({ x: f.x, y: f.y, w: f.w, dir: f.dir, n: f.n })),
    hagar: hagarOf(b).map(h => ({ x: h.x, y: h.y, w: h.w, h: h.h })),
    ...(b.fire.at ? { eld: { ...b.fire.at } } : {}),
  };
}
// byn somnar: det byn ändrat läggs till raden, och minnesbilden sparas
export function somna(s: State, b: State) {
  const vl = s.varld, r = vl && b.vackt !== undefined ? radNr(vl, b.vackt) : undefined;
  if (!r || b.vackI !== undefined) return; // en by som inte byggts färdigt har inte ändrat något
  useMap(b);
  const nu = lasRad(b), fore = b.vackFore;
  for (const k of RADTAL_IDS) r.tal[k] = Math.max(0, Math.round((r.tal[k] ?? 0) + nu[k] - (fore?.[k] ?? nu[k])));
  const kan = new Set<string>();
  for (const p of b.people) if (p.died === undefined && !p.gast) for (const [id, n] of Object.entries(p.tek ?? {})) if (n >= 1) kan.add(id);
  for (const id of [...kan].sort()) if (!r.tek.includes(id)) r.tek.push(id);
  delete r.varor; delete r.hus; // tillgången räknas om ur rikedomen (radVaror i priser.ts)
  nyaFasta(b, r); // de besökarna mött blir fasta (steg 11.13.14)
  r.minne = minnesbild(b);
  r.t = b.now;
  delete r.vaken;
  useMap(s);
  count(s, 'vackt_somnade');
}
// minnesbilden byggs: husen på sina platser med sina väggar, färdiga (byggFardigt), och gravarna och de heliga platserna.
// Ett hus där något redan står byggs inte
export function byggMinne(b: State, m: VacktMinne | undefined, fardigt: (b: State, h: Hus) => void) {
  if (!m) return;
  if (m.eld) b.fire.at = { ...m.eld }; // elden står där den stod förra gången, före husen som byggs runt den
  for (const q of m.hus) {
    if (housesOf(b).some(h => h.x < q.x + q.w && q.x < h.x + h.w && h.y < q.y + q.h && q.y < h.y + h.h)) continue;
    b.nextBit ??= 1;
    const h: Hus = { id: b.nextBit++, namn: q.namn, x: q.x, y: q.y, w: q.w, h: q.h, ...(q.fn ? { fn: q.fn as Fn } : {}), ...(q.rumFn ? { rumFn: { ...q.rumFn } } : {}) };
    housesOf(b).push(h);
    for (const [x, y, mt, dorr] of q.vaggar) bitsOf(b).push({ id: b.nextBit++, x, y, k: MATERIAL[mt]?.k ?? 'vagg', m: mt, b: mt === 'oppning' ? 1 : 0, mat: 0, c: 1, hus: h.id, ...(dorr ? { dorr } : {}) });
    fardigt(b, h);
  }
  for (const g of m.gravar) (b.gravar ??= []).push({ ...g, vem: 0 }); // (ingen i byn: vem 0 är ingen person)
  for (const q of m.heliga) (b.heliga ??= []).push({ ...q, tro: -1 }); // trons plats får sin tro när tron byggs (steg 11.13.19)
  // återbygget (steg 11.13.22): lagerplatserna, fälten och hagarna där de låg. Fälten står utan ägare (agare 0) och utan gröda, så
  // att byggaren för fälten ger dem till hushållen (vacktfalt.ts) innan den lägger nya, och hagen får staketet runt om
  if (m.lager?.length) { const inne = (b.lagren ?? []).filter(z => z.hus !== undefined); b.lagren = [...m.lager.map(z => ({ ...z })), ...inne]; changed(b); }
  const g = groundOf(b);
  for (const q of m.falt ?? []) {
    const f: Falt = { id: b.nextFalt = (b.nextFalt ?? 0) + 1, ...q, agare: 0, steg: 'bereda', klara: 0, kvar: 0, rord: b.now, r: Array.from({ length: q.n }, (): Ruta => ({ st: 'sa' })) };
    (b.falt ??= []).push(f);
    for (const i of faltRutor(f)) { g.trees[i] = 0; g.cover[i] = 0; }
    sammanfatta(f);
  }
  for (const q of m.hagar ?? []) nyHage(b, q);
  b.byggV = (b.byggV ?? 0) + 1;
}
