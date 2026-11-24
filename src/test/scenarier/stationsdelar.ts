// Stationer i flera delar (steg 9.4.1–9.4.2): en provstation i tre delar som bara finns under scenariot
import { createState, W, inMap, gridOf, type StationDef, type Station } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, iRing, medHus } from './hjalp';

// den första platsen i ring runt byns mitt där rutorna är fria (ingen station, inget rum, brukbar mark)
type Fri = (x: number, y: number, w: number, h: number) => boolean;
const friPlats = (s: SIM.State, duger: (fri: Fri, x: number, y: number) => boolean) => {
  const fri: Fri = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!inMap(x + i, y + j) || !SIM.usable(s, x + i, y + j, true) || SIM.stationAt(s, x + i, y + j) || SIM.roomAt(s, x + i, y + j)) return false; return true; };
  return iRing(SIM.bynsMitt(s), 4, 30, 24, (x, y) => duger(fri, x, y) && { x, y });
};

SCENARIER.stationsdelar = {
  text: 'Steg 9.4.1–9.4.2: en station kan bestå av delar som står och vrids var för sig. Den byggs i en rad, varje del tar sina rutor, man arbetar vid delen med arbete, hela stationen flyttas med alla delar, och den går att arbeta vid bara när alla delar står i samma rum',
  kor: () => {
    const REG = SIM.STATIONER as Record<string, StationDef>;
    REG.provdelar = { ...REG.flatarbank, namn: 'Provbänk', delar: [{ namn: 'Bänken', w: 2, h: 1, arbete: true }, { namn: 'Stället', w: 1, h: 1 }, { namn: 'Baljan', w: 1, h: 1 }] };
    try {
      const s = createState(1, START);
      medHus(s);
      const at = friPlats(s, (fri, x, y) => fri(x, y, 4, 1) && fri(x, y + 3, 8, 3));
      if (!at) return [['en fri plats för provstationen', false]];
      const t: Station = { id: (s.nextStation = (s.nextStation ?? 0) + 1), k: 'provdelar', x: at.x, y: at.y, kvar: 0, delar: SIM.delarIRad('provdelar', at.x, at.y) };
      (s.stationer ??= []).push(t); s.byggV = (s.byggV ?? 0) + 1;
      const rad = SIM.delarAv(t).map(q => `${q.x - at!.x},${q.y - at!.y} ${q.w}×${q.h}`).join(' | ');
      const iRad = rad === '0,0 2×1 | 2,0 1×1 | 3,0 1×1' && SIM.storlekAv(t).w === 4 && [0, 1, 2, 3].every(i => SIM.stationAt(s, at!.x + i, at!.y) === t);
      const vid = SIM.vidStation(t), vidBank = Math.abs(vid.x - (at.x + 1)) < 1e-9 && Math.abs(vid.y - (at.y + 1.1)) < 1e-9;
      // baljan flyttas för sig, och bänken vrids där den står
      const flytt = SIM.flyttaDel(s, t, 2, at.x + 5, at.y + 4);
      const gammal = SIM.stationAt(s, at.x + 3, at.y) === undefined, ny = SIM.stationAt(s, at.x + 5, at.y + 4) === t, bbox = SIM.storlekAv(t);
      const vrid = SIM.flyttaDel(s, t, 0, at.x, at.y, true), vriden = SIM.delarAv(t)[0].w === 1 && SIM.delarAv(t)[0].h === 2 && SIM.stationAt(s, at.x, at.y + 1) === t;
      const krock = !SIM.flyttaDel(s, t, 1, at.x, at.y); // på bänken: får inte plats
      const helUte = SIM.helStation(s, t) && SIM.stationFor(s, 'tvinna') === t;
      // hela stationen flyttas: alla delar lika långt
      const fore = SIM.delarAv(t).map(q => [q.x - t.x, q.y - t.y]), helFlytt = SIM.flyttaStation(s, t, t.x + 1, t.y + 1), efter = SIM.delarAv(t).map(q => [q.x - t.x, q.y - t.y]);
      const sammaForm = helFlytt && JSON.stringify(fore) === JSON.stringify(efter);
      // en del inne i huset och resten ute: inte hel, och ingen kan arbeta vid den
      const golv = gridOf(s).rooms.flatMap(r => r.tiles).find(i => !SIM.stationAt(s, i % W, Math.floor(i / W)) && !SIM.sittAt(s, i % W, Math.floor(i / W)));
      const inne = golv !== undefined && SIM.flyttaDel(s, t, 1, golv % W, Math.floor(golv / W));
      const delad = inne && !SIM.helStation(s, t) && SIM.stationFor(s, 'tvinna') === undefined;
      // delarna utan egen tid delar stationens tid (steg 12.1.230): smedjan tar sina 20 minuter, inte en minut per del
      const sm = REG.smedja, smMin = [0, 1].map(i => SIM.delMin(sm, i)), ok = REG.ortkok;
      const tid230 = smMin.every(m => m === sm.min / 2) && SIM.stationMin(sm) === sm.min && SIM.stationMin(ok) === ok.delar!.reduce((a, q) => a + (q.min ?? 0), 0);
      return [
        [`delarna utan egen tid delar stationens tid: smedjans ässja och städ ${smMin.join(' + ')} min av ${sm.min} (steg 12.1.230)`, tid230],
        [`stationen byggs med delarna i en rad och varje del tar sina rutor (${rad})`, iRad],
        ['man arbetar framför delen med arbete (bänken)', vidBank],
        [`en del flyttas för sig och tar sina nya rutor (rutan runt delarna ${bbox.w} × ${bbox.h})`, flytt && gammal && ny && bbox.w === 6 && bbox.h === 5],
        ['en del vrids ett kvarts varv där den står', vrid && vriden],
        ['en del får inte ställas på en annan del', krock],
        ['med alla delar ute är stationen hel och går att arbeta vid', helUte],
        ['hela stationen flyttas med alla delar lika långt', sammaForm],
        [`med en del inne i huset och resten ute är den inte hel, och ingen arbetar vid den (${golv === undefined ? 'inget golv' : inne ? 'delen står inne' : 'fick inte plats inne'})`, delad],
      ];
    } finally { delete REG.provdelar; }
  },
};

SCENARIER.ortkokdelar = {
  text: 'Steg 9.4.3: örtköket står i tre delar, härden med krukan, torkstället med örterna och bänken med morteln, och går att arbeta vid först när alla delar står i samma rum',
  kor: () => {
    const s = createState(1, START);
    medHus(s);
    const at = friPlats(s, (fri, x, y) => fri(x, y, 3, 3));
    if (!at) return [['en fri plats för örtköket', false]];
    const t: Station = { id: (s.nextStation = (s.nextStation ?? 0) + 1), k: 'ortkok', x: at.x, y: at.y, kvar: 0, delar: SIM.delarIRad('ortkok', at.x, at.y) };
    (s.stationer ??= []).push(t); s.byggV = (s.byggV ?? 0) + 1;
    const namn = SIM.delarAv(t).map(q => q.del?.namn).join(', '), arbete = SIM.arbetsDel(t).del?.namn;
    const ute = SIM.helStation(s, t) && SIM.stationFor(s, 'koka_salva') === t;
    // härden in i huset: delarna står i olika rum, och ingen kokar där
    const golv = gridOf(s).rooms.flatMap(r => r.tiles).find(i => [0, 1].every(j => { const x = i % W, y = Math.floor(i / W) + j; return !SIM.stationAt(s, x, y) && !SIM.sittAt(s, x, y) && SIM.roomAt(s, x, y); }));
    const inne = golv !== undefined && SIM.flyttaDel(s, t, 0, golv % W, Math.floor(golv / W));
    const delad = inne && !SIM.helStation(s, t) && SIM.stationFor(s, 'koka_salva') === undefined;
    // och ut igen bredvid de andra: hel igen
    const ater = SIM.flyttaDel(s, t, 0, at.x, at.y) && SIM.helStation(s, t) && SIM.stationFor(s, 'koka_salva') === t;
    // en sparad by med ett örtkök i ett stycke får delarna i en rad där det stod
    const g: Station = { id: t.id + 1, k: 'ortkok', x: 0, y: 0, kvar: 0 };
    const sp = { ...s, v: 28, stationer: [g] } as typeof s;
    SIM.migrate(sp);
    return [
      [`örtköket har tre delar (${namn}) och man arbetar vid bänken (${arbete})`, namn === 'Härden, Torkstället, Bänken' && arbete === 'Bänken'],
      ['med alla delar ute går det att koka salva där', ute],
      [`med härden inne i huset och resten ute går det inte (${golv === undefined ? 'inget golv' : inne ? 'härden står inne' : 'fick inte plats inne'})`, delad],
      ['med härden tillbaka bredvid de andra går det igen', ater],
      [`ett sparat örtkök i ett stycke får delarna i en rad (${g.delar?.length ?? 0} delar)`, g.delar?.length === 3],
      ...delbyggen(),
    ];
  },
};

// steg 12.1.17: örtkökets delar är tre byggen med eget material och egen arbetstid, som rivs var för sig
function delbyggen(): [string, boolean][] {
  const dl = SIM.STATIONER.ortkok.delar!, rad = dl.map(q => `${q.namn} ${Object.entries(q.av ?? {}).map(([k, n]) => `${n} ${k}`).join(', ')} ${q.min} min`).join(' | ');
  const summa = dl.reduce((n, q) => n + (q.min ?? 0), 0) === SIM.RECEPT.ortkok.min && dl.reduce((n, q) => n + (q.av?.sten ?? 0), 0) === SIM.RECEPT.ortkok.av!.sten && dl.reduce((n, q) => n + (q.av?.virke ?? 0), 0) === SIM.RECEPT.ortkok.av!.virke;
  const s = createState(1, START);
  medHus(s);
  const p = s.people[0], tk = (): SIM.Task => ({ act: 'station', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '', tool: 'ortkok' });
  for (const k of ['sten', 'virke']) SIM.setAmount(s, k, 0);
  SIM.setAmount(s, 'sten', 4);
  // ett påbörjat örtkök där ingen del har tagit sitt material än (platsen väljs i byggplanen, här står det på en fri plats ute)
  const fri = (x: number, y: number) => { for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (!inMap(x + i, y + j) || !SIM.usable(s, x + i, y + j, true) || SIM.stationAt(s, x + i, y + j) || SIM.roomAt(s, x + i, y + j)) return false; return true; };
  const c = SIM.bynsMitt(s);
  let at: { x: number; y: number } | undefined;
  for (let r = 4; r < 30 && !at; r++) for (let k = 0; k < 24 && !at; k++) { const x = Math.round(c.x + Math.cos(k / 24 * 6.283) * r), y = Math.round(c.y + Math.sin(k / 24 * 6.283) * r); if (fri(x, y)) at = { x, y }; }
  if (!at) return [['en fri plats för örtköket', false]];
  const t: Station = { id: (s.nextStation = (s.nextStation ?? 0) + 1), k: 'ortkok', x: at.x, y: at.y, kvar: 20 * SIM.MIN, delar: SIM.delarIRad('ortkok', at.x, at.y)!.map((q, i) => ({ ...q, kvar: dl[i].min! * SIM.MIN })) };
  (s.stationer ??= []).push(t); s.byggV = (s.byggV ?? 0) + 1;
  const t1 = tk(); SIM.startStation(s, p, t1);
  const forsta = t1.ref === t.id && t.delar![0].mat === 1 && !t.delar![1].mat && SIM.amountOf(s, 'sten') === 0 && Math.abs(t.kvar - 20 * SIM.MIN) < 1e-6 && Math.abs(t1.until - s.now - 8 * SIM.MIN) < 1e-6;
  // härden byggs klar: stationen är inte klar, och nästa del vill ha virke
  SIM.workStation(s, p, t1, 8 * 60); SIM.finishStation(s, p, t1);
  const hard = !t.delar![0].kvar && !SIM.isKlar(t) && Math.abs(t.kvar - 12 * SIM.MIN) < 1e-6 && SIM.nastaAv('ortkok', t).virke === 1 && !SIM.nastaAv('ortkok', t).sten;
  const t2 = tk(); SIM.startStation(s, p, t2);
  const utanVirke = t2.ref === undefined && !t.delar![1].mat;
  SIM.setAmount(s, 'virke', 2);
  for (let i = 0; i < 2; i++) { const q = tk(); SIM.startStation(s, p, q); SIM.workStation(s, p, q, 6 * 60); SIM.finishStation(s, p, q); }
  const klar = SIM.isKlar(t) && SIM.amountOf(s, 'virke') === 0 && SIM.helStation(s, t) && SIM.stationFor(s, 'koka_salva') === t;
  // torkstället rivs: örtköket är inte klart, och torkstället byggs igen med ett nytt virke
  t.eld = { ved: 1, lit: 1 };
  const riv = SIM.rivDel(s, t, 1) && !SIM.isKlar(t) && SIM.stationFor(s, 'koka_salva') === undefined && SIM.nastaAv('ortkok', t).virke === 1 && !!t.eld;
  const rivHard = SIM.rivDel(s, t, 0) && !t.eld; // elden hör till härden
  // ett halvbyggt örtkök från förr har tagit allt material: arbetet kvar ligger på de sista delarna
  const g: Station = { id: 99, k: 'ortkok', x: 0, y: 0, kvar: 10 * SIM.MIN, delar: SIM.delarIRad('ortkok', 0, 0) };
  const sp = { ...createState(1, START), v: 59, stationer: [g] } as SIM.State;
  SIM.migrate(sp);
  const mig = !g.delar![0].kvar && Math.abs((g.delar![1].kvar ?? 0) - 4 * SIM.MIN) < 1e-6 && Math.abs((g.delar![2].kvar ?? 0) - 6 * SIM.MIN) < 1e-6 && g.delar!.slice(1).every(q => q.mat === 1);
  return [
    [`varje del är ett eget bygge (${rad}), tillsammans som örtkökets recept`, rad === 'Härden 4 sten 8 min | Torkstället 1 virke 6 min | Bänken 1 virke 6 min' && summa],
    ['örtköket börjar med härden: stenarna tas, virket inte, och arbetet är härdens 8 minuter', forsta],
    ['när härden är klar är örtköket inte klart, och nästa del vill ha ett virke', hard],
    ['utan virke blir det inget arbete på torkstället', utanVirke],
    ['med virke byggs torkstället och bänken, och sedan går det att koka där', klar],
    ['en del rivs för sig: örtköket är inte klart, och delen byggs igen med sitt material', riv],
    ['elden hör till härden och släcks när den rivs', rivHard],
    ['ett halvbyggt örtkök från förr får arbetet kvar på de sista delarna', mig],
  ];
}

SCENARIER.brannolja = {
  text: 'Steg 12.1.16: brännoljan och rökelsen kokas bara i örtköket, med elden tänd, som salvan och tjäran',
  kor: () => {
    const s = createState(1, START);
    medHus(s);
    const acts = ['koka_olja', 'koka_rokelse'] as const;
    const iBara = acts.every(a => SIM.STATIONER.ortkok.bara!.includes(a));
    const utan = acts.every(a => !SIM.kanGoras(s, a));
    const fri = (x: number, y: number, w: number, h: number) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!inMap(x + i, y + j) || !SIM.usable(s, x + i, y + j, true) || SIM.stationAt(s, x + i, y + j) || SIM.roomAt(s, x + i, y + j)) return false; return true; };
    const c = SIM.bynsMitt(s);
    let at: { x: number; y: number } | undefined;
    for (let r = 4; r < 30 && !at; r++) for (let k = 0; k < 24 && !at; k++) { const x = Math.round(c.x + Math.cos(k / 24 * 6.283) * r), y = Math.round(c.y + Math.sin(k / 24 * 6.283) * r); if (fri(x, y, 3, 3)) at = { x, y }; }
    if (!at) return [['en fri plats för örtköket', false]];
    const t: Station = { id: (s.nextStation = (s.nextStation ?? 0) + 1), k: 'ortkok', x: at.x, y: at.y, kvar: 0, delar: SIM.delarIRad('ortkok', at.x, at.y) };
    (s.stationer ??= []).push(t); s.byggV = (s.byggV ?? 0) + 1;
    const med = acts.every(a => SIM.kanGoras(s, a) && SIM.stationFor(s, a) === t);
    const p = s.people[0], v = SIM.vidStation(t);
    p.x = v.x; p.y = v.y;
    const tk = (a: string): SIM.Task => ({ act: a as SIM.Act, phase: 'do', tx: p.x, ty: p.y, until: s.now + 5 * SIM.MIN, carry: 0, why: '' });
    // utan ved och med kall eld blir det inget arbete; med ved tänds elden först
    SIM.setAmount(s, 'ved', 0);
    const kall = acts.every(a => SIM.eldaForst(s, p, tk(a)) === false) && !SIM.stationBrinner(t);
    SIM.setAmount(s, 'ved', 10);
    const tand = SIM.eldaForst(s, p, tk('koka_olja')), brinner = SIM.stationBrinner(t);
    const igen = SIM.eldaForst(s, p, tk('koka_rokelse'));
    return [
      ['brännoljan och rökelsen görs bara i örtköket, som salvan och tjäran', iBara && SIM.STATIONER.ortkok.bara!.includes('koka_salva') && SIM.STATIONER.ortkok.bara!.includes('koka_tjara')],
      ['utan örtkök går de inte att koka', utan],
      ['med ett helt örtkök kokas de där', med],
      ['med kall eld och ingen ved blir det inget arbete', kall],
      [`med ved tänds elden först (${tand} min) och brinner sedan, så nästa kokning börjar direkt (${igen} min)`, typeof tand === 'number' && tand > 0 && brinner && igen === 0],
    ];
  },
};

SCENARIER.slojdbankar = {
  text: 'Slöjdbänkarna (steg 12.1.150): behovet räknas ur arbetet som väntar vid bänken (det antal som saknas av det som görs där gånger receptets minuter, steg 12.1.212) i stället för en per tolv vuxna; en bänk till byggs när mer väntar än bänkarna hinner',
  kor: () => {
    const s = createState(1, START);
    medHus(s);
    const bank = (n: number) => { s.stationer = (s.stationer ?? []).filter(t => t.k !== 'flatarbank'); for (let i = 0; i < n; i++) (s.stationer ??= []).push({ id: (s.nextStation = (s.nextStation ?? 0) + 1), k: 'flatarbank', x: 1 + 3 * i, y: 1, kvar: 0 } as Station); s.byggV = (s.byggV ?? 0) + 1; };
    // det som väntar i byn: bristen i projekten gånger minuterna, för det som görs vid bänken
    bank(1);
    // (steg 12.1.212) omgångarna som saknas gånger minuterna, och recepten hittas genom projektets handling (repet tvinnas)
    const gor = SIM.STATIONER.flatarbank.gor as readonly string[];
    let vantat = 0; const nan: string[] = [], med1: string[] = [];
    for (const g of SIM.PROJEKT_LIST) { const ko = SIM.PROJEKT[g].ko; if (!ko || !gor.includes(ko.act)) continue; med1.push(ko.act); const b = SIM.bristNu(s, g); if (Number.isNaN(b)) nan.push(g); if (b > 0) vantat += ko.saknas(s) * ko.min; }
    const vid = SIM.koKrok.vid(s, 'flatarbank');
    const utanKo = gor.filter(a => !med1.includes(a));
    s.projektSaknar = { ...s.projektSaknar, rep: { beh: 3, n: 3, b: 1 } }; // repet görs när ett projekt behöver det (steg 13.8.4): här tre
    const rep = SIM.PROJEKT.rep.ko!, repSaknas = Math.ceil(SIM.villHaAv(s, 'rep') - SIM.amountOf(s, 'rep') - 1e-9);
    const hinner = SIM.STATIONER.flatarbank.hinner!;
    // med ett bestämt arbete som väntar
    const med = (min: number, n: number) => { const f = SIM.koKrok.vid; SIM.koKrok.vid = () => min; try { bank(n); return SIM.stationBrist(s, 'flatarbank'); } finally { SIM.koKrok.vid = f; } };
    return [
      [`arbetet som väntar vid bänken räknas ur projekten (${vid.toFixed(1)} minuter, väntat ${vantat.toFixed(1)}${nan.length ? `; brist som inte går att räkna hoppas över: ${nan.join(', ')}` : ''})`, Math.abs(vid - vantat) < 1e-9 && Number.isFinite(vid)],
      [`allt som görs vid bänken finns i kön genom projektens handling${utanKo.length ? ` (saknas: ${utanKo.join(', ')})` : ''}`, utanKo.length === 0],
      [`repet räknas i antal: ${repSaknas} rep saknas gånger ${rep.min} minuter`, rep.act === 'tvinna' && rep.saknas(s) === Math.max(0, repSaknas) && repSaknas > 1],
      ['utan slöjdbänk vill byn ha en, också när inget väntar', med(0, 0) === 1],
      ['en bänk räcker när mindre väntar än den hinner', med(hinner * 0.8, 1) === 0],
      [`mer än en bänk hinner: byn vill ha en till (${med(hinner * 1.5, 1)})`, med(hinner * 1.5, 1) > 0],
      ['med två bänkar är det nog', med(hinner * 1.5, 2) === 0],
      ['antalet vuxna avgör inte längre', !('perVuxna' in SIM.STATIONER.flatarbank)],
    ];
  },
};
SCENARIER.kladmaterial = {
  text: 'Steg 12.1.20: materialet till kläderna. Ett plagg som väntar på läder, lintyg eller ylle ärver genom projektet som gör materialet (garvningen, vävningen), och skinnet det i sin tur väntar på hämtas genom jakten (KALLA i projekt.ts). Tygets plagg vill byn ha när någon kan väva, också innan tyget finns, och det projekten saknar gör linet mer värt att så (grodaPoang i odling.ts)',
  kor: () => {
    const s = createState(1, START);
    medHus(s);
    const p = s.people.find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!, f = SIM.dangers(s);
    for (const id of ['skinnklader', 'garvning', 'kniv', 'flatarbank']) (p.tek ??= {})[id] = 1;
    SIM.setAmount(s, 'skinn', 0); SIM.setAmount(s, 'talg', 5);
    (s.stationer ??= []).push({ id: (s.nextStation = (s.nextStation ?? 0) + 1), k: 'garvning', x: 1, y: 5, kvar: 0, delar: SIM.delarIRad('garvning', 1, 5) } as Station); s.byggV = (s.byggV ?? 0) + 1;
    const jakt = SIM.hamtas('skinn')?.act === 'jakt' && SIM.hamtas('radjursskinn')?.act === 'jakt';
    const viaGarvning = SIM.fattas(s, p, 'garva', f), lader = SIM.arv(s, p, 'lader', f);
    // jakten efter skinn räknar hur många som fattas (steg 12.1.220): tre skinn fattas, en jägare är ute: en till går; tre ute: ingen
    const andra = s.people.filter(q => q !== p && SIM.alive(q)).slice(0, 3);
    s.projektSaknar = { skinn: { beh: 3, n: 3, b: 0.8 } };
    andra[0].task = { act: 'jakt', phase: 'go', tx: 0, ty: 0, until: s.now + 1e6, carry: 0, why: '', hamtar: 'skinn' } as unknown as SIM.Task;
    const enUte = SIM.arv(s, p, 'skinn', f)?.sak;
    for (const q of andra) q.task = { act: 'jakt', phase: 'go', tx: 0, ty: 0, until: s.now + 1e6, carry: 0, why: '', hamtar: 'skinn' } as unknown as SIM.Task;
    const treUte = SIM.arv(s, p, 'skinn', f)?.sak;
    for (const q of andra) q.task = undefined; s.projektSaknar = undefined;
    // hur många slöjdbänkar byn vill ha prövas i scenariot slojdbankar (steg 12.1.150)
    // linet: utan tyg och utan vävare vill byn inga tunikor; med en vävare vill den en var, och bristen följer kedjan bakåt
    const tunikor = () => SIM.REDSKAPMAL.tunika(s);
    const utanVavare = tunikor();
    for (const q of SIM.living(s)) (q.tek ??= {}).vavstol = 0.5; // halvvägs lärd: ingen kan väva än (steg 12.1.205)
    const halvLard = tunikor();
    for (const q of SIM.living(s)) for (const id of ['vavstol', 'slanda', 'lin', 'odling']) (q.tek ??= {})[id] = 1;
    const medVavare = tunikor();
    SIM.setAmount(s, 'lintyg', 0); SIM.setAmount(s, 'trad', 0); SIM.setAmount(s, 'lin', 0); SIM.setAmount(s, 'ratlin', 0);
    s.projektSaknar = { lintyg: { beh: 3, n: 3, b: 0.8 } };
    const lin = SIM.projektenSaknar(s, 'ratlin'), med = SIM.grodaPoang(s, 'lin');
    s.projektSaknar = undefined;
    const utan = SIM.grodaPoang(s, 'lin'), korn = SIM.projektenSaknar(s, 'ratlin');
    // tråden i förrådet räcker till tyget: då saknas inget rått lin (steg 12.1.206); en tråd för lite och linet behövs igen
    s.projektSaknar = { lintyg: { beh: 3, n: 3, b: 0.8 } };
    SIM.setAmount(s, 'trad', 9); const medTrad = SIM.projektenSaknar(s, 'ratlin');
    SIM.setAmount(s, 'trad', 8); const nastanTrad = SIM.projektenSaknar(s, 'ratlin');
    s.projektSaknar = undefined; SIM.setAmount(s, 'trad', 0);
    return [
      ['skinnen hämtas genom jakten', jakt],
      [`tre skinn fattas: med en jägare ute går en till (${enUte}), med tre ute ingen (${treUte})`, enUte === 'skinn' && treUte === undefined && andra.length === 3],
      [`garvningen väntar på skinn (${viaGarvning}), och lädret ärver genom garvningen till jakten efter skinn (${lader?.sak})`, viaGarvning === 'skinn' && lader?.sak === 'skinn'],
      [`utan tyg och vävare vill byn inga tunikor (${utanVavare}), inte heller när vävningen är halvvägs lärd (${halvLard}), med en vävare en var (${medVavare})`, utanVavare === 0 && halvLard === 0 && medVavare === SIM.living(s).length],
      [`lintyget projekten saknar ger det råa linet värde genom kedjan (${lin}, utan brist ${korn})`, lin === 0.8 && korn === 0],
      [`med tråd nog till tyget i förrådet saknas inget rått lin (${medTrad}), med en tråd för lite saknas det igen (${nastanTrad})`, medTrad === 0 && nastanTrad === 0.8],
      [`linet är mer värt att så när projekten saknar tyg (${med.toFixed(2)} mot ${utan.toFixed(2)})`, med > utan * 1.5],
    ];
  },
};
