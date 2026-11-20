// Scenarier för humörets tankar, drömmarna, upplevelserna, rykten, berättelserna och samtalsämnena från de nya systemen
// (steg 12.1.131–12.1.136).
import { readdirSync, readFileSync } from 'node:fs';
import * as SIM from '../../sim';
import { SCENARIER, testBy } from './hjalp';

// radens text som ett mönster: varje argument blir "något"
const PLATS = '\u0001';
const fyll = new Proxy({}, { get: () => PLATS });
export const tankeMonster = (k: SIM.TankeId) => {
  const d = SIM.TANKAR[k] as SIM.TankeDef<any>, t = typeof d.text === 'string' ? d.text : d.text(fyll);
  return new RegExp('^' + t.split(PLATS).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.+') + '$');
};
const ALLA = () => (Object.keys(SIM.TANKAR) as SIM.TankeId[]).map(tankeMonster);

SCENARIER.tankar = {
  text: 'Humörets register (steg 12.1.131, tankar.ts): varje tanke är en rad i TANKAR med text, styrka, tid och händelse; ett system ger tanken genom att nämna raden, och alla tankar i testbyarna finns som rader',
  kor: () => {
    // ingen tanke ges förbi registret
    const simMapp = new URL('../../sim/', import.meta.url);
    const forbi = readdirSync(simMapp).filter(f => f.endsWith('.ts') && f !== 'tankar.ts')
      .flatMap(f => readFileSync(new URL(f, simMapp), 'utf8').split('\n').filter(l => /\bthink\(/.test(l) && !/export function think/.test(l)).map(() => f));
    // varje tanke i en testby har sin rad
    const mon = ALLA(), s = testBy(20);
    const texter = new Set(s.people.flatMap(p => p.thoughts.map(t => t.text)));
    const utan = [...texter].filter(t => !mon.some(m => m.test(t)));
    // raderna: texten, styrkan och tiden ur raden, f och tid vid anropet
    const p = s.people.find(q => !q.died)!, now = s.now;
    SIM.tanke(p, 'fryser', now); const fr = p.thoughts.find(t => t.text === 'Fryser')!;
    SIM.tanke(p, 'sovBadd', now, { f: 0.5 }); const sb = p.thoughts.find(t => t.text === 'Sov gott i halmbädden')!;
    SIM.tanke(p, 'gifte', now, { namn: 'Ask', tid: SIM.HOUR }); const gi = p.thoughts.find(t => t.text === 'Gifte sig med Ask')!;
    let kastar = false; try { SIM.tanke(p, 'harOnt', now); } catch { kastar = true; }
    const utanNar = Object.entries(SIM.TANKAR).filter(([, d]) => !(d as SIM.TankeDef).nar).map(([k]) => k);
    return [
      [`ingen tanke ges förbi registret${forbi.length ? ` (${[...new Set(forbi)].join(', ')})` : ''}`, forbi.length === 0],
      [`alla ${texter.size} olika tankar i en testby finns i TANKAR${utan.length ? ` (saknas: ${utan.slice(0, 5).join('; ')})` : ''}`, texter.size > 3 && utan.length === 0],
      ['tanken får radens styrka och tid', fr.v === -0.12 && fr.until === now + SIM.HOUR],
      ['f gör raden svagare', sb.v === 0.09 * 0.5 && sb.until === now + 8 * SIM.HOUR],
      ['namnet fylls i och tiden kan ges vid anropet', gi.v === 0.15 && gi.until === now + SIM.HOUR],
      ['en rad utan styrka kräver den vid anropet', kastar],
      [`varje rad säger vad som ger den${utanNar.length ? ` (${utanNar.join(', ')})` : ''}`, utanNar.length === 0],
    ];
  },
};
