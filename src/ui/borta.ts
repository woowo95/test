// Sammanfattningen efter ikappräkningen (steg 5.4.3.4 och 5.4.4): först en berättelse om tiden borta, sedan tiden, talen och
// hur många notiser som är nya, med en knapp till genomgången av notiserna (ui/notiser.ts).
// Berättelsen (steg 5.4.4) räknas ur krönikan (sim/historik.ts), inte ur loggen på 400 rader: kronikans rader är redan
// skrivna av spelets mallar (Berättelser, 3.9). Här väljs de viktigaste ut (registret BORTA_VIKT) och binds ihop med
// mallarna b_* i BERATTELSER. Hur lång texten blir beror på hur länge man varit borta (BORTA_LANGD).
// ui/spara.ts räknar ikapp och visar rutan; den här filen bygger bara innehållet, så att ett scenario kan läsa det.
import { ARSTIDER, Borta, DAY, HOUR, MallId, State, WEEK, berattelse, kalender, ledareOf, living, olasta, talOrd } from '../sim';
import { durTxt, esc, num } from './hjalp';
import { s } from './lage';

// registret: kronikans slag (raden får mallens id eller ett eget slag) och hur viktiga de är i berättelsen, högst först.
// Ordningen följer designdokumentet: döda, födda, par, ledare, motgångar, strider och vargar, rättegångar, flyttar, nya
// tekniker och byggnader och det som hände för första gången. Ett slag som inte står här är en småsak (vikt 1)
export const BORTA_VIKT: Record<string, number> = {
  k_dog: 10, k_dogSpad: 10, k_atergrundad: 10,
  k_fodd: 9,
  k_gift: 8,
  k_forstaLedare: 7, k_ledare: 7, ledare: 7,
  motgang: 6,
  rovare: 5, k_vargAnfall: 5, k_vargjakt: 5, k_vargSprang: 5, k_forstaVarg: 5,
  k_utvisad: 4,
  flytt: 3,
  k_uppfann: 2, episk: 2, k_husKlar: 2, forlust: 2, k_forstaEld: 2, handel: 2,
};
// hur länge man varit borta (år i spelet = dygn i verkligheten) och hur texten blir: upp till "till" år borta delas
// berättelsen så här (en = ett stycke, ar = ett stycke per år, alder = ett stycke per tidsålder) med högst "max" meningar
// i varje stycke. Det som inte får plats räknas ihop till en mening om småsakerna
export const BORTA_LANGD: { till: number; dela: 'en' | 'ar' | 'alder'; max: number }[] = [
  { till: 0.5, dela: 'en', max: 3 }, // några timmar (några månader i spelet): en till tre meningar
  { till: 2, dela: 'en', max: 6 }, // ungefär ett dygn (ett år): ett stycke
  { till: 7, dela: 'ar', max: 4 }, // några dygn (några år): en inledning och ett stycke per år
  { till: Infinity, dela: 'alder', max: 5 }, // en vecka eller mer (en tidsålder): ett stycke per tidsålder och sist byn nu
];

type Rad = { t: number; text: string; v: number; i: number };
const vikt = (slag?: string) => (slag && BORTA_VIKT[slag]) || 1;
const isDod = (r: Rad) => r.v === BORTA_VIKT.k_dog, isFodd = (r: Rad) => r.v === BORTA_VIKT.k_fodd;
// "År 5: Torkan kom." blir "Torkan kom." när stycket redan säger året
const utanAr = (text: string) => { const t = text.replace(/^År \d+: /, ''); return t.charAt(0).toUpperCase() + t.slice(1); };

// de viktigaste raderna i tidsordning, och hur många som blev över
function valj(rader: Rad[], max: number) {
  const ut = rader.slice().sort((a, b) => b.v - a.v || a.i - b.i).slice(0, max).sort((a, b) => a.i - b.i);
  return { ut, over: rader.length - ut.length };
}
function stycke(st: State, rader: Rad[], max: number, nyckel: number, forst?: string) {
  const { ut, over } = valj(rader, max);
  const m = ut.map(r => utanAr(r.text));
  if (over) m.push(berattelse(st, 'b_ovrigt', nyckel, { n: talOrd(over) }));
  return [forst, ...m].filter(Boolean).join(' ');
}
const tal = (rader: Rad[]) => ({ dodaTal: rader.filter(isDod).length, foddaTal: rader.filter(isFodd).length });

// berättelsen om tiden från "fran" till nu: ett eller flera stycken (steg 5.4.4)
export function bortaBerattelse(st: State, b: Borta): string[] {
  const ar = (st.now - b.fran) / DAY, L = BORTA_LANGD.find(l => ar < l.till)!;
  const rader: Rad[] = (st.hist?.kronika ?? []).map((k, i) => ({ t: k[0], text: k[1], v: vikt(k[2]), i })).filter(r => r.t >= b.fran);
  const kallt = kalender(st).ai === 0;
  if (!rader.length && L.dela === 'en') return [berattelse(st, 'b_lugnt', b.fran, { kallt })];
  const ut: string[] = [];
  if (L.dela === 'en') return [stycke(st, rader, L.max, b.fran)];
  const nu = living(st).length, fore = b.folk ?? nu - ((st.stat?.fodda ?? 0) - b.fodda) + ((st.stat?.doda ?? 0) - b.doda);
  const t0 = tal(rader);
  ut.push(berattelse(st, 'b_inledning', b.fran, { ar: talOrd(Math.round(ar)), fore: talOrd(fore), nu: talOrd(nu), foreTal: fore, nuTal: nu, fodda: talOrd(t0.foddaTal), doda: talOrd(t0.dodaTal), ...t0 }));
  // grupperna: ett år (kalenderns år) eller en tidsålder (kalenderns start), i tidsordning
  const grupper: { nyckel: number; fran: number; till: number; ai: number; rader: Rad[] }[] = [];
  for (let t = b.fran; t < st.now + 1; t += L.dela === 'ar' ? DAY : WEEK / 7) {
    const k = kalender(st, Math.min(t, st.now)), nyckel = L.dela === 'ar' ? k.ar : k.start;
    let g = grupper[grupper.length - 1];
    if (!g || g.nyckel !== nyckel) grupper.push(g = { nyckel, fran: k.ar, till: k.ar, ai: k.ai, rader: [] });
    g.till = k.ar;
    if (t >= st.now) break;
  }
  for (const r of rader) {
    const k = kalender(st, r.t), nyckel = L.dela === 'ar' ? k.ar : k.start;
    const g = grupper.find(x => x.nyckel === nyckel) ?? grupper[grupper.length - 1];
    g.rader.push(r);
  }
  for (const g of grupper) {
    const f = { ar: g.fran, fran: g.fran, till: g.till, arstid: ARSTIDER[g.ai], tomt: !g.rader.length, ...tal(g.rader) };
    if (L.dela === 'ar' && !g.rader.length) { ut.push(berattelse(st, 'b_arLugnt', g.nyckel, f)); continue; }
    const forst = berattelse(st, (L.dela === 'ar' ? 'b_ar' : 'b_alder') as MallId, g.nyckel, f);
    // en lång tidsålder (den första kan vara många år) får fler meningar: två till per två år, högst tio
    const max = Math.min(10, Math.max(L.max, 2 + Math.ceil((g.till - g.fran + 1) / 2)));
    ut.push(stycke(st, g.rader, max, g.nyckel, forst));
  }
  if (L.dela === 'alder') {
    const led = ledareOf(st), h = (st.hus ?? []).filter(x => x.klar).length;
    ut.push(berattelse(st, 'b_nu', st.now / HOUR, { antal: talOrd(nu), ledare: led?.name, hus: h ? (h === 1 ? 'ett hus' : `${talOrd(h)} hus`) : undefined }));
  }
  return ut;
}

// rutan medan byn räknas ikapp (steg 5.4.5.1): förloppet, och en knapp som visar kartan under tiden som en snabbspolning
// (rutan flyttas ner och bakgrunden blir genomskinlig; ui/spara.ts ritar kartan efter varje bit som räknats)
export const spolaText = (pa: boolean) => pa ? '{sym_oga} Dölj byn' : '{sym_oga} Se byn under tiden';
export function ikappHtml(spola: boolean, kanSpola = true) {
  return `<p class="ovLead">Byn har levt vidare medan du var borta.</p><div class="prog"><div id="progBar"></div></div><p class="muted" id="progTxt"></p>${kanSpola ? `<div class="ovKnappar"><button id="ovSpola" type="button" aria-pressed="${spola}">${spolaText(spola)}</button></div>` : ''}`;
}

export function bortaHtml(b: Borta) {
  const years = (s.now - b.fran) / DAY;
  const fodda = (s.stat?.fodda ?? 0) - b.fodda, doda = (s.stat?.doda ?? 0) - b.doda;
  // den verkliga tiden och tiden i spelet (ett dygn är ett år), minst en månad
  const man = Math.max(1, Math.round(years * 12));
  const yrs = years >= 1 ? `${num(years)} år` : `${man} ${man === 1 ? 'månad' : 'månader'}`;
  const n = olasta(s);
  const ber = bortaBerattelse(s, b).map(p => `<p class="ovBer">${esc(p)}</p>`).join('');
  return `
    <p class="ovLead">Medan du var borta gick ${durTxt(s.now - b.fran)} (${yrs} i spelet).</p>
    <div class="ovBerattelse">${ber}</div>
    <p class="muted">${fodda} födda · ${doda} döda · ${living(s).length} lever nu i byn</p>
    <p class="ovNotiser">{sym_notis} ${n ? `${n} ${n === 1 ? 'ny notis' : 'nya notiser'}` : 'Inga nya notiser'}</p>
    <div class="ovKnappar">${n ? '<button id="ovNotiser" class="primary" type="button" data-notis="visa">Läs notiserna</button>' : ''}
    <button id="ovClose" class="${n ? '' : 'primary'}" type="button">Till byn</button></div>`;
}
