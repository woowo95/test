// Scenarier. Redskap: stenring, spjut, redskap, slitage och teknik.
import { createState, addTool, twineRope, makeTool, wearUsed, isSpear, step, living, cloneState, pilesOf, zoneOf, amountOf, wearStore, dropLoad, isLight, T, condOf, FOOD, isStored, ageOf, spears, SPJUT_FORSOK, getMap, DAY, HOUR, W, State, takenOf, migrate, campCenter, TEKNIK, knows, thinkWhileWorking, die, isWall, H, richness, setAmount, BEAT, tingOf, wantsTool, makeTask, wantsFlint, ALDER, KROPP, inMap, canLight, dangers, toolGain, chooseTask } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { setItems, setMat, setFood, kor, klockan, tandEld, bastaJaktruta, SCENARIER, medBank } from './hjalp';

SCENARIER.stenring = {
  text: 'Den första elden läggs i en ring av stenar som samlas in, och tänds med flinta. Ringen ligger kvar när elden slocknat',
  kor: () => {
    const s = createState(1, START);
    let h = 0;
    while (!s.fire.lightings && h < 24 * 4) { kor(s, 1); h++; }
    const tand = s.fire.lightings > 0, ring = !!s.fire.ring, kvar = amountOf(s, 'sten');
    Object.assign(s.fire, { lit: false, fuel: 0, emberUntil: undefined }); // elden slocknar
    kor(s, 2);
    // en äldre sparfil med gniststen: den blir flinta, och byn som haft eld har sin ring
    const g = createState(2, START);
    g.items = { gniststen: 1 }; g.stackar = [{ k: 'gniststen', n: 1, x: 1, y: 1, c: 1 }]; g.fire.lightings = 3;
    delete (g.fire as { ring?: boolean }).ring;
    g.v = 1; migrate(g); // som en sparfil från före v40
    // flinta till en yxa är en förbättring: när maten inte räcker letar ingen efter den. Flinta till elden letas ändå
    const f = createState(4, START);
    f.now = new Date(f.now).setHours(10, 0, 0, 0); Object.assign(f.fire, { lit: true, fuel: 3, ring: true });
    const letar = (flinta: number, mat: number) => {
      setItems(f, { flinta, torrgras: 20, grenar: 20 }); setFood(f, mat); let n = 0, samla = 0;
      for (let i = 0; i < 300; i++) {
        const p = living(f).filter(q => ageOf(q, f.now) >= ALDER.vuxen)[i % 4];
        Object.assign(p, { toa: 1, warm: 1, rest: 1, health: 1, hunger: 1, social: 1, task: undefined });
        chooseTask(f, p); if (p.task?.sok) n++; if (p.task?.act === 'samla') samla++;
      }
      return `${n} av ${samla}`;
    };
    const yxaSvalt = letar(1, 2), eldSvalt = letar(0, 2), yxaMat = letar(1, 200);
    // den som skulle leta flinta men i stället flätar en korg gör det vid slöjdbänken (inne i huset, steg 2.2.5), inte vid stenarna
    let korgar = 0, korgFel = 0;
    for (const q of f.people) q.tek = { ...q.tek, korg: 1 };
    setItems(f, { flinta: 0, torrgras: 20, grenar: 20 }); setFood(f, 2);
    const fm = SIM.vidStation(medBank(f, 'flatarbank'));
    for (let i = 0; i < 300; i++) {
      const p = living(f).filter(q => ageOf(q, f.now) >= ALDER.vuxen)[i % 4];
      Object.assign(p, { toa: 1, warm: 1, rest: 1, health: 1, hunger: 1, social: 1, task: undefined });
      chooseTask(f, p);
      if (p.task?.act === 'korg') { korgar++; if (p.task.sok || p.task.tandmat || Math.hypot(p.task.tx - fm.x, p.task.ty - fm.y) > 1.5) korgFel++; }
      p.task = undefined;
    }
    for (const q of f.people) if (q.tek) delete q.tek.korg;
    setItems(f, { flinta: 1, torrgras: 20, grenar: 20 }); setFood(f, 200); // som efter letar(1, 200)
    // en i taget: letar någon redan (flaggan sok, vad skälet än säger) letar ingen annan flinta till en yxa
    const [l0, ...andra] = living(f).filter(q => ageOf(q, f.now) >= ALDER.vuxen);
    let fler = 0;
    for (let i = 0; i < 100; i++) {
      const p = andra[i % andra.length];
      l0.task = { act: 'samla', phase: 'do', tx: l0.x, ty: l0.y, until: f.now + HOUR, carry: 0, why: 'Samlar.', dark: false, sok: true };
      Object.assign(p, { toa: 1, warm: 1, rest: 1, health: 1, hunger: 1, social: 1, task: undefined });
      chooseTask(f, p); if (p.task?.sok) fler++; p.task = undefined;
    }
    // den som hämtar tändmaterial åt en släckt eld fortsätter på en plats utan bär, och slutar när tändmaterialet räcker
    const r = createState(4, START), rm = getMap(r.seed);
    r.now = new Date(r.now).setHours(10, 0, 0, 0); Object.assign(r.fire, { lit: false, fuel: 0, emberUntil: undefined, ring: true });
    setItems(r, { flinta: 1 }); setFood(r, 100);
    const th = living(r).find(q => ageOf(q, r.now) >= ALDER.vuxen)!;
    Object.assign(th, { toa: 1, warm: KROPP.kallt - 0.05, rest: 1, health: 1, hunger: 1, social: 1, task: undefined });
    chooseTask(r, th);
    const tom = (() => { const c = campCenter(r); for (let d = 4; d < 30; d++) for (let k = 0; k < 16; k++) { const x = Math.floor(c.x + Math.cos(k / 16 * 6.283) * d), y = Math.floor(c.y + Math.sin(k / 16 * 6.283) * d); if (inMap(x, y) && rm.tiles[y * W + x] !== T.Vatten && !isWall(r, x + 0.5, y + 0.5) && richness(r, 'samla', x + 0.5, y + 0.5) < 0.01) return { x: x + 0.5, y: y + 0.5 }; } })()!;
    const valt = th.task?.act === 'samla' && !!th.task.tandmat;
    Object.assign(th.task!, { tx: tom.x, ty: tom.y, phase: 'do', until: r.now + 3 * HOUR }); th.x = tom.x; th.y = tom.y;
    kor(r, 0.5);
    const fortsatt = th.task?.act === 'samla' && th.task.phase === 'do' && th.task.tx === tom.x && th.task.ty === tom.y && (th.task.items?.torrgras ?? 0) > 0;
    setItems(r, { flinta: 1, torrgras: 50, grenar: 50 }); kor(r, 0.25);
    const slutat = !(th.task?.act === 'samla' && th.task.phase === 'do' && th.task.tx === tom.x && th.task.ty === tom.y);
    // elden tänds bara om det finns bränsle kvar sedan grenarna till tändningen tagits (flintan tar 3 grenar)
    const bransle = (grenar: number) => { const b = createState(2, START); setItems(b, { flinta: 1, torrgras: 6, grenar }); setAmount(b, 'ved', 0); b.fire.ring = true; return canLight(b); };
    const tand5 = bransle(5), tand6 = bransle(6);
    // redskap räknas i styck, som yxorna i skog.ts: en flinta och en sliten yxa räcker, och ingen letar mer
    const sl = createState(2, START); setItems(sl, { flinta: 1 }); addTool(sl, 'yxa', living(sl)[0]); for (const x of tingOf(sl)) if (x.k === 'yxa') x.c = 0.5;
    const slitenYxa = wantsFlint(sl);
    return [
      [`en sliten yxa räknas som en yxa när byn vill ha flinta (${slitenYxa ? 'vill ha mer' : 'räcker'})`, !slitenYxa],
      [`elden tänds bara med bränsle kvar efter tändgrenarna (5 grenar: ${tand5 ? 'ja' : 'nej'}, 6 grenar: ${tand6 ? 'ja' : 'nej'})`, !tand5 && tand6],
      [`en korg flätas vid slöjdbänken, inte där flintan skulle letas (${korgFel} av ${korgar} korgar fel)`, korgar > 0 && korgFel === 0],
      [`en i taget letar flinta till en yxa (${fler} till av 100 när någon redan letar)`, fler === 0],
      [`den som hämtar tändmaterial (${valt ? 'vald' : 'inte vald'}) fortsätter på en plats utan bär (${fortsatt ? 'ja' : 'nej'}) och slutar när det räcker (${slutat ? 'ja' : 'nej'})`, valt && fortsatt && slutat],
      [`flinta till en yxa letas inte när maten är knapp (${yxaSvalt} som samlar letar), men när den räcker (${yxaMat}); flinta till elden letas ändå (${eldSvalt})`, yxaSvalt.startsWith('0 ') && !yxaMat.startsWith('0 ') && !eldSvalt.startsWith('0 ')],
      [`stenar samlas och elden tänds (efter ${h} timmar)`, tand],
      [`stenarna blir en ring runt elden (${kvar.toFixed(1)} stenar kvar i förrådet)`, ring && kvar < 1],
      ['elden tänds med flinta, gniststen finns inte', s.fire.log.some(e => e.k === 'tänd') && !(s.stackar ?? []).some(a => a.k === 'gniststen')],
      ['ringen ligger kvar när elden slocknat', !!s.fire.ring],
      ['äldre sparfil: gniststenen blir flinta och ringen finns', amountOf(g, 'flinta') === 1 && !('items' in g) && g.stackar!.every(a => a.k !== 'gniststen') && !!g.fire.ring],
    ];
  },
};

SCENARIER.fiskespjut = {
  text: 'Ett fiskespjut täljs av en pinne med flinta eller yxa, ger mer fisk än händerna och slits fort',
  kor: () => {
    const s = createState(4, START);
    setItems(s, { grenar: 10, flinta: 1 });
    tandEld(s); // elden brinner, så att ingen behöver leta stenar och flinta
    for (const q of s.people) q.tek = { fiskespjut: 1 }; // alla kan tälja spjut från början
    const p = living(s)[0]!;
    makeTool(s, p, 'spjut');
    const gjort = spears(s) === 1 && amountOf(s, 'flinta') === 1; // flintan finns kvar
    // en sliten yxa är en yxa (natur-25): med en yxa i halvt skick och ingen flinta kan man tälja ett spjut, och byn vill
    // inte leta flinta till yxor när den har en flinta och en yxa
    const y = createState(4, START);
    const yp = living(y).find(q => ageOf(q, y.now) >= 16)!;
    setItems(y, { grenar: 10, flinta: 0 }); y.ting = []; addTool(y, 'yxa', yp); tingOf(y)[0].c = 0.5;
    for (const q of y.people) q.tek = { fiskespjut: 1 };
    y.stat = { ...(y.stat ?? {}), fiskeForsok: 1 };
    const sliten = wantsTool(y, yp, 'spjut') && makeTask(y, yp, 'spjut').text.includes('yxan');
    setAmount(y, 'flinta', 1);
    const ingenFlinta = !wantsFlint(y);
    s.stat = { ...(s.stat ?? {}), fiskeForsok: 1 };
    setFood(s, 3); // byn behöver mat
    kor(s, 4 * 24);
    const st = s.stat!, hand = (st.fiskeForsok ?? 0) - (st.spjutForsok ?? 0);
    const takt = (f: number, n: number) => n ? f / n : 0;
    return [
      ['spjutet täljs och det vassa verktyget finns kvar', gjort],
      ['en yxa i halvt skick räcker för att tälja ett spjut', sliten],
      ['en flinta och en sliten yxa är två av de två flintor och yxor byn vill ha', ingenFlinta],
      [`spjutet används (${st.spjutForsok ?? 0} försök med spjut, ${hand} med händerna)`, (st.spjutForsok ?? 0) > 20],
      [`spjut ger mer fisk per försök (${takt(st.spjutFisk ?? 0, st.spjutForsok ?? 0).toFixed(2)} mot ${takt((st.fisk ?? 0) - (st.spjutFisk ?? 0), hand).toFixed(2)})`, hand < 20 || takt(st.spjutFisk ?? 0, st.spjutForsok ?? 0) > takt((st.fisk ?? 0) - (st.spjutFisk ?? 0), hand)],
      [`spjuten går sönder efter ${SPJUT_FORSOK} försök (${st.spjutTrasiga ?? 0} trasiga, ${st.spjutGjorda ?? 0} täljda)`, (st.spjutTrasiga ?? 0) >= 1 && (st.spjutGjorda ?? 0) >= 2],
    ];
  },
};

SCENARIER.redskap = {
  text: 'Rep tvinnas av hö vid elden. Flintspjut (gren, flinta, rep) håller längre än träspjut och används till fiske och jakt. Metspö (gren, rep, ben) med mask ger mest fisk',
  kor: () => {
    const s = createState(4, START);
    setItems(s, { grenar: 20, flinta: 3, torrgras: 40, ben: 2 });
    tandEld(s);
    for (const q of s.people) q.tek = { fiskespjut: 1, rep: 1, flintspjut: 1, metspo: 1 };
    const p = living(s).find(q => ageOf(q, s.now) >= 18)!;
    twineRope(s, p, 2 / 15); // femton rep i timmen sedan steg 2.3.8: två på åtta minuter
    const rep = amountOf(s, 'rep') === 2 && amountOf(s, 'torrgras') === 36;
    makeTool(s, p, 'spjut');
    const flint = amountOf(s, 'flintspjut') === 1 && amountOf(s, 'flinta') === 2 && amountOf(s, 'rep') === 1 && !amountOf(s, 'fiskespjut');
    p.task = { act: 'fiske', phase: 'do', tx: p.x, ty: p.y, until: s.now + HOUR, carry: 0, tool: 'flintspjut' };
    for (let i = 0; i < 60; i++) wearUsed(s, p, 1);
    const haller = spears(s) === 1 && Math.abs(amountOf(s, 'flintspjut') - 0.75) < 1e-9; // 60 försök tar en fjärdedel
    makeTool(s, p, 'metspo');
    const spo = amountOf(s, 'metspo') === 1 && amountOf(s, 'ben') === 1 && amountOf(s, 'rep') === 0;
    // jakt med flintspjutet: fångar kaniner, och spjutet slits
    const { x: bx, y: by } = bastaJaktruta(s, 30) ?? campCenter(s);
    const vilt0 = amountOf(s, 'vilt'), sp0 = amountOf(s, 'flintspjut');
    let medSpjut = 0;
    for (let i = 0; i < 12 * 3; i++) {
      p.task = { act: 'jakt', phase: 'do', tx: bx, ty: by, until: s.now + HOUR, carry: 0, tool: 'flintspjut', why: 'prov', dark: !isLight(s.now) };
      p.x = bx; p.y = by; step(s, BEAT);
      if (p.task?.act === 'jakt' && isSpear(p.task.tool)) medSpjut++;
    }
    const jakt = (amountOf(s, 'vilt')) > vilt0 && amountOf(s, 'flintspjut') < sp0;
    // byn fiskar själv åtta dygn: metspö, spjut och händer. Spjutet används först när metspöet inte räcker, och hur
    // ofta beror mycket på byn: i v51 prövades det 77–765 gånger på åtta dygn i byarna 4–11 (43–816 före v51), så
    // kontrollen kräver bara att det används alls
    setFood(s, 3);
    kor(s, 8 * 24, q => { if ((amountOf(q, 'ben')) < 1) setAmount(q, 'ben', 1); if ((amountOf(q, 'flinta')) < 3) setAmount(q, 'flinta', 3); });
    const st = s.stat!, takt = (f: number, n: number) => n ? f / n : 0;
    const met = takt(st.metFisk ?? 0, st.metForsok ?? 0), spjut = takt(st.spjutFisk ?? 0, st.spjutForsok ?? 0);
    // i byn fiskar man med spjutet på andra platser och tider än med metspöet, och 100 försök är för få för att skilja
    // dem åt. Därför prövas båda vid den rikaste stranden i en ny by, med samma fiskare, 2000 försök var på var sin kopia
    const ny = createState(s.seed, START), fiskare = living(ny).find(q => ageOf(q, ny.now) >= 18)!;
    const strand = (() => { const m = getMap(ny.seed); let bast = 0, b = { x: 0, y: 0 };
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const v = richness(ny, 'fiske', x + 0.5, y + 0.5); if (v > bast && m.tiles[y * W + x] !== T.Vatten) { bast = v; b = { x: x + 0.5, y: y + 0.5 }; } }
      return b; })();
    const prova = (don: 'metspo' | 'flintspjut') => {
      const c = cloneState(ny), f = living(c).find(q => q.id === fiskare.id)!, rd = SIM.ACTS.fiske.redskap![don]!;
      // en fångad fisk tar fisken på platsen (takeFrom); den läggs tillbaka, så att varje försök har samma chans
      let n = 0; for (let i = 0; i < 2000; i++) { const k = SIM.handFish(c, f, strand.x, strand.y, 1, rd); n += k; if (k) takenOf(c).fiske?.fill(0); }
      return n / 2000;
    };
    const metLika = prova('metspo'), spjutLika = prova('flintspjut');
    // en korg som kan göras räknas i valet av arbete bara när den görs: inte när kylan är en fara (elden släckt och alla fryser)
    const k = createState(4, START);
    setItems(k, { torrgras: 40 }); medBank(k, 'flatarbank'); Object.assign(k.fire, { lit: false, fuel: 0, emberUntil: undefined });
    for (const q of k.people) { q.tek = { korg: 1 }; q.warm = KROPP.kallt - 0.1; }
    const kp = living(k).find(q => ageOf(q, k.now) >= 18)!, kf = dangers(k);
    const korgVarm = toolGain(k, kp, 'samla', { kyla: false, svalt: false, gras: 0 }), korgKall = toolGain(k, kp, 'samla', kf);
    return [
      [`en korg som kan göras räknas inte när kylan är en fara (${korgKall} i kylan, ${korgVarm} annars)`, kf.kyla && korgVarm > 1 && korgKall === 1],
      [`rep tvinnas av hö (2 rep av 4 hö på åtta minuter)`, rep],
      ['ett flintspjut görs av gren, flinta och rep, och en flinta sparas till elden', flint],
      ['flintspjutet håller fyra gånger så länge som ett träspjut', haller],
      ['ett metspö görs av gren, rep och ben', spo],
      [`jakt med spjut fångar kaniner, och spjutet slits (${medSpjut} av 36 steg med spjut)`, jakt && medSpjut > 30],
      [`metspöet och spjutet används (${st.metForsok ?? 0} försök med metspö, ${(met * 100).toFixed(0)} % fångst; ${st.spjutForsok ?? 0} med spjut, ${(spjut * 100).toFixed(0)} %)`, (st.metForsok ?? 0) > 20 && (st.spjutForsok ?? 0) > 20],
      [`metspöet ger mest fisk per försök på samma plats (${(metLika * 100).toFixed(0)} % mot spjutets ${(spjutLika * 100).toFixed(0)} %, 2000 försök var)`, metLika > spjutLika && spjutLika > 0],
    ];
  },
};

SCENARIER.slitage = {
  text: 'Varje stack har ett skick: fisk ruttnar fortast, utanför lagret slits allt fortare, redskap slits i lagret och när de används (yxan per träd, steg 2.3.12), skämd mat gör folk sjuka och högar på marken bärs in (på natten bara nära lägret)',
  kor: () => {
    const setup = (b: State) => { setMat(b, { fisk: 20, bar: 20 }); setAmount(b, 'ved', 25); setItems(b, { grenar: 50, yxa: 1 }); };
    const a = createState(4, START); setup(a);
    const b = createState(4, START); setup(b);
    b.lagren = [{ ...zoneOf(b), w: 1, h: 1 }]; // för litet: det mesta ligger bredvid
    wearStore(a, 24 * 3600); wearStore(b, 24 * 3600);
    const skick = (s: State, k: string) => { const p = pilesOf(s).filter(q => q.k === k); return p.reduce((x, q) => x + condOf(q) * q.n, 0) / Math.max(1e-9, p.reduce((x, q) => x + q.n, 0)); };
    const fisk = skick(a, 'fisk'), bar = skick(a, 'bar'), grenIn = 1 - skick(a, 'grenar'), grenUt = 1 - skick(b, 'grenar');
    const yxa = amountOf(a, 'yxa');
    // ved som slits ut blir grenar
    const v = pilesOf(a).find(q => q.k === 'ved')!; a.stackar!.find(q => q.x === v.x && q.y === v.y)!.c = 0.0001;
    wearStore(a, 3600);
    // skämd mat: allt i förrådet är nästan förstört
    const m = createState(6, START);
    setFood(m, 200); pilesOf(m); for (const st of m.stackar!) st.c = 0.08;
    kor(m, 24, s => { for (const st of s.stackar!) if (FOOD.includes(st.k)) st.c = Math.min(st.c, 0.08); });
    const sjuka = m.stat?.skamdMat ?? 0, tagg = living(m).some(p => p.sickWhy === 'Magsjuk av skämd mat');
    // högar på marken: en nära elden och en långt bort, mitt i natten
    const mp = getMap(5), f = mp.fire, land = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < 40 && mp.tiles[y * W + x] !== T.Vatten && mp.tiles[y * W + x] !== T.Sten;
    const n = createState(5, START);
    klockan(n, 23);
    let nara: { x: number; y: number } | undefined, langt: { x: number; y: number } | undefined;
    for (let y = 0; y < 40; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - f.x, y - f.y);
      if (!nara && d >= 2.5 && d < 3.5 && land(x, y) && !isStored(n, x, y)) nara = { x, y };
      if (!langt && d >= 13 && d < 16 && land(x, y)) langt = { x, y };
    }
    const t0 = { act: 'samla' as const, phase: 'do' as const, tx: 0, ty: 0, until: 0, carry: 8, why: '', dark: true };
    dropLoad(n, { ...t0 }, nara!.x + 0.5, nara!.y + 0.5); dropLoad(n, { ...t0, act: 'ved' as const }, langt!.x + 0.5, langt!.y + 0.5);
    const ute = () => pilesOf(n).filter(p => !p.stored);
    const lagd = ute().length;
    for (let i = 0; i < 3 * 3600 / 2 && !isLight(n.now); i++) step(n, 2);
    const kvarNara = ute().some(g => g.x === nara!.x && g.y === nara!.y), kvarLangt = ute().some(g => g.x === langt!.x && g.y === langt!.y);
    klockan(n, 9);
    for (let i = 0; i < 6 * 3600 / 2 && ute().length; i++) step(n, 2);
    // yxan slits för varje träd som faller (steg 2.3.12), inte per timme: att hugga trä ur stammen sliter den inte mer
    const y = createState(4, START), yp = living(y).find(q => ageOf(q, y.now) >= 18)!;
    const yx = addTool(y, 'yxa', yp), PER = 1 / SIM.ACTS.falla.redskap!.yxa.haller!;
    const g = SIM.groundOf(y), c = campCenter(y);
    const trad = () => { for (let d = 1; d < 30; d++) for (let yy = c.y - d; yy <= c.y + d; yy++) for (let x = c.x - d; x <= c.x + d; x++) if (g.trees[yy * W + x] >= 0.95) return yy * W + x; return -1; };
    const falla = (ti: number) => {
      const ft: SIM.Task = { act: 'falla', phase: 'do', tx: (ti % W) + 0.5, ty: Math.floor(ti / W) + 0.5, until: 0, carry: 0, tool: 'yxa' };
      yp.x = ft.tx; yp.y = ft.ty; yx.hos = yp.id; yp.task = ft; SIM.startWork(y, yp, ft);
      for (let i = 0; i < 1800 && yp.task === ft; i++) step(y, 2);
      return ft;
    };
    const ti = trad(), c0 = yx.c;
    falla(ti);
    const ettTrad = g.trees[ti] === 0 && Math.abs(c0 - yx.c - PER) < PER * 0.05; // (och lite av att den bärs)
    const hugg: SIM.Task = { act: 'hugga', phase: 'do', tx: yp.x, ty: yp.y, until: y.now + HOUR, carry: 0, tool: 'yxa', ref: SIM.stocks(y)[0]?.id };
    yx.hos = yp.id; yp.task = hugg;
    const c1 = yx.c;
    for (let i = 0; i < 1800 && yp.task === hugg; i++) step(y, 2);
    const huggSlits = c1 - yx.c;
    // när yxan går sönder faller trädet ändå, och sedan slutar man
    yx.c = PER / 2;
    const t2 = trad(), ft2 = falla(t2);
    const slutar = g.trees[t2] === 0 && amountOf(y, 'yxa') === 0 && !ft2.tool && y.stat?.yxorTrasiga === 1;
    return [
      [`yxan slits för ett träd som fälls (${(PER * 100).toFixed(2)} % per träd)`, ettTrad],
      [`att hugga trä ur stammen sliter inte yxan mer än att bära den (${(huggSlits * 100).toFixed(3)} %)`, huggSlits < PER / 10],
      ['när yxan går sönder faller trädet ändå, och sedan slutar man', slutar],
      [`fisk ruttnar fortare än bär (skick efter ett dygn: fisk ${(fisk * 100).toFixed(0)} %, bär ${(bar * 100).toFixed(0)} %)`, fisk < bar && fisk < 1],
      [`grenar utanför lagret slits fortare (slitage på ett dygn: i lagret ${(grenIn * 100).toFixed(1)} %, bredvid ${(grenUt * 100).toFixed(1)} %)`, grenUt > 2 * grenIn && grenIn > 0],
      [`en yxa i lagret slits också (${yxa.toFixed(3)} kvar)`, yxa < 1 && yxa > 0.8],
      ['ved som slits ut blir grenar', pilesOf(a).some(q => q.k === 'grenar' && q.x === v.x && q.y === v.y)],
      [`skämd mat gör folk magsjuka (${sjuka} gånger på ett dygn)`, sjuka > 0 && tagg],
      [`den som kallas bort lägger bördan på marken (${lagd} högar)`, lagd === 2],
      ['på natten bärs högen nära lägret in men inte den långt bort', !kvarNara && kvarLangt],
      ['på dagen bärs även det som ligger långt bort in', !ute().length],
    ];
  },
};

SCENARIER.hallbarhet = {
  text: 'Steg 2.2.9: maten ruttnar efter temperaturen (fortare när det är varmt, nästan inte i frost), kött håller ett par dygn och fisk ett i rumstemperatur, och det som ligger i lagret håller aldrig längre än 20 dygn, inte ens under tak',
  kor: () => {
    const { ruttTemp, temperature, LAGER } = SIM;
    // ett dygn i lagret utan tak: hur mycket av skicket som gått, delat med det ett dygn i rumstemperatur skulle ta
    const dygn = (t: number) => {
      const s = createState(4, START); s.now = t; s.lagren = [{ ...zoneOf(s), w: 3, h: 3 }];
      setMat(s, { kott: 20, fisk: 20, rotter: 20 }); setAmount(s, 'ved', 20); setItems(s, { yxa: 1 });
      wearStore(s, 24 * 3600);
      const gatt = (k: string) => { const p = pilesOf(s).filter(q => q.k === k && q.zone >= 0); return 1 - p.reduce((x, q) => x + condOf(q) * q.n, 0) / Math.max(1e-9, p.reduce((x, q) => x + q.n, 0)); };
      return { f: ruttTemp(temperature(s)), temp: temperature(s), kott: gatt('kott'), fisk: gatt('fisk'), rotter: gatt('rotter'), ved: gatt('ved'), yxa: 1 - amountOf(s, 'yxa') };
    };
    // en timme i en varm sommar och en i frost
    let varm = START, kall = START;
    for (let t = START, b = -99, c = 99; t < START + 7 * DAY; t += HOUR) {
      const s = createState(4, START), v = temperature(s, t);
      if (v > b) { b = v; varm = t; }
      if (v < c) { c = v; kall = t; }
    }
    const sommar = dygn(varm), vinter = dygn(kall);
    // den kallaste timmen under fyra tidsåldrar (fyra veckor i verkligheten), i istiden
    for (let t = START; t < START + 28 * DAY; t += 6 * HOUR) { const s = createState(4, START); if (temperature(s, t) < temperature(s, kall)) kall = t; }
    const frost = dygn(kall);
    const ved = 24 / (LAGER.maxDygn * 24 * LAGER.inne); // ett dygn av det som får hållas längst utan tak
    const nara = (a: number, b: number) => Math.abs(a - b) < 1e-6;
    return [
      ['rumstemperaturen ruttnar som saker.ts säger, tio grader kallare hälften så fort, frost nästan inte', nara(ruttTemp(LAGER.rumstemp), 1) && nara(ruttTemp(LAGER.rumstemp - 10), 0.5) && ruttTemp(-3) === LAGER.frost],
      [`kött håller två dygn i rumstemperatur (på ett dygn vid ${sommar.temp.toFixed(0)} grader gick ${(sommar.kott * 100).toFixed(0)} %)`, nara(sommar.kott, 0.5 * sommar.f)],
      [`fisk ruttnar dubbelt så fort som kött (${(sommar.fisk * 100).toFixed(0)} %)`, nara(sommar.fisk, 2 * sommar.kott)],
      [`rötterna håller längre än köttet (${(sommar.rotter * 100).toFixed(0)} %)`, sommar.rotter < sommar.kott && sommar.rotter > 0],
      [`kallare håller maten längre (${vinter.temp.toFixed(0)} grader: köttet ${(vinter.kott * 100).toFixed(1)} %)`, vinter.temp < sommar.temp && vinter.kott < sommar.kott],
      [`i frost ruttnar maten nästan inte (${frost.temp.toFixed(0)} grader: köttet ${(frost.kott * 100).toFixed(1)} % på ett dygn)`, frost.temp <= 0 && frost.kott < 0.03],
      [`trä i lagret håller som längst ${LAGER.maxDygn * LAGER.inne} dygn utan tak (${(sommar.ved * 100).toFixed(1)} % på ett dygn), och under tak ${LAGER.maxDygn}`, nara(sommar.ved, ved)],
      [`en yxa i lagret slits lika fort (${(sommar.yxa * 100).toFixed(1)} %), men temperaturen gör inget`, nara(sommar.yxa, ved) && nara(frost.yxa, ved)],
    ];
  },
};

SCENARIER.teknik = {
  lang: true,
  text: 'Ingen kan göra yxa, spjut eller rep från början: den som arbetar kommer på det (nyfikna och intelligenta fortare), lär ut det i samtal, och kunskapen dör med den sista som kan den',
  kor: () => {
    const s = createState(3, START);
    const forst: Record<string, number> = {};
    let yxaInnan = false, repInnan = false;
    const kanFran = TEKNIK.every(t => !s.people.some(p => knows(p, t.id)));
    kor(s, 20 * 24, s => {
      for (const t of TEKNIK) if (forst[t.id] === undefined && living(s).some(p => knows(p, t.id))) forst[t.id] = (s.now - s.founded) / DAY;
      if ((amountOf(s, 'yxa')) > 0 && forst.yxa === undefined) yxaInnan = true;
      if ((amountOf(s, 'rep')) > 0 && forst.rep === undefined) repInnan = true;
    });
    const kan = (id: string) => living(s).filter(p => knows(p, id)).length;
    // nyfikna och intelligenta kommer på det fortare
    const q = createState(4, START), [a, b] = living(q).filter(p => ageOf(p, q.now) >= 20);
    a.pot.nyfikenhet = a.pot.intelligens = 16; b.pot.nyfikenhet = b.pot.intelligens = 6; a.tek = {}; b.tek = {};
    setAmount(q, 'torrgras', 10);
    thinkWhileWorking(q, a, 'samla', 3600); thinkWhileWorking(q, b, 'samla', 3600);
    const snabb = (a.tek.rep ?? 0) > (b.tek.rep ?? 0) * 3;
    // utan material kommer man inte på något
    const c = living(q).filter(p => ageOf(p, q.now) >= 20)[2]; c.tek = {}; setAmount(q, 'flinta', 0); setAmount(q, 'yxa', 0);
    thinkWhileWorking(q, c, 'ved', 10 * 3600);
    const utanMaterial = !(c.tek.yxa);
    // den sista som kan yxa dör
    const ens = living(s).filter(p => knows(p, 'yxa'));
    ens.slice(1).forEach(p => { p.tek!.yxa = 0; });
    if (ens[0]) die(s, ens[0], 'olycka');
    const dott = kan('yxa') === 0;
    const dagar = (k: string) => forst[k] === undefined ? 'aldrig' : `dygn ${forst[k].toFixed(1)}`;
    return [
      ['ingen kan något från början', kanFran],
      [`repet kommer på (${dagar('rep')}), yxan (${dagar('yxa')}) och spjutet (${dagar('fiskespjut')}); korgen, som kräver slöjdbänken, ${dagar('korg')}`, forst.rep !== undefined && forst.yxa !== undefined && forst.rep > 0.2 && forst.yxa > 0.3],
      ['ingen gör en yxa eller ett rep innan någon kommit på hur', !yxaInnan && !repInnan],
      [`kunskapen sprids i samtal (${kan('rep')} kan göra rep, ${kan('yxa')} yxa)`, kan('rep') >= 3 && ens.length >= 3],
      ['en nyfiken och intelligent person kommer på det mycket fortare', snabb],
      ['utan flinta kommer ingen på yxan', utanMaterial],
      ['när den sista som kan yxa dör finns kunskapen inte kvar', dott],
    ];
  },
};

SCENARIER.sak = {
  text: 'Inforutan för en sak (steg 2.3.5): den som gjorde ett redskap och när sparas, och det som sliter på saken just nu är samma tal som slitaget räknar med (i handen, i lagret, ute i vädret, på kroppen, maten som ruttnar)',
  kor: () => {
    const y = createState(4, START), yp = living(y).find(q => ageOf(q, y.now) >= 18)!;
    SIM.toolDone(y, yp, 'yxa');
    const t = tingOf(y).find(q => q.k === 'yxa')!;
    const gjord = t.av === yp.id && t.gjord === y.now;
    // i handen när man fäller: samma som wearUsed tar för ett träd (steg 2.3.12)
    t.hos = yp.id;
    yp.task = { act: 'falla', phase: 'do', tx: yp.x, ty: yp.y, until: y.now + HOUR, carry: 0, tool: 'yxa' };
    const iHand = SIM.slitageNu(y, t, t), c0 = t.c;
    wearUsed(y, yp, 1);
    const used = c0 - t.c;
    // i lagret: samma som wearStore tar på en timme
    t.hos = undefined; yp.task = undefined;
    const z = zoneOf(y); t.x = z.x; t.y = z.y;
    const iLager = SIM.slitageNu(y, t, t), c1 = t.c;
    wearStore(y, 3600);
    const store = c1 - t.c;
    // långt från lagret: ute i vädret
    const mp = getMap(4);
    let ute: { x: number; y: number } | undefined;
    for (let yy = 0; yy < 40 && !ute; yy++) for (let x = 0; x < W; x++) if (mp.tiles[yy * W + x] !== T.Vatten && zoneOf(y) && SIM.zoneAt(y, x, yy) < 0 && !SIM.roofed(y, x, yy)) { ute = { x, y: yy }; break; }
    const vadret = SIM.slitageNu(y, { k: 'yxa', x: ute!.x, y: ute!.y }).orsak;
    // ett plagg på kroppen, maten som ruttnar, sten som inte slits
    const rock = addTool(y, 'skinnrock', yp); rock.bar = yp.id;
    const pa = SIM.slitageNu(y, rock, rock);
    setMat(y, { fisk: 5 });
    const fisk = pilesOf(y).find(q => q.k === 'fisk')!, rutt = SIM.slitageNu(y, fisk).orsak;
    const sten = SIM.slitageNu(y, { k: 'sten', x: z.x, y: z.y }).orsak;
    const nara = (a: number, b: number) => Math.abs(a - b) < 1e-9 + 1e-6 * b;
    return [
      ['den som gjorde redskapet och när sparas', gjord],
      [`i handen när man fäller slits yxan som slitaget räknar (${((iHand.gang ?? 0) * 100).toFixed(2)} % per ${iHand.enhet ?? '?'}, slitaget tog ${(used * 100).toFixed(2)} % för ett träd)`, iHand.orsak === 'anvands' && iHand.enhet === 'träd' && used > 0 && nara(iHand.gang ?? 0, used)],
      [`i lagret slits den som slitaget räknar (${(iLager.per * 100).toFixed(4)} % per timme)`, iLager.orsak === 'lagret' && nara(iLager.per, store)],
      ['utanför lagret slits den av vädret', vadret === 'vadret'],
      ['ett plagg på kroppen slits av att bäras', pa.orsak === 'pasig' && nara(pa.per, 1 / (SIM.SAKER.skinnrock!.klad!.dygn * 24))],
      ['maten ruttnar', rutt === 'ruttnar'],
      ['sten slits inte', sten === 'inget'],
    ];
  },
};

SCENARIER.forvaring = {
  text: 'Förvaring (steg 2.3.6): hyllan, kistan och redskapsstället står i lagret, så att flera högar och redskap ryms på en ruta. De går inte att gå igenom, och lösa saker på golvet går man långsamt över',
  kor: () => {
    const { STATION, PROJEKT, LAGER, VAG, stationerOf, isKlar, rymd, groundOf, findPath, speedAt, wearMult, slitageNu, zonesOf, inZone, placeTools, stationAt, newTing } = SIM;
    // en by där alla kan bygga förvaring, med lagret fullt av grenar och gott om trä och rep
    const s = createState(1, START); klockan(s); tandEld(s);
    for (const r of s.people) r.tek = { ...r.tek, hylla: 1 };
    setMat(s, { bar: 300 }); setAmount(s, 'ved', 40); setAmount(s, 'rep', 6); setAmount(s, 'grenar', SIM.rutaOf('grenar') * 8);
    const brist0 = PROJEKT.hylla!.brist(s);
    let h = 0;
    const hyllan = () => stationerOf(s).find(t => t.k === 'hylla' && isKlar(t));
    while (!hyllan() && h < 96) { kor(s, 1); h++; }
    const hy = hyllan(), z = hy && zonesOf(s).find(q => inZone(q, hy.x, hy.y));
    const ryms = hy ? rymd(s, hy.x, hy.y, 'grenar') : 0;
    // mer grenar: hyllans ruta fylls mer än en vanlig ruta
    setAmount(s, 'grenar', SIM.amountOf(s, 'grenar') + SIM.rutaOf('grenar') * 4);
    const pa = hy ? pilesOf(s).find(a => a.x === hy.x && a.y === hy.y) : undefined;
    // hyllan går inte att gå igenom: vägen förbi den går runt, och alla rutor i lagret nås fortfarande från elden
    const g = groundOf(s), f = getMap(s.seed).fire, i = hy ? hy.y * W + hy.x : -1;
    const forbi = hy ? findPath(g, hy.x - 0.5, hy.y + 0.5, hy.x + 1.5, hy.y + 0.5) : null;
    let natt = 0, alla = 0;
    if (z) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) { alla++; if (findPath(g, f.x + 0.5, f.y + 0.5, x + 0.5, y + 0.5)) natt++; }
    // lösa saker på golvet: halva farten
    const los = pilesOf(s).find(a => !stationAt(s, a.x, a.y) && a.n > 0), j = los ? los.y * W + los.x : -1;
    SIM.sakerPaGolvet(s);
    const med = j >= 0 ? speedAt(g, j) : 0, lost = g.lost!; g.lost = undefined; const utan = j >= 0 ? speedAt(g, j) : 0; g.lost = lost;
    // en kista på en full hög: det som ligger i den slits som under tak
    const ki = medBank(s, 'kista');
    const kOrsak = slitageNu(s, { k: 'grenar', x: ki.x, y: ki.y }).orsak, kMult = wearMult(s, ki.x, ki.y);
    // ett ställ på ett redskap: flera redskap står där
    for (let n = 0; n < 3; n++) { newTing(s, 'yxa', 1, SIM.BYN); }
    placeTools(s);
    const st = medBank(s, 'stall');
    for (let n = 0; n < 3; n++) { newTing(s, 'fiskespjut', 1, SIM.BYN); }
    placeTools(s);
    const iStall = tingOf(s).filter(t => t.x === st.x && t.y === st.y && t.hos === undefined && t.lass === undefined).length;
    return [
      [`byn vill ha en hylla när golvet i lagret är fullt av högar (brist ${brist0.toFixed(2)})`, brist0 > 0.5],
      [`hyllan byggs på ${h} timmar, i en lagerplats`, !!hy && !!z],
      [`på hyllans ruta ryms ${STATION.hyllaRymmer} högar (${ryms} grenar), och där ligger nu ${pa ? Math.round(pa.n) : 0}`, ryms === SIM.rutaOf('grenar') * STATION.hyllaRymmer && !!pa && pa.n > SIM.rutaOf('grenar') + 1e-6],
      [`hyllan går inte att gå igenom (vägen förbi: ${forbi ? forbi.length + ' rutor' : 'ingen'})`, g.hinder?.[i] === 1 && !!forbi && !forbi.includes(i)],
      [`alla rutor i lagret nås fortfarande (${natt} av ${alla})`, alla > 0 && natt === alla],
      [`över lösa saker på golvet går man med ${VAG.fartSaker} av farten (${med.toFixed(2)} mot ${utan.toFixed(2)})`, j >= 0 && Math.abs(med - utan * VAG.fartSaker) < 1e-9],
      [`i kistan slits det som under tak (${kOrsak}, ${kMult} gånger)`, kOrsak === 'kista' && kMult === LAGER.inne],
      [`i stället står flera redskap på samma ruta (${iStall} av ${STATION.stallRymmer})`, iStall >= 2 && iStall <= STATION.stallRymmer],
    ];
  },
};
