// Steg 11.9.2: ett utsnitt av spelets världskarta, som den ritas nu (varldbild.ts) och på pergament (pergament.ts), för
// kortet f11_pergament i bildstilens valdel. Kör: npx tsx bildstil/varldkarta.ts [by]; ger bildstil/varldkarta.json, där
// varje punkt är färgens nummer i paletten (0–31, skrivet 0–9 och a–v).
import * as fs from 'fs';
import * as SIM from '../src/sim';
import { ritaVarld, VK } from '../src/ui/varldbild';
import { ritaPergament } from '../src/ui/pergament';
import { FARGER } from '../src/palett';

const by = +(process.argv[2] ?? 7), BW = 22, BH = 13; // utsnittet i världsrutor
const fro = SIM.varldFro(by), v = SIM.skapaVarldMark(fro), vl = SIM.packaVarld(fro, v);
// utsnittet där flest sorter syns: alla marksorter, en flod, kusten och platser
let x0 = 0, y0 = 0, bast = -1;
for (let y = 0; y + BH <= v.h; y += 2) for (let x = 0; x + BW <= v.w; x += 2) {
  const n = new Map<number, number>(); let fl = 0, pl = 0;
  for (let dy = 0; dy < BH; dy++) for (let dx = 0; dx < BW; dx++) { const i = (y + dy) * v.w + x + dx; n.set(v.mark[i], (n.get(v.mark[i]) ?? 0) + 1); if (v.flod[i] === SIM.FLOD_NEDRE) fl++; }
  pl = (vl.platser ?? []).filter(p => p.x >= x && p.y >= y && p.x < x + BW && p.y < y + BH).length;
  const p = [...n.values()].filter(c => c >= 6).length * 10 + Math.min(fl, 8) + Math.min(pl, 4) * 2;
  if (p > bast) { bast = p; x0 = x; y0 = y; }
}
const NR = new Map(FARGER.map((h, i) => [h.toLowerCase(), i]));
const kod = (b: { w: number; h: number; data: Uint8ClampedArray }) => {
  const rader: string[] = [];
  for (let y = y0 * VK; y < (y0 + BH) * VK; y++) {
    let r = '';
    for (let x = x0 * VK; x < (x0 + BW) * VK; x++) {
      const i = (y * b.w + x) * 4, hex = '#' + [0, 1, 2].map(k => b.data[i + k].toString(16).padStart(2, '0')).join('');
      const n = NR.get(hex); if (n === undefined) throw new Error('färg utanför paletten: ' + hex);
      r += n.toString(32);
    }
    rader.push(r);
  }
  return rader;
};
fs.writeFileSync('bildstil/varldkarta.json', JSON.stringify({ by, w: BW * VK, h: BH * VK, nu: kod(ritaVarld(vl, v)), ny: kod(ritaPergament(vl, v)) }));
console.log('ok', by, x0, y0);
