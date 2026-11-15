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
    const tar = fordonTar(SIM.lassAv(k), 'virke'), utanKalke = valjFordon(s, p, 'virke', at.x, at.y, 1, 6);
    const g = newTing(s, 'kalke', 1, BYN); g.x = Math.floor(c.x); g.y = Math.floor(c.y);
    s.vader!.sno = 1; const snoTre = valjFordon(s, p, 'virke', at.x, at.y, 1, 3);
    s.vader!.sno = 0; const barTre = valjFordon(s, p, 'virke', at.x, at.y, 1, 3), barEtt = valjFordon(s, p, 'virke', at.x, at.y, 1, 1), ingenHand = valjFordon(s, p, 'virke', at.x, at.y, 0, 1);
    const bar = valjFordon(s, p, 'bar', at.x, at.y, 0, 9), grenar = valjFordon(s, p, 'grenar', at.x, at.y, 0, 9);
    const ryms = fordonRyms(SIM.lassAv(k)), lass = ryms({ virke: 3 * SIM.viktOf('virke') }) && !ryms({ virke: 4 * SIM.viktOf('virke') }) && !ryms({ bar: 1 }) && !ryms({ grenar: 1 });
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

SCENARIER.dragdjur = {
  text: 'Steg 10.10.3: oxen, hästen och släden. Ett köpt dragdjur betar i hagen, spänns för släden och står i hagen igen efter turen. Oxen tar större lass och hästen går fortare, den som kör tar det djur som ger mest per tid för lasset, en by utan dragdjur gör ingen släde, och en människa kan inte dra släden',
  kor: () => {
    const { FORDON, lassAv, fordonFart, valjFordon, newTing, BYN, nyttTamdjur, stepBoskap, setAmount, tamdjurOf, tamArt, villAv, betesTal, slaktOrsak, spand, DAY } = SIM;
    // en by med en hage och staket runt, som i scenariot hage
    const medHage = (seed: number, oxe = true) => {
      const s = createState(seed, START); klockan(s, 9);
      const p = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)[0];
      if (oxe) { setAmount(s, 'levoxe', 1); stepBoskap(s); } // handlarens oxe blir byns; hagen märks ut när byn har betesdjur
      (p.tek ??= {}).staket = 1; setAmount(s, 'grenar', 400); setAmount(s, 'rep', 2);
      const mat = SIM.hageUppgift(s, p); if (mat?.ref === -1) SIM.hageKlar(s, p, -1);
      for (let v = SIM.hageVal(s, p), n = 0; v && n < 200; v = SIM.hageVal(s, p), n++) SIM.hageKlar(s, p, v.i);
      setAmount(s, 'rep', 2);
      for (let d = SIM.vallaVal(s, p), n = 0; d && n < 5; d = SIM.vallaVal(s, p), n++) SIM.vallaKlar(s, p, d.id);
      return { s, p, h: SIM.hagarOf(s)[0] };
    };
    const utanDjur = villAv(medHage(5, false).s, 'slade');
    const { s, p, h } = medHage(5);
    const m = SIM.bynsMitt(s);
    const oxe = tamdjurOf(s).find(d => d.art === 'oxe');
    const iHagen = !!oxe && !!h && oxe.hage === h.id, medDjur = villAv(s, 'slade');
    const hast = nyttTamdjur(s, 'hast', m.x, m.y, undefined, s.now - 4 * DAY); hast.hage = h?.id;
    // lasset och farten
    const sl = FORDON.slade, lOxe = lassAv(sl, oxe), lHast = lassAv(sl, hast);
    s.vader = { ...(s.vader ?? { fukt: 0.5 }), sno: 1 } as typeof s.vader;
    const fOxe = fordonFart(s, sl, m.x + 6, m.y, oxe), fHast = fordonFart(s, sl, m.x + 6, m.y, hast);
    // vem som tas: det djur som ger mest per tid för lasset (byggstenens vikt prövas med en tung sak: virket i högar om 40)
    const g = newTing(s, 'slade', 1, BYN); g.x = Math.floor(m.x); g.y = Math.floor(m.y);
    const per = (d: SIM.Tamdjur, n: number) => Math.min(n, Math.floor(lassAv(sl, d) / SIM.viktOf('virke'))) * fordonFart(s, sl, m.x + 6, m.y, d);
    const val5 = valjFordon(s, p, 'virke', m.x + 6, m.y, 1, 5), basta5 = per(hast, 5) >= per(oxe!, 5) ? hast : oxe;
    // utan dragdjur kan ingen dra släden
    const utan = medHage(7, false), gu = newTing(utan.s, 'slade', 1, BYN); gu.x = Math.floor(utan.p.x); gu.y = Math.floor(utan.p.y);
    const manniska = valjFordon(utan.s, utan.p, 'virke', utan.p.x + 6, utan.p.y, 0, 3);
    // oxen får inga ungar, hästen får föl och slaktas inte
    const ungar = !tamArt('oxe').unge && !!tamArt('hast').unge, hastSlakt = slaktOrsak(s, hast);
    // en tur: högen hämtas på släden och oxen står i hagen igen
    const b = medHage(4), bm = SIM.bynsMitt(b.s);
    const bo = tamdjurOf(b.s).find(d => d.art === 'oxe')!;
    const bg = newTing(b.s, 'slade', 1, BYN); bg.x = Math.floor(bm.x); bg.y = Math.floor(bm.y);
    let pl = { x: Math.floor(bm.x) + 9, y: Math.floor(bm.y) };
    for (let i = 9; i < 25; i++) { const x = Math.floor(bm.x) + i, y = Math.floor(bm.y); if (SIM.inMap(x, y) && SIM.groundOf(b.s).tiles[SIM.tileOf(x + 0.5, y + 0.5)] !== 0 && !SIM.isStored(b.s, x, y) && !(b.h && x >= b.h.x && x < b.h.x + b.h.w && y >= b.h.y && y < b.h.y + b.h.h)) { pl = { x, y }; break; } }
    b.s.stackar = (b.s.stackar ?? []).filter(q => q.k !== 'virke');
    b.s.stackar.push({ k: 'virke', n: 9, c: 1, x: pl.x, y: pl.y }); SIM.touch(b.s);
    let tim = 0;
    const kvar = () => (b.s.stackar ?? []).some(q => q.k === 'virke' && q.x === pl.x && q.y === pl.y);
    for (; tim < 10 && kvar(); tim++) kor(b.s, 1, x => { x.vader = { ...(x.vader ?? { fukt: 0.5 }), sno: 1 } as typeof x.vader; });
    kor(b.s, 2);
    const sagsSpand = b.s.stat?.dragdjurTur ?? 0, turer = b.s.stat?.fordonTur_slade ?? 0, perTur = turer ? (b.s.stat?.fordonSaker ?? 0) / Math.max(1, b.s.stat?.fordonTur ?? 0) : 0;
    const hemma = !spand(b.s, bo.id) && !!b.h && bo.hage === b.h.id && bo.x >= b.h.x && bo.x < b.h.x + b.h.w && bo.y >= b.h.y && bo.y < b.h.y + b.h.h;
    return [
      [`handlarens oxe blir byns och leds in i hagen (${oxe ? 'oxe' : 'ingen'}, ${iHagen ? 'i hagen' : 'utanför'}), och äter som två får (${betesTal(s)} med hästen)`, !!oxe && iHagen && betesTal(s) === 4],
      [`en by utan dragdjur gör ingen släde (vill ha ${utanDjur}), med en oxe en (${medDjur})`, utanDjur === 0 && medDjur === 1],
      [`oxen drar ${lOxe} vikt och hästen ${lHast}; hästen går fortare (${fHast.toFixed(2)} mot ${fOxe.toFixed(2)})`, lOxe === 240 && lHast === 180 && fHast > fOxe],
      [`till fem virken tas det djur som ger mest per tid (${val5?.d ? tamArt(val5.d.art).namn : 'inget'}, väntat ${basta5 ? tamArt(basta5.art).namn : '?'})`, !!val5?.d && val5.d === basta5],
      [`en människa kan inte dra släden (${manniska ? 'drar' : 'nej'})`, !manniska],
      [`oxen får inga ungar och hästen föl; hästen slaktas inte (${hastSlakt ?? 'nej'})`, ungar && !hastSlakt],
      [`virkeshögen körs hem på släden (${turer} turer, ${perTur.toFixed(1)} virken per tur, ${tim} h) med oxen spänd för (${sagsSpand} turer)`, turer > 0 && perTur > 3 && sagsSpand > 0 && !kvar()],
      [`efter turen står oxen i hagen igen (${hemma ? 'ja' : `nej: ${bo.x.toFixed(1)},${bo.y.toFixed(1)}`})`, hemma],
    ];
  },
};
