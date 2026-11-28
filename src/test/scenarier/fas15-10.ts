// Scenarier för fas 15, grupp 10 av system 15.1 (hälsan: infektionen, motståndet, vården och döden).
import * as SIM from '../../sim';
import { SCENARIER } from './hjalp';
import { START } from '../kor';
import { execSync } from 'child_process';

SCENARIER.vardlista = {
  text: 'Steg 15.1.109: npm run vard går att köra och skriver ut vårdregistret',
  kor: () => {
    let ut = '';
    try { ut = execSync('npx tsx src/test/vard.ts', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { ut = String((e as { stderr?: string }).stderr ?? e); }
    return [
      [`kommandot kraschar inte (${ut.split('\n')[0]?.slice(0, 60)})`, !/Error|before initialization/.test(ut)],
      [`alla behandlingar skrivs (${SIM.VARD_LIST.length})`, SIM.VARD_LIST.every(k => ut.includes(SIM.VARD[k].namn))],
    ];
  },
};

// ett sår på en vuxen, följt i två dygn (två år i spelet) med halsaSteg: hur stor del som blir infekterade. vila = hen sover hela tiden
const vuxen = (s: SIM.State) => SIM.living(s).find(p => SIM.ageOf(p, s.now) >= 20 && SIM.ageOf(p, s.now) < 40)!;
function infProv(s: SIM.State, w: Partial<SIM.Skada> & { k: SIM.SkadaTyp; g: number }, n: number, vila = false) {
  const mall = vuxen(s); let inf = 0;
  SIM.HALSA_PROV.grov = true;
  for (let i = 0; i < n; i++) {
    const t0 = s.now;
    const p: SIM.Person = { ...mall, id: 20000 + i, rngs: undefined, skador: [{ d: 'armV', b: 1, g0: w.g, ...w }], blod: 1, hunger: 1, warm: 1, sjuk: undefined,
      task: vila ? { act: 'sova', phase: 'do', tx: mall.x, ty: mall.y } as SIM.Task : undefined };
    for (let m = 0; m < 48 * 6 && p.skador?.length; m++) { s.now += 600e3; SIM.halsaSteg(s, p, 600); if (p.skador?.some(x => x.inf !== undefined)) { inf++; break; } }
    s.now = t0;
  }
  SIM.HALSA_PROV.grov = false;
  return inf / n;
}
const pct = (x: number) => `${Math.round(x * 100)} %`;

SCENARIER.infrisk = {
  text: 'Steg 15.1.105: infektionsrisken följer såret och vilan. Ett ovårdat bett infekteras i ungefär hälften av fallen och ett skärsår med remsa nästan aldrig; ett sår som levrat sig eller sytts infekteras inte; den som vilar har halva risken; rövarnas och djurens vapen och käftar är blodiga och ger dubbel risk, och vargbettet har ingen egen tärning',
  kor: () => {
    const s = SIM.createState(3, START);
    const bett = infProv(s, { k: 'bett', g: 0.5 }, 300), remsa = infProv(s, { k: 'skarsar', g: 0.3, f: 2, fT: s.now }, 300);
    const levrat = infProv(s, { k: 'bett', g: 0.5, b: 0 }, 100), sytt = infProv(s, { k: 'sticksar', g: 0.7, sydd: 1, b: 0 }, 100);
    const sover = infProv(s, { k: 'bett', g: 0.5 }, 300, true), blodigt = infProv(s, { k: 'bett', g: 0.5, smuts: 1 }, 300);
    const litet = infProv(s, { k: 'bett', g: 0.2 }, 300);
    const slag = ['varg', 'bjorn', 'vildsvin', 'rovare'];
    return [
      [`ett ovårdat bett av grad 0,5 infekteras i 40–60 % av fallen (${pct(bett)})`, bett >= 0.4 && bett <= 0.6],
      [`ett skärsår med remsa nästan aldrig (${pct(remsa)})`, remsa <= 0.05],
      [`ett sår som levrat sig (${pct(levrat)}) eller sytts (${pct(sytt)}) infekteras inte`, levrat === 0 && sytt === 0],
      [`ett litet bett infekteras mer sällan än ett stort (${pct(litet)} mot ${pct(bett)})`, litet < bett],
      [`den som vilar infekteras mer sällan (${pct(sover)} mot ${pct(bett)})`, sover < bett * 0.8],
      [`ett bett av en blodig käft infekteras oftare (${pct(blodigt)} mot ${pct(bett)})`, blodigt > bett * 1.2],
      [`vargarna, björnen, vildsvinet och rövarna har blodiga vapen och käftar (${slag.filter(k => SIM.STRIDSLAG[k]?.blodigt).join(', ')})`, slag.every(k => SIM.STRIDSLAG[k]?.blodigt)],
      ['vargbettet har ingen egen tärning för infektionen', !('bettInf' in SIM.VARG)],
    ];
  },
};
