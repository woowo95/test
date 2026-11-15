// Scenarierna för fas 10 från och med 10.10 (fler djur, kälken, släden …)
import { createState } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, kor, klockan } from './hjalp';

// en landruta i byns närhet, d rutor öster om mitten (eller närmast efter)
const landVid = (s: SIM.State, d: number) => {
  const c = SIM.bynsMitt(s), g = SIM.groundOf(s);
  for (let i = d; i < d + 20; i++) for (const sg of [1, -1]) {
    const x = Math.floor(c.x) + sg * i, y = Math.floor(c.y);
    if (SIM.inMap(x, y) && g.tiles[SIM.tileOf(x + 0.5, y + 0.5)] !== 0 && !SIM.isStored(s, x, y)) return { x, y };
  }
  return { x: Math.floor(c.x) + d, y: Math.floor(c.y) };
};

SCENARIER.kalke = {
  text: 'Steg 10.10.2: kälken. Den tar tre virken och går i full fart på snö men långsamt på barmark. Den som hämtar virke tar händerna eller kälken efter vad turen ger per tid, och det ingen kan bära ligger kvar tills en kälke hämtar det. Bär och grenar körs inte',
  kor: () => {
    const { FORDON, fordonFart, fordonTar, fordonRyms, valjFordon, newTing, BYN, living, ageOf, ALDER } = SIM;
    const s = createState(4, START); klockan(s, 10);
    const p = living(s).find(q => ageOf(q, s.now) >= ALDER.vuxen)!, k = FORDON.kalke, at = landVid(s, 8), c = SIM.bynsMitt(s);
    s.vader = { ...(s.vader ?? { fukt: 0.5 }), sno: 1 } as typeof s.vader; const faSno = fordonFart(s, k, at.x, at.y);
    s.vader!.sno = 0; const faBar = fordonFart(s, k, at.x, at.y);
    const tar = fordonTar(k, 'virke'), utanKalke = valjFordon(s, p, 'virke', at.x, at.y, 1, 6);
    const g = newTing(s, 'kalke', 1, BYN); g.x = Math.floor(c.x); g.y = Math.floor(c.y);
    s.vader!.sno = 1; const snoTre = valjFordon(s, p, 'virke', at.x, at.y, 1, 3);
    s.vader!.sno = 0; const barTre = valjFordon(s, p, 'virke', at.x, at.y, 1, 3), barEtt = valjFordon(s, p, 'virke', at.x, at.y, 1, 1), ingenHand = valjFordon(s, p, 'virke', at.x, at.y, 0, 1);
    const bar = valjFordon(s, p, 'bar', at.x, at.y, 0, 9), grenar = valjFordon(s, p, 'grenar', at.x, at.y, 0, 9);
    const ryms = fordonRyms(k), lass = ryms({ virke: 3 * SIM.viktOf('virke') }) && !ryms({ virke: 4 * SIM.viktOf('virke') }) && !ryms({ bar: 1 }) && !ryms({ grenar: 1 });
    // samma virkeshög hämtas i en by med snö och kälke, och i en utan kälke
    const hamta = (sno: number, medKalke: boolean) => {
      const b = createState(4, START); klockan(b, 9);
      const m = SIM.bynsMitt(b), pl = landVid(b, 8);
      b.stackar = (b.stackar ?? []).filter(q => q.k !== 'virke');
      b.stackar.push({ k: 'virke', n: 6, c: 1, x: pl.x, y: pl.y }); SIM.touch(b);
      if (medKalke) { const t = newTing(b, 'kalke', 1, BYN); t.x = Math.floor(m.x); t.y = Math.floor(m.y); }
      let tim = 0;
      const kvar = () => (b.stackar ?? []).some(q => q.k === 'virke' && q.x === pl.x && q.y === pl.y);
      for (; tim < 10 && kvar(); tim++) kor(b, 1, x => { x.vader = { ...(x.vader ?? { fukt: 0.5 }), sno } as typeof x.vader; });
      const turer = b.stat?.fordonTur ?? 0, saker = b.stat?.fordonSaker ?? 0;
      return { tim: kvar() ? Infinity : tim, turer, perTur: turer ? saker / turer : 0 };
    };
    const snoK = hamta(1, true), barK = hamta(0, true), snoH = hamta(1, false);
    return [
      [`kälken går i full fart på snö (${faSno.toFixed(2)}) och ${faBar.toFixed(2)} av farten på barmark`, Math.abs(faSno - 1) < 1e-9 && Math.abs(faBar - SIM.FORDON_TAL.kalkeBar) < 1e-9],
      [`kälken rymmer tre virken (${tar}), och bara det som lyfts med båda händerna`, tar === 3 && lass],
      ['utan kälke bärs virket i händerna', !utanKalke],
      [`på snö tas kälken till tre virken (${snoTre ? 'kälken' : 'händerna'}); på barmark till tre (${barTre ? 'kälken' : 'händerna'}) men inte till ett (${barEtt ? 'kälken' : 'händerna'})`, !!snoTre && !!barTre && !barEtt],
      [`det ingen kan bära i händerna hämtas med kälken (${ingenHand ? 'ja' : 'nej'})`, !!ingenHand],
      [`bär och grenar körs inte (${bar ? 'bär' : ''}${grenar ? ' grenar' : ''})`, !bar && !grenar],
      [`på snö drar kälken tre virken per tur (${snoK.turer} turer, ${snoK.perTur.toFixed(1)} per tur)`, snoK.turer > 0 && snoK.perTur >= 2.5],
      [`högen på sex virken hämtas: snö och kälke ${snoK.tim} h, barmark och kälke ${barK.tim} h, snö och händerna ${snoH.tim} h`, snoK.tim < Infinity && barK.tim < Infinity && snoH.tim < Infinity && snoH.turer === 0 && snoK.tim <= snoH.tim],
    ];
  },
};
