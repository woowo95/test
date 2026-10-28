// Scenarier. Kontroller av hela spelet: gränssnittet läser utan att ändra, ikoner, vakter och det som aldrig händer.
import { Person, createState, step, living, serializeParts, serialize, isLight, ageOf, TEKNIK, knows, housesOf, FYND, FYND_IDS, GRUPPER, DJUR, BEAT, tingOf, FN, fnId, SEC, MATERIAL, ACTS, isSick, SAKER, slagIkon } from '../../sim';
import * as SIM from '../../sim';
import { hasIcon } from '../../ikoner';
import { START, STEG_TIM, korBy } from '../kor';
import { seedAv } from '../pool';
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
    for (const p of vuxna) { p.pot.mod = 1; Object.assign(p, { hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, warm: 0.9, health: 1, sickUntil: undefined }); }
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
  korn: 'grödor blir det bara på ett sått fält (steg 2.10.3); scenariot falt prövar det',
  forrad: 'förrådshuset byggs när maten ruttnar eller förrådet är fullt, i ungefär var femte by på 30 dygn sedan kvaliteten (steg 2.2.2); scenariot forradshus prövar det',
  samling: 'blir det bara av en sovsal som ingen längre sover i (steg 1.6.4); scenariot funktion prövar det',
  krossa: 'utbrotten är sällsynta (Björn efter v138: de blir vanligare med motgångar och attacker); att slå sönder något och barnens trots prövas i scenarierna utbrott och barnutbrott',
  elak: 'utbrotten är sällsynta; att vara elak prövas i scenariot utbrott',
  fly: 'utbrotten är sällsynta; att springa iväg prövas i scenarierna utbrott och barnutbrott',
  badd: 'de allvarliga utbrotten kommer bara när humöret är mycket lågt; scenariot vald prövar det',
  slut: 'de allvarliga utbrotten kommer bara när humöret är mycket lågt; scenariot vald prövar det',
  sla: 'de allvarliga utbrotten kommer bara när humöret är mycket lågt; scenariot vald prövar det',
  torrfisk: 'det som blir över när byn har mat för ett dygn hängs upp; sedan byarna blev större (steg 2.12.6) äts fisken oftast färsk, och oftare blir köttet från ett slaktat djur över; scenariot tork prövar det',
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
