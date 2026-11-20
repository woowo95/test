// Scenarier för fas 12: myren och järnet.
import * as SIM from '../../sim';
import { SCENARIER } from './hjalp';

// en by med myr: det första fröet från start vars karta har myr (kartan räknas utan att byn skapas)
export function myrFro(start = 1, med = true) {
  for (let f = start; f < start + 400; f++) {
    SIM.useMap({ W: SIM.KARTA.bredd, H: SIM.KARTA.hojd });
    if (!!SIM.myrOf(f) === med) return f;
  }
  throw new Error('ingen karta med myr');
}
export const myrBy = (start = 1) => SIM.createState(myrFro(start), Date.UTC(2026, 3, 1));
// rutorna på myren
export const myrRutorI = (s: SIM.State) => { const a = SIM.myrOf(s.seed), r: number[] = []; if (a) for (let i = 0; i < a.length; i++) if (a[i]) r.push(i); return r; };

SCENARIER.myr = {
  text: 'Myren (steg 12.1.1, myr.ts): blöt mark där inget byggs, långsam att gå på och under vatten efter regn; inga träd växer där, och myrarna ligger glest så att många byar inte har någon',
  kor: () => {
    // hur många kartor som har myr
    let med = 0, nara = 0;
    const N = 60;
    for (let f = 1; f <= N; f++) {
      SIM.useMap({ W: SIM.KARTA.bredd, H: SIM.KARTA.hojd });
      const a = SIM.myrOf(f);
      if (!a) continue;
      med++;
      const e = SIM.getMap(f).fire;
      for (let i = 0; i < a.length; i++) if (a[i] && Math.hypot(i % SIM.W - e.x, Math.floor(i / SIM.W) - e.y) < 6) nara++;
    }
    const s = myrBy(), r = myrRutorI(s), g = SIM.groundOf(s), i = r[Math.floor(r.length / 2)], x = i % SIM.W, y = Math.floor(i / SIM.W);
    const tradFore = r.filter(j => g.trees[j] > 0).length;
    // ett halvt år av växande: inga plantor på myren
    for (let k = 0; k < 40; k++) SIM.growGround(s, 24, 2);
    const tradEfter = r.filter(j => g.trees[j] > 0).length;
    // gången: torr myr, sedan blöt mark efter regn
    s.vader = { ...(s.vader ?? { sno: 0 }), fukt: 0.1 }; SIM.myrSteg(s, g);
    const torr = SIM.markFart(g, i), torrUnder = g.myrVatten;
    s.vader.fukt = 0.9; SIM.myrSteg(s, g);
    const blot = SIM.markFart(g, i), under = g.myrVatten;
    const utan = SIM.createState(myrFro(1, false), Date.UTC(2026, 3, 1));
    return [
      [`myrarna ligger glest: ${med} av ${N} kartor har myr`, med >= N * 0.25 && med <= N * 0.75],
      ['ingen myr inpå byplatsen', nara === 0],
      [`byn har myr (${r.length} rutor)`, r.length >= 20],
      [`inget byggs på myren (${x}, ${y})`, SIM.underMinnet(s, i) && !SIM.ledig(s, x, y)],
      [`inga träd på myren (före ${tradFore}, efter ett halvt år ${tradEfter})`, tradFore === 0 && tradEfter === 0],
      [`torr myr går man långsamt på (${torr})`, !torrUnder && torr === SIM.MYR.fartTorr && torr < 1],
      [`efter regn står myren under vatten och är långsammast (${blot})`, !!under && blot === SIM.MYR.fartVatten && blot < torr],
      ['en by utan myr har ingen', !SIM.harMyr(utan) && !SIM.groundOf(utan).myr],
    ];
  },
};

SCENARIER.myrmalm = {
  text: 'Myrmalmen (steg 12.1.2, malm.ts): malm i fläckar på myren, 4 i en full ruta, som grävs med spaden på en tur som ger 4 malm, och en tömd ruta är full igen efter ungefär 30 dygn; i istiden växer inget till och den frusna myren går inte att gräva',
  kor: () => {
    const s = myrBy(), r = myrRutorI(s);
    const malm = r.filter(i => SIM.fyndAt(s, 'malm', i) > 0), full = malm.every(i => SIM.fyndAt(s, 'malm', i) === 4), utanfor = SIM.fyndAt(s, 'malm', SIM.tileOf(SIM.eldPlats(s).x, SIM.eldPlats(s).y));
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    const f = { kyla: false, gras: 0 };
    s.ting = SIM.tingOf(s).filter(t => t.k !== 'benspade');
    const utanSpade = SIM.projektNu(s, p, 'malm', f);
    SIM.addTool(s, 'benspade', p);
    const u = SIM.projektNu(s, p, 'malm', f), at = SIM.malmPlats(s);
    const egen = SIM.projektVarde(s, 'malm');
    // turen: 4 malm i en hög där den grävdes, och rutan är tom
    const t: SIM.Task = { act: 'malm', phase: 'do', tx: at!.x, ty: at!.y, until: s.now, carry: 0, why: '', arbTid: SIM.MALM.min * 60000, tool: 'benspade' } as SIM.Task;
    p.x = at!.x; p.y = at!.y;
    SIM.malmGravd(s, p, t);
    const hog = SIM.stacksOf(s).filter(a => a.k === 'malm').reduce((n, a) => n + a.n, 0), i = SIM.tileOf(at!.x, at!.y), tom = SIM.fyndAt(s, 'malm', i);
    // återväxten: inget i istiden, nästan full efter 30 dygn på sommaren
    SIM.growFynd(s, 30 * 24, 0, 1, 0); const istid = SIM.fyndAt(s, 'malm', i);
    SIM.growFynd(s, 30 * 24, 2, 1, 0); const efter = SIM.fyndAt(s, 'malm', i);
    // den frusna myren
    s.is = { ...(s.is ?? {}), cm: 10 } as typeof s.is;
    const frusen = SIM.malmPlats(s);
    return [
      [`malm i fläckar på myren: ${malm.length} av ${r.length} rutor, 4 i varje, ingen utanför myren`, malm.length >= r.length * 0.08 && malm.length <= r.length * 0.4 && full && utanfor === 0],
      [`byn har inget eget mål för malmen (värdet ${egen})`, egen === 0],
      ['utan spade gräver ingen malm', !utanSpade],
      [`med spaden gräver en vuxen malm i myren (${u?.act}, ${u?.min} minuter)`, u?.act === 'malm' && u.min === 6 && u.tool === 'benspade' && SIM.paMyr(s, SIM.tileOf(u.spot!.x, u.spot!.y))],
      [`turen ger 4 malm i en hög där den grävdes, och rutan är tom (${hog}, kvar ${tom})`, hog === 4 && tom === 0 && SIM.SAKER.malm!.vikt === 4],
      [`i istiden växer malmen inte till (${istid}), efter 30 dygn på sommaren är rutan nästan full (${efter.toFixed(2)})`, istid === 0 && efter > 3.5],
      ['den frusna myren går inte att gräva', !frusen],
    ];
  },
};
