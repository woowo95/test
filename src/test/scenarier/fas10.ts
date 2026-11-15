// Scenarierna för fas 10 från och med 10.10 (fler djur, kälken, släden …)
import { createState } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, byggKlart, byggare, kor, klockan, medBank, setMat } from './hjalp';

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
