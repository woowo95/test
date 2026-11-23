// ---------- krokarna för färgen (steg 13.3.2–13.3.5, farg.ts) ----------
// Färgen läses och påverkas av system som laddas före farg.ts (ryktena, förrådsmålen, döden, gåvorna). De anropar krokarna
// här, som farg.ts sätter, så att ingen importring uppstår. Filen importerar inget.
type S = any; type P = any;
export const fargKrok = {
  anseende: (_s: S, _f: string) => 0, // anseendet ett plagg i färgen ger (rykten.ts)
  vaxter: {} as Record<string, number>, // det mesta ett bad tar av varje färgväxt (forradsmal.ts)
  fodd: (_s: S, _p: P) => {}, // en ny människa kan födas med en favoritfärg (startSmak i rykten.ts)
  samtal: (_a: P, _b: P, _op: number) => {}, // i ett samtal berättar a om sin favoritfärg (berattaSmak i rykten.ts)
  handelse: (_s: S, _p: P, _h: string, _offer: P) => {}, // offret för ett våld får avsmak för färgen den våldsamme bar (rykten.ts)
  dodFarg: (_s: S, _p: P): string | undefined => undefined, // färgen den döda bar (liv.ts, före arvet)
  sorjer: (_q: P, _farg: string) => {}, // den som sörjer får tycke för den dödas färg (liv.ts)
  gava: (_s: S, _g: P, _m: P, _ting: { farg?: string }[]) => {}, // en färgad gåva av någon man tycker om (byte.ts)
};
