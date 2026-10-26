// Balanstalen: talen som avgör hur spelet går (gränser, vikter, takter, reserver), med namn och samlade per system.
// Varje system lägger sina tal i ett block överst i sin fil: const KROPP = balans('kropp', { fryser: 0.35, … }), och läser KROPP.fryser.
// Testerna kan pröva ett annat värde utan att ändra koden: miljövariabeln BALANS="kropp.fryser=0.3,liv.barnMin=0.2"
// (en lista: "djur.storlek=2/5") gäller i varje testprocess. `npm run jamfor -- --satt kropp.fryser=0.3` kör samma byar
// utan och med och säger om det blev bättre eller sämre, och `npm run jamfor -- --svep kropp.fryser=0.25/0.3/0.4` (eller
// 0.2:0.5:0.05) visar nyckeltalen för varje värde bredvid värdet i koden. I spelet finns ingen BALANS, så talen är alltid
// de som står i koden. `npm run talen` skriver ut alla, och `npm run talen -- kropp` eller `-- fryser` bara de som matchar.
type Tal = number | readonly number[];
const ALLA: Record<string, Readonly<Record<string, Tal>>> = {};

// BALANS läses en gång, när den här filen laddas
const SATT: Record<string, Tal> = {};
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.BALANS;
for (const del of (env ?? '').split(',')) {
  if (!del.trim()) continue;
  const [namn, v] = del.split('=').map(x => x.trim());
  const tal = (v ?? '').split('/').map(Number);
  if (!namn || !v || tal.some(x => !isFinite(x))) throw new Error(`BALANS: "${del}" ska vara system.namn=tal (eller tal/tal/tal)`);
  SATT[namn] = tal.length === 1 ? tal[0] : tal;
}

export function balans<T extends Record<string, Tal>>(system: string, tal: T): Readonly<T> {
  if (ALLA[system]) throw new Error(`balans: systemet '${system}' finns redan`);
  const t = tal as Record<string, Tal>;
  for (const k of Object.keys(t)) {
    const v = SATT[system + '.' + k];
    if (v === undefined) continue;
    if (typeof v !== typeof t[k] || (Array.isArray(v) && v.length !== (t[k] as readonly number[]).length)) throw new Error(`BALANS: ${system}.${k} ska vara ${JSON.stringify(t[k])}s form`);
    t[k] = v;
  }
  for (const k of Object.keys(t)) if (Array.isArray(t[k])) Object.freeze(t[k]);
  ALLA[system] = Object.freeze(t);
  return tal;
}

// alla balanstal per system (för `npm run talen`), och namnen i BALANS som inget system har (stavfel)
export const balansTal = (): Readonly<Record<string, Readonly<Record<string, Tal>>>> => ALLA;
export const okandaBalans = () => Object.keys(SATT).filter(n => { const i = n.indexOf('.'); return !(ALLA[n.slice(0, i)] && n.slice(i + 1) in ALLA[n.slice(0, i)]); });
