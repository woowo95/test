// Scenarier. Fas 9: kartan växer (9.1) och fördjupningarna.
import { createState } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, kor } from './hjalp';

SCENARIER.andrade = {
  text: 'Steg 9.1.1: platserna växer bara tillbaka där något tagits. Varje ruta där ett lager har tagits ur står i lagrets lista, så att ingen ruta glöms när resten av kartan inte räknas',
  kor: () => {
    const s = createState(3, START);
    kor(s, 72);
    const d = SIM.takenOf(s) as Record<string, Float32Array | undefined>;
    let tagna = 0, utan = 0;
    for (const k of SIM.UTTAG_IDS) {
      const a = d[k], med = new Set(SIM.aktivaRutor(s, k));
      if (a) for (let i = 0; i < a.length; i++) if (a[i] > 0) { tagna++; if (!med.has(i)) utan++; }
    }
    return [
      [`byn har tagit ur kartan (${tagna} rutor)`, tagna > 0],
      [`varje sådan ruta står i listan (${utan} saknas)`, utan === 0],
    ];
  },
};

SCENARIER.bynsavstand = {
  text: 'Steg 9.1.5: avståndet till byn räknas för en ruta i taget när någon frågar, med samma svar som när hela kartan räknades, och den snabba undre gränsen är aldrig större än avståndet',
  kor: () => {
    const s = createState(1, START);
    kor(s, 48);
    const a = SIM.bynsAvstand(s), o = SIM.omrade(s), f = new Float32Array(1);
    let fel = 0, over = 0;
    for (let i = 0; i < SIM.W * SIM.H; i++) {
      const x = i % SIM.W, y = (i - x) / SIM.W;
      f[0] = o.inne[i] ? 0 : Math.max(0, SIM.tillHoljet(s, x, y) - SIM.OMRADE.kant);
      if (a.at(i) !== f[0]) fel++;
      if (a.minst(i) > a.at(i) + 1e-4) over++; // Float32 i fältet
    }
    return [
      [`samma avstånd som över hela kartan (${fel} rutor skiljer)`, fel === 0],
      [`den undre gränsen håller (${over} rutor över)`, over === 0],
    ];
  },
};

SCENARIER.sparmark = {
  text: 'Steg 9.1.4: gräset och skogen sparas som det som skiljer sig från startkartan. En sparad och inläst by får exakt samma mark som med det gamla formatet (en byte per ruta), och sparningen blir mindre',
  kor: () => {
    const s = createState(3, START);
    kor(s, 48);
    const g = SIM.groundOf(s), kopia = SIM.groundOf(SIM.cloneState(s));
    const gammalC = SIM.decodeCover(SIM.encodeCover(g.cover)), gammalT = SIM.decodeCover(SIM.encodeCover(g.trees), 0);
    let fel = 0;
    for (let i = 0; i < g.cover.length; i++) if (kopia.cover[i] !== gammalC[i] || kopia.trees[i] !== gammalT[i]) fel++;
    SIM.packGround(s);
    const ny = (s.mark?.length ?? 0) + (s.skog?.length ?? 0), gammal = SIM.encodeCover(g.cover).length + SIM.encodeCover(g.trees).length;
    return [
      [`samma mark efter inläsning som med det gamla formatet (${fel} rutor skiljer)`, fel === 0],
      [`sparningen är mindre (${Math.round(ny / 1024)} KB mot ${Math.round(gammal / 1024)} KB)`, ny < gammal],
    ];
  },
};

SCENARIER.djurantal = {
  text: 'Steg 9.1.2: djuren blir inte fler för att kartan blir större. Antalet kaningrupper, rådjursgrupper, fågelflockar och björnar är högst det registret säger, på en karta med 120 och med 240 rutor i sidan',
  kor: () => {
    const rakna = (sida: number) => {
      const s = createState(5, START, { W: sida, H: sida });
      const m = { kaniner: 0, radjur: 0, faglar: 0, bjorn: 0 };
      for (let h = 0; h < 48; h += 6) {
        s.now += 6 * SIM.HOUR;
        m.kaniner = Math.max(m.kaniner, SIM.grupperOf(s).length);
        m.radjur = Math.max(m.radjur, SIM.radjurGrupper(s).length);
        m.faglar = Math.max(m.faglar, new Set(SIM.faglarOf(s).map(d => Math.floor(d.id / 100))).size);
        m.bjorn = Math.max(m.bjorn, SIM.bjornarOf(s).filter(d => d.art === 'bjorn').length);
      }
      return m;
    };
    const a = rakna(120), b = rakna(240), t = (m: typeof a) => `${m.kaniner} kaningrupper, ${m.radjur} rådjursgrupper, ${m.bjorn} björnar`;
    return [
      [`120 rutor: ${t(a)}; 240 rutor: ${t(b)}`, b.kaniner <= SIM.KANINER.grupper && b.radjur <= SIM.RADJUR.grupper && b.bjorn <= 1],
      ['lika många grupper på den större kartan', b.kaniner === a.kaniner && b.radjur === a.radjur],
    ];
  },
};

SCENARIER.kartflytt = {
  lang: true,
  text: 'Steg 9.1.8: en by med en mindre karta (halva sidan, som 120 × 120 när kartan är 240 × 240) får den större kartan när den laddas. Den gamla kartan hamnar i mitten med allt som står där, folket, marken, skogen, trädens ålder och sort och buskarna på samma ställe som förut, och byn går vidare',
  kor: () => {
    const v = SIM.KARTA.bredd / 2, hv = SIM.KARTA.hojd / 2, s = createState(4, START, { W: v, H: hv });
    kor(s, 6 * 24);
    const g0 = SIM.groundOf(s), m0 = SIM.getMap(s.seed).tiles.slice(), cover0 = g0.cover.slice(), trees0 = g0.trees.slice(), art0 = g0.art!.slice(), alder0 = g0.alder!.slice();
    const folk0 = SIM.living(s).map(p => ({ id: p.id, x: p.x, y: p.y })), hus0 = (s.hus ?? []).map(h => ({ id: h.id, x: h.x, y: h.y })), st0 = (s.stationer ?? []).map(t => ({ id: t.id, x: t.x, y: t.y }));
    const n = SIM.cloneState(s);
    const ox = n.kart!.x - (s.kart?.x ?? 0), oy = n.kart!.y - (s.kart?.y ?? 0), g = SIM.groundOf(n), m = SIM.getMap(n.seed).tiles;
    let fel = 0, mfel = 0;
    for (let y = 0; y < hv; y++) for (let x = 0; x < v; x++) {
      const i = y * v + x, j = (y + oy) * SIM.W + x + ox;
      if (m[j] !== m0[i]) mfel++;
      if (Math.abs(g.cover[j] - cover0[i]) > 0.01 || Math.abs(g.trees[j] - trees0[i]) > 0.01 || g.art![j] !== art0[i] || Math.abs(g.alder![j] - alder0[i]) > 1) fel++;
    }
    const plats = (a: { id: number; x: number; y: number }[], b: { id: number; x: number; y: number }[]) => a.every(q => { const r = b.find(o => o.id === q.id); return !!r && Math.abs(r.x - q.x - ox) < 0.01 && Math.abs(r.y - q.y - oy) < 0.01; });
    const folkOk = plats(folk0, n.people.filter(p => SIM.alive(p))), husOk = plats(hus0, n.hus ?? []), stOk = plats(st0, n.stationer ?? []);
    kor(n, 48);
    const iVatten = SIM.living(n).filter(p => m[Math.floor(p.y) * SIM.W + Math.floor(p.x)] === SIM.T.Vatten && !SIM.groundOf(n).built?.[Math.floor(p.y) * SIM.W + Math.floor(p.x)]).length;
    return [
      [`den nya kartan är ${n.W} × ${n.H}, den gamla i mitten (${ox}, ${oy})`, n.W === SIM.KARTA.bredd && ox > 0 && oy > 0],
      [`marken under den gamla kartan är densamma (${mfel} rutor skiljer)`, mfel === 0],
      [`gräset, skogen, trädens sort och ålder följer med (${fel} rutor skiljer)`, fel === 0],
      ['folket, husen och stationerna står på samma ställe', folkOk && husOk && stOk],
      [`byn går två dygn till (${SIM.living(n).length} invånare, ${iVatten} i vattnet)`, SIM.living(n).length > 0 && iVatten === 0],
    ];
  },
};

// lerkrukan (steg 9.4.11): tre storlekar av 1, 2 och 4 lera, som torkar och bränns i elden och kan spricka efter kvaliteten,
// och pyntet lerkruka i en sparad by blir en stor lerkruka
function lerkrukan(): [string, boolean][] {
  const { KRUKOR, KRUKA, RECEPT: R, toolDone, stepKrukor, tingOf, migrate } = SIM;
  const storlekar = [R.lerkruka_liten.av.lera, R.lerkruka_mellan.av.lera, R.lerkruka_stor.av.lera].join('/');
  const s = createState(2, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
  s.fire.lit = true; s.fire.fuel = 50;
  toolDone(s, p, 'lerkruka_mellan');
  const k = tingOf(s).filter(t => t.k === 'lerkruka_mellan').pop()!, ra = k.ler === 0;
  let timmar = 0;
  while (k.ler !== undefined && tingOf(s).includes(k) && timmar < 24 * 6) { s.fire.lit = (k.ler ?? 0) >= 1; stepKrukor(s); s.now += SIM.HOUR; timmar++; }
  const klar = !tingOf(s).includes(k) || k.ler === undefined;
  const sprickOrdning = KRUKA.spricka.every((v, i, a) => i === 0 || v <= a[i - 1]);
  // en sparad by med pyntet lerkruka (en möbel) får en stor lerkruka på samma plats, med samma ägare och kvalitet
  const g = createState(3, START), o = SIM.living(g)[0];
  (g.stationer ??= []).push({ id: 99, k: 'kruka', x: 10, y: 12, kvar: 0, ag: o.id, q: 4 });
  g.v = 29; migrate(g);
  const ny = tingOf(g).find(t => t.k === 'lerkruka_stor' && t.x === 10 && t.y === 12);
  return [
    [`lerkrukan finns i tre storlekar av ${storlekar} lera (${Object.values(KRUKOR).map(q => q.namn).join(', ')})`, storlekar === '1/2/4'],
    [`den nya krukan är rå, torkar och bränns i elden, och är färdig eller sprucken efter ${timmar} timmar`, ra && klar],
    [`en sämre kruka spricker oftare (${KRUKA.spricka.join(', ')})`, sprickOrdning && KRUKA.spricka[0] > KRUKA.spricka[5]],
    [`pyntet lerkruka i en sparad by blir en stor lerkruka på samma plats med samma ägare och kvalitet (${ny ? `ägare ${ny.agare === o.id ? 'samma' : 'annan'}, kvalitet ${ny.q}` : 'ingen'})`, !!ny && ny.agare === o.id && ny.q === 4 && !(g.stationer ?? []).some(t => t.k === 'kruka')],
  ];
}

SCENARIER.lera = {
  text: 'Steg 9.4.10–9.4.11: leran är en resurs som de andra. Den är rikast i stranden närmast vattnet, mindre i sanden och jorden, inte i skogen; den fylls på när det regnar; förrådsmålen räknar hur mycket byn vill ha ur förbrukningen, och den grävs som ett projekt, fortare med benspaden. Lerkrukan finns i tre storlekar, torkar och bränns i elden och spricker oftare ju sämre den är',
  kor: () => {
    const s = createState(1, START), g = SIM.groundOf(s), m = SIM.getMap(s.seed), d = SIM.djupOf(s.seed).land;
    const rik = (i: number) => SIM.richness(s, 'lera', i % SIM.W + 0.5, Math.floor(i / SIM.W) + 0.5);
    const medel = (f: (i: number) => boolean) => { let n = 0, v = 0; for (let i = 0; i < m.tiles.length; i++) if (f(i)) { n++; v += rik(i); } return n ? v / n : 0; };
    const strand = medel(i => m.tiles[i] === SIM.T.Sand && d[i] <= 1 && g.trees[i] < SIM.FOREST), sand = medel(i => m.tiles[i] === SIM.T.Sand && d[i] > 1 && g.trees[i] < SIM.FOREST);
    const jord = medel(i => m.tiles[i] === SIM.T.Gras && g.trees[i] < SIM.FOREST), skog = medel(i => g.trees[i] >= SIM.FOREST);
    // regnet fyller på: en tömd plats växer inte tillbaka utan regn, men gör det när det regnar
    const at = SIM.leraPlats(s);
    if (!at) return [['en plats med lera nära byn', false]];
    const fore = SIM.richness(s, 'lera', at.x, at.y);
    SIM.takeFrom(s, 'lera', at.x, at.y, 2);
    const tagen = SIM.richness(s, 'lera', at.x, at.y);
    SIM.growFynd(s, 12, 2, 1, 0); const torrt = SIM.richness(s, 'lera', at.x, at.y);
    SIM.growFynd(s, 12, 2, 1, 1); const regn = SIM.richness(s, 'lera', at.x, at.y);
    // förrådsmålen: byn har gjort av med lera, så den vill ha mer, och en vuxen gräver den
    s.forbruk = { lera: 10 }; SIM.arbetsTimme(s);
    const buf = SIM.materialBuffert(s, "lera"), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    const u = SIM.projektNu(s, p, 'lera', { kyla: false, gras: 0 });
    const gravt = (spade: boolean) => { const q = SIM.cloneState(s), qp = SIM.living(q).find(r => r.id === p.id)!; const t: SIM.Task = { act: 'lera', phase: 'do', tx: at.x, ty: at.y, until: q.now, carry: 0, why: '', arbTid: 10 * 60000, tool: spade ? 'benspade' : undefined }; qp.x = at.x; qp.y = at.y; SIM.leraGravd(q, qp, t); return SIM.stacksOf(q).filter(a => a.k === 'lera').reduce((n, a) => n + a.n, 0); };
    const hand = gravt(false), spade = gravt(true);
    return [
      [`leran är rikast i stranden närmast vattnet (${strand.toFixed(2)}), mindre i sanden (${sand.toFixed(2)}) och jorden (${jord.toFixed(2)}), inte i skogen (${skog.toFixed(2)})`, strand > sand && sand > jord && skog === 0],
      [`en tömd plats fylls på bara när det regnar (${fore.toFixed(2)} → ${tagen.toFixed(2)}, utan regn ${torrt.toFixed(2)}, med regn ${regn.toFixed(2)})`, tagen < fore && Math.abs(torrt - tagen) < 1e-6 && regn > torrt],
      [`förrådsmålen vill ha lera när byn gjort av med den (${buf.toFixed(1)}), och en vuxen gräver den (${u?.act ?? 'inget'})`, buf > 0 && u?.act === 'lera'],
      [`med benspaden blir det mer (${hand} med händerna, ${spade} med spaden), och leran läggs i en hög där den grävdes`, hand > 0 && spade > hand],
      ...lerkrukan(),
    ];
  },
};

// vätskorna och behållarna (steg 9.4.13–9.4.14)
function naveraskan(): [string, boolean][] {
  const { RECEPT: R, TEKNIK, STATIONER, fartVid, kvVid, vidStation } = SIM;
  const r = R.naverask, tek = TEKNIK.find(t => t.id === 'naverask');
  const s = createState(1, START), b = SIM.vidStation(medBankFas9(s));
  return [
    [`näveraskan är en sak av ${JSON.stringify(r.av)} på ${r.min} minuter, med en egen teknik (${tek?.namn ?? 'ingen'})`, r.av.naver === 1 && r.av.rep === 1 && r.min >= 2 && r.min <= 4 && !!tek],
    [`den görs fortare och bättre vid slöjdbänken (${fartVid(s, b, 'naverask').toFixed(2)} gånger, kvalitet +${kvVid(s, b, 'naverask')})`, STATIONER.flatarbank.gor.includes('naverask') && fartVid(s, b, 'naverask') > 1 && kvVid(s, b, 'naverask') > 0],
  ];
  void vidStation;
}
const medBankFas9 = (s: SIM.State) => { const at = SIM.stationSite(s, 'flatarbank') ?? { x: 10, y: 10 }; const t: SIM.Station = { id: (s.nextStation = (s.nextStation ?? 0) + 1), k: 'flatarbank', x: at.x, y: at.y, kvar: 0 }; (s.stationer ??= []).push(t); SIM.touch(s); return t; };

// steg 9.4.14: tjäran kokas bara när det finns en ledig behållare, och läggs i den; när den används blir behållaren kvar tom; i en
// sparad by läggs tjäran i stora lerkrukor och salvan i näveraskar, och en fylld vattensäck har vatten i sig
function vatskorna(): [string, boolean][] {
  const { VATSKOR, KLAR_FOR, vatskaAv, taVatska, addTool, tingOf, setAmount, amountOf, migrate } = SIM;
  const s = createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
  const koka = () => { setAmount(s, 'ved', 20); KLAR_FOR.koka_tjara!(s, p, { act: 'koka_tjara', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' }, 0); };
  koka();
  const utan = vatskaAv(s, 'tjara') === 0 && amountOf(s, 'tjara') === 0 && amountOf(s, 'ved') === 20;
  const k = addTool(s, 'lerkruka_stor', p);
  koka();
  const med = k.inne?.v === 'tjara' && vatskaAv(s, 'tjara') === 1 && amountOf(s, 'tjara') === 0;
  const tog = taVatska(s, 'tjara', 1), tom = tog === 1 && !k.inne && tingOf(s).includes(k);
  const g = createState(2, START);
  setAmount(g, 'tjara', 3); setAmount(g, 'salva', 2);
  const sack = addTool(g, 'vattensack', SIM.living(g)[0]); sack.fylld = 1;
  g.v = 30; migrate(g);
  const tj = tingOf(g).filter(t => t.k === 'lerkruka_stor' && t.inne?.v === 'tjara'), sv = tingOf(g).filter(t => t.k === 'naverask' && t.inne?.v === 'salva');
  return [
    [`vätskorna är rader med färg och behållare (${Object.keys(VATSKOR).join(', ')})`, Object.values(VATSKOR).every(v => v.farg > 0 && v.i.length > 0)],
    [`utan en ledig behållare kokas ingen tjära (${utan ? 'ingen' : 'kokades'}), med en stor lerkruka hamnar tjäran i den (${med ? 'ja' : 'nej'})`, utan && med],
    [`när tjäran används blir den tomma krukan kvar (${tom ? 'ja' : 'nej'})`, tom],
    [`i en sparad by blir tjäran stora lerkrukor (${tj.length}, ${tj.reduce((n, t) => n + t.inne!.n, 0)} tjära), salvan näveraskar (${sv.length}) som är byns, och säcken har vatten i sig (${sack.inne?.v ?? 'inget'})`, tj.length === 1 && tj[0].inne!.n === 3 && sv.length === 2 && sv.every(t => t.agare === 0) && amountOf(g, 'tjara') === 0 && sack.inne?.v === 'vatten'],
  ];
}

// örtteet (steg 9.5.8): kokas av rölleka och vatten i en liten lerkruka vid en eld som brinner, har kvalitet, och den som fryser
// eller är sjuk dricker det: varmare, och motståndet växer mer ju bättre teet är
function orteet(): [string, boolean][] {
  const { KLAR_FOR, vatskaAv, addTool, setAmount, drickTe, teFaktor, SJUK, TE, KROPP } = SIM;
  const s = createState(1, START), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
  p.tek = { ...p.tek, orte: 1 };
  setAmount(s, 'rolleka', 3);
  addTool(s, 'vattensack', p).inne = { v: 'vatten', n: 1 };
  const kruka = addTool(s, 'lerkruka_liten', p);
  const koka = () => KLAR_FOR.koka_te!(s, p, { act: 'koka_te', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' }, 0);
  s.fire.lit = false; koka();
  const slocknad = vatskaAv(s, 'te') === 0;
  s.fire.lit = true; s.fire.fuel = 10; koka();
  const kokt = kruka.inne?.v === 'te' && kruka.inne.q !== undefined;
  const q = SIM.living(s).find(r => r !== p)!; q.warm = KROPP.fryser - 0.1; q.x = p.x; q.y = p.y;
  const w0 = q.warm; drickTe(s, q);
  const varmare = q.warm > w0 && !kruka.inne, f = teFaktor(s, q, SJUK.lakeort);
  const battre = TE.verkan.every((v, i, a) => i === 0 || v >= a[i - 1]) && TE.verkan[5] < 1;
  return [
    [`utan en eld som brinner kokas inget te (${slocknad ? 'inget' : 'kokades'}); med elden står teet i den lilla krukan med kvalitet (${kokt ? `kvalitet ${kruka.inne?.q}` : 'inget'})`, slocknad && kokt],
    [`den som fryser dricker teet och blir varmare (${w0.toFixed(2)} → ${q.warm.toFixed(2)}), och krukan blir tom`, varmare],
    [`teet hjälper motståndet (${f.toFixed(2)} gånger), mer ju bättre det är och mindre än läkeörten (${SJUK.lakeort})`, f > 1 && f < SJUK.lakeort && battre],
  ];
}

SCENARIER.vatskor = {
  text: 'Steg 9.4.13–9.4.14: näveraskan är en liten ask av näver och rep med en egen teknik, som görs för hand eller fortare och bättre vid slöjdbänken. Vätskorna (vattnet, tjäran, salvan och benlimmet) finns bara i behållare: ett recept behöver en ledig behållare som passar, och när vätskan används blir den tomma behållaren kvar. Örtteet (steg 9.5.8) kokas i en liten lerkruka och värmer och stärker',
  kor: () => [...naveraskan(), ...vatskorna(), ...orteet()],
};

SCENARIER.salva = {
  text: 'Steg 9.5.10: salvan blir läkesalva. Tekniken Läkesalva kräver Örtte och örtköket, salvan görs bara i örtköket och har kvalitet, och läggs på såret: den sänker risken för infektion, dämpar en infektion som börjat och hjälper brännskador att läka, mer ju bättre den är',
  kor: () => {
    const { TEKNIK, TILLVERKA, STATIONER, SALVA, salvaVerkan, vardKlar, halsaSteg, addTool } = SIM;
    const tek = TEKNIK.find(t => t.id === 'lakesalva');
    const s = createState(1, START), [g, q] = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
    addTool(s, 'naverask', g).inne = { v: 'salva', n: 1, q: 2 };
    q.skador = [{ d: 'armV', k: 'skarsar', g: 0.5, b: 0 }];
    g.x = q.x; g.y = q.y;
    vardKlar(s, g, { act: 'varda', phase: 'do', tx: q.x, ty: q.y, until: s.now, carry: 0, why: '', ref: q.id });
    const lagd = q.skador![0].salva === 2 && SIM.vatskaAv(s, 'salva') === 0;
    const w = q.skador![0], risk = (k?: number) => 1 - SALVA.skydd * salvaVerkan({ ...w, salva: k });
    // en infektion som börjat går tillbaka med salva och växer utan
    const inf = (salva?: number) => { const c = SIM.cloneState(s), r = c.people.find(x => x.id === q.id)!; r.skador = [{ d: 'armV', k: 'skarsar', g: 0.5, b: 0, inf: 0.3, ...(salva !== undefined ? { salva } : {}) }]; halsaSteg(c, r, 4 * 3600); return r.skador?.[0]?.inf ?? 0; };
    const med = inf(2), utan = inf();
    // brännskadan läker fortare med salva
    const bran = (salva?: number) => { const c = SIM.cloneState(s), r = c.people.find(x => x.id === q.id)!; r.skador = [{ d: 'armV', k: 'brannskada', g: 0.6, b: 0, ...(salva !== undefined ? { salva } : {}) }]; halsaSteg(c, r, 6 * 3600); return r.skador?.[0]?.g ?? 0; };
    return [
      [`tekniken Läkesalva kräver Örtte och örtköket (${tek?.krav.join(', ')}) och salvan görs bara i örtköket`, !!tek && tek.krav.includes('orte') && tek.krav.includes('ortkok') && TILLVERKA.koka_salva.tek === 'lakesalva' && STATIONER.ortkok.bara!.includes('koka_salva')],
      [`salvan läggs på såret och tas ur näveraskan (${lagd ? 'ja' : 'nej'})`, lagd],
      [`risken för infektion blir lägre, mer ju bättre salvan är (usel ${risk(0).toFixed(2)}, normal ${risk(2).toFixed(2)}, mästerverk ${risk(4).toFixed(2)}, utan 1)`, risk(4) < risk(2) && risk(2) < risk(0) && risk(0) < 1],
      [`en infektion som börjat går tillbaka med salva (${med.toFixed(2)}) och växer utan (${utan.toFixed(2)})`, med < 0.3 && utan > 0.3],
      [`brännskadan läker fortare med salva (${bran(2).toFixed(2)} mot ${bran().toFixed(2)})`, bran(2) < bran()],
    ];
  },
};

SCENARIER.protes = {
  text: 'Steg 9.5.11: proteserna. Kryckan, träbenet och kroken görs bara vid snickarbänken och ögonlappen för hand eller vid slöjdbänken. Den som förlorat ett ben får ett träben och går igen ungefär hälften så bra, den som förlorat en hand får en krok och en del av greppet, och ögonlappen är bara utseende',
  kor: () => {
    const { RECEPT: R, addTool, protesTimme, rorlighet, handighet, syn, forlora, protesVill, STATIONER } = SIM;
    const s = createState(1, START), [p, q] = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
    const bank = ['krycka', 'traben', 'krok'].every(k => (R as Record<string, SIM.ReceptRad>)[k].bank === 'snickarbank' && (R as Record<string, SIM.ReceptRad>)[k].bara) && STATIONER.flatarbank.gor.includes('ogonlapp') && !(R.ogonlapp as SIM.ReceptRad).bara;
    const hel = rorlighet(p);
    forlora(s, p, 'benV', 'höggs av'); p.skador = undefined;
    const utan = rorlighet(p), vill = protesVill(s, 'traben');
    addTool(s, 'traben', q).agare = 0;
    protesTimme(s);
    const med = rorlighet(p);
    const h0 = handighet(q); forlora(s, q, 'handH', 'höggs av'); q.skador = undefined; const hUtan = handighet(q);
    addTool(s, 'krok', q).agare = 0; protesTimme(s); const hMed = handighet(q);
    const s0 = syn(p); forlora(s, p, 'ogaV', 'gick förlorat'); p.skador = undefined; const sUtan = syn(p);
    addTool(s, 'ogonlapp', p).agare = 0; protesTimme(s);
    return [
      [`kryckan, träbenet och kroken görs bara vid snickarbänken, ögonlappen för hand och fortare vid slöjdbänken`, bank],
      [`byn vill ha ett träben åt den som förlorat ett ben (${vill})`, vill === 1],
      [`med träbenet går hen igen ungefär hälften så bra (hel ${hel.toFixed(2)}, utan ${utan.toFixed(2)}, med ${med.toFixed(2)})`, med > utan && med < hel && p.protes?.benV === 'traben'],
      [`kroken ger tillbaka en del av greppet (${h0.toFixed(2)} → ${hUtan.toFixed(2)} → ${hMed.toFixed(2)})`, hMed > hUtan && hMed < h0 && q.protes?.handH === 'krok'],
      [`ögonlappen är bara utseende (synen ${s0.toFixed(2)} → ${sUtan.toFixed(2)}, med lappen ${syn(p).toFixed(2)})`, p.protes?.ogaV === 'ogonlapp' && syn(p) === sUtan],
    ];
  },
};

// förbanden (steg 9.5.15): remsan före mossan, en remsa ur ett plagg i nöd, avsnörningen och sömnaden
function forbanden(): [string, boolean][] {
  const { HALSA, RECEPT: R, vardKlar, halsaSteg, addTool, setAmount, tingOf } = SIM;
  const s = createState(1, START), [g, q] = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
  const vard = (c: SIM.State, gg: SIM.Person, qq: SIM.Person) => { gg.x = qq.x; gg.y = qq.y; vardKlar(c, gg, { act: 'varda', phase: 'do', tx: qq.x, ty: qq.y, until: c.now, carry: 0, why: '', ref: qq.id }); };
  const recept = R.remsa.av.skinn === 1 && R.remsa.ger === 2 && R.remsa_lin.av.lintyg === 1;
  // remsan läggs före mossan
  setAmount(s, 'remsa', 1); setAmount(s, 'mossa', 1);
  q.skador = [{ d: 'bal', k: 'skarsar', g: 0.4, b: 1 }]; vard(s, g, q);
  const remsa = q.skador![0].f === 2 && HALSA.remsa < HALSA.forband;
  // i nöd: en remsa ur plagget
  setAmount(s, 'remsa', 0); setAmount(s, 'mossa', 0);
  const rock = addTool(s, 'rock_kaninskinn', q); rock.bar = q.id; const c0 = rock.c;
  q.skador = [{ d: 'bal', k: 'skarsar', g: 0.4, b: 1 }]; vard(s, g, q);
  const plagg = q.skador![0].f === 2 && rock.c < c0;
  // avsnörningen: ett stort sår i benet slutar blöda, men sitter den för länge skadas benet
  setAmount(s, 'rep', 2);
  q.skador = [{ d: 'benV', k: 'skarsar', g: 0.8, b: 1 }]; q.men = undefined; vard(s, g, q);
  const snord = q.skador![0].av !== undefined && q.skador![0].b === 0;
  s.now += (HALSA.avsnoraTim + 0.5) * SIM.HOUR; halsaSteg(s, q, 300);
  const skadad = ((q.men ?? []) as SIM.Men[]).some(m => m.d === 'benV');
  // sömnaden: med bennålen och Läkekonst sys ett stort sår, och det blir medelstort
  const t = SIM.cloneState(s), tg = t.people.find(r => r.id === g.id)!, tq = t.people.find(r => r.id === q.id)!;
  setAmount(t, 'rep', 2); tq.skador = [{ d: 'bal', k: 'sticksar', g: 0.8, b: 1 }];
  tg.skill.lakekonst = 0; addTool(t, 'nal', tg); vard(t, tg, tq);
  const utanKonst = !tq.skador![0].sydd;
  tq.skador = [{ d: 'bal', k: 'sticksar', g: 0.8, b: 1 }]; tg.skill.lakekonst = HALSA.syLak; vard(t, tg, tq);
  const sydd = !!tq.skador![0].sydd && tq.skador![0].g < HALSA.storSar;
  void tingOf;
  return [
    [`remsorna skärs två av ett skinn eller lintyg (${recept ? 'ja' : 'nej'})`, recept],
    [`remsan läggs före mossan och skyddar bättre mot infektion (${HALSA.remsa} mot ${HALSA.forband})`, remsa],
    [`utan remsa och mossa rivs en remsa ur ett plagg, som slits (${c0.toFixed(2)} → ${rock.c.toFixed(2)})`, plagg],
    [`ett stort sår i benet snörs av och slutar blöda (${snord ? 'ja' : 'nej'}), och sitter avsnörningen för länge skadas benet (${skadad ? 'ja' : 'nej'})`, snord && skadad],
    [`ett stort sår sys bara med Läkekonst (${utanKonst ? 'inte utan' : 'syddes utan'}), och det sydda blir medelstort (${sydd ? 'ja' : 'nej'})`, utanKonst && sydd],
  ];
}

SCENARIER.blodning = {
  text: 'Steg 9.5.14: blödningens tre storlekar och tiden kvar. Ett litet sår levrar sig själv, ett medelstort långsamt och ett stort inte alls; tiden till förblödning räknas varje slag, och när den är kort blir det en notis. Förbanden (steg 9.5.15): remsor av skinn eller lin, en remsa ur ett plagg i nöd, avsnörningen och sömnaden med bennål',
  kor: () => {
    const { halsaSteg, tidKvar, sarStorlek, HALSA } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const prov = (g: number, tim: number) => { const c = SIM.cloneState(s), q = c.people.find(r => r.id === p.id)!; q.skador = [{ d: 'benV', k: 'skarsar', g, b: 1 }]; q.blod = 1; halsaSteg(c, q, tim * 3600); return { b: q.skador?.[0]?.b ?? 0, q, c }; };
    const litet = prov(0.2, 2), medel = prov(0.45, 2), stort = prov(0.8, 0.5);
    const storlekar = [sarStorlek({ d: 'benV', k: 'skarsar', g: 0.2, b: 1 }), sarStorlek({ d: 'benV', k: 'skarsar', g: 0.45, b: 1 }), sarStorlek({ d: 'benV', k: 'skarsar', g: 0.8, b: 1 })].join(', ');
    // ett stort sår: tiden kvar sjunker, och när den är kort kommer notisen
    const c = SIM.cloneState(s), q = c.people.find(r => r.id === p.id)!;
    q.skador = [{ d: 'bal', k: 'sticksar', g: 0.9, b: 1 }]; q.blod = 1;
    const t0 = tidKvar(q);
    let notis = false, steg = 0;
    while (q.blod > HALSA.blodDod + 0.02 && steg++ < 200) { halsaSteg(c, q, 300); if ((c.notiser?.lista ?? []).some(n => n.id === 'blodning')) notis = true; }
    return [
      [`såren är små, medelstora och stora (${storlekar})`, storlekar === 'litet, medelstort, stort'],
      [`efter två timmar har det lilla såret levrat sig (${litet.b.toFixed(2)}), det medelstora blöder mindre (${medel.b.toFixed(2)}) och det stora blöder som förut (${stort.b.toFixed(2)})`, litet.b === 0 && medel.b > 0 && medel.b < 1 && stort.b === 1],
      [`tiden kvar räknas (${(t0 * 60).toFixed(0)} minuter i början) och sjunker`, t0 < Infinity && t0 > 0],
      [`när tiden kvar är kort kommer en notis (${notis ? 'ja' : 'nej'})`, notis],
      ...forbanden(),
    ];
  },
};

SCENARIER.vardval = {
  text: 'Steg 9.5.16: själv eller andra. Den skadade trycker själv och ropar, och den som ropat hörs längre bort; vårdaren tar förband på vägen om tiden räcker och går annars direkt och trycker; den som ska på jakt eller i strid tar en remsa i bältet',
  kor: () => {
    const { vardVal, skada, HALSA, setAmount } = SIM;
    const s = createState(1, START), [g, q] = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
    for (const r of SIM.living(s)) if (r !== g && r !== q) { r.x = 5; r.y = 5; }
    setAmount(s, 'remsa', 3);
    // den skadade ropar, och hörs längre bort än vanligt
    q.x = g.x + HALSA.vardR + 5; q.y = g.y;
    skada(s, q, 'bal', 'sticksar', 0.5, 'blod', 'i en strid');
    const ropat = q.ropT === s.now, hord = vardVal(s, g, false)?.ref === q.id;
    const sjalv = vardVal(s, q, true)?.why ?? '';
    // hämta eller stanna: med kort tid kvar går vårdaren direkt
    const lag = SIM.fetchSpot(s, 'remsa')!; g.x = lag.x + 12; g.y = lag.y; q.x = g.x + 8; q.y = g.y; q.skador = [{ d: 'bal', k: 'sticksar', g: 0.9, b: 1 }]; q.blod = HALSA.blodDod + 0.001;
    const kort = vardVal(s, g, false);
    q.blod = 1; q.skador = [{ d: 'bal', k: 'skarsar', g: 0.3, b: 1 }];
    const lang = vardVal(s, g, false);
    // remsan i bältet
    const t = SIM.cloneState(s), tp = t.people.find(r => r.id === g.id)!;
    SIM.balteForband(t, tp, 'jakt');
    return [
      [`den skadade ropar (${ropat ? 'ja' : 'nej'}) och hörs längre bort än vanligt (${hord ? 'en kom' : 'ingen kom'})`, ropat && hord],
      [`den skadade trycker själv på såret (${sjalv})`, sjalv.includes('Trycker')],
      [`med kort tid kvar går vårdaren direkt och trycker (${kort?.why})`, !!kort?.stanna],
      [`med tid nog tar vårdaren förband på vägen (${lang?.why})`, !!lang && !lang.stanna],
      [`den som går på jakt tar en remsa i bältet (${tp.forbandMed ?? 0})`, (tp.forbandMed ?? 0) === 1],
    ];
  },
};

SCENARIER.blodsteg = {
  text: 'Steg 9.5.17: blodförlusten i steg. Över 85 % inget, 70–85 % blek och yr med sämre arbete och träff, 55–70 % kan man inte slåss, 45–55 % kan man bara krypa, och under 45 % svimmar man och kan inte trycka på sitt sår',
  kor: () => {
    const { blodSteg, handighet, kanGa, vardVal, halsaSteg, HALSA } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const steg = [0.9, 0.8, 0.6, 0.5, 0.42].map(b => { p.blod = b; return blodSteg(p); }).join(',');
    p.blod = 1; const h1 = handighet(p); p.blod = 0.8; const h2 = handighet(p);
    p.blod = 0.6; const gar = kanGa(p); p.blod = 0.5; const kryper = !kanGa(p);
    p.skador = [{ d: 'bal', k: 'skarsar', g: 0.3, b: 1 }]; p.blod = HALSA.svim - 0.01; halsaSteg(s, p, 1);
    const svimmat = !!p.svimmat && !vardVal(s, p, true);
    return [
      [`stegen följer blodet (${steg})`, steg === '0,1,2,3,4'],
      [`den som är blek och yr arbetar sämre (${h1.toFixed(2)} → ${h2.toFixed(2)})`, h2 < h1],
      [`med 60 % går hen, med 50 % kan hen bara krypa`, gar && kryper],
      [`under 45 % svimmar hen och kan inte trycka på sitt sår (${svimmat ? 'ja' : 'nej'})`, svimmat],
    ];
  },
};

SCENARIER.stridvard = {
  text: 'Steg 9.5.18: blödningen under striden. Den fallne trycker liggande på såret, en empatisk kämpe går till en vän som ligger och blöder när ingen fiende står nära, drar undan hen och trycker, och efter striden vårdas den med kortast tid kvar först',
  kor: () => {
    const m = (id: number, sida: 0 | 1, x: number) => ({ id, namn: `K${id}`, sida, st: { styrka: 10, uthallighet: 10, mod: 14, smidighet: 10, skicklighet: 10 }, vapen: 'kniv' as SIM.Vapen, klader: [], fart: 1, x, y: 7 });
    const st = SIM.nyStrid({ avsikt: 'skada', w: 30, h: 14, kampar: [m(1, 0, 6), m(2, 0, 8), m(3, 1, 26)] }, 3);
    const [a, b] = st.kampar;
    a.emp = 16; b.lage = 'nere'; b.skador = [{ d: 'bal', k: 'sticksar', g: 0.8, ny: 1 }]; b.blod = 0.6;
    let raddad = false;
    for (let i = 0; i < 60 && !raddad; i++) { SIM.stridSteg(st); raddad = st.logg.some(r => r.h === 'raddar' && r.a === a.id && r.b === b.id); }
    const tryckt = b.skador.every(w => !w.ny);
    // den fallne trycker själv: blöder mindre än den som står
    const st2 = SIM.nyStrid({ avsikt: 'skada', w: 30, h: 14, kampar: [m(1, 0, 6), m(3, 1, 26)] }, 3), st3 = SIM.nyStrid({ avsikt: 'skada', w: 30, h: 14, kampar: [m(1, 0, 6), m(3, 1, 26)] }, 3);
    for (const [t, nere] of [[st2, true], [st3, false]] as const) { const k = t.kampar[0]; k.skador = [{ d: 'bal', k: 'skarsar', g: 0.5, ny: 1 }]; k.blod = 0.9; if (nere) k.lage = 'nere'; SIM.stridSteg(t); }
    const liggande = st2.kampar[0].blod > st3.kampar[0].blod;
    // efter striden: den med kortast tid kvar vårdas först
    const s = createState(1, START), [g, q1, q2] = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
    q1.x = g.x + 4; q1.y = g.y; q1.skador = [{ d: 'armV', k: 'skarsar', g: 0.3, b: 1 }];
    q2.x = g.x + 8; q2.y = g.y; q2.skador = [{ d: 'bal', k: 'sticksar', g: 0.9, b: 1 }]; q2.blod = SIM.HALSA.blodDod + 0.05;
    const forst = SIM.vardVal(s, g, false)?.ref;
    return [
      [`den empatiska kämpen drar undan sin blödande vän och trycker på såret (${raddad ? 'ja' : 'nej'})`, raddad && tryckt],
      [`den fallne trycker liggande och blöder mindre (${st2.kampar[0].blod.toFixed(3)} mot ${st3.kampar[0].blod.toFixed(3)})`, liggande],
      [`efter striden vårdas den med kortast tid kvar först, fast hen står längre bort (${forst === q2.id ? 'ja' : 'nej'})`, forst === q2.id],
    ];
  },
};

SCENARIER.roller = {
  text: 'Steg 9.5.19: tre roller vid larm. Kämpar, hjälpare och gömda väljs ur ett värde av ålder, mod och hälsa när larmet går, och väljs om när något händer (någon skadas eller dör). Vargarnas och rövarnas regler är rader i samma register, och rollen syns i kortet',
  kor: () => {
    const { rollVid, LARMHOT, larmRollNu, skada } = SIM;
    const s = createState(1, START), vuxna = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
    const [modig, rädd] = vuxna; modig.pot.mod = 20; rädd.pot.mod = 1;
    const r1 = rollVid(s, modig, 'rovare'), r2 = rollVid(s, rädd, 'rovare');
    const samma = rollVid(s, modig, 'rovare') === r1 && modig.larmRoll?.t === s.now;
    // något händer: den modiga skadas svårt och väljer om
    modig.health = 0.1; skada(s, modig, 'bal', 'sticksar', 0.5, 'blod', 'i en strid');
    const om = rollVid(s, modig, 'rovare');
    const barn = SIM.living(s).find(r => SIM.ageOf(r, s.now) < SIM.ALDER.vaktFran);
    return [
      [`hoten är rader i samma register (${Object.keys(LARMHOT).join(', ')})`, !!LARMHOT.rovare && !!LARMHOT.varg],
      [`den modiga strider och den rädda gömmer sig (${r1}, ${r2})`, r1 === 'kampe' && r2 !== 'kampe'],
      [`rollen står kvar tills något händer, och syns i kortet (${larmRollNu(s, rädd)?.roll ?? 'ingen'})`, samma && !!larmRollNu(s, rädd)],
      [`när den modiga skadas svårt väljs rollen om (${r1} → ${om})`, om !== 'kampe'],
      [`barnen gömmer sig (${barn ? rollVid(s, barn, 'varg') : 'inget barn'})`, !barn || rollVid(s, barn, 'varg') === 'gomd'],
    ];
  },
};

SCENARIER.undsattning = {
  text: 'Steg 9.5.20: undsättningen. De vuxna som inte slåss följer med som hjälpare, håller sig på avstånd från fienderna, drar undan den som fallit när ingen fiende står nära och trycker på såret; hjälparna slåss inte, och striden avgörs av kämparna',
  kor: () => {
    const m = (id: number, sida: 0 | 1, x: number, hjalp = false) => ({ id, namn: `K${id}`, sida, st: { styrka: 10, uthallighet: 10, mod: 14, smidighet: 10, skicklighet: 10 }, vapen: 'kniv' as SIM.Vapen, klader: [], fart: 1, x, y: 7, ...(hjalp ? { hjalp: true as const } : {}) });
    const st = SIM.nyStrid({ avsikt: 'skada', w: 32, h: 14, kampar: [m(1, 0, 24), m(2, 0, 18), m(3, 0, 6, true), m(4, 1, 26)] }, 5);
    const [, fallen, h, fiende] = st.kampar;
    fallen.lage = 'nere'; fallen.skador = [{ d: 'bal', k: 'sticksar', g: 0.8, ny: 1 }]; fallen.blod = 0.7;
    let narmast = Infinity, raddad = false;
    for (let i = 0; i < 400 && !st.slut; i++) { SIM.stridSteg(st); if (fiende.lage === 'strid') narmast = Math.min(narmast, Math.hypot(h.x - fiende.x, h.y - fiende.y)); if (st.logg.some(r => r.h === 'raddar' && r.a === h.id)) raddad = true; }
    const slogs = st.logg.some(r => (r.h === 'traff' || r.h === 'miss') && r.a === h.id);
    return [
      [`hjälparen drar undan den fallne och trycker på såret (${raddad ? 'ja' : 'nej'})`, raddad],
      [`hjälparen slåss inte (${slogs ? 'slogs' : 'slogs inte'})`, !slogs],
      [`striden avgörs av kämparna, inte hjälparen (${st.slut ? 'avgjord' : 'pågår'})`, !!st.slut],
    ];
  },
};

SCENARIER.pilisaret = {
  text: 'Steg 9.5.21: vapnet i såret. En pil eller ett kastspjut sitter kvar, pluggar såret så att det blöder mindre och hindrar delen, och dras ut som en behandling som får såret att blöda mer en stund',
  kor: () => {
    const { blodning, delFel, vardKlar, halsaSteg, HALSA, VAPEN } = SIM;
    const s = createState(1, START), [g, q] = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
    const pil = !!VAPEN.bage.kast.fastnar;
    q.skador = [{ d: 'armV', k: 'sticksar', g: 0.5, b: 1 }];
    const utan = blodning(q), felUtan = delFel(q, 'armV');
    q.skador[0].fast = 1;
    const med = blodning(q), felMed = delFel(q, 'armV');
    g.x = q.x; g.y = q.y;
    vardKlar(s, g, { act: 'varda', phase: 'do', tx: q.x, ty: q.y, until: s.now, carry: 0, why: '', ref: q.id });
    const w = q.skador![0], drogs = !w.fast && w.drog !== undefined;
    w.b = 1; w.f = undefined; const efter = blodning(q);
    s.now += (HALSA.draTim + 0.1) * SIM.HOUR; halsaSteg(s, q, 1); const sen = blodning(q);
    return [
      [`pilen sitter kvar i såret som kastspjutet (${pil ? 'ja' : 'nej'})`, pil],
      [`vapnet pluggar såret (${med.toFixed(3)} mot ${utan.toFixed(3)} i timmen) och hindrar delen (${felMed.toFixed(2)} mot ${felUtan.toFixed(2)})`, med < utan && felMed > felUtan],
      [`vårdaren drar ut det (${drogs ? 'ja' : 'nej'}), och såret blöder mer en stund (${efter.toFixed(3)}) och sedan som vanligt (${sen.toFixed(3)})`, drogs && efter > utan * 0.99 && sen < efter],
    ];
  },
};

SCENARIER.olyckshugg = {
  text: 'Steg 9.5.22: olyckshugget. Vid varje hård träff finns en risk av vapnets skärpa, slagets kraft och skyddet på delen: en arm, ett ben, en hand eller en fot huggs av, och huvudet eller bålen dödar direkt',
  kor: () => {
    const { VAPEN, nyStrid, traffa, STRID } = SIM;
    const skarpa = VAPEN.yxa.skarpa > VAPEN.kniv.skarpa && VAPEN.kniv.skarpa > VAPEN.hand.skarpa && VAPEN.hand.skarpa === 0;
    const m = (id: number, sida: 0 | 1, vapen: SIM.Vapen) => ({ id, namn: `K${id}`, sida, st: { styrka: 14, uthallighet: 10, mod: 10, smidighet: 10, skicklighet: 10 }, vapen, klader: [], fart: 1, x: 8 + sida * 2, y: 7 });
    let avArm = 0, dodBal = 0, hand = 0;
    for (let f = 0; f < 400; f++) {
      const st = nyStrid({ avsikt: 'doda', w: 20, h: 14, kampar: [m(1, 0, 'yxa'), m(2, 1, 'hand')] }, f), [a, b] = st.kampar;
      SIM.TRAFFDEL_PROV.del = f % 2 ? 'armV' : 'bal';
      traffa(st, a, b, 1, 'hugg');
      if (b.skador.some(w => w.av && w.d === 'armV')) avArm++;
      if (b.lage === 'dod' && st.logg.some(r => r.h === 'hugg')) dodBal++;
      const st2 = nyStrid({ avsikt: 'doda', w: 20, h: 14, kampar: [m(1, 0, 'hand'), m(2, 1, 'hand')] }, f);
      traffa(st2, st2.kampar[0], st2.kampar[1], 1, 'slag'); if (st2.kampar[1].skador.some(w => w.av)) hand++;
    }
    SIM.TRAFFDEL_PROV.del = undefined;
    return [
      [`vapnen har en skärpa (yxa ${VAPEN.yxa.skarpa}, kniv ${VAPEN.kniv.skarpa}, händerna ${VAPEN.hand.skarpa})`, skarpa],
      [`en hård träff med yxan hugger ibland av armen (${avArm} av 200) och dödar ibland i bålen (${dodBal} av 200)`, avArm > 0 && dodBal > 0 && avArm < 200],
      [`händerna hugger aldrig av något (${hand} av 400)`, hand === 0],
      [`bara hårda träffar kan hugga (från graden ${STRID.huggMin})`, STRID.huggMin > 0],
    ];
  },
};

SCENARIER.infektion = {
  text: 'Steg 9.5.24: infektionens risk och stadier. Risken beror på sårslaget, smutsen, förbandet och rengöringen, och en infektion går genom rodnad och feber till kallbrand på ungefär tre dygn, med tecknen i kortet, bilden och notiserna',
  kor: () => {
    const { SKADOR, HALSA, infStadium, halsaSteg, skadeLista } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const risk = (SKADOR.bett.inf ?? 1) > (SKADOR.skarsar.inf ?? 1);
    // stadierna: ett infekterat sår utan vård
    p.skador = [{ d: 'armV', k: 'skarsar', g: 0.3, b: 0, inf: 0.01 }];
    const steg: number[] = [], ord: string[] = [];
    let tim = 0;
    while ((p.skador?.[0]?.inf ?? 1) < HALSA.kallbrand && tim < 200) { s.now += SIM.HOUR; halsaSteg(s, p, 3600); tim++; const st = p.skador?.[0] ? infStadium(p.skador[0]) : 0; if (!steg.includes(st)) { steg.push(st); ord.push(skadeLista(p, s.now)[0]?.gar ?? ''); } }
    const notis = (s.notiser?.lista ?? []).some(n => n.id === 'infektion');
    return [
      [`ett bett infekteras lättare än ett skärsår (${SKADOR.bett.inf} mot ${SKADOR.skarsar.inf})`, risk],
      [`infektionen går genom rodnad och feber till kallbrand (${steg.join(' → ')}) på ${tim} timmar`, steg.join() === '1,2,3' && tim > 24 && tim < 72],
      [`kortet säger stadiet (${ord.join('; ')}) och en notis kommer (${notis ? 'ja' : 'nej'})`, ord.some(o => o.includes('feber')) && notis],
    ];
  },
};

SCENARIER.infbalans = {
  text: 'Steg 9.5.26: infektionens balans. Ett ovårdat bett eller sticksår infekteras i ungefär hälften av fallen, ett skärsår med en remsa nästan aldrig, och den som sköljer och vilar klarar sig nästan alltid (räknat ur risken per timme och sårets läketid)',
  kor: () => {
    const { HALSA, SKADOR } = SIM;
    const p = (k: 'bett' | 'sticksar' | 'skarsar', g: number, f = 1) => 1 - Math.exp(-HALSA.infRisk * (SKADOR[k].inf ?? 1) * f * g * SKADOR[k].lakTim);
    const bett = p('bett', 0.5), stick = p('sticksar', 0.5), remsa = p('skarsar', 0.5, HALSA.remsa), skoljt = p('bett', 0.5, HALSA.infRen * HALSA.remsa);
    const pr = (x: number) => `${Math.round(x * 100)} %`;
    return [
      [`ett ovårdat bett infekteras i ${pr(bett)} och ett sticksår i ${pr(stick)} av fallen (ungefär hälften)`, bett > 0.3 && bett < 0.7 && stick > 0.3 && stick < 0.7],
      [`ett skärsår med en remsa infekteras nästan aldrig (${pr(remsa)})`, remsa < 0.05],
      [`ett sköljt bett med remsa infekteras sällan (${pr(skoljt)})`, skoljt < 0.05],
    ];
  },
};

// att sätta benet och spjälan (steg 9.5.28)
function sattaBenet(): [string, boolean][] {
  const { vardKlar, kanGa, handighet, protesTimme, addTool, setAmount, HALSA } = SIM;
  const s = createState(1, START), [g, q] = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
  const vard = () => { g.x = q.x; g.y = q.y; vardKlar(s, g, { act: 'varda', phase: 'do', tx: q.x, ty: q.y, until: s.now, carry: 0, why: '', ref: q.id }); };
  setAmount(s, 'grenar', 10); setAmount(s, 'remsa', 4);
  g.skill.lakekonst = HALSA.sattaLak;
  q.skador = [{ d: 'benV', k: 'benbrott', g: 0.6, b: 0, t0: s.now }]; vard();
  const satt = !!q.skador[0].satt && !!q.skador[0].spala;
  const utanKrycka = kanGa(q);
  addTool(s, 'krycka', g).agare = 0; protesTimme(s);
  const medKrycka = kanGa(q);
  let fel = 0;
  for (let i = 0; i < 40; i++) { g.skill.lakekonst = 0; q.skador = [{ d: 'benH', k: 'benbrott', g: 0.4, b: 0, t0: s.now }]; vard(); if (q.skador[0].snett) fel++; }
  const h0 = handighet(q); q.skador = [{ d: 'armV', k: 'benbrott', g: 0.2, b: 0, t0: s.now, satt: 1 }]; const h1 = handighet(q); q.skador[0].spala = 1; const h2 = handighet(q);
  return [
    [`benet sätts och spjälas inom tiden av den som kan Läkekonst (${satt ? 'ja' : 'nej'})`, satt],
    [`utan Läkekonst går det ibland fel och benet läker snett (${fel} av 40)`, fel > 4 && fel < 36],
    [`med ett brutet ben kan hen inte gå (${utanKrycka ? 'går' : 'kan inte'}), men med kryckan (${medKrycka ? 'går' : 'kan inte'})`, !utanKrycka && medKrycka],
    [`den spjälade armen halverar händigheten (${h0.toFixed(2)}, ${h1.toFixed(2)} → ${h2.toFixed(2)})`, Math.abs(h2 - h1 * HALSA.spalaHand) < 1e-9],
  ];
}

SCENARIER.benbrott = {
  text: 'Steg 9.5.27: benbrottets två slag och läkningen. Ett brott är slutet eller öppet (ett stort sår dessutom), revben och skalle vilas bara, ett brott som inte sätts i tid läker snett på dubbla tiden och kan ge ett bestående men, och barn läker fortare och gamla långsammare. Att sätta benet och spjälan (steg 9.5.28): benet sätts inom tiden, det går fel utan Läkekonst, kryckan låter hen gå och den spjälade armen halverar händigheten',
  kor: () => {
    const { skada, halsaSteg, HALSA, BARA_VILA } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen && SIM.ageOf(r, s.now) < SIM.ALDER.gammal)!;
    let oppna = 0;
    for (let i = 0; i < 200; i++) { p.skador = undefined; skada(s, p, 'benV', 'benbrott', 0.6, 'olycka', ''); if (p.skador!.some(w => w.oppet) && p.skador!.some(w => w.k === 'skarsar')) oppna++; }
    const lak = (alder: number, snett: boolean) => { const c = SIM.cloneState(s), q = c.people.find(r => r.id === p.id)!; q.born = c.now - alder * SIM.DAY; q.skador = [{ d: 'benV', k: 'benbrott', g: 0.6, b: 0, t0: c.now, ...(snett ? { snett: 1 } : { satt: 1 }) }]; halsaSteg(c, q, 24 * 3600); return 0.6 - (q.skador?.[0]?.g ?? 0); };
    const vuxen = lak(30, false), snett = lak(30, true), barn = lak(8, false), gammal = lak(70, false);
    return [
      [`ett benbrott är ibland öppet med ett stort sår (${oppna} av 200)`, oppna > 20 && oppna < 100],
      [`revbenen och skallen vilas bara (${[...BARA_VILA].join(', ')})`, BARA_VILA.has('bal') && BARA_VILA.has('huvud')],
      [`ett snett brott läker hälften så fort (${snett.toFixed(3)} mot ${vuxen.toFixed(3)} på ett dygn)`, Math.abs(snett - vuxen / 2) < 0.01],
      [`barn läker fortare och gamla långsammare (${barn.toFixed(3)}, ${vuxen.toFixed(3)}, ${gammal.toFixed(3)})`, barn > vuxen && vuxen > gammal],
      [`ett brott som inte sätts inom ${HALSA.sattTim} timmar läker snett`, HALSA.sattTim > 0],
      ...sattaBenet(),
    ];
  },
};

SCENARIER.forlossning = {
  text: 'Steg 9.5.29: förlossningen. Födseln tar tid: modern lägger sig, förloppet dras ur registret FORLOPP, den som bäst kan hjälpa kommer, och hjälparens vård (Läkekonst, egna barn, rena händer, värme, kokt vatten och remsor) sänker riskerna; texten om förloppet står i notisen',
  kor: () => {
    const { borjaForlossning, birth, forlossRisk, vardKvalitet, FORLOPP, FORLOPP_LIST } = SIM;
    const s = createState(1, START), m = SIM.living(s).find(r => r.sex === 'k' && SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const g = SIM.living(s).find(r => r !== m && SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    m.pregnantSince = s.now - 400 * SIM.DAY; m.pregnantBy = m.partner;
    g.x = m.x + 2; g.y = m.y;
    borjaForlossning(s, m);
    const foder = m.task?.act === 'foder' && !!m.foder, hjalper = SIM.living(s).some(r => r.task?.act === 'forlossa' && r.task.ref === m.id);
    const summa = FORLOPP_LIST.reduce((a, k) => a + FORLOPP[k].p, 0);
    // vården sänker riskerna
    const utan = (() => { const c = SIM.cloneState(s), mm = c.people.find(r => r.id === m.id)!; mm.foder = { f: 'fel', till: c.now }; return forlossRisk(c, mm).mor; })();
    const med = (() => { const c = SIM.cloneState(s), mm = c.people.find(r => r.id === m.id)!, gg = c.people.find(r => r.id === g.id)!; gg.skill.lakekonst = 8; mm.foder = { f: 'fel', till: c.now, hjalp: gg.id }; return forlossRisk(c, mm).mor; })();
    const fore = s.people.length;
    s.now = m.foder!.till; birth(s, m);
    const fodd = s.people.length > fore || (s.stat?.dodfodda ?? 0) > 0;
    return [
      [`förloppen är rader med sannolikheter som blir 1 (${FORLOPP_LIST.join(', ')})`, Math.abs(summa - 1) < 1e-9],
      [`modern lägger sig och föder (${foder ? 'ja' : 'nej'}), och en hjälpare kommer (${hjalper ? 'ja' : 'nej'})`, foder && hjalper],
      [`en skicklig hjälpare sänker risken för modern när barnet ligger fel (${(utan * 100).toFixed(1)} % → ${(med * 100).toFixed(1)} %, vården ${vardKvalitet(s, g, m).toFixed(2)})`, med < utan],
      [`när tiden gått föds barnet (${fodd ? 'ja' : 'nej'})`, fodd && !m.foder],
    ];
  },
};

SCENARIER.vardlag = {
  text: 'Steg 9.5.30: lagen om rätten till vård. Straffet Ingen vård (en rad i straffen) gör att ingen vårdar den straffade så länge det varar, och en hård by ger den som inte kan arbeta mindre mat när maten är knapp',
  kor: () => {
    const { vardVal, vardRatt, skada, STRAFF_REG, STR, MAT, KROPP, VARDRATT, mindreMat } = SIM;
    const s = createState(1, START), [g, q] = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
    for (const r of SIM.living(s)) if (r !== g && r !== q) { r.x = 5; r.y = 5; }
    q.x = g.x + 3; q.y = g.y;
    skada(s, q, 'bal', 'sticksar', 0.5, 'blod', 'i en strid');
    const fore = vardVal(s, g, false)?.ref === q.id;
    q.utanVard = s.now + STR.vardDygn * SIM.DAY;
    const efter = vardVal(s, g, false)?.ref !== q.id && vardRatt(s, g, q) === 0;
    s.now = q.utanVard + 1;
    const igen = vardVal(s, g, false)?.ref === q.id;
    // den som inte kan arbeta i en hård by med knapp mat
    const h = SIM.createState(2, START), p = SIM.living(h).find(r => SIM.ageOf(r, h.now) >= SIM.ALDER.vuxen)!;
    h.seder.v.arbete = 1; p.saknas = ['benV', 'benH']; p.hunger = KROPP.hungrig * (VARDRATT.snal + 1) / 2;
    const knapp = mindreMat(h, p, () => 1), gott = mindreMat(h, p, () => 10);
    for (const k of SIM.FOOD) SIM.setAmount(h, k, 0);
    const vantar = SIM.foodDays(h) < VARDRATT.knapp && !MAT.behover(h, p);
    h.seder.v.arbete = 0; h.seder.v.gemenskap = 0;
    const mild = !mindreMat(h, p, () => 1);
    return [
      [`straffet Ingen vård finns bland straffen (${STRAFF_REG.map(r => r.namn).join(', ')})`, STRAFF_REG.some(r => r.namn === 'Ingen vård')],
      [`den skadade vårdas (${fore ? 'ja' : 'nej'}), inte medan straffet varar (${efter ? 'ja' : 'nej'}), och igen efteråt (${igen ? 'ja' : 'nej'})`, fore && efter && igen],
      [`i en hård by äter den som inte kan gå mindre när maten är knapp (${knapp ? 'ja' : 'nej'}), inte när maten räcker (${gott ? 'nej' : 'ja'})`, knapp && !gott],
      [`hen väntar med att äta tills hen är hungrigare (${vantar ? 'ja' : 'nej'}), och en mild by gör inte så (${mild ? 'ja' : 'nej'})`, vantar && mild],
    ];
  },
};

SCENARIER.halsonotiser = {
  text: 'Steg 9.5.31: notiserna om hälsan. Registret HALSOTECKEN jämför kroppen varje timme: en notis när blodet sjunker ett steg, ett sår blöder igen, någon svimmar, en infektion börjar, ett ben bryts eller läker snett och en del förloras, med vem, vad och vad som behövs; och när faran är över (blödningen stoppad, infektionen borta, benet satt)',
  kor: () => {
    const { halsoNotiser, skada, HALSA, NOTISER, HALSOTECKEN, HALSOTECKEN_LIST } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const har = (id: string) => (s.notiser?.lista ?? []).find(n => n.id === id)?.rader.join(' ') ?? '';
    halsoNotiser(s);
    skada(s, p, 'bal', 'sticksar', 0.6, 'blod', 'i en strid');
    p.blod = (HALSA.slass + HALSA.kryp) / 2; halsoNotiser(s);
    const steg = har('blodsteg');
    const w = p.skador!.find(x => x.k === 'sticksar')!;
    w.b = 0; halsoNotiser(s); const stopp = har('blodstopp');
    w.b = 1; halsoNotiser(s); const igen = har('blodigen');
    p.svimmat = true; halsoNotiser(s); const svim = har('svimmat');
    w.inf = 0.1; halsoNotiser(s); const inf = har('infborjar');
    w.inf = undefined; halsoNotiser(s); const borta = har('infborta');
    skada(s, p, 'benV', 'benbrott', 0.6, 'blod', 'när hen föll'); halsoNotiser(s); const brott = har('benbrott');
    p.skador!.find(x => x.k === 'benbrott')!.satt = 1; halsoNotiser(s); const satt = har('bensatt');
    (p.saknas ??= []).push('handV'); halsoNotiser(s); const av = har('avhuggen');
    const rader = HALSOTECKEN_LIST.every(k => NOTISER[HALSOTECKEN[k].notis]);
    return [
      [`varje tecken har en rad i NOTISER (${HALSOTECKEN_LIST.join(', ')})`, rader],
      [`blodet sjunker ett steg, med vad som behövs ("${steg}")`, steg.includes(p.name) && steg.includes('Behöver')],
      [`blödningen stoppas ("${stopp}") och börjar igen ("${igen}")`, !!stopp && !!igen],
      [`hen svimmar ("${svim}")`, !!svim],
      [`en infektion börjar ("${inf}") och går över ("${borta}")`, !!inf && !!borta],
      [`ett ben bryts ("${brott}") och sätts ("${satt}")`, !!brott && !!satt],
      [`en del förloras ("${av}")`, !!av],
    ];
  },
};
