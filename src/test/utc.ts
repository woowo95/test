// Testerna räknar i UTC på alla datorer, så att de ger samma resultat var de än körs: klockslag, dygn och vädret i en by
// beror på tidszonen. Importeras först i varje testskript, före allt annat, och barnprocesserna ärver tidszonen.
// Ett scenario med env: STOCKHOLM (hjalp.ts) körs i en egen process med TIDSZON satt. utseende.ts importerar inte den här
// filen: den räknar i svensk tid, som webbläsaren den visar byn i.
process.env.TZ = process.env.TIDSZON ?? 'UTC';
