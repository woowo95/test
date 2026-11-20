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
      ...nyaTankar(),
    ];
  },
};

// de nya tankarna (steg 12.1.131): några av händelserna och lägena prövade direkt
function nyaTankar(): [string, boolean][] {
  const s = SIM.cloneState(testBy(20)), har = (p: SIM.Person, t: string) => p.thoughts.some(x => x.text === t && x.until > s.now);
  const folk = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), [a, b, c] = folk;
  // djuret dör: ägaren
  const d = SIM.nyttTamdjur(s, 'far', a.x, a.y, a.id); SIM.tamDor(s, d, 'alder');
  // kläderna: nya, slitna och fina
  const plagg = (p: SIM.Person) => SIM.tingOf(s).filter(t => t.bar === p.id && !!SIM.kladAv(t.k));
  const ge = (p: SIM.Person) => { if (!plagg(p).length) { const k = SIM.KLADER_AV[0]; const t = SIM.addTool(s, SIM.kladNyckel(k.plagg, k.mat), p); t.bar = p.id; } };
  ge(a); ge(b);
  for (const t of plagg(a)) { t.c = 1; t.q = 4; }
  for (const t of plagg(b)) { t.c = 0.1; t.q = 2; }
  for (const p of [a, b]) p.thoughts = p.thoughts.filter(x => !/kläder/.test(x.text));
  SIM.tankarTimme(s);
  // olyckan: c förlorar allt hen äger
  const varde = () => SIM.formogenheter(s).egen.get(c.id) ?? 0, fore = varde();
  SIM.forlustFore(s, 'brand');
  s.forlustFore!.brand!.v[c.id] = Math.max(SIM.TANKELAGE.forlustMin, fore) * 10; // c ägde tio gånger mer när branden började
  SIM.forlustEfter(s, 'brand');
  const saknas = (['mittDjurDog', 'fickUnge', 'hundFoljer', 'hemlangtan', 'komHem', 'sagStort', 'husetBrann', 'forloradeAllt', 'slackteElden', 'friskIgen', 'fickProtes', 'nyaKlader', 'slitnaKlader', 'finaKlader', 'egetHus', 'soverISang', 'ljusInne', 'sitterPaStol', 'godSkord', 'missvaxt', 'orattvisLag', 'hogSkatt', 'frikandes', 'fickTatuering'] as const).filter(k => !(k in SIM.TANKAR));
  return [
    [`de 24 nya tankarna är rader${saknas.length ? ` (saknas ${saknas.join(', ')})` : ''}`, saknas.length === 0],
    ['ägaren får Mitt djur dog', har(a, 'Mitt djur dog')],
    ['nya och fina kläder ger Nya kläder och Fina kläder', har(a, 'Nya kläder') && har(a, 'Fina kläder') && !har(a, 'Slitna kläder')],
    ['slitna kläder ger Slitna kläder', har(b, 'Slitna kläder') && !har(b, 'Nya kläder')],
    [`den som mist allt i en olycka får Förlorade allt (före ${Math.round(fore)})`, har(c, 'Förlorade allt') && !s.forlustFore],
    ['den som inte förlorat något får den inte', !har(a, 'Förlorade allt')],
  ];
}
