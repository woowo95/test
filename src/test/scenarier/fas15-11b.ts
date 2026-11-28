// Scenarier för fas 15, grupp 11, andra omgången (resorna i världen, steg 15.1.85–15.1.95).
import * as SIM from '../../sim';
import { SCENARIER, testBy } from './hjalp';
import { paVagen, utanHandelser } from './fas15-11';

SCENARIER.samresa = {
  text: 'Steg 15.1.85: alla resor i ett system. En färd från en by i världen går som huvudbyns sällskap: ruta för ruta längs vägen i dagsljuset, i samma fart, och rastar på natten. Den kommer fram när gången når målet. En färd och ett sällskap från huvudbyn på samma väg går lika fort, står still på natten och kommer fram samtidigt',
  kor: () => {
    const s0 = SIM.cloneState(testBy(3)), vl0 = s0.varld!, hb = SIM.byPlats(vl0, vl0.huvud!)!, mal = hb.grannar![0]!;
    const malBy = SIM.varldPlatsNr(vl0, mal.nr)!.by!;
    const vuxna = SIM.living(s0).filter(q => SIM.ageOf(q, s0.now) >= 20 && SIM.ageOf(q, s0.now) < 50 && SIM.personFart(s0, q) === 1);
    const x = paVagen(s0, [vuxna[0]!.id, vuxna[1]!.id], mal.nr), s = x.s, vl = s.varld!;
    x.sl.pack = {}; x.sl.letaNasta = Infinity; // ingen last som bromsar och inget letande: det har bara sällskapet (steg 15.1.90)
    // en färd med ett bud från huvudbyns rad till samma by, på samma väg, som ger sig av samtidigt
    const f: SIM.RadFard = { id: 99999, fran: vl.huvud!, till: malBy, g: 'mat', n: 0, t0: s.now, t1: s.now + mal.dygn * SIM.DAY, besked: 'besked', gar: 'ut', vg: { ruta: x.sl.ruta, vag: { ...x.sl.vag! }, pos: 0, gang: 0 } };
    (vl.farder ??= []).push(f);
    const fart = { sl: SIM.sallskapFart(s, x.sl), f: SIM.fardFart(s) };
    let natt = 0, nattStill = true, slFram = 0, fFram = 0, fNatt = true;
    utanHandelser(() => {
      for (let m = 0; m < 20 * 24 * 6 && (!slFram || !fFram); m++) {
        // mitt i natten (världens timme räknas i efterhand) står båda still
        const p0 = x.sl.pos, q0 = f.vg?.pos, g0 = f.vg?.gang;
        x.sl.behov = { matt: 1, vatska: 1, ork: 1, fulla: 0, foder: 0 }; // mätta och utvilade: färdens behov kommer med packningen (15.1.86)
        s.now += 10 * SIM.MIN; SIM.resaBehov(s, 10 * SIM.MIN); SIM.varldTill(s, s.now);
        if (!SIM.isLight(s.now) && !SIM.isLight(s.now - 2 * SIM.HOUR)) { natt++; if (x.sl.pos !== p0 && x.sl.skede === 'ute') nattStill = false; if (f.gar === 'ut' && (f.vg?.pos !== q0 || f.vg?.gang !== g0)) fNatt = false; }
        if (!slFram && x.sl.skede !== 'ute') slFram = s.now;
        if (!fFram && f.gar !== 'ut') fFram = s.now;
      }
    });
    const dygn = (t: number) => ((t - s0.now) / SIM.DAY).toFixed(2), skillnad = Math.abs(slFram - fFram) / SIM.HOUR;
    return [
      [`samma fart: sällskapet ${fart.sl.toFixed(2)}, färden ${fart.f.toFixed(2)}`, Math.abs(fart.sl - fart.f) < 1e-9],
      [`båda står still på natten (${natt} nattbitar)`, natt > 0 && nattStill && fNatt],
      [`och kommer fram samtidigt (sällskapet ${dygn(slFram)}, färden ${dygn(fFram)} dygn; ${skillnad.toFixed(2)} timmar isär)`, slFram > 0 && fFram > 0 && skillnad <= 1],
      [`färden kom fram när gången nådde målet, och går nu hem (${f.gar})`, f.gar === 'hem' || !vl.farder!.includes(f)],
      [`färden står på sin ruta på kartan (${JSON.stringify(SIM.fardLage(vl, f, s.now, SIM.varldMark(s)!.w))})`, !f.gar || SIM.fardLage(vl, f, s.now, SIM.varldMark(s)!.w)?.x === (f.vg!.ruta! % SIM.varldMark(s)!.w)],
    ];
  },
};

SCENARIER.serlangs = {
  text: 'Steg 15.1.91 (landmärkena): sällskapet ser landmärkena på och bredvid rutorna det går över, och de blir kunskap (och hemma ett rykte genom samtalen); en hemlig plats ses bara med en chans per tid efter den bästa spårarens färdighet',
  kor: () => {
    const s0 = SIM.cloneState(testBy(3)), vl0 = s0.varld!, hb = SIM.byPlats(vl0, vl0.huvud!)!, mal = hb.grannar![0]!.nr;
    const vuxna = SIM.living(s0).filter(q => SIM.ageOf(q, s0.now) >= 20 && SIM.ageOf(q, s0.now) < 50 && SIM.personFart(s0, q) === 1);
    const resa = (jakt: number) => {
      const x = paVagen(s0, [vuxna[0]!.id, vuxna[1]!.id], mal), s = x.s, vl = s.varld!, v = SIM.varldMark(s)!, r = SIM.vagenRutor(s, x.sl);
      for (const p of x.folk) p.skill.jakt = jakt;
      x.sl.pack = {}; x.sl.letaNasta = Infinity;
      // en gömma bredvid vägen (hemlig), och landmärkena som ligger på eller bredvid den
      const g = SIM.laggGomma(s, { ...x.sl, medl: [], ruta: r[Math.floor(r.length / 2)] }, { skinn: 2 }, s.now)!; // ingen i sällskapet lade den
      const nara = new Set<number>();
      for (const i of r) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const p of SIM.varldPlatserPa(vl, i % v.w + dx, Math.floor(i / v.w) + dy)) if (p.k !== 'by' && p.k !== 'gomma') nara.add(p.nr);
      const visste = [...nara].filter(nr => (SIM.findL(x.folk[0]!, 'ort', nr)?.v ?? -1) >= SIM.O_KANT).length;
      utanHandelser(() => { for (let m = 0; m < 20 * 24 * 6 && x.sl.skede === 'ute'; m++) { x.sl.behov = { matt: 1, vatska: 1, ork: 1, fulla: 0, foder: 0 }; s.now += 10 * SIM.MIN; SIM.resaBehov(s, 10 * SIM.MIN); } });
      const vet = [...nara].filter(nr => (SIM.findL(x.folk[0]!, 'ort', nr)?.v ?? -1) >= SIM.O_KANT).length;
      return { nara: nara.size, visste, vet, gomma: (SIM.findL(x.folk[0]!, 'ort', g.nr)?.v ?? -1) >= SIM.O_KANT, skede: x.sl.skede };
    };
    const sparare = resa(20), utan = resa(0);
    return [
      [`resenärerna vet var landmärkena längs vägen ligger (${sparare.vet} av ${sparare.nara}, förut ${sparare.visste}; ${sparare.skede})`, sparare.nara > 0 && sparare.vet === sparare.nara && sparare.vet > sparare.visste],
      [`den bästa spåraren fick syn på gömman bredvid vägen`, sparare.gomma],
      [`utan spårare syns den inte`, !utan.gomma],
    ];
  },
};
