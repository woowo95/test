// Balanstalen: talen som avgör hur spelet går (gränser, vikter, takter, reserver), med namn och samlade per system.
// Varje system lägger sina tal i ett block överst i sin fil: const T = balans('val', { fryser: 0.35, … }), och läser T.fryser.
// Testerna kan pröva ett annat värde utan att ändra koden: miljövariabeln BALANS="val.fryser=0.3,liv.barn=2"
// (en lista: "lager.prio=1/2/3") gäller i varje testprocess, också i `npm run jamfor`, där den gäller både nya koden och
// versionen den jämförs mot (om den också har balans()). I spelet finns ingen BALANS, så talen är alltid de som står i
// koden. `npm run talen` skriver ut alla.
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
