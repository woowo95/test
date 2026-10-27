// Utrustningen (steg 2.3.1): platserna där en person har saker (händerna, kroppen i två lager, huvudet, benen och
// fötterna), vad saker väger och hur många händer de tar. Vikten står i sakregistret (vikt, hander, rymmer i saker.ts) och
// räknas i fulla famnar (bordOf). Hur mycket var och en orkar räknas i lager.ts (capacity, i fulla famnar); här delas det
// på händerna: en hand bär en del av famnen (UTRUSTNING.en), båda händerna en hel. En sak tar en hand om den som håller
// den orkar det med en, annars båda, och är den för tung går den inte att hålla (handerFor). Bördan bärs i de händer som
// är fria (bordPlats), och korgen tar en hand men rymmer mer.
// Kläderna (steg 2.3.2) sitter på kroppens platser (klad.plats i saker.ts). Den som saknar ett plagg på en plats tar på
// sig ett som är fritt: sitt eget först, sedan byns, sedan ett lånat (stepKlader, varje timme). Plagget är på sig (Ting.bar)
// tills det är utslitet (lager.ts, wearStore) eller den som har det dör. Kläderna väger: det man har på sig dras av från
// det man orkar bära, och de skyddar mot kylan (kladVarme, steg.ts).
// En ny plats blir en rad i PLATSER.
import { Person, State } from './typer';
import { KLAD_SLAG, SAKER, bordOf } from './saker';
import { heldBy, Ting, tingOf } from './agande';
import { BYN, lends } from './egendom';
import { living } from './folk';
import { capacity } from './lager';
import { balans } from './balans';

export const UTRUSTNING = balans('utrustning', {
  en: 0.4, // en hand bär så stor del av det man orkar med båda (en famn)
});

// platserna, i den ordning personrutan visar dem. hand = en hand att hålla saker och bördan i
interface PlatsDef { namn: string; ikon: string; hand?: true }
const DEF = {
  hoger: { namn: 'Höger hand', ikon: '✋', hand: true },
  vanster: { namn: 'Vänster hand', ikon: '🤚', hand: true },
  inre: { namn: 'Kropp, inre lager', ikon: '👕' },
  yttre: { namn: 'Kropp, yttre lager', ikon: '🧥' },
  huvud: { namn: 'Huvud', ikon: '🧢' },
  ben: { namn: 'Ben', ikon: '👖' },
  fotter: { namn: 'Fötter', ikon: '🥾' },
} satisfies Record<string, PlatsDef>;
export type Plats = keyof typeof DEF;
export const PLATSER: Record<Plats, PlatsDef> = DEF;
export const PLATS_LIST = Object.keys(DEF) as Plats[];

// hur många händer p behöver för en sak av slaget k: låst i registret, annars en om hen orkar det med en hand, två om
// hen orkar det med båda, och 0 om den är för tung
export function handerFor(s: State, p: Person, k: string): 0 | 1 | 2 {
  const d = SAKER[k];
  if (d?.hander) return d.hander;
  const b = bordOf(k), cap = capacity(s, p);
  return b <= cap * UTRUSTNING.en ? 1 : b <= cap ? 2 : 0;
}
// redskapet i handen och hur många händer det tar (för tungt = båda)
export function iHanden(s: State, p: Person): { ting: Ting; hander: 1 | 2 } | undefined {
  const t = heldBy(s, p);
  return t && { ting: t, hander: handerFor(s, p, t.k) === 1 ? 1 : 2 };
}
// hur mycket p kan bära i de händer som är fria, i fulla famnar. Ett redskap i en hand lämnar den andra, och en korg i
// handen rymmer mer än handen, men aldrig mer än hen orkar
export function bordPlats(s: State, p: Person) {
  const cap = Math.max(0, capacity(s, p) - paSigVikt(s, p)), h = iHanden(s, p);
  if (!h) return cap;
  const fria = 2 - h.hander, rymmer = SAKER[h.ting.k]?.rymmer ?? 0;
  return Math.min(cap, (fria === 2 ? cap : fria === 1 ? cap * UTRUSTNING.en : 0) + rymmer);
}
// vad som finns på varje plats: redskapet i den eller de händer det tar (höger först), bördan i de fria händerna (eller i
// korgen), och plaggen p har på sig på kroppens platser
export function utrustning(s: State, p: Person, bar: boolean): Record<Plats, { ting?: Ting; borda?: true }> {
  const r = Object.fromEntries(PLATS_LIST.map(k => [k, {}])) as Record<Plats, { ting?: Ting; borda?: true }>;
  const h = iHanden(s, p);
  if (h) { r.hoger.ting = h.ting; if (h.hander === 2) r.vanster.ting = h.ting; }
  if (bar) {
    if (h && SAKER[h.ting.k]?.rymmer) r.hoger.borda = true;
    else if (!h) { r.hoger.borda = true; r.vanster.borda = true; }
    else if (h.hander === 1) r.vanster.borda = true;
  }
  for (const t of paSig(s, p)) r[SAKER[t.k]!.klad!.plats as Plats].ting = t;
  return r;
}

// ---------- kläderna (steg 2.3.2) ----------
// plaggen p har på sig
export const paSig = (s: State, p: Person) => tingOf(s).filter(t => t.bar === p.id);
// vad de väger, i fulla famnar
const paSigVikt = (s: State, p: Person) => { let v = 0; for (const t of tingOf(s)) if (t.bar === p.id) v += bordOf(t.k); return v; };
// hur mycket kläderna skyddar mot kylan (0 = inget, 1 = helt): varje plagg tar bort sin del (klad.varme) av det som är kvar
export function kladVarme(s: State, p: Person) {
  let kvar = 1;
  for (const t of tingOf(s)) if (t.bar === p.id) kvar *= 1 - SAKER[t.k]!.klad!.varme;
  return 1 - kvar;
}
// i vilken ordning p tar ett plagg: sitt eget, byns, ett lånat. Inom det: bäst skick, och sedan det första bland tingen
const rang = (p: Person, t: Ting) => t.agare === p.id ? 0 : t.agare === BYN ? 1 : 2;
// varje timme: den som saknar ett plagg på en plats tar på sig ett som är fritt (ingen har det på sig, i handen eller i
// bördan), och som hen får ta
export function stepKlader(s: State) {
  if (!tingOf(s).some(t => SAKER[t.k]?.klad)) return;
  for (const p of living(s)) {
    const har = new Set(paSig(s, p).map(t => SAKER[t.k]!.klad!.plats));
    for (const k of KLAD_SLAG) {
      const pl = SAKER[k]!.klad!.plats;
      if (har.has(pl)) continue;
      let best: Ting | undefined;
      for (const t of tingOf(s)) {
        if (t.k !== k || t.bar !== undefined || t.hos !== undefined || t.lass !== undefined || t.halv || !lends(s, t.agare, p)) continue;
        if (!best || rang(p, t) < rang(p, best) || (rang(p, t) === rang(p, best) && t.c > best.c)) best = t;
      }
      if (!best) continue;
      best.bar = p.id; best.x = best.y = best.vid = undefined;
      har.add(pl);
    }
  }
}
