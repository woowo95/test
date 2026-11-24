import { stationBrinner, FARGER, type FargId, HO, fallorAv, krukaBild, ljusSort, pollinerad, retadeOf, rutorAv, type Ting } from '../sim';
import { BESOK, gravSkick, VATSKOR, delarAv, HELIGA_PLATSER, KVARLEVOR, clamp, living, handlarPlats, MASTERVERK, PERFEKT, GRODOR, faltById, faltKlar, faltOf, faltRuta, faltRutor, grodaPa, W, bordPlatser, sjoarna, stationById, MATERIAL, Pile, STUBBE_LIV, Station, bitAt, bitsOf, dorrDef, condOf, emberOn, eldById, eldXY, eldarOf, fireHeat, forvarAt, Fire, heatRadius, TORK, torrDel, isKlar, stationDef, stationKlar, stationerOf, storlekAv, tillbehorDef, tingOf, zonesOf, groundOf, snoPaMarken, ageIndex, tradArt, stockLangd } from '../sim';
import { hasIcon, iconCanvas, kartbild, kartbildEnsam } from '../ikoner';
import { KARTBILDER } from '../kartbilder';
import { STUBBILDER } from '../stubbilder';
import { ritaHus } from './husbild';
import { morkIkon, smutsGrad, smutsIkon } from './slitbild';
import { outPilesAt, piles, s, sakVar, ui, uppgiftVid } from './lage';
import { Ikoner, TS, figurLayer, mattLayer, overG, pileLayer, rokLayer, structG } from './scen';
import { eldBild, gnistBild, rokBild } from './animation';
import { ANIMTAKT } from '../animbilder';
import { arbetandeNu, iBruk } from './ibruk';
import { framstegPunkter } from './framsteg';
import { farg, fargTal, narmast } from '../palett';
import * as PIXI from 'pixi.js';

// det som står på marken: lagerplatserna och stackarna, stationerna, husen, stubbar, fällda träd och elden
const pileIcons = new Ikoner(pileLayer, true); // med skuggor på marken (steg 5.1.8)
const stubbIkoner = new Ikoner(figurLayer, true);
const mattIkoner = new Ikoner(mattLayer); // mattorna (steg 10.7.6)
const rokIkoner = new Ikoner(rokLayer); // gnistorna och röken över elden (steg 5.1.9.1)
// skicket som färg: grönt, gult, rött
// en färg i talform till närmaste färg i paletten
const palTal = (c: number) => fargTal(narmast('#' + c.toString(16).padStart(6, '0')));
const condCol = (c: number) => c >= 0.5 ? 0x647025 : c >= 0.25 ? 0xb2921b : 0xa14808; // oliv, senap och rost ur paletten
// var ikonerna ligger i rutan, bakersta först
const PILE_LAYOUT = [[[4, 5]], [[1, 5], [7, 5]], [[4, 1], [1, 5], [7, 5]], [[2, 0], [6, 1], [0, 5], [8, 5]]];
// en stack: ju fullare desto fler saker i högen
// en sak i en station och ett redskap ritas 8 punkter stort, hur stor bilden än är (8 eller 16 punkter, steg 3.10.13)
const atta = (k: string) => 8 / (iconCanvas(k).width || 8);
// en sak med en kartbild ur bildstilen (kartbilder.ts) ritas i sin naturliga storlek, aldrig förstorad eller förminskad
// (steg 5.1.2.1): på högen, i stationen, på marken och när den bärs. sakVid ritar den med mitten där den gamla bilden på
// 8 punkter hade sin mitt (x, y = den gamla bildens övre vänstra hörn)
export function sakVid(ik: Ikoner, k: string, x: number, y: number) {
  const kb = kartbild(k);
  if (!kb) { ik.add(k, x, y, atta(k)); return; }
  const b = KARTBILDER[k]!;
  ik.add(kb, Math.round(x + 4 - b.w / 2), Math.round(y + 4 - b.h / 2), 1);
}
// högen med kartbilder: en till fyra efter hur full den är, lite förskjutna, den bakersta först (som korten i bildstilen)
// saker med flera bilder som variationer (steg 6.6.1: styckdelen som lår och som hög): högen tar en efter rutan
const VARIANTER: Record<string, string[]> = { vargdel: ['vargdel', 'vargdel2'], bjorndel: ['bjorndel', 'bjorndel2'] };
const variant = (k: string, x: number, y: number) => { const v = VARIANTER[k]; return v ? v[(x * 31 + y * 17) % v.length] : k; };
function kartHog(k: string, x0: number, y0: number, n: number) {
  const b = KARTBILDER[k]!, kb = kartbild(k)!, hw = b.w >> 1, hh = b.h >> 1;
  const forsk = [[0, 0], [Math.max(2, hw), -1], [-1, Math.max(2, hh)], [Math.max(2, hw) - 1, Math.max(2, hh) + 1]];
  const bx = x0 + ((TS - b.w - (n > 1 ? hw : 0)) >> 1), by = y0 + ((TS - 3 - b.h - (n > 2 ? hh : 0)) >> 1);
  forsk.slice(0, n).sort((a, c) => a[1] - c[1]).forEach(([dx, dy]) => pileIcons.add(kb, bx + dx, by + dy, 1));
}
// stackarna (steg 9.2.40, Björns val i steg 9.9.1: en tät hög): en sak ensam, tre om varandra i en triangel och sex i en pyramid, med
// den bakersta först. Är bilden för bred för att tre eller sex ska rymmas på rutan ritas högen som förut (kartHog)
function tatHog(k: string, x0: number, y0: number, n: 1 | 3 | 6) {
  const b = KARTBILDER[k]!, kb = kartbild(k)!, w = b.w, h = b.h;
  const pos = n === 1 ? [[0, 0]] : n === 3 ? [[0, 0], [w * 0.6, 0], [w * 0.3, -h * 0.5]] : [[0, 0], [w * 0.6, 0], [w * 1.2, 0], [w * 0.3, -h * 0.5], [w * 0.9, -h * 0.5], [w * 0.6, -h]];
  const p = pos.map(([dx, dy]) => [Math.round(dx), Math.round(dy)]), bred = Math.max(...p.map(q => q[0])) + w, hog = h - Math.min(...p.map(q => q[1]));
  if (bred > TS || hog > TS - 3) return false;
  const bx = x0 + ((TS - bred) >> 1), by = y0 + ((TS - 3 - hog) >> 1) - Math.min(...p.map(q => q[1]));
  p.sort((a, c) => a[1] - c[1]).forEach(([dx, dy]) => pileIcons.add(kb, bx + dx, by + dy, 1));
  return true;
}
function drawPile(pl: Pile, t: number) {
  const x0 = pl.x * TS, y0 = pl.y * TS, f = Math.min(1, pl.n / pl.max), g = structG, c = condOf(pl);
  const hogGlans = () => { if ((pl.q ?? 0) >= MASTERVERK) glans(x0 + 12, y0 + 3, t, pl.id ?? 0, pl.q === PERFEKT); }; // mästerverkets glans
  // liten stapel för skicket längst ner i rutan
  g.beginFill(0x24201d).drawRect(x0 + 2, y0 + 13.5, 12, 2).endFill().beginFill(condCol(c)).drawRect(x0 + 2, y0 + 13.5, 12 * clamp(c, 0, 1), 2).endFill();
  // ikoner: ju fullare stacken är desto fler, redskap som en större bild
  // en ensam symbol ritas i sina egna punkter mitt i rutan (steg 5.5.5): 8 punkter mitt över stapeln, 16 punkter över hela rutan
  // en behållare med något i (steg 9.4.14, platshållare tills Björn valt i bildstilen): en yta i vätskans färg
  const ting = pl.id !== undefined ? tingIdn.get(pl.id) : undefined, inne = ting?.inne;
  // ytan där vätskan syns (steg 9.4.14; Björns val, steg 11.14.1): innanför kanten överst i lerkrukan och näveraskan, i världspixlar från rutan
  const yta = () => { if (!inne) return; const r = YTA_BEH[pl.k] ?? [6, 4, 4, 2]; overG.beginFill(VATSKOR[inne.v].farg).drawRect(x0 + r[0], y0 + r[1], r[2], r[3]).endFill(); };
  const ensam = (k: string) => { const w = iconCanvas(k).width || 8; if (w > 8) pileIcons.add(k, x0, y0 - 3, 1); else pileIcons.add(k, x0 + 4, y0 + 3, 1); yta(); };
  if (pl.gor) { ensam(pl.gor); framsteg(x0 + 12.5, y0 + 1.5, pl.klar ?? 0); return; } // påbörjat: framstegscirkeln i hörnet
  // lerkrukan (steg 10.7.2): ett av tre utseenden efter krukan själv, och växten i den
  const kruka = pl.k.startsWith('lerkruka_') ? ting : undefined;
  if (kruka) {
    const b = krukaBild(kruka), ik = hasIcon(b.ikon) ? b.ikon : pl.k;
    // Björns val (steg 12.6.1): den rundade krukan med vätskan i mynningen (VATSKA_BILD) och med röllekan när den vuxit
    const vb = inne && ik === pl.k ? VATSKA_BILD[inne.v] : undefined, ort = b.vaxt?.g === 'rolleka' && b.vaxt.v >= KRUKA_VUXEN && ik === pl.k ? ORTKRUKA_BILD[pl.k] : undefined;
    const bild = vb?.[0] === pl.k ? 'kb_' + vb[1] : ort ? 'kb_' + ort : undefined; // ritas där krukan står (botten mot botten), utan ytan
    if (bild && hasIcon(bild)) { const kc = iconCanvas(ik), bc = iconCanvas(bild), stor = kc.width > 8; pileIcons.add(bild, x0 + (stor ? 0 : 4), y0 + (stor ? -3 : 3) + kc.height - bc.height, 1); hogGlans(); return; }
    ensam(ik);
    if (b.vaxt) vaxtIKruka(x0 + 8, y0 - 3 + (KRUKKANT[ik] ?? 3), b.vaxt.v, b.vaxt.g === 'blomma', !!b.vaxt.blommar);
    hogGlans();
    return;
  }
  const n = clamp(Math.ceil(f * 4), 1, 4);
  // en, några eller många (steg 9.2.40): har saken en egen bild för några eller många i bildstilen ritas den en gång, annars som förut
  const mangd = pl.max === 1 || kartbildEnsam(pl.k) ? '' : f > 2 / 3 ? '_manga' : f > 1 / 3 ? '_nagra' : '';
  if (mangd && KARTBILDER[pl.k + mangd]) { kartHog(pl.k + mangd, x0, y0, 1); hogGlans(); return; }
  if (kartbild(pl.k)) {
    const hogK = pl.blot && KARTBILDER.ved_blot ? 'ved_blot' : variant(pl.k, pl.x, pl.y), ensamBild = pl.max === 1 || kartbildEnsam(pl.k);
    if (ensamBild || !tatHog(hogK, x0, y0, f > 2 / 3 ? 6 : f > 1 / 3 ? 3 : 1)) kartHog(hogK, x0, y0, ensamBild ? 1 : n);
    if (YTA_BEH[pl.k]) yta();
    hogGlans();
    return;
  }
  if (pl.max === 1 || iconCanvas(pl.k).width > 8) { ensam(pl.k); hogGlans(); return; }
  for (const [dx, dy] of PILE_LAYOUT[n - 1]) pileIcons.add(pl.k, x0 + dx, y0 + dy, 1);
}
// Björns val (steg 12.6.1): vätskan i sin kruka (krukan, bilden) och röllekan i den lilla och den mellanstora krukan när den vuxit så här långt
const VATSKA_BILD: Partial<Record<string, [string, string]>> = { te: ['lerkruka_liten', 'vatska_te'], ol: ['lerkruka_stor', 'vatska_ol'], vin: ['lerkruka_stor', 'vatska_vin'], mjolk: ['lerkruka_mellan', 'vatska_mjolk'] };
const ORTKRUKA_BILD: Partial<Record<string, string>> = { lerkruka_liten: 'ortkruka_liten', lerkruka_mellan: 'ortkruka_mellan' };
const KRUKA_VUXEN = 0.5;
// växten i krukan (steg 10.7.2, platshållare): stjälkar upp från kanten och, när den vuxit, röllekans vita blomkorgar.
// KRUKKANT = raden i krukans bild där kanten är
const KRUKKANT: Record<string, number> = { lerkruka_hog: 1, lerkruka_liten: 6, lerkruka_mellan: 0, lerkruka_stor: 0 };
// behållarens yta för vätskan: x, y, bredd och höjd från rutans hörn, efter var bilden ritas (ensam och kartHog i drawPile)
const YTA_BEH: Record<string, [number, number, number, number]> = { lerkruka_liten: [6, 4, 4, 1], lerkruka_mellan: [4, -2, 6, 1], lerkruka_stor: [4, -2, 6, 1], naverask: [5, 2, 6, 1] };
// blomman (steg 10.7.3) har gröna knoppar tills den blommar, och då gula och vita kronor
function vaxtIKruka(cx: number, kant: number, v: number, blomma = false, blommar = false) {
  const h = 2 + Math.round(5 * v), g = overG;
  g.beginFill(0x647025).drawRect(cx - 2, kant - h + 1, 1, h).drawRect(cx, kant - h, 1, h + 1).drawRect(cx + 2, kant - h + 2, 1, h - 1).endFill();
  g.beginFill(0x898b4c).drawRect(cx - 3, kant - 2, 2, 1).drawRect(cx + 1, kant - 3, 2, 1).endFill(); // bladen
  if (blomma) {
    if (!blommar) return;
    g.beginFill(0xd8b25f).drawRect(cx - 3, kant - h - 1, 2, 2).drawRect(cx + 2, kant - h, 2, 2).endFill().beginFill(0xdad0bb).drawRect(cx - 1, kant - h - 2, 2, 2).endFill();
    g.beginFill(0xbd753e).drawRect(cx - 2, kant - h, 1, 1).drawRect(cx, kant - h - 1, 1, 1).drawRect(cx + 3, kant - h + 1, 1, 1).endFill();
    return;
  }
  if (v >= 0.6) g.beginFill(0xdad0bb).drawRect(cx - 3, kant - h, 3, 1).drawRect(cx - 1, kant - h - 1, 3, 1).drawRect(cx + 1, kant - h + 1, 3, 1).endFill();
}
// mästerverken glänser (steg 2.2.2, platshållare): en liten ljus gnista som blinkar till ibland, var och en i sin takt.
// Kvaliteten syns annars inte på kartan
function glans(x: number, y: number, t: number, id: number, perfekt: boolean) {
  const f = (t / 2600 + id * 0.37) % 1;
  if (f > 0.18) return;
  const a = Math.sin(f / 0.18 * Math.PI), r = (perfekt ? 2.5 : 1.8) * a;
  if (a < 0.3) return;
  overG.beginFill(0xdad0bb).drawRect(x - 0.5, y - r, 1, 2 * r).drawRect(x - r, y - 0.5, 2 * r, 1).endFill();
}
// fälten (steg 2.10.3, 2.10.13, odling.ts), ruta för ruta: en ram runt rutan som ska röjas, ljus jord när den är röjd och mörk
// jord med fåror när den är uppgrävd. Grodden mitt på varje sådd ruta medan grödan växer (liten den första halvan) och
// handlarens kärra (steg 7.3.8): när infartsvägen når ända ut drar handlaren en kärra, en av tre efter vem hen är
function drawKarra() {
  const h = s.handlare;
  if (!h || !s.infart?.klar) return;
  const p = handlarPlats(s, h, ui.nu), b = KARTBILDER.karra1!;
  pileIcons.add('kb_karra' + (1 + Math.abs(h.id) % 3), Math.round(p.x * TS - b.w - 3), Math.round(p.y * TS - b.h + 6), 1);
}
// grödans symbol när den är mogen, tills rutan skördats. Framstegscirkeln över rutan där någon röjer, gräver eller sår
function drawFalt() {
  // staketet (steg 9.7.10; Björns val, steg 11.14.1): längs en vågrät kant och tvärs en lodrät, båda i ett hörn
  const staket = new Set(s.staket ?? []);
  for (const i of staket) {
    const X = (i % W) * TS, Y = Math.floor(i / W) * TS, x = i % W;
    const vagrat = (x > 0 && staket.has(i - 1)) || (x < W - 1 && staket.has(i + 1)), lodrat = staket.has(i - W) || staket.has(i + W);
    if (lodrat) pileIcons.add('kb_staket_tvars', X + ((TS - KARTBILDER.staket_tvars.w) >> 1), Y, 1);
    if (vagrat || !lodrat) pileIcons.add('kb_staket_langs', X, Y + TS - KARTBILDER.staket_langs.h, 1);
  }
  for (const f of faltOf(s)) {
    const vaxer = f.steg === 'vaxer', mogen = f.steg === 'mogen', R = rutorAv(f);
    for (let k = 0; k < f.n; k++) { // varje ruta efter sitt eget steg och sin gröda (steg 9.7.1)
      const r = R[k], lin = r.g === 'lin', liten = r.st === 'vaxer' && (r.v ?? 0) < 0.5; // linet har egna bilder för fältet (steg 7.7.8)
      const trad = r.g === 'appeltrad' && KARTBILDER.appeltrad && (r.st === 'mogen' || (r.st === 'vaxer' && !liten)); // äppelträdet (Björns val, steg 11.14.1) när det vuxit till
      const bild = trad ? 'appeltrad' : r.st === 'mogen' && r.g ? (lin ? 'lin_mogen' : r.g === 'jordgubbar' ? 'jordgubbsruta' : GRODOR[r.g].sak) : r.st === 'vaxer' ? (lin ? ((r.v ?? 0) < 0.5 ? 'lin_ung' : 'lin_bla') : 'grodd') : undefined;
      const i = faltRuta(f, k), X = (i % W) * TS, Y = Math.floor(i / W) * TS;
      const rojd = r.st !== 'roja', grav = r.st !== 'roja' && r.st !== 'bereda';
      if (!rojd) structG.lineStyle(1, 0x5e3c24).drawRect(X + 0.5, Y + 0.5, TS - 1, TS - 1).lineStyle(0);
      else structG.beginFill(grav ? 0x5e3c24 : 0x7d5b40).drawRect(X, Y, TS, TS).endFill();
      if (grav) for (let r = 0; r < 4; r++) structG.lineStyle(1, 0x3f2415).moveTo(X + 1, Y + 2.5 + r * 4).lineTo(X + TS - 1, Y + 2.5 + r * 4).lineStyle(0);
      if ((r.st === 'vaxer' || r.st === 'mogen') && r.g && (GRODOR[r.g] as { drag?: number }).drag && pollinerad(s, i)) pileIcons.add('bisymbol', X + TS - iconCanvas('bisymbol').width, Y, 1); // bina når rutan (steg 10.10.25; Björns val, steg 11.14.1)
      if (bild && grodaPa(f, k)) { const kb = liten ? (bild === 'grodd' ? 'grodd_liten' : bild) : kartbild(bild) || bild, b = iconCanvas(kb).width, bh = iconCanvas(kb).height; pileIcons.add(kb, Math.round(X + (TS - b) / 2), Math.round(Y + (TS - bh) / 2), 1); }
    }
    // cirkeln syns bara när någon arbetar på fältet (steg 8.1.3)
    if (!vaxer && !mogen && living(s).some(p => { const t = uppgiftVid(p); return t?.act === 'odla' && t.phase === 'do' && t.ref === f.id; })) { const i = faltRuta(f, Math.min(f.klara, f.n - 1)); framsteg((i % W) * TS + TS / 2, Math.floor(i / W) * TS + 3, faltKlar(f)); }
  }
  for (const f of faltOf(s)) if ((s.skramma ?? []).includes(f.id)) pileIcons.add('kb_fagelskramma', f.x * TS, f.y * TS + TS - (KARTBILDER.fagelskramma?.h ?? TS), 1); // fågelskrämman (steg 9.7.11) på fältets första ruta, Björns val i bildstilen (steg 10.11.1)
}
// framstegscirkeln för det som inte är klart: en mörk bricka med ljus kant som fylls med gult medsols från klockan tolv,
// ju längre arbetet kommit (p från 0 till 1). I pixlar, 9 × 9 punkter, samma punkter som framstegSvg i panelerna (steg 5.3.2.2)
function framsteg(cx: number, cy: number, p: number) {
  const x0 = Math.round(cx) - 4, y0 = Math.round(cy) - 4;
  framstegPunkter(4, p, (x, y, c) => overG.beginFill(fargTal(c)).drawRect(x0 + x, y0 + y, 1, 1).endFill());
}
// '_v' när stationen står vriden och har en stående bild (steg 3.10.7, regeln Det som kan vridas), annars ''
const vriden = (st: Station) => { const ik = stationDef(st.k)?.ikon ?? ''; return st.rot && (hasIcon(ik + '_karta_v') || hasIcon('kb_' + ik + '_v')) ? '_v' : ''; };
// stationens yta i bilden (världspixlar från bildens övre vänstra hörn): där saken som görs ligger, och redskapet som hör
// till den (kniven, bensylen i skåran). v = samma i den stående bilden, där sakerna ligger under varandra (steg 3.10.7)
type Yta = { x: number; y: number; vid?: { x: number; y: number } };
const YTA: Record<string, Yta & { v?: Yta }> = {
  slaktbank: { x: 16, y: 4, vid: { x: 30, y: -1 }, v: { x: 4, y: 6, vid: { x: 4, y: 33 } } },
  flatarbank: { x: 4, y: 10, vid: { x: 22, y: 9 }, v: { x: 1, y: 12, vid: { x: 5, y: 19 } } },
  grill: { x: 20, y: 0 }, // maten på spettet, till höger om elden
};
// maten som hänger på torkställningen (steg 2.8.2): köttet i remsor och fisken i stjärten under slån, åtta platser som fylls
// efter hur mycket som hänger. Den byter färg från rött till mörkbrunt medan den torkar (torrDel). Bara utseende
const tonPar = (a: string, i: number, b: string, j: number) => [fargTal(farg(a as 'jord', i as 0)), fargTal(farg(b as 'jord', j as 0))] as const;
const TORK_KOTT = [tonPar('rost', 3, 'rost', 2), tonPar('rost', 2, 'rost', 1), tonPar('jord', 1, 'jord', 0)];
const TORK_VAXT = [tonPar('ben', 1, 'jord', 3), tonPar('jord', 3, 'jord', 2), tonPar('jord', 2, 'jord', 1)]; // det rötade linet och det blötta kornet
const TORK_FISK = [tonPar('ben', 1, 'skiffer', 2), tonPar('jord', 3, 'jord', 2), tonPar('jord', 2, 'jord', 1)];
function hangande(st: Station, x0: number, y0: number) {
  const platser = 8, per = TORK.rymd / platser;
  let i = 0;
  for (const q of st.tork!) {
    const f = torrDel(s, q, st.k === 'rokeri' ? 'rokeri' : 'tork'), n = Math.max(1, Math.round(q.n / per)), vaxt = q.k === 'ratlin' || q.k === 'maltkorn', fisk = !vaxt && q.k !== 'kott' && q.k !== 'vargkott';
    // i pixlar och palettens färger (steg 8.1.9): ljusare och rödare färskt, mörkbrunt torrt; ljus sida till vänster
    const steg = f < 0.34 ? 0 : f < 0.67 ? 1 : 2, [ljus, mork] = (vaxt ? TORK_VAXT : fisk ? TORK_FISK : TORK_KOTT)[steg];
    for (let j = 0; j < n && i < platser; j++, i++) {
      const x = st.rot ? x0 + 8 : Math.round(x0 + 9 + i * 1.8), y = st.rot ? y0 + 4 + i * 3 : y0 + 3; // den stående: längs slån uppifrån och ner
      if (fisk) { // stjärten i slån och kroppen under
        overG.beginFill(mork).drawRect(x, y, 1, 2).drawRect(x, y + 6, 1, 1).endFill();
        overG.beginFill(ljus).drawRect(x, y + 2, 1, 4).endFill();
      } else { // en köttremsa
        const l = 7 - (i % 3);
        overG.beginFill(ljus).drawRect(x, y, 1, l - 1).endFill();
        overG.beginFill(mork).drawRect(x, y + l - 1, 1, 1).endFill();
      }
    }
  }
}
// en vit kant runt rutorna: där en ruta inte har en granne i mängden
function kant(rutor: number[]) {
  const i = new Set(rutor);
  overG.lineStyle(1.2, 0xffffff, 0.9);
  for (const j of i) {
    const x = j % W, y = (j - x) / W, X = x * TS, Y = y * TS;
    if (!i.has(j - W)) overG.moveTo(X, Y).lineTo(X + TS, Y);
    if (!i.has(j + W)) overG.moveTo(X, Y + TS).lineTo(X + TS, Y + TS);
    if (x === 0 || !i.has(j - 1)) overG.moveTo(X, Y).lineTo(X, Y + TS);
    if (x === W - 1 || !i.has(j + 1)) overG.moveTo(X + TS, Y).lineTo(X + TS, Y + TS);
  }
  overG.lineStyle(0);
}
// marken under lagerplatserna (steg 6.8.9 och 9.2.38, Björns val i steg 9.9.1): nedtrampad jord utan raster, med bara hörnen
// markerade i en mörkare ton: en jordton över hela platsen och var nionde punkt en ton ljusare, och i varje hörn fyra punkter
// längs varje sida. Bilden ritas en gång per storlek på platsen
const lagerMarkTex = new Map<string, PIXI.Texture>();
function lagerMark(w: number, h: number) {
  const nyckel = w + 'x' + h, fanns = lagerMarkTex.get(nyckel);
  if (fanns) return fanns;
  const bw = w * TS, bh = h * TS, c = document.createElement('canvas'); c.width = bw; c.height = bh;
  const g = c.getContext('2d')!, mark = (x: number, y: number, f: string) => { g.fillStyle = f; g.fillRect(x, y, 1, 1); };
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) mark(x, y, farg('jord', (x * 7 + y * 5) % 9 ? 3 : 2));
  for (const [cx, cy, dx, dy] of [[0, 0, 1, 1], [bw - 1, 0, -1, 1], [0, bh - 1, 1, -1], [bw - 1, bh - 1, -1, -1]]) for (let k = 0; k < 4; k++) { mark(cx + dx * k, cy, farg('jord', 1)); mark(cx, cy + dy * k, farg('jord', 1)); }
  const t = PIXI.Texture.from(c, { scaleMode: PIXI.SCALE_MODES.NEAREST });
  lagerMarkTex.set(nyckel, t);
  return t;
}
const VAGG_KANT = 4; // så många punkter av en vägg bakom en station inne som bilden får täcka (steg 9.2.41)
// tingen efter id och det som står vid en station (inte i någons hand eller lass), räknat en gång per bildruta (kodgenomgången 405)
let tingIdn = new Map<number, Ting>(), tingVid = new Map<number, Ting>();
export function drawStructures(t: number) {
  const tab = ui.tab, folk = arbetandeNu(); // den som arbetar vid stationerna, en gång per bildruta (kodgenomgången 414)
  tingIdn = new Map(); tingVid = new Map();
  for (const k of tingOf(s)) { tingIdn.set(k.id, k); if (k.vid !== undefined && k.hos === undefined && k.lass === undefined && !tingVid.has(k.vid)) tingVid.set(k.vid, k); }
  structG.clear(); overG.clear();
  // lagerplatsen: en svag färgton under rutorna (steg 6.8.9), en ram runt dem och en stack per ruta
  zonesOf(s).forEach((z, i) => {
    const on = tab === 'lager' && ui.lagerNr === i;
    structG.beginTextureFill({ texture: lagerMark(z.w, z.h), matrix: new PIXI.Matrix().translate(z.x * TS, z.y * TS) }).drawRect(z.x * TS, z.y * TS, z.w * TS, z.h * TS).endFill();
    if (on) structG.lineStyle(1, 0xdad0bb).drawRect(z.x * TS + 0.5, z.y * TS + 0.5, z.w * TS - 1, z.h * TS - 1).lineStyle(0); // bara den valda platsen får en hel ram
  });
  drawBuild();
  pileIcons.start(); rokIkoner.start(); mattIkoner.start();
  drawFalt();
  // det uppretade boet (steg 10.10.27; Björns val, steg 11.14.1): molnet av bin kring boet, som byter håll och driver runt
  for (const b of retadeOf(s)) {
    const m = KARTBILDER.biarg_moln;
    if (!m) continue;
    const k = Math.floor(t / 220) % 2 ? 'kb_biarg_moln' : 'kb_biarg_moln_v', v = t / 900 + b.x;
    rokIkoner.add(k, Math.round(b.x * TS + TS / 2 - m.w / 2 + Math.cos(v) * 3), Math.round(b.y * TS + TS / 2 - m.h / 2 + Math.sin(v * 1.3) * 2), 1);
  }
  for (const m of fallorAv(s, 'grop')) { const b = KARTBILDER[m.n > 0 ? 'fangstgrop_oppen' : 'fangstgrop_tackt']; if (b) pileIcons.add('kb_fangstgrop_' + (m.n > 0 ? 'oppen' : 'tackt'), Math.round(m.x * TS + TS / 2 - b.w / 2), Math.round(m.y * TS + TS / 2 - b.h / 2), 1); } // fångstgropen (steg 10.2.84): täckt, och öppen när något fallit i (Björns val, steg 10.11.1)
  drawKarra();
  if (s.sophog && KARTBILDER.sophog) pileIcons.add('kb_sophog', s.sophog.x * TS + ((TS - KARTBILDER.sophog.w) >> 1), s.sophog.y * TS + TS - KARTBILDER.sophog.h, 1); // sophögen (steg 9.7.5; Björns val, steg 11.14.1)
  for (const f of eldarOf(s)) lagereld(f); // den första och lägereldarna till (steg 4.5.6.8)
  for (const pl of piles()) if (!forvarAt(s, pl.x, pl.y)?.stangd) drawPile(pl, t); // det som ligger i en kista syns bara när man trycker på den
  // stationerna (stationer.ts) i blandperspektiv över alla rutorna de tar: de som är högre än rutan sticker upp över rutan
  // ovanför. Den halvbyggda har framstegscirkeln överst i mitten; vid den färdiga ligger kniven och det som görs där
  for (const st of stationerOf(s)) {
    // den som står vriden har en egen bild (_v, steg 3.10.7): ingenting ritas genom att bilden vrids
    const d = stationDef(st.k), v = vriden(st);
    if (d?.golv) { mattIkoner.add(d.ikon + (st.rot ? '_karta_v' : '') + (st.farg && FARGER[st.farg as FargId] ? '_r' + FARGER[st.farg as FargId].ramp : ''), st.x * TS, st.y * TS, 1); if (!isKlar(st)) framsteg(st.x * TS + storlekAv(st).w * TS / 2, st.y * TS + 3, stationKlar(st)); continue; } // mattan ligger på golvet, under det som står på den (steg 10.7.6)
    if (d?.brasa) { pileIcons.add('kb_lagereld_ring', st.x * TS + TS / 2 - ELD.x, st.y * TS + TS / 2 - ELD.y, 1); framsteg(st.x * TS + TS / 2, st.y * TS - 6, stationKlar(st)); continue; } // ringen till en lägereld till medan den läggs
    if (st.delar?.length && d?.delar) { // en station i flera delar (steg 9.4.1): varje del där den står
      for (const q of delarAv(st)) {
        // örtkökets delar (Björns val, steg 11.14.1): härden ur version 1, torkstället och bänken ur version 2. Den stående delen
        // (en ruta bred) ses från öster, den liggande (vriden) från söder
        const ik = q.del?.ikon, b = ik && (KARTBILDER[ik] ? ik : KARTBILDER[ik + (q.w < q.h ? '_oster' : '_soder')] ? ik + (q.w < q.h ? '_oster' : '_soder') : undefined);
        if (b) { const kb = KARTBILDER[b]!, x = q.x * TS + ((q.w * TS - kb.w) >> 1), y = (q.y + q.h) * TS - kb.h - (ik === 'ortkok_hard' ? (q.h * TS - kb.h) >> 1 : 0); pileIcons.add(st.delar[q.i]?.kvar ? morkIkon('kb_' + b) : 'kb_' + b, x, y, 1); /* den obyggda delen mörkare i paletten (steg 12.1.223) */ continue; }
        overG.beginFill(0x3f2415).drawRect(q.x * TS, q.y * TS, q.w * TS, q.h * TS).endFill().beginFill(!st.delar[q.i]?.kvar ? 0x7d5b40 : 0x5e3c24).drawRect(q.x * TS + 1, q.y * TS + 1, q.w * TS - 2, q.h * TS - 2).endFill();
      }
      if (!isKlar(st)) framsteg(st.x * TS + storlekAv(st).w * TS / 2, st.y * TS + 3, stationKlar(st));
      continue;
    }
    const kb = stationBild(d?.ikon ?? 'slaktbank', v, st.id), { w: bw, h: bh } = storlekAv(st), w = bw * TS;
    // stationens läge (steg 10.10.30, 12.6.1): vattenhon utan vatten, bikupan med ett samhälle och bryggkaret med en sats som jäser
    const lage = st.k === 'vattenho' && !((st.vatten ?? 0) > 0) ? '_tom' : st.k === 'bikupa' && st.bi !== undefined ? '_bin' : st.k === 'bryggkar' && st.sats ? '_jas' : '';
    const tom = lage && kb && hasIcon('kb_' + kb + lage) ? lage : '';
    const ik = kb ? 'kb_' + kb + tom : (d?.ikon ?? 'slaktbank') + '_karta' + v, sk = kb ? 1 : iconCanvas(ik).width > 8 * bw ? 1 : 2, upp = iconCanvas(ik).height * sk - bh * TS; // sk: 16 punkter per ruta (steg 4.3.2.2) eller 8 som förut
    const x0 = st.x * TS + (kb ? Math.round((w - iconCanvas(ik).width) / 2) : 0);
    // bildens övre vänstra hörn: bildstilens bild mitt över rutorna och med foten på den nedersta. Inne går den aldrig genom väggen
    // (steg 9.2.41): står det en vägg bakom (ovanför) ritas bilden innanför väggens kant, och då längre ner i rummet
    const vaggOvan = !!st.inne && bitAt(s, st.x, st.y - 1)?.k === 'vagg', y0 = vaggOvan ? Math.max(st.y * TS - upp, st.y * TS - VAGG_KANT) : st.y * TS - upp;
    pileIcons.add(isKlar(st) ? smutsIkon(ik, smutsGrad(s.now, st.klar)) : ik, x0, y0, sk); // en station i bruk blir smutsigare (steg 5.1.7.3)
    if (!isKlar(st)) { framsteg(st.x * TS + w / 2, y0 + 3, stationKlar(st)); continue; }
    if (st.k === 'vattenho' && !kb && (st.vatten ?? 0) > 0) { const f = Math.min(1, st.vatten! / HO.rymmer); overG.beginFill(VATSKOR.vatten.farg).drawRect(st.x * TS + 3, y0 + 8 + Math.round(2 * (1 - f)), 10, 1 + Math.round(f)).endFill(); } // vattnet i hon, efter hur fylld den är (steg 10.10.30); bildstilens ho har vattnet i bilden
    if (st.fyllt && st.fyllt > 0.1) { const f = clamp(st.fyllt, 0, 1); overG.beginFill(0x2f261d).drawEllipse(st.x * TS + TS / 2, st.y * TS + TS / 2 + 1, 5 * f, 4 * f).endFill(); } // latrinen mörknar när den fylls (smuts.ts)
    if ((st.q ?? 0) >= MASTERVERK) glans(st.x * TS + w - 3, st.y * TS + 3, t, st.id, st.q === PERFEKT);
    // stubbarna (Björn valde den korta stocken efter v89) är en ruta stora: framför bänken och runt bordet
    if (d?.sitt) pileIcons.add(SITT, st.x * TS + w / 2 - TS / 2, (st.y + bh) * TS, TS / iconCanvas(SITT).width);
    bordPlatser(st).forEach((q, i) => { const k = st.sate?.[i] && hasIcon('kb_' + st.sate[i]) ? 'kb_' + st.sate[i] : SITT; pileIcons.add(k, q.x * TS, q.y * TS, TS / iconCanvas(k).width); }); // pallen och stolen i stubbens ställe (steg 12.4.4)
    for (const k of st.med ?? []) { const b = 'kb_' + tillbehorDef(k)?.ikon + v; if (kb && hasIcon(b)) pileIcons.add(b, x0, y0, 1); else pileIcons.add(tillbehorDef(k)?.ikon + '_karta' + v, x0, y0, 2); } // tillbehören i den (skinnfällen i bädden), i bildstilen lagd ovanpå bädden
    if (st.tork?.length) hangande(st, x0, y0);
    if (st.k === 'fyrfat' && stationBrinner(st)) { const cx = x0 + (iconCanvas(ik).width >> 1), cy = y0 + 8; pileIcons.add(eldBild('lite'), cx - ELD.x, cy - ELD.y, 1); rokIkoner.add(rokBild(undefined, st.x + st.y), cx - ANIMTAKT.rok.x, cy - ANIMTAKT.rok.y, 1); } // fyrfatets glöd och lågor, rörliga som lägerelden (steg 13.7.6)
    const yta = (v ? YTA[st.k]?.v : YTA[st.k]) ?? { x: 2, y: 2 };
    (iBruk(st, folk)?.saker ?? []).slice(0, 3).forEach((k, i) => sakVid(pileIcons, k, x0 + yta.x + (v ? 0 : i * 6), y0 + yta.y + (v ? i * 7 : 0))); // sida vid sida, i den stående under varandra
    const vid = yta.vid && tingVid.get(st.id);
    if (vid) sakVid(pileIcons, vid.k, x0 + yta.vid!.x, y0 + yta.vid!.y);
  }
  // dörrarna i öppningarna (DORRAR i byggnad.ts): den stående bilden (_v) när väggen går uppåt (en vägg ovanför öppningen)
  for (const b of bitsOf(s)) if (b.dorr) { const ik = dorrDef(b.dorr)?.ikon, v = bitAt(s, b.x, b.y - 1)?.k === 'vagg' ? '_v' : '', k = hasIcon('kb_' + ik + v) ? 'kb_' + ik + v : ik + '_karta' + v; pileIcons.add(k, b.x * TS, b.y * TS, TS / iconCanvas(k).width); } // bildstilens dörr (skinndörren, steg 5.1.2.3) eller den som redan hade 16 punkter
  // de uppsatta facklorna (steg 6.3.7, ljus.ts; i människornas skala, steg 9.2.98): med foten i rutan, mot väggen när de sitter på en, den tända med lågan
  for (const u of s.uppsatta ?? []) {
    const vagg = u.vx !== undefined, k = (vagg ? 'kb_uppsatt_vagg' : 'uppsatt_mark') + (u.tand ? '_tand' : ''), c = iconCanvas(k); // på väggen sitter den i en hållare (steg 9.2.11)
    pileIcons.add(k, u.x * TS + ((TS - c.width) >> 1) + (u.vx ?? 0) * 5, u.y * TS + TS - 2 - c.height + (u.vy ?? 0) * 5, 1);
  }
  const hf = s.handlare?.fackla; // handlarens fackla vid lägret (steg 12.1.152), som en uppsatt
  if (hf) { const c = iconCanvas('uppsatt_mark_tand'); pileIcons.add('uppsatt_mark_tand', hf.x * TS + ((TS - c.width) >> 1), hf.y * TS + TS - 2 - c.height, 1); }
  // talgljusen på borden och hyllorna (steg 6.3.8, ljus.ts): mitt på möbeln, två utseenden efter möbeln, det tända med lågan
  for (const l of s.ljus ?? []) {
    const st = stationById(s, l.st);
    if (!st) continue;
    const k = 'kb_' + ljusSort(l) + (1 + st.id % 2) + (l.tand ? '_tand' : ''), c = iconCanvas(k), w = storlekAv(st).w * TS;
    pileIcons.add(k, st.x * TS + ((w - c.width) >> 1), st.y * TS + 6 - c.height, 1);
  }
  rokIkoner.end(); mattIkoner.end();
  // markerad hög utanför lagret: vit kant runt rutan, som lagerplatsen får
  const h = ui.hogAt;
  if (tab === 'hog' && outPilesAt(h.x, h.y).length) structG.lineStyle(1, 0xffffff, 0.9).drawRoundedRect(h.x * TS + 0.5, h.y * TS + 0.5, TS - 1, TS - 1, 3).lineStyle(0);
  // markerad sak (steg 3.10.4): rutan den ligger på eller stationen den står vid; den som bär den får kanten i manniskor.ts
  const sv = tab === 'sak' ? sakVar() : undefined, sst = sv && 'station' in sv ? stationById(s, sv.station) : undefined;
  if (sv && 'x' in sv) overG.lineStyle(1, 0xffffff, 0.9).drawRoundedRect(sv.x * TS + 0.5, sv.y * TS + 0.5, TS - 1, TS - 1, 3).lineStyle(0);
  // det som är valt i panelen: vit kant runt huset, sjön, fältet eller stationen (steg 2.3.7)
  if (tab === 'hus') kant(bitsOf(s).filter(b => b.hus === ui.husId).map(b => b.y * W + b.x));
  if (tab === 'sjo') kant(sjoarna(s.seed).rutor[ui.sjoNr] ?? []);
  const fv = tab === 'falt' ? faltById(s, ui.faltId) : undefined; // fältet, eller grödan på en av dess rutor (steg 2.10.14)
  if (fv) kant(ui.faltRuta >= 0 ? [faltRuta(fv, ui.faltRuta)] : faltRutor(fv));
  const vald = tab === 'station' ? stationById(s, ui.stationId) : sst;
  if (vald) { const { w, h: d } = storlekAv(vald); overG.lineStyle(1, 0xdad0bb).drawRoundedRect(vald.x * TS + 0.5, vald.y * TS + 0.5, w * TS - 1, d * TS - 1, 2).lineStyle(0); }
  // stubbarna och de fällda träden (steg 6.8.16): bildstilens bilder (stubbilder.ts) i trädets storlek och sort, med hösten
  // och vintern. Stubben bleknar i fyra steg medan den ruttnar; det fällda trädet ligger med roten på sin ruta
  const g = groundOf(s), sno = snoPaMarken(s) >= 0.25, tid = sno ? 'vinter' : ageIndex(s) === 3 ? 'host' : 'sommar';
  const sortAt = (x: number, y: number) => tradArt(g, Math.floor(y) * W + Math.floor(x)).id === 'bjork' ? 'bjork' : 'gran';
  // i trädens lager, rad för rad (steg 8.1.5), så att de syns i den vanliga vyn
  stubbIkoner.start();
  for (const k of s.stubbar ?? []) {
    if (k.kol) { stubbIkoner.add('kolstubbe', k.x * TS + 4, k.y * TS + 8, 1); continue; } // den svarta stubben efter en brand (steg 9.2.26)
    const r = Math.min(3, Math.max(0, Math.floor((s.now - k.t) / STUBBE_LIV * 4)));
    const id = `st_${sortAt(k.x, k.y)}_${k.v === 2 ? 2 : 1}_${r}${sno ? '_v' : ''}`, b = STUBBILDER[id];
    stubbIkoner.add('sb_' + id, k.x * TS + 10 - b.fx, k.y * TS + 11 - b.fy, 1);
  }
  for (const k of s.stockar ?? []) {
    const id = `fa_${sortAt(k.x, k.y)}_${stockLangd(k.ved)}_${tid}`, b = STUBBILDER[id];
    stubbIkoner.add('sb_' + id, Math.round(k.x * TS) - 4 - b.fx, Math.round(k.y * TS) + 4 - b.fy, 1);
  }
  for (const q of s.kvarlevor ?? []) if (q.bars === undefined) stubbIkoner.add(KVARLEVOR[q.k].ikon, q.x * TS, q.y * TS, 1); // det som blivit kvar av en människa (steg 8.2.3)
  // graven (steg 10.4.2, platshållare tills Björn valt i bildstilen): en jordhög, och vården som står på den
  for (const g of s.gravar ?? []) { gravPlats(g); if (gravSkick(s, g) < BESOK.laga) igenvuxen(g); } // den slitna graven växer igen (steg 10.4.8)
  for (const r of s.runstenar ?? []) runstenBild(r.x, r.y, r.bild === 1);
  for (const q of s.rester ?? []) restBild(q); // ruinens murar och karavanens vagnar på den lilla kartan (steg 11.13.26, platshållare tills Björn valt i bildstilen) // runstenen (steg 10.6.1, platshållare tills Björn valt i bildstilen)
  for (const h of s.heliga ?? []) stubbIkoner.add(HELIGA_PLATSER[h.k].ikon, h.x * TS, h.y * TS, 1); // de heliga platserna (steg 8.5.5)
  stubbIkoner.end();
  pileIcons.end();
  // eldarna: värmeområdet för varje brinnande lägereld när eldens flik är öppen, och en ring runt den som fliken visar (ui.eld)
  if (tab === 'eld') for (const f of eldarOf(s)) {
    const e = eldXY(s, f), cx = e.x * TS + TS / 2, cy = e.y * TS + TS / 2;
    if (f.lit) structG.beginFill(0xff9a4a, 0.1).lineStyle(1, 0xffb070, 0.5).drawCircle(cx, cy, heatRadius(s, f) * TS).endFill().lineStyle(0);
    if (f === (eldById(s, ui.eld) ?? s.fire)) structG.lineStyle(1.5, 0xffffff, 0.9).drawCircle(cx, cy, 15).lineStyle(0);
  }
}
// lägerelden (bildstilen, steg 5.2.4.3 och 5.1.2.2): en bild för varje läge, 20 × 20 punkter med gropen mitt på elden rutan,
// och stenringen under när elden har en. Elden som brinner fladdrar, med gnistor och rök ovanför (steg 5.1.9.1, animation.ts);
// röken från en härd stiger ur husets rökhål, där härden står
const ELD = ANIMTAKT.eld; // gropens mitt i bilden
function lagereld(f: Fire) {
  const e = eldXY(s, f), cx = e.x * TS + TS / 2, cy = e.y * TS + TS / 2, x = cx - ELD.x, y = cy - ELD.y;
  const l = f.lit ? (fireHeat(s, f) > 0.5 ? 'stort' : 'lite') : emberOn(s, f) ? 'glod' : (f.ash ?? 0) >= 1 ? 'kol' : f.fuel > 0 ? 'ny' : 'tom';
  if (f.ring) pileIcons.add('kb_lagereld_ring', x, y, 1);
  pileIcons.add(f.lit ? eldBild(l as 'stort' | 'lite') : 'kb_lagereld_' + l, x, y, 1);
  if (f.med?.includes('stekhall')) { const b = 'kb_stekhall', c = iconCanvas(b); pileIcons.add(b, Math.round(cx - c.width / 2), Math.round(cy - c.height / 2 - 2), 1); } // stekhällen på härden (steg 10.2.87; Björns val, steg 11.14.1)
  if (!f.lit) return;
  if (l === 'stort') rokIkoner.add(gnistBild(), cx - ANIMTAKT.gnista.x, cy - ANIMTAKT.gnista.y, 1);
  rokIkoner.add(rokBild(undefined, e.x + e.y), cx - ANIMTAKT.rok.x, cy - ANIMTAKT.rok.y, 1); // varje eld i sin egen takt
}
// stationens bild ur bildstilen (kartbilder.ts, steg 5.1.2.2), den stående om stationen står vriden
// stubben att sitta på: bildstilens (steg 5.1.2.3) i en ruta
const SITT = 'kb_sittplats';
// En station vars ikon också är en sak har sin bild som <ikon>_station (komposten); de som har flera utseenden heter <id>_2 och
// <id>_3 och väljs efter stationen (altaret, steg 11.14.1). Den stående bilden kan vara den liggande vriden i ikoner.ts (vattenhon)
const arStation = (k: string) => { const b = KARTBILDER[k] ?? KARTBILDER[k.replace(/_v$/, '')]; return !!b && (b.sort === 'kar-station' || b.sort === 'kar-mobel') && hasIcon('kb_' + k); };
const stationBild = (ikon: string, v: string, id = 0) => {
  const k = [ikon + '_station' + v, ikon + v].find(arStation);
  if (!k) return undefined;
  const alla = [k, k + '_2', k + '_3'].filter(arStation);
  return alla[id % alla.length];
};
// vägens och bryggans bild: längs den längsta raden av samma material; en brygga med en granne åt sidan är en bro. Stockvägen över
// myren ritas som bryggan (steg 13.7.9), så att den inte behöver en egen bild
function vagBild(b: { x: number; y: number; m: string }) {
  const lika = (x: number, y: number) => bitAt(s, x, y)?.m === b.m;
  const langd = (dx: number, dy: number) => { let n = 0; for (let i = 1; i <= 3; i++) { if (lika(b.x + dx * i, b.y + dy * i)) n++; else break; } return n; };
  const ostVast = langd(1, 0) + langd(-1, 0), nordSyd = langd(0, 1) + langd(0, -1), lodrat = nordSyd > ostVast;
  if (b.m === 'stockvag') return lodrat ? 'brygga_v' : 'brygga';
  const bro = Math.min(ostVast, nordSyd) > 0;
  return (bro ? 'bro' : 'brygga') + (lodrat ? '_v' : '');
}
// husen: golv, väggar av timmer (eller flätat ris i äldre byar) och öppningar. Det som är planerat syns som en svag kontur, det som byggs fylls i
function drawBuild() {
  const klara = ritaHus(s, bitsOf(s)); // timmerväggarna, golven och öppningarna med golv (husbild.ts)
  for (const b of bitsOf(s)) {
    if (klara.has(b.id)) continue;
    const x = b.x * TS, y = b.y * TS;
    if (b.k === 'golv' && b.b >= 1 && (b.m === 'stockvag' || b.m === 'brygga')) { // stockarna tvärs över vägen (steg 7.3.7, 7.3.9 och 7.3.12)
      const ik = vagBild(b); pileIcons.add((b.tj ?? 0) > s.now ? morkIkon('kb_' + ik, 1) : 'kb_' + ik, x, y, 1); // den tjärade är mörkare (steg 13.5.1)
      continue;
    }
    if (b.k === 'golv' && b.b >= 1 && b.m === 'stenvag' && hasIcon('kb_stenvag_0')) { pileIcons.add('kb_stenvag_' + ((b.x & 1) + (b.y & 1) * 2), x, y, 1); continue; } // stenvägen (steg 10.10.6; Björns val, steg 11.14.1): 2 × 2 rutor i ett mönster
    if (b.k === 'golv') {
      const col = palTal(MATERIAL[b.m]?.farg ?? MATERIAL.jord.farg); // närmaste färg i paletten; ett golv som byggs är bara en ram
      if (b.b >= 1) structG.beginFill(col).drawRect(x, y, TS, TS).endFill(); else structG.lineStyle(1, col).drawRect(x + 0.5, y + 0.5, TS - 1, TS - 1).lineStyle(0);
    } else if (b.k === 'vagg') {
      if (b.b <= 0 && b.mat <= 0) { structG.lineStyle(1, 0x5e3c24).drawRect(x + 1.5, y + 1.5, TS - 3, TS - 3).lineStyle(0); continue; }
      // timmerväggarna ritar ritaHus; här ritas stenväggarna (platshållare, steg 10.10.7) och risväggarna
      if (b.m === 'sten') { // staplade stenar i rader, förskjutna som i en mur
        structG.beginFill(0x3e5156).drawRect(x, y, TS, TS).endFill();
        for (let r = 0; r < 4; r++) for (let k = -1; k < 3; k++) { const sx = x + k * 6 + (r % 2 ? 3 : 0) + 1, sy = y + r * 4 + 1; const x0 = Math.max(x + 1, sx), x1 = Math.min(x + TS - 1, sx + 5); if (x1 > x0) structG.beginFill(r % 2 ? 0x8a9c9e : 0x61767a).drawRect(x0, sy, x1 - x0, 3).endFill(); }
        continue;
      }
      structG.beginFill(palTal(MATERIAL.ris.farg)).drawRect(x + 1, y + 1, TS - 2, TS - 2).endFill();
      // flätningen: vågiga streck, färre ju mer slitet
      const n = b.b >= 1 ? Math.max(1, Math.round(3 * b.c)) : Math.ceil(3 * b.b);
      for (let k = 0; k < n; k++) { const yy = y + TS * (0.28 + 0.22 * k); structG.lineStyle(1, 0x987e62).moveTo(x + 2, yy).lineTo(x + TS / 2, yy + 1.5).lineTo(x + TS - 2, yy).lineStyle(0); }
      for (let k = 1; k < 3; k++) structG.lineStyle(1, 0x3f2415).moveTo(x + TS * k / 3, y + 1).lineTo(x + TS * k / 3, y + TS - 1).lineStyle(0);
    } else {
      structG.beginFill(0x7d5b40).drawRect(x + 1, y + 1, TS - 2, TS - 2).endFill(); // öppningen: trampad jord
    }
  }
}

// den igenvuxna graven som platshållare (steg 10.4.8): gräs och sly över vad graven än är
function igenvuxen(g: { x: number; y: number }) {
  const X = g.x * TS, Y = g.y * TS, gr = structG;
  for (const [dx, dy, c] of [[3, 10, 0x647025], [7, 12, 0x4b4f00], [11, 9, 0x647025], [5, 6, 0x898b4c], [12, 13, 0x4b4f00], [9, 4, 0x647025]] as const) gr.beginFill(c).drawRect(X + dx, Y + dy, 2, 3).endFill();
}
// graven som platshållare (steg 10.4.2): jordhögen, och gravstolpen, gravbrädan, stockramen, gravhuset eller gravhögen
// runstenen (steg 10.6.1): en platshållare i paletten, en hög grå sten med ett rödmålat runband, 16 punkter per ruta
// bildstenen (steg 10.7.1): samma sten med målade bilder i stället för runbandet, en figur med spjut och ett djur
function runstenBild(x: number, y: number, bild = false) {
  const X = x * TS, Y = y * TS, gr = structG, u = TS / 16;
  gr.beginFill(0x21290d).drawEllipse(X + TS / 2, Y + TS - 2 * u, 5 * u, 1.5 * u).endFill(); // skuggan i paletten: gräset ett steg mörkare (MORKARE[1]), inte genomskinlig (steg 12.1.168)
  gr.beginFill(0x8a9c9e).drawPolygon([X + 5 * u, Y + TS - 2 * u, X + 4.5 * u, Y + 6 * u, X + 6 * u, Y + 2 * u, X + 10 * u, Y + 1.5 * u, X + 11.5 * u, Y + 5 * u, X + 11 * u, Y + TS - 2 * u]).endFill();
  gr.beginFill(0x61767a).drawRect(X + 10 * u, Y + 4 * u, 1.5 * u, TS - 6 * u).endFill();
  if (bild) {
    gr.beginFill(0xa14808).drawRect(X + 6 * u, Y + 4 * u, u, u).drawRect(X + 6 * u, Y + 5 * u, u, 3 * u).drawRect(X + 5.5 * u, Y + 8 * u, u, 2 * u).drawRect(X + 7 * u, Y + 8 * u, u, 2 * u).endFill(); // en människa
    gr.beginFill(0x3f2415).drawRect(X + 7 * u, Y + 3 * u, 0.6 * u, 6 * u).endFill(); // spjutet
    gr.beginFill(0x474138).drawRect(X + 8 * u, Y + 9 * u, 2.5 * u, 1.5 * u).drawRect(X + 9.5 * u, Y + 8 * u, u, u).drawRect(X + 8 * u, Y + 10.5 * u, 0.6 * u, u).drawRect(X + 10 * u, Y + 10.5 * u, 0.6 * u, u).endFill(); // djuret
    gr.beginFill(0xd8b25f).drawRect(X + 6 * u, Y + 12 * u, 4 * u, 0.7 * u).endFill(); // marken under
    return;
  }
  gr.lineStyle(u, 0xa14808).moveTo(X + 6 * u, Y + TS - 3 * u).lineTo(X + 6 * u, Y + 4 * u).quadraticCurveTo(X + 8 * u, Y + 2.5 * u, X + 10 * u, Y + 4 * u).lineTo(X + 10 * u, Y + TS - 3 * u).lineStyle(0);
}
// resterna på den lilla kartan (steg 11.13.26). Muren ritas i husbild.ts; karavanens trasiga vagn är grundarnas trasiga vagn
// (steg 13.7.8), så att ingen egen bild behövs
function restBild(q: { x: number; y: number; k: string }) {
  if (q.k === 'mur') return; // muren ritas som spelets timmervägg med mossa (husbild.ts, steg 13.1.2)
  const X = q.x * TS, Y = q.y * TS, gr = structG, u = TS / 16;
  if (q.k === 'hog') { // en ruta av gravhögen: torv i en kupol, högst i mitten (steg 11.13.28, platshållare)
    gr.beginFill(0x24201d, 0.3).drawRect(X, Y + 13 * u, TS, 2 * u).endFill();
    const mitt = (q as { m?: number }).m ?? 0;
    gr.beginFill(0x4f6b3a).drawEllipse(X + TS / 2, Y + 11 * u, 8 * u, (mitt ? 7 : 4) * u).endFill();
    gr.beginFill(0x6b8a4a).drawEllipse(X + TS / 2, Y + 9 * u, 6 * u, (mitt ? 5 : 2.5) * u).endFill();
    return;
  }
  const c = iconCanvas('vagnsvrak_karta'); pileIcons.add('vagnsvrak_karta', X + ((TS - c.width) >> 1), Y + TS - c.height, 1);
}
function gravPlats(g: { x: number; y: number; vard?: string }) {
  const X = g.x * TS, Y = g.y * TS, gr = structG;
  if (g.vard === 'gravsten') { const id = 'grav_' + (1 + (g.x * 7 + g.y * 13) % 3), b = KARTBILDER[id]!; stubbIkoner.add('kb_' + id, X + ((TS - b.w) >> 1), Y + TS - 2 - b.h, 1); return; } // en av de tre valda gravstenarna (steg 9.9.1)
  if (g.vard === 'stensattning') { gr.beginFill(0x5e3c24).drawEllipse(X + TS / 2, Y + TS - 5, 4, 2).endFill(); for (let i = 0; i < 6; i++) { const v = i * Math.PI / 3; gr.beginFill(0x8a9c9e).drawCircle(X + TS / 2 + Math.cos(v) * 6, Y + TS - 6 + Math.sin(v) * 4, 1.5).endFill(); } return; }
  if (g.vard === 'skeppssattning') { for (let i = 0; i < 12; i++) { const v = i * Math.PI / 6, r = Math.abs(Math.sin(v)) ** 0.5; gr.beginFill(0x8a9c9e).drawCircle(X + TS / 2 + Math.cos(v) * 9, Y + TS - 6 + Math.sin(v) * 4 * r, 1.4).endFill(); } return; }
  if (g.vard === 'gravhog') { gr.beginFill(0x5e3c24).drawEllipse(X + TS / 2, Y + TS - 5, TS / 2, 5).endFill().beginFill(0x7d5b40).drawEllipse(X + TS / 2, Y + TS - 6, TS / 2 - 2, 3).endFill(); return; }
  gr.beginFill(0x5e3c24).drawEllipse(X + TS / 2, Y + TS - 4, 5, 3).endFill();
  if (g.vard === 'gravstolpe') gr.beginFill(0x3f2415).drawRect(X + TS / 2 - 1, Y + 3, 2, TS - 7).endFill();
  else if (g.vard === 'gravbrada') gr.beginFill(0x987e62).drawRect(X + TS / 2 - 3, Y + 4, 6, 6).endFill().beginFill(0x3f2415).drawRect(X + TS / 2 - 1, Y + 10, 2, 2).endFill();
  else if (g.vard === 'stockram') gr.lineStyle(2, 0x7d5b40).drawRect(X + 2, Y + TS - 9, TS - 4, 7).lineStyle(0);
  else if (g.vard === 'gravhus') gr.beginFill(0x7d5b40).drawRect(X + 3, Y + TS - 8, TS - 6, 6).endFill().beginFill(0x3f2415).drawPolygon([X + 2, Y + TS - 8, X + TS / 2, Y + 3, X + TS - 2, Y + TS - 8]).endFill();
}
