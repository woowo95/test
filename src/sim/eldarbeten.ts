// Elden är ett verktyg (fliken Bygga, odla och äta, Elden): arbetet som behöver en eld som brinner tänder den och lägger på ved
// först, så att den brinner arbetet ut (eldForst i eld.ts). Registret ELDARBETEN har en rad per sådant arbete: elden det görs vid
// och hur många timmar elden ska brinna för det (med det som står på elden efteråt). Raderna sätts i filerna där arbetena finns
// (matlagning.ts, torst.ts, projekt.ts). Filen importerar inget, så att raderna kan sättas när filerna läses
import type { Act, Fire, Person, State } from './typer';

export interface EldArbete { eld: (s: State, p: Person) => Fire | undefined; tim: (s: State, p: Person) => number }
export const ELDARBETEN: Partial<Record<Act, EldArbete>> = {};
