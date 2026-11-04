// Djuren på kartan till spelet (steg 5.1.11): kör bildstil/djur.js och skriver src/djurbilder.ts med Björns valda
// ritningar (vargen version 1, haren version 2 och 3) och pälsarna. Kör från repots rot: node bildstil/djurtillspelet.cjs.
const fs = require('fs'), path = require('path'), vm = require('vm');
const BS = __dirname, ctx = { window: {}, VAL: [] };
vm.runInNewContext(fs.readFileSync(path.join(BS, 'djur.js'), 'utf8'), ctx);
const { VARG, KANIN, PALS, FAST } = ctx.window.DJURBILD;
const VALDA = { varg: [VARG[0]], kanin: [KANIN[1], KANIN[2]] }; // bildstilens beslut (djur_varg val 1; djur_kanin version 2 och 3)
const ut = { ritningar: VALDA, pals: { varg: PALS.varg.map(p => p[1]), kanin: PALS.kanin.map(p => p[1]) }, fast: FAST };
const text = `// GENERERAD av bildstil/djurtillspelet.cjs ur bildstil/djur.js (steg 5.2.4.6 och 5.1.11). Ändra inte här: rita om i
// bildstilen och kör node bildstil/djurtillspelet.cjs. Varje ritning har tre håll: sida (österut; västerut speglas den), fram
// (söderut) och bak (norrut). Bokstäverna är pälsens toner (o kontur, d mörk, m mellan, l ljus, c gräddvit, b vit) och
// fasta färger (FAST: k svart, r rosa, a gul), som [ramp, ton] i paletten (src/palett.ts).
export type Hall = 'sida' | 'fram' | 'bak';
export type Ton = [string, 0 | 1 | 2 | 3];
export const DJURBILDER: { ritningar: Record<'varg' | 'kanin', Record<Hall, string[]>[]>; pals: Record<'varg' | 'kanin', Record<string, Ton>[]>; fast: Record<string, Ton> } = ${JSON.stringify(JSON.parse(JSON.stringify(ut)))};
`;
fs.writeFileSync(path.join(BS, '..', 'src', 'djurbilder.ts'), text);
console.log(`src/djurbilder.ts: ${Object.values(VALDA).flat().length} ritningar, ${Math.round(text.length / 1024)} KB`);
