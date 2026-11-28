// Scenarier för fas 15, grupp 8 (steg 15.1.73–15.1.83): världens byar och omvärlden.
import * as SIM from '../../sim';
import { SCENARIER, testBy, varldEfter } from './hjalp';
import * as VB from '../../ui/varldbild';
import { readFileSync } from 'node:fs';

// byn har precis det den vill ha av allt
const fyll = (r: SIM.VarldRad, ganger = 1) => {
  SIM.radVaror(r);
  for (const g of SIM.VARUGRUPP_IDS) if (g !== 'mat') r.varor![g] = ganger * Math.round(SIM.radVill(r, g, SIM.rikMal(r)));
  r.tal.mat = ganger * Math.round(SIM.radVill(r, 'mat', SIM.rikMal(r)));
  r.tal.rikedom = SIM.radRikedomUr(r);
};

SCENARIER.fardvag = {
  text: 'Steg 15.1.73: de som är ute på en färd räknas bort ur byns folk, och en ny färd kräver dubbelt så många lediga vuxna som bärare; den som skickar ser det som redan är på väg till mottagaren, i priset och i gåvan; färderna börjar utspridda över dygnet',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), vl = s.varld!; vl.farder = [];
    const r = vl.rader!.find(x => SIM.lever(vl, x) && SIM.BYSORTER[x.sort].ledare && SIM.radGrannar(vl, x).some(g => g.nr !== vl.huvud))!;
    const dyr = SIM.radGrannar(vl, r).find(g => g.nr !== vl.huvud)!;
    SIM.mots(vl, r.nr, dyr.nr); SIM.mots(vl, dyr.nr, r.nr);
    r.tal.folk = 30; r.tal.styrka = 10; fyll(r); fyll(dyr);
    r.varor!.virke = 4 * Math.round(SIM.radVill(r, 'virke', SIM.rikMal(r))); r.tal.rikedom = SIM.radRikedomUr(r);
    dyr.varor!.virke = Math.round(SIM.radVill(dyr, 'virke', SIM.rikMal(dyr)) / 2); dyr.tal.silver = 500; dyr.tal.rikedom = SIM.radRikedomUr(dyr);
    const c = () => SIM.byCtx(s, vl, r, dyr);
    // färden går: bärarna räknas som ute
    const a0 = SIM.fardAffar(c())!, pris0 = SIM.radGruppPaslag(s, dyr, 'virke');
    const l0 = SIM.ledigaVuxna(vl, r);
    SIM.BYHANDLINGAR.handel.gor(c());
    const f = vl.farder!.find(x => x.fran === r.nr)!;
    const l1 = SIM.ledigaVuxna(vl, r), ute1 = SIM.radUte(vl, r.nr);
    // det som är på väg dit räknas i priset, och nästa affär blir mindre
    const pv = SIM.paVag(vl, dyr.nr, 'virke'), pris1 = SIM.radGruppPaslag(s, dyr, 'virke', pv), a1 = SIM.fardAffar(c());
    // för få lediga: ingen ny färd
    r.tal.styrka = SIM.radUte(vl, r.nr) + 2 * SIM.BYHANDLING.barare - 1; // en mindre än dubbelt så många lediga som bärare
    const fa = SIM.ledigaVuxna(vl, r), utan = !SIM.fardAffar(c()) && !SIM.gavaAffar(c()) && SIM.BYHANDLINGAR.besked.poang(c()) >= -1;
    r.tal.styrka += 1;
    const med = !!SIM.fardAffar(c());
    // flocken: aldrig fler än hälften av de lediga
    r.tal.styrka = 40; r.tal.folk = 60;
    const fl = SIM.flockStorlek(r, SIM.radUte(vl, r.nr)), led = SIM.ledigaVuxna(vl, r);
    // gåvan: det mottagaren saknar, inte bara det byn har mest av
    vl.farder = []; r.tal.styrka = 10; fyll(r, 2); fyll(dyr, 3); dyr.varor!.virke = 0; dyr.tal.rikedom = SIM.radRikedomUr(dyr);
    const gava = SIM.gavaAffar(c());
    // en värld i tio dygn: färderna börjar vid olika tider på dygnet
    const w = varldEfter(10, 10), wv = w.varld!;
    const tider = (wv.farder ?? []).filter(x => !x.handlare).map(x => ((x.t0 - wv.borjan!) % SIM.DAY) / SIM.DAY);
    const olika = new Set(tider.map(x => Math.floor(x * 24))).size;
    return [
      [`bärarna räknas bort ur de lediga (${l0} lediga före, ${l1} efter, ${ute1} ute)`, l1 === l0 - SIM.BYHANDLING.barare && ute1 === SIM.BYHANDLING.barare],
      [`priset hos mottagaren räknar med lasten på vägen (${pv} virke: ${pris0.toFixed(2)} → ${pris1.toFixed(2)}), och nästa affär är mindre (${a0.n} → ${a1?.n ?? 0})`, pv === f.n && pris1 < pris0 && (!a1 || a1.vinst < a0.vinst)],
      [`med ${fa} lediga (färre än dubbelt så många som bärarna) går ingen handel eller gåva, med en till går handeln`, utan && fa === 2 * SIM.BYHANDLING.barare - 1 && med],
      [`flocken är högst hälften av de lediga (${fl} av ${led})`, fl > 0 && fl * 2 <= led],
      [`gåvan är det mottagaren saknar (${gava?.g ?? 'ingen'})`, gava?.g === 'virke'],
      [`färden ger sig av vid en tid ur dygnet, inte vid valet (${((f.t0 - s.now) / 3600000).toFixed(1)} h efter)`, f.t0 >= s.now && f.t0 < s.now + SIM.DAY && SIM.fardLage(vl, f, f.t0 - 1, vl.mark.w) === undefined],
      [`i en värld börjar färderna under olika timmar på dygnet (${tider.length} färder, ${olika} olika timmar)`, tider.length < 3 || olika >= Math.min(3, tider.length)],
    ];
  },
};

SCENARIER.anfallminne = {
  text: 'Steg 15.1.74: ett anfall mellan två byar i världen är en fientlig handling (vl.ovanligt) åt båda håll, så att den anfallna byn kan gå i krig utan att först ha skickat ett ovänligt besked; minnet av anfallet bleknar som relationen och glöms när det nått grundläget',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), vl = s.varld!; vl.farder = []; vl.ovanligt = {};
    const r = vl.rader!.find(x => SIM.lever(vl, x) && SIM.BYSORTER[x.sort].ledare && SIM.radGrannar(vl, x).some(g => g.nr !== vl.huvud && SIM.BYSORTER[g.sort].ledare))!;
    const mot = SIM.radGrannar(vl, r).find(g => g.nr !== vl.huvud && SIM.BYSORTER[g.sort].ledare)!;
    SIM.mots(vl, r.nr, mot.nr);
    vl.rel![`${r.nr}>${mot.nr}`] = -60; vl.rel![`${mot.nr}>${r.nr}`] = -40;
    r.tal.folk = 60; r.tal.styrka = 30; fyll(r); mot.tal.folk = 40; mot.tal.styrka = 12; fyll(mot, 2);
    const krigFore = SIM.BYHANDLINGAR.krig.poang(SIM.byCtx(s, vl, mot, r));
    const c = SIM.byCtx(s, vl, r, mot); c.led = { ...(c.led ?? {} as Record<SIM.Stat, number>), aggression: 19 }; c.krig = 1;
    SIM.BYHANDLINGAR.plundra.gor(c);
    const f = vl.farder!.find(x => x.fran === r.nr && x.anfall)!;
    if (!f) return [['byn skickar en flock', false]];
    s.now = Math.max(s.now, f.t1);
    const fram = vl.ko!.find(q => q.typ === 'fardFram' && q.sak === f.id)!; vl.ko = vl.ko!.filter(q => q !== fram);
    SIM.KOHANDELSER.fardFram(s, vl, fram);
    const a = vl.ovanligt[`${r.nr}>${mot.nr}`], b = vl.ovanligt[`${mot.nr}>${r.nr}`];
    const relMot = SIM.relation(vl, mot.nr, r.nr)!;
    const cm = SIM.byCtx(s, vl, mot, r); cm.led = { ...(cm.led ?? {} as Record<SIM.Stat, number>), aggression: 19 }; cm.krig = 1;
    const krigEfter = SIM.BYHANDLINGAR.krig.poang(cm);
    // minnet bleknar
    const b0 = b; SIM.relGlom(vl); const b1 = vl.ovanligt[`${mot.nr}>${r.nr}`];
    let dygn = 1; for (; dygn < 400 && vl.ovanligt[`${mot.nr}>${r.nr}`] !== undefined; dygn++) SIM.relGlom(vl);
    return [
      [`anfallet sparas som en fientlig handling åt båda håll (${r.nr}>${mot.nr}: ${a}, ${mot.nr}>${r.nr}: ${b})`, a === -60 && b === -40],
      [`den anfallna byns syn sjönk efter anfallet (${relMot}), så kriget går att välja (poängen ${krigFore.toFixed(2)} → ${krigEfter.toFixed(2)})`, relMot < (b ?? 0) && krigFore === -1 && krigEfter > -1],
      [`minnet bleknar mot grundläget (${b0} → ${b1}) och är glömt efter ${dygn} dygn`, b1 !== undefined && b1 > b0! && dygn < 400],
    ];
  },
};

SCENARIER.karavanrest = {
  text: 'Steg 15.1.75: när rövarna vinner över ett sällskap på vägen stannar det av varorna de inte orkar bära kvar på platsen som en karavanrest, i hela saker; den som minns den väger den som ett uppdrag (Den plundrade karavanen), och den som kommer dit tar det som ryms',
  env: { BALANS: 'karta.bredd=120,karta.hojd=120,start.klader=0,vagran.krav=100000,vagran.sarVarde=0' }, // sällskapet slåss hellre än betalar: provet gäller det som blir kvar
  kor: () => {
    const s = SIM.cloneState(testBy(3)), vl = s.varld!, vuxna = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= 20 && SIM.ageOf(q, s.now) < 50 && SIM.kanGa(q));
    const hb = SIM.byPlats(vl, vl.huvud!)!, v = SIM.varldMark(s)!;
    const mal = hb.grannar!.map(g => SIM.varldPlatsNr(vl, g.nr)!).filter(p => p && SIM.vagMellan(vl, v, hb.y * v.w + hb.x, p.y * v.w + p.x, 'fots', s.now))[0]!;
    const folk = vuxna.slice(0, 2);
    const sl = SIM.nyttSallskap(s, folk[0]!, mal.nr, 'handel')!; SIM.foljMed(vl, sl, folk[1]!);
    for (const x of folk) { SIM.gaBort(s, x); x.skador = undefined; x.sjuk = undefined; x.blod = 1; }
    const vag = SIM.vagMellan(vl, v, hb.y * v.w + hb.x, mal.y * v.w + mal.x, 'fots', s.now)!;
    sl.skede = 'ute'; sl.vag = { fran: vag.fran, till: vag.till, steg: vag.steg };
    const rr = SIM.vagenRutor(s, sl); sl.pos = Math.floor((rr.length - 1) * 0.5); sl.ruta = rr[sl.pos]; sl.gang = 0;
    sl.pack = { brod: 6, vattensack: 4, yxa: 60 }; sl.behov = { matt: 1, vatska: 1, ork: 1, fulla: 4, foder: 0 };
    // ett stort rövarläger nära vägen
    const L = vl.rader!.find(x => SIM.lever(vl, x) && x.nr !== mal.by)!;
    L.sort = 'rovarlager'; L.tal.folk = 60; L.tal.styrka = 40; SIM.radVaror(L);
    const fore = new Set((vl.platser ?? []).map(p => p.nr));
    SIM.VAGHANDELSER.ran!.gor(s, sl, s.now);
    const k = (vl.platser ?? []).find(p => p.k === 'karavanrest' && !fore.has(p.nr));
    const tog = L.varor && SIM.radHar(L, SIM.sakGrupp('yxa'));
    const dag = (sl.dagbok ?? []).map(d => d[1]).join(' ');
    // en annan bybo hör om den och reser dit
    const s2 = SIM.cloneState(s), led2 = s2.people.find(q => q.id === vuxna[2]!.id)!, k2 = k && SIM.varldPlatsNr(s2.varld!, k.nr);
    if (k) SIM.FYNDSETT.karavanrest!(s2, led2, k.nr, s2.now);
    const l = k && led2.lardomar?.find(x => x.k === 'uppdrag' && x.a === SIM.fyndId(k.nr));
    const varde = k ? SIM.uppdragVid(s2, led2, k.nr)?.varde ?? 0 : 0;
    const sl2 = k ? SIM.nyttSallskap(s2, led2, k.nr, 'uppdrag') : undefined;
    const fore2 = k2?.inne?.yxa ?? 0;
    if (sl2) { sl2.uppdrag = SIM.fyndId(k!.nr); SIM.gaBort(s2, led2); sl2.pack = {}; SIM.uppdragFram(s2, sl2, s2.now); }
    // tiden går ut
    const s4 = SIM.cloneState(s); s4.now += (SIM.RESA.karavanDygn + 1) * SIM.DAY; SIM.platserUpphor(s4.varld!, s4.now);
    return [
      [`rövarna vann och det de inte orkade bära ligger kvar som en karavanrest (${k ? JSON.stringify(k.inne) : 'ingen'}; dagboken: ${dag.slice(-120)})`, !!k && (k.inne?.yxa ?? 0) >= 1 && Object.values(k.inne ?? {}).every(Number.isInteger) && !sl.pack.yxa && !!tog],
      [`sällskapet behåller maten, som inte är varor (${JSON.stringify(sl.pack)})`, (sl.pack.brod ?? 0) > 0],
      [`den som hör om den minns den som Den plundrade karavanen (värde ${l?.v ?? 0}) och väger den som mål för en resa (${Math.round(varde)})`, l?.om === 'karavan' && (l.v ?? 0) > 0 && varde > 0 && (SIM.RESMAL.uppdrag.mal as readonly string[]).includes('karavanrest')],
      [`den som kommer dit tar det som ryms (${sl2?.utfall?.hur}: ${JSON.stringify(sl2?.pack)}, av ${fore2} yxor)`, sl2?.utfall?.hur === 'klart' && (sl2.pack.yxa ?? 0) >= 1],
      [`karavanresten är borta efter ${SIM.RESA.karavanDygn} dygn`, !!k && !(s4.varld!.platser ?? []).some(p => p.nr === k.nr)],
    ];
  },
};

SCENARIER.plundradnod = {
  text: 'Steg 15.1.76: en by som plundras får nöd efter det som togs och de som dödades; nöden driver folk att flytta och dras till rövarlägren som hungern gör, och den går över med tiden',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), vl = s.varld!; vl.farder = [];
    const r = vl.rader!.find(x => SIM.lever(vl, x) && SIM.BYSORTER[x.sort].ledare && SIM.radGrannar(vl, x).some(g => g.nr !== vl.huvud && x.sort === 'by'))!;
    const mot = SIM.radGrannar(vl, r).find(g => g.nr !== vl.huvud && g.sort === 'by')!;
    SIM.mots(vl, r.nr, mot.nr); vl.rel![`${r.nr}>${mot.nr}`] = -80;
    r.tal.folk = 80; r.tal.styrka = 40; fyll(r); mot.tal.folk = 40; mot.tal.styrka = 4; fyll(mot, 2);
    delete mot.nod;
    const flytt0 = SIM.flyttPerDygn(mot), lust0 = SIM.lagerChans(mot);
    const c = SIM.byCtx(s, vl, r, mot); c.led = { ...(c.led ?? {} as Record<SIM.Stat, number>), aggression: 19 }; c.krig = 1;
    SIM.BYHANDLINGAR.plundra.gor(c);
    const f = vl.farder!.find(x => x.fran === r.nr && x.anfall);
    if (!f) return [['byn skickar en flock', false]];
    s.now = Math.max(s.now, f.t1);
    const fram = vl.ko!.find(q => q.typ === 'fardFram' && q.sak === f.id)!; vl.ko = vl.ko!.filter(q => q !== fram);
    SIM.KOHANDELSER.fardFram(s, vl, fram);
    const nod = mot.nod ?? 0, byte = Object.values(f.byte ?? {}).reduce((a, x) => a + x, 0);
    // samma mat: bara nöden skiljer
    const utan = { ...mot, nod: undefined };
    const flytt1 = SIM.flyttPerDygn(mot), flyttUtan = SIM.flyttPerDygn(utan), lust1 = SIM.lagerChans(mot), lustUtan = SIM.lagerChans(utan);
    // nöden går över: ett dygn (ett år i spelet) av timmar i flytten
    const n0 = Math.floor((s.now - vl.borjan!) / 3600e3);
    const m2 = { ...mot, tal: { ...mot.tal, folk: 0 } } as SIM.VarldRad; m2.nod = nod; for (let h = 0; h < 24; h++) SIM.radFlytt(s, vl, m2, n0 + h);
    return [
      [`flocken vann och tog ${byte} (vann: ${byte > 0})`, byte > 0],
      [`den plundrade byn får nöd (${nod.toFixed(2)})`, nod > 0 && nod <= 1],
      [`nöden driver fler att flytta (${flyttUtan.toFixed(2)} → ${flytt1.toFixed(2)} per dygn; före anfallet ${flytt0.toFixed(2)})`, flytt1 > flyttUtan],
      [`och drar dem till rövarlägren som hungern (chansen att slå läger ${lustUtan.toFixed(2)} → ${lust1.toFixed(2)}; före ${lust0.toFixed(2)})`, lust1 > lustUtan],
      [`nöden går över med tiden (${nod.toFixed(2)} → ${(m2.nod ?? 0).toFixed(2)} efter ett dygn)`, (m2.nod ?? 0) < nod * 0.5],
    ];
  },
};

SCENARIER.tromal = {
  text: 'Steg 15.1.78: varje tro i världen har ett eget mål för hur många som tror, RAD.troMal plus eller minus RAD.troSpann, så att troerna inte alla drar mot samma andel; andelen i en by går mot trons mål',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), vl = s.varld!;
    const namn = ['Eldens väg', 'Isens tro', 'De gamlas sed', 'Åskans folk', 'Skogens ande', 'Stjärnornas lära'];
    const mal = namn.map(n => SIM.troMal(vl, n)), olika = new Set(mal).size;
    const inom = mal.every(m => Number.isInteger(m) && m >= SIM.RAD.troMal - SIM.RAD.troSpann && m <= SIM.RAD.troMal + SIM.RAD.troSpann);
    // en by med tron går mot trons mål
    const r = { ...vl.rader!.find(x => SIM.lever(vl, x))!, nr: -5 }; // utan plats och grannar: ingen annan tro sprids dit
    r.tro = { namn: namn[0], andel: 1, krig: 50 };
    const n0 = Math.floor((s.now - vl.borjan!) / 86400e3);
    for (let d = 0; d < 60; d++) SIM.radTro(vl, r, n0 + d);
    const slut = r.tro?.namn === namn[0] ? r.tro.andel : undefined;
    return [
      [`troerna har olika mål (${namn.map((n, i) => `${n} ${mal[i]} %`).join(', ')})`, olika >= 4 && inom],
      [`samma tro har samma mål (${SIM.troMal(vl, namn[0])} och ${SIM.troMal(vl, namn[0])})`, SIM.troMal(vl, namn[0]) === mal[0]],
      [`andelen i byn går mot trons mål (${slut} %, målet ${mal[0]} %)`, slut === mal[0]],
    ];
  },
};

SCENARIER.fardtecken = {
  text: 'Steg 15.1.79: registret FARDTECKEN säger tecknet för varje färdsätt (flocken, karavanen, packdjuret, till fots) och om sällskapet är beväpnat; flocken och packdjuret har platshållare i paletten, och en färd i land byn inte känner ritas inte',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), vl = s.varld!, v = SIM.varldMark(s)!, kn = SIM.bynsKarta(s)!;
    const val = (f: VB.FardSatt) => VB.fardTecken(f).tecken;
    const ratt = val({ anfall: true }) === 'flock' && val({ vagn: true, djur: true }) === 'karavan' && val({ djur: true }) === 'packdjur' && val({}) === 'sallskap';
    const vapen = Object.entries(VB.FARDTECKEN).filter(([, d]) => d.beväpnad).map(([k]) => k);
    const form = ['flock', 'packdjur'].every(k => VB.TECKEN[k]?.length === VB.VK && VB.TECKEN[k]!.every(r => r.length === VB.VK && [...r].every(c => c === '.' || c in VB.TECKENPAL)));
    const kand = VB.kandaRutor(vl, v, kn), hb = VB.huvudbynsPlats(vl)!;
    let okand: [number, number] | undefined;
    for (let y = 0; y < v.h && !okand; y++) for (let x = 0; x < v.w && !okand; x++) if (!kand(x, y)) okand = [x, y];
    const kod = readFileSync(new URL('../../ui/varldskarta.ts', import.meta.url), 'utf8');
    return [
      [`färdsättet ger tecknet (flock, karavan, packdjur, till fots)`, ratt],
      [`flocken är beväpnad, de andra inte (${vapen.join(', ')})`, vapen.length === 1 && vapen[0] === 'flock'],
      ['flocken och packdjuret har platshållare i 16 × 16 punkter i paletten', form],
      [`huvudbyns ruta är känd, och det finns land byn inte känner (${okand?.join(', ')})`, kand(hb.x, hb.y) && !!okand],
      ['kartan ritar färderna med FARDTECKEN och hoppar över dem i okänt land', /fardTecken\(/.test(kod) && /if \(!l \|\| !kand\(/.test(kod)],
    ];
  },
};

SCENARIER.bytecken = {
  text: 'Steg 15.1.80: en by på världskartan ritas i tre storlekar (hus, hus2, hus3) efter det den egna byn tror om invånarna, med ett märke för hållningen mot den egna byn och ett för krig när byn hört om kriget',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), vl = s.varld!, v = SIM.varldMark(s)!;
    // en bybo har besökt en grannby med förbindelse
    const p = (vl.platser ?? []).find(q => q.k === 'by' && q.by !== vl.huvud && SIM.ortensRad(s, q.nr)?.syn);
    const vem = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= 20);
    if (p && vem) { SIM.larOrt(s, vem, p.nr, SIM.O_BESOKT, 1, { t: s.now }); SIM.raknaBynVet(s); }
    if (!p || !SIM.platsRuta(s, p.nr)?.visshet) return [['den egna byn känner en grannby med förbindelse', false]];
    const r = SIM.ortensRad(s, p.nr)!, tror = Number(SIM.platsRuta(s, p.nr)!.rader.find(x => x.id === 'folk')!.tror);
    const t0 = SIM.byTecken(s, p.nr), vantat = tror <= 15 ? 'hus' : tror <= 40 ? 'hus2' : 'hus3';
    r.syn!.inst = 60; const van = SIM.byTecken(s, p.nr).hallning;
    r.syn!.inst = -60; const ovan = SIM.byTecken(s, p.nr).hallning;
    r.syn!.inst = 0; const neutral = SIM.byTecken(s, p.nr).hallning;
    const annan = SIM.radGrannar(vl, r).find(x => x.nr !== vl.huvud) ?? r;
    (vl.kronika ??= []).push({ k: 'krig', t: vl.borjan!, by: r.nr, mot: annan.nr } as NonNullable<SIM.Varlden['kronika']>[number]);
    const krig = SIM.byTecken(s, p.nr).krig;
    // bilden: byn ritas med sitt tecken och sina märken
    const byar = new Map([[p.nr, { tecken: 'hus3', hallning: 'ovan' as const, krig: true }]]);
    const b = VB.ritaVarld(vl, v, undefined, [], byar), b0 = VB.ritaVarld(vl, v, undefined, []);
    let skiljer = 0;
    for (let y = 0; y < VB.VK; y++) for (let x = 0; x < VB.VK; x++) { const i = ((p.y * VB.VK + y) * b.w + p.x * VB.VK + x) * 4; if (b.data[i] !== b0.data[i] || b.data[i + 1] !== b0.data[i + 1]) skiljer++; }
    const form = ['hus2', 'hus3', 'van', 'ovan', 'krig'].every(k => VB.TECKEN[k]?.length === VB.VK && VB.TECKEN[k]!.every(rr => rr.length === VB.VK && [...rr].every(c => c === '.' || c in VB.TECKENPAL)));
    return [
      [`storleken följer det byn tror om invånarna (${tror} invånare: ${t0.tecken})`, t0.tecken === vantat],
      [`hållningen syns som ett märke (vänner: ${van}, fientliga: ${ovan}, neutrala: ${neutral ?? 'inget'})`, van === 'van' && ovan === 'ovan' && neutral === undefined],
      [`kriget syns när byn hört om det (${krig})`, krig === true],
      [`kartan ritar byns tecken och märken (${skiljer} punkter skiljer)`, skiljer > 10],
      ['tecknen och märkena är platshållare i 16 × 16 punkter i paletten', form],
    ];
  },
};

SCENARIER.gravrose = {
  text: 'Steg 15.1.82: graven där någon dött på en färd ritas med ett eget tecken, röset (TECKEN.rose), som skiljer sig från gravhögen och fyndplatsens kors',
  kor: () => {
    const r = VB.TECKEN.rose, kod = readFileSync(new URL('../../ui/varldskarta.ts', import.meta.url), 'utf8');
    const form = r?.length === VB.VK && r.every(x => x.length === VB.VK && [...x].every(c => c === '.' || c in VB.TECKENPAL));
    const skiljer = (a: string[]) => a.some((x, i) => x !== r![i]);
    return [
      ['röset är en platshållare i 16 × 16 punkter i paletten', !!form],
      ['röset skiljer sig från gravhögen, korset och stenen', skiljer(VB.TECKEN.hog!) && skiljer(VB.TECKEN.kors!) && skiljer(VB.TECKEN.sten!) && SIM.LANDMARKEN.gravhog.tecken === 'hog'],
      ['kartan ritar gravarna vid lederna med röset', /vl\.gravar \?\? \[\]\) g\.drawImage\(teckenBild\('rose'\)/.test(kod)],
    ];
  },
};
