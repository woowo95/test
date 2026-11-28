// ---------- sälja och stänga (steg 14.1.13, Ekonomi och handel: Sälja och stänga, i fliken Människan) ----------
// Ägaren jämför vinsten de senaste åren med vad hen kunde tjäna på annat: kundernas pengar utöver varorna, minus timmarna vid
// disken och det huset är värt. Är den sämre länge säljs företaget på husmarknaden (kopHus i byggplan.ts), och ett gott rykte gör
// det värt mer än husen. Köparen räknar med samma poäng som den som startar ett nytt. Vill ingen köpa stängs det, och huset
// blir ägarens familjehus eller byns sovsal, som sedan följer behovet som alla andra hus.
import { DAY, type Person, type State } from './typer';
import { balans } from './balans';
import { ageOf, ALDER, byId, count, living, log } from './folk';
import { husById, type Hus } from './byggnad';
import { bytFn, husKostnad } from './byggnader';
import { husPris, kopHus, kopPris, PLAN } from './byggplan';
import { formogenheter } from './varde';
import { kronika } from './historik';
import { ledareOf } from './styre';
import { egetVarde } from './dagsarbete';
import { BYN } from './egendom';
import { dygnet, efterfragan, FORETAG, type Foretag, foretagare, foretagOf, sortNamn, startPoang } from './foretag';
import { ryktet } from './foretagsrykte';

export const STANG = balans('stangning', {
  minne: 0.3, // så mycket av vinsten räknas från det senaste dygnet (ett år i spelet)
  prova: 5, // så många dygn (år i spelet) prövar ägaren innan hen jämför
  vanta: 3, // så många dygn är företaget till salu innan det stängs
  rykte: 1, // det bästa ryktet gör företaget värt så mycket mer än husen
  lart: 0.1, // så mycket av det byn lärt sig av ett stängt företag glöms per dygn
});
// det ägaren fått ut av företaget utöver vad hen kunde tjänat på annat, för ett dygn med så mycket vinst och så många kunder
export function dygnsResultat(s: State, f: Foretag, vinst: number, kunder: number) {
  const p = foretagare(s, f.ag), h = f.hus !== undefined ? husById(s, f.hus) : undefined;
  if (!h) return 0;
  // utan någon som driver det (byn utan ledare, kyrkan utan präst) kostar ingens timmar, men huset kostar ändå, så att ett
  // företag som ingen driver går med förlust och säljs eller stängs som de andra
  return vinst - (p ? kunder * FORETAG.timKund * egetVarde(s, p) : 0) - husKostnad((h.w - 2) * (h.h - 2)) / FORETAG.ar;
}
const ryktesVarde = (s: State, f: Foretag) => 1 + STANG.rykte * Math.max(0, ryktet(s, f) ?? 0);
export const foretagPris = (s: State, f: Foretag, h: Hus) => husPris(s, h) * ryktesVarde(s, f);
// köparens högsta: det företaget ger tills huset är betalt, aldrig mer än familjen äger. Köparen räknar utan det här företaget
export function foretagHogst(s: State, f: Foretag, ag: number): number {
  const alla = s.foretag;
  s.foretag = foretagOf(s).filter(q => q !== f);
  try { return kopPris(s, ag, Math.max(0, startPoang(s, ag, f.verk, 0).poang) * FORETAG.ar * ryktesVarde(s, f) / PLAN.kopMax); } finally { s.foretag = alla; }
}
// den som vill köpa: kan starta ett företag, och vinner på just det här
export function foretagKopare(s: State, f: Foretag, h: Hus): Person | undefined {
  const pris = foretagPris(s, f, h);
  let bast: Person | undefined, b = pris;
  const egen = formogenheter(s).egen;
  for (const p of living(s)) {
    if (p.gast || p.id === f.ag || ageOf(p, s.now) < ALDER.vuxen || (egen.get(p.id) ?? 0) < pris || foretagOf(s).some(q => q.ag === p.id)) continue;
    const v = foretagHogst(s, f, p.id);
    if (v >= b) { b = v; bast = p; }
  }
  return bast;
}
export function saljForetag(s: State, f: Foretag, h: Hus, kop: Person, bud?: Person): boolean {
  const gammal = f.namn, salj = byId(s, f.ag);
  const n = kop.name, namn = `${/[sxz]$/i.test(n) ? n : n + 's'} ${sortNamn(f.verk).toLowerCase()}`;
  if (!kopHus(s, h, kop.id, bud, { salj: foretagPris(s, f, h), hog: foretagHogst(s, f, kop.id), fn: 'naringshus', namn })) return false;
  f.ag = kop.id; f.namn = namn; f.salu = f.resultat = f.oppnat = undefined;
  count(s, 'foretagSalt');
  const tx = `${kop.name} köpte ${/^Byns /.test(gammal) ? 'b' + gammal.slice(1) : gammal}.`; // liten bokstav mitt i meningen (steg 15.1.118)
  log(s, tx, 'world', [kop.id, ...(salj ? [salj.id] : [])]); kronika(s, tx, 'byte');
  return true;
}
export function stangForetag(s: State, f: Foretag) {
  const h = f.hus !== undefined ? husById(s, f.hus) : undefined, p = foretagare(s, f.ag);
  // byn har sett hur många kunder det blev mot vad den räknat med
  const utan = s.foretag;
  s.foretag = foretagOf(s).filter(q => q !== f);
  for (const v of f.verk) { const e = efterfragan(s, v, f.ag).kunder; if (e > 0) (s.foretagLart ??= {})[v] = Math.min(s.foretagLart?.[v] ?? 1, (f.salt?.[v] ?? 0) * FORETAG.minne / e); }
  s.foretag = utan!.filter(q => q !== f);
  count(s, 'foretagStangt'); log(s, `${f.namn} stängde: det lönade sig inte.`, 'world', p ? [p.id] : []); kronika(s, `${f.namn} stängde.`, 'byte');
  if (h && h.tro === undefined) bytFn(s, h, h.ag === undefined || f.ag === BYN ? 'sovsal' : 'familjehus');
}
// en gång per dygn: vinsten jämförs, och det som är till salu för länge stängs
dygnet.push(s => {
  for (const v in s.foretagLart) { s.foretagLart[v] += (1 - s.foretagLart[v]) * STANG.lart; if (s.foretagLart[v] > 0.98) delete s.foretagLart[v]; }
  for (const f of [...foretagOf(s)]) {
    const h = f.hus !== undefined ? husById(s, f.hus) : undefined;
    if (!h?.klar) continue;
    const kunder = Object.values(f.salt ?? {}).reduce((a, b) => a + b, 0), vinst = f.vinst ?? 0, b = f.bok ?? { vinst: 0, kunder: 0 };
    const r = dygnsResultat(s, f, vinst - b.vinst, kunder - b.kunder);
    f.bok = { vinst: vinst * (1 - FORETAG.minne), kunder: kunder * (1 - FORETAG.minne) }; // foretagDygn låter vinsten blekna med FORETAG.minne efter dygnet-raderna, så boken räknar med samma förfall
    f.resultat = f.resultat === undefined ? r : f.resultat + (r - f.resultat) * STANG.minne;
    f.oppnat ??= s.now;
    if (s.now - f.oppnat < STANG.prova * DAY || f.resultat >= 0) { f.salu = undefined; continue; }
    if (f.salu === undefined) { f.salu = s.now; count(s, 'foretagTillSalu'); log(s, `${f.namn} är till salu.`, 'world', []); }
    else if (s.now - f.salu >= STANG.vanta * DAY) stangForetag(s, f);
  }
});
// varje timme: köparen och säljaren möts och gör bytet, som i alla stora byten. Kyrkans hus säljs inte
export function foretagMarknad(s: State) {
  for (const f of foretagOf(s)) {
    const h = f.salu !== undefined && f.hus !== undefined ? husById(s, f.hus) : undefined;
    if (!h || h.tro !== undefined) continue;
    const k = foretagKopare(s, f, h);
    if (!k || k.task?.act === 'sova') continue;
    const nara = (q?: Person) => !!q && q !== k && q.task?.act !== 'sova' && Math.hypot(q.x - k.x, q.y - k.y) <= PLAN.husMote;
    if (f.ag > 0) { if (nara(byId(s, f.ag))) saljForetag(s, f, h, k); continue; }
    const bud = [ledareOf(s), ...living(s)].find(q => nara(q) && ageOf(q!, s.now) >= ALDER.vuxen);
    if (bud) saljForetag(s, f, h, k, bud);
  }
}
