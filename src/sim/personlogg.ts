// Personens händelser (steg 9.2.107): varje person har en egen kort logg över det som hänt just hen. Registret säger vilka
// händelser som skrivs dit och vilka notiser som ger en rad hos dem notisen gäller; vardagsarbetet, varje samtal, små
// humörsvängningar och det som upprepas varje timme skrivs aldrig dit. Raderna visas i panelen mellan Presentationen och Tiden.
import { DAY, Person, State } from './typer';
import { balans } from './balans';

export const PLOGG = balans('personlogg', {
  rader: 30, // så många rader sparas hos varje person; den äldsta försvinner när det blir fler
});

export interface PersonloggSlag { namn: string; ikon: string; notiser?: string[] }
export const PERSONLOGG = {
  skada: { namn: 'Skador', ikon: '🩹' },
  sjuk: { namn: 'Sjukdom', ikon: '🤒', notiser: ['sjuk'] },
  strid: { namn: 'Strider', ikon: '⚔️', notiser: ['strid'] },
  fara: { namn: 'Faror hen sett', ikon: '⚠️', notiser: ['anfall', 'motgang', 'varsel'] },
  lart: { namn: 'Det hen lärt sig', ikon: '💡', notiser: ['mastare'] },
  masterverk: { namn: 'Mästerverk', ikon: '🏆', notiser: ['masterverk'] },
  titel: { namn: 'Titlar', ikon: '👑', notiser: ['ledare'] },
  hus: { namn: 'Hus', ikon: '🏠', notiser: ['hus'] },
  flytt: { namn: 'Flytt', ikon: '🎒', notiser: ['utflytt', 'inflytt'] },
  yrke: { namn: 'Nytt yrke', ikon: '🔨' },
  relation: { namn: 'Vänner och ovänner', ikon: '🤝', notiser: ['par'] },
  match: { namn: 'Matcher', ikon: '🏅', notiser: ['match'] },
  nara: { namn: 'De som står hen nära', ikon: '👪', notiser: ['fodd', 'dod', 'gravid'] },
} satisfies Record<string, PersonloggSlag>;
export type PersonloggId = keyof typeof PERSONLOGG;
export type PersonRad = [t: number, k: PersonloggId, text: string];

const avNotis: Record<string, PersonloggId> = {};
for (const [k, v] of Object.entries(PERSONLOGG) as [PersonloggId, PersonloggSlag][]) for (const n of v.notiser ?? []) avNotis[n] = k;

// en rad hos personen
export function personHand(s: State, p: Person, k: PersonloggId, text: string) {
  if (p.died !== undefined && p.died < s.now) return;
  const h = (p.hand ??= []);
  if (h.some(r => r[1] === k && r[2] === text && s.now - r[0] < DAY)) return; // samma sak samma dygn står redan där
  h.push([s.now, k, text]);
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
