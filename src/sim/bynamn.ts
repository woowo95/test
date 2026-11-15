// ---------- byns namn (steg 10.9.1–10.9.5, Så blir folk ihågkomna: Byns namn) ----------
// Byn döper sig själv. Allt som visar namnet frågar här (bynsNamn): rubriken i raden överst och flikens titel i webbläsaren.
// Innan byn har döpt sig heter den Nybygget, som är det man kallar en ny boplats; en sparad by utan namn heter också det.
// Byn minns namnet, raden i namnregistret det kom ur, personen det syftar på och när det togs.
// Namnmallarna (steg 10.9.2) är rader i registret BYNAMN: ett slag, en förled, efterleden och ett tal från 0 till 1 för hur
// sant namnet är för byn i dag (sant). Samma tal väljer namnet och säger senare hur illa det stämmer. Var och en tycker om ett
// namn efter hur sant det är gånger hur slaget tilltalar hen (gilla); den som föreslår tar det hen tycker bäst om (bastaNamn).
// Efterledet räknas ur byns frö, så att samma by får samma namn utan att slumpen i byn rubbas
import { T, W, State, Person, inMap } from './typer';
import { ALDER, ageOf, alive, byId, getRel, living } from './folk';
import { eldPlats, hash } from './karta';
import { groundOf } from './mark';
import { FOREST } from './vag';
import { BJORK, GRAN } from './trad';
import { RYKTE } from './rykten';
import { GUDAR, gudarOf, troende } from './religion';
import { drar } from './seder';
import { ISTID, kalender } from './tid';
import { balans } from './balans';
import type { UpplevelseTyp } from './uppvaxt';
import type { IntryckTyp } from './rykten';

export interface Bynamn { namn: string; rad: string; om?: number; t: number }
export const NYBYGGET = 'Nybygget';
export const bynsNamn = (s: State) => s.bynamn?.namn ?? NYBYGGET;

export const BYNT = balans('bynamn', {
  sjo: 10, // sjön: fullt sant vid stranden, inget så här många rutor bort
  skog: 12, skogFull: 0.5, // granen och björken: skog av arten inom så här många rutor från elden, fullt vid den här andelen
  minne: 0.15, // vargen, björnen, branden och vintern: fullt när så stor del av de vuxna bär minnet
  natur: 0.6, // hur väl naturens, ett minnes och Nybyggets namn tilltalar var och en ...
  minneEget: 0.3, // ... och så mycket mer för den som själv bär minnet
  eget: 0.25, egetEnvalde: 0.4, // det egna namnet: eget + så här mycket gånger dragningen mot Envälde (−1 till 1)
  heligt: 0.4, heligtAndlig: 0.6, // tron: heligt + heligtAndlig × andligheten / 100
  annan: 0, annanRel: 0.6, // en annans namn: annan + annanRel × relationen / 100 (högst 1, lägst 0)
});

export type BynamnSlag = 'nybygget' | 'natur' | 'minne' | 'person' | 'tro';
export interface BynamnDef {
  slag: BynamnSlag;
  forled?: string; // förleden; personens namn och tron tar sin ur personen eller guden
  efter: string[]; // efterleden; ett som börjar med mellanslag tar förleden i genitiv (Torbjörns by)
  sant: (s: State, om?: number) => number;
  minne?: { upp?: UpplevelseTyp[]; intryck?: IntryckTyp[] }; // ett minne: upplevelserna och intrycken som bär det
}

// ---------- måtten ----------
// sjön: hur nära stranden elden står
function sjonNara(s: State) {
  const f = eldPlats(s), g = groundOf(s), r = BYNT.sjo;
  let d = Infinity;
  for (let y = Math.floor(f.y) - r; y <= f.y + r; y++) for (let x = Math.floor(f.x) - r; x <= f.x + r; x++) {
    if (inMap(x, y) && g.tiles[y * W + x] === T.Vatten) d = Math.min(d, Math.hypot(x + 0.5 - f.x, y + 0.5 - f.y));
  }
  return Math.max(0, Math.min(1, 1 - (d - 1) / r)); // rutan intill vattnet är stranden
}
// granen och björken: hur stor del av marken inom BYNT.skog rutor från elden som är skog av arten
function skogAv(s: State, art: number) {
  const f = eldPlats(s), g = groundOf(s), r = BYNT.skog;
  let mark = 0, skog = 0;
  for (let y = Math.floor(f.y) - r; y <= f.y + r; y++) for (let x = Math.floor(f.x) - r; x <= f.x + r; x++) {
    if (!inMap(x, y) || Math.hypot(x + 0.5 - f.x, y + 0.5 - f.y) > r) continue;
    const i = y * W + x, t = g.tiles[i];
    if (t === T.Vatten || t === T.Sten) continue;
    mark++;
    if (g.trees[i] >= FOREST && (g.art?.[i] ?? GRAN) === art) skog++;
  }
  return mark ? Math.min(1, skog / mark / BYNT.skogFull) : 0;
}
const vuxna = (s: State) => living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen);
// bär p minnet: en egen upplevelse eller ett intryck av någon (en vargdödare)
export const barMinnet = (p: Person, m: NonNullable<BynamnDef['minne']>) =>
  !!(m.upp && p.upp?.some(u => m.upp!.includes(u.k))) || !!(m.intryck && p.intryck?.some(e => m.intryck!.includes(e.k)));
function minnesAndel(s: State, rad: string) {
  const m = DEF[rad].minne!, v = vuxna(s);
  return v.length ? Math.min(1, v.filter(p => barMinnet(p, m)).length / v.length / BYNT.minne) : 0;
}
// har byn slagit sig ner: ett färdigt hus, eller den första istiden är över
export function slagitSigNer(s: State) {
  if (s.hus?.some(h => h.klar !== undefined)) return true;
  let k = kalender(s, s.founded), n = 0;
  while (k.ai !== ISTID && n++ < 5) k = kalender(s, k.slut);
  return k.ai === ISTID && s.now >= k.slut;
}
// en person: helt sant medan hen lever i byn, därefter efter hur känd hen är bland de levande
function personSant(s: State, om?: number) {
  const p = byId(s, om);
  if (!p) return 0;
  return alive(p) ? 1 : Math.min(1, (s.kanda?.[p.id] ?? 0) / RYKTE.legend);
}
// tron: byns största tro och hur stor del av byn som hör till den
function storstaTro(s: State) {
  let bast: { tr: NonNullable<State['tron']>[number]; n: number } | undefined;
  for (const tr of s.tron ?? []) { const n = troende(s, tr).length; if (n > (bast?.n ?? 0)) bast = { tr, n }; }
  return bast;
}
const troSant = (s: State) => { const b = storstaTro(s), n = living(s).length; return b && n ? b.n / n : 0; };

export const BYNAMN = {
  nybygget: { slag: 'nybygget', efter: [''], forled: NYBYGGET, sant: s => slagitSigNer(s) ? 0 : 1 },
  sjon: { slag: 'natur', forled: 'Sjö', efter: ['viken', 'näs', 'udden', 'stranden'], sant: s => sjonNara(s) },
  gran: { slag: 'natur', forled: 'Gran', efter: ['åsen', 'lid', 'backen', 'skogen'], sant: s => skogAv(s, GRAN) },
  bjork: { slag: 'natur', forled: 'Björk', efter: ['lunden', 'backen', 'hagen', 'lid'], sant: s => skogAv(s, BJORK) },
  varg: { slag: 'minne', forled: 'Varg', efter: ['åsen', 'berget', 'dalen', 'hult'], minne: { upp: ['vargbett'], intryck: ['vargdodare'] }, sant: s => minnesAndel(s, 'varg') },
  bjorn: { slag: 'minne', forled: 'Björn', efter: ['backen', 'berget', 'hult', 'dalen'], minne: { intryck: ['bjorndodare'] }, sant: s => minnesAndel(s, 'bjorn') },
  brand: { slag: 'minne', forled: 'Brand', efter: ['backen', 'heden', 'ängen', 'tomten'], minne: { upp: ['brand'] }, sant: s => minnesAndel(s, 'brand') },
  vinter: { slag: 'minne', forled: 'Is', efter: ['vintern', 'berget', 'dalen', 'heden'], minne: { upp: ['hardVinter'] }, sant: s => minnesAndel(s, 'vinter') },
  person: { slag: 'person', efter: [' by', 'torp', 'stad', 'hem'], sant: (s, om) => personSant(s, om) },
  tro: { slag: 'tro', efter: ['vi', 'lund', 'hem', 'harg'], sant: s => troSant(s) },
} satisfies Record<string, BynamnDef>;
export type BynamnRad = keyof typeof BYNAMN;
const DEF: Record<string, BynamnDef> = BYNAMN;
const RADER = Object.keys(BYNAMN) as BynamnRad[];

// ---------- namnen ----------
export interface Kandidat { namn: string; rad: BynamnRad; om?: number }
const gen = (n: string) => /s$/.test(n) ? n : n + 's';
// ett led ur byns frö: samma by väljer samma led varje gång, utan spelets slump
const ur = <X>(s: State, lista: X[], nyckel: string) => {
  let k = 0; for (const c of nyckel) k = (k * 31 + c.charCodeAt(0)) | 0;
  return lista[Math.floor(hash(s.seed, k, 9109) * lista.length)];
};
function bygg(s: State, rad: BynamnRad, forled: string) {
  const e = ur(s, DEF[rad].efter, rad + forled);
  if (e.startsWith(' ')) return gen(forled) + e;
  return forled + (forled.endsWith(e[0]) && e[0] === 's' ? e.slice(1) : e);
}
// trons förled: ur gudens område hos byns största tro
function troForled(s: State) {
  const tr = storstaTro(s)?.tr, gud = tr && gudarOf(tr)[0];
  const omr = gud?.omr[0];
  return omr ? ur(s, GUDAR[omr].forled, 'tro' + tr!.id) : undefined;
}
// vem en persons namn kan syfta på: den som föreslår, grundarna, ledaren och den mest kända
function personer(s: State, p: Person) {
  const ids = new Set<number>([p.id]);
  for (const q of s.people) if (q.grundare && !q.gast) ids.add(q.id);
  if (s.styre?.ledare !== undefined) ids.add(s.styre.ledare);
  let kand: number | undefined, v = 0;
  for (const k in s.kanda ?? {}) if (s.kanda![k] > v && byId(s, +k) && !byId(s, +k)!.gast) { v = s.kanda![k]; kand = +k; }
  if (kand !== undefined) ids.add(kand);
  return [...ids];
}
// alla namn byn kan få, utom de som en grannklans namn börjar med (Vargåsen och Vargåsens folk)
export function kandidater(s: State, p: Person): Kandidat[] {
  const ut: Kandidat[] = [];
  for (const rad of RADER) {
    const d = DEF[rad];
    if (d.slag === 'person') { for (const om of personer(s, p)) { const q = byId(s, om); if (q) ut.push({ namn: bygg(s, rad, q.name), rad, om }); } }
    else if (d.slag === 'tro') { const f = troForled(s); if (f) ut.push({ namn: bygg(s, rad, f), rad }); }
    else if (d.slag === 'nybygget') ut.push({ namn: NYBYGGET, rad });
    else ut.push({ namn: bygg(s, rad, d.forled!), rad });
  }
  return ut.filter(k => !(s.klaner ?? []).some(c => c.namn.startsWith(k.namn)));
}
// hur sant namnet är för byn i dag
export const sant = (s: State, k: { rad: string; om?: number }) => DEF[k.rad] ? DEF[k.rad].sant(s, k.om) : 0;
// hur slaget tilltalar p
export function tilltal(s: State, p: Person, k: { rad: string; om?: number }) {
  const d = DEF[k.rad];
  if (!d) return 0;
  switch (d.slag) {
    case 'minne': return BYNT.natur + (barMinnet(p, d.minne!) ? BYNT.minneEget : 0);
    case 'tro': return BYNT.heligt + BYNT.heligtAndlig * (p.andlig ?? 0) / 100;
    case 'person': {
      if (k.om === p.id) return Math.max(0, BYNT.eget + BYNT.egetEnvalde * Math.max(-1, Math.min(1, drar(s, p).rang)));
      const q = byId(s, k.om);
      return q ? Math.max(0, Math.min(1, BYNT.annan + BYNT.annanRel * getRel(s, p, q).op / 100)) : 0;
    }
    default: return BYNT.natur;
  }
}
// hur gärna p vill att byn heter så: sant gånger tilltalet
export const gilla = (s: State, p: Person, k: { rad: string; om?: number }) => sant(s, k) * tilltal(s, p, k);
// det namn p tycker bäst om
export function bastaNamn(s: State, p: Person) {
  let bast: (Kandidat & { v: number }) | undefined;
  for (const k of kandidater(s, p)) { const v = gilla(s, p, k); if (v > (bast?.v ?? -1)) bast = { ...k, v }; }
  return bast;
}
