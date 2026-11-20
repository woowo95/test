// Scenarier för kartbilden och panelerna i fas 12 (grenen par-paneler).
import * as SIM from '../../sim';
import { SCENARIER } from './hjalp';
import { START } from '../kor';
import { hasIcon } from '../../ikoner';
import { ROLLSYMBOLER, SKYLT, rollAv, synligaSkyltar, type Skylt } from '../../ui/namnskyltar';

SCENARIER.namnskyltar = {
  text: 'Steg 12.1.157: varje kolonist har sitt namn i liten text vid figuren, och den som har en roll (ledaren, prästen) en symbol vid namnet ur ROLLSYMBOLER. När kartan är utzoomad eller många står tätt göms namnen så att de inte täcker varandra, och rollerna går före',
  kor: () => {
    const s = SIM.createState(3, START), folk = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    const [led, pr, van] = folk;
    s.styre = { ...(s.styre ?? {}), ledare: led.id } as typeof s.styre;
    (s.tron ??= []).push({ id: 9001, prast: pr.id } as SIM.Tro); pr.tro = 9001;
    const bredd = (p: SIM.Person) => p.name.length * 4; // ungefär textens bredd i världens punkter
    const skylt = (p: SIM.Person, x: number, y: number): Skylt => { const r = rollAv(s, p); return { id: p.id, x, y, w: bredd(p), ikon: r?.ikon, forst: r ? 1 : 0 }; };
    const alla = SIM.living(s);
    // utspridda: en per ruta på två rutors avstånd
    const spridda = alla.map((p, i) => skylt(p, (i % 6) * 48 + 20, Math.floor(i / 6) * 32 + 20));
    const narZoom = synligaSkyltar(spridda, 3), utZoom = synligaSkyltar(spridda, 0.8);
    // tätt: alla på samma ruta och två rutor till
    const tata = alla.map((p, i) => skylt(p, 100 + (i % 3) * 3, 100 + (i % 2) * 2));
    const tat = synligaSkyltar(tata, 3);
    const rekt = (k: Skylt) => { const w = k.w + (k.ikon ? SKYLT.ikon + 1 : 0); return { x: k.x - w / 2, y: k.y - SKYLT.hojd, w, h: SKYLT.hojd }; };
    const synliga = tata.filter(k => tat.has(k.id)).map(rekt);
    const overlapp = synliga.some((a, i) => synliga.some((b, j) => i < j && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
    // den valda har sin stora skylt: namnen bredvid den göms
    const stor = synligaSkyltar(tata, 3, [{ x: 60, y: 80, w: 100, h: 40 }]);
    return [
      [`ledaren och prästen har sin roll och den vanliga ingen (${rollAv(s, led)?.id}, ${rollAv(s, pr)?.id}, ${rollAv(s, van)?.id ?? 'ingen'})`, rollAv(s, led)?.id === 'ledare' && rollAv(s, pr)?.id === 'prast' && !rollAv(s, van)],
      [`varje roll i ROLLSYMBOLER har sin symbol i ikoner.ts (${ROLLSYMBOLER.map(r => r.ikon).join(', ')})`, ROLLSYMBOLER.every(r => hasIcon(r.ikon))],
      [`inzoomat syns alla ${alla.length} namn när folk står utspridda (${narZoom.size})`, narZoom.size === alla.length],
      [`utzoomat syns inga namn (${utZoom.size})`, utZoom.size === 0],
      [`när alla står tätt syns bara några namn och inga täcker varandra (${tat.size} av ${alla.length})`, tat.size > 0 && tat.size < alla.length && !overlapp],
      [`i trängseln går rollerna före: de namn som syns är ledarens eller prästens (${[...tat].map(id => SIM.byId(s, id)?.name).join(', ')})`, [...tat].every(id => id === led.id || id === pr.id)],
      [`namnen under den valdas stora skylt göms (${stor.size})`, stor.size === 0],
    ];
  },
};
