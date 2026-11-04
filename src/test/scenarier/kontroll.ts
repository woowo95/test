// Scenarier. Kontroller av hela spelet: gränssnittet läser utan att ändra, ikoner, vakter och det som aldrig händer.
import { Person, createState, step, living, serializeParts, serialize, isLight, ageOf, TEKNIK, knows, housesOf, FYND, FYND_IDS, GRUPPER, DJUR, BEAT, tingOf, FN, fnId, SEC, MATERIAL, ACTS, isSick, SAKER, slagIkon } from '../../sim';
import * as SIM from '../../sim';
import { hasIcon, PAL } from '../../ikoner';
import { FARGER, MORKARE, PALETT, iPaletten, kornPa, rasterSteg } from '../../palett';
import { START, STEG_TIM, korBy } from '../kor';
import { seedAv } from '../pool';
import { KARNA } from '../../portrattkarna';
import { ANSIKTSORD, drag, glomArv, skapad, skonNiva } from '../../ui/utseende';
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
      ['slag av arbete', saknas(Object.values(ACTS).map(a => a.slag && slagIkon(a.slag)).filter(k => k !== 'zzz'))], // vila ritas som z
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
    const raster = [0, 0.5, 1, 1.5, 2, 2.5, 3].every(m => [0, 1, 2, 3].every(x => iPaletten(rasterSteg(FARGER[13], m, x, x * 3))));
    return [
      [utanfor.length ? `${utanfor.length} färger utanför paletten: ${utanfor.slice(0, 12).join(', ')}` : `alla ${Object.keys(PAL).length} bilder har bara färger ur paletten`, !utanfor.length],
      ['paletten har 32 färger i åtta ramper', FARGER.length === 32 && PALETT.length === 8],
      ['skymningen och natten har bara färger ur paletten, också i rastret', morkt && raster],
      ['natten är mörkare än dagen', MORKARE[2].every((h, i) => h !== FARGER[i] || i < 2)],
      [`mitt i natten (steg 5.1.7.2) är nästan allt kolsvart, så att bara elden lyser (${svart} av 32 färger blir den mörkaste)`, MORKARE.length === 4 && svart >= 28],
      [`kornet (steg 5.1.7.1): en slät yta på 64 × 64 punkter har nästan inga släta fält på 5 × 5 punkter kvar (${slata} av ${platser}, högst 5 %), och kornet är ett steg i samma ramp (${fel} fel)`, slata <= platser * 0.05 && fel === 0],
    ];
  },
};

SCENARIER.vakt = {
  text: 'Nattvakten: varje natt håller en vuxen mellan 16 och 60 år vakt, den modigaste med lite slump, och den som utses lägger ner det hen bär',
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
    for (const p of vuxna) { p.pot.mod = 1; Object.assign(p, { hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, warm: 0.9, health: 1, sickUntil: undefined, skador: [] }); }
    const [g, p] = vuxna; g!.pot.mod = 20;
    barGrenar(q, g!); p!.task = undefined;
    const grenar0 = grenarUte(q), akt = (x: Person) => x.task?.act; // (en funktion, så att typkontrollen inte tror att uppgiften är tom)
    SIM.chooseTask(q, p!);
    const utsedd = g!.guardDay === q.lastGuardDay && q.lastGuardDay !== -1, bordan = g!.task;
    const nere = Math.abs(grenarUte(q) - grenar0 - 2) < 1e-6; // de två grenarna hen bar ligger kvar
    g!.task = undefined; SIM.chooseTask(q, g!);
    return [
      [`${natter.size} nätter under tre dygn (tre år i spelet) hade en vakt, och aldrig mer än en (${[...natter.values()].map(n => n.size).join(', ')}${sjuka.size ? `; ${[...sjuka.keys()].filter(d => !natter.has(d)).length} natt med en sjuk vakt` : ''})`, natter.size + [...sjuka.keys()].filter(d => !natter.has(d)).length >= 3 && [...natter.values()].every(n => n.size === 1)],
      [`vakterna var mellan ${Math.min(...aldrar).toFixed(0)} och ${Math.max(...aldrar).toFixed(0)} år`, aldrar.length > 0 && aldrar.every(a => a >= SIM.ALDER.vaktFran && a < SIM.ALDER.vaktTill)],
      [`i natt (${isLight(q.now) ? 'ljust' : 'mörkt'}) utsågs den modigaste, ${g!.name}, när ${p!.name} valde (${akt(p!)}), och hen slutade med det hen gjorde och lade ner grenarna`, !isLight(q.now) && utsedd && bordan === undefined && nere && akt(p!) !== 'vakt'],
      [`${g!.name} väljer sedan att hålla vakt (${akt(g!)})`, akt(g!) === 'vakt'],
    ];
  },
};

// Det i registren som bara händer i vissa byar: namnet och varför. Allt annat ska hända i minst en av byarna
const SALLSYNT: Record<string, string> = {
  kol: 'kol blir det bara när elden brunnit ut helt',
  flyttaeld: 'elden flyttas bara när ett hus behöver platsen eller byn har minst tre hus och vuxit ifrån elden (steg 2.10.4); scenariot eldflytt prövar det',
  tillbehor: 'skinnfällen i bädden görs bara när byn har skinn över och kommit på skinnfällen, i 1 av 4 byar på 35 dygn sedan v324; scenariot skinnfall prövar det',
  hantverk: 'handarbete utan sak väljs inte sedan v55; rep tvinnas som en egen handling och resten är projekt',
  metspo: 'sen teknik efter fiskespjutet och repet, hinner inte alltid komma på 35 dygn',
  korg: 'sen teknik efter slöjdbänken, hinner inte alltid komma på 35 dygn',
  buren: 'bara den som inte kan gå (ett svårt skadat ben eller en fot) långt från lägret bärs hem; scenariot vard prövar det',
  fatt: 'bara den som inte kan gå får vatten av de andra; scenariot vard prövar det',
  vatten: 'bara den som inte kan gå får vatten i säcken; scenariot vattensack prövar det',
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
};
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
        for (const p of living(s)) if (p.task) { by.handlingar!.add(p.task.act); for (const k in p.task.items ?? {}) by.saker!.add(k); }
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

SCENARIER.portratt = {
  text: 'Porträtten (steg 5.2.3.1, 5.2.3.3): varje person får sina delar ur registret PORTRATT, ett barn ärver dem från mamman och pappan, och samma person blir likadan varje gång, också i en sparad by (allt räknas ur numret och föräldrarna); skönheten väljer de fula delarna och lagren, och beskrivningens vackraste eller fulaste del tas ur ansiktet; porträttet och kartfiguren har bara färger ur paletten',
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
    return [
      ['samma person blir likadan igen, när allt räknas om', forst.every((v, i) => v === igen[i])],
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
