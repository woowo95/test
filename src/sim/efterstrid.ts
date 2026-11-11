// Det som händer när en strid på kartan är slut (steg 10.1.7, kartstrid.ts). En strid tar tid, så den som börjar den (ett rån,
// en holmgång, striden om ledarskapet, ett uppror, en brottningskamp) får veta utgången först när den är över: striden bär en
// rad (efter: vilket slag och det som behövs för att fortsätta, bara tal och text så att den går att spara), och registret
// EFTER har en rad per slag med det som då ska ske. Filen importerar ingenting, så att var och en kan lägga sin rad här utan
// att filerna importerar varandra i cirkel.
import type { State } from './typer';
// egen: raden tar själv hand om följderna för dem som var med (rövarnas strid), i stället för det som gäller ett slagsmål
export type Efter = { typ: string; egen?: boolean } & Record<string, number | string | boolean | undefined>;
// vinnare: sidan som vann (0 = den som började), −1 om ingen vann. g = striden (KartStrid i kartstrid.ts)
export const EFTER: Record<string, (s: State, efter: Efter, vinnare: 0 | 1 | -1, strid: unknown) => void> = {};
// en gäst som dör i en strid på kartan (rövaren: rovare.ts lägger sin krok här). av = den som fällde hen
export const gastKrok: { dod?: (s: State, p: import('./typer').Person, av?: import('./typer').Person) => void; spara?: (s: State, p: import('./typer').Person) => void } = {};
// fler faror som gör att byn går i korta steg (rövare nära byborna, rovare.ts); kartstrid.ts frågar dem i faraNara
export const FAROR: ((s: State) => boolean)[] = [];
// striderna mot djur och rövare (steg 10.1.17): vad såren och döden heter i en strid av det slaget (dödsorsaken och texten på
// såret), och det som sker med den sårade just då (vargbettet som blir infekterat). kartstrid.ts frågar raden för stridens slag
export const STRIDSLAG: Record<string, { orsak: string; text: string; sar?: (s: State, p: import('./typer').Person, w: { k: string; g: number }) => void; dod?: (s: State, p: import('./typer').Person) => void }> = {};
