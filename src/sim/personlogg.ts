// Personens händelser (steg 9.2.107): varje person har en egen kort logg över det som hänt just hen. Registret säger vilka
// händelser som skrivs dit och vilka notiser som ger en rad hos dem notisen gäller; vardagsarbetet, varje samtal, små
// humörsvängningar och det som upprepas varje timme skrivs aldrig dit. Raderna visas i panelen mellan Presentationen och Tiden.
import { DAY, Person, State } from './typer';
import { balans } from './balans';

export const PLOGG = balans('personlogg', {
  rader: 30, // så många rader sparas hos varje person; den äldsta försvinner när det blir fler
  orolig: 7, // texten (steg 9.2.108) är orolig när modet är så här lågt eller lägre (1–20) ...
  modig: 13, // ... och modig när det är så här högt eller högre
  talfor: 14, // talför från den här karisman
  glad: 0.6, // humöret när det hände: glad över detta ...
  nere: 0.4, // ... och nere under detta
  visaHela: 2, // ihopslagna rader (samma slag samma dygn) visar så här många texter, sedan bara hur många till
});

// ton: om händelsen var god eller ond för hen, vilket avgör vilken text som läggs till (steg 9.2.108); en funktion av texten
// när samma slag kan vara båda
export interface PersonloggSlag { namn: string; ikon: string; notiser?: string[]; ton?: 'gott' | 'ont' | ((text: string) => 'gott' | 'ont' | undefined) }
const ontOrd = /\bdog\b|[Bb]röt|[Ss]kilde|skilda vägar|förlorade|ökänd|sämre|insjuknat|smitta/;
const blandat = (text: string) => ontOrd.test(text) ? 'ont' as const : 'gott' as const;
export const PERSONLOGG = {
  skada: { namn: 'Skador', ikon: '🩹', ton: 'ont' },
  sjuk: { namn: 'Sjukdom', ikon: '🦠', notiser: ['sjuk'], ton: (x: string) => /frisk/.test(x) ? 'gott' : 'ont' },
  strid: { namn: 'Strider', ikon: '⚔️', notiser: ['strid'], ton: 'ont' },
  fara: { namn: 'Faror hen sett', ikon: '⚠️', notiser: ['anfall', 'motgang', 'varsel'], ton: 'ont' },
  lart: { namn: 'Det hen lärt sig', ikon: '🧠', notiser: ['mastare'], ton: 'gott' },
  masterverk: { namn: 'Mästerverk', ikon: '🏅', notiser: ['masterverk'], ton: 'gott' },
  titel: { namn: 'Titlar', ikon: '👑', notiser: ['ledare'], ton: blandat },
  hus: { namn: 'Hus', ikon: '🏠', notiser: ['hus'], ton: 'gott' },
  flytt: { namn: 'Flytt', ikon: '🎒', notiser: ['utflytt', 'inflytt'] },
  yrke: { namn: 'Nytt yrke', ikon: '🪪', ton: 'gott' },
  relation: { namn: 'Vänner och ovänner', ikon: '🤝', notiser: ['par'], ton: blandat },
  match: { namn: 'Matcher', ikon: '🏅', notiser: ['match'] },
  nara: { namn: 'De som står hen nära', ikon: '👥', notiser: ['fodd', 'dod', 'gravid'], ton: blandat },
} satisfies Record<string, PersonloggSlag>;
export type PersonloggId = keyof typeof PERSONLOGG;
export type PersonRad = [t: number, k: PersonloggId, text: string, h?: number]; // h = humöret när det hände, 0–9

// humöret sätts av humor.ts när den laddas, så att filerna inte importerar varandra i en ring
let humorAv: (p: Person, nu: number) => number = () => 0.5;
export const satHumor = (f: typeof humorAv) => { humorAv = f; };
const avNotis: Record<string, PersonloggId> = {};
for (const [k, v] of Object.entries(PERSONLOGG) as [PersonloggId, PersonloggSlag][]) for (const n of v.notiser ?? []) avNotis[n] = k;

// en rad hos personen
export function personHand(s: State, p: Person, k: PersonloggId, text: string) {
  if (p.died !== undefined && p.died < s.now) return;
  const h = (p.hand ??= []);
  if (h.some(r => r[1] === k && r[2] === text && s.now - r[0] < DAY)) return; // samma sak samma dygn står redan där
  h.push([s.now, k, text, Math.max(0, Math.min(9, Math.round(humorAv(p, s.now) * 9)))]);
  if (h.length > PLOGG.rader) h.splice(0, h.length - PLOGG.rader);
}
// en notis ger en rad hos dem den gäller, om registret säger det (notiser.ts)
export function personNotis(s: State, id: string, text: string, ids: number[]) {
  const k = avNotis[id]; if (!k) return;
  for (const i of ids) { const p = s.people.find(q => q.id === i); if (p) personHand(s, p, k, text); }
}
// de som står p nära: föräldrar, barn, syskon, partner och bästa vän, levande och utom de som redan fått raden
export const naraAv = (s: State, p: Person) => s.people.filter(q => q !== p && q.died === undefined && (
  q.id === p.mother || q.id === p.father || q.mother === p.id || q.father === p.id || q.partner === p.id || p.partner === q.id || q.bast === p.id
  || (p.mother !== undefined && q.mother === p.mother) || (p.father !== undefined && q.father === p.father)));
export function personNara(s: State, p: Person, text: string, utom: number[] = []) {
  for (const q of naraAv(s, p)) if (!utom.includes(q.id)) personHand(s, q, 'nara', text);
}

// raderna som visas, ihopslagna och med tillägget efter personligheten och humöret: personRader i berattelser.ts (steg 9.2.108)
