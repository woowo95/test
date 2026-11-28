// Scenarier för fas 15, grupp 20 av 15.1 (steg 15.1.178–188).
import * as SIM from '../../sim';
import { START } from '../kor';
import { husPa } from './byggnader';
import { SCENARIER, klockan, kor, testBy } from './hjalp';

SCENARIER.toafrys = {
  text: 'Steg 15.1.181: toan är ett av de farliga behoven. Den som fryser farligt med full toa i ett hus i istiden byter inte uppgift i varje slag, och går på toa när hen blivit varm',
  kor: () => {
    // en vuxen i ett hus mitt i istiden, kall och med full toa; med eller utan en eld som brinner
    const fall = (eld: boolean) => {
      const s = SIM.cloneState(testBy(10));
      s.now = SIM.ageStart(s, 0) + 2 * 24 * SIM.HOUR + 2 * SIM.HOUR;
      if (eld) { SIM.setAmount(s, 'ved', 100); for (const f of SIM.eldarOf(s)) Object.assign(f, { lit: true, fuel: 4 }); }
      const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && SIM.roomAt(s, q.x, q.y))!;
      Object.assign(p, { warm: SIM.KROPP.farligt - 0.15, toa: SIM.KROPP.toaAvbryt - 0.03, hunger: 0.9, torst: 0.9, rest: 0.6, health: 1 });
      p.task = undefined; SIM.chooseTask(s, p);
      const t0 = s.now; let tio = 0, timme = 0, forra: SIM.Task | undefined = p.task, varm: number | undefined, toa: number | undefined;
      const akt = [p.task!.act as string];
      kor(s, 2, b => {
        if (p.task !== forra) { forra = p.task; if (b.now - t0 <= 10 * SIM.MIN) tio++; if (b.now - t0 <= SIM.HOUR) timme++; akt.push(`${p.task?.act} ${Math.round((b.now - t0) / SIM.MIN)} min`); }
        if (varm === undefined && p.warm >= SIM.KROPP.farligt) varm = b.now;
        if (toa === undefined && p.task?.act === 'toa') toa = b.now;
      });
      return { tio, timme, varm: varm === undefined ? undefined : (varm - t0) / SIM.MIN, toa: toa === undefined ? undefined : (toa - t0) / SIM.MIN, akt: akt.slice(0, 6).join(', ') };
    };
    const a = fall(true), b = fall(false);
    return [
      [`med elden: högst två byten på 10 minuter (${a.tio}; ${a.akt})`, a.tio <= 2],
      [`med elden: varm efter ${a.varm} min, på toa efter ${a.toa} min, inom en timme efter att hen blivit varm`, a.varm !== undefined && a.toa !== undefined && a.toa <= a.varm + 60],
      [`utan eld: högst två byten på 10 minuter (${b.tio}; ${b.akt})`, b.tio <= 2],
      [`utan eld: nöden avbryter inte i varje slag (${b.timme} byten på en timme)`, b.timme <= 4],
    ];
  },
};

SCENARIER.sjukande = {
  text: 'Steg 15.1.184: de sjuka läggs i rummets ena ände. I en by som kan Smittan och sover i långhuset, utan en tom hydda, byter de som smittar plats med de friska, också när de sov längst bort i rummet',
  kor: () => {
    const s = SIM.createState(6, START); klockan(s, 10); const e = SIM.eldPlats(s), W = SIM.W;
    const fri = (x: number, y: number, w: number, h: number) => { for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) if (!SIM.ledig(s, xx, yy)) return false; return true; };
    const hus: SIM.Hus[] = [], till = (fn: SIM.Hus['fn'], w: number, namn: string) => {
      for (let d = 4; d < 40; d++) for (let a = 0; a < 16; a++) { const x = Math.round(e.x + Math.cos(a) * d), y = Math.round(e.y + Math.sin(a) * d); if (fri(x, y, w, 5)) { hus.push(husPa(s, x, y, w, 5, true, { namn, fn })); return; } }
    };
    till('forrad', 6, 'Förrådshuset'); till('sovsal', 11, 'Långhuset');
    for (let i = 0; i < 4 && SIM.homeless(s); i++) { s.people.pop(); SIM.touch(s); }
    const folk = SIM.living(s); folk.forEach(q => SIM.learnK(q, 'smitta', 1, s.now));
    const x = (q: SIM.Person) => SIM.bedTile(s, q)! % W, iLang = (q: SIM.Person) => { const i = SIM.bedTile(s, q); return i !== undefined && SIM.roomAt(s, i % W, Math.floor(i / W))?.hus === hus[1].id; };
    // de två vuxna som sover längst bort åt det håll de sjuka inte läggs (störst x) blir sjuka
    const vuxna = folk.filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && iLang(q)).sort((a, c) => x(c) - x(a)), sjuka = vuxna.slice(0, 2);
    const fore = sjuka.map(q => SIM.bedTile(s, q)), led = (q: SIM.Person) => { const t = SIM.bedTile(s, q)!; return (t % W) * W + Math.floor(t / W); }; // rummets ordning längs dess längsta sida
    for (const q of sjuka) { SIM.insjukna(s, q, 'forkylning'); q.sjuk!.tecken = s.now; q.sjuk!.st = 0; q.sjuk!.grad = 0.7; }
    s.now += 1000; SIM.touch(s);
    const i = folk.filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.smabarn && iLang(q)), sj = i.filter(q => sjuka.includes(q)), frisk = i.filter(q => !sjuka.includes(q));
    const skilda = sj.length === 2 && !!frisk.length && Math.max(...sj.map(led)) < Math.min(...frisk.map(led));
    return [
      [`de två som blev sjuka sov längst bort i långhuset (x ${fore.map(t => t! % W).join(', ')}; ${vuxna.length} vuxna där)`, sjuka.length === 2 && vuxna.length >= 4],
      [`de sjuka ligger i rummets ena ände och de friska i den andra (sjuka x ${sj.map(x).join(', ')}, friska x ${frisk.map(x).join(', ')})`, skilda],
      ['de sjuka bytte plats med de friska', sj.length === 2 && sj.some(q => SIM.bedTile(s, q) !== fore[sjuka.indexOf(q)])],
    ];
  },
};
