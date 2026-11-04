// Porträtten (steg 5.2.3, "Porträttens byggsätt" under Gränssnitt i designdokumentet): varje person får sina delar och
// färger ur registret PORTRATT i bildstilen (src/portrattkarna.ts, genererad ur karaktärsskaparen). Delarna ges vid
// födseln: ett barn ärver dem från mamman och pappan (barnAv), och de första i byn, nykomlingarna och personerna i byar
// som sparats före porträtten får dem slumpade ur byns frö och personens nummer. Allt räknas ur numret och föräldrarna,
// så att samma person alltid ser likadan ut och simuleringen inte märker något. Bara utseende.
import { ALDER, BERATT, BESK_ANSIKTE, KLADMATERIAL, KROPP, ageOf, blodning, byId, hash, isSick, kladAv, load, moodOf, utbrottNu, utrustning } from '../sim';
import type { Person, State } from '../sim';
import { KARNA } from '../portrattkarna';

// en person i karaktärsskaparens form (skapare.js): kön, ålder, en del per sort, färgerna, humöret och det man bär
export interface Skapad {
  kon: 'kvinna' | 'man'; alder: 'barn' | 'ung' | 'vuxen' | 'gammal'; del: Record<string, string | null>; hud: number; har: number; ogon: number;
  humor: string; skonhet: number; forband: string[]; ogonlapp: boolean; sjuk: boolean; kyla: boolean; blod: boolean;
  klader: { rock: string | null; skor: boolean; balte: boolean }; lagen: Record<string, string>; lager: string[] | null; rynkor: number | null;
  anlag?: { skagg: string | null; frisyr: string | null };
}
// åldern i skaparen: barn tills man är vuxen i byn, ung till 30, vuxen till 55 och sedan gammal (registret aldrar)
export const PORTRATTALDER = { ung: 30, gammal: 55 };
export function alderAv(a: number): 'barn' | 'ung' | 'vuxen' | 'gammal' {
  return a < ALDER.vuxen ? 'barn' : a < PORTRATTALDER.ung ? 'ung' : a < PORTRATTALDER.gammal ? 'vuxen' : 'gammal';
}
// skönheten (steg 5.2.3.3): personens skönhet i byn (p.pot.skonhet, 1–20, 10 i mitten) som skaparens nivå −2 till 2. Den som
// beskrivningen kallar vacker eller ful (BERATT.skon från mitten) är vackrast eller fulast; lite från mitten är vacker eller ful
export const SKONNIVA = { lite: 3 };
export function skonNiva(p: Person) {
  const d = p.pot.skonhet - 10, a = Math.abs(d);
  return Math.sign(d) * (a >= BERATT.skon ? 2 : a >= SKONNIVA.lite ? 1 : 0);
}
const ANSIKTE = ['huvudform', 'ora', 'nasa', 'oga', 'ogonbryn', 'mun'];
const fro = (s: State, id: number) => (Math.imul(s.seed | 0, 0x9e3779b1) ^ Math.imul(id + 1, 0x85ebca6b)) | 0;
const ARV = new Map<string, Skapad>();
// glöm det som räknats (scenariot portratt prövar att samma person blir likadan igen)
export const glomArv = () => ARV.clear();
// arvet: personens delar och färger (det som inte ändras under livet). Ett barn får dem från föräldrarna; den som saknar
// föräldrar i byn får dem slumpade
export function drag(s: State, p: Person, djup = 0): Skapad {
  const k = s.seed + ':' + p.id;
  let d = ARV.get(k);
  if (!d) {
    let n: Skapad;
    const kon = p.sex === 'k' ? 'kvinna' : 'man', r = KARNA.slumpFran(fro(s, p.id));
    const mor = p.mother !== undefined ? byId(s, p.mother) : undefined, far = p.father !== undefined ? byId(s, p.father) : undefined;
    const skon = skonNiva(p);
    if (mor && far && djup < 40) {
      const a = drag(s, mor, djup + 1), b = drag(s, far, djup + 1);
      n = KARNA.barnAv(a, b, r); n.kon = kon;
      // de vanliga och vackra får aldrig en ful del (som i skaparen): då tas förälderns andra del, eller en ny
      if (skon >= 0) for (const del of ANSIKTE) if (KARNA.DEL[n.del[del] ?? '']?.ful) {
        const ann = n.del[del] === a.del[del] ? b.del[del] : a.del[del];
        n.del[del] = ann && !KARNA.DEL[ann]?.ful ? ann : KARNA.radAv(r, del, 'barn', kon, skon);
      }
    } else {
      n = KARNA.slumpPerson(r, { kon, alder: 'vuxen' });
      // skönheten är personens (p.pot.skonhet), och den väljer de fula delarna
      for (const del of [...ANSIKTE, 'frisyr']) n.del[del] = KARNA.radAv(r, del, KARNA.mallAv(n), kon, skon);
    }
    n.skonhet = skon;
    ARV.set(k, d = n);
  }
  return d;
}
// personen som skaparen ritar hen nu: arvet i rätt ålder (barnet får den vuxna frisyren och skägget när hen växer upp).
// Det som skaparen slumpar styr spelet: humöret, skadorna, sjukdomen, kylan och blodet (5.2.3.4, kropp) och kläderna och
// redskapet (5.2.3.5); huvudbonaden kommer när det finns huvudbonader i spelet och ärren när bestående skador finns
// humöret, skadorna, sjukdomen, kylan och blodet som i spelet (steg 5.2.3.4): den som sover blundar, den som har ett utbrott
// är arg, den som flyr eller gömmer sig är rädd, och annars humöret som orden i invånarlistan (moodWord). Ett sår i huvudet
// har förband när det är omlagt, ett blåmärke eller krossår i huvudet syns som blåmärke, och blodet syns när ett sår blöder
export const HUMORGRANS = { glad: 0.75, nojd: 0.55, lugn: 0.4 };
const RADD = new Set(['fly', 'gomma']);
function kropp(s: State, p: Person, del: Record<string, string | null>) {
  const t = p.task, gor = t?.act;
  const m = moodOf(p, s.now);
  const humor = gor === 'sova' && t?.phase === 'do' ? 'sover' : utbrottNu(s, p) ? 'arg' : gor && RADD.has(gor) ? 'radd'
    : m > HUMORGRANS.glad ? 'glad' : m > HUMORGRANS.nojd ? 'nojd' : m > HUMORGRANS.lugn ? 'lugn' : 'ledsen';
  const huvud = (p.skador ?? []).filter(w => w.d === 'huvud');
  const forband = huvud.some(w => w.f) ? ['forband-huvud'] : [];
  if (huvud.some(w => !w.f && (w.k === 'blamarke' || w.k === 'krossar'))) del.blamarke = 'blamarke-1';
  return { humor, forband, ogonlapp: false, sjuk: isSick(p, s.now), kyla: p.warm < KROPP.kallt, blod: blodning(p) > 0 };
}
export function skapad(s: State, p: Person): Skapad {
  const d = drag(s, p), alder = alderAv(ageOf(p, s.now));
  const u: Skapad = alder !== 'barn' && d.anlag ? KARNA.somUng(d) : { ...d, del: { ...d.del } };
  u.alder = alder;
  u.del = { ...u.del, huvudbonad: null, arr: null, blamarke: null, redskap: null };
  Object.assign(u, kropp(s, p, u.del));
  utrustad(s, p, u);
  return u;
}
// kläderna och redskapet som i spelet (steg 5.2.3.5): plaggen personen har på sig (rocken med sitt material, skorna och
// bältet) och redskapet i handen eller i bältet, som delen i PORTRATT med samma sak. Huvudbonaden väntar på huvudbonader i
// spelet (Kläder)
const REDSKAP = new Map<string, string>(KARNA.PR.delar.filter((d: { sort: string; sak?: string }) => d.sort === 'redskap' && d.sak).map((d: { id: string; sak: string }) => [d.sak, d.id]));
function utrustad(s: State, p: Person, u: Skapad) {
  const r = utrustning(s, p, !!p.task && load(p.task, s) > 0);
  u.klader = { rock: null, skor: false, balte: false };
  for (const pl of Object.values(r)) {
    const a = pl.ting && kladAv(pl.ting.k);
    if (!a) continue;
    if (a.plagg === 'rock') u.klader.rock = KLADMATERIAL[a.mat].namn;
    else if (a.plagg === 'skor') u.klader.skor = true;
    else if (a.plagg === 'balte') u.klader.balte = true;
  }
  const h = r.hoger.ting ?? r.krok.ting;
  u.del.redskap = (h && REDSKAP.get(h.k)) ?? null;
}

// det vackraste eller fulaste i ansiktet, med ord (steg 5.2.3.3): beskrivningen (3.9.7) säger det som syns i porträttet.
// Registret: delens id i PORTRATT och orden. De fula delarna går före lagren, och bland flera väljs en ur numret
export const ANSIKTSORD: Record<string, string> = {
  'ora-3': 'öron som står ut', 'nasa-7': 'en krokig näsa', 'nasa-8': 'en stor näsa', 'nasa-12': 'en näsa som varit bruten och står snett',
  'nasa-13': 'en stor, knölig näsa', 'bryn-6': 'ögonbryn som växer ihop över näsan', 'mun-7': 'en liten, trutande mun',
  'mun-8': 'en lucka där en framtand ska sitta', 'har-21': 'tunt, glest hår', 'har-23': 'en kalufs som står åt alla håll',
  'skon-sned': 'sneda drag i ansiktet', 'skon-varta': 'en vårta i ansiktet', 'skon-tander': 'tänder som spretar åt alla håll',
  'skon-fransar': 'långa, mörka ögonfransar', 'skon-kinder': 'rosiga kinder',
};
const OGONORD = ['klarblå ögon', 'grå ögon som ser allt', 'gröna ögon', 'mörka, djupa ögon'];
const HARORD = ['blankt, linblont hår', 'blankt, ljust hår', 'tjockt, ljusbrunt hår', 'tjockt, brunt hår', 'tjockt, mörkt hår', 'flammande rött hår', 'blankt, korpsvart hår', 'vitt hår som lyser i solen'];
export function ansiktsDel(s: State, p: Person): string | undefined {
  const q = skapad(s, p), ful = q.skonhet < 0, val = (l: string[]) => l.length ? l[Math.floor(hash(s.seed, p.id, 12) * l.length)] : undefined;
  if (ful) {
    const delar = [...ANSIKTE, 'frisyr'].map(k => q.del[k]).filter((id): id is string => !!id && !!ANSIKTSORD[id] && KARNA.DEL[id]?.ful);
    const lager = KARNA.PR.delar.filter((d: { sort: string; niva: number }) => d.sort === 'skonhet' && d.niva < 0 && q.skonhet <= d.niva).map((d: { id: string }) => d.id);
    return ANSIKTSORD[val(delar) ?? val(lager) ?? ''];
  }
  const lager = KARNA.PR.delar.filter((d: { sort: string; niva: number; kon?: string }) => d.sort === 'skonhet' && d.niva > 0 && q.skonhet >= d.niva && (!d.kon || d.kon === q.kon)).map((d: { id: string }) => ANSIKTSORD[d.id]);
  return val([...lager, OGONORD[q.ogon], HARORD[q.har]].filter(Boolean));
}
BESK_ANSIKTE.del = ansiktsDel;
