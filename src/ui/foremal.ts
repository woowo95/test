import { clamp, MASTERVERK, PERFEKT, GRODOR, faltById, faltKlar, faltOf, faltRuta, faltRutor, grodaPa, W, bordPlatser, sjoarna, stationById, MATERIAL, Pile, STUBBE_LIV, Station, bitAt, bitsOf, dorrDef, condOf, emberOn, eldById, eldXY, eldarOf, fireHeat, forvarAt, Fire, heatRadius, TORK, torrDel, isKlar, stationDef, stationKlar, stationerOf, storlekAv, tillbehorDef, tingOf, zonesOf } from '../sim';
import { hasIcon, iconCanvas, kartbild, kartbildEnsam } from '../ikoner';
import { KARTBILDER } from '../kartbilder';
import { ritaHus } from './husbild';
import { smutsGrad, smutsIkon } from './slitbild';
import { outPilesAt, piles, s, sakVar, ui } from './lage';
import { Ikoner, TS, overG, pileLayer, rokLayer, structG } from './scen';
import { eldBild, gnistBild, rokBild } from './animation';
import { ANIMTAKT } from '../animbilder';
import { mix } from './pixel';
import { iBruk } from './ibruk';
import { framstegPunkter } from './framsteg';
import { fargTal, narmast } from '../palett';

// det som står på marken: lagerplatserna och stackarna, stationerna, husen, stubbar, fällda träd och elden
const pileIcons = new Ikoner(pileLayer, true); // med skuggor på marken (steg 5.1.8)
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
function kartHog(k: string, x0: number, y0: number, n: number) {
  const b = KARTBILDER[k]!, kb = kartbild(k)!, hw = b.w >> 1, hh = b.h >> 1;
  const forsk = [[0, 0], [Math.max(2, hw), -1], [-1, Math.max(2, hh)], [Math.max(2, hw) - 1, Math.max(2, hh) + 1]];
  const bx = x0 + ((TS - b.w - (n > 1 ? hw : 0)) >> 1), by = y0 + ((TS - 3 - b.h - (n > 2 ? hh : 0)) >> 1);
  forsk.slice(0, n).sort((a, c) => a[1] - c[1]).forEach(([dx, dy]) => pileIcons.add(kb, bx + dx, by + dy, 1));
}
function drawPile(pl: Pile, t: number) {
  const x0 = pl.x * TS, y0 = pl.y * TS, f = Math.min(1, pl.n / pl.max), g = structG, c = condOf(pl);
  // liten stapel för skicket längst ner i rutan
  g.beginFill(0x24201d).drawRect(x0 + 2, y0 + 13.5, 12, 2).endFill().beginFill(condCol(c)).drawRect(x0 + 2, y0 + 13.5, 12 * clamp(c, 0, 1), 2).endFill();
  // ikoner: ju fullare stacken är desto fler, redskap som en större bild
  // en ensam symbol ritas i sina egna punkter mitt i rutan (steg 5.5.5): 8 punkter mitt över stapeln, 16 punkter över hela rutan
  const ensam = (k: string) => { const w = iconCanvas(k).width || 8; if (w > 8) pileIcons.add(k, x0, y0 - 3, 1); else pileIcons.add(k, x0 + 4, y0 + 3, 1); };
  if (pl.gor) { ensam(pl.gor); framsteg(x0 + 12.5, y0 + 1.5, pl.klar ?? 0); return; } // påbörjat: framstegscirkeln i hörnet
  const n = clamp(Math.ceil(f * 4), 1, 4);
  if (kartbild(pl.k)) {
    kartHog(pl.k, x0, y0, pl.max === 1 || kartbildEnsam(pl.k) ? 1 : n);
    if ((pl.q ?? 0) >= MASTERVERK) glans(x0 + 12, y0 + 3, t, pl.id ?? 0, pl.q === PERFEKT);
    return;
  }
  if (pl.max === 1 || iconCanvas(pl.k).width > 8) { ensam(pl.k); if ((pl.q ?? 0) >= MASTERVERK) glans(x0 + 12, y0 + 3, t, pl.id ?? 0, pl.q === PERFEKT); return; }
  for (const [dx, dy] of PILE_LAYOUT[n - 1]) pileIcons.add(pl.k, x0 + dx, y0 + dy, 1);
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
// grödans symbol när den är mogen, tills rutan skördats. Framstegscirkeln över rutan där någon röjer, gräver eller sår
function drawFalt() {
  for (const f of faltOf(s)) {
    const vaxer = f.steg === 'vaxer', mogen = f.steg === 'mogen', liten = vaxer && (f.vuxit ?? 0) < 0.5;
    const bild = mogen && f.groda ? GRODOR[f.groda].sak : vaxer ? 'grodd' : undefined;
    for (let k = 0; k < f.n; k++) {
      const i = faltRuta(f, k), X = (i % W) * TS, Y = Math.floor(i / W) * TS;
      const klar = k < f.klara, rojd = f.steg !== 'roja' || klar, grav = f.steg === 'bereda' ? klar : f.steg !== 'roja';
      if (!rojd) structG.lineStyle(1, 0x5e3c24).drawRect(X + 0.5, Y + 0.5, TS - 1, TS - 1).lineStyle(0);
      else structG.beginFill(grav ? 0x5e3c24 : 0x7d5b40).drawRect(X, Y, TS, TS).endFill();
      if (grav) for (let r = 0; r < 4; r++) structG.lineStyle(1, 0x3f2415).moveTo(X + 1, Y + 2.5 + r * 4).lineTo(X + TS - 1, Y + 2.5 + r * 4).lineStyle(0);
      if (bild && grodaPa(f, k)) { const kb = liten ? (bild === 'grodd' ? 'grodd_liten' : bild) : kartbild(bild) || bild, b = iconCanvas(kb).width, bh = iconCanvas(kb).height; pileIcons.add(kb, Math.round(X + (TS - b) / 2), Math.round(Y + (TS - bh) / 2), 1); }
    }
    if (!vaxer && !mogen) { const i = faltRuta(f, Math.min(f.klara, f.n - 1)); framsteg((i % W) * TS + TS / 2, Math.floor(i / W) * TS + 3, faltKlar(f)); }
  }
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
function hangande(st: Station, x0: number, y0: number) {
  const platser = 8, per = TORK.rymd / platser;
  let i = 0;
  for (const q of st.tork!) {
    const f = torrDel(s, q), n = Math.max(1, Math.round(q.n / per)), fisk = q.k !== 'kott' && q.k !== 'vargkott';
    const farg = mix(fisk ? 0xb87a5a : 0xb0342a, fisk ? 0x5a3a22 : 0x4a2416, f);
    for (let j = 0; j < n && i < platser; j++, i++) {
      const x = st.rot ? x0 + 8.3 : x0 + 9 + i * 1.8, y = st.rot ? y0 + 4 + i * 3 : y0 + 3; // den stående: längs slån uppifrån och ner
      overG.beginFill(farg);
      if (fisk) overG.drawRect(x, y, 1, 1.5).drawEllipse(x + 0.5, y + 4.5, 0.9, 3).endFill(); // stjärten i slån och kroppen under
      else overG.drawRect(x, y, 1.4, 7 - (i % 3)).endFill(); // en köttremsa
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
export function drawStructures(t: number) {
  const tab = ui.tab;
  structG.clear(); overG.clear();
  // lagerplatsen: en ram runt rutorna, och en stack per ruta
  zonesOf(s).forEach((z, i) => {
    const on = tab === 'lager' && ui.lagerNr === i;
    structG.lineStyle(1, on ? 0xdad0bb : 0x5e3c24).drawRect(z.x * TS + 0.5, z.y * TS + 0.5, z.w * TS - 1, z.h * TS - 1).lineStyle(0);
  });
  drawBuild();
  pileIcons.start(); rokIkoner.start();
  drawFalt();
  for (const f of eldarOf(s)) lagereld(f); // den första och lägereldarna till (steg 4.5.6.8)
  for (const pl of piles()) if (!forvarAt(s, pl.x, pl.y)?.stangd) drawPile(pl, t); // det som ligger i en kista syns bara när man trycker på den
  // stationerna (stationer.ts) i blandperspektiv över alla rutorna de tar: de som är högre än rutan sticker upp över rutan
  // ovanför. Den halvbyggda har framstegscirkeln överst i mitten; vid den färdiga ligger kniven och det som görs där
  for (const st of stationerOf(s)) {
    // den som står vriden har en egen bild (_v, steg 3.10.7): ingenting ritas genom att bilden vrids
    const d = stationDef(st.k), v = vriden(st);
    if (d?.brasa) { pileIcons.add('kb_lagereld_ring', st.x * TS + TS / 2 - ELD.x, st.y * TS + TS / 2 - ELD.y, 1); framsteg(st.x * TS + TS / 2, st.y * TS - 6, stationKlar(st)); continue; } // ringen till en lägereld till medan den läggs
    const kb = stationBild(d?.ikon ?? 'slaktbank', v), { w: bw, h: bh } = storlekAv(st), w = bw * TS;
    const ik = kb ? 'kb_' + kb : (d?.ikon ?? 'slaktbank') + '_karta' + v, sk = kb ? 1 : iconCanvas(ik).width > 8 * bw ? 1 : 2, upp = iconCanvas(ik).height * sk - bh * TS; // sk: 16 punkter per ruta (steg 4.3.2.2) eller 8 som förut
    const x0 = st.x * TS + (kb ? Math.round((w - iconCanvas(ik).width) / 2) : 0), y0 = st.y * TS - upp; // bildens övre vänstra hörn: bildstilens bild mitt över rutorna och med foten på den nedersta
    pileIcons.add(isKlar(st) ? smutsIkon(ik, smutsGrad(s.now, st.klar)) : ik, x0, y0, sk); // en station i bruk blir smutsigare (steg 5.1.7.3)
    if (!isKlar(st)) { framsteg(st.x * TS + w / 2, y0 + 3, stationKlar(st)); continue; }
    if (st.fyllt && st.fyllt > 0.1) { const f = clamp(st.fyllt, 0, 1); overG.beginFill(0x2f261d).drawEllipse(st.x * TS + TS / 2, st.y * TS + TS / 2 + 1, 5 * f, 4 * f).endFill(); } // latrinen mörknar när den fylls (smuts.ts)
    if ((st.q ?? 0) >= MASTERVERK) glans(st.x * TS + w - 3, st.y * TS + 3, t, st.id, st.q === PERFEKT);
    // stubbarna (Björn valde den korta stocken efter v89) är en ruta stora: framför bänken och runt bordet
    if (d?.sitt) pileIcons.add(SITT, st.x * TS + w / 2 - TS / 2, (st.y + bh) * TS, TS / iconCanvas(SITT).width);
    for (const q of bordPlatser(st)) pileIcons.add(SITT, q.x * TS, q.y * TS, TS / iconCanvas(SITT).width);
    for (const k of st.med ?? []) { const b = 'kb_' + tillbehorDef(k)?.ikon + v; if (kb && hasIcon(b)) pileIcons.add(b, x0, y0, 1); else pileIcons.add(tillbehorDef(k)?.ikon + '_karta' + v, x0, y0, 2); } // tillbehören i den (skinnfällen i bädden), i bildstilen lagd ovanpå bädden
    if (st.tork?.length) hangande(st, x0, y0);
    const yta = (v ? YTA[st.k]?.v : YTA[st.k]) ?? { x: 2, y: 2 };
    (iBruk(st)?.saker ?? []).slice(0, 3).forEach((k, i) => sakVid(pileIcons, k, x0 + yta.x + (v ? 0 : i * 6), y0 + yta.y + (v ? i * 7 : 0))); // sida vid sida, i den stående under varandra
    const vid = yta.vid && tingOf(s).find(k => k.vid === st.id && k.hos === undefined && k.lass === undefined);
    if (vid) sakVid(pileIcons, vid.k, x0 + yta.vid!.x, y0 + yta.vid!.y);
  }
  // dörrarna i öppningarna (DORRAR i byggnad.ts): den stående bilden (_v) när väggen går uppåt (en vägg ovanför öppningen)
  for (const b of bitsOf(s)) if (b.dorr) { const ik = dorrDef(b.dorr)?.ikon, v = bitAt(s, b.x, b.y - 1)?.k === 'vagg' ? '_v' : '', k = hasIcon('kb_' + ik + v) ? 'kb_' + ik + v : ik + '_karta' + v; pileIcons.add(k, b.x * TS, b.y * TS, TS / iconCanvas(k).width); } // bildstilens dörr (skinndörren, steg 5.1.2.3) eller den som redan hade 16 punkter
  // de uppsatta facklorna (steg 6.3.7, ljus.ts): med foten i rutan, mot väggen när de sitter på en, den tända med lågan
  for (const u of s.uppsatta ?? []) {
    const k = 'kb_uppsatt' + (u.tand ? '_tand' : ''), c = iconCanvas(k);
    pileIcons.add(k, u.x * TS + ((TS - c.width) >> 1) + (u.vx ?? 0) * 5, u.y * TS + TS - 2 - c.height + (u.vy ?? 0) * 5, 1);
  }
  // talgljusen på borden och hyllorna (steg 6.3.8, ljus.ts): mitt på möbeln, två utseenden efter möbeln, det tända med lågan
  for (const l of s.ljus ?? []) {
    const st = stationById(s, l.st);
    if (!st) continue;
    const k = 'kb_talgljus' + (1 + st.id % 2) + (l.tand ? '_tand' : ''), c = iconCanvas(k), w = storlekAv(st).w * TS;
    pileIcons.add(k, st.x * TS + ((w - c.width) >> 1), st.y * TS + 6 - c.height, 1);
  }
  pileIcons.end(); rokIkoner.end();
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
  // stubbar: bleknar medan de ruttnar bort
  for (const k of s.stubbar ?? []) {
    const a = 1 - (s.now - k.t) / STUBBE_LIV, x = k.x * TS + TS * 0.65, y = k.y * TS + TS * 0.6;
    const r = 0.5 + 0.5 * a; // krymper i stället för att blekna
    structG.beginFill(0x3f2415).drawCircle(x, y, 3.2 * r).endFill();
    structG.beginFill(0x987e62).drawCircle(x, y - 0.6, 2.2 * r).endFill();
  }
  // fällda träd som ligger och väntar på att huggas till ved
  for (const k of s.stockar ?? []) {
    const x = k.x * TS, y = k.y * TS, len = 6 + Math.min(8, k.ved);
    structG.lineStyle(4, 0x5e3c24).moveTo(x - len / 2, y + 2).lineTo(x + len / 2, y - 1).lineStyle(0);
    structG.beginFill(0xd8b25f).drawCircle(x - len / 2, y + 2, 1.8).endFill();
  }
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
  if (!f.lit) return;
  if (l === 'stort') rokIkoner.add(gnistBild(), cx - ANIMTAKT.gnista.x, cy - ANIMTAKT.gnista.y, 1);
  rokIkoner.add(rokBild(undefined, e.x + e.y), cx - ANIMTAKT.rok.x, cy - ANIMTAKT.rok.y, 1); // varje eld i sin egen takt
}
// stationens bild ur bildstilen (kartbilder.ts, steg 5.1.2.2), den stående om stationen står vriden
// stubben att sitta på: bildstilens (steg 5.1.2.3) i en ruta
const SITT = hasIcon('kb_sittplats') ? 'kb_sittplats' : 'sittplats';
const stationBild = (ikon: string, v: string) => { const id = ikon + v, b = KARTBILDER[id]; return b && (b.sort === 'kar-station' || b.sort === 'kar-mobel') ? id : undefined; };
// husen: golv, väggar av timmer (eller flätat ris i äldre byar) och öppningar. Det som är planerat syns som en svag kontur, det som byggs fylls i
function drawBuild() {
  const klara = ritaHus(s, bitsOf(s)); // timmerväggarna, golven och öppningarna med golv (husbild.ts)
  for (const b of bitsOf(s)) {
    if (klara.has(b.id)) continue;
    const x = b.x * TS, y = b.y * TS;
    if (b.k === 'golv') {
      const col = palTal(MATERIAL[b.m]?.farg ?? MATERIAL.jord.farg); // närmaste färg i paletten; ett golv som byggs är bara en ram
      if (b.b >= 1) structG.beginFill(col).drawRect(x, y, TS, TS).endFill(); else structG.lineStyle(1, col).drawRect(x + 0.5, y + 0.5, TS - 1, TS - 1).lineStyle(0);
    } else if (b.k === 'vagg') {
      if (b.b <= 0 && b.mat <= 0) { structG.lineStyle(1, 0x5e3c24).drawRect(x + 1.5, y + 1.5, TS - 3, TS - 3).lineStyle(0); continue; }
      // timmerväggarna ritar ritaHus; här ritas risväggarna
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
