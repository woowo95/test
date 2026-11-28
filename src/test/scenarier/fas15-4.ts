// Scenarier för fas 15, grupp 4 av 15.1.
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, byggare, klockan, kor, medHus, tandEld, nyInvanare, rikBy, styreTimme, tandOchFlinta, tomtForrad, treVuxna, vidForradet } from './hjalp';

SCENARIER.domsjalv = {
  text: 'Steg 15.1.38: ledaren som dömer för det hen själv förlorat. Loggen, krönikan och notisen säger "av henne själv" eller "av honom själv" när den drabbade är ledaren, som rättegångens rad redan gör',
  kor: () => {
    const t = SIM.createState(11, START);
    klockan(t, 11);
    for (const [x, a] of [['k', 33], ['m', 29], ['k', 26]] as const) nyInvanare(t, x, a);
    const vuxna = SIM.living(t).filter(p => SIM.ageOf(p, t.now) >= SIM.ALDER.vuxen);
    const l = vuxna.find(p => p.sex === 'k')!, tjuv = vuxna.find(p => p !== l && p.partner !== l.id)!;
    (l.tek ??= {}).ledarskap = 1;
    for (const q of vuxna) if (q !== l) SIM.getRel(t, l, q).op = 40;
    styreTimme(t);
    for (const q of vuxna) { q.x = l.x + 1; q.y = l.y; }
    SIM.handelse(t, tjuv, 'stold', l, 'mat'); // tjuven stjäl av ledaren, som ser det
    klockan(t, SIM.STR.timme);
    styreTimme(t);
    const r = t.styre?.ratt?.[0], sjalv = `av ${(l.sex === 'k' ? 'henne' : 'honom')} själv`;
    const logg = t.log.find(x => x.text.includes(`${tjuv.name} för att`))?.text ?? '';
    const kron = (t.hist?.kronika ?? []).map(k => k[1]).find(x => x.includes(tjuv.name) && x.includes('stal')) ?? '';
    const not = (t.notiser?.lista ?? []).flatMap(n => n.rader).find(x => x.includes(`${tjuv.name} för att`)) ?? '';
    const ratt = r ? SIM.rattegang(t, r).brott : '';
    return [
      [`ledaren dömde tjuven (${r ? SIM.STRAFF_NAMN[r.steg] : 'ingen dom'})`, !!r && r.om === tjuv.id && r.b.mot === l.id],
      [`loggen säger "${sjalv}": ${logg}`, logg.includes(sjalv) && !logg.includes(`av ${l.name}`)],
      [`krönikan säger "${sjalv}" (eller har en egen rad för straffet): ${kron || '(ingen rad)'}`, !!r && (SIM.straffEgenRad(r.steg) || (kron.includes(sjalv) && !kron.includes(`av ${l.name}`)))],
      [`notisen säger "${sjalv}" (eller har en egen rad för straffet): ${not || '(ingen notis)'}`, !!r && (SIM.straffEgenRad(r.steg) || (not.includes(sjalv) && !not.includes(`av ${l.name}`)))],
      [`rättegångens brott i fliken säger "${sjalv}": ${ratt}`, ratt.includes(sjalv)],
    ];
  },
};

SCENARIER.stridskal = {
  text: 'Steg 15.1.39: skälet under en strid är en hel mening byggd av stridens orsak och motståndaren, till exempel "Slåss med Ufast efter ett gräl", i stället för loggens bit "efter ett gräl"',
  kor: () => {
    const s = SIM.createState(11, START); klockan(s, 11);
    const v = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), [a, b, c, d] = v;
    for (const q of v) { q.x = v[0].x + 1; q.y = v[0].y; }
    SIM.kartStridBorja(s, 'slagsmal', [[a], [b]], 'efter ett gräl');
    const gral = [a.task?.why ?? '', b.task?.why ?? ''];
    SIM.kartStridBorja(s, 'skada', [[c], [d]], 'en holmgång');
    const holm = c.task?.why ?? '';
    const t = SIM.createState(12, START); klockan(t, 11);
    const w = SIM.living(t).filter(p => SIM.ageOf(p, t.now) >= SIM.ALDER.vuxen);
    SIM.kartStridBorja(t, 'skada', [[w[0]], w.slice(1)], 'ett uppror');
    const manga = w[0].task?.why ?? '';
    return [
      [`den som började slåss: "${gral[0]}"`, gral[0] === `Slåss med ${b.name} efter ett gräl`],
      [`den andra: "${gral[1]}"`, gral[1] === `Slåss med ${a.name} efter ett gräl`],
      [`holmgången: "${holm}"`, holm === `Slåss med ${d.name} i en holmgång`],
      [`mot flera (${w.length - 1}): "${manga}"`, manga.startsWith(`Slåss med ${w[1].name}`) && manga.endsWith('i ett uppror') && !manga.includes('undefined')],
      ['ingen har bara loggens bit som skäl', ![...gral, holm, manga].some(x => /^\p{Ll}/u.test(x))],
    ];
  },
};

SCENARIER.barnbyte = {
  text: 'Steg 15.1.40: småbarn byter inte som vuxna. Bytena och gåvorna i samtalen gäller den som är gammal nog att ansvara för sig (ALDER.ansvar): en treåring köper inget och betalar inte med en gåva hen nyss fått, men kan få en gåva av familjen',
  kor: () => {
    const ny = () => {
      const s = SIM.createState(6, START);
      rikBy(s); tomtForrad(s); s.ting = [];
      const [a, b] = treVuxna(s, 1, q => { q.warm = 1; q.pot.empati = 10; q.habit = {}; });
      for (const [q, r] of [[a, b], [b, a]]) SIM.getRel(s, q, r).op = 0;
      s.people = [a, b]; vidForradet(s, a, b);
      return { s, a, b };
    };
    const korgar = (s: SIM.State, p: SIM.Person) => SIM.ownedBy(s, p).filter(t => t.k === 'korg').length;
    // a samlar och saknar korg, b har två och a har bär att betala med: en vuxen köper en korg
    let { s, a, b } = ny();
    a.habit = { samla: 10 }; SIM.addTool(s, 'korg', b); SIM.addTool(s, 'korg', b); SIM.gain(s, a, 'bar', 20);
    for (let i = 0; i < 40 && !korgar(s, a); i++) SIM.askForGift(s, a, b);
    const vuxenKopte = korgar(s, a) === 1 && SIM.ownsAmount(s, b, 'bar') > 0;
    // samma sak med a som treåring: inget köps, bären är kvar
    ({ s, a, b } = ny());
    a.born = s.now - 3 * SIM.DAY; a.habit = { samla: 10 }; SIM.addTool(s, 'korg', b); SIM.addTool(s, 'korg', b); SIM.gain(s, a, 'bar', 20);
    for (let i = 0; i < 40; i++) SIM.askForGift(s, a, b);
    const barnKopte = SIM.ownsAmount(s, b, 'bar') > 0;
    // treåringen har just fått en korg, och b saknar en och har bär: treåringen betalar inte med korgen och ger inte bort den
    ({ s, a, b } = ny());
    a.born = s.now - 3 * SIM.DAY; SIM.addTool(s, 'korg', a); b.habit = { samla: 10 }; SIM.gain(s, b, 'bar', 20); SIM.getRel(s, a, b).op = 80; SIM.getRel(s, b, a).op = 80;
    for (let i = 0; i < 40; i++) SIM.askForGift(s, b, a);
    const barnGav = korgar(s, a) === 0;
    return [
      [`en vuxen som saknar en korg köper en (${vuxenKopte ? 'köpte' : 'köpte inte'})`, vuxenKopte],
      [`en treåring köper ingen korg (bären ${barnKopte ? 'gick till säljaren' : 'är kvar'})`, !barnKopte],
      [`en treåring betalar inte och ger inte bort korgen hen nyss fått (${barnGav ? 'gav bort den' : 'har den kvar'})`, !barnGav],
    ];
  },
};

SCENARIER.egethus = {
  text: 'Steg 15.1.41: "bygga ut sitt hus". Loggen skriver "sitt hus" (eller "sin hydda") när den som planerar äger huset, i stället för ägarens namn en gång till, och husets namn när någon annan planerar',
  kor: () => {
    const rad = (agare: boolean, namn?: (p: SIM.Person) => string) => {
      const b = SIM.createState(5, START); klockan(b); medHus(b);
      const h = SIM.housesOf(b).find(q => q.klar)!, [p, q] = SIM.living(b).filter(x => SIM.ageOf(x, b.now) >= SIM.ALDER.vuxen);
      h.fn = 'familjehus'; h.ag = p.id; h.namn = namn ? namn(p) : SIM.husNamn(p.name);
      const f = SIM.BYGGATGARDER.byggaUt.foresla(b, { fn: SIM.fnId(h) as SIM.Fn, a: { v: 1, plats: 0, hus: h.id }, sc: 0 }, () => true)[0];
      const by = agare ? p : q;
      if (f) SIM.byggUt(b, f, by, false);
      return { text: b.log.find(x => x.text.startsWith(`${by.name} planerar att bygga ut`))?.text ?? '(ingen utbyggnad)', p, h };
    };
    const egen = rad(true), annan = rad(false), hydda = rad(true, p => `${p.name}s hydda`);
    return [
      [`ägaren bygger ut sitt hus: ${egen.text}`, egen.text.includes('bygga ut sitt hus') && egen.text.split(egen.p.name).length === 2],
      [`en annan bygger ut ägarens hus: ${annan.text}`, annan.text.includes(`bygga ut ${annan.h.namn}`)],
      [`ägaren bygger ut sin hydda: ${hydda.text}`, hydda.text.includes('bygga ut sin hydda')],
    ];
  },
};

SCENARIER.vaktvarm = {
  text: 'Steg 15.1.42: vakten som fryser värmer sig. Den som fryser på sitt vaktpass gör det värmen erbjuder i registret VARMA (tänder elden, lägger på ved eller går in en stund) i stället för att stå vid en slocknad eld, innan värmen blir farlig, och går sedan vakt igen',
  kor: () => {
    const s = SIM.createState(5, START); s.kal = SIM.nyKalender(s.now, SIM.HOST); klockan(s, 23); // en kall höstnatt
    Object.assign(s.fire, { lit: false, fuel: 0, emberUntil: undefined, ring: true }); tandOchFlinta(s); SIM.setAmount(s, 'ved', 40);
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!, e = SIM.eldPlats(s);
    Object.assign(p, { x: e.x + 1.5, y: e.y + 0.5, hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, health: 1, warm: SIM.KROPP.kallt - 0.03 });
    p.task = { act: 'vakt', phase: 'do', tx: p.x, ty: p.y, until: s.now + 6 * SIM.HOUR, carry: 0, dark: true, why: 'Håller vakt i natt' };
    p.guardDay = s.lastGuardDay = SIM.yearNo(s, s.now - SIM.VAL.vaktByte * SIM.HOUR); // nattens vakt
    const temp = SIM.temperature(s), gjorde: string[] = [];
    let minVarm = p.warm, varmde = false;
    kor(s, 3, () => {
      const k = p.task?.act ?? ''; if (gjorde.at(-1) !== k) gjorde.push(k);
      if (['tanda', 'elda', 'varma'].includes(k) || (k === 'vila' && SIM.roomAt(s, p.x, p.y))) varmde = true;
      minVarm = Math.min(minVarm, p.warm);
    });
    return [
      [`det är kallt (${Math.round(temp)} °C) och elden är släckt när vakten börjar frysa`, temp < 5],
      [`vakten värmer sig som värmen erbjuder (${gjorde.join(' → ')})`, varmde],
      [`värmen blir aldrig farlig (lägst ${minVarm.toFixed(2)}, farligt under ${SIM.KROPP.farligt})`, minVarm >= SIM.KROPP.farligt],
      [`vakten går vakt igen när hen är varm (${gjorde.join(' → ')})`, gjorde.lastIndexOf('vakt') > 0],
      [`vakten står inte vid en slocknad eld och fryser (${s.fire.lit ? 'elden brinner' : 'elden är släckt'}, värmen ${p.warm.toFixed(2)})`, s.fire.lit || p.warm >= SIM.KROPP.kallt || !!SIM.roomAt(s, p.x, p.y)],
    ];
  },
};

SCENARIER.byggblir = {
  text: 'Steg 15.1.43: bygget som påbörjas blir byggt. Stationen påbörjas på sin plats när hämtningen börjar, så att platsen ligger fast, och det som lagts vid bygget hör till det och bärs inte tillbaka till förrådet, också när den som bygger avbryts. En slöjdbänk som påbörjas blir byggd utan att materialet bärs hem igen',
  kor: () => {
    const s = SIM.createState(1, START); klockan(s, 8); medHus(s); tandEld(s); byggare(s, 16);
    const v = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen);
    for (const q of v) (q.tek ??= {}).flatarbank = 1;
    const p = v[0], sp0 = SIM.stationSpot(s, 'flatarbank', p)!;
    SIM.setAmount(s, 'virke', 6); SIM.setAmount(s, 'grenar', 8); // virket bärs ett i taget: hen går flera vändor
    Object.assign(p, { hunger: 1, rest: 1, social: 1, toa: 1, torst: 1, warm: 1 });
    p.task = { act: 'station', tool: 'flatarbank', phase: 'go', tx: sp0.x, ty: sp0.y, until: s.now + 2 * SIM.HOUR, carry: 0, dark: false, why: 'Byn saknar slöjdbänk' } as SIM.Task;
    const bank = () => SIM.stationerOf(s).find(q => q.k === 'flatarbank');
    let plats = '', flyttad = false, avbruten = false;
    const bort = new Set<SIM.Task>(); // de som går för att bära något från bygget in i förrådet medan bygget väntar på det
    const vid = (b: SIM.Station, x: number, y: number) => Math.hypot(x - SIM.vidStation(b).x, y - SIM.vidStation(b).y) <= SIM.LAGER.rackvidd + 0.5;
    const varje = () => {
      const b = bank();
      if (!b) return;
      const pl = `${b.x},${b.y}`; if (plats && pl !== plats) flyttad = true; plats = pl;
      if (!SIM.isKlar(b)) for (const q of SIM.living(s)) if (q.task?.act === 'bara' && q.task.phase === 'go' && vid(b, q.task.tx, q.task.ty)) bort.add(q.task);
      // när det första virket ligger vid bygget avbryts den som bygger en stund
      if (!avbruten && !SIM.isKlar(b) && (s.stackar ?? []).some(g => g.k === 'virke' && vid(b, g.x + 0.5, g.y + 0.5)) && p.task?.act === 'station' && p.task.phase === 'go') {
        avbruten = true; SIM.avbryt(s, p);
        p.task = { act: 'vila', phase: 'do', tx: p.x, ty: p.y, until: s.now + 2 * SIM.HOUR, carry: 0, why: 'Vilar' } as SIM.Task;
      }
    };
    for (let i = 0; i < 360 && !avbruten; i++) { SIM.step(s, 5); varje(); } // vändorna i korta steg, så att avbrottet kommer mellan två av dem
    kor(s, 10, varje);
    const b = bank();
    return [
      [`slöjdbänken blev byggd (${b ? SIM.isKlar(b) ? 'klar' : 'påbörjad' : 'ingen'})`, !!b && SIM.isKlar(b)],
      [`platsen låg fast (${plats})`, !flyttad && !!b],
      [`den som byggde avbröts när virket låg vid bygget (${avbruten ? 'ja' : 'nej'})`, avbruten],
      [`inget bars från bygget till förrådet medan det väntade på materialet (${bort.size} gånger)`, bort.size === 0],
    ];
  },
};
