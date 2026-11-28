// Scenarier för fas 15, grupp 15 (steg 15.1.141–15.1.150).
import * as SIM from '../../sim';
import { SCENARIER } from './hjalp';
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
