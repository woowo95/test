// Scenarier för fas 14.
import * as SIM from '../../sim';
import { SCENARIER, testBy } from './hjalp';

SCENARIER.finhet = {
  text: 'Steg 14.1.1: varje rum har en finhet ur möblernas kvalitet, väggarna, golvet, ytan per person, pyntet, ljuset, värmen och smutsen',
  kor: () => {
    const s = SIM.cloneState(testBy(25)), rum = SIM.gridOf(s).rooms.filter(r => r.tiles.length && SIM.sovplatser(s, r) > 0);
    SIM.finhetTimme(s);
    const alla = rum.map(r => SIM.finhetAv(s, r)), r = rum[0];
    const tal = () => SIM.finhetDelar(s, r), del = (id: string) => tal().delar.find(d => d.id === id)!;
    const fore = tal().tal;
    // bättre möbler
    const i = new Set(r.tiles), mob = SIM.stationerOf(s).filter(t => i.has(t.y * SIM.W + t.x) && SIM.stationDef(t.k)?.mobel && !SIM.stationDef(t.k)?.pynt);
    for (const t of mob) t.q = 0;
    const usel = tal().tal; for (const t of mob) t.q = 5; const fin = tal().tal; for (const t of mob) t.q = 2;
    // smuts på golvet
    const ren = tal().tal;
    s.flackar = [...(s.flackar ?? []), ...r.tiles.slice(0, 4).map(j => ({ i: j, k: 'blod', n: 1, t: s.now }))];
    const smuts = del('smuts').v, smutsTal = tal().tal;
    s.flackar = [];
    // väggar av sten
    const g = SIM.gridOf(s), m0 = r.walls.map(w => g.at.get(w)!.m), vagg0 = del('vagg').v;
    for (const w of r.walls) if (g.at.get(w)!.k === 'vagg') g.at.get(w)!.m = 'sten';
    const vagg1 = del('vagg').v; r.walls.forEach((w, n) => { g.at.get(w)!.m = m0[n]; });
    return [
      [`alla rum har en finhet mellan 0 och 1 (${alla.map(x => x?.toFixed(2)).join(', ')})`, alla.length > 0 && alla.every(x => x !== undefined && x >= 0 && x <= 1)],
      [`bättre möbler gör rummet finare (${mob.length} möbler: ${usel.toFixed(2)} → ${fin.toFixed(2)})`, mob.length > 0 && fin > usel],
      [`smutsen drar ner (${smuts.toFixed(2)}: ${ren.toFixed(2)} → ${smutsTal.toFixed(2)})`, smuts > 0 && smutsTal < ren],
      [`stenväggar är finare än timmer (${vagg0.toFixed(2)} → ${vagg1.toFixed(2)})`, vagg1 > vagg0],
      [`finheten räknas i TAKTER och delarna väger mer än noll (${fore.toFixed(2)})`, SIM.TAKTER.some(t => t.namn === 'rummens finhet') && SIM.FINHET_DELAR.every(d => d.vikt() !== 0)],
    ];
  },
};
