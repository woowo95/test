// Scenarier för fas 15, grupp 4 av 15.1.
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, klockan, nyInvanare, styreTimme } from './hjalp';

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
