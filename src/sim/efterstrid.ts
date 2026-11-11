// Det som händer när en strid på kartan är slut (steg 10.1.7, kartstrid.ts). En strid tar tid, så den som börjar den (ett rån,
// en holmgång, striden om ledarskapet, ett uppror, en brottningskamp) får veta utgången först när den är över: striden bär en
// rad (efter: vilket slag och det som behövs för att fortsätta, bara tal och text så att den går att spara), och registret
// EFTER har en rad per slag med det som då ska ske. Filen importerar ingenting, så att var och en kan lägga sin rad här utan
// att filerna importerar varandra i cirkel.
import type { State } from './typer';
export type Efter = { typ: string } & Record<string, number | string | boolean | undefined>;
// vinnare: sidan som vann (0 = den som började), −1 om ingen vann. g = striden (KartStrid i kartstrid.ts)
export const EFTER: Record<string, (s: State, efter: Efter, vinnare: 0 | 1 | -1) => void> = {};
