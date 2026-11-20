import type { Person, State } from './typer';
// kroken för klanens märken (steg 12.1.165): tatuering.ts sätter den, och gast.ts och liv.ts anropar den när en gäst eller en
// främling skapas, utan att ladda tatuering.ts (importcirkeln)
export const klanTatKrok = { klan: (_s: State, _p: Person, _klan: number, _r: () => number) => {} };
