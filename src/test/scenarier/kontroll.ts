import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Scenarier. Kontroller av hela spelet: gränssnittet läser utan att ändra, ikoner, vakter och det som aldrig händer.
import { Person, createState, step, living, serializeParts, serialize, isLight, ageOf, TEKNIK, FYND, FYND_IDS, GRUPPER, DJUR, tingOf, SEC, MATERIAL, ACTS, isSick, SAKER, slagIkon } from '../../sim';
import * as SIM from '../../sim';
import { hasIcon, PAL } from '../../ikoner';
import { FARGER, MORKARE, PALETT, iPaletten, kornPa, rasterSteg } from '../../palett';
import { BEAT, START, halTidVid } from '../kor';
import { KARNA } from '../../portrattkarna';
import { KARTBILDER, SYMNAMN } from '../../kartbilder';
import { symDelar, symUtan } from '../../ui/symboler';
import { anvandsKant, skaffasKant } from '../../ui/skaffas';
import * as fs from 'fs';
import * as path from 'path';
import { ANSIKTSORD, drag, glomArv, rovarSkapad, skapad, skonNiva } from '../../ui/utseende';
import { Koll, kor, klockan, uiLas, testBy, SCENARIER, barGrenar, utanWebblasare } from './hjalp';
import { setByn, ui } from '../../ui/lage';
import { sak as sakFlik } from '../../ui/flikar/sak';
import { station as stationFlik } from '../../ui/flikar/station';
import { hus as husFlik } from '../../ui/flikar/hus';
import { lager as lagerFlik } from '../../ui/flikar/lager';
import { falt as faltFlik } from '../../ui/flikar/falt';
import { person as personFlik } from '../../ui/flikar/person';
import { eld } from '../../ui/flikar/eld';
import { forrad } from '../../ui/flikar/forrad';
import { grannar } from '../../ui/flikar/grannar';
import { kronika } from '../../ui/flikar/kronika';
import { religion } from '../../ui/flikar/religion';
import { seder } from '../../ui/flikar/seder';
import { styre } from '../../ui/flikar/styre';
import { tal } from '../../ui/flikar/tal';
import { teknik } from '../../ui/flikar/teknik';
import { lagstBehov } from '../../ui/hjalp';

// alla rutor och flikar i en testby, ritade som text: de som visar "//" (en kodkommentar som hamnat i en textmall)
function kodIRutorna() {
  const s = SIM.cloneState(testBy(30)); utanWebblasare(); setByn(s); // en by efter 30 dygn har stationer, fält och många saker att läsa
  const fel: string[] = []; let n = 0;
  const las = (namn: string, html: () => string) => { n++; if (/(^|[^:])\/\/\s/.test(html())) fel.push(namn); };
  for (const [namn, f] of Object.entries({ eld, forrad, grannar, kronika, religion, seder, styre, tal, teknik })) las(namn, () => f.html!());
  for (const st of SIM.stationerOf(s)) { ui.stationId = st.id; las(`station ${st.k}`, () => stationFlik.html!()); }
  for (const h of SIM.housesOf(s)) { ui.husId = h.id; las(`hus ${h.id}`, () => husFlik.html!()); }
  SIM.zonesOf(s).forEach((z, i) => { ui.lagerNr = i; las(`lager ${z.namn ?? i}`, () => lagerFlik.html!()); });
  for (const f of s.falt ?? []) { ui.faltId = f.id; ui.faltRuta = -1; las(`fält ${f.id}`, () => faltFlik.html!()); }
  for (const tg of tingOf(s).slice(0, 60)) { ui.sak = `t:${tg.id}`; las(`sak ${tg.k}`, () => sakFlik.html!()); }
  for (const p of living(s)) { ui.selected = p.id; las(`person ${p.name}`, () => personFlik.html!()); }
  return { n, fel: [...new Set(fel)] };
}
// Styre-fliken får plats (steg 12.1.26): varje rad i ledarlistan har lika många delar som listan har kolumner, så att ingen del
// hamnar på en egen rad utanför rutan, ingen text i den klipps, och rutorna står i en kolumn på en smal skärm
function styretFarPlats() {
  const s = SIM.cloneState(testBy(1, b => !!SIM.ledareOf(b))); utanWebblasare(); setByn(s); // en testby med en ledare: listan finns bara då
  const css = readFileSync(new URL('../../template.html', import.meta.url), 'utf8');
  const kol = /\.rels\.ledarlista \{ grid-template-columns: ([^;]+);/.exec(css)?.[1].trim().split(/\s+(?![^(]*\))/).length ?? 0;
  const smal = /@media \(max-width: \d+px\) \{ \.rutor \{ grid-template-columns: minmax\(0, 1fr\); \}/.test(css);
  const klipps = /\.rels\.ledarlista[^{]*\{[^}]*(nowrap|ellipsis)/.test(css);
  ui.styreDel = 'styre'; const html = styre.html!();
  const lista = /<ul class="rels ledarlista">([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? '';
  const rader = [...lista.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => {
    let d = 0, n = 0; for (const x of m[1].matchAll(/<(\/?)(\w+)[^>]*?(\/?)>/g)) { if (x[1]) d--; else if (!x[3] && !/^(img|br)$/.test(x[2])) { if (d === 0) n++; d++; } else if (d === 0) n++; } return n;
  });
  return { ledare: !!SIM.ledareOf(s), kol, rader, smal, klipps };
}

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
    // ingen ruta eller flik visar kod (steg 12.1.12): varje station, hus, lager, fält, ting och person i en testby, och flikarna
    const kod = kodIRutorna(), st = styretFarPlats();
    return [
      [`Styre-fliken får plats (steg 12.1.26): ledarlistan har ${st.kol} kolumner och raderna ${st.rader.join(', ') || 'inga'} delar${st.klipps ? ', texten klipps' : ''}; rutorna i en kolumn på en smal skärm: ${st.smal ? 'ja' : 'nej'}`, st.ledare && st.kol === 3 && st.rader.length > 0 && st.rader.every(n => n === st.kol) && !st.klipps && st.smal],
      [`ingen ruta eller flik visar en kodkommentar (${kod.n} rutor${kod.fel.length ? `; "//" i: ${kod.fel.slice(0, 6).join(', ')}` : ''})`, kod.n > 50 && !kod.fel.length],
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
    // sakens ruta (steg 11.1.58): skick och hur länge den håller på en rad, värdet med vågens symbol, och inget om det som kommer senare
    const s = createState(3, START); utanWebblasare(); setByn(s);
    const p0 = living(s)[0], yx = SIM.newTing(s, 'yxa', 0, p0.id); yx.hos = p0.id; ui.sak = `t:${yx.id}`; const sr = sakFlik.html!();
    const sakRuta = /Skick<\/dt><dd>[\s\S]*?\d+ %( · (håller|räcker) [^<]+ till)?<\/span>/.test(sr) && !/<dt>Slitage<\/dt>|<dt>Håller<\/dt>/.test(sr) && /Värde<\/dt><dd>(<img|<span|⚖)/.test(sr) && !/senare'/.test(readFileSync(new URL('../../ui/skaffas.ts', import.meta.url), 'utf8'));
    return [
      ['sakens ruta: skicket och hur länge den håller på en rad, värdet med vågens symbol, och inget om det som kommer senare (steg 11.1.58)', sakRuta],
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
    // panelerna (steg 11.1.22): ingen emoji står kvar, och varje symbol som en panel ber om (tecknet('sym_…') eller {sym_…})
    // har en bild i spelet eller väntar på Björns val i bildstilens valdel (kortets sym)
    const filer = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? filer(path.join(d, e.name)) : /\.(ts|js)$/.test(e.name) ? [path.join(d, e.name)] : []);
    const bild = filer('bildstil').filter(f => !/kontroll-ut|[\\/](bilder|forslag|svar)[\\/]/.test(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
    const emojier = new Set<string>(), vantar = new Set<string>();
    for (const f of filer('src/ui')) {
      const t = fs.readFileSync(f, 'utf8');
      for (const m of t.matchAll(/\p{Extended_Pictographic}\uFE0F?/gu)) if (!symDelar(m[0]).some(x => typeof x !== 'string')) emojier.add(m[0]);
      for (const m of t.matchAll(/tecknet\('(sym_[a-z0-9_]+)'|\{(sym_[a-z0-9_]+)\}/g)) { const id = m[1] ?? m[2]; if (!KARTBILDER[id] && !bild.includes(`'${id}'`)) vantar.add(id); }
    }
    del.push(['emojier i panelerna', [...emojier]], ['panelernas symboler (utan bild och utan kort i valdelen)', [...vantar]]);
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
  lang: true,
  text: 'Nattvakten: varje natt håller en vuxen mellan 16 och 60 år vakt, den modigaste med lite slump bland dem som är lediga (vilar, sover eller inte gör något). Passet är ett pågående arbete som bara Fara och Nöd avbryter. Antalet vakter följer hotet (steg 10.1.20): fler när vargar setts och strax efter ett rövaranfall',
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
    // i natt: nattens vakt väljs bland de lediga. Den modigaste bär två grenar och är inte ledig; den näst modigaste vilar och
    // utses när en annan väljer, och slutar vila
    const q = SIM.cloneState(s); klockan(q, 22); q.lastGuardDay = -1;
    const vuxna = living(q).filter(p => ageOf(p, q.now) >= SIM.ALDER.vaktFran && ageOf(p, q.now) < SIM.ALDER.vaktTill);
    for (const p of vuxna) { p.pot.mod = 1; Object.assign(p, { hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, warm: 0.9, health: 1, sjuk: undefined, skador: [] }); } // friska (sjukdomen i steg 9.5.1 står i p.sjuk)
    const [h, g, p] = vuxna; h!.pot.mod = 30; g!.pot.mod = 20;
    barGrenar(q, h!); g!.task = { act: 'vila', phase: 'do', tx: g!.x, ty: g!.y, until: q.now + SIM.HOUR, carry: 0, paus: true } as SIM.Task; p!.task = undefined;
    const akt = (x: Person) => x.task?.act; // (en funktion, så att typkontrollen inte tror att uppgiften är tom)
    SIM.chooseTask(q, p!);
    const pAkt = akt(p!), utsedd = g!.guardDay === q.lastGuardDay && q.lastGuardDay !== -1 && g!.task === undefined, upptagen = h!.guardDay !== q.lastGuardDay && akt(h!) === 'bara';
    // utan ett tillfälle som pågår (ett kväde vid elden går före den som inte börjat vakta, nivå 3 Tillfälle): ingen annan håller på med något
    for (const x of living(q)) x.task = undefined;
    SIM.chooseTask(q, g!);
    const vaktar = akt(g!);
    // passet är ett pågående arbete: den trötta vakten fortsätter (Grundbehov går inte före), den som fryser farligt går (Nöd)
    g!.rest = 0.05; g!.task!.until = q.now; SIM.chooseTask(q, g!);
    const trott = akt(g!);
    g!.warm = SIM.KROPP.farligt / 2; g!.task = { ...g!.task!, act: 'vakt', until: q.now }; SIM.chooseTask(q, g!);
    const fryser = akt(g!);
    // antalet vakter följer hotet (steg 10.1.20): en by som sett vargar, eller nyss haft rövare, utser fler än en lugn natt
    const antal = (hot: (h: SIM.State) => void) => { const h = SIM.cloneState(s); klockan(h, 22); h.lastGuardDay = -1; h.vargar = undefined; h.rovarVila = undefined; for (const x of living(h)) { x.guardDay = undefined; x.varsel = undefined; Object.assign(x, { health: 1, sjuk: undefined, skador: [] }); x.task = undefined; } hot(h); /* alla friska och lediga: annars kan de sjuka eller de som pratar vid elden göra att för få får vakta */ const y = living(h).find(x => ageOf(x, h.now) >= 18)!; Object.assign(y, { hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, warm: 0.9 }); y.task = undefined; SIM.chooseTask(h, y); return { n: living(h).filter(x => x.guardDay === h.lastGuardDay).length, hot: SIM.vaktHot(h) }; };
    const lugn = antal(() => undefined), medVarg = antal(h => { h.vargar = [{ id: 1, vargar: [1, 2, 3], x: 5, y: 5, mx: 5, my: 5, gar: h.now, hunger: 0.5, gor: 'stryker', sedd: h.now } as SIM.Vargflock]; }), efterRan = antal(h => { h.rovarVila = h.now; });
    return [
      [`en lugn natt vaktar ${lugn.n} (hotet ${lugn.hot.toFixed(1)}), när vargar setts ${medVarg.n} (${medVarg.hot.toFixed(1)}) och strax efter ett rövaranfall ${efterRan.n} (${efterRan.hot.toFixed(1)})`, lugn.n === 1 && medVarg.n > lugn.n && efterRan.n > lugn.n],
      [`${natter.size} nätter under tre dygn (tre år i spelet) hade en vakt, och aldrig mer än en (${[...natter.values()].map(n => n.size).join(', ')}${sjuka.size ? `; ${[...sjuka.keys()].filter(d => !natter.has(d)).length} natt med en sjuk vakt` : ''})`, natter.size + [...sjuka.keys()].filter(d => !natter.has(d)).length >= 3 && [...natter.values()].every(n => n.size === 1)],
      [`vakterna var mellan ${Math.min(...aldrar).toFixed(0)} och ${Math.max(...aldrar).toFixed(0)} år`, aldrar.length > 0 && aldrar.every(a => a >= SIM.ALDER.vaktFran && a < SIM.ALDER.vaktTill)],
      [`i natt (${isLight(q.now) ? 'ljust' : 'mörkt'}) utsågs ${g!.name}, som vilade, när ${p!.name} valde (${pAkt}), och slutade vila; ${h!.name}, som är modigare men bar grenar, utsågs inte`, !isLight(q.now) && utsedd && upptagen],
      [`${g!.name} väljer sedan att hålla vakt (${vaktar})`, vaktar === 'vakt'],
      [`vakten fortsätter passet trött (${trott}) men går när hen fryser farligt (${fryser})`, trott === 'vakt' && fryser !== 'vakt']
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

SCENARIER.tatuering = {
  text: 'Steg 10.7.5: tatueringar. En vuxen som varit med om något stort (fällt en varg eller björn, dödat någon, mist någon nära eller blivit vuxen) vill ha ett märke i pannan, på kinden eller på halsen, så gärna som byns sed i motivet drar. En annan vuxen gör det med bennålen på 4 minuter, i byns stil, och märket syns i porträttet och står i personens berättelse',
  kor: () => {
    const s = createState(3, START), v = living(s).filter(p => ageOf(p, s.now) >= SIM.ALDER.vuxen);
    const [g, q, r] = v;
    s.seder.v.krig = 1; s.seder.v.natur = -1; // byn drar åt Krig och Värna
    SIM.tatHandelse(s, q, 'strid'); SIM.tatHandelse(s, q, 'jakt'); SIM.tatHandelse(s, r, 'jakt');
    const vill = (q.tatV ?? []).map(x => x.m).join(', '), ingenJakt = !r.tatV;
    // upplevelsen som fastnar hos en vuxen ger lusten
    let fastnat = 0, markt = 0;
    for (const p of v.slice(3)) { SIM.upplev(s, p, 'dodade', 'en rövare'); if (p.upp?.some(u => u.k === 'dodade')) { fastnat++; if (p.tatV?.some(x => x.m === 'strid')) markt++; } }
    // ingen bennål: ingen tatuerar
    const utanNal = SIM.tatVal(s, g);
    SIM.addTool(s, 'nal', g); SIM.setAmount(s, 'kol', 3);
    q.x = g.x + 0.5; q.y = g.y;
    const d = SIM.tatVal(s, g); // valet väger lusten gånger hantverket (raden tatuera i FORBATTRA), utan tärningskast
    const fore = skapad(s, q), B0 = KARNA.portratt(fore);
    SIM.tatKlar(s, g, d?.q.id);
    const efter = skapad(s, q), B1 = KARNA.portratt(efter);
    const stil = SIM.byStil(s), del = efter.del.tatPanna;
    let skilda = 0, utanfor = 0;
    for (let i = 0; i < B1.px.length; i++) { if (B1.px[i] !== B0.px[i]) skilda++; if (B1.px[i] < -1 || B1.px[i] >= FARGER.length) utanfor++; }
    const rad = (q.hand ?? []).find(h => h[1] === 'markt');
    // pannan är tagen: en jakt efteråt tar inte den platsen
    SIM.tatHandelse(s, q, 'jakt');
    // alla tolv delarna finns i porträttet
    const delar = SIM.TAT_STILAR.flatMap(st => ['panna', 'kind', 'hals'].map(pl => `tat-${st}-${pl}`)), saknas = delar.filter(id => !KARNA.DEL[id]);
    return [
      [`lusten följer seden: striden märks i en by som drar åt Krig, jakten inte i en som drar åt Värna (${vill})`, vill === 'strid' && ingenJakt],
      [`den som dödat någon vill ha märket när upplevelsen fastnat (${markt} av ${fastnat})`, fastnat > 0 && markt === fastnat],
      ['utan bennål tatuerar ingen', !utanNal],
      [`den som har bennålen väljer att tatuera (${d?.q.name ?? 'ingen'}, poängen ${d ? d.sc.toFixed(2) : '–'}), i 4 minuter`, d?.q === q && d.m === 'strid' && d.dur === 4 * SIM.MIN],
      [`märket i pannan i byns stil (${del}), och inget kol går åt (${SIM.amountOf(s, 'kol')} kvar, fynd 502)`, del === `tat-${stil}-panna` && !efter.del.tatKind && SIM.amountOf(s, 'kol') === 3 && !q.tatV],
      [`det syns i porträttet (${skilda} punkter), bara i paletten`, skilda > 0 && utanfor === 0],
      [`och står i berättelsen (${rad?.[2] ?? ''})`, !!rad],
      [`tolv delar i porträttet, fyra stilar gånger tre platser (${saknas.join(', ') || 'alla finns'})`, !saknas.length],
    ];
  },
};

SCENARIER.fjaderband = {
  text: 'Halsband av fjädrar (steg 10.7.7): fjädrarna är ett tredje material för halsbandet och trons tecken, en fågels fjädrar och ett rep på 5 minuter, finare än ben och enklare än vargtänder. Halsbandet eller tecknet som bärs syns i porträttet med materialets bild, och halssmycket slumpas inte längre',
  kor: () => {
    const M = SIM.KLADMATERIAL, r = SIM.receptAv('halsband', 'fjaderband'), fagel = DJUR.fagel;
    const finhet = M.benband.finhet < M.fjaderband.finhet && M.fjaderband.finhet < M.tandband.finhet;
    const s = createState(3, START), p = living(s).find(q => ageOf(q, s.now) >= 18)!;
    const bar = (k?: string) => { s.ting = (s.ting ?? []).filter(t => t.bar !== p.id); if (k) { const t = SIM.addTool(s, k, p); t.bar = p.id; } return skapad(s, p).del.smycke ?? null; };
    const utan = bar(), fj = bar('halsband_fjaderband'), tand = bar('halsband_tandband'), ben = bar('halsband_benband'), tecken = bar('tecken_fjaderband');
    // ingen får ett halssmycke av slumpen: bland hundra porträtt utan halsband är inget smycke ett halsband
    const slump = Array.from({ length: 100 }, (_, i) => { const q = { ...p, id: 1000 + i }; return skapad(s, q).del.smycke; }).filter(id => id && KARNA.DEL[id]?.plats === 'hals').length;
    return [
      [`halsbandet av fjädrar tar ${JSON.stringify(r)} på ${SAKER.halsband_fjaderband?.skaffa?.min ?? SIM.PLAGG.halsband.min} minuter`, r.fjadrar === 1 && r.rep === 1 && Object.keys(r).length === 2 && SIM.PLAGG.halsband.min === 5],
      [`fjädrarna är finare än ben och enklare än vargtänder (${M.benband.finhet}, ${M.fjaderband.finhet}, ${M.tandband.finhet}), och trons tecken kan göras av dem`, finhet && !!SAKER.tecken_fjaderband],
      ...(fagel ? [[`en fågel ger fjädrar till ett halsband (${(fagel.slakt as Record<string, number>).fjadrar})`, ((fagel.slakt as Record<string, number>).fjadrar ?? 0) >= r.fjadrar] as [string, boolean]] : []),
      [`porträttet visar det som bärs: inget ${utan ?? '–'}, fjädrar ${fj}, vargtänder ${tand}, ben ${ben}, trons tecken av fjädrar ${tecken}`, (!utan || KARNA.DEL[utan]?.plats !== 'hals') && fj === 'smycke-9' && tand === 'smycke-3' && ben === 'smycke-2' && tecken === 'smycke-9'],
      [`halssmycket slumpas inte (${slump} av 100)`, slump === 0],
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
    kp.sjuk = { k: 'forkylning', t0: s.now, tecken: s.now, grad: 0.3, mot: 0, r: 1 }; kp.warm = 0.1;
    kp.skador = [{ d: 'huvud', k: 'skarsar', g: 0.5, b: 1, f: 1 }];
    const efter = skapad(s, kp);
    const kroppOk = fore.humor !== 'sover' && !fore.sjuk && !fore.blod && efter.humor === 'sover' && efter.sjuk && efter.kyla && efter.blod && efter.forband.includes('forband-huvud');
    kp.task = undefined; kp.sjuk = undefined; kp.warm = 0.9; kp.skador = [];
    // kläderna och redskapet följer utrustningen (steg 5.2.3.5): rocken av vargskinn, skorna, bältet och yxan i handen
    for (const t of tingOf(s)) if (t.bar === kp.id || t.hos === kp.id) { t.bar = undefined; t.hos = undefined; }
    const naken = skapad(s, kp);
    for (const k of ['rock_vargskinn', 'skor_kaninskinn', 'balte_rep']) SIM.newTing(s, k, 0, kp.id).bar = kp.id;
    SIM.newTing(s, 'yxa', 0, kp.id).hos = kp.id;
    const kladd = skapad(s, kp);
    const kladOk = !naken.klader.rock && !naken.klader.skor && !naken.del.redskap && kladd.klader.rock === 'vargskinn' && kladd.klader.skor && kladd.klader.balte && kladd.del.redskap === 'redskap-yxa';
    // porträttraden (steg 11.1.43): symbolen för det behov som ligger längst under sin gräns står vid namnet
    utanWebblasare(); setByn(s);
    const bp = vuxna[0]; bp.hunger = 0.01; const lagMat = lagstBehov(bp)?.ikon === 's_mat'; bp.hunger = 1;
    bp.warm = -1; const lagKyla = lagstBehov(bp)?.ikon === 'sym_frysa';
    return [
      ['porträttraden visar symbolen för det lägsta behovet: mat för den hungriga, kyla för den som fryser (steg 11.1.43)', lagMat && lagKyla],
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
  text: 'Steg 9.2.60: när testet stoppar en process efter tidsgränsen (korProcess i pool.ts) stoppas hela gruppen av processer den startat, inte bara den; och pulsen stoppar bara en process som hängt sig, aldrig en långsam (testkedjan efter v530)',
  kor: () => {
    const ut = execFileSync(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('../processgrupp.ts', import.meta.url))], { encoding: 'utf8' });
    const r = JSON.parse(ut.trim().split('\n').pop()!) as { pid: number; kvar: boolean; stoppad: boolean; hangStoppad: boolean; langsamKlar: boolean };
    return [
      ['processen som aldrig blev klar stoppades efter tidsgränsen', r.stoppad],
      [`och den den startade (pid ${r.pid}) lever inte kvar`, r.pid > 0 && !r.kvar],
      ['en by som hängt sig (inga slag i spelet) stoppades av pulsen', r.hangStoppad],
      ['men en långsam by som räknade slag hela tiden fick bli klar', r.langsamKlar],
    ];
  },
};

SCENARIER.arbetstid = {
  text: 'Steg 9.2.63: varje handling har ett tidsslag (ett arbete i TIDSLAG eller en stund), och vakten i npm test och npm run balans larmar när ett arbete tar längre tid än sitt slag',
  kor: () => {
    const nu = 0, MIN = 60_000;
    const kniv30 = SIM.forLangtArbete({ act: 'kniv', until: nu + 30 * MIN }, nu), kniv3 = SIM.forLangtArbete({ act: 'kniv', until: nu + 3 * MIN }, nu);
    const vila = SIM.forLangtArbete({ act: 'vila', until: nu + 300 * MIN }, nu);
    // vattnet genom isen (steg 12.1.159): hålet hör inte till arbetet, och vakten drar av den tid hålet tog när arbetet
    // började, också när yxan sedan tagits av någon annan i samma slag
    const s = createState(1, START), p = living(s).find(q => ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    s.is = { vatten: 0, cm: 20 } as typeof s.is; SIM.setStock(s, { sten: 0 });
    const yxa = SIM.addTool(s, 'yxa', p), hal = SIM.halMin(s, p, p.x, p.y);
    const vt = { act: 'vatten', phase: 'do', until: s.now, tool: 'vattensack' } as SIM.Task; SIM.startWork(s, p, vt);
    s.ting = tingOf(s).filter(t => t !== yxa);
    const efter = SIM.halMin(s, p, p.x, p.y), vattenLarm = SIM.forLangtArbete(vt, s.now, halTidVid(s, p, vt)), utanMinne = SIM.forLangtArbete(vt, s.now, efter);
    return [
      [`vatten genom 20 cm is med yxan: hålet ${hal.toFixed(1)} min, arbetet ${((vt.until - s.now) / MIN).toFixed(2)} min, och utan yxan svarar halMin ${efter} efteråt`, hal > 0 && efter < hal && Math.abs((vt.until - s.now) / MIN - hal - SIM.TORST.fyllSek / 60) < 1e-6],
      [`vakten larmar inte när yxan tagits under slaget (${vattenLarm ?? 'inget larm'}), som den gjorde med halMin efteråt (${utanMinne ?? 'inget larm'})`, !vattenLarm && !!utanMinne],
      [`kniven har slaget ${SIM.tidSlagAv('kniv')}, och vakten larmar när den får 30 minuter (${kniv30 ?? 'inget larm'})`, SIM.tidSlagAv('kniv') !== 'stund' && !!kniv30],
      ['men inte när den tar 3 minuter', !kniv3],
      [`att vila är en stund (${SIM.tidSlagAv('vila')}) och får ta hur lång tid som helst`, SIM.tidSlagAv('vila') === 'stund' && !vila],
    ];
  },
};

SCENARIER.bjornrovare = {
  text: 'Steg 12.1.162 och 12.1.258: npm run strid räknar björnens strider mot rövare för sig (Björnen mot rövarna) och inte som anfall mot byn, också när alla rövare dog; striden bär själv vad den gällde',
  kor: () => {
    // doda = alla rövare dör i striden och tas ur s.people före slutet (steg 12.1.258): striden bär själv vad den gällde
    const strid = (rovare: boolean, doda = false) => {
      const s = createState(1, START);
      if (rovare) SIM.rovarnaKommer(s, 4, true);
      const folk = rovare ? (s.rovare ? SIM.rovarna(s, s.rovare) : []) : living(s).filter(p => ageOf(p, s.now) >= SIM.ALDER.vuxen).slice(0, 2);
      SIM.bjornStrid(s, 999, folk, false, 'skada');
      const g = SIM.kartStrider(s)[SIM.kartStrider(s).length - 1];
      if (doda && g) { // alla rövare dör och tas ur s.people; striden går till slut och rapporten säger vad den gällde
        const ids = new Set(folk.map(p => p.id));
        for (const p of folk) p.died = s.now;
        s.people = s.people.filter(p => !ids.has(p.id));
        for (let i = 0; i < 200 && SIM.kartStrider(s).includes(g); i++) step(s, 5);
        const rp = s.stridRapporter?.[s.stridRapporter.length - 1];
        return { n: folk.length, orsak: SIM.kartStrider(s).includes(g) ? 'striden tog inte slut' : rp?.orsak ?? 'ingen rapport' };
      }
      return { n: folk.length, orsak: g ? g.orsak : 'ingen strid' };
    };
    const r = strid(true), d = strid(true, true), b = strid(false);
    return [
      [`björnen mot ${r.n} rövare räknas som ${r.orsak}`, r.n > 0 && r.orsak === SIM.BJORN_MOT_ROVARNA],
      [`björnen mot ${d.n} rövare som alla dog räknas som ${d.orsak}`, d.n > 0 && d.orsak === SIM.BJORN_MOT_ROVARNA],
      [`björnen mot ${b.n} bybor räknas som ${b.orsak}`, b.n > 0 && b.orsak === 'Anfölls av en björn'],
    ];
  },
};

SCENARIER.ritplats = {
  text: 'Allt som ritas följer bilden (steg 10.2.19): ritkoden i ui/ läser aldrig en persons plats i simuleringen (p.x och p.y i slutet av slaget) utan platsen i bilden (posOf, sparPlats, rovarPlats). Vakten letar efter rader som läser p.x eller q.x bredvid living( eller .people, och efter { x: p.x, y: p.y }',
  kor: () => {
    const dir = fileURLToPath(new URL('../../ui/', import.meta.url)), fel: string[] = [];
    for (const f of readdirSync(dir).filter(n => n.endsWith('.ts'))) {
      readFileSync(dir + f, 'utf8').split('\n').forEach((rad, i) => {
        if (/posOf|sparPlats|rovarPlats|\(en hög, ingen person\)|\(platsen i bilden/.test(rad)) return; // (raderna som läser platsen i bilden är märkta)
        const folk = /living\(|\.people\b/.test(rad) && /\b[pq]\.[xy]\b/.test(rad), par = /x: [pq]\.x, y: [pq]\.y/.test(rad);
        if (folk || par) fel.push(`${f}:${i + 1}`);
      });
    }
    return [[`ingen ritkod läser en persons plats i simuleringen (${fel.join(', ') || 'inga'})`, fel.length === 0]];
  },
};
