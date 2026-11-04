// Läsprovet (texter/README.md): massor av ifyllda texter som Björn kan läsa och ge synpunkter på.
//   1. Förslagen: varje variant i mallarna som får nya varianter (gamla och nya), ifylld med olika personer, kön och saker.
//   2. I dag: det spelet skrev i mätningen före (texter-fore.json), för mallarna som förslagen inte ändrar.
//   3. Loggen i dag: de vanligaste fasta raderna som inte blir mallar med förslagen.
// Varianterna väljs i ordning, inte med slump, så att samma körning ger samma sida.
//   npx tsx texter/exempel.ts && node texter/bygg-exempel.cjs
import { readFileSync, writeFileSync } from 'node:fs';
import { BERATTELSER, fyll, type Fyllning, type Variant } from '../src/sim/berattelser';
import { KONTROLLER } from '../src/test/textkoll';
import { LARA, NAR_AKT, NYA_KONTROLLER, NYA_MALLAR, NYA_VARIANTER } from './forslag';

const tx = (v: Variant) => typeof v === 'string' ? v : v.t;
const BAS: Fyllning = { namn: 'Ask', helt: 'Ask Eken', hen: 'han', honom: 'honom', hans: 'hans', med: 'Ylva', om: 'Ylva', mot: 'Ylva', av: 'Ylva', honom2: 'henne', vinnare: 'Ylva', orsak: 'efter ett gräl', alder: 'man', arstid: 'hösten', partner: 'Ylva', barn: 3 };
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

// personerna: a är huvudpersonen, b den andra. Namnen är sådana som spelet ger (med förslaget i 1f).
const ROLL = [
  { a: 'Ask', ka: 'm', b: 'Ylva', kb: 'k', efter: 'Eken' },
  { a: 'Sigrun', ka: 'k', b: 'Torleif', kb: 'm', efter: 'Strandbo' },
  { a: 'Magger', ka: 'm', b: 'Ulhild', kb: 'k', efter: 'Flinta' },
  { a: 'Ingstig', ka: 'k', b: 'Ymgerd', kb: 'k', efter: 'Bärkorgen' },
  { a: 'Stegleif', ka: 'm', b: 'Kolfast', kb: 'm', efter: 'Vargdödaren' },
  { a: 'Marnve', ka: 'k', b: 'Tusleif', kb: 'm', efter: 'Lerhand' },
];
const PRON = { m: { hen: 'han', honom: 'honom', hans: 'hans' }, k: { hen: 'hon', honom: 'henne', hans: 'hennes' } } as const;
// det som varierar utöver personerna
const POOL: Record<string, string[]> = {
  fatt: ['tre harkött', 'ett träspjut', 'två rötter', 'en lerkruka', 'fyra fiskar', 'ett skinn', 'fem nötter'],
  betal: ['sex grenar', 'två rötter', 'ett rep', 'tre bär', 'en korg', 'två flintor', 'ett slagträ'],
  varor: ['ett träspjut', 'en korg', 'tre bär', 'ett rep', 'en flintkniv', 'två fiskar'],
  orsak: ['efter ett gräl', 'i en olycka', 'av kylan', 'av ålder', 'av svält', 'efter en sjukdom'],
  arstid: ['hösten', 'vintern', 'våren', 'sommaren'],
  yrke: ['samlare', 'jägare', 'fiskare', 'byggare', 'vedhuggare', 'hantverkare'],
  plats: ['vid stenarna', 'i sanden vid stranden', 'under granen', 'bakom huset'],
  drag1: ['stark', 'tystlåten', 'snabb', 'nyfiken', 'envis', 'vänlig'],
  drag2: ['glömsk', 'klok', 'lat', 'modig', 'blyg', 'pratsam'],
  rykte: ['en lögnare', 'en tjuv', 'flitig', 'en klåpare', 'modig', 'en vargdödare'],
  vad: ['rå fisk', 'rått kött', 'råa svampar'],
  lara: Object.values(LARA),
};
// skälet till ett binamn (skalTill i berattelser.ts: händelsens text, eller "var så …")
const MALL_POOL: Record<string, Record<string, (string | number)[]>> = {
  k_dog: { alder: [34, 61, 8, 47, 72, 19, 55] },
  hedersnamn: { skal: ['gav tre bär till Ylva, som höll på att dö', 'gjorde ett mästerverk: en lerkruka', 'delade sin mat med Ylva', 'var så generös', 'räddade Ylva ur sjön'] },
  l_slagsmal: { orsak: ['efter ett gräl'] },
  oknamn: { skal: ['stal en korg av Ylva', 'var elak mot Ylva', 'slog Ylva', 'tog ett skinn av Ylva med våld', 'var så lat'] },
};
const POOL_LIKA: Record<string, string> = { orsak2: 'orsak' };
function roll(f: Fyllning, r: typeof ROLL[number], i: number, mall: string): Fyllning {
  f = { ...f };
  for (const [k, lista] of Object.entries(MALL_POOL[mall] ?? {})) f[k] = lista[i % lista.length];
  // huvudpersonen (namn) blir a och den andra b, vem av Ask och Ylva det än var i exemplet
  const forst = String(f.namn), annan = forst === 'Ylva' ? 'Ask' : 'Ylva';
  const byt = (s: string) => s.replace(new RegExp(`\\b(?:(${forst})( Eken)?|(Oso)|(${annan}))\\b`, 'g'), (_, a, e, o, b) => b ? r.b : e ? `${r.a} ${r.efter}` : r.a);
  const g: Fyllning = {};
  for (const [k, v] of Object.entries(f)) g[k] = typeof v === 'string' ? byt(v) : v;
  const pa = PRON[r.ka as 'm' | 'k'], pb = PRON[r.kb as 'm' | 'k'];
  for (const k of ['hen', 'honom', 'hans'] as const) if (k in g) g[k] = pa[k];
  if ('Hen' in g) g.Hen = pa.hen.charAt(0).toUpperCase() + pa.hen.slice(1);
  if ('honom2' in g) g.honom2 = pb.honom;
  if (g.alder === 'man' || g.alder === 'kvinna') g.alder = r.ka === 'm' ? 'man' : 'kvinna';
  for (const [k, lista] of Object.entries(POOL)) if (typeof g[k] === 'string' && !(k in (MALL_POOL[mall] ?? {}))) g[k] = lista[(i * 3 + k.length) % lista.length];
  for (const [k, fran] of Object.entries(POOL_LIKA)) if (typeof g[k] === 'string' && typeof g[fran] === 'string') g[k] = String(g[fran]).charAt(0).toUpperCase() + String(g[fran]).slice(1);
  if (typeof g.nar === 'string') { const akt = Object.values(NAR_AKT); g.nar = `när ${pa.hen} ${akt[(i * 7) % akt.length]}`; }
  if (typeof g.sorjer === 'string') g.sorjer = r.b;
  return g;
}
const konAv = (f: Fyllning) => (n: string) => n === f.namn ? (f.hen === 'hon' ? 'k' : 'm') : undefined;
const kolla = (t: string, f: Fyllning) => [...KONTROLLER, ...NYA_KONTROLLER].map(k => k.hitta(t, f, konAv(f), true)).filter(x => x !== undefined);

// ---------- 1. förslagen ----------
interface Rad { t: string; ny?: boolean; fel?: boolean }
interface Grupp { id: string; namn: string; om?: string; rader: Rad[] }
const forslag: Grupp[] = [];
let felN = 0;
const ROLLER_PER_VARIANT = 3;
const gor = (mall: string, gamla: Variant[], nya: Variant[], ta_bort: string[], exempel: Fyllning[], om: string) => {
  const rader: Rad[] = [];
  const alla = [...gamla.filter(v => !ta_bort.includes(tx(v))).map(v => [v, false] as const), ...nya.map(v => [v, true] as const)];
  alla.forEach(([v, ny], vi) => {
    for (let j = 0; j < ROLLER_PER_VARIANT; j++) {
      const i = vi * ROLLER_PER_VARIANT + j;
      const ex0 = exempel.length ? exempel[i % exempel.length] : {};
      const f0 = passar(v, { ...BAS, ...ex0 }); if (!f0) continue;
      const f = roll(f0, ROLL[(vi + j * 2) % ROLL.length], i, mall);
      const t = fyll(tx(v), f);
      const fel = kolla(t, f).length > 0; if (fel) felN++;
      if (!rader.some(r => r.t === t)) rader.push({ t, ny, ...(fel ? { fel } : {}) });
    }
  });
  forslag.push({ id: mall, namn: mall, om, rader });
};
for (const [mall, n] of Object.entries(NYA_VARIANTER)) gor(mall, (BERATTELSER as Record<string, Variant[]>)[mall] ?? [], n.varianter, n.ta_bort ?? [], n.exempel, n.varfor);
for (const [mall, n] of Object.entries(NYA_MALLAR)) if (n.varianter.length) gor(mall, [], n.varianter, [], n.exempel, 'Ny mall. I dag: ' + n.nu);

// ---------- 2. i dag, mallarna som inte ändras ----------
const fore = JSON.parse(readFileSync('texter/matning/texter-fore.json', 'utf8')) as { alla: Record<string, Record<string, { n: number; ex: string[] }>> };
const finnsKontroll = (t: string) => [...NYA_KONTROLLER, ...KONTROLLER.filter(k => k.id === 'genus')].some(k => k.hitta(t, {}, () => undefined, false) !== undefined);
const idag: Grupp[] = [];
for (const [mall, varianter] of Object.entries(fore.alla)) {
  if (mall.startsWith('del:') || mall in NYA_VARIANTER) continue;
  const rader: Rad[] = [];
  const listor = Object.values(varianter).map(v => v.ex);
  // en ur varje variant i tur och ordning, högst 12
  for (let r = 0; rader.length < 12 && listor.some(l => l.length > r); r++) for (const l of listor) if (l[r] && rader.length < 12 && !rader.some(x => x.t === l[r])) rader.push({ t: l[r], ...(finnsKontroll(l[r]) ? { fel: true } : {}) });
  const n = Object.values(varianter).reduce((s, v) => s + v.n, 0);
  idag.push({ id: mall, namn: mall, om: `${Object.keys(varianter).length} varianter valdes, ${n} gånger i 8 byar på 45 dygn`, rader });
}
idag.sort((a, b) => a.id.localeCompare(b.id));

// ---------- 3. loggen i dag ----------
const logg: Record<string, { n: number; ex: string }> = {};
for (const by of [1, 42, 777, 5]) {
  const d = JSON.parse(readFileSync(`texter/matning/logg-${by}.json`, 'utf8')) as Record<string, { n: number; ex: string }>;
  for (const [k, v] of Object.entries(d)) { const x = (logg[k] ??= { n: 0, ex: v.ex }); x.n += v.n; }
}
// rader som blir mallar med förslagen: mallens nuvarande text med fälten som jokrar
const blirMall = Object.values(NYA_MALLAR).map(m => new RegExp('^' + m.nu.split(/\$\{[^}]*\}/).map(s => s.replace(/[.*+?^()|[\]\\]/g, '\\$&')).join('.+') + '$'));
const loggRader = Object.values(logg).filter(v => !blirMall.some(r => r.test(v.ex))).sort((a, b) => b.n - a.n).slice(0, 200)
  .map(v => ({ t: v.ex, n: v.n, ...(finnsKontroll(v.ex) ? { fel: true } : {}) }));

writeFileSync('texter/exempel.json', JSON.stringify({ forslag, idag, logg: loggRader }));
const n = (g: Grupp[]) => g.reduce((s, x) => s + x.rader.length, 0);
console.log(`Förslagen: ${n(forslag)} texter i ${forslag.length} mallar (${felN} med fel enligt kontrollerna). I dag: ${n(idag)} texter i ${idag.length} mallar. Loggen: ${loggRader.length} rader.`);
