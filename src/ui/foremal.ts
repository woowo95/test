import { MASTERVERK, PERFEKT, Act, DJUR, GRODOR, faltById, faltKlar, faltOf, faltRuta, faltRutor, grodaPa, brasaHeat, radieAv, W, bordPlatser, sjoarna, stationById, GORS, MATERIAL, Pile, STATION, STUBBE_LIV, Station, bitAt, bitsOf, clamp, dorrDef, condOf, emberOn, fireHeat, forvarAt, getMap, grillVara, heatRadius, TORK, torrDel, isKlar, living, stationDef, stationKlar, stationerOf, storlekAv, tillbehorDef, tingOf, vidStation, zonesOf } from '../sim';
import { LagereldLage, iconCanvas, lagereldId } from '../ikoner';
import { ritaHus } from './husbild';
import { outPilesAt, piles, s, ui } from './lage';
import { Ikoner, TS, overG, pileLayer, structG } from './scen';

// det som står på marken: lagerplatserna och stackarna, stationerna, husen, stubbar, fällda träd och elden
const pileIcons = new Ikoner(pileLayer);
// skicket som färg: grönt, gult, rött
const condCol = (c: number) => c >= 0.5 ? 0x6fbf5a : c >= 0.25 ? 0xe0b040 : 0xd2553f;
// var ikonerna ligger i rutan, bakersta först
const PILE_LAYOUT = [[[4, 5]], [[1, 5], [7, 5]], [[4, 1], [1, 5], [7, 5]], [[2, 0], [6, 1], [0, 5], [8, 5]]];
// en stack: ju fullare desto fler saker i högen
function drawPile(pl: Pile, t: number) {
  const x0 = pl.x * TS, y0 = pl.y * TS, f = Math.min(1, pl.n / pl.max), g = structG, c = condOf(pl);
  // liten stapel för skicket längst ner i rutan
  g.beginFill(0x161210, 0.7).drawRect(x0 + 2, y0 + 13.5, 12, 2).endFill().beginFill(condCol(c)).drawRect(x0 + 2, y0 + 13.5, 12 * clamp(c, 0, 1), 2).endFill();
  // ikoner: ju fullare stacken är desto fler, redskap som en större bild
  if (pl.gor) { pileIcons.add(pl.gor, x0 + 2, y0, 1.5); framsteg(x0 + 12.5, y0 + 1.5, pl.klar ?? 0); return; } // påbörjat: framstegscirkeln i hörnet
  if (pl.max === 1) { pileIcons.add(pl.k, x0 + 2, y0, 1.5); if ((pl.q ?? 0) >= MASTERVERK) glans(x0 + 12, y0 + 3, t, pl.id ?? 0, pl.q === PERFEKT); return; }
  const n = clamp(Math.ceil(f * 4), 1, 4);
  for (const [dx, dy] of PILE_LAYOUT[n - 1]) pileIcons.add(pl.k, x0 + dx, y0 + dy, 1);
}
// mästerverken glänser (steg 2.2.2, platshållare): en liten ljus gnista som blinkar till ibland, var och en i sin takt.
// Kvaliteten syns annars inte på kartan
function glans(x: number, y: number, t: number, id: number, perfekt: boolean) {
  const f = (t / 2600 + id * 0.37) % 1;
  if (f > 0.18) return;
  const a = Math.sin(f / 0.18 * Math.PI), r = (perfekt ? 2.5 : 1.8) * a;
  overG.beginFill(0xfff3c8, 0.9 * a).drawRect(x - 0.5, y - r, 1, 2 * r).drawRect(x - r, y - 0.5, 2 * r, 1).endFill();
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
      if (!rojd) structG.lineStyle(1, 0x5e3c24, 0.7).drawRect(X + 0.5, Y + 0.5, TS - 1, TS - 1).lineStyle(0);
      else structG.beginFill(grav ? 0x5e3c24 : 0x7d5b40, 0.9).drawRect(X, Y, TS, TS).endFill();
      if (grav) for (let r = 0; r < 4; r++) structG.lineStyle(1, 0x3f2415, 0.8).moveTo(X + 1, Y + 2.5 + r * 4).lineTo(X + TS - 1, Y + 2.5 + r * 4).lineStyle(0);
      if (bild && grodaPa(f, k)) { const sc = liten ? 0.5 : 1, b = iconCanvas(bild).width * sc; pileIcons.add(bild, X + (TS - b) / 2, Y + (TS - b) / 2, sc); }
    }
    if (!vaxer && !mogen) { const i = faltRuta(f, Math.min(f.klara, f.n - 1)); framsteg((i % W) * TS + TS / 2, Math.floor(i / W) * TS + 3, faltKlar(f)); }
  }
}
// framstegscirkeln för det som inte är klart (Björn valde A2 efter v55): en mörk bricka med vit kant som fylls med gult,
// medsols från klockan tolv, ju längre arbetet kommit (p från 0 till 1). Samma som framstegSvg i panelerna (ikoner.ts)
function framsteg(cx: number, cy: number, p: number) {
  const r = 3.6, f = clamp(p, 0, 1);
  overG.beginFill(0x1c1814, 0.88).drawCircle(cx, cy, r).endFill();
  if (f > 0) overG.beginFill(0xe0b050).moveTo(cx, cy).arc(cx, cy, r - 0.7, -Math.PI / 2, -Math.PI / 2 + f * 2 * Math.PI).lineTo(cx, cy).endFill();
  overG.lineStyle(0.5, 0xf2ece0).drawCircle(cx, cy, r).lineStyle(0);
}
// stationens yta i bilden (världspixlar från bildens övre vänstra hörn): där saken som görs ligger, och redskapet som hör
// till den (kniven, bensylen i skåran)
const YTA: Record<string, { x: number; y: number; vid?: { x: number; y: number } }> = {
  slaktbank: { x: 16, y: 0, vid: { x: 30, y: -1 } },
  flatarbank: { x: 4, y: 10, vid: { x: 22, y: 9 } },
  grill: { x: 20, y: 0 }, // maten på spettet, till höger om elden
};
// det som görs vid en station syns på den (steg 2.2.12): sakens egen symbol medan någon arbetar där. Viltet och fisken ur
// djurregistret (DJUR), redskapen ur GORS, repet när någon tvinnar och skinnet när någon syr (steg 2.3.2). Bara utseende:
// spelet räknar likadant
const PA_BANKEN: Partial<Record<Act, string>> = { ...Object.fromEntries(Object.values(DJUR).map(d => [d.act, d.sak])), ...Object.fromEntries(Object.keys(GORS).map(g => [g, GORS[g][0]])), tvinna: 'rep', skinnrock: 'skinn', skinnskor: 'skinn' };
function paBanken(st: Station) {
  const d = stationDef(st.k), at = vidStation(st);
  const p = d && living(s).find(q => q.task && d.gor.includes(q.task.act) && Math.hypot(q.x - at.x, q.y - at.y) < STATION.vidBank);
  return p?.task ? p.task.act === 'grilla' ? grillVara(s)?.ra : PA_BANKEN[p.task.act] : undefined; // på spettet: det som grillas
}
// maten som hänger på torkställningen (steg 2.8.2): köttet i remsor och fisken i stjärten under slån, åtta platser som fylls
// efter hur mycket som hänger. Den byter färg från rött till mörkbrunt medan den torkar (torrDel). Bara utseende
const blanda = (a: number, b: number, f: number) => { let c = 0; for (const sh of [16, 8, 0]) c |= Math.round(((a >> sh) & 255) * (1 - f) + ((b >> sh) & 255) * f) << sh; return c; };
function hangande(st: Station, x0: number, y0: number) {
  const platser = 8, per = TORK.rymd / platser;
  let i = 0;
  for (const q of st.tork!) {
    const f = torrDel(s, q), n = Math.max(1, Math.round(q.n / per)), fisk = q.k !== 'kott';
    const farg = blanda(fisk ? 0xb87a5a : 0xb0342a, fisk ? 0x5a3a22 : 0x4a2416, f);
    for (let j = 0; j < n && i < platser; j++, i++) {
      const x = x0 + 9 + i * 1.8, y = y0 + 3;
      overG.beginFill(farg);
      if (fisk) overG.drawRect(x, y, 1, 1.5).drawEllipse(x + 0.5, y + 4.5, 0.9, 3).endFill(); // stjärten i slån och kroppen under
      else overG.drawRect(x, y, 1.4, 7 - (i % 3)).endFill(); // en köttremsa
    }
  }
}
// brasan (steg 2.9.1; Björn valde härden av hällar efter v89): veden när det finns bränsle, lågorna när den brinner och glöden
// när den nästan brunnit ut, ovanpå stenarna. Värmen när eldens flik är öppen
const BRASA_GLOD = 0.25; // under den här styrkan syns bara glöden
function brasaBild(st: Station, x0: number, y0: number, flik: boolean) {
  const I = brasaHeat(st);
  if (I) pileIcons.add(I < BRASA_GLOD ? 'brasa_glod_karta' : 'brasa_eld_karta', x0, y0, 2);
  else if ((st.eld?.fuel ?? 0) > 0) pileIcons.add('brasa_ved_karta', x0, y0, 2);
  if (I && flik) overG.beginFill(0xff9a4a, 0.1).lineStyle(1, 0xffb070, 0.5).drawCircle(st.x * TS + TS / 2, st.y * TS + TS / 2, radieAv(s, I) * TS).endFill().lineStyle(0);
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
  const m = getMap(s.seed), tab = ui.tab;
  structG.clear(); overG.clear();
  // lagerplatsen: en ram runt rutorna, och en stack per ruta
  zonesOf(s).forEach((z, i) => {
    const on = tab === 'lager' && ui.lagerNr === i;
    structG.beginFill(0x5b4a35, 0.22).lineStyle(1, on ? 0xffffff : 0x5b4a35, on ? 0.9 : 0.5).drawRoundedRect(z.x * TS + 0.5, z.y * TS + 0.5, z.w * TS - 1, z.h * TS - 1, 3).endFill().lineStyle(0);
  });
  drawBuild();
  pileIcons.start();
  drawFalt();
  lagereld(m.fire, t);
  for (const pl of piles()) if (!forvarAt(s, pl.x, pl.y)?.stangd) drawPile(pl, t); // det som ligger i en kista syns bara när man trycker på den
  // stationerna (stationer.ts) i blandperspektiv över alla rutorna de tar: de som är högre än rutan sticker upp över rutan
  // ovanför. Den halvbyggda har framstegscirkeln överst i mitten; vid den färdiga ligger kniven och det som görs där
  for (const st of stationerOf(s)) {
    const d = stationDef(st.k), ik = (d?.ikon ?? 'slaktbank') + '_karta', { w: bw, h: bh } = storlekAv(st), w = bw * TS, upp = (iconCanvas(ik).height - 8 * (st.rot ? bw : bh)) * 2;
    // den vridna sticker ut åt vänster i stället för uppåt (platshållare tills Björn valt hur den ska se ut)
    const x0 = st.x * TS - (st.rot ? upp : 0), y0 = st.y * TS - (st.rot ? 0 : upp); // bildens övre vänstra hörn
    pileIcons.add(ik, x0, y0, 2, !!st.rot);
    if (!isKlar(st)) { framsteg(st.x * TS + w / 2, y0 + 3, stationKlar(st)); continue; }
    if (st.fyllt) overG.beginFill(0x24160a, 0.75 * clamp(st.fyllt, 0, 1)).drawEllipse(st.x * TS + TS / 2, st.y * TS + TS / 2 + 1, 5, 4).endFill(); // latrinen mörknar när den fylls (smuts.ts)
    if (d?.brasa) brasaBild(st, x0, y0, tab === 'eld');
    if ((st.q ?? 0) >= MASTERVERK) glans(st.x * TS + w - 3, st.y * TS + 3, t, st.id, st.q === PERFEKT);
    // stubbarna (Björn valde den korta stocken efter v89) är en ruta stora: framför bänken och runt bordet
    if (d?.sitt) pileIcons.add('sittplats', st.x * TS + w / 2 - TS / 2, (st.y + bh) * TS, 2);
    for (const q of bordPlatser(st)) pileIcons.add('sittplats', q.x * TS, q.y * TS, 2);
    for (const k of st.med ?? []) pileIcons.add(tillbehorDef(k)?.ikon + '_karta', x0, y0, 2, !!st.rot); // tillbehören i den (skinnfällen i bädden)
    if (st.rot) continue;
    if (st.tork?.length) hangande(st, x0, y0);
    const yta = YTA[st.k] ?? { x: 2, y: 2 };
    const sak = paBanken(st);
    if (sak) pileIcons.add(sak, x0 + yta.x, y0 + yta.y, 1);
    const vid = yta.vid && tingOf(s).find(k => k.vid === st.id && k.hos === undefined && k.lass === undefined);
    if (vid) pileIcons.add(vid.k, x0 + yta.vid!.x, y0 + yta.vid!.y, 1);
  }
  // dörrarna i öppningarna (DORRAR i byggnad.ts): vriden när väggen går uppåt (en vägg ovanför öppningen)
  for (const b of bitsOf(s)) if (b.dorr) pileIcons.add(dorrDef(b.dorr)?.ikon + '_karta', b.x * TS, b.y * TS, 2, bitAt(s, b.x, b.y - 1)?.k === 'vagg');
  pileIcons.end();
  // markerad hög utanför lagret: vit kant runt rutan, som lagerplatsen får
  const h = ui.hogAt;
  if (tab === 'hog' && outPilesAt(h.x, h.y).length) structG.lineStyle(1, 0xffffff, 0.9).drawRoundedRect(h.x * TS + 0.5, h.y * TS + 0.5, TS - 1, TS - 1, 3).lineStyle(0);
  // det som är valt i panelen: vit kant runt huset, sjön, fältet eller stationen (steg 2.3.7)
  if (tab === 'hus') kant(bitsOf(s).filter(b => b.hus === ui.husId).map(b => b.y * W + b.x));
  if (tab === 'sjo') kant(sjoarna(s.seed).rutor[ui.sjoNr] ?? []);
  const fv = tab === 'falt' ? faltById(s, ui.faltId) : undefined; // fältet, eller grödan på en av dess rutor (steg 2.10.14)
  if (fv) kant(ui.faltRuta >= 0 ? [faltRuta(fv, ui.faltRuta)] : faltRutor(fv));
  const vald = tab === 'station' ? stationById(s, ui.stationId) : undefined;
  if (vald) { const { w, h: d } = storlekAv(vald); overG.lineStyle(1, 0xffffff, 0.9).drawRoundedRect(vald.x * TS + 0.5, vald.y * TS + 0.5, w * TS - 1, d * TS - 1, 2).lineStyle(0); }
  // stubbar: bleknar medan de ruttnar bort
  for (const k of s.stubbar ?? []) {
    const a = 1 - (s.now - k.t) / STUBBE_LIV, x = k.x * TS + TS * 0.65, y = k.y * TS + TS * 0.6;
    structG.beginFill(0x4a3420, 0.9 * a).drawCircle(x, y, 3.2).endFill();
    structG.beginFill(0xb08a58, 0.9 * a).drawCircle(x, y - 0.6, 2.2).endFill();
  }
  // fällda träd som ligger och väntar på att huggas till ved
  for (const k of s.stockar ?? []) {
    const x = k.x * TS, y = k.y * TS, len = 6 + Math.min(8, k.ved);
    structG.lineStyle(4, 0x5a3c22).moveTo(x - len / 2, y + 2).lineTo(x + len / 2, y - 1).lineStyle(0);
    structG.beginFill(0xc9a46a).drawCircle(x - len / 2, y + 2, 1.8).endFill();
  }
  // eld
  const f = m.fire, cx = f.x * TS + TS / 2, cy = f.y * TS + TS / 2;
  // värmeområdet visas när eldens flik är öppen
  if (tab === 'eld' && s.fire.lit) structG.beginFill(0xff9a4a, 0.1).lineStyle(1, 0xffb070, 0.5).drawCircle(cx, cy, heatRadius(s) * TS).endFill().lineStyle(0);
  if (tab === 'eld') structG.lineStyle(1.5, 0xffffff, 0.9).drawCircle(cx, cy, 15).lineStyle(0);
}
// lägerelden (Björn valde efter v92): en bild för varje läge (ikoner.ts), två rutor bred med elden mitt i.
// En brinnande eld har två bilder som byts så att den fladdrar
function lagereld(f: { x: number; y: number }, t: number) {
  const fr = Math.floor(t / 220) % 2 ? '2' : '';
  const l: LagereldLage = s.fire.lit ? (fireHeat(s) > 0.5 ? `stort${fr}` : `lite${fr}`) as LagereldLage
    : emberOn(s) ? 'glod' : (s.fire.ash ?? 0) >= 1 ? 'kol' : s.fire.fuel > 0 ? 'ny' : 'tom';
  pileIcons.add(lagereldId(l, !!s.fire.ring), f.x * TS + TS / 2 - 16, f.y * TS + TS / 2 - 24, 2);
}
// husen: golv, väggar av timmer (eller flätat ris i äldre byar) och öppningar. Det som är planerat syns som en svag kontur, det som byggs fylls i
function drawBuild() {
  const klara = ritaHus(s, bitsOf(s)); // timmerväggarna och trägolven (husbild.ts)
  for (const b of bitsOf(s)) {
    if (klara.has(b.id)) continue;
    const x = b.x * TS, y = b.y * TS;
    if (b.k === 'golv') {
      const col = MATERIAL[b.m]?.farg ?? MATERIAL.jord.farg, a = b.b >= 1 ? (b.m === 'jord' ? 0.55 : 0.85) : 0.12 + 0.3 * b.b;
      structG.beginFill(col, a).drawRect(x, y, TS, TS).endFill();
      if (b.m === 'tra' && b.b >= 1) for (let k = 1; k < 3; k++) structG.lineStyle(0.6, 0x5a3c22, 0.7).moveTo(x, y + TS * k / 3).lineTo(x + TS, y + TS * k / 3).lineStyle(0); // plankorna
    } else if (b.k === 'vagg') {
      if (b.b <= 0 && b.mat <= 0) { structG.lineStyle(1, 0x5a3c22, 0.45).drawRect(x + 1.5, y + 1.5, TS - 3, TS - 3).lineStyle(0); continue; }
      const a = b.b >= 1 ? 0.55 + 0.45 * b.c : 0.25 + 0.5 * b.b;
      if (b.m === 'timmer') {
        // stockarna läggs en i taget nerifrån: fler ju längre bygget kommit. De täcker hela rutan så att väggarna sitter ihop
        const n = b.b >= 1 ? 4 : Math.ceil(4 * b.b), h = TS / 4;
        if (!n) { structG.lineStyle(1, 0x5a3c22, 0.45).drawRect(x + 1.5, y + 1.5, TS - 3, TS - 3).lineStyle(0); continue; }
        structG.beginFill(MATERIAL.timmer.farg, a).drawRect(x, y + TS - n * h, TS, n * h).endFill();
        for (let k = 0; k < n; k++) {
          const yy = y + TS - (k + 1) * h;
          structG.lineStyle(0.8, 0x4a3018, a).moveTo(x, yy + h - 0.4).lineTo(x + TS, yy + h - 0.4).lineStyle(0);
        }
        continue;
      }
      structG.beginFill(MATERIAL.ris.farg, a).drawRect(x + 1, y + 1, TS - 2, TS - 2).endFill();
      // flätningen: vågiga streck, färre ju mer slitet
      const n = b.b >= 1 ? Math.max(1, Math.round(3 * b.c)) : Math.ceil(3 * b.b);
      for (let k = 0; k < n; k++) { const yy = y + TS * (0.28 + 0.22 * k); structG.lineStyle(1, 0xb08a58, a).moveTo(x + 2, yy).lineTo(x + TS / 2, yy + 1.5).lineTo(x + TS - 2, yy).lineStyle(0); }
      for (let k = 1; k < 3; k++) structG.lineStyle(1, 0x3a2614, a).moveTo(x + TS * k / 3, y + 1).lineTo(x + TS * k / 3, y + TS - 1).lineStyle(0);
    } else {
      structG.beginFill(MATERIAL.oppning.farg, 0.35).drawRect(x + 1, y + 1, TS - 2, TS - 2).endFill(); // öppningen: trampad jord
    }
  }
}
