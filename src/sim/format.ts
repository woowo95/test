// tal i text, ett ställe för spelet och bilden: decimalkomma. Det som går in i loggen (eld.ts, seder.ts, behov.ts) skrivs
// med samma hjälpare, så att texten blir densamma överallt
export const num = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
// hela tal från 10 och uppåt, annars en decimal
export const kortTal = (v: number) => v >= 10 ? String(Math.round(v)) : num(v);
