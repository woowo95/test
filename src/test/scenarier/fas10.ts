// Scenarierna för fas 10 från och med 10.10 (fler djur, kälken, släden …)
import { createState } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, byggKlart, byggare, kor, klockan, medBank, setMat, tandEld, testBy } from './hjalp';

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

SCENARIER.vildsvin = {
  text: 'Steg 10.10.4: vildsvinet. En flock om 3 till 6 står inne i skogen, långt från byn, och räknas som rådjuren (en rad i FLOCKARTER). Jägaren med spjut fäller vildsvin; ibland vänder det sig mot hen och det blir en strid. Det fällda vildsvinet styckas i tre stycken som bärs ett i taget, och slakten ger hela saker',
  kor: () => {
    const { FLOCKARTER, flockGrupper, flockOf, startGround, getMap, living, ageOf, amountOf, setAmount, cloneState } = SIM;
    const f = FLOCKARTER.vildsvin, s0 = createState(6, START); klockan(s0);
    const g = flockGrupper(s0, f), m = getMap(s0.seed), sg = startGround(s0.seed);
    const iSkog = g.every(q => sg.trees[Math.floor(q.y) * SIM.W + Math.floor(q.x)] >= 0.5), langt = g.every(q => Math.hypot(q.x - m.fire.x, q.y - m.fire.y) >= f.tal.hemAvst - 3);
    const v0 = flockOf(s0, f)[0];
    const p0 = living(s0).find(q => ageOf(q, s0.now) >= 16)!;
    // jakten: många försök nära flocken med spjut
    const ut = { mal: 0, fallt: 0, del: 0, anfall: 0, strid: 0, stridFallt: 0 };
    const s = cloneState(s0), p = SIM.byId(s, p0.id)!;
    p.tek = { ...p.tek, kniv: 1 }; SIM.newTing(s, 'kniv', 1, p.id);
    for (let i = 0; i < 200; i++) {
      Object.assign(s, { djurDoda: undefined, djurHalsa: undefined, djurSkramd: undefined, djurFlykt: undefined, stackar: [], kartStrider: undefined }); s.ting = (s.ting ?? []).filter(t => t.k !== 'flintspjut');
      const t = SIM.addTool(s, 'flintspjut', p); t.hos = p.id;
      p.x = v0.x - 7; p.y = v0.y; p.skador?.splice(0); p.health = 1; p.died = undefined;
      const tk = { act: 'jakt', phase: 'do', tx: v0.x, ty: v0.y, until: s.now + SIM.HOUR, carry: 0, tool: 'flintspjut' } as SIM.Task;
      p.task = tk;
      SIM.jaktForsok(s, p, tk);
      if (!tk.jf) continue;
      if (SIM.flockArtAv(tk.jf.id)?.art === 'vildsvin') ut.mal++;
      const anf = !!tk.jf.anfall;
      SIM.jaktKlar(s, p, tk);
      if (tk.items?.vildsvin || tk.items?.vildsvindel) { ut.fallt++; if (tk.items?.vildsvindel) ut.del++; }
      if (anf) {
        ut.anfall++;
        for (let n = 0; n < 2000 && s.kartStrider?.length; n++) SIM.kartStridSteg(s, 1);
        if (!s.kartStrider?.length) ut.strid++;
        if (p.task?.items?.vildsvindel) ut.stridFallt++;
      }
    }
    // styckningen: ett fällt vildsvin blir tre stycken, och jägaren bär ett
    const st = cloneState(s0), sp = SIM.byId(st, p0.id)!; sp.pot = { ...sp.pot, styrka: 1 }; sp.tek = { ...sp.tek, kniv: 1 }; SIM.newTing(st, 'kniv', 1, sp.id); st.stackar = [];
    const stk = { act: 'jakt', phase: 'do', tx: sp.x, ty: sp.y, until: st.now + SIM.HOUR, carry: 0, items: { vildsvin: 1 } } as SIM.Task;
    const kvar = SIM.styckaFallt(st, sp, stk, 'vildsvin'), hog = (st.stackar ?? []).reduce((a, q) => { a[q.k] = (a[q.k] ?? 0) + q.n; return a; }, {} as Record<string, number>);
    // slakten, helt och i stycken
    const slakta = (k: string) => {
      const b = createState(3, START); medBank(b);
      const q = living(b).find(x => ageOf(x, b.now) >= 16)!;
      for (const r of b.people) r.tek = { ...r.tek, kniv: 1 };
      b.ting = (b.ting ?? []).filter(t => t.k !== 'kniv'); SIM.newTing(b, 'kniv', 1, q.id);
      setMat(b, {}); for (const x of ['svinkott', 'ben', 'svinskinn', 'talg']) setAmount(b, x, 0); setAmount(b, k, 1);
      SIM.bearbeta(b, q, (SIM.DJUR as Record<string, SIM.Djurart>)[k], 1);
      return [...['svinkott', 'ben', 'svinskinn', 'talg'].map(x => amountOf(b, x)), SIM.kottAv(q, (SIM.DJUR as Record<string, SIM.Djurart>)[k].slakt.svinkott)];
    };
    const hel = slakta('vildsvin'), del = slakta('vildsvindel');
    const heltal = [...hel.slice(0, 4), ...del.slice(0, 4)].every(x => Number.isInteger(x));
    return [
      [`en flock på kartan (${g.length}, ${g.map(q => q.n).join(', ')} vildsvin)`, g.length === 1 && g.every(q => q.n >= 3 && q.n <= 6)],
      ['flocken står inne i skogen, långt från byns eld', iSkog && langt],
      [`med spjut går jägaren mot vildsvinet (${ut.mal} av 200) och fäller några (${ut.fallt})`, ut.mal > 100 && ut.fallt > 0],
      [`ibland vänder vildsvinet sig mot jägaren (${ut.anfall} gånger), och striden tar slut (${ut.strid}); ${ut.stridFallt} fälldes i striden`, ut.anfall > 0 && ut.strid === ut.anfall],
      [`det fällda vildsvinet styckas i tre stycken: ett i händerna (${stk.items?.vildsvindel ?? 0}), ${kvar} kvar i högen med skinnen (${JSON.stringify(hog)})`, stk.items?.vildsvindel === 1 && kvar === 2 && hog.vildsvindel === 2 && hog.svinskinn === 2],
      [`slakten av ett helt vildsvin gav fläsk ${hel[0]} (12 gånger slaktarens skicklighet: ${hel[4]}), ben ${hel[1]}, skinn ${hel[2]}, talg ${hel[3]}`, hel[0] === hel[4] && hel[4] >= 6 && hel[1] === 3 && hel[2] === 2 && hel[3] === 4],
      [`ett stycke gav fläsk ${del[0]}, ben ${del[1]}, talg ${del[3]}, och allt är hela saker`, del[0] === del[4] && del[1] === 1 && del[3] === 1 && heltal],
    ];
  },
};

SCENARIER.byggsten = {
  text: 'Steg 10.10.5: byggstenen. Den bryts vid berget när Byggplanen planerat något av sten, blir liggande där eftersom ingen orkar bära den, och körs hem på kälken, en i taget, eller på släden: fyra med hästen och sex med oxen. Utan kälke eller släde blir stenen liggande',
  kor: () => {
    const { STENBEHOV, FORDON, lassAv, fordonTar, newTing, BYN, living, ageOf, ALDER, amountOf, bergPlats, stenFrakt, TEK } = SIM;
    const tek = TEK.byggsten;
    const by = (medKalke: boolean) => {
      const s = createState(3, START); klockan(s, 8);
      for (const p of living(s)) if (ageOf(p, s.now) >= ALDER.vuxen) p.tek = { ...p.tek, byggsten: 1 };
      const m = SIM.bynsMitt(s);
      if (medKalke) { const g = newTing(s, 'kalke', 1, BYN); g.x = Math.floor(m.x); g.y = Math.floor(m.y); }
      const frakt = stenFrakt(s);
      let tim = 0;
      for (; tim < 24 && !(medKalke ? amountOf(s, 'byggsten') >= 1 : (s.stat?.byggstenBruten ?? 0) >= 1); tim++) kor(s, 1, x => { x.vader = { ...(x.vader ?? { fukt: 0.5 }), sno: 0 } as typeof x.vader; });
      kor(s, 1);
      const liggande = (s.stackar ?? []).filter(q => q.k === 'byggsten').reduce((a, q) => a + q.n, 0);
      return { tim, frakt, bruten: s.stat?.byggstenBruten ?? 0, hemma: amountOf(s, 'byggsten'), liggande, turer: s.stat?.fordonTur_kalke ?? 0 };
    };
    STENBEHOV.scenario = () => 2;
    let med, utan, inget;
    try { med = by(true); utan = by(false); } finally { delete STENBEHOV.scenario; }
    { const s = createState(3, START); inget = SIM.materialBuffert(s, 'byggsten'); }
    const sv = createState(3, START), ber = bergPlats(sv);
    const hast = fordonTar(lassAv(FORDON.slade, { art: 'hast' } as SIM.Tamdjur), 'byggsten'), oxe = fordonTar(lassAv(FORDON.slade, { art: 'oxe' } as SIM.Tamdjur), 'byggsten'), kalke = fordonTar(lassAv(FORDON.kalke), 'byggsten');
    return [
      [`tekniken Byggsten kräver stenhuggarplatsen och stockvägen (${tek.krav.join(', ')})`, tek.krav.includes('stenhuggarplats') && tek.krav.includes('stockvag')],
      [`stenen väger mer än någon orkar bära (${SIM.viktOf('byggsten')}) och bryts på en ruta intill berget`, SIM.viktOf('byggsten') > 30 && !!ber && SIM.GRANNAR4.some(([dx, dy]) => SIM.groundOf(sv).tiles[(Math.floor(ber!.y) + dy) * SIM.W + Math.floor(ber!.x) + dx] === SIM.T.Sten)],
      [`utan något planerat av sten vill byn inte ha någon (${inget})`, inget === 0],
      [`kälken tar en sten, släden fyra med hästen (${hast}) och sex med oxen (${oxe})`, kalke === 1 && hast === 4 && oxe === 6],
      [`med kälken bröts ${med.bruten} och ${med.hemma} kördes hem på ${med.turer} turer (${med.tim} h)`, med.bruten >= 1 && med.hemma >= 1 && med.turer >= 1],
      [`utan kälke bröts ${utan.bruten}, och ${utan.liggande} ligger kvar vid berget (${utan.hemma} hemma); frakten går inte (${utan.frakt})`, utan.bruten >= 1 && utan.hemma === 0 && utan.liggande >= 1 && utan.frakt === Infinity && med.frakt < Infinity],
    ];
  },
};

SCENARIER.stenvag = {
  text: 'Steg 10.10.6: stenbron. Vägen av byggsten (Stenlagd väg) föreslås när byn kan bryta och köra sten, och väger dubbelt mot stockvägen mot kostnaden med stenens frakt. En by som inte kan köra hem stenen lägger stock, och frakten kostar mer från ett berg längre bort. En sliten stockväg får sten i stället för att lagas. Stenen brinner inte, och ett hus kan byggas på en vägruta',
  kor: () => {
    const { BYGGATGARDER, MATERIAL, BYGG, newTing, BYN, living, bitsOf, bitAt } = SIM;
    const behov = { fn: 'forbattra', a: { v: 1, plats: 0 }, sc: 0 } as SIM.ByggBehov;
    const by = () => {
      const s = createState(3, START); klockan(s); byggare(s);
      for (const p of living(s)) Object.assign((p.tek ??= {}), { stockvag: 1, byggsten: 1 });
      SIM.planBuild(s); byggKlart(s);
      SIM.setAmount(s, 'virke', 6);
      const m = SIM.bynsMitt(s), g = newTing(s, 'kalke', 1, BYN); g.x = Math.floor(m.x); g.y = Math.floor(m.y);
      return s;
    };
    const s = by(), f = BYGGATGARDER.stockvagA.foresla(s, behov, () => true);
    const forst = f[0], stenForst = forst?.ritning.every(a => a.m === 'stenvag'), stockOcksa = f.some(q => q.ritning.every(a => a.m === 'stockvag'));
    const st = SIM.straken(s), paStrak = !!forst && forst.ritning.some(a => st.ruta[a.y * SIM.W + a.x] > 0);
    // utan kälke går stenen inte att köra hem: byn lägger stock. Och frakten kostar mer ju längre bort berget är
    const s2 = by(); s2.ting = SIM.tingOf(s2).filter(q => q.k !== 'kalke');
    const langt = BYGGATGARDER.stockvagA.foresla(s2, behov, () => true);
    const nara = SIM.stenFraktKostnad(s), fjarr = (() => { const q = createState(5, START); const g = newTing(q, 'kalke', 1, BYN); g.x = 1; g.y = 1; return SIM.stenFraktKostnad(q); })();
    const langtStock = langt.length > 0 && langt.every(q => q.ritning.every(a => a.m === 'stockvag'));
    // en sliten stockväg får sten
    const s3 = by(), r = forst?.ritning[0] ?? { x: 1, y: 1 };
    bitsOf(s3).push({ id: s3.nextBit!++, x: r.x, y: r.y, k: 'golv', m: 'stockvag', b: 1, mat: 1, c: BYGG.laga / 2 }); SIM.touch(s3);
    const f3 = BYGGATGARDER.stockvagA.foresla(s3, behov, () => true), sten3 = f3.find(q => q.ritning[0]?.m === 'stenvag');
    const sliten = !!sten3?.ritning.some(a => a.x === r.x && a.y === r.y);
    // en hel stockväg byts inte
    bitAt(s3, r.x, r.y)!.c = 1; SIM.touch(s3);
    const hel = !BYGGATGARDER.stockvagA.foresla(s3, behov, () => true).some(q => q.ritning.some(a => a.x === r.x && a.y === r.y));
    // stenen brinner inte, stockvägen gör det
    const brinner = !MATERIAL.stenvag.brinner && !!MATERIAL.stockvag.brinner && MATERIAL.stenvag.slit * 5 <= MATERIAL.stockvag.slit + 1e-12;
    // ett hus kan stå på en vägruta
    const s4 = by(), v = bitsOf(s4).length;
    let x4 = -1, y4 = -1;
    for (let y = 5; y < SIM.H - 5 && x4 < 0; y++) for (let x = 5; x < SIM.W - 5; x++) if (SIM.usable(s4, x, y, false, true)) { x4 = x; y4 = y; break; }
    bitsOf(s4).push({ id: s4.nextBit!++, x: x4, y: y4, k: 'golv', m: 'stenvag', b: 1, mat: 1, c: 1 }); SIM.touch(s4);
    const husPa = !SIM.usable(s4, x4, y4, false, true) && SIM.usable(s4, x4, y4, false, true, true) && bitsOf(s4).length === v + 1;
    return [
      [`byn nära berget med kälke föreslår sten först (${forst?.ritning.length} rutor ${forst?.ritning[0]?.m}), och stocken som ett förslag till`, !!stenForst && stockOcksa],
      ['stenen läggs på det mest trampade stråket', paStrak],
      [`en by utan kälke lägger stock (${langt.length} förslag)`, langtStock],
      [`frakten kostar mer från ett berg längre bort (${nara.toFixed(2)} mot ${fjarr.toFixed(2)})`, fjarr > nara],
      ['en sliten stockväg får sten i stället för att lagas', sliten],
      ['en hel stockväg byts inte', hel],
      ['stenen brinner inte och slits fem gånger långsammare', brinner],
      ['ett hus kan byggas på en vägruta', husPa],
    ];
  },
};

SCENARIER.stenvagg = {
  text: 'Steg 10.10.7: väggar av staplad sten. En by med berg nära, seden Förutseende och bränder bakom sig bygger sten; en by med Dagens behov eller utan något att köra stenen på bygger timmer. Stenen brinner inte och rummet är varmare. En timmervägg som rasat byggs upp i sten, och ett timmerhus byter vägg en ruta i taget',
  kor: () => {
    const { MATERIAL, newTing, BYN, living, bitsOf, BYGGATGARDER, vaggVal } = SIM;
    const behov = { fn: 'forbattra', a: { v: 1, plats: 0 }, sc: 0 } as SIM.ByggBehov;
    const by = (sed: number, brann: number, kalke = true) => {
      const s = createState(3, START); klockan(s); byggare(s);
      for (const p of living(s)) Object.assign((p.tek ??= {}), { stockvag: 1, byggsten: 1 });
      s.seder = { ...(s.seder ?? {}), v: { ...(s.seder?.v ?? {}), forsiktighet: sed } } as typeof s.seder;
      (s.stat ??= {})['brand vagg'] = brann;
      if (kalke) { const m = SIM.bynsMitt(s), g = newTing(s, 'kalke', 1, BYN); g.x = Math.floor(m.x); g.y = Math.floor(m.y); }
      return s;
    };
    const s = by(1, 20); SIM.planBuild(s);
    const vaggar = bitsOf(s).filter(b => b.k === 'vagg'), stenHus = vaggar.length > 0 && vaggar.every(b => b.m === 'sten');
    const dagens = vaggVal(by(-1, 20)), utanKalke = vaggVal(by(1, 20, false)), utanBrand = vaggVal(by(1, 0));
    // ett timmerhus: en rasad vägg byggs upp i sten, och väggarna byts en ruta i taget
    const t = by(-1, 0); SIM.planBuild(t); byggKlart(t);
    const timmerHus = bitsOf(t).filter(b => b.k === 'vagg').every(b => b.m === 'timmer');
    t.seder!.v.forsiktighet = 1; t.stat!['brand vagg'] = 20;
    const f = BYGGATGARDER.stenVaggA.foresla(t, behov, () => true), en = f.length === 1 && f[0].ritning.length === 1;
    const w = bitsOf(t).find(b => b.k === 'vagg' && b.x === f[0]?.ritning[0].x && b.y === f[0]?.ritning[0].y)!;
    SIM.rasar(t, w); const uppISten = w?.m === 'sten';
    const medan = BYGGATGARDER.stenVaggA.foresla(t, behov, () => true).length === 0;
    return [
      [`Förutseende, berg nära och bränder bakom sig: huset får stenväggar (${vaggar.length} väggrutor)`, stenHus],
      [`Dagens behov bygger timmer (${dagens}), och utan kälke blir det timmer (${utanKalke})`, dagens === 'timmer' && utanKalke === 'timmer'],
      [`utan bränder bakom sig väljer också den förutseende byn timmer (${utanBrand})`, utanBrand === 'timmer'],
      ['stenväggen brinner inte, är varmare än timmer och slits en femtedel så fort', !MATERIAL.sten.brinner && (MATERIAL.sten.isol ?? 0) > (MATERIAL.timmer.isol ?? 0) && Math.abs(MATERIAL.sten.slit * 5 - MATERIAL.timmer.slit) < 1e-12],
      ['timmerhuset byggdes av timmer', timmerHus],
      ['ett timmerhus byter en väggruta i taget till sten', en],
      ['en vägg som rasat byggs upp i sten', uppISten],
      ['medan en vägg står öppen byts ingen annan', medan],
    ];
  },
};

SCENARIER.ho = {
  text: 'Steg 10.10.9: höet är gräset. En orörd ruta har 3 hö och en nedtrampad 2, varje hö sänker gräset, inget hö under stubben, under träd, på en buske, i hagen eller på ängen, höet kommer tillbaka när gräset växer, och en tomplockad ruta är inte bar jord',
  kor: () => {
    const { hoPaRutan, tandPlocka, groundOf, isSoil, VAG, BUSKE, MARK, BAR, HOUR, growGround } = SIM;
    const s = createState(3, START); klockan(s); s.now += 60 * 24 * HOUR; // sommaren
    const W = SIM.W;
    const g = groundOf(s), m = SIM.bynsMitt(s);
    let i = -1;
    for (let d = 8; d < 40 && i < 0; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { const j = (Math.floor(m.y) + dy) * W + Math.floor(m.x) + dx; if (isSoil(g.tiles[j]) && g.trees[j] === 0 && !SIM.arBuske(g, j) && !g.built?.[j]) { i = j; break; } }
    const x = i % W, y = Math.floor(i / W);
    g.cover[i] = 1; const orord = hoPaRutan(s, x, y);
    g.cover[i] = 0.75; const trampad = hoPaRutan(s, x, y);
    g.cover[i] = 1; tandPlocka(s, 'torrgras', x, y); const lagre = Math.abs(g.cover[i] - (1 - MARK.hoTacke)) < 1e-6 && hoPaRutan(s, x, y) === 2;
    tandPlocka(s, 'torrgras', x, y); tandPlocka(s, 'torrgras', x, y); tandPlocka(s, 'torrgras', x, y);
    const tom = hoPaRutan(s, x, y) === 0, inteBar = g.cover[i] >= MARK.stubb && g.cover[i] >= BAR;
    const fore = g.cover[i]; for (let h = 0; h < 48; h++) { s.now += HOUR; growGround(s, 1, 2); }
    const efter = g.cover[i], tillbaka = hoPaRutan(s, x, y) >= 1 && efter > fore;
    g.cover[i] = 1;
    const t0 = g.trees[i]; g.trees[i] = VAG.ungskog; const trad = hoPaRutan(s, x, y); g.trees[i] = t0;
    const b0 = g.buske![i]; g.buske![i] = BUSKE; const buske = hoPaRutan(s, x, y); g.buske![i] = b0;
    s.hagar = [{ x, y, w: 1, h: 1 } as SIM.Hage]; const hage = hoPaRutan(s, x, y); s.hagar = [];
    s.angar = [{ x, y, w: 1, h: 1 } as NonNullable<SIM.State['angar']>[number]]; const ang = hoPaRutan(s, x, y); s.angar = [];
    const c = SIM.cloneState(s); c.plockat = { 'ho:5': { n: 2, t: s.now }, 'kvist:5': { n: 1, t: s.now } }; SIM.migrate(c);
    const gammal = !c.plockat?.['ho:5'] && !!c.plockat?.['kvist:5'];
    return [
      [`en orörd ruta har 3 hö (${orord}) och en nedtrampad 2 (${trampad})`, orord === 3 && trampad === 2],
      ['ett hö sänker gräset', lagre],
      [`under stubben finns inget hö, och den tomplockade rutan är inte bar jord (${g.cover[i].toFixed(2)})`, tom && inteBar],
      [`höet kommer tillbaka när gräset växer (${fore.toFixed(2)} blev ${efter.toFixed(2)} på två dygn)`, tillbaka],
      [`inget hö under träd (${trad}), på en buske (${buske}), i hagen (${hage}) eller på ängen (${ang})`, trad + buske + hage + ang === 0],
      ['en sparad by rensas från de gamla hötuvorna', gammal],
    ];
  },
};

SCENARIER.djurmotgang = {
  text: 'Steg 10.10.10: djuren i motgångarna. Ett får i tornadons kärna dör, en hönsflock nära mister hela hönor, staketet i kärnan är borta och djuren rymmer genom hålet, ett får på en brinnande ruta dör och staketet där brinner upp, fähusets vägg rasar som en annan vägg, och fältets staket går sönder lika fort med korta som med långa slag',
  env: { BALANS: 'karta.bredd=120,karta.hojd=120,start.klader=0,hage.slit=1' },
  kor: () => {
    let W = SIM.W; const ut: [string, boolean][] = [];
    // tornadon
    {
      const s = createState(5, START); W = SIM.W;
      tandEld(s);
      SIM.skickaTornado(s, 'medel');
      const t = s.tornado!, L = t.L, e = SIM.eldPlats(s);
      const ledig = (x: number, y: number) => SIM.inMap(x, y) && SIM.vattenNu(s)[y * W + x] !== SIM.T.Vatten && !SIM.blocked(s, x, y) && !SIM.stationAt(s, x, y) && !SIM.bitAt(s, x, y) && Math.hypot(x - e.x, y - e.y) > 8;
      const pl: { x: number; y: number; u: number }[] = [];
      for (let u = 0.3; u < 0.9 && pl.length < 3; u += 2.5 / L) {
        const p = SIM.tornadoPos(t, u), x = Math.floor(p.x), y = Math.floor(p.y);
        if (ledig(x, y) && !pl.some(q => Math.abs(q.x - x) < 3 && Math.abs(q.y - y) < 3)) pl.push({ x, y, u });
      }
      if (pl.length < 3) return [['tre lediga rutor mitt på banan', false]];
      const [pf, ph, pv] = pl;
      // fåret i kärnan, hönsen 2,5 rutor vid sidan av banan (nära), staketet på en ruta i kärnan och en vägg av fähuset
      const far = SIM.nyttTamdjur(s, 'far', pf.x + 0.5, pf.y + 0.5);
      const a = SIM.tornadoPos(t, ph.u), b = SIM.tornadoPos(t, ph.u + 1 / L), dl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const hx = a.x - (b.y - a.y) / dl * 2.5, hy = a.y + (b.x - a.x) / dl * 2.5;
      s.hons = { n: 10, x: hx, y: hy, agg: 0 };
      const hage = { id: 77, x: pv.x + 1, y: pv.y - 3, w: 6, h: 6 };
      (s.hagar ??= []).push(hage);
      s.staket = [...(s.staket ?? []), ...SIM.hageKant(s, hage)];
      const hal = pv.y * W + pv.x, harFore = SIM.harStaket(s, hal);
      const bits = SIM.bitsOf(s), id = Math.max(0, ...bits.map(q => q.id)) + 1;
      bits.push({ id, x: ph.x, y: ph.y, k: 'vagg', m: 'timmer', b: 1, mat: 5, c: 1 }); // en vägg i fähuset rasar som alla väggar (rasar i bygg.ts)
      SIM.touch(s);
      for (let k = 0; k < 900 && s.tornado; k++) {
        if (s.tamdjur?.includes(far)) { far.x = pf.x + 0.5; far.y = pf.y + 0.5; }
        if (s.hons && s.hons.n > 0) { s.hons.x = hx; s.hons.y = hy; }
        SIM.step(s, 5);
      }
      const vagg = SIM.bitAt(s, ph.x, ph.y), hon = s.hons?.n ?? 0, staketBorta = harFore && !SIM.harStaket(s, hal);
      ut.push([`fåret i kärnan dog (${s.tamdjur?.includes(far) ? 'lever' : 'dött'})`, !s.tamdjur?.includes(far)]);
      ut.push([`hönsflocken nära mister hela hönor men inte alla (${hon} av 10 kvar)`, hon > 0 && hon < 10 && Number.isInteger(hon)]);
      ut.push([`staketet i kärnan är borta (${staketBorta ? 'borta' : 'kvar'})`, staketBorta]);
      ut.push([`fähusets vägg i kärnan rasade (${vagg && vagg.b >= 1 ? 'står' : 'rasad'})`, !vagg || vagg.b < 1]);
      // ett får i hagen rymmer genom hålet (gräset i hagen har vuxit igen efter tornadon)
      for (const i of SIM.hageRutor(hage)) SIM.groundOf(s).cover[i] = 1;
      const in2 = SIM.nyttTamdjur(s, 'far', hage.x + 1.5, hage.y + 1.5); in2.hage = hage.id;
      const r0 = s.stat?.tamRymde ?? 0;
      for (let k = 0; k < 96 && in2.hage !== undefined; k++) SIM.stepHagar(s); // hagens timmar, utan resten av byn
      ut.push([`fåret i hagen rymde genom hålet (${(s.stat?.tamRymde ?? 0) - r0} rymde)`, in2.hage === undefined]);
    }
    // eldsvådan: fyra får på var sin skogsruta som brinner, och ett staket på en gräsruta
    {
      const s = createState(5, START); W = SIM.W; const g = SIM.groundOf(s), m = SIM.bynsMitt(s);
      const rutor: number[] = [];
      for (let y = 5; y < SIM.H - 5 && rutor.length < 5; y++) for (let x = 5; x < W - 5 && rutor.length < 5; x++) {
        const i = y * W + x;
        if (Math.hypot(x - m.x, y - m.y) < 30 || g.trees[i] < SIM.FOREST || SIM.bitAt(s, x, y) || rutor.some(j => Math.abs(j % W - x) + Math.abs(Math.floor(j / W) - y) < 3)) continue;
        rutor.push(i);
      }
      if (rutor.length < 5) return [...ut, ['fem skogsrutor långt från byn', false]];
      const stk = rutor[4];
      s.staket = [...(s.staket ?? []), stk];
      const fa = rutor.slice(0, 4).map(i => SIM.nyttTamdjur(s, 'far', i % W + 0.5, Math.floor(i / W) + 0.5));
      for (const i of rutor) SIM.tand(s, i, 'blixt', 0);
      const d0 = s.stat?.['brand djur'] ?? 0;
      for (let k = 0; k < 6 * 720 && s.brand; k++) {
        for (const [j, d] of fa.entries()) if (s.tamdjur?.includes(d)) { d.x = rutor[j] % W + 0.5; d.y = Math.floor(rutor[j] / W) + 0.5; }
        SIM.step(s, 5);
      }
      const doda = fa.filter(d => !s.tamdjur?.includes(d)).length;
      ut.push([`fåren på de brinnande rutorna dog (${doda} av 4, ${(s.stat?.['brand djur'] ?? 0) - d0} i elden)`, doda >= 3]);
      ut.push([`staketet på rutan som brann är borta (${SIM.harStaket(s, stk) ? 'kvar' : 'brunnit'}, ${s.stat?.['brand staket'] ?? 0} brunna)`, !SIM.harStaket(s, stk) && (s.stat?.['brand staket'] ?? 0) >= 1]);
    }
    // fältets staket slits per timme: lika många hål med korta som med långa slag (hage.slit=1: ett hål i timmen)
    const hal = (slag: number) => {
      const s = createState(5, START);
      const p = SIM.living(s)[0];
      const f: SIM.Falt = { id: 991, x: Math.floor(p.x) - 8, y: Math.floor(p.y), w: 4, dir: 1, n: 8, agare: p.id, steg: 'bereda', klara: 0, kvar: 0, rord: s.now };
      f.r = Array.from({ length: 8 }, () => ({ st: 'bereda' as const }));
      s.falt = [...(s.falt ?? []), f]; SIM.sammanfatta(f);
      s.staket = [...(s.staket ?? []), ...SIM.staketRutor(s, f)];
      const s0 = s.stat?.staketSonder ?? 0;
      for (let k = 0; k < 6 * 3600 / slag; k++) SIM.step(s, slag);
      return (s.stat?.staketSonder ?? 0) - s0;
    };
    const kort = hal(10), lang = hal(120);
    ut.push([`fältets staket går sönder lika fort med korta som med långa slag (${kort} och ${lang} hål på sex timmar)`, kort === lang && kort >= 5]);
    return ut;
  },
};

SCENARIER.bur = {
  text: 'Steg 10.10.13: buren. Den görs vid fångstbänken av fyra grenar och två rep, sätts ut i skogen utanför byn och fångar en kulting med chansen 0,005 i timmen gånger viltet där. Den som vittjar bär hem kultingen levande, och den blir en ung gris som hen äger och som går lös i byn',
  kor: () => {
    const { RECEPT, FALLOR, STATIONER, TEK, sattUt, vittja, stepBoskap, tamdjurOf, tamUte, tamAlder, tamArt, living, ageOf, ALDER, iByn } = SIM;
    const s = createState(6, START); klockan(s, 10);
    const p = living(s).find(q => ageOf(q, s.now) >= ALDER.vuxen)!;
    const r = RECEPT.bur, recept = r.av.grenar === 4 && r.av.rep === 2 && r.min === 4;
    const tek = TEK.bur, krav = !!tek && tek.krav.includes('fangstbank') && tek.krav.includes('snara');
    const bank = STATIONER.fangstbank.gor.includes('bur') && STATIONER.fangstbank.bara.includes('bur');
    const f = FALLOR.bur, fall = f.fangst === 0.005 && f.plats === 'skog' && f.ger(s, p) === 'kulting' && f.slits > 0;
    const m = sattUt(s, p, 'bur')!, ute = !!m && !iByn(s, m.x, m.y);
    m.fisk = { kulting: 1 }; m.n = 1; vittja(s, p, m); stepBoskap(s);
    const g = tamdjurOf(s).find(d => d.art === 'gris');
    const ung = !!g && tamAlder(s, g) < tamArt('gris').vuxen, agd = g?.agare === p.id, los = !!g && tamUte(s).includes(g);
    const kvar = SIM.amountOf(s, 'kulting');
    return [
      ['buren görs av fyra grenar och två rep på fyra minuter', recept],
      ['tekniken Bur kräver fångstbänken och snaran, och buren görs bara vid fångstbänken', krav && bank],
      ['buren står i skogen, fångar 0,005 i timmen och ger en kulting, och den slits', fall],
      ['buren sätts utanför byn', ute],
      [`kultingen blir en ung gris (${g ? tamAlder(s, g).toFixed(2) : '–'} dygn gammal), ägd av den som vittjade`, ung && agd && kvar === 0],
      ['grisen går lös, så att vargen och rövarna kan ta den', los],
    ];
  },
};

SCENARIER.gris = {
  text: 'Steg 10.10.13: grisen. Ägaren ger den resterna från slakten och skörden före rötterna; de rester grisarna behöver bärs inte till sophögen. Den slaktas när den blir gammal och på hösten när fodret inte räcker över istiden, och slakten ger hela saker',
  kor: () => {
    const { nyttTamdjur, foderFor, mataVal, setAmount, amountOf, slaktOrsak, avlivaKlar, canProcess, bearbeta, DJUR, resterMal, resterOver, soporKlar, DAY, living, ageOf, ALDER } = SIM;
    const s = createState(3, START); klockan(s, 10);
    const p = living(s).find(q => ageOf(q, s.now) >= ALDER.vuxen)!;
    for (const k of ['slaktrens', 'vaxtrest', 'rotter']) setAmount(s, k, 0);
    const g = nyttTamdjur(s, 'gris', p.x + 1, p.y, p.id, s.now - 2 * DAY); g.hunger = 0.9;
    setAmount(s, 'rotter', 10); setAmount(s, 'vaxtrest', 2); setAmount(s, 'slaktrens', 2);
    const f1 = foderFor(s, p, g); setAmount(s, 'slaktrens', 0);
    const f2 = foderFor(s, p, g); setAmount(s, 'vaxtrest', 0);
    const f3 = foderFor(s, p, g), vald = mataVal(s, p) === g;
    // förrådsmålet för resterna
    const mal = resterMal(s);
    setAmount(s, 'slaktrens', mal + 5); soporKlar(s, p);
    const kvarEfter = amountOf(s, 'slaktrens');
    setAmount(s, 'slaktrens', mal); const inget = resterOver(s) === 0;
    // slakten: den unga grisen bara på hösten utan foder, den gamla alltid
    setAmount(s, 'slaktrens', 0); setAmount(s, 'rotter', 0);
    s.kal = SIM.nyKalender(s.now, SIM.HOST);
    const host = slaktOrsak(s, g);
    setAmount(s, 'rotter', 50); const mett = slaktOrsak(s, g);
    s.kal = SIM.nyKalender(s.now, SIM.VAR); setAmount(s, 'rotter', 0); const var_ = slaktOrsak(s, g);
    g.born = s.now - 9 * DAY; const gammal = slaktOrsak(s, g);
    (s.stationer ??= []).push({ id: 9902, k: 'slaktbank', x: Math.floor(p.x) + 2, y: Math.floor(p.y), kvar: 0 }); SIM.touch(s);
    (p.tek ??= {}).kniv = 1; setAmount(s, 'kniv', 1); setAmount(s, 'kott', 200); p.skill.jakt = 100; // köttet efter skickligheten (kottAv): den skickliga får allt
    const fore = { k: amountOf(s, 'svinkott'), b: amountOf(s, 'ben'), sk: amountOf(s, 'svinskinn'), t: amountOf(s, 'talg') };
    avlivaKlar(s, p, g.id);
    const kropp = amountOf(s, 'slaktgris');
    if (canProcess(s, p, DJUR.gris)) bearbeta(s, p, DJUR.gris, 2);
    const fick = { k: amountOf(s, 'svinkott') - fore.k, b: amountOf(s, 'ben') - fore.b, sk: amountOf(s, 'svinskinn') - fore.sk, t: amountOf(s, 'talg') - fore.t };
    const hela = Object.values(fick).every(n => Number.isInteger(n));
    return [
      [`grisen får slaktrensen, sedan växtresterna och sist rötterna (${f1}, ${f2}, ${f3})`, f1 === 'slaktrens' && f2 === 'vaxtrest' && f3 === 'rotter'],
      ['ägaren väljer att mata den hungriga grisen', vald],
      [`resterna grisen behöver (${mal}) bärs inte till sophögen (${kvarEfter} kvar)`, mal >= 1 && kvarEfter === mal && inget],
      [`den unga grisen slaktas på hösten när fodret inte räcker (${host ?? '–'}), inte när det räcker (${mett ?? '–'}) eller på våren (${var_ ?? '–'})`, host === 'host' && !mett && !var_],
      [`den gamla grisen slaktas fast den är ensam (${gammal ?? '–'})`, gammal === 'gammal'],
      [`slakten ger hela saker: ${fick.k} fläsk, ${fick.b} ben, ${fick.sk} skinn, ${fick.t} talg`, kropp === 1 && hela && fick.k === SIM.kottAv(p, 10) && fick.b === 2 && fick.sk === 1 && fick.t === 5],
    ];
  },
};

SCENARIER.drag = {
  text: 'Steg 10.10.14: binas drag. Ängsblommor, bärbuskar och ett bönfält inom räckhåll höjer draget var för sig, utom räckhåll gör de det inte, rovor ger inget, hösten och istiden ger noll, torkan sänker och talet stannar vid 1. Scenariot skriver ut draget i utkanten av de sparade testbyarna',
  kor: () => {
    const { DRAGKALLOR, BIN, drag, dragDelar, takenOf, groundOf, BUSKE, BARBUSKE, nyKalender, VAR, SOMMAR, HOST, ISTID, inMap } = SIM;
    const s = createState(4, START); let W = SIM.W; W = SIM.W;
    s.kal = nyKalender(s.now, VAR);
    // en ruta där ängsblommor växer, med land 15 rutor åt väster: punkten P ligger 5 rutor väster om den
    takenOf(s).blomma!.fill(0);
    let bi = -1; for (let i = 0; i < W * SIM.H && bi < 0; i++) if (i % W >= 25 && i % W < W - 25 && SIM.fyndAt(s, 'blomma', i) > 0.5) bi = i;
    const px = bi % W - 5, py = Math.floor(bi / W);
    // inga blommor och inga buskar någonstans till att börja med
    takenOf(s).blomma!.fill(1);
    const g = groundOf(s); const b0 = g.buske ? g.buske.slice() : undefined; if (g.buske) g.buske.fill(0); else g.buske = new Uint8Array(W * SIM.H);
    s.falt = [];
    const tom = drag(s, px, py);
    // ängsblommorna 5 rutor bort, och samma ruta sedd från 15 rutor bort
    const vid = (dx: number) => (py * W + px + dx);
    takenOf(s).blomma![vid(5)] = 0;
    const blomVid = SIM.fyndAt(s, 'blomma', vid(5)), blomNara = DRAGKALLOR.blomma.summa(s, px, py, VAR, false), blomLangt = DRAGKALLOR.blomma.summa(s, px - 10, py, VAR, false);
    takenOf(s).blomma![vid(5)] = 1;
    // en bärbuske 4 rutor bort och en 14 rutor bort
    g.buske![vid(4)] = BUSKE + BARBUSKE;
    const buskVar = DRAGKALLOR.barbuske.summa(s, px, py, VAR, false), buskSommar = DRAGKALLOR.barbuske.summa(s, px, py, SOMMAR, false), buskTorr = DRAGKALLOR.barbuske.summa(s, px, py, VAR, true);
    g.buske![vid(4)] = 0; g.buske![vid(14)] = BUSKE + BARBUSKE;
    const buskLangt = DRAGKALLOR.barbuske.summa(s, px, py, VAR, false); g.buske![vid(14)] = 0;
    // ett bönfält med fyra rutor som växer, 3 rutor bort; samma fält med rovor; och bönfältet 14 rutor bort
    const falt = (x: number, gr: SIM.GrodaSlag): SIM.Falt => ({ id: 992, x, y: py, w: 4, dir: 1, n: 4, agare: 0, steg: 'vaxer', klara: 4, kvar: 0, rord: s.now, groda: gr, r: [0, 1, 2, 3].map(() => ({ st: 'vaxer' as const, g: gr, v: 0.5 })) });
    s.falt = [falt(px + 3, 'bonor')];
    const bonor = DRAGKALLOR.grodor.summa(s, px, py, VAR, false), bonorHost = dragDelar(s, px, py).grodor;
    s.falt = [falt(px + 3, 'rovor')]; const rovor = DRAGKALLOR.grodor.summa(s, px, py, VAR, false);
    s.falt = [falt(px + 14, 'bonor')]; const bonLangt = DRAGKALLOR.grodor.summa(s, px, py, VAR, false);
    // årstiderna och taket
    s.falt = [falt(px + 3, 'bonor')];
    const iVar = drag(s, px, py);
    s.kal = nyKalender(s.now, HOST); const iHost = drag(s, px, py);
    s.kal = nyKalender(s.now, ISTID); const iIstid = drag(s, px, py);
    s.kal = nyKalender(s.now, VAR);
    takenOf(s).blomma!.fill(0); for (let i = 0; i < W * SIM.H; i++) if (inMap(i % W, Math.floor(i / W))) g.buske![i] = BUSKE + BARBUSKE;
    const fullt = drag(s, px, py);
    if (b0) g.buske!.set(b0);
    // draget i utkanten av de sparade testbyarna, på våren och sommaren (för att kunna sätta BIN.dragFullt)
    const ut: string[] = [];
    for (const dygn of [10, 30]) {
      const t = SIM.cloneState(testBy(dygn)); W = SIM.W;
      const m = SIM.bynsMitt(t), R = Math.ceil(Math.sqrt(SIM.omrade(t).n / Math.PI)) + 3;
      for (const ai of [VAR, SOMMAR]) {
        t.kal = nyKalender(t.now, ai);
        const v = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => { const x = Math.floor(m.x + dx * R), y = Math.floor(m.y + dy * R); return inMap(x, y) ? drag(t, x, y) : 0; });
        ut.push(`${dygn} dygn ${ai === VAR ? 'vår' : 'sommar'}: ${v.map(x => x.toFixed(2)).join(' ')}`);
      }
    }
    console.log(`     draget i utkanten (BIN.dragFullt ${BIN.dragFullt}): ${ut.join('; ')}`);
    return [
      [`utan blommor, buskar och fält är draget noll (${tom})`, tom === 0],
      [`en ruta ängsblommor inom räckhåll ger det den har (${blomNara.toFixed(2)}), utom räckhåll inget (${blomLangt})`, blomNara > 0 && Math.abs(blomNara - blomVid) < 1e-9 && blomLangt === 0],
      [`en bärbuske ger 0,5 på våren (${buskVar}), 0,25 på sommaren (${buskSommar}), 0,3 i torkan (${buskTorr.toFixed(2)}) och inget utom räckhåll (${buskLangt})`, buskVar === 0.5 && buskSommar === 0.25 && Math.abs(buskTorr - 0.3) < 1e-9 && buskLangt === 0],
      [`fyra rutor bönor ger 4 (${bonor}), rovor inget (${rovor}), och bönorna utom räckhåll inget (${bonLangt})`, bonor === 4 && rovor === 0 && bonLangt === 0 && bonorHost === 4],
      [`draget är summan delad med ${BIN.dragFullt} på våren (${iVar}), och noll på hösten (${iHost}) och i istiden (${iIstid})`, Math.abs(iVar - 4 / BIN.dragFullt) < 1e-9 && iHost === 0 && iIstid === 0],
      [`talet stannar vid 1 (${fullt})`, fullt === 1],
    ];
  },
};
SCENARIER.vildbo = {
  text: 'Steg 10.10.15: vildbona syns. Boet syns på sommaren och hösten där vildbinas lager är rikt och ett vuxet träd står, inte på våren och inte där trädet fällts. Samlaren väljer platsen efter honungen som efter svampen, står vid boet och tar BIN.vildTim kakor i timmen, och byn räknar den vilda honungen',
  kor: () => {
    const { BIN, vildboSyns, nyKalender, SOMMAR, HOST, VAR, groundOf, fyndAt, FOREST } = SIM;
    const s = createState(42, START), W = SIM.W;
    s.kal = nyKalender(s.now, SOMMAR);
    let bo = -1; for (let i = 0; i < W * SIM.H && bo < 0; i++) if (fyndAt(s, 'honung', i) >= BIN.boSyns && groundOf(s).trees[i] >= FOREST) bo = i;
    const sommar = bo >= 0 && vildboSyns(s, bo);
    s.kal = nyKalender(s.now, HOST); const host = bo >= 0 && vildboSyns(s, bo);
    s.kal = nyKalender(s.now, VAR); const var_ = bo >= 0 && vildboSyns(s, bo);
    s.kal = nyKalender(s.now, SOMMAR);
    const tr = groundOf(s).trees[bo]; groundOf(s).trees[bo] = 0; const fallt = vildboSyns(s, bo); groundOf(s).trees[bo] = tr;
    // en by utan mat på sommaren i tolv timmar: samlarna hittar bona och bär hem honung
    setMat(s, {}); SIM.setAmount(s, 'ved', 300);
    const tid: number[] = [];
    for (let h = 0; h < 12 * 3600; h++) { SIM.step(s, 1); for (const p of SIM.living(s)) if (p.task?.act === 'samla' && p.task.phase === 'do' && !p.task.hopp && SIM.richness(s, 'honung', Math.floor(p.task.tx) + 0.5, Math.floor(p.task.ty) + 0.5) > 0) tid.push(p.id); }
    const vild = s.stat?.honungVild ?? 0, hemma = SIM.amountOf(s, 'honung');
    const takt = tid.length ? vild / (tid.length / 3600) : 0;
    return [
      [`boet syns på sommaren (${sommar}) och hösten (${host}), inte på våren (${var_}) och inte där trädet fällts (${fallt})`, sommar && host && !var_ && !fallt],
      [`samlarna tog ${vild.toFixed(1)} kakor vild honung och ${hemma} hela kakor kom hem`, vild > 1 && hemma >= 1],
      [`vid boet tas ungefär ${BIN.vildTim} kakor i timmen (${takt.toFixed(2)})`, takt > BIN.vildTim * 0.7 && takt <= BIN.vildTim * 1.05],
    ];
  },
};
SCENARIER.bikupa = {
  text: 'Steg 10.10.16: bikupan. Tekniken prövas fram vid slöjdbänken först när byn tagit 3 honungskakor ur vildbon. Kupan flätas av 4 hö på 2 grenar och byggs i utkanten där draget är störst; ingen byggs där draget är under 0,6 eller medan en tom kupa står. Byggaren äger den, arvingen får den, och den är av sådant som brinner',
  kor: () => {
    const { RECEPT, STATIONER, TEK, BIN, STATION, drag, kupBrist, stationSite, forsokVal, startStation, inherit, heirsOf, takenOf, groundOf, BUSKE, BARBUSKE, nyKalender, SOMMAR, HOST, living, ageOf, ALDER, utanforByn, setAmount } = SIM;
    const s = createState(5, START), W = SIM.W; klockan(s, 10);
    s.kal = nyKalender(s.now, SOMMAR);
    const r = RECEPT.bikupa, recept = r.av.torrgras === 4 && r.av.grenar === 2 && r.min === 10 && STATIONER.bikupa.flera;
    const tek = TEK.bikupa, krav = tek.krav.includes('korg') && tek.niva === 4 && tek.forsok?.vid.includes('flatarbank') && tek.forsok.skill === 'hantverk';
    // försöken: en skicklig slöjdare som kan korgen, vid slöjdbänken, med hö och grenar
    const p = living(s).find(q => ageOf(q, s.now) >= ALDER.vuxen && heirsOf(s, q).length > 0) ?? living(s).find(q => ageOf(q, s.now) >= ALDER.vuxen)!;
    medBank(s, 'flatarbank'); setAmount(s, 'torrgras', 20); setAmount(s, 'grenar', 20); setMat(s, { kott: 200 }); setAmount(s, 'ved', 300);
    p.tek = { ...(p.tek ?? {}), korg: 1, flatarbank: 1, bikupa: 0.9 }; p.skill.hantverk = 12;
    s.stat = { ...(s.stat ?? {}), honungVild: 2.5 }; const fore = forsokVal(s, p)?.id;
    s.stat.honungVild = 3; const efter = forsokVal(s, p)?.id;
    // draget: inga ängsblommor och inga buskar, utom ett snår av bärbuskar en bit öster om byn
    p.tek.bikupa = 1;
    takenOf(s).blomma!.fill(1);
    const g = groundOf(s); g.buske ??= new Uint8Array(W * SIM.H); g.buske.fill(0);
    SIM.touch(s);
    const tom = kupBrist(s, 'bikupa');
    const m = SIM.bynsMitt(s), R = Math.ceil(Math.sqrt(SIM.omrade(s).n / Math.PI)) + 4;
    const sx = Math.floor(m.x + R), sy = Math.floor(m.y);
    for (let dy = -4; dy <= 4; dy++) for (let dx = 0; dx <= 8; dx++) { const i = (sy + dy) * W + sx + dx; if (SIM.inMap(sx + dx, sy + dy)) g.buske[i] = BUSKE + BARBUSKE; }
    s.now += SIM.HOUR; SIM.touch(s); // platsen räknas om
    const at = stationSite(s, 'bikupa'), dAt = at ? drag(s, at.x, at.y) : 0, avst = at ? utanforByn(s, at.x, at.y) : -1;
    const motSnar = !!at && at.x >= m.x; // på snårets sida av byn
    const motsatt = drag(s, Math.floor(m.x - R), sy);
    const brist = kupBrist(s, 'bikupa');
    s.kal = nyKalender(s.now, HOST); const host = kupBrist(s, 'bikupa'); s.kal = nyKalender(s.now, SOMMAR);
    // byggaren
    const tk = { act: 'station', tool: 'bikupa', phase: 'do', until: s.now } as SIM.Task;
    startStation(s, p, tk);
    const kupa = SIM.stationerOf(s).find(t => t.k === 'bikupa');
    const agd = kupa?.ag === p.id;
    if (kupa) kupa.kvar = 0;
    const medTom = kupBrist(s, 'bikupa');
    // arvet
    const arv = heirsOf(s, p); inherit(s, p);
    const arvd = !arv.length || arv.some(q => q.id === kupa?.ag);
    const brinner = Object.keys(STATIONER.bikupa.av).every(k => !SIM.SAKER[k]?.brinnerInte);
    return [
      ['kupan flätas av 4 hö på 2 grenar på 10 minuter, och byn kan ha flera', recept],
      ['tekniken Bikupa (nivå 4) kräver korgen och prövas fram vid slöjdbänken med hantverket', !!krav],
      [`försöken börjar först när byn tagit 3 kakor ur vildbon (vid 2,5: ${fore ?? 'inget'}, vid 3: ${efter ?? 'inget'})`, fore !== 'bikupa' && efter === 'bikupa'],
      [`utan något som blommar vill byn ingen kupa (${tom})`, tom === 0],
      [`kupan ska stå i utkanten (${avst.toFixed(1)} rutor från byn, högst ${STATION.kupaTill}) vid snåret, där draget är ${dAt.toFixed(2)} (på andra sidan byn ${motsatt.toFixed(2)})`, !!at && avst >= STATION.utkantMin && avst <= STATION.kupaTill && motSnar && dAt > motsatt],
      [`draget där är minst ${BIN.dragNog}: byn vill ha en kupa (${brist}), men inte på hösten (${host})`, dAt >= BIN.dragNog && brist === 1 && host === 0],
      [`byggaren äger kupan (${kupa?.ag} = ${p.id}), och medan den står tom vill byn ingen till (${medTom})`, agd && medTom === 0],
      [`arvingen får kupan (${arv.map(q => q.id).join(', ') || 'inga arvingar'} → ${kupa?.ag})`, arvd && arv.length > 0],
      ['kupan är av hö och grenar, som brinner, så eldsvådan tar den som andra stationer', brinner],
    ];
  },
};
SCENARIER.bisvarm = {
  text: 'Steg 10.10.17: svärmen flyttar in. En tom kupa nära rika vildbon får bin på sommaren men aldrig på våren, hösten eller i istiden, och utan vildbin inom räckhåll kommer ingen svärm. Svärmarna kommer lika ofta med korta som med långa slag, två samhällen intill varandra får halva draget var, en andra kupa byggs först när den första har bin, och en kupa som brinner tar samhället med sig',
  kor: () => {
    const { BIN, binSteg, samhallen, dragDelat, drag, svarmTillgang, kupBrist, stationSite, takenOf, groundOf, BUSKE, BARBUSKE, nyKalender, VAR, SOMMAR, HOST, ISTID, HOUR, taBort, formogenheter } = SIM;
    const s = createState(5, START), W = SIM.W; klockan(s, 10);
    s.kal = nyKalender(s.now, SOMMAR);
    // den rikaste platsen för svärmar på kartan, som inte är vatten
    let bx = 0, by = 0, bv = -1;
    for (let y = 25; y < SIM.H - 25; y += 3) for (let x = 25; x < W - 25; x += 3) { const v = svarmTillgang(s, x, y); if (v > bv) { bv = v; bx = x; by = y; } }
    const kupa = (n: number, x = bx, y = by): SIM.Station[] => Array.from({ length: n }, () => { const t: SIM.Station = { id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'bikupa', x, y, kvar: 0 }; (s.stationer ??= []).push(t); return t; });
    const rensa = () => { s.stationer = (s.stationer ?? []).filter(t => t.k !== 'bikupa'); };
    // en sommar (7 dygn) i slag om dt sekunder: hur stor del av n tomma kupor som fick bin
    const sommar = (ai: number, n: number, dt: number, timmar = 168) => { rensa(); const k = kupa(n); const t0 = s.now; s.kal = nyKalender(s.now, ai); for (let t = 0; t < timmar * 3600; t += dt) { s.now = t0 + t * 1000; binSteg(s, dt); } s.now = t0; return k.filter(q => q.bi !== undefined).length / n; };
    const iSommar = sommar(SOMMAR, 200, 14400), vantat = 1 - Math.exp(-168 / 48 * bv);
    const andra = [VAR, HOST, ISTID].map(ai => sommar(ai, 50, 14400));
    const kort = sommar(SOMMAR, 400, 600, 24), lang = sommar(SOMMAR, 400, 14400, 24);
    s.kal = nyKalender(s.now, SOMMAR);
    const sparat = takenOf(s).honung!.slice(); takenOf(s).honung!.fill(1); const utanVild = sommar(SOMMAR, 50, 14400); takenOf(s).honung!.set(sparat);
    const notisen = (s.notiser?.lista ?? []).some(q => q.id === 'bin');
    // draget: buskar överallt, två samhällen intill varandra får halva var
    rensa(); s.kal = nyKalender(s.now, SOMMAR);
    const g = groundOf(s); g.buske ??= new Uint8Array(W * SIM.H); for (let i = 0; i < W * SIM.H; i++) g.buske[i] = BUSKE + BARBUSKE;
    takenOf(s).blomma!.fill(0);
    const [a, b] = kupa(2); a.bi = 2; b.bi = 2;
    const ensam = drag(s, a.x, a.y), delat = dragDelat(s, a.x, a.y, a);
    rensa();
    // en andra kupa: medan den första står tom vill byn ingen till, men när den har bin
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!; p.tek = { ...(p.tek ?? {}), bikupa: 1 };
    s.now += HOUR; SIM.touch(s);
    const at = stationSite(s, 'bikupa')!, [forsta] = kupa(1, at.x, at.y); forsta.ag = p.id; SIM.touch(s);
    const medTom = kupBrist(s, 'bikupa');
    forsta.bi = 2; s.now += HOUR; SIM.touch(s);
    const medBin = kupBrist(s, 'bikupa'), andraPlats = stationSite(s, 'bikupa');
    const rik = formogenheter(s).egen.get(p.id) ?? 0; forsta.bi = undefined; const fattig = formogenheter(s).egen.get(p.id) ?? 0; forsta.bi = 2;
    // branden tar kupan, och samhället med den
    const fore = samhallen(s).length; taBort(s, forsta); const efter = samhallen(s).length;
    return [
      [`på sommaren får ${(iSommar * 100).toFixed(0)} % av de tomma kuporna bin (väntat ${(vantat * 100).toFixed(0)} %, tillgången ${bv.toFixed(2)})`, Math.abs(iSommar - vantat) < 0.12 && iSommar > 0],
      [`på våren, hösten och i istiden kommer ingen svärm (${andra.join(', ')})`, andra.every(v => v === 0)],
      [`utan vildbin inom räckhåll kommer ingen (${utanVild})`, utanVild === 0],
      [`svärmarna kommer lika ofta med 10 minuters slag (${(kort * 100).toFixed(0)} %) som med fyra timmars (${(lang * 100).toFixed(0)} %)`, Math.abs(kort - lang) < 0.08],
      ['byns första bisamhälle får en notis', notisen],
      [`två samhällen intill varandra delar på draget (${ensam.toFixed(2)} → ${delat.toFixed(2)})`, Math.abs(delat - ensam / 2) < 1e-9],
      [`medan den första kupan står tom vill byn ingen till (${medTom}); när den har bin vill den det (${medBin}), en bit bort (${andraPlats ? Math.hypot(andraPlats.x - at.x, andraPlats.y - at.y).toFixed(1) : '–'} rutor)`, medTom === 0 && medBin === 1 && !!andraPlats],
      [`samhället räknas i ägarens rikedom (${fattig.toFixed(0)} → ${rik.toFixed(0)})`, Math.abs(rik - fattig - BIN.varde) < 1e-6],
      [`en kupa som brinner tar samhället med sig (${fore} → ${efter})`, fore === 1 && efter === 0],
    ];
  },
};
