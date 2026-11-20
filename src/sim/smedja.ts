// Smedjan (steg 12.2.4, Landskapet och järnet: Järnet: Smedjan). Smedjan är en station inne, 3 × 2 rutor, med delarna Ässjan och
// Städet, där allt smide görs och bara där (Regeln för stationerna), och där det oftare blir bra kvalitet, som vid
// snickarbänken. Järnet i den är hammaren och tången, så byns första järn går in i smedjan. Ässjan är en stationseld
// (ELDSTATIONER i stationseld.ts) som brinner på kol: 2 kol i timmen, och den rymmer 4, så en kol räcker en halvtimme, sex
// smiden i rad. Smidet går bara när ässjan brinner. En ässja som redan brinner höjer poängen för att smida (smidaFaktor, i
// bastaProjekt i projekt.ts), så smeden samlar gärna sina arbeten. Ett rum med smedjan i får rumstaggen Smedja (rum.ts).
// Tekniken Smide (id smedja, som stationen) kräver Kolning och Stenhuggarplats och öppnas när byn har haft järn, också köpt;
// byn har haft järn räknas i haftSteg i teknik.ts (steg 12.1.4)
import { balans } from './balans';
import { State } from './typer';
import { ELDSTATIONER, stationBrinner } from './stationseld';
import { STATIONER, isKlar, stationerOf } from './stationer';

export const SMIDE = balans('smide', {
  kolTim: 2, // ässjan bränner så här många kol i timmen ...
  kolMax: 4, // ... och rymmer så här många
  brinner: 1.5, // en ässja som redan brinner gör det så här mycket mer värt att smida
  varme: 0.35, radie: 2.5, // ässjan värmer den som står nära, som örtkökets eld
});
ELDSTATIONER.smedja = { burn: SMIDE.kolTim, max: SMIDE.kolMax, varme: SMIDE.varme, radie: SMIDE.radie, kravs: true, bransle: 'kol' };
// arbetena som görs vid smedjan
const smide = () => (STATIONER as Record<string, { gor: readonly string[] }>).smedja?.gor ?? [];
// värdet av att göra act gånger detta: mer när det smids och ässjan redan brinner
export const smidaFaktor = (s: State, act: string) => smide().includes(act) && stationerOf(s).some(t => t.k === 'smedja' && isKlar(t) && stationBrinner(t)) ? SMIDE.brinner : 1;
