import { ALDER, ageOf, living } from './folk';
import { halsa } from './halsa';
import { clamp } from './slump';
import { DAY, HOUR, Person, State } from './typer';
import { formogenheter } from './varde';
import { balans } from './balans';

// Humöret (steg 3.2, "Humör, psykiskt mående och ondska" i designdokumentet): ett grundläge, behoven och tankarna
// (think i folk.ts), och förväntningarna (steg 3.2.1). Var och en vänjer sig långsamt vid sin rikedom, värdet av det hen
// äger plus en del av byns gemensamma. Den som blivit rikare än hen är van vid blir gladare och den som blivit fattigare
// ledsnare, och den som är van vid mycket kräver mer för att vara glad. Så blir en rik by inte glad bara av att vara rik,
// och en by som går dåligt vänjer sig.

// ---------- balanstal (regel 8) ----------
export const HUMOR = balans('humor', {
  bas: 0.55, // grundhumöret
  hungerLag: 0.2, hungerMinus: 0.2, // hungern under 0,2 drar ner humöret med 0,2 ...
  hungerHog: 0.6, hungerPlus: 0.05, // ... och över 0,6 upp 0,05
  viloLag: 0.2, viloMinus: 0.12,
  socialLag: 0.2, socialMinus: 0.1,
  socialHog: 0.7, socialPlus: 0.05,
  halsaLag: 0.6, halsaMinus: 0.12,
  // förväntningarna (steg 3.2.1)
  forvDygn: 5, // förväntningen glider mot rikedomen; efter så här många dygn har en ändring nästan två tredjedelar slagit igenom
  forvC: 30, // läggs till både rikedom och förväntan, så att den som äger nästan inget inte svänger av småsaker
  rikare: 0.06, rikareMax: 0.1, // rikare eller fattigare än man är van vid: rikare * ln((rikedom + forvC) / (förväntan + forvC)), högst ± rikareMax
  normal: 150, // en vanlig förväntan (ungefär vad en vuxen äger i en by som klarar sig), som inte ger något
  van: 0.04, vanMax: 0.1, // van vid mer eller mindre än normal: −van * ln((förväntan + forvC) / (normal + forvC)), högst ± vanMax
  visa: 0.01, // mindre än så här räknas inte
});

// ---------- humöret ----------
// snitthumöret i byn; `tom` är värdet när ingen lever
export function avgMood(s: State, tom: number) { const l = living(s); return l.length ? l.reduce((a, p) => a + moodOf(p, s.now), 0) / l.length : tom; }
// humöret och, om ut finns med, delarna det består av (personrutan visar dem). Samma räkning i båda fallen
export function moodOf(p: Person, now: number, ut?: { namn: string; v: number }[]) {
  let m = HUMOR.bas;
  const del = (namn: string, v: number) => { m += v; ut?.push({ namn, v }); };
  if (p.hunger < HUMOR.hungerLag) del('Hungrig', -HUMOR.hungerMinus); else if (p.hunger > HUMOR.hungerHog) del('Mätt', HUMOR.hungerPlus);
  if (p.rest < HUMOR.viloLag) del('Trött', -HUMOR.viloMinus);
  if (p.social < HUMOR.socialLag) del('Ensam', -HUMOR.socialMinus); else if (p.social > HUMOR.socialHog) del('Umgåtts mycket', HUMOR.socialPlus);
  if (halsa(p) < HUMOR.halsaLag) del('Mår dåligt', -HUMOR.halsaMinus);
  if (p.forv) {
    const r = forvRikare(p.forv), v = forvVan(p.forv.f);
    if (Math.abs(r) >= HUMOR.visa) del(r > 0 ? 'Rikare än förut' : 'Fattigare än förut', r);
    if (Math.abs(v) >= HUMOR.visa) del(v < 0 ? 'Van vid mer' : 'Van vid lite', v);
  }
  for (const t of p.thoughts) if (t.until > now) del(t.text, t.v);
  return clamp(m, 0, 1);
}

// ---------- förväntningarna (steg 3.2.1) ----------
const forvRikare = (f: { f: number; w: number }) => clamp(HUMOR.rikare * Math.log((f.w + HUMOR.forvC) / (f.f + HUMOR.forvC)), -HUMOR.rikareMax, HUMOR.rikareMax);
const forvVan = (f: number) => clamp(-HUMOR.van * Math.log((f + HUMOR.forvC) / (HUMOR.normal + HUMOR.forvC)), -HUMOR.vanMax, HUMOR.vanMax);

// en gång i timmen (steg.ts): var och ens rikedom (w) och förväntan (f). Ett barn räknar med föräldrarnas rikedom
// (den rikaste av dem som lever), eftersom det lever på deras. Den som är ny börjar med förväntan lika med rikedomen
export function stepHumor(s: State) {
  const folk = living(s);
  if (!folk.length) return;
  const { egen, byn } = formogenheter(s), del = byn / folk.length;
  const vuxen = (p: Person) => (egen.get(p.id) ?? 0) + del;
  const ids = new Set(folk.map(p => p.id));
  const k = 1 - Math.exp(-HOUR / (HUMOR.forvDygn * DAY));
  for (const p of folk) {
    let w = vuxen(p);
    if (ageOf(p, s.now) < ALDER.vuxen) {
      const f = [p.mother, p.father].filter(id => id !== undefined && ids.has(id)).map(id => vuxen(folk.find(q => q.id === id)!));
      if (f.length) w = Math.max(...f);
    }
    if (!p.forv) p.forv = { f: w, w };
    else { p.forv.w = w; p.forv.f += (w - p.forv.f) * k; }
  }
}
