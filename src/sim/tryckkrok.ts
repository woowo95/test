// den som ligger vaken i striden trycker på sina sår (steg 15.1.101): kartstrid.ts sätter kroken, halsa.ts frågar den.
// En egen fil utan importer, så att kroken finns när kartstrid.ts läses (halsa.ts och kartstrid.ts läser varandra)
import type { Person, State } from './typer';
export const tryckKrok = { ligger: (_s: State, _p: Person) => false };
