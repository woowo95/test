// Stationer i flera delar (steg 9.4.1–9.4.2): en provstation i tre delar som bara finns under scenariot
import { createState, W, inMap, gridOf, type StationDef, type Station } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, medHus } from './hjalp';

SCENARIER.stationsdelar = {
  text: 'Steg 9.4.1–9.4.2: en station kan bestå av delar som står och vrids var för sig. Den byggs i en rad, varje del tar sina rutor, man arbetar vid delen med arbete, hela stationen flyttas med alla delar, och den går att arbeta vid bara när alla delar står i samma rum',
  kor: () => {
    const REG = SIM.STATIONER as Record<string, StationDef>;
    REG.provdelar = { ...REG.flatarbank, namn: 'Provbänk', delar: [{ namn: 'Bänken', w: 2, h: 1, arbete: true }, { namn: 'Stället', w: 1, h: 1 }, { namn: 'Baljan', w: 1, h: 1 }] };
    try {
      const s = createState(1, START);
      medHus(s);
      const fri = (x: number, y: number, w: number, h: number) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!inMap(x + i, y + j) || !SIM.usable(s, x + i, y + j, true) || SIM.stationAt(s, x + i, y + j) || SIM.roomAt(s, x + i, y + j)) return false; return true; };
      const c = SIM.bynsMitt(s);
      let at: { x: number; y: number } | undefined;
      for (let r = 4; r < 30 && !at; r++) for (let k = 0; k < 24 && !at; k++) { const x = Math.round(c.x + Math.cos(k / 24 * 6.283) * r), y = Math.round(c.y + Math.sin(k / 24 * 6.283) * r); if (fri(x, y, 4, 1) && fri(x, y + 3, 8, 3)) at = { x, y }; }
      if (!at) return [['en fri plats för provstationen', false]];
      const t: Station = { id: (s.nextStation = (s.nextStation ?? 0) + 1), k: 'provdelar', x: at.x, y: at.y, kvar: 0, delar: SIM.delarIRad('provdelar', at.x, at.y) };
      (s.stationer ??= []).push(t); s.byggV = (s.byggV ?? 0) + 1;
      const rad = SIM.delarAv(t).map(q => `${q.x - at!.x},${q.y - at!.y} ${q.w}×${q.h}`).join(' | ');
      const iRad = rad === '0,0 2×1 | 2,0 1×1 | 3,0 1×1' && SIM.storlekAv(t).w === 4 && [0, 1, 2, 3].every(i => SIM.stationAt(s, at!.x + i, at!.y) === t);
      const vid = SIM.vidStation(t), vidBank = Math.abs(vid.x - (at.x + 1)) < 1e-9 && Math.abs(vid.y - (at.y + 1.1)) < 1e-9;
      // baljan flyttas för sig, och bänken vrids där den står
      const flytt = SIM.flyttaDel(s, t, 2, at.x + 5, at.y + 4);
      const gammal = SIM.stationAt(s, at.x + 3, at.y) === undefined, ny = SIM.stationAt(s, at.x + 5, at.y + 4) === t, bbox = SIM.storlekAv(t);
      const vrid = SIM.flyttaDel(s, t, 0, at.x, at.y, true), vriden = SIM.delarAv(t)[0].w === 1 && SIM.delarAv(t)[0].h === 2 && SIM.stationAt(s, at.x, at.y + 1) === t;
      const krock = !SIM.flyttaDel(s, t, 1, at.x, at.y); // på bänken: får inte plats
      const helUte = SIM.helStation(s, t) && SIM.stationFor(s, 'tvinna') === t;
      // hela stationen flyttas: alla delar lika långt
      const fore = SIM.delarAv(t).map(q => [q.x - t.x, q.y - t.y]), helFlytt = SIM.flyttaStation(s, t, t.x + 1, t.y + 1), efter = SIM.delarAv(t).map(q => [q.x - t.x, q.y - t.y]);
      const sammaForm = helFlytt && JSON.stringify(fore) === JSON.stringify(efter);
      // en del inne i huset och resten ute: inte hel, och ingen kan arbeta vid den
      const golv = gridOf(s).rooms.flatMap(r => r.tiles).find(i => !SIM.stationAt(s, i % W, Math.floor(i / W)) && !SIM.sittAt(s, i % W, Math.floor(i / W)));
      const inne = golv !== undefined && SIM.flyttaDel(s, t, 1, golv % W, Math.floor(golv / W));
      const delad = inne && !SIM.helStation(s, t) && SIM.stationFor(s, 'tvinna') === undefined;
      return [
        [`stationen byggs med delarna i en rad och varje del tar sina rutor (${rad})`, iRad],
        ['man arbetar framför delen med arbete (bänken)', vidBank],
        [`en del flyttas för sig och tar sina nya rutor (rutan runt delarna ${bbox.w} × ${bbox.h})`, flytt && gammal && ny && bbox.w === 6 && bbox.h === 5],
        ['en del vrids ett kvarts varv där den står', vrid && vriden],
        ['en del får inte ställas på en annan del', krock],
        ['med alla delar ute är stationen hel och går att arbeta vid', helUte],
        ['hela stationen flyttas med alla delar lika långt', sammaForm],
        [`med en del inne i huset och resten ute är den inte hel, och ingen arbetar vid den (${golv === undefined ? 'inget golv' : inne ? 'delen står inne' : 'fick inte plats inne'})`, delad],
      ];
    } finally { delete REG.provdelar; }
  },
};
