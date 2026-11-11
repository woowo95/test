// Klockan och slagen (steg 10.2.14, "Klockan och slagen" i fliken Läget). Hela byn stegas tillsammans i slag om KLOCKA.slag
// sekunder; när faran är nära blir de kortare (STRID.kortSteg), och när ingen kan nå någon annan blir de längre, upp till
// KLOCKA.langst. Hur ofta varje system räknas står i registret TAKTER (steg.ts), och slaget anropar systemen bara genom det.
import { balans } from './balans';
import { State } from './typer';

export const KLOCKA = balans('klocka', {
  slag: 2, // sekunder i ett slag (mätt i 10.2.13 med npm run kortsteg)
  langst: 60, // ... och som längst, när ingen kan nå någon annan (alla sover)
  sikt: 6, // rutor: två som kan komma så nära varandra under slaget räknas som att de kan nå varandra (synhållet)
});
// det som håller slaget kort, utöver människorna själva: varje rad ger hur många sekunder slaget högst får vara just nu
// (undefined = inget hinder). Systemen lägger till sin rad (rövarna, vargarna, björnen, gästerna, branden, tornadon)
export const SLAGHINDER: ((s: State) => number | undefined)[] = [];
// så många sekunder tills två som går mot varandra med farten v (rutor i sekunden tillsammans) är inom synhåll
export const nasTid = (avstand: number, v: number) => v > 0 ? (avstand - KLOCKA.sikt) / v : Infinity;
