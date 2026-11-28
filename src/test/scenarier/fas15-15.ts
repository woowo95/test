// Scenarier för fas 15, grupp 15 (steg 15.1.141–15.1.150).
import * as SIM from '../../sim';
import { SCENARIER, kor } from './hjalp';
import { START } from '../kor';
import { foretagBy } from './fas14';

SCENARIER.krubbor = {
  text: 'Steg 15.1.141: krubban står bara i ett fähus. När stallets rum är fullt och inget fähus saknar krubba finns ingen plats: ingen krubba byggs i en verkstad, och bristen står kvar',
  kor: () => {
    const { s, f, r } = foretagBy(['servering']), W = SIM.W;
    for (const q of SIM.living(s)) { q.task = undefined; (q.tek ??= {}).snickarbank = 1; }
    s.stationer = (s.stationer ?? []).filter(q => !SIM.stationDef(q.k)?.fahus); SIM.touch(s); // inga krubbor i byn
    SIM.utoka(s, f, ['stall']);
    const forst = SIM.stationSite(s, 'krubba'), iRummet = !!forst && r.tiles.includes(forst.y * W + forst.x);
    // rummet fylls med diskar tills krubban inte får plats
    for (let i = 0; i < 200; i++) {
      const q = SIM.stationSite(s, 'krubba'); if (!q || !r.tiles.includes(q.y * W + q.x)) break;
      s.stationer!.push({ id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'disk', x: q.x, y: q.y, rot: q.rot, kvar: 0, inne: 1 } as unknown as SIM.Station); SIM.touch(s);
    }
    const utanFahus = SIM.fahusUtanKrubba(s).length, site = SIM.stationSite(s, 'krubba'), brist = SIM.foretagBord.krubbaBrist(s);
    const hus = site && SIM.gridOf(s).rooms.find(x => x.tiles.includes(site.y * W + site.x));
    return [
      [`med plats ställs krubban i stallets rum (${iRummet})`, iRummet],
      [`när rummet är fullt och inget fähus saknar krubba (${utanFahus}) finns ingen plats (${site ? `${site.x},${site.y} i ${hus ? SIM.husById(s, hus.hus!)?.fn : 'ute'}` : 'ingen'})`, !site],
      [`bristen står kvar (${brist})`, brist > 0],
    ];
  },
};

SCENARIER.grannat2 = {
  lang: true,
  text: 'Steg 15.1.142: en väg går åt båda hållen. Varje by finns i sina grannars listor, och huvudbyn i by 1 får en handlare inom 20 dygn (20 år i spelet)',
  kor: () => {
    const s = SIM.createState(1, START), vl = SIM.medVarld(s);
    const byar = (vl.platser ?? []).filter(p => p.k === 'by'), nr = new Map(byar.map(p => [p.nr, p] as const));
    const bada = (l: typeof byar) => l.every(p => (p.grannar ?? []).every(g => { const q = nr.get(g.nr); return !q || !!q.grannar?.some(x => x.nr === p.nr); })); // en by som blivit ruin är ingen by
    const fore = bada(byar), hb = byar.find(p => p.by === vl.huvud)!, hbGr = hb.grannar?.length ?? 0;
    let kom: number | undefined;
    for (let i = 0; i < 20 * 24 && kom === undefined; i++) kor(s, 1, b => { if (kom === undefined && (b.handlare || (b.handlarVantar as number[] | undefined)?.length)) kom = b.now; });
    const efter = (s.varld!.platser ?? []).filter(p => p.k === 'by');
    nr.clear(); for (const p of efter) nr.set(p.nr, p);
    return [
      [`varje by finns i sina grannars listor när världen skapas (${byar.length} byar, huvudbyn har ${hbGr} grannar)`, fore && hbGr > 0],
      [`huvudbyn får en handlare inom 20 dygn (${kom === undefined ? 'ingen' : `efter ${SIM.kortTal((kom - START) / SIM.DAY)} dygn`})`, kom !== undefined],
      [`grannätet är ömsesidigt också efter dygnen (${efter.length} byar)`, bada(efter)],
    ];
  },
};
