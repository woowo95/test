// En by ur spelet (en fil från webbläsaren, steg 12.1.40) räknas i svensk tid, som webbläsaren räknade den, så att den går vidare
// likadant här. Importeras först, före allt annat (som utc.ts i testerna). TIDSZON går före
process.env.TZ = process.env.TIDSZON ?? 'Europe/Stockholm';
