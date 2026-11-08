// Scenarierna prövar hur något fungerar, i byar valda för att visa just det, och skrevs på kartan 120 × 120. Deras byar körs
// därför på 120 × 120 (steg 9.1.8), om inte BALANS redan anger kartans storlek. Spelet, testbyarna (npm test), samma-kollen och
// balansen går på kartan som gäller (KARTA i kartflytt.ts). Ett scenario som vill ha en annan storlek anger den i createState.
// Den här filen läses först, före simuleringen, eftersom balanstalen läses en gång när balans.ts laddas
const p = (globalThis as { process?: { env: Record<string, string | undefined> } }).process;
if (p && !/karta\./.test(p.env.BALANS ?? '')) p.env.BALANS = ['karta.bredd=120,karta.hojd=120', p.env.BALANS].filter(Boolean).join(',');
export {};
