// Scenarier för fas 13.
import * as SIM from '../../sim';
import { SCENARIER } from './hjalp';
import { START } from '../kor';

// regeln för stationerna (steg 13.1.1): varje recept vid en station med kvalitet är "bara här" eller "fortare och bättre här"
SCENARIER.stationsregel = {
  text: 'Varje recept vid en station som ger kvalitet görs bara där eller fortare och bättre där, och stationerna som bara gör råvaror ger ingen kvalitet (steg 13.1.1)',
  kor: () => {
    const D = SIM.STATIONER as Record<string, SIM.StationDef>;
    const fel: string[] = [];
    for (const k of SIM.STATION_LIST) { const d = D[k]; if (!d.kv) continue; for (const a of d.gor) if (!d.bara?.includes(a) && !((d.fart?.[a] ?? 1) > 1)) fel.push(`${k}:${a}`); }
    const slojd = D.flatarbank;
    const bara = ['rustning', 'hjalm', 'prastdrakt', 'mantel'].every(a => slojd.bara!.includes(a as SIM.Act));
    const fort = ['slunga', 'horn', 'tecken', 'mask'].every(a => !slojd.bara!.includes(a as SIM.Act) && (slojd.fart?.[a as SIM.Act] ?? 1) > 1);
    const ravaror = ['vavstol', 'garvning', 'stenhuggarplats'].every(k => !D[k].kv);
    const s = SIM.createState(1, START);
    const utan = !SIM.kanGoras(s, 'rustning') && SIM.kanGoras(s, 'slunga');
    return [
      [`varje sak vid en station med kvalitet är bara här eller fortare och bättre här${fel.length ? ` (fel: ${fel.join(', ')})` : ''}`, !fel.length],
      ['läderrustningen, hjälmen, prästdräkten och manteln görs bara vid slöjdbänken', bara],
      ['slungan, hornet, tecknet och masken går för hand men fortare vid slöjdbänken', fort],
      ['vävstolen, garvningsställningen och stenhuggarplatsen ger ingen kvalitet', ravaror],
      ['utan slöjdbänk går rustningen inte att göra, men slungan går', utan],
    ];
  },
};

// växte upp vid smedjan (steg 13.1.7)
SCENARIER.smedbarn = {
  text: 'Steg 13.1.7: ett barn som ofta är nära när det smids får upplevelsen Växte upp vid smedjan, som ger lite mer flit, och raden gör en färdighet lättare att lära (lar i UPPLEVELSER): hantverket, där smidet hör hemma',
  kor: () => {
    const s = SIM.createState(5, START);
    const barn = SIM.living(s).find(p => SIM.ageOf(p, s.now) >= SIM.UPPV.fran && SIM.ageOf(p, s.now) < SIM.ALDER.vuxen)
      ?? (() => { const p = SIM.living(s)[0]; p.born = s.now - (SIM.UPPV.fran + 2) * SIM.DAY; return p; })();
    const smed = SIM.living(s).find(q => q !== barn && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    for (const q of SIM.living(s)) if (q !== barn && q !== smed) { q.x = barn.x + 20; q.task = undefined; }
    const smid = () => { smed.x = barn.x + 2; smed.y = barn.y; smed.task = { act: 'smida', phase: 'do', tx: smed.x, ty: smed.y, until: s.now + SIM.HOUR, carry: 0, why: 'prov' }; };
    // långt borta blir det inget
    smed.x = barn.x + 30; smed.y = barn.y; smed.task = { act: 'smida', phase: 'do', tx: smed.x, ty: smed.y, until: s.now + SIM.HOUR, carry: 0, why: 'prov' };
    for (let i = 0; i < 500; i++) SIM.stepUppvaxt(s);
    const langt = !barn.upp?.some(u => u.k === 'smedjan');
    let timmar = 0;
    for (; timmar < 5000 && !barn.upp?.some(u => u.k === 'smedjan'); timmar++) { smid(); SIM.stepUppvaxt(s); }
    const u = barn.upp?.find(x => x.k === 'smedjan');
    barn.skill.hantverk = barn.skill.samla = 0; SIM.ovning(barn, 'hantverk', 0.01); SIM.ovning(barn, 'samla', 0.01);
    const hv = barn.skill.hantverk, sa = barn.skill.samla;
    return [
      ['barnet får inget när ingen smider nära', langt],
      [`barnet nära den som smider fick upplevelsen efter ${timmar} timmar (${u ? SIM.upplevelseText(u) : 'ingen'})`, !!u],
      [`den ger flit (${JSON.stringify(u?.e ?? {})})`, (u?.e.flit ?? 0) > 0],
      [`hantverket lärs ${(hv / sa).toFixed(2)} gånger så fort som samlandet`, Math.abs(hv / sa - SIM.UPPV.lar) < 1e-6],
    ];
  },
};
