import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// Scenarier. Kontroller av hela spelet: gränssnittet läser utan att ändra, ikoner, vakter och det som aldrig händer.
import { Person, createState, step, living, serializeParts, serialize, isLight, ageOf, TEKNIK, knows, housesOf, FYND, FYND_IDS, GRUPPER, DJUR, BEAT, tingOf, FN, fnId, SEC, MATERIAL, ACTS, isSick, SAKER, slagIkon } from '../../sim';
import * as SIM from '../../sim';
import { hasIcon, PAL } from '../../ikoner';
import { FARGER, MORKARE, PALETT, iPaletten, kornPa, rasterSteg } from '../../palett';
import { START, STEG_TIM, korBy } from '../kor';
import { seedAv } from '../pool';
import { KARNA } from '../../portrattkarna';
import { KARTBILDER, SYMNAMN } from '../../kartbilder';
import { symDelar, symUtan } from '../../ui/symboler';
import { anvandsKant, skaffasKant } from '../../ui/skaffas';
import * as fs from 'fs';
import * as path from 'path';
import { ANSIKTSORD, drag, glomArv, rovarSkapad, skapad, skonNiva } from '../../ui/utseende';
import { Koll, kor, klockan, uiLas, SCENARIER, grenarUte, barGrenar } from './hjalp';

SCENARIER['ui-ren'] = {
  lang: true,
  text: 'Gränssnittet ändrar inte byn: två likadana byar i takt, den ena läser som gränssnittet varannan halvtimme, och sparfilerna blir lika',
  kor: () => {
    const a = createState(21, START), b = createState(21, START), DYGN = 3;
    let lika = -1, n = 0, andrat = 0;
    for (let i = 0; i < DYGN * 24 * 12; i++) {
      step(a, BEAT); step(b, BEAT);
      // sparfilen före och efter läsningarna visar om gränssnittet skrev något i byn. Båda sparas lika ofta: sparningen
      // skriver kartorna i sparfilen (s.mark, s.skog, s.fynd), och då ändras ordningen i texten
      if (i % 6 === 5) {
        const fore = serialize(a);
        uiLas(a, a.now - 200 * SEC); n++;
        if (serialize(a) !== fore) andrat++;
        serializeParts(a); serializeParts(b);
      }
      if (i % (24 * 12) === 24 * 12 - 1 && lika < 0 && serialize(a) !== serialize(b)) lika = (i + 1) / (24 * 12);
    }
    const sa = serialize(a), sb = serialize(b);
    let d = 0; while (d < sa.length && sa[d] === sb[d]) d++;
    return [
      [`gränssnittet läste ${n} gånger under ${DYGN} dygn (${DYGN} år i spelet), med ${living(a).length} invånare`, n > 100],
      [`läsningarna skrev inget i byn (${andrat} av ${n} gånger ändrades sparfilen)`, andrat === 0],
      [sa === sb ? 'sparfilerna är lika tecken för tecken' : `sparfilerna skiljer sig${lika > 0 ? ` redan efter ${lika} dygn` : ''}, första skillnaden: …${sa.slice(Math.max(0, d - 60), d + 40)}… mot …${sb.slice(Math.max(0, d - 60), d + 40)}…`, sa === sb],
    ];
  },
};

// föremålsrutan (steg 5.3.5.2): varje sak som syns har en rad om hur den skaffas och vad den används till
SCENARIER.sakruta = {
  text: 'Föremålsrutan säger för varje sak hur man skaffar den och vad den används till (ui/skaffas.ts)',
  kor: () => {
    const ks = Object.entries(SAKER).filter(([k, d]) => d && !d.dold && !d.mark && !d.i && k !== 'paborjat').map(([k]) => k);
    const utanSkaffa = ks.filter(k => !skaffasKant(k)), utanAnv = ks.filter(k => !anvandsKant(k));
    return [
      [`${ks.length} saker; hur de skaffas saknas för: ${utanSkaffa.join(', ') || 'ingen'}`, ks.length > 40 && !utanSkaffa.length],
      [`vad de används till saknas för: ${utanAnv.join(', ') || 'ingen'}`, !utanAnv.length],
    ];
  },
};

SCENARIER.ikoner = {
  text: 'Allt som gränssnittet visar med en symbol har en pixelbild i ikoner.ts: saker, tekniker, djur, grupperna i filtret, lagren, byggmaterial, slagen av arbete och relationstyperna',
  kor: () => {
    const saknas = (ks: (string | undefined)[]) => ks.filter((k): k is string => !!k && !hasIcon(k));
    const del: [string, string[]][] = [
      ['saker', saknas(Object.keys(SAKER).filter(k => !SAKER[k]!.dold))], // det dolda syns aldrig (giftig svamp bland svampen)
      ['tekniker', saknas(TEKNIK.map(t => t.id))],
      ['djur', saknas(Object.keys(DJUR))],
      ['grupper i filtret', saknas(Object.values(GRUPPER).map(g => g.ikon))],
      ['lager', saknas(FYND_IDS.map(k => FYND[k].ikon))],
      ['byggmaterial', saknas(Object.values(MATERIAL).map(m => m.ikon))],
      ['slag av arbete', saknas(Object.values(ACTS).map(a => a.slag && slagIkon(a.slag)))],
      ['påbörjat redskap', saknas(['paborjat'])],
      ['stationer', saknas(SIM.STATION_LIST.map(k => SIM.STATIONER[k].ikon))],
      ['relationstyper', saknas(Object.values(SIM.RELATIONER).map(t => t.ikon))],
      // det som kan stå vridet har en stående bild (steg 3.10.7): stationer som inte är kvadratiska (grillen och elden står
      // alltid likadant), tillbehören till dem och dörrarna
      ['stående bilder', saknas([...SIM.STATION_LIST.filter(k => SIM.STATIONER[k].w !== SIM.STATIONER[k].h && k !== 'grill' && !SIM.stationDef(k)?.eld).map(k => SIM.STATIONER[k].ikon + '_karta_v'),
        ...Object.values(SIM.DORRAR).map(d => d.ikon + '_karta_v')])],
      ['intryck', saknas(Object.keys(SIM.INTRYCK).map(k => 'i_' + k))], // pratbubblan och personrutan visar intrycket som pixelbild (steg 3.10.8)
    ];
    // tårtdiagrammet i personrutan: varje handling (utom sömnen) har slagets pixelbild, slagets tecken eller ett eget tecken
    const utan = (Object.keys(ACTS) as SIM.Act[]).filter(a => {
      const sl = ACTS[a].slag, px = sl && slagIkon(sl);
      return a !== 'sova' && !(px && hasIcon(px)) && !(sl ? SIM.SLAG_TECKEN[sl] : ACTS[a].tecken);
    });
    del.push(['handlingar i personens tid', utan]);
    return del.map(([namn, m]) => [m.length ? `${namn} utan symbol: ${m.join(', ')}` : `alla ${namn} har en symbol`, !m.length] as Koll);
  },
};

SCENARIER.symboler = {
  text: 'Emojierna blir pixelsymboler (steg 5.3.2.1): varje emoji i spelets kod har en symbol, och varje {sym_id} i koden finns i bildstilen',
  kor: () => {
    const filer = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'test' ? [] : filer(path.join(d, e.name))) : e.name.endsWith('.ts') ? [path.join(d, e.name)] : []);
    const bilder = new Set(['kartbilder.ts', 'portrattkarna.ts', 'guibilder.ts', 'djurbilder.ts']), utan = new Map<string, string>(), okanda = new Set<string>();
    let antal = 0;
    for (const f of filer('src')) {
      if (bilder.has(path.basename(f))) continue;
      const t = fs.readFileSync(f, 'utf8');
      for (const m of t.matchAll(/\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*/gu)) {
        antal++;
        if (!symDelar(m[0]).some(x => typeof x !== 'string')) utan.set(m[0], path.relative('src', f));
      }
      for (const m of t.matchAll(/\{(sym_[a-z0-9_]+)\}/g)) if (!KARTBILDER[m[1]]) okanda.add(m[1]);
    }
    return [
      [`${antal} emojier i koden, alla med en symbol${utan.size ? `; utan: ${[...utan].map(([e, f]) => `${e} (${f})`).join(', ')}` : ''}`, antal > 100 && utan.size === 0],
      [`varje {sym_id} finns${okanda.size ? `; saknas: ${[...okanda].join(', ')}` : ''}`, okanda.size === 0],
      ['emojin i en text blir en symbol, och {sym_toa} är toan', symDelar('a 💧 b').some(x => typeof x !== 'string' && x.id === 'sym_droppe') && symDelar('{sym_toa}').some(x => typeof x !== 'string' && x.id === 'sym_toa')],
      ['utan bild (tipsrutan) stryks emojin, och ensam blir den namnet', symUtan('💧 Vätska') === 'Vätska' && symUtan('💧') === SYMNAMN.sym_droppe],
    ];
  },
};

// steg 5.1.1.3: varje färg i spelets pixelbilder (PAL i ikoner.ts) är en av paletten 32 (palett.ts); en halvgenomskinlig färg
// (rgba) räknas efter sin färg utan genomskinligheten
SCENARIER.palett = {
  text: 'Alla pixelbilder har bara färger ur paletten (32 färger i åtta ramper), och natten är paletten ett, två och mitt i natten tre steg mörkare',
  kor: () => {
    const utanfor: string[] = [];
    const rgb = (f: string) => { const m = f.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? '#' + m.slice(1, 4).map(v => (+v).toString(16).padStart(2, '0')).join('') : f; };
    for (const [k, p] of Object.entries(PAL)) for (const [c, f] of Object.entries(p)) if (!iPaletten(rgb(f))) utanfor.push(`${k}.${c}=${f}`);
    const svart = (MORKARE[3] ?? []).filter(h => h === FARGER[0]).length;
    const morkt = MORKARE.every(m => m.length === 32 && m.every(iPaletten));
    // kornet på en slät yta: inga 5 × 5 punkter med samma färg kvar (utom längs kanten), och varje korn ett steg i samma ramp
    const N = 64, yta = new Int8Array(N * N).fill(18); kornPa(yta, N, N, 0, 0);
    let slata = 0, fel = 0; const platser = (N - 8) * (N - 8);
    for (const c of yta) if (c !== 18 && (c >> 2 !== 18 >> 2 || Math.abs(c - 18) !== 1)) fel++;
    for (let y = 2; y + 5 <= N - 2; y++) for (let x = 2; x + 5 <= N - 2; x++) { let lika = true; for (let k = 0; k < 25 && lika; k++) lika = yta[(y + Math.floor(k / 5)) * N + x + k % 5] === 18; if (lika) slata++; }
    const PALETT_L = (h: string) => { const n = parseInt(h.slice(1), 16); return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
    const raster = [0, 0.5, 1, 1.5, 2, 2.5, 3].every(m => [0, 1, 2, 3].every(x => iPaletten(rasterSteg(FARGER[13], m, x, x * 3))));
    return [
      [utanfor.length ? `${utanfor.length} färger utanför paletten: ${utanfor.slice(0, 12).join(', ')}` : `alla ${Object.keys(PAL).length} bilder har bara färger ur paletten`, !utanfor.length],
      ['paletten har 32 färger i åtta ramper', FARGER.length === 32 && PALETT.length === 8],
      ['skymningen och natten har bara färger ur paletten, också i rastret', morkt && raster],
      ['natten är mörkare än dagen', MORKARE[2].every((h, i) => h !== FARGER[i] || i < 2)],
      [`mitt i natten (steg 5.1.7.2, något ljusare sedan steg 9.2.12) är det mesta kolsvart och inget ljusare än natten (${svart} av 32 färger blir den mörkaste)`, MORKARE.length === 4 && svart >= 20 && svart < 28 && MORKARE[3].every((h, i) => h === MORKARE[2][i] || PALETT_L(h) <= PALETT_L(MORKARE[2][i]))],
      [`kornet (steg 5.1.7.1): en slät yta på 64 × 64 punkter har nästan inga släta fält på 5 × 5 punkter kvar (${slata} av ${platser}, högst 5 %), och kornet är ett steg i samma ramp (${fel} fel)`, slata <= platser * 0.05 && fel === 0],
    ];
  },
};

SCENARIER.vakt = {
  text: 'Nattvakten: varje natt håller en vuxen mellan 16 och 60 år vakt, den modigaste med lite slump, och den som utses lägger ner det hen bär. Antalet vakter följer hotet (steg 10.1.20): fler när vargar setts och strax efter ett rövaranfall',
  kor: () => {
    const s = createState(2, START), natter = new Map<number, Set<number>>(), aldrar: number[] = [], sjuka = new Map<number, string>();
    kor(s, 3 * 24, q => {
      for (const p of living(q)) if (p.task?.act === 'vakt') {
        const n = natter.get(p.guardDay ?? -1) ?? new Set<number>(); n.add(p.id); natter.set(p.guardDay ?? -1, n); aldrar.push(ageOf(p, q.now));
      }
      // nätter där den utsedda vakten är sjuk och sover: ingen annan tar vakten (val.ts night)
      const gd = q.lastGuardDay ?? -1, g = gd >= 0 && !isLight(q.now) ? living(q).find(p => p.guardDay === gd) : undefined;
      if (g && isSick(g, q.now) && g.task?.act !== 'vakt') sjuka.set(gd, g.name);
    });
    for (const [d, namn] of sjuka) if (!natter.has(d)) console.log(`VARNING: vakt: natt ${d + 1} blev ${namn} sjuk efter att ha utsetts till vakt, och ingen annan höll vakt (night() i val.ts väljer ingen ny samma natt)`);
    // i natt: den modigaste bär två grenar när en annan väljer och nattens vakt utses
    const q = SIM.cloneState(s); klockan(q, 22); q.lastGuardDay = -1;
    const vuxna = living(q).filter(p => ageOf(p, q.now) >= SIM.ALDER.vaktFran && ageOf(p, q.now) < SIM.ALDER.vaktTill);
    for (const p of vuxna) { p.pot.mod = 1; Object.assign(p, { hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, warm: 0.9, health: 1, sickUntil: undefined, sjuk: undefined, skador: [] }); } // friska (sjukdomen i steg 9.5.1 står i p.sjuk)
    const [g, p] = vuxna; g!.pot.mod = 20;
    barGrenar(q, g!); p!.task = undefined;
    const grenar0 = grenarUte(q), akt = (x: Person) => x.task?.act; // (en funktion, så att typkontrollen inte tror att uppgiften är tom)
    SIM.chooseTask(q, p!);
    const utsedd = g!.guardDay === q.lastGuardDay && q.lastGuardDay !== -1, bordan = g!.task;
    const nere = Math.abs(grenarUte(q) - grenar0 - 2) < 1e-6; // de två grenarna hen bar ligger kvar
    g!.task = undefined; SIM.chooseTask(q, g!);
    // antalet vakter följer hotet (steg 10.1.20): en by som sett vargar, eller nyss haft rövare, utser fler än en lugn natt
    const antal = (hot: (h: SIM.State) => void) => { const h = SIM.cloneState(s); klockan(h, 22); h.lastGuardDay = -1; h.vargar = undefined; h.rovarVila = undefined; for (const x of living(h)) { x.guardDay = undefined; x.varsel = undefined; } hot(h); const y = living(h).find(x => ageOf(x, h.now) >= 18)!; y.task = undefined; SIM.chooseTask(h, y); return { n: living(h).filter(x => x.guardDay === h.lastGuardDay).length, hot: SIM.vaktHot(h) }; };
    const lugn = antal(() => undefined), medVarg = antal(h => { h.vargar = [{ id: 1, vargar: [1, 2, 3], x: 5, y: 5, mx: 5, my: 5, gar: h.now, hunger: 0.5, gor: 'stryker', sedd: h.now } as SIM.Vargflock]; }), efterRan = antal(h => { h.rovarVila = h.now; });
    return [
      [`en lugn natt vaktar ${lugn.n} (hotet ${lugn.hot.toFixed(1)}), när vargar setts ${medVarg.n} (${medVarg.hot.toFixed(1)}) och strax efter ett rövaranfall ${efterRan.n} (${efterRan.hot.toFixed(1)})`, lugn.n === 1 && medVarg.n > lugn.n && efterRan.n > lugn.n],
      [`${natter.size} nätter under tre dygn (tre år i spelet) hade en vakt, och aldrig mer än en (${[...natter.values()].map(n => n.size).join(', ')}${sjuka.size ? `; ${[...sjuka.keys()].filter(d => !natter.has(d)).length} natt med en sjuk vakt` : ''})`, natter.size + [...sjuka.keys()].filter(d => !natter.has(d)).length >= 3 && [...natter.values()].every(n => n.size === 1)],
      [`vakterna var mellan ${Math.min(...aldrar).toFixed(0)} och ${Math.max(...aldrar).toFixed(0)} år`, aldrar.length > 0 && aldrar.every(a => a >= SIM.ALDER.vaktFran && a < SIM.ALDER.vaktTill)],
      [`i natt (${isLight(q.now) ? 'ljust' : 'mörkt'}) utsågs den modigaste, ${g!.name}, när ${p!.name} valde (${akt(p!)}), och hen slutade med det hen gjorde och lade ner grenarna`, !isLight(q.now) && utsedd && bordan === undefined && nere && akt(p!) !== 'vakt'],
      [`${g!.name} väljer sedan att hålla vakt (${akt(g!)})`, akt(g!) === 'vakt'],
    ];
  },
};

// Det i registren som bara händer i vissa byar: namnet och varför. Allt annat ska hända i minst en av byarna
const SALLSYNT: Record<string, string> = {
  naverask: 'sen teknik i fas 9 (steg 9.4.13): byn vill ha näveraskar först när någon kan koka i örtköket; scenariot vatskor prövar den',
  lerkruka: 'lerkrukan (steg 9.4.11) kräver tekniken Lerkruka (nivå 3) och lera; scenarierna lera och kruka prövar den',
  lerkruka_liten: 'som lerkruka; scenarierna lera och kruka prövar den', lerkruka_mellan: 'som lerkruka; scenarierna lera och kruka prövar den', lerkruka_stor: 'som lerkruka; scenarierna lera och kruka prövar den',
  lera: 'leran (steg 9.4.10) grävs bara när byn gör av med den, till lerkrukorna; scenariot lera prövar den',
  lyra: 'lyran görs bara vid snickarbänken med kniven där (steg 9.4.5, nivå 4), sällan på 35 dygn; scenarierna snickarbank och scen prövar den',
  flyttStation: 'en station ute flyttas bara när den används mycket och står långt från husen och lagren (steg 9.4.8); scenariot mittenstation prövar det',
  flyttLager: 'en lagerplats flyttas bara när mycket hämtas där och en plats närmare mitten är ledig (steg 9.4.7); scenariot mittenlager prövar det',
  tork: 'torkställningen görs bara när byn har kött och fisk över för ett dygn, och de hungrigare byarna kommer på den sent; scenariot tork prövar den',
  koka_te: 'örtteet (steg 9.5.8) kräver tekniken Örtte på nivå 4 och en lerkruka; scenariot vatskor prövar det',
  orte: 'som koka_te; scenariot vatskor prövar det',
  protes: 'proteserna (steg 9.5.11) görs först när någon förlorat en del och byn har snickarbänken; scenariot protes prövar dem', krycka: 'som protes; scenarierna protes och benbrott prövar den', traben: 'som protes; scenariot protes prövar det', krok: 'som protes; scenariot protes prövar den', ogonlapp: 'görs bara åt den som förlorat ett öga (steg 9.5.11); scenariot protes prövar den',
  nal: 'nålen (steg 9.5.15) görs när ett stort sår ska sys; scenariot pilisaret prövar den', koka_vatten: 'kokat vatten (steg 9.5.25) kräver lerkrukan och ett infekterat sår; scenariot infektion prövar det', skara_lin: 'remsor av lin kräver lintyg (steg 9.5.15); scenariot pilisaret prövar dem', lakesalva: 'läkesalvan (steg 9.5.10) är en teknik på nivå 5; scenariot salva prövar den',
  snickarbank: 'snickarbänken (steg 9.4.4) kräver klyvplatsen, sällan på 35 dygn; scenariot snickarbank prövar den',
  byxor_vargskinn: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  byxor_bjornskinn: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  mossa_bjornskinn: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  mossa_vargskinn: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  snoskor_vargskinn: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  snoskor_bjornskinn: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  halsband_tandband: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  halsband_benband: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  tunika_lintyg: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  skjorta_lintyg: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  byxor_lader: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  mossa_lader: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  byxor_kaninskinn: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  mossa_kaninskinn: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  snoskor_kaninskinn: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  koka_salva: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  koka_lim: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  koka_tval: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  koka_tjara: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  garva: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  spinna: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  vava: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  snara: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  grop: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  byxor: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  mossa: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  snoskor: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  halsband: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  tunika: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  skjorta: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  salva: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  benlim: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  tval: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  tjara: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  lader: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  ratlin: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  lin: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  linfron: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  trad: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  lintyg: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  vargtand: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  garvning: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  vavstol: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  slanda: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  torkhus: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  vedbod: 'kräver mycket ved ute, hinner inte alltid komma på 35 dygn; scenariot skjul prövar den',
  mjarde: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  torrgadda: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  torrmort: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  grillgadda: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  grillmort: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  gaddkott: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  mortkott: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  gadda: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  mort: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  rolleka: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  leksak: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  gor_leksak: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  hugga_sten: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  klyva_plank: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  huggen_sten: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  plankor: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  vittja: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  harden: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  stenhuggarplats: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  klyvplats: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  ortkok: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  fangstbank: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  stockvag: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  brygga: 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den',
  bjorn: 'björnen finns i få byar och fälls sällan (steg 6.6.4–6.6.6); scenarierna bjorn och bjornjakt prövar den',
  bjornjakt: 'björnen jagas bara när den finns nära och jägarna är många nog (steg 6.6.6); scenariot bjornjakt prövar det',
  bjornskinn: 'björnskinn blir det bara av en fälld björn (se bjorn); scenariot bjornjakt prövar slakten',
  bjorndel: 'ett björnstycke blir det bara av en fälld björn (se bjorn); scenariot bjornjakt prövar det',
  rock_bjornskinn: 'en rock av björnskinn behöver ett björnskinn (se bjorn); scenariot plagg prövar plaggen',
  skor_bjornskinn: 'skor av björnskinn behöver ett björnskinn (se bjorn); scenariot plagg prövar plaggen',
  rock: 'plaggen sys vid slöjdbänken med bensylen, som de hungrigare byarna efter 6.6 kommer på sent eller inte alls på 35 dygn; scenariot plagg prövar det; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  skor: 'som rock; scenariot plagg prövar det; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  rock_kaninskinn: 'som rock; scenariot plagg prövar det; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  skor_kaninskinn: 'som rock; scenariot plagg prövar det; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  koa: 'handlaren kommer först när byn är rik nog (HANDEL.rik), och de hungrigare byarna efter 6.6 hinner sällan dit på 35 dygn; scenariot handelsko prövar kön; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  fjadrar: 'fjädrar blir det bara när en fälld fågel slaktas och inte äts hel; fåglarna jagas bara när ingen kanin eller inget rådjur finns nära (steg 6.6.3), och i de hungriga byarna äts de; scenariot faglar prövar slakten; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  kol: 'kol blir det bara när elden brunnit ut helt',
  flyttaeld: 'elden flyttas bara när ett hus behöver platsen eller byn har minst tre hus och vuxit ifrån elden (steg 2.10.4); scenariot eldflytt prövar det',
  tillbehor: 'skinnfällen i bädden görs bara när byn har skinn över och kommit på skinnfällen, i 1 av 4 byar på 35 dygn sedan v324; scenariot skinnfall prövar det',
  hantverk: 'handarbete utan sak väljs inte sedan v55; rep tvinnas som en egen handling och resten är projekt',
  metspo: 'sen teknik efter fiskespjutet och repet, hinner inte alltid komma på 35 dygn',
  korg: 'sen teknik efter slöjdbänken, hinner inte alltid komma på 35 dygn',
  buren: 'bara den som inte kan gå (ett svårt skadat ben eller en fot) långt från lägret bärs hem; scenariot vard prövar det',
  fatt: 'bara den som inte kan gå får vatten av de andra; scenariot vard prövar det',
  vatten: 'bara den som inte kan gå får vatten i säcken; scenariot vattensack prövar det',
  axelrem: 'sen teknik i fas 7 (steg 7.1.2–7.1.3, nivå 5), hinner inte alltid komma på 35 dygn; scenarierna axelrem och ryggsack prövar den',
  ryggsack: 'sen teknik i fas 7 (steg 7.1.2–7.1.3, nivå 5), hinner inte alltid komma på 35 dygn; scenarierna axelrem och ryggsack prövar den',
  axelrem_kaninskinn: 'sen teknik i fas 7 (steg 7.1.2–7.1.3, nivå 5), hinner inte alltid komma på 35 dygn; scenarierna axelrem och ryggsack prövar den',
  axelrem_vargskinn: 'sen teknik i fas 7 (steg 7.1.2–7.1.3, nivå 5), hinner inte alltid komma på 35 dygn; scenarierna axelrem och ryggsack prövar den',
  axelrem_bjornskinn: 'sen teknik i fas 7 (steg 7.1.2–7.1.3, nivå 5), hinner inte alltid komma på 35 dygn; scenarierna axelrem och ryggsack prövar den',
  ryggsack_kaninskinn: 'sen teknik i fas 7 (steg 7.1.2–7.1.3, nivå 5), hinner inte alltid komma på 35 dygn; scenarierna axelrem och ryggsack prövar den',
  ryggsack_vargskinn: 'sen teknik i fas 7 (steg 7.1.2–7.1.3, nivå 5), hinner inte alltid komma på 35 dygn; scenarierna axelrem och ryggsack prövar den',
  ryggsack_bjornskinn: 'sen teknik i fas 7 (steg 7.1.2–7.1.3, nivå 5), hinner inte alltid komma på 35 dygn; scenarierna axelrem och ryggsack prövar den',
  vattensack: 'sen teknik efter skinnkläderna (steg 2.10.1), hinner inte alltid komma på 35 dygn; scenariot vattensack prövar säcken',
  odling: 'sen teknik (steg 2.10.2): byn kommer på den när den samlat mycket av de vilda grödorna, sällan på 35 dygn; scenarierna odling och falt prövar den',
  odla: 'bara efter odlingen och ett röjt fält (steg 2.10.3), sällan på 35 dygn; scenariot falt prövar det',
  rovor: 'grödor blir det bara på ett sått fält (steg 2.10.3); scenariot falt prövar det',
  forrad: 'förrådshuset byggs när maten ruttnar eller förrådet är fullt, i ungefär var femte by på 30 dygn sedan kvaliteten (steg 2.2.2); scenariot forradshus prövar det',
  samling: 'blir det bara av en sovsal som ingen längre sover i (steg 1.6.4); scenariot funktion prövar det',
  verkstad: 'blir det bara när en station hamnar i ett hus där ingen sover (steg 2.2.17), inte i alla byar på 35 dygn; scenariot verkstad prövar det',
  krossa: 'utbrotten är sällsynta (Björn efter v138: de blir vanligare med motgångar och attacker); att slå sönder något och barnens trots prövas i scenarierna utbrott och barnutbrott',
  skams: 'straffet skam döms bara när en ledare straffar någon för ett brott, och brotten är sällsynta; scenariot ledare prövar det',
  elak: 'utbrotten är sällsynta; att vara elak prövas i scenariot utbrott',
  grata: 'utbrotten är sällsynta; att gråta prövas i scenariot utbrott',
  tjura: 'utbrotten är sällsynta; att tjura prövas i scenariot utbrott',
  skvallra: 'utbrotten är sällsynta; skitsnacket prövas i scenariot rykten',
  skrika: 'barnens utbrott är sällsynta; att skrika prövas i scenariot barnutbrott',
  fly: 'utbrotten är sällsynta; att springa iväg prövas i scenarierna utbrott och barnutbrott',
  badd: 'de allvarliga utbrotten kommer bara när humöret är mycket lågt; scenariot vald prövar det',
  slut: 'de allvarliga utbrotten kommer bara när humöret är mycket lågt; scenariot vald prövar det',
  sla: 'de allvarliga utbrotten kommer bara när humöret är mycket lågt; scenariot vald prövar det',
  torka: 'kött och fisk hängs bara upp när byn har mat över för ett dygn, och i en hungrig by blir inget över; scenariot tork prövar det',
  torrkott: 'torkat kött blir det bara när kött blir över (se torka); scenariot tork prövar det',
  torrfisk: 'det som blir över när byn har mat för ett dygn hängs upp; sedan byarna blev större (steg 2.12.6) äts fisken oftast färsk, och oftare blir köttet från ett slaktat djur över; scenariot tork prövar det',
  vargjakt: 'vargarna kommer bara i istiden (steg 3.7.13), inte i alla byar på 35 dygn; scenariot varg prövar vargjakten',
  varg: 'vargarna kommer bara i istiden (steg 3.7.13); scenariot varg prövar dem',
  flintspjut: 'sedan skogen gjordes om (steg 5.1.4) görs inget flintspjut i de fyra byarna på 35 dygn; byarna klarar sig med träspjutet, och det ses över i fasens Balans (5.5)',
  vargkott: 'vargkött blir det bara av en fälld varg (steg 3.7.14); scenariot varg prövar det',
  vargskinn: 'vargskinn blir det bara av en fälld varg (steg 3.7.14); scenariot varg prövar det',
  slacka: 'eldsvådor nära byn kommer bara när marken är torr på sommaren (steg 3.8.5); scenariot brand prövar att släcka',
  undan: 'tornadon kommer sällan, bara på sommaren och hösten och inte i alla byar på 35 dygn (steg 3.8.4); scenariot tornado prövar att gå undan',
  flyEld: 'bara den som står nära en brinnande ruta och inte släcker går undan (steg 3.8.5); scenariot brand prövar branden',
  rock_vargskinn: 'en rock av vargskinn behöver två vargskinn, alltså två fällda vargar (steg 3.7.14), sällan på 35 dygn; scenariot plagg prövar den',
  skor_vargskinn: 'skor av vargskinn behöver ett vargskinn, alltså en fälld varg (steg 3.7.14), sällan på 35 dygn; scenariot plagg prövar dem',
  vargdel: 'en styckdel av varg blir det bara när en fälld varg är för tung att bära hem (steg 6.6.1); scenariot styckning prövar det',
  talgljus: 'talgljuset görs av två talg (steg 6.3.8), och talg blir det bara av slaktade rådjur och vargar, i 1 av 4 byar på 35 dygn; scenariot talgljus prövar det; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  ljus: 'ett talgljus ställs bara fram när byn har ett (se talgljus); scenariot talgljus prövar det',
  uppsatt: 'en fackla sätts bara upp när byn har en över (steg 6.3.7), och facklan görs i 1 av 4 byar på 35 dygn; scenariot uppsatt prövar det; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  skinnfall: 'skinnfällen kommer man bara på när byn har skinn över och halmbäddar (steg 2.2.15), sällan på 35 dygn sedan skinnen blev kvar där djuret styckades (steg 6.6.1); scenariot skinnfall prövar det; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  skinndorr: 'skinndörren kommer man bara på när byn har skinn över och ett hus med en öppen dörröppning (steg 2.2.16), sällan på 35 dygn; scenariot dorr prövar den; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  skogsvard: 'skogsvården kommer man bara på när de närmaste träden att fälla står långt bort (steg 6.5.2), sällan på 35 dygn; scenariot skogsvard prövar den; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  plantera: 'plantor flyttas bara av den som kan skogsvården (se skogsvard); scenariot skogsvard prövar det',
  budRovare: 'budbäraren springer bara när en flock väntar utanför byn och någon inte hört ropet (steg 9.2.117); scenariot rovarbud prövar det',
  skilja: 'man går emellan bara när två slåss nära en (steg 10.1.4); scenariot stridkarta prövar det',
  undanStrid: 'man går undan bara när två slåss nära en (steg 10.1.4); scenariot stridkarta prövar det',
  hjalpaRovare: 'man håller sig bakom kämparna bara när rövare eller vargar är nära byn (steg 9.2.116 och 9.2.121); scenarierna rovarforsvar och vargskydd prövar det',
  forsvarRovare: 'man väntar på rövarna med vapen bara när rövare är nära byn (steg 9.2.74), och de kommer bara till en rik by; scenariot rovarforsvar prövar det',
};
// fas 8 (system 8.2, 8.3, 8.5 och 8.6): det som kräver en ledare, en präst eller en tro på en viss nivå hinner sällan komma på 35 dygn
for (const k of ['medvetslos', 'mantel', 'prastdrakt', 'tecken', 'mask', 'koka_rokelse', 'koka_olja', 'hovbygge', 'rokelse', 'brannolja', 'rustning', 'hjalm', 'skold', 'bage', 'slunga', 'horn', 'pilar', 'gor_pilar', 'avrusta', 'rusta']) SALLSYNT[k] ??= 'kräver en ledare eller en tro på en viss nivå; scenarierna mantel, ritualer och kyrkan prövar det';
for (const k of SIM.KLAD_SLAG) if (/^(mantel|prastdrakt|tecken|mask|rustning|hjalm)_/.test(k)) SALLSYNT[k] ??= 'bara ledaren eller en präst, och de troende när tron har nått långt; scenarierna mantel och kyrkan prövar det';
// fas 9, system 9.6: matlagningen, dryckerna och det nya kräver lerkrukan, sädesodlingen eller en teknik på nivå 4–5, som byarna sällan
// hinner komma på 35 dygn; varje sak har sitt scenario
for (const [ks, why] of [
  [[...SIM.RATT_SAKER, 'koka_mat', 'steka'], 'rätterna (steg 9.6.3 och 9.6.21) kräver lerkrukan och stekhällen; scenarierna kokning och stek prövar dem'],
  [['ulltrad', 'ylle', 'spinna_ull', 'vava_ull', 'tunika_ylle', 'skjorta_ylle', 'kappa', 'sjal', 'kappa_ylle', 'sjal_ylle', 'mantel_ylle'], 'ullen (steg 9.8.14) kräver får, vävstolen och sländan; scenariot ylle prövar den'],
  [['mata', 'hage', 'valla', 'klippa', 'mjolka', 'avliva', 'slatter', 'skara', 'ull', 'slaktfar', 'slaktget', 'djurhorn', 'levget', 'levhons', 'far', 'get', 'fahus'], 'de tama djuren (system 9.8) kommer först när byn köpt får, getter eller höns av handlaren, och djuren är dyra; scenarierna boskap, hage, hagflytt, mjolk, tamslakt, slatter och hons prövar dem'],
  [['kal', 'bonor', 'kalfron', 'appel', 'appelplanta', 'levfar'], 'kålen, bönorna, äppelträdet och fåren (steg 9.7.8, 9.7.13 och 9.8.5) kommer med handlaren, och byn köper dem inte alltid inom 35 dygn; scenarierna grodor, flerarig och boskap prövar dem'],
  [['hamla', 'lovkarve'], 'lövtäkten (steg 9.8.16) kräver betesdjur och för lite hö; scenariot hamla prövar den'],
  [['tomma_latrin'], 'latrinen töms (steg 9.7.6) bara när byn har en kompost och latrinen är nästan full; scenariot kompost prövar det'],
  [['krossa_saft'], 'saften (steg 9.6.9) kräver lerkrukan; scenariot saft prövar den'],
  [['korn', 'sadesodling', 'malt', 'malta', 'mjol', 'mala_korn', 'kvarnsten', 'brod', 'baka', 'bakugn'], 'kornet (steg 9.6.11) kommer bara med handlarna, och mjölet, maltet och brödet efter det; scenarierna sad, kvarn och brod prövar dem'],
  [['bryggkar', 'tappa', 'ol'], 'vinet och ölet (steg 9.6.12–9.6.13) är tekniker på nivå 4–5; scenarierna vin och ol prövar dem'],
  [['supa'], 'supandet (steg 9.6.15) kräver vin eller öl i byn; scenariot bakfylla prövar det'],
  [['nat', 'braxen', 'sik', 'braxkott', 'sikkott'], 'nätet (steg 9.6.16) är en teknik på nivå 4, och braxen och sik fångas mest i nätet; scenarierna nat och braxen prövar dem'],
  [['salt', 'saltfisk', 'saltkott', 'salta_fisk', 'salta_kott'], 'saltet (steg 9.6.19) kommer bara med handlarna; scenariot salt prövar det'],
  [['rokeri', 'roka', 'rokfisk', 'rokkott'], 'rökeriet (steg 9.6.8) är en teknik på nivå 5; scenariot rokeri prövar det'],
  [['stekhall'], 'stekhällen (steg 9.6.21) är en teknik på nivå 4; scenariot stek prövar den'],
] as [string[], string][]) for (const k of ks) SALLSYNT[k] ??= why;
SCENARIER.aldrig = {
  text: 'Allt i registren används: varje handling, sak, husfunktion, djurart och teknik förekommer i minst en av fyra byar under 35 dygn (35 år i spelet, fem veckor i verkligheten)',
  lang: true,
  kor: () => {
    const DYGN = 35, BYAR = 4;
    const reg: Record<string, string[]> = {
      handlingar: Object.keys(ACTS), saker: Object.keys(SAKER), husfunktioner: [...FN], djurarter: Object.keys(DJUR), tekniker: TEKNIK.map(t => t.id),
    };
    const dold = Object.fromEntries(Object.keys(SAKER).filter(k => SAKER[k]!.dold && SAKER[k]!.i).map(k => [SAKER[k]!.i!, k])); // giftsvampen göms i svampen
    const sett = Object.fromEntries(Object.keys(reg).map(k => [k, new Map<string, number>()]));
    const vakter: string[] = [];
    for (let i = 0; i < BYAR; i++) {
      const by = Object.fromEntries(Object.keys(reg).map(k => [k, new Set<string>()]));
      let steg = 0;
      const r = korBy(seedAv(i), DYGN, s => {
        for (const p of [...living(s), ...SIM.gasterNu(s)]) if (p.task) { by.handlingar!.add(p.task.act); for (const k in p.task.items ?? {}) by.saker!.add(k); }
        for (const a of s.stackar ?? []) { by.saker!.add(a.k); if (a.dold && dold[a.k]) by.saker!.add(dold[a.k]!); }
        for (const t of tingOf(s)) by.saker!.add(t.k);
        for (const f of s.flackar ?? []) if (SAKER[f.k]) by.saker!.add(f.k); // toa-högen är en fläck på marken (smuts.ts)
        if (steg++ % STEG_TIM === 0) for (const h of housesOf(s)) by.husfunktioner!.add(fnId(h));
      });
      vakter.push(...r.vakter.map(v => `by ${r.seed}: ${v}`));
      // vanorna har varje handling som någon gjort, också de döda och utflyttade
      for (const p of r.s.people) { for (const k in p.habit) by.handlingar!.add(k); for (const t of reg.tekniker!) if (knows(p, t)) by.tekniker!.add(t); }
      for (const k of reg.djurarter!) if (by.saker!.has(DJUR[k as keyof typeof DJUR].sak)) by.djurarter!.add(k);
      for (const [kat, set] of Object.entries(by)) for (const k of set) sett[kat]!.set(k, (sett[kat]!.get(k) ?? 0) + 1);
    }
    const ut: Koll[] = Object.entries(reg).map(([kat, ks]) => {
      const aldrig = ks.filter(k => !sett[kat]!.has(k)), sallan = ks.filter(k => sett[kat]!.has(k) && sett[kat]!.get(k)! < BYAR);
      const txt = `${kat}: ${ks.length - aldrig.length} av ${ks.length} används` +
        (aldrig.length ? `, aldrig: ${aldrig.map(k => SALLSYNT[k] ? `${k} (sällsynt: ${SALLSYNT[k]})` : k).join(', ')}` : '') +
        (sallan.length ? `; bara i några av byarna: ${sallan.map(k => `${k} ${sett[kat]!.get(k)} av ${BYAR}`).join(', ')}` : '');
      return [txt, aldrig.every(k => SALLSYNT[k])] as Koll;
    });
    const okanda = Object.keys(SALLSYNT).filter(k => !Object.values(reg).some(ks => ks.includes(k)));
    return [
      ...ut,
      [`listan över det sällsynta har bara sådant som finns i registren${okanda.length ? ` (inte: ${okanda.join(', ')})` : ''}`, !okanda.length],
      [`inga vaktlarm i byarna${vakter.length ? `: ${vakter.slice(0, 3).join('; ')}` : ''}`, !vakter.length],
    ];
  },
};

SCENARIER.gastutrustning = {
  text: 'Steg 10.1.8: varje sort gäst har en rad i GASTUTRUSTNING som säger hur ofta hen har varje vapen, plagg och ärr. Rövare har oftare vapen och ärr än handlare. Vapnen och kläderna är saker gästen bär (ting i en egen lista, så att byns räkningar inte ser dem): de gäller i striden, syns på figuren och i porträttet, och det den döde höll i ligger kvar på rutan',
  kor: () => {
    const s = createState(4, START), N = 200;
    const yxor0 = SIM.nTools(s, 'yxa'), rik0 = SIM.rikedom(s), ting0 = SIM.tingOf(s).length;
    const ny = (sort: SIM.GastSort, i: number) => SIM.nyGast(s, { id: SIM.nyttGastId(s), namn: sort + i, sex: i % 2 ? 'm' : 'k', fodd: s.now - 30 * SIM.DAY, rad: { sort }, x: 5, y: 5, nyckel: 5000 + i * 7 + sort.length });
    const rov = Array.from({ length: N }, (_, i) => ny('rovare', i)), hand = Array.from({ length: N }, (_, i) => ny('handlare', i)), fram = Array.from({ length: N }, (_, i) => ny('framling', i));
    const andel = (l: SIM.Person[], f: (p: SIM.Person) => boolean) => l.filter(f).length / l.length;
    const vapen = (p: SIM.Person) => !!SIM.gastVapen(s, p), arr = (p: SIM.Person) => !!p.arr?.length, kladd = (p: SIM.Person) => SIM.paSig(s, p).length > 0;
    const rv = andel(rov, vapen), hv = andel(hand, vapen), fv = andel(fram, vapen), ra = andel(rov, arr), ha = andel(hand, arr);
    // sakerna är ting som gästen äger, och inget vapen står som ett eget fält
    const somTing = rov.every(p => SIM.gastTingOf(s, p).every(t => t.agare === p.id && !!SIM.SAKER[t.k] && (t.hos === p.id || t.bar === p.id || (t.hos === undefined && t.bar === undefined))));
    const ingetFalt = [...rov, ...hand, ...fram].every(p => !('vapen' in p.gast!));
    const olika = new Set(rov.map(p => SIM.gastTingOf(s, p).map(t => t.k).sort().join('+'))).size;
    // byns räkningar ser dem inte
    const bynLika = SIM.nTools(s, 'yxa') === yxor0 && SIM.rikedom(s) === rik0 && SIM.tingOf(s).length === ting0;
    // i striden: vapnet är det hen bär, och plaggen som skyddar är med
    const kampar = rov.map(p => ({ p, k: SIM.personKampe(s, p, 1, 1, 0, 0) }));
    const vapenIStrid = kampar.every(({ p, k }) => k.vapen === 'hand' ? !SIM.gastTingOf(s, p).some(t => (SIM.MANNISKOVAPEN as string[]).includes(t.k) && t.k !== 'bage') : SIM.gastTingOf(s, p).some(t => t.k === k.vapen));
    const skyddar = kampar.filter(({ p }) => SIM.paSig(s, p).some(t => SIM.SKYDD[t.k])), medKlader = skyddar.filter(({ p, k }) => SIM.paSig(s, p).filter(t => SIM.SKYDD[t.k]).every(t => k.klader.includes(t.k))).length;
    // på figuren och i porträttet
    const bild = rov.map(p => ({ p, q: rovarSkapad(s, p, 'arg') }));
    const rockSyns = bild.filter(({ p }) => SIM.paSig(s, p).some(t => SIM.kladAv(t.k)?.plagg === 'rock')).every(({ q }) => !!q.klader.rock);
    // yxan och spjuten har en bild i handen; kniven och bågen har ingen än (de väntar på ritningar i bildstilen)
    const vapenSyns = bild.filter(({ p }) => ['yxa', 'flintspjut', 'fiskespjut'].includes(SIM.gastVapen(s, p) ?? '')).every(({ q }) => !!q.del.redskap);
    const utanBild = [...new Set(bild.filter(({ p, q }) => SIM.gastVapen(s, p) && !q.del.redskap).map(({ p }) => SIM.sakNamn(SIM.gastVapen(s, p)!).toLowerCase()))];
    const arrSyns = bild.filter(({ p }) => p.arr?.some(a => a.d === 'huvud')).every(({ q }) => !!q.del.arr);
    // den som dör tappar det hen höll i; den som går hem tar det med sig
    const dod = rov.find(vapen)!, hem = rov.find(p => p !== dod && vapen(p))!, vk = SIM.gastVapen(s, dod)!;
    s.people.push(dod, hem); dod.x = 20.5; dod.y = 21.5; dod.died = s.now;
    SIM.gastGar(s, dod.id); SIM.gastGar(s, hem.id);
    const ligger = SIM.tingOf(s).some(t => t.k === vk && t.x === 20 && t.y === 21 && t.hos === undefined), kvar = SIM.gastTingOf(s, dod).length + SIM.gastTingOf(s, hem).length, nya = SIM.tingOf(s).length - ting0;
    const pct2 = (v: number) => Math.round(v * 100) + ' %';
    return [
      [`rövarna har oftare vapen (${pct2(rv)}) än handlarna (${pct2(hv)}) och främlingarna (${pct2(fv)}), och oftare ärr (${pct2(ra)} mot ${pct2(ha)})`, rv > 0.8 && rv > hv + 0.2 && rv > fv + 0.2 && ra > ha + 0.2],
      [`nästan alla är klädda (rövare ${pct2(andel(rov, kladd))}, handlare ${pct2(andel(hand, kladd))}), och rövarna bär olika saker (${olika} olika uppsättningar av ${N})`, andel(rov, kladd) > 0.9 && andel(hand, kladd) > 0.9 && olika > 20],
      ['vapnen och kläderna är ting som gästen äger, i handen eller på sig, och inget vapen står som ett eget fält', somTing && ingetFalt],
      ['byns räkningar ser inte gästernas saker (yxorna, rikedomen och byns ting är som förut)', bynLika],
      [`i striden slåss gästen med vapnet hen bär, och plaggen som skyddar är med (${medKlader} av ${skyddar.length})`, vapenIStrid && skyddar.length > 20 && medKlader === skyddar.length],
      [`plaggen, vapnet och ärren syns på figuren och i porträttet (utan bild i handen än: ${utanBild.join(', ') || 'inget'})`, rockSyns && vapenSyns && arrSyns],
      [`den som dör tappar det hen höll i (${SIM.sakNamn(vk).toLowerCase()} ligger på rutan: ${ligger ? 'ja' : 'nej'}), och den som går tar sitt med sig (${kvar} ting kvar, ${nya} nytt i byn)`, ligger && kvar === 0 && nya >= 1],
    ];
  },
};

SCENARIER.rovardrakt = {
  text: 'Rövarnas utseende (steg 6.6.12, ui/utseende.ts): rövarna är figurer ur skaparen som byborna, och samma rövare ser alltid likadan ut. De bär rövarens delar (luvan, duken och rocken av mörkt, slitet skinn) och vargskinnsrocken, var och en med sin chans, och vapnet i handen; byborna får aldrig rövarens delar.',
  kor: () => {
    const s = createState(4, START), RS = new Set(['bonad-9', 'bonad-10']);
    // rövarna är gäster med det de bär ur registret GASTUTRUSTNING (steg 10.1.8); vapnet sätts här så att det går att känna igen
    const ROVARDRAKT = SIM.GASTUTRUSTNING.rovare.drakt!;
    const rov = Array.from({ length: 60 }, (_, i) => { const r = SIM.nyGast(s, { id: SIM.nyttGastId(s), namn: 'Rövare' + i, sex: i % 2 ? 'm' : 'k', fodd: s.now - 30 * SIM.DAY, rad: { sort: 'rovare' }, x: 1, y: 1, nyckel: 1000 + i }); SIM.gastVapenSatt(s, r, i % 3 ? 'yxa' : 'flintspjut'); return r; });
    const a = rov.map(r => rovarSkapad(s, r, 'arg')), b = rov.map(r => rovarSkapad(s, r, 'arg'));
    const lika = JSON.stringify(a) === JSON.stringify(b);
    const luva = a.filter(q => q.del.huvudbonad === 'bonad-9').length, duk = a.filter(q => q.del.huvudbonad === 'bonad-10').length;
    const skinn = a.filter(q => q.klader.rock === 'rovarskinn').length, varg = a.filter(q => q.klader.rock === 'vargskinn').length;
    const vapen = a.every((q, i) => q.del.redskap === (SIM.gastVapen(s, rov[i]) === 'yxa' ? 'redskap-yxa' : 'redskap-flintspjut'));
    const by = living(s).map(p => skapad(s, p)), bybor = by.every(q => !RS.has(q.del.huvudbonad ?? '') && q.klader.rock !== 'rovarskinn');
    const kring = (n: number, p: number) => n > 60 * p * 0.4 && n < 60 * p * 1.8;
    return [
      ['samma rövare ser likadan ut varje gång', lika],
      [`luvan ${luva}, duken ${duk}, rocken av slitet skinn ${skinn}, vargskinnet ${varg} av 60 (GASTUTRUSTNING)`, kring(luva, ROVARDRAKT.luva) && kring(duk, ROVARDRAKT.duk) && kring(skinn, ROVARDRAKT.rovarskinn) && varg > 0],
      ['rövaren har vapnet i handen', vapen],
      ['byborna bär aldrig rövarens delar', bybor],
    ];
  },
};

SCENARIER.portratt = {
  text: 'Porträtten (steg 5.2.3.1, 5.2.3.3–5.2.3.5): varje person får sina delar ur registret PORTRATT, ett barn ärver dem från mamman och pappan, och samma person blir likadan varje gång, också i en sparad by (allt räknas ur numret och föräldrarna); skönheten väljer de fula delarna och lagren, och beskrivningens vackraste eller fulaste del tas ur ansiktet; humöret, sömnen, sjukdomen, kylan, förbandet och blodet följer spelet, och kläderna och redskapet utrustningen; porträttet och kartfiguren har bara färger ur paletten',
  kor: () => {
    const s = createState(3, START), vuxna = living(s).filter(p => ageOf(p, s.now) >= 20);
    const mor = vuxna.find(p => p.sex === 'k')!, far = vuxna.find(p => p.sex === 'm')!;
    const barn: Person[] = []; for (let i = 0; i < 30; i++) barn.push(SIM.newPerson(s, i % 2 ? 'm' : 'k', s.now, mor, far));
    const alla = [...living(s), ...barn], ett = (p: Person) => JSON.stringify(drag(s, p));
    const forst = alla.map(ett); glomArv(); const igen = alla.map(ett);
    const ANSIKTE = ['huvudform', 'ora', 'nasa', 'oga', 'ogonbryn', 'mun'] as const;
    let fran = 0, delar = 0;
    for (const c of barn) { const d = drag(s, c), m = drag(s, mor), f = drag(s, far); for (const k of ANSIKTE) { delar++; if (d.del[k] === m.del[k] || d.del[k] === f.del[k]) fran++; } }
    const olika = new Set(living(s).map(p => JSON.stringify(drag(s, p).del))).size;
    let utanfor = 0, ritade = 0;
    for (const p of alla) {
      const q = skapad(s, p), B = KARNA.portratt(q), F = KARNA.kartFigur(q, 'fram', 'sta', 'hanga');
      if (B.w === 64 && B.h === 64 && F.w === 14 && F.h === 20) ritade++;
      for (const v of [...B.px, ...F.px]) if (v < -1 || v >= FARGER.length) utanfor++;
    }
    const kon = alla.every(p => drag(s, p).kon === (p.sex === 'k' ? 'kvinna' : 'man')) && barn.every(c => skapad(s, c).alder === 'barn');
    // skönheten (steg 5.2.3.3): nivån följer personen, de vanliga och vackra har inga fula delar, och beskrivningen säger det
    // vackraste eller fulaste som syns i ansiktet
    glomArv();
    const skonOk = alla.every(p => drag(s, p).skonhet === skonNiva(p));
    let fulaDelar = 0;
    for (const p of alla) if (skonNiva(p) >= 0) for (const k of ['huvudform', 'ora', 'nasa', 'oga', 'ogonbryn', 'mun']) if (KARNA.DEL[drag(s, p).del[k] ?? '']?.ful) fulaDelar++;
    const ord = Object.values(ANSIKTSORD);
    let sagt = 0, skona = 0;
    for (const [i, v] of [[0, 19], [1, 2], [2, 1], [3, 20]] as const) {
      const p = living(s)[i]; if (!p) continue;
      p.pot.skonhet = v; glomArv(); skona++;
      const t = SIM.beskrivning(s, p), q = skapad(s, p);
      if (q.skonhet === (v > 10 ? 2 : -2) && (ord.some(o => t.includes(o)) || /ögon|hår/.test(t))) sagt++;
    }
    // kroppen följer spelet (steg 5.2.3.4): sömnen, sjukdomen, kylan, förbandet och blodet
    const kp = living(s)[0], fore = skapad(s, kp);
    kp.task = { act: 'sova', phase: 'do', tx: kp.x, ty: kp.y, until: s.now + 3600e3 } as SIM.Task;
    kp.sickUntil = s.now + 3600e3; kp.warm = 0.1;
    kp.skador = [{ d: 'huvud', k: 'skarsar', g: 0.5, b: 1, f: 1 }];
    const efter = skapad(s, kp);
    const kroppOk = fore.humor !== 'sover' && !fore.sjuk && !fore.blod && efter.humor === 'sover' && efter.sjuk && efter.kyla && efter.blod && efter.forband.includes('forband-huvud');
    kp.task = undefined; kp.sickUntil = undefined; kp.warm = 0.9; kp.skador = [];
    // kläderna och redskapet följer utrustningen (steg 5.2.3.5): rocken av vargskinn, skorna, bältet och yxan i handen
    for (const t of tingOf(s)) if (t.bar === kp.id || t.hos === kp.id) { t.bar = undefined; t.hos = undefined; }
    const naken = skapad(s, kp);
    for (const k of ['rock_vargskinn', 'skor_kaninskinn', 'balte_rep']) SIM.newTing(s, k, 0, kp.id).bar = kp.id;
    SIM.newTing(s, 'yxa', 0, kp.id).hos = kp.id;
    const kladd = skapad(s, kp);
    const kladOk = !naken.klader.rock && !naken.klader.skor && !naken.del.redskap && kladd.klader.rock === 'vargskinn' && kladd.klader.skor && kladd.klader.balte && kladd.del.redskap === 'redskap-yxa';
    return [
      [`kläderna och redskapet följer utrustningen (${kladd.klader.rock}, ${kladd.klader.skor}, ${kladd.klader.balte}, ${kladd.del.redskap})`, kladOk],
      ['samma person blir likadan igen, när allt räknas om', forst.every((v, i) => v === igen[i])],
      [`porträttet följer kroppen: sover, sjuk, fryser, förband och blod (${efter.humor}, ${efter.sjuk}, ${efter.kyla}, ${efter.forband.join('/')}, ${efter.blod})`, kroppOk],
      [`barnen ärver ansiktet: ${fran} av ${delar} delar från mamman eller pappan (minst 80 %)`, fran >= delar * 0.8],
      [`de första i byn ser olika ut (${olika} olika av ${living(s).length})`, olika === living(s).length],
      ['könet följer personen och barnen ritas som barn', kon],
      ['skönheten i porträttet följer personens skönhet (−2 till 2)', skonOk],
      [`de vanliga och vackra har inga fula delar i ansiktet (${fulaDelar})`, fulaDelar === 0],
      [`beskrivningen säger det vackraste eller fulaste som syns i ansiktet (${sagt} av ${skona})`, sagt === skona],
      [`porträttet (64 × 64) och kartfiguren (14 × 20) ritas för alla ${alla.length} (${ritade}) med bara palettens färger (${utanfor} utanför)`, ritade === alla.length && utanfor === 0],
    ] as Koll[];
  },
};

SCENARIER.processgrupp = {
  text: 'Steg 9.2.60: när testet stoppar en process efter tidsgränsen (korProcess i pool.ts) stoppas hela gruppen av processer den startat, inte bara den',
  kor: () => {
    const ut = execFileSync(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('../processgrupp.ts', import.meta.url))], { encoding: 'utf8' });
    const r = JSON.parse(ut.trim().split('\n').pop()!) as { pid: number; kvar: boolean; stoppad: boolean };
    return [
      ['processen som aldrig blev klar stoppades efter tidsgränsen', r.stoppad],
      [`och den den startade (pid ${r.pid}) lever inte kvar`, r.pid > 0 && !r.kvar],
    ];
  },
};

SCENARIER.arbetstid = {
  text: 'Steg 9.2.63: varje handling har ett tidsslag (ett arbete i TIDSLAG eller en stund), och vakten i npm test och npm run balans larmar när ett arbete tar längre tid än sitt slag',
  kor: () => {
    const nu = 0, MIN = 60_000;
    const kniv30 = SIM.forLangtArbete({ act: 'kniv', until: nu + 30 * MIN }, nu), kniv3 = SIM.forLangtArbete({ act: 'kniv', until: nu + 3 * MIN }, nu);
    const vila = SIM.forLangtArbete({ act: 'vila', until: nu + 300 * MIN }, nu);
    return [
      [`kniven har slaget ${SIM.tidSlagAv('kniv')}, och vakten larmar när den får 30 minuter (${kniv30 ?? 'inget larm'})`, SIM.tidSlagAv('kniv') !== 'stund' && !!kniv30],
      ['men inte när den tar 3 minuter', !kniv3],
      [`att vila är en stund (${SIM.tidSlagAv('vila')}) och får ta hur lång tid som helst`, SIM.tidSlagAv('vila') === 'stund' && !vila],
    ];
  },
};
