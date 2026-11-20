// Tankarna som kommer ur hur man har det (steg 12.1.131): registret LAGEN med en rad per tanke som gäller så länge läget
// varar (kläderna, hemmet, ljuset, stolen, hemlängtan). En gång i timmen (raden tankarTimme i TAKTER, steg.ts) får den som
// har det så tanken, och den sitter i två timmar, så att den finns så länge läget varar och klingar av när det är över.
// Här finns också förlusten i en olycka: förmögenheten när en brand, en översvämning eller ett rån börjar, och tanken
// Förlorade allt hos den som mist det mesta när det är över. Tankarna själva står i TANKAR (tankar.ts).
import { balans } from './balans';
import { sovHus, sovPlats } from './byggnader';
import { husById, roomAt } from './byggnad';
import { tingOf } from './agande';
import { alive } from './folk';
import { ACTS } from './handlingar';
import { kladAv } from './klader';
import { ljusAt } from './ljus';
import { sittAt, stationRutor } from './stationer';
import { TankeId, tanke } from './tankar';
import { lightLevel } from './tid';
import { DAY, Person, State } from './typer';
import { ute } from './ute';
import { formogenheter } from './varde';

export const TANKELAGE = balans('tankelage', {
  hemDygn: 3, // den som varit borta på en resa längre än så här många dygn (år i spelet) får hemlängtan
  nyttSkick: 0.9, // ett plagg med minst så här mycket kvar av skicket är nästan som nytt
  slitetSkick: 0.25, // ... och med högst så här mycket nästan utslitet
  finKvalitet: 3, // kvaliteten (KVALITET i kvalitet.ts) från vilken ett plagg är fint: 3 = Fin
  forlustAndel: 0.6, // Förlorade allt: förmögenheten efter olyckan är högst 1 − så här mycket av den före ...
  forlustMin: 20, // ... och den var minst så här mycket (grundvärde) före
  skattAndel: 0.1, // Hög skatt: den som betalar minst så här stor del av det hen har per dygn (år i spelet)
  godSkord: 1.3, // God skörd: en ruta som ger minst så här många gånger den vanliga skörden ...
  daligSkord: 0.6, // ... och Missväxt: högst så här mycket, eller grödan går förlorad
  forlustDygn: 3, // en förlust som börjat för längre sedan än så här många dygn glöms (rövarna som drevs bort innan de var klara)
});

const pa = (s: State, p: Person) => tingOf(s).filter(t => t.bar === p.id && !!kladAv(t.k)); // plaggen hen har på sig
const vila = (p: Person) => !!(p.task && ACTS[p.task.act]?.vila);

interface LageDef { tanke: TankeId; galler: (s: State, p: Person) => boolean; borta?: true } // borta: gäller den som är ute på en resa
export const LAGEN: LageDef[] = [
  { tanke: 'hemlangtan', borta: true, galler: (s, p) => p.ute !== undefined && s.now - p.ute > TANKELAGE.hemDygn * DAY },
  { tanke: 'slitnaKlader', galler: (s, p) => pa(s, p).some(t => t.c <= TANKELAGE.slitetSkick) },
  { tanke: 'nyaKlader', galler: (s, p) => { const k = pa(s, p); return k.length > 0 && k.every(t => t.c >= TANKELAGE.nyttSkick); } },
  { tanke: 'finaKlader', galler: (s, p) => pa(s, p).some(t => (t.q ?? 2) >= TANKELAGE.finKvalitet) },
  { tanke: 'egetHus', galler: (s, p) => { const h = husById(s, sovHus(s, p)); return h?.ag !== undefined && (h.ag === p.id || h.ag === p.partner); } },
  { tanke: 'soverISang', galler: (s, p) => { const i = sovPlats(s, p); return i !== undefined && !!s.stationer?.length && stationRutor(s).sov.has(i); } },
  { tanke: 'ljusInne', galler: (s, p) => !vila(p) && lightLevel(s.now) <= 0 && !!roomAt(s, Math.floor(p.x), Math.floor(p.y)) && ljusAt(s, p.x, p.y) > 0 },
  { tanke: 'sitterPaStol', galler: (s, p) => p.task?.phase === 'do' && sittAt(s, p.x, p.y) },
];

// en gång i timmen: tankarna ur läget
export function tankarTimme(s: State) {
  for (const p of s.people) {
    if (!alive(p)) continue;
    const borta = ute(p);
    for (const l of LAGEN) if (!!l.borta === borta && l.galler(s, p)) tanke(p, l.tanke, s.now);
  }
}

// ---------- förlusten i en olycka ----------
export type Olycka = 'brand' | 'flod' | 'ran';
// olyckan börjar: var och ens förmögenhet nu (en gång per olycka)
export function forlustFore(s: State, o: Olycka) {
  const f = s.forlustFore?.[o];
  if (f && s.now - f.t < TANKELAGE.forlustDygn * DAY) return;
  (s.forlustFore ??= {})[o] = { t: s.now, v: Object.fromEntries(formogenheter(s).egen) };
}
// olyckan är över: den som mist det mesta får tanken Förlorade allt
export function forlustEfter(s: State, o: Olycka) {
  const f = s.forlustFore?.[o];
  if (!f) return;
  delete s.forlustFore![o];
  if (!Object.keys(s.forlustFore!).length) delete s.forlustFore;
  const nu = formogenheter(s).egen;
  for (const p of s.people) {
    if (!alive(p)) continue;
    const fore = f.v[p.id] ?? 0;
    if (fore >= TANKELAGE.forlustMin && (nu.get(p.id) ?? 0) <= fore * (1 - TANKELAGE.forlustAndel)) tanke(p, 'forloradeAllt', s.now);
  }
}
