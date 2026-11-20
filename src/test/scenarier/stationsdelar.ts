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
      return [
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

SCENARIER.kladmaterial = {
  text: 'Steg 12.1.20: materialet till kläderna. Ett plagg som väntar på läder, lintyg eller ylle ärver genom projektet som gör materialet (garvningen, vävningen), och skinnet det i sin tur väntar på hämtas genom jakten (KALLA i projekt.ts). Byn vill ha en slöjdbänk per tolv vuxna',
  kor: () => {
    const s = createState(1, START);
    medHus(s);
    const p = s.people.find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!, f = SIM.dangers(s);
    for (const id of ['skinnklader', 'garvning', 'kniv', 'flatarbank']) (p.tek ??= {})[id] = 1;
    SIM.setAmount(s, 'skinn', 0); SIM.setAmount(s, 'talg', 5);
    (s.stationer ??= []).push({ id: (s.nextStation = (s.nextStation ?? 0) + 1), k: 'garvning', x: 1, y: 5, kvar: 0, delar: SIM.delarIRad('garvning', 1, 5) } as Station); s.byggV = (s.byggV ?? 0) + 1;
    const jakt = SIM.hamtas('skinn')?.act === 'jakt' && SIM.hamtas('radjursskinn')?.act === 'jakt';
    const viaGarvning = SIM.fattas(s, p, 'garva', f), lader = SIM.arv(s, p, 'lader', f);
    // slöjdbänken: ingen ger brist; en räcker till tolv vuxna; fler vuxna vill ha en till
    const bank = (n: number) => { s.stationer = (s.stationer ?? []).filter(t => t.k !== 'flatarbank'); for (let i = 0; i < n; i++) (s.stationer ??= []).push({ id: (s.nextStation = (s.nextStation ?? 0) + 1), k: 'flatarbank', x: 1 + 3 * i, y: 1, kvar: 0 } as Station); };
    const vuxna = () => SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen).length;
    bank(0); const ingen = SIM.stationBrist(s, 'flatarbank');
    bank(1); const en = SIM.stationBrist(s, 'flatarbank'), v0 = vuxna();
    for (let i = 0; vuxna() <= 12; i++) s.people.push({ ...p, id: 90000 + i, tek: { ...p.tek } });
    const fler = SIM.stationBrist(s, 'flatarbank'), v1 = vuxna();
    bank(2); const tva = SIM.stationBrist(s, 'flatarbank');
    return [
      ['skinnen hämtas genom jakten', jakt],
      [`garvningen väntar på skinn (${viaGarvning}), och lädret ärver genom garvningen till jakten efter skinn (${lader?.sak})`, viaGarvning === 'skinn' && lader?.sak === 'skinn'],
      [`utan slöjdbänk vill byn ha en (${ingen}); en räcker till ${v0} vuxna (${en})`, ingen === 1 && (v0 > 12 || en === 0)],
      [`${v1} vuxna vill ha en till (${fler}), och med två är det nog (${tva})`, fler === 1 && tva === 0],
    ];
  },
};
