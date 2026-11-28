// Scenarier för fas 15, grupp 10 av system 15.1 (hälsan: infektionen, motståndet, vården och döden).
import * as SIM from '../../sim';
import { SCENARIER } from './hjalp';
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
