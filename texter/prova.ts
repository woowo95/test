// Provet av förslagen (texter/README.md): fyller varje ny variant i texter/forslag.ts med exempelfälten och kör spelets
// kontroller (KONTROLLER och STIL i src/test/textkoll.ts) och de nya (NYA_KONTROLLER) på dem. Kör också de nya
// kontrollerna på texterna som spelet skrev i mätningen före (texter.json från npm run texter och loggraderna från
// texter/loggrader.ts), så att det syns hur många fel de hittar i dag. Ändrar inget i spelet.
//   npx tsx texter/prova.ts [texter.json] [loggrader.json …]
// Skriver texter/prova.txt och texter/forslag.json (det sidan Texterna visar).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { BERATTELSER, fyll, type Fyllning, type Variant } from '../src/sim/berattelser';
import { KONTROLLER, STIL, type Kontroll } from '../src/test/textkoll';
import { LARA, NAR_AKT, NYA_FALT, NYA_KONTROLLER, NYA_MALLAR, NYA_VARIANTER, RATTELSER } from './forslag';

const [tj = 'texter.json', ...loggar] = process.argv.slice(2);
const ut: string[] = [];
const tx = (v: Variant) => typeof v === 'string' ? v : v.t;
// fälten som alla exempel har om inget annat står (en man och en kvinna)
const BAS: Fyllning = { namn: 'Ask', helt: 'Ask Eken', hen: 'han', honom: 'honom', hans: 'hans', med: 'Ylva', om: 'Ylva', mot: 'Ylva', av: 'Ylva', honom2: 'henne', vinnare: 'Ylva', orsak: 'efter ett gräl', alder: 'man' };
// värden som prövas när en variant har ett villkor: först exemplet, sedan med ett värde till, sedan två
const PROV: Fyllning[] = [
  { desperat: true }, { fara: true }, { barn: true }, { ingen: true }, { natt: true }, { kallt: true }, { ung: true }, { gammal: true }, { glad: true },
  { gral: true }, { sida: true }, { slag: true }, { mycketPrat: true, talks: 30 }, { talks: 3 }, { omUng: true }, { tillst: true }, { falskt: true }, { ensam: true },
  { heder: true }, { nar: 'när han fällde ett träd' }, { sorjer: 'Ylva' }, { regn: true }, { inne: true }, { plats: 'vid stenarna' }, { plats: 'i sanden vid stranden' },
  { arstid: 'hösten' }, { yrke: 'samlare' }, { orsak2: 'Efter ett gräl' }, { som: true }, { kin: true },
];
const utan = (f: Fyllning, k: string) => { const g = { ...f }; delete g[k]; return g; };
function passar(v: Variant, ex: Fyllning): Fyllning | undefined {
  if (typeof v === 'string') return ex;
  const kand: Fyllning[] = [ex, ...Object.keys(ex).map(k => utan(ex, k)), ...PROV.map(p => ({ ...ex, ...p }))];
  for (let i = 0; i < PROV.length; i++) for (let j = i + 1; j < PROV.length; j++) kand.push({ ...ex, ...PROV[i], ...PROV[j] });
  for (const k of [...kand]) for (const n of Object.keys(ex)) kand.push(utan(k, n));
  return kand.find(f => v.om(f));
}
// könet för den som heter namn: ur exemplets hen
const konAv = (f: Fyllning) => (n: string) => n === f.namn ? (f.hen === 'hon' ? 'k' : 'm') : undefined;
const alla = [...KONTROLLER, ...NYA_KONTROLLER];
const kolla = (t: string, f: Fyllning, lista: Kontroll[] = alla) => lista.map(k => ({ id: k.id, vad: k.hitta(t, f, konAv(f), true) })).filter(x => x.vad !== undefined);

// ---------- 1. de nya varianterna ----------
interface Prov { mall: string; ny: boolean; fore: number; efter: number; varianter: { t: string; villkor: boolean; text: string; fel: string[]; ny: boolean }[] }
const prov: Prov[] = [];
let felN = 0, nyaN = 0;
const provMall = (mall: string, gamla: Variant[], nya: Variant[], ta_bort: string[], exempel: Fyllning[], ny: boolean) => {
  const behall = gamla.filter(v => !ta_bort.includes(tx(v)));
  const p: Prov = { mall, ny, fore: gamla.length, efter: behall.length + nya.length, varianter: [] };
  for (const v of [...behall.map(v => [v, false] as const), ...nya.map(v => [v, true] as const)]) {
    const [vv, arNy] = v;
    let text = '', fel: string[] = [];
    for (const ex0 of exempel.length ? exempel : [{}]) {
      const f = passar(vv, { ...BAS, ...ex0 });
      if (!f) { if (arNy) fel = ['villkoret går aldrig att uppfylla med exemplen']; break; }
      const t = fyll(tx(vv), f);
      text ||= t;
      if (arNy) fel.push(...kolla(t, f).map(x => `${x.id}: ${x.vad}`));
    }
    if (arNy) { nyaN++; if (fel.length) felN++; }
    p.varianter.push({ t: tx(vv), villkor: typeof vv !== 'string', text, fel: [...new Set(fel)], ny: arNy });
  }
  // samma början på två varianter i samma mall (de två första orden, utan fälten)
  const borjan = p.varianter.map(x => x.t.split(' ').slice(0, 2).join(' ').toLowerCase());
  for (const [i, x] of p.varianter.entries()) if (x.ny && borjan.indexOf(borjan[i]) !== i && !/^\{/.test(borjan[i])) x.fel.push(`sammaBorjan: ${borjan[i]}`);
  prov.push(p);
};
for (const [mall, n] of Object.entries(NYA_VARIANTER)) provMall(mall, (BERATTELSER as Record<string, Variant[]>)[mall] ?? [], n.varianter, n.ta_bort ?? [], n.exempel, false);
for (const [mall, n] of Object.entries(NYA_MALLAR)) if (n.varianter.length) provMall(mall, [], n.varianter, [], n.exempel, true);

ut.push(`Provet av förslagen i texter/forslag.ts`, '', `${nyaN} nya varianter i ${prov.length} mallar; ${felN} med fel enligt kontrollerna.`, '');
for (const p of prov) {
  ut.push(`== ${p.mall}${p.ny ? ' (ny mall)' : ''}: ${p.fore} → ${p.efter} varianter`);
  for (const v of p.varianter.filter(v => v.ny || v.fel.length)) ut.push(`  ${v.ny ? '+' : ' '} ${v.text}${v.villkor ? '   [villkor]' : ''}${v.fel.length ? `\n      FEL: ${v.fel.join('; ')}` : ''}`);
  ut.push('');
}

// ---------- 2. de nya kontrollerna på texterna i dag ----------
const idag: Record<string, { n: number; ex: string[] }> = {};
const hitta = (text: string, n: number) => {
  for (const k of NYA_KONTROLLER) { const v = k.hitta(text, {}, () => undefined, false); if (v !== undefined) { const x = (idag[k.id] ??= { n: 0, ex: [] }); x.n += n; if (x.ex.length < 8 && !x.ex.includes(text)) x.ex.push(text); } }
  for (const k of KONTROLLER.filter(k => k.id === 'genus' || k.id === 'nyttOrd')) { const v = k.hitta(text, {}, () => undefined, false); if (v !== undefined) { const x = (idag['logg_' + k.id] ??= { n: 0, ex: [] }); x.n += n; if (x.ex.length < 8 && !x.ex.includes(text)) x.ex.push(text); } }
};
if (existsSync(tj)) {
  const d = JSON.parse(readFileSync(tj, 'utf8')) as { alla: Record<string, Record<string, { n: number; ex: string[] }>> };
  for (const m in d.alla) for (const i in d.alla[m]) for (const e of d.alla[m][i].ex) hitta(e, d.alla[m][i].n / d.alla[m][i].ex.length);
}
for (const l of loggar) if (existsSync(l)) { const d = JSON.parse(readFileSync(l, 'utf8')) as Record<string, { n: number; ex: string }>; for (const k in d) hitta(d[k].ex, d[k].n); }
ut.push('== De nya kontrollerna (och genus och nya ord) på texterna som spelet skriver i dag', '   (mallarna ur texter.json och loggens rader ur loggrader; antalet är ungefärligt för mallarna)');
for (const [k, x] of Object.entries(idag)) { ut.push(`  ${k}: ${Math.round(x.n)} gånger`); for (const e of x.ex) ut.push(`     – ${e}`); }
ut.push('');

// ---------- 3. ordlistorna ----------
ut.push(`LARA: ${Object.keys(LARA).length} tekniker. NAR_AKT: ${Object.keys(NAR_AKT).length} handlingar. RATTELSER: ${RATTELSER.length}.`);
writeFileSync('texter/prova.txt', ut.join('\n') + '\n');
writeFileSync('texter/forslag.json', JSON.stringify({ rattelser: RATTELSER, kontroller: NYA_KONTROLLER.map(k => ({ id: k.id, namn: k.namn })), idag, prov, falt: NYA_FALT, lara: LARA, narAkt: NAR_AKT, mallar: Object.fromEntries(Object.entries(NYA_MALLAR).map(([k, m]) => [k, { fil: m.fil, nu: m.nu, falt: m.falt }])), varianter: Object.fromEntries(Object.entries(NYA_VARIANTER).map(([k, v]) => [k, { varfor: v.varfor, falt: v.falt, ta_bort: v.ta_bort }])) }, null, 1));
console.log(ut.slice(0, 3).join('\n'));
console.log('Allt står i texter/prova.txt (och texter/forslag.json).');
