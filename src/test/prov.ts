// npm run prov -- [antal byar = 6] [dygn = 35]
// Provet med gångstråken (steg 6.2.6): samma byar med och utan stråken, bredvid varandra. Skriver siffrorna per by och sidan
// prov.html med en bild per by och läge: husen, stråken (gula), rutan framför en dörr (orange) och byns gräns.
import './utc';
import { writeFileSync } from 'node:fs';
import { korJson, pool, seedAv, sek } from './pool';

const [antal = 6, dagar = 35] = process.argv.slice(2).map(Number);
const seeds = Array.from({ length: antal }, (_, i) => seedAv(i));
type Karta = { x0: number; y0: number; w: number; h: number; ruta: string[]; strak: string; inne: string; mitt: { x: number; y: number } };
type Ut = { seed: number; utan: boolean; pop: number; hus: number; fran: number; franMed: number; mellan: number; mellanMin: number; samre: number; ingen: number; om: number; eld: number; lager: number; yta: number; karta: Karta; vakter: string[] };
const t0 = Date.now();
const kor = (utan: boolean) => seeds.map(seed => () => korJson<Ut>('prov-en.ts', [String(seed), String(dagar)], `by ${seed}`, utan ? { BALANS: 'strak.pa=0' } : {}));
const alla = await pool([...kor(false), ...kor(true)]);
const med = alla.slice(0, antal), utan = alla.slice(antal);

const KOL: [string, (r: Ut) => number, number][] = [
  ['invånare', r => r.pop, 0], ['hus', r => r.hus, 0], ['längst från mitten', r => r.fran, 1], ['husen från mitten (median)', r => r.franMed, 1],
  ['mellan husen (median)', r => r.mellan, 0], ['närmast två hus', r => r.mellanMin, 0], ['sämre plats för ett stråk', r => r.samre, 0],
  ['ingen plats', r => r.ingen, 0], ['stråk drogs om', r => r.om, 0], ['dörr till elden, rutor', r => r.eld, 1], ['dörr till lagret, rutor', r => r.lager, 1], ['byns yta, rutor', r => r.yta, 0],
];
console.log(`${antal} byar, ${dagar} dygn (${dagar} år i spelet), med och utan gångstråken (${sek(t0)} s, datorns tid)`);
for (let i = 0; i < antal; i++) {
  console.log(`by ${seeds[i]}:` + ' '.repeat(18) + 'med'.padStart(8) + 'utan'.padStart(8));
  for (const [namn, f, d] of KOL) console.log('  ' + namn.padEnd(28) + f(med[i]).toFixed(d).padStart(8) + f(utan[i]).toFixed(d).padStart(8));
}
const larm = alla.flatMap(r => r.vakter.map(v => `by ${r.seed} ${r.utan ? 'utan' : 'med'}: ${v}`));
console.log(larm.length ? 'VAKTER LARMAR:\n  ' + larm.join('\n  ') : 'Vakter: inga fel.');

// sidan: varje by på en rad, med och utan bredvid varandra, siffrorna under bilden
const FARG: Record<string, string> = { V: '#3f6f8f', S: '#8a8a80', T: '#3c5a32', '.': '#7f9a52', '#': '#6b4a2a', '+': '#b08a5c', D: '#e8d8a0', F: '#9c7a3c', L: '#c9b98a', X: '#5b5b74', E: '#e0622a' };
const html = `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Provet med gångstråken</title>
<style>:root{--bg:#f4f1ea;--fg:#2b2620;--mut:#6d655a;--kort:#fffdf8;--kant:#ddd4c4}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#1d1b18;--fg:#ece6da;--mut:#a59c8e;--kort:#27241f;--kant:#3a352d}}
:root[data-theme="dark"]{--bg:#1d1b18;--fg:#ece6da;--mut:#a59c8e;--kort:#27241f;--kant:#3a352d}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif}main{max-width:1100px;margin:0 auto;padding:16px}
h1{font-size:22px;margin:0 0 4px}p{color:var(--mut);margin:0 0 16px}.by{background:var(--kort);border:1px solid var(--kant);border-radius:10px;padding:12px;margin-bottom:16px}
.par{display:flex;gap:12px;flex-wrap:wrap}.lage{flex:1 1 300px;min-width:0}canvas{width:100%;height:auto;image-rendering:pixelated;border-radius:6px}
table{border-collapse:collapse;width:100%;font-size:13px;margin-top:8px}td{padding:2px 6px;border-top:1px solid var(--kant)}td:nth-child(n+2){text-align:right;font-variant-numeric:tabular-nums}
.sym{display:flex;gap:12px;flex-wrap:wrap;font-size:13px;color:var(--mut);margin-bottom:16px}.sym i{display:inline-block;width:12px;height:12px;border-radius:2px;vertical-align:-2px;margin-right:4px}</style></head>
<body><main><h1>Provet med gångstråken</h1><p>${antal} byar i ${dagar} dygn (${dagar} år i spelet, ${Math.round(dagar / 7)} veckor i verkligheten). Till vänster med stråken, till höger utan (där stråken bara ritas).</p>
<div class="sym"><span><i style="background:#f2d14b"></i>stråk</span><span><i style="background:#f08a24"></i>framför en dörr</span><span><i style="background:#6b4a2a"></i>vägg</span><span><i style="background:#e8d8a0"></i>öppning</span><span><i style="background:#c9b98a"></i>lager</span><span><i style="background:#9c7a3c"></i>fält</span><span><i style="background:#5b5b74"></i>station</span><span><i style="background:#e0622a"></i>eld</span><span><i style="border:2px solid #fff;box-sizing:border-box;background:none"></i>byns gräns</span></div>
<div id="byar"></div></main>
<script>const D=${JSON.stringify({ seeds, med, utan, KOL: KOL.map(k => k[0]) })},F=${JSON.stringify(FARG)},V=${JSON.stringify(KOL.map(k => k[2]))};
const VAL=[${KOL.map(k => k[1].toString()).join(',')}];
const P=6;function rita(k){const c=document.createElement('canvas');c.width=k.w*P;c.height=k.h*P;const g=c.getContext('2d');
for(let y=0;y<k.h;y++)for(let x=0;x<k.w;x++){g.fillStyle=F[k.ruta[y][x]]||'#000';g.fillRect(x*P,y*P,P,P);const s=k.strak[y*k.w+x];
if(s!=='0'&&'.T'.includes(k.ruta[y][x])){g.fillStyle=s==='2'?'#f08a24':'#f2d14b';g.fillRect(x*P+1,y*P+1,P-2,P-2)}}
g.fillStyle='#ffffff';const inne=(x,y)=>x>=0&&y>=0&&x<k.w&&y<k.h&&k.inne[y*k.w+x]==='1';
for(let y=0;y<k.h;y++)for(let x=0;x<k.w;x++)if(inne(x,y)){if(!inne(x-1,y))g.fillRect(x*P,y*P,1,P);if(!inne(x+1,y))g.fillRect(x*P+P-1,y*P,1,P);if(!inne(x,y-1))g.fillRect(x*P,y*P,P,1);if(!inne(x,y+1))g.fillRect(x*P,y*P+P-1,P,1)}
g.strokeStyle='#fff';g.beginPath();g.arc(k.mitt.x*P+P/2,k.mitt.y*P+P/2,P,0,7);g.stroke();return c}
const ut=document.getElementById('byar');D.seeds.forEach((sd,i)=>{const d=document.createElement('section');d.className='by';d.innerHTML='<b>By '+sd+'</b>';
const par=document.createElement('div');par.className='par';for(const [namn,r] of [['med stråken',D.med[i]],['utan',D.utan[i]]]){const l=document.createElement('div');l.className='lage';
l.append(namn,document.createElement('br'),rita(r.karta));par.append(l)}d.append(par);
const t=document.createElement('table');t.innerHTML='<tr><td></td><td>med</td><td>utan</td></tr>'+D.KOL.map((n,j)=>'<tr><td>'+n+'</td><td>'+VAL[j](D.med[i]).toFixed(V[j])+'</td><td>'+VAL[j](D.utan[i]).toFixed(V[j])+'</td></tr>').join('');d.append(t);ut.append(d)});</script></body></html>`;
writeFileSync('prov.html', html);
console.log('Sidan: prov.html');
