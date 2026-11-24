// Skickligheten ger fart och kvalitet (steg 13.9.8, Arbetsdelningen: Skickligheten ger fart och kvalitet, i fliken Människan).
// Allt som görs går fortare och blir bättre ju skickligare den som gör det är. Hur mycket skickligheten betyder följer sakens
// nivå (teknikens niva i TEKNIK): registret KUNNA har en rad per nivå, och en handling kan ange sitt eget kunnande (kunna i
// ACTS) där nivån ger fel. Mängden i ett recept ändras aldrig, bara tiden och kvaliteten. Färdigheten är handlingens
// (fardighet i ACTS, annars arbetet, annars hantverket)
import { ACTS } from './handlingar';
import { RECEPT } from './recept';
import { SAKER } from './saker';
import { TEK } from './teknik';
import { TILLVERKA } from './tillverka';
import { STATIONER, type StationDef } from './stationer';
import { SKILLS, type Act, type Person, type Skill, type State } from './typer';
import type { ActDef } from './handlingar';
import { GORS } from './redskap';

export { KUNTAL } from './kvalitet'; // talen ligger i kvalitet.ts, som läses tidigt
import { KUNTAL } from './kvalitet';
// hur mycket skickligheten betyder efter sakens nivå: vid flintan och korgen nästan inget, vid vävstolen och smedjan mycket
export const KUNNA: Record<number, number> = { 1: 0.05, 2: 0.1, 3: 0.2, 4: 0.5, 5: 0.8, 6: 1, 7: 1 };

let tvAct: Map<string, string | undefined> | undefined;
// tekniken som ger saken k
const tekFor = (k: string) => SAKER[k]?.skaffa?.tek ?? (RECEPT as Record<string, { tek?: string }>)[k]?.tek ?? (TEK[k] ? k : undefined);
// tekniken saken k hör till, annars det handlingen act gör (TILLVERKA), annars stationen där act görs
const tekAv = (act: Act, k?: string) => (k ? tekFor(k) : undefined) ?? (tvAct ??= new Map([
  ...Object.entries(STATIONER as Record<string, StationDef>).flatMap(([sk, d]) => (d.gor ?? []).map(a => [a, tekFor(sk)] as const)),
  ...Object.values(TILLVERKA).map(d => [d.act, d.tek] as const),
])).get(act);
// ---------- vakten för skickligheten (steg 13.9.10) ----------
// En handling som gör något (en sak i GORS, ett hantverk) har sin färdighet för fart och kvalitet: en färdighet i SKILLS och en
// nivå att följa: sakens teknik, stationens, receptets eller handlingens eget kunnande (kunna i ACTS). Vakten i npm test och npm run balans (kor.ts) larmar
// för de handlingar som saknar den, som vakten för arbetstiderna (tider.ts)
// stationen, tillbehöret och dörren görs efter sitt recept (var i RECEPT), och nivån följer det som görs
const receptVar = new Set<string>(Object.values(RECEPT as Record<string, { var: string }>).map(r => r.var));
export function utanFardighet(acts: Record<string, ActDef> = ACTS, gors: Record<string, string[]> = GORS): string[] {
  const ut: string[] = [];
  for (const a in acts) {
    const d = acts[a], ks = gors[a] ?? [];
    if (!ks.length && !d.hantverk) continue; // gör inget
    const sk = d.fardighet ?? d.arbete ?? 'hantverk';
    if (!(SKILLS as readonly string[]).includes(sk)) ut.push(`${a}: färdigheten ${sk} finns inte`);
    else if (d.kunna === undefined && !tekAv(a as Act) && !ks.some(k => tekFor(k)) && !receptVar.has(a)) ut.push(`${a}: ingen nivå för skickligheten (teknik, station eller kunna)`);
  }
  return ut;
}
// hur mycket skickligheten betyder när act gör k: handlingens eget kunnande, annars nivåns rad i KUNNA
export const kunnaVikt = (act: Act, k?: string) => ACTS[act]?.kunna ?? KUNNA[TEK[tekAv(act, k) ?? '']?.niva ?? 1] ?? 1;
// färdigheten handlingen act övar och arbetar med
export const kunnaSkill = (act: Act): Skill => ACTS[act]?.fardighet ?? ACTS[act]?.arbete ?? 'hantverk';
// hur fort p gör k med handlingen act, gånger receptets fart: 1 för den vanliga skickligheten (mitt)
export const fartAv = (w: number, sk: number) => Math.min(KUNTAL.fartMax, Math.max(KUNTAL.fartMin, 1 + w * (sk - KUNTAL.mitt) / KUNTAL.fartSteg));
export const kunnaFart = (_s: State, p: Person, act: Act, k?: string) => fartAv(kunnaVikt(act, k), p.skill[kunnaSkill(act)] ?? 0);
