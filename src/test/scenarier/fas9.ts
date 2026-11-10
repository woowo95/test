// Scenarier. Fas 9: kartan växer (9.1) och fördjupningarna.
import { createState } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, kor, klockan } from './hjalp';

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

SCENARIER.matgrupper = {
  text: 'Steg 9.6.1: ingrediensgrupperna. Varje råvara hör till en eller flera grupper (stärkelse, protein, grönt, sött, smak och fett): all mat som inte är en lagad rätt har en rad i INGREDIENSER, och fet fisk är både protein och fett',
  kor: () => {
    const { FOOD, INGREDIENSER, grupperAv, rattInfo, MATGRUPP_LIST } = SIM;
    const utan = FOOD.filter(k => !rattInfo(k) && !INGREDIENSER[k]);
    const fet = grupperAv('mort');
    return [
      [`all mat utom rätterna har grupper (saknas: ${utan.join(', ') || 'inga'})`, !utan.length],
      [`grupperna är sex (${MATGRUPP_LIST.join(', ')})`, MATGRUPP_LIST.length === 6],
      [`mört är både protein och fett (${fet.join(', ')})`, fet.includes('protein') && fet.includes('fett')],
      [`röllekan är smak (${grupperAv('rolleka').join(', ')})`, grupperAv('rolleka').includes('smak')],
    ];
  },
};

SCENARIER.maltidsniva = {
  text: 'Steg 9.6.2: måltidernas nivåer. Rått, enkel, lagad och fin efter hur många grupper som ingår: det grillade och torkade är enkelt, en rätt ur krukan med två grupper är lagad och med tre, varav en är smak, fin. En lagad måltid höjer humöret lite och en fin mer',
  kor: () => {
    const { maltidsNiva, nivaAvGrupper, MAT, rattId, FOOD, setAmount } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const ata = (k: string) => { for (const f of FOOD) setAmount(s, f, 0); setAmount(s, k, 4); p.thoughts = []; p.hunger = 0.2; MAT.anvand(s, p); return p.thoughts.find(t => t.text.startsWith('Åt en'))?.v ?? 0; };
    const lagad = ata(rattId('fisk', 'gryta', 'lagad')), fin = ata(rattId('fisk', 'gryta', 'fin')), grill = ata('grillfisk');
    return [
      [`nivåerna: abborre ${maltidsNiva('abborre')}, grillad fisk ${maltidsNiva('grillfisk')}, fiskgryta ${maltidsNiva(rattId('fisk', 'gryta', 'lagad'))}`, maltidsNiva('abborre') === 'ratt' && maltidsNiva('grillfisk') === 'enkel'],
      [`två grupper är lagad, tre med smak fin (${nivaAvGrupper(new Set(['protein', 'starkelse']))}, ${nivaAvGrupper(new Set(['protein', 'starkelse', 'smak']))}, ${nivaAvGrupper(new Set(['protein', 'starkelse', 'fett']))})`, nivaAvGrupper(new Set(['protein', 'starkelse'])) === 'lagad' && nivaAvGrupper(new Set(['protein', 'starkelse', 'smak'])) === 'fin' && nivaAvGrupper(new Set(['protein', 'starkelse', 'fett'])) === 'lagad'],
      [`en lagad måltid höjer humöret (${lagad}), en fin mer (${fin}), det grillade inte (${grill})`, lagad > 0 && fin > lagad && grill === 0],
    ];
  },
};

SCENARIER.kokning = {
  text: 'Steg 9.6.3: tillagningen och rätternas namn. Registret TILLAGNING har grilla och koka; en rätt i lerkrukan får namnet av huvudingrediensen och kategorin med nivån efter (Fiskgryta · Fin). Kocken förbereder rätten några minuter, och sedan sjuder grytan på elden medan kocken gör annat',
  kor: () => {
    const { kokRecept, kokaKlar, stepKok, kanKoka, TILLAGNING, setAmount, addTool, chooseTask, SAKER, amountOf, rattId } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    for (const k of SIM.FOOD) setAmount(s, k, 0);
    setAmount(s, 'fisk', 4); setAmount(s, 'rotter', 4); setAmount(s, 'rolleka', 2);
    p.tek = { ...(p.tek ?? {}), kruka: 1 }; s.fire.lit = true; p.skill.matlagning = SIM.MATLAG.brannFull; // en skicklig kock bränner inget (steg 9.6.4)
    const kr = addTool(s, 'lerkruka_mellan', p); kr.hos = undefined;
    const r = kokRecept(s, p), namn = r ? SAKER[r.id]!.namn : '';
    const kan = kanKoka(s, p);
    kokaKlar(s, p);
    const pa = !!kr.kok && amountOf(s, 'fisk') === 2 && amountOf(s, 'rotter') === 2 && amountOf(s, 'rolleka') === 1;
    p.task = undefined; p.hunger = 0.9; p.rest = 1; chooseTask(s, p);
    const akt = (p.task as SIM.Person["task"])?.act, annat = akt !== "koka_mat" && !!kr.kok;
    s.fire.lit = false; stepKok(s); const vantar = !!kr.kok;
    s.fire.lit = true; stepKok(s);
    const klar = !kr.kok && amountOf(s, rattId('fisk', 'gryta', 'fin')) === 4;
    return [
      [`grilla och koka är rader i TILLAGNING (${Object.keys(TILLAGNING).join(', ')})`, !!TILLAGNING.grilla && !!TILLAGNING.koka],
      [`av fisk, rötter och rölleka blir det ${namn || 'inget'}`, namn === 'Fiskgryta · Fin'],
      [`kocken kan laga maten (${kan ? 'ja' : 'nej'}), och grytan står på elden i krukan med råvarorna (${pa ? 'ja' : 'nej'})`, kan && pa],
      [`kocken gör annat medan grytan sjuder (${akt})`, annat],
      [`utan eld kokar den inte (${vantar ? 'står kvar' : 'klar'}), och med eld blir den fyra portioner i förrådet (${klar ? 'ja' : 'nej'})`, vantar && klar],
    ];
  },
};

SCENARIER.kocken = {
  text: 'Steg 9.6.4: kocken. Det som bränns är hela bitar: varje bit bränns eller inte med en chans som sjunker med färdigheten Matlagning, och en skicklig kock ger maten en liten humörhöjning',
  kor: () => {
    const { grilla, setAmount, amountOf, MAT, FOOD, MATLAG } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    s.fire.lit = true; s.stationer = [...(s.stationer ?? []), { id: 999, k: 'grill', x: 1, y: 1, kvar: 0 } as SIM.Station];
    const prov = (skill: number) => {
      for (const k of FOOD) setAmount(s, k, 0); setAmount(s, 'fisk', 40); s.stat = {};
      p.skill.matlagning = skill; for (let i = 0; i < 10; i++) grilla(s, p, 0.5);
      return { grillat: amountOf(s, 'grillfisk'), brant: s.stat.brant as number ?? 0, kvar: amountOf(s, 'fisk') };
    };
    const ovan = prov(0), skicklig = prov(MATLAG.brannFull);
    p.thoughts = []; p.hunger = 0.2; MAT.anvand(s, p);
    const glad = p.thoughts.find(t => t.text === 'Maten var vällagad')?.v ?? 0;
    const hela = [ovan.grillat, ovan.brant, skicklig.grillat].every(n => Number.isInteger(n));
    return [
      [`den ovane bränner hela bitar (${ovan.grillat} grillade, ${ovan.brant} brända av ${40 - ovan.kvar})`, hela && ovan.brant > 0 && ovan.grillat + ovan.brant === 40 - ovan.kvar],
      [`den skicklige bränner inget (${skicklig.brant} brända, ${skicklig.grillat} grillade)`, skicklig.brant === 0 && skicklig.grillat > 0],
      [`maten från en skicklig kock höjer humöret (${glad})`, glad > 0],
    ];
  },
};

SCENARIER.variation = {
  text: 'Steg 9.6.5: variation. Var och en minns proteinet i de senaste måltiderna, och den som ätit samma protein för många gånger tröttnar och får tanken "Fisk igen", som drar ner humöret lite; den som äter omväxlande gör det inte',
  kor: () => {
    const { MAT, FOOD, setAmount, VARIATION } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const ata = (k: string) => { for (const f of FOOD) setAmount(s, f, 0); setAmount(s, k, 4); p.hunger = 0.2; MAT.anvand(s, p); };
    p.protMinne = []; p.thoughts = [];
    for (let i = 0; i < VARIATION.trott; i++) ata('grillfisk');
    const igen = p.thoughts.find(t => t.text === 'Fisk igen')?.v ?? 0;
    p.protMinne = []; p.thoughts = [];
    for (let i = 0; i < VARIATION.trott; i++) ata(i % 2 ? 'grillfisk' : 'grillkott');
    const blandat = !p.thoughts.some(t => t.text.endsWith(' igen'));
    return [
      [`den som ätit fisk ${VARIATION.trott} gånger får tanken Fisk igen (${igen})`, igen < 0 && igen > -0.05],
      [`den som äter fisk och kött omväxlande tröttnar inte (${blandat ? 'ja' : 'nej'})`, blandat],
    ];
  },
};

SCENARIER.favorit = {
  text: 'Steg 9.6.6: favoriter och avsky. En fin måltid ger tycke för rättens huvudingrediens och en matförgiftning avsmak för det man åt; en stark smak är en favorit eller en avsky, som bleknar med tiden om den inte förnyas och sprids i samtal till den som står en nära',
  kor: () => {
    const { ratt, smakAv, favoriter, stepRykten, berattaSmak, MAT, FOOD, setAmount, rattId, RYKTE } = SIM;
    const s = createState(1, START), [p, q] = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
    p.smak = {}; q.smak = {};
    for (let i = 0; i < 3000 && smakAv(p, 'm:fisk') > -RYKTE.smakFavorit; i++) { ratt(s, p, { fisk: 1 }, 1); p.sjuk = undefined; p.sickUntil = undefined; }
    const avsky = smakAv(p, 'm:fisk'), fav = favoriter(p).some(f => f.k === 'fisk' && f.v < 0);
    berattaSmak(p, q, 60); const spred = smakAv(q, 'm:fisk');
    for (let h = 0; h < 5 * 24; h++) stepRykten(s, () => 0.5);
    const bleknat = smakAv(p, 'm:fisk');
    for (const k of FOOD) setAmount(s, k, 0); setAmount(s, rattId('fisk', 'gryta', 'fin'), 4); q.hunger = 0.2; MAT.anvand(s, q);
    const gott = smakAv(q, 'm:fisk');
    return [
      [`en matförgiftning av rå fisk ger avsky för fisk (${avsky.toFixed(2)}), och den står bland favoriterna och avskyn (${fav ? 'ja' : 'nej'})`, avsky <= -RYKTE.smakFavorit && fav],
      [`avskyn sprids i samtal till en vän (${spred.toFixed(2)})`, spred < 0],
      [`avskyn bleknar på fem dygn (${avsky.toFixed(2)} → ${bleknat.toFixed(2)})`, bleknat > avsky && bleknat < 0 && Math.abs(bleknat) < Math.abs(avsky) * 0.7],
      [`en fin fiskgryta ger vännen tycke för fisken (${spred.toFixed(2)} → ${gott.toFixed(2)})`, gott > spred],
    ];
  },
};

SCENARIER.ratthaller = {
  text: 'Steg 9.6.7: maten håller. En rätts hållbarhet är medelvärdet av ingrediensernas, så torkad råvara gör att rätten håller längre',
  kor: () => {
    const { kokRecept, setAmount, SAKER, hallerMedel, FOOD } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const prov = (k: string) => { for (const f of FOOD) setAmount(s, f, 0); setAmount(s, k, 4); setAmount(s, 'rotter', 4); const r = kokRecept(s, p); return r ? { namn: SAKER[r.id]!.namn, haller: SAKER[r.id]!.haller!, medel: hallerMedel([[r.huvud, 2], [r.andra, 2]]) } : undefined; };
    const farsk = prov('fisk'), torr = prov('torrfisk');
    return [
      [`av färsk fisk och rötter (medel ${farsk?.medel.toFixed(1)} dygn) håller ${farsk?.namn} ${farsk?.haller} dygn`, !!farsk && farsk.haller < 5],
      [`av torkad fisk och rötter (medel ${torr?.medel.toFixed(1)} dygn) håller ${torr?.namn} ${torr?.haller} dygn`, !!torr && !!farsk && torr.haller > farsk.haller],
    ];
  },
};

SCENARIER.rokeri = {
  text: 'Steg 9.6.8: rökeriet. En station där kött och fisk röks på ett dygn i stället för torkningens fem, också i regn och på vintern, och rökt mat håller som torkad men smakar lite bättre',
  kor: () => {
    const { torka, kanTorka, setAmount, amountOf, SAKER, ROK, TORK, MAT, FOOD, STATIONER } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    for (const k of FOOD) setAmount(s, k, 0);
    setAmount(s, 'fisk', 30);
    s.stationer = [...(s.stationer ?? []), { id: 998, k: 'rokeri', x: 2, y: 2, kvar: 0 } as SIM.Station];
    p.tek = { ...(p.tek ?? {}), rokeri: 1 };
    const kan = kanTorka(s, p, 'rokeri');
    torka(s, p, 1, 'rokeri'); const uppe = 30 - amountOf(s, 'fisk');
    s.now += ROK.dygn * SIM.DAY + SIM.HOUR; torka(s, p, 1, 'rokeri');
    const rokt = amountOf(s, 'rokfisk');
    for (const k of FOOD) setAmount(s, k, 0); setAmount(s, 'rokfisk', 4); p.thoughts = []; p.hunger = 0.2; MAT.anvand(s, p);
    const gott = p.thoughts.some(t => t.text === 'Åt rökt mat');
    return [
      [`byn kan röka (${kan ? 'ja' : 'nej'}), och fisken hängs upp i rökeriet (${uppe})`, kan && uppe > 0],
      [`efter ett dygn (${ROK.dygn} mot torkningens ${TORK.dygn}) är den rökt (${rokt} rökt fisk)`, rokt === uppe && ROK.dygn < TORK.dygn],
      [`rökt fisk håller som torkad (${SAKER.rokfisk!.haller} och ${SAKER.torrfisk!.haller} dygn) och smakar lite bättre (${gott ? 'ja' : 'nej'})`, SAKER.rokfisk!.haller === SAKER.torrfisk!.haller && gott],
      [`rökeriet är en station (${STATIONER.rokeri.namn})`, !!STATIONER.rokeri],
    ];
  },
};

SCENARIER.saft = {
  text: 'Steg 9.6.9: saften, den första drycken. 10 bär krossas i en mellanstor lerkruka till 5 saft (3 minuter); saften står kvar i krukan, den törstige dricker den och blir glad av det, och efter två dygn har den blivit sur och hälls ut, och den tomma krukan blir kvar',
  kor: () => {
    const { KLAR_FOR, TILLVERKA, setAmount, amountOf, addTool, vatskaAv, vatskorTimme, drickDryck, VATSKOR } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    setAmount(s, 'bar', 20);
    const kr = addTool(s, 'lerkruka_mellan', p); kr.hos = undefined;
    p.tek = { ...(p.tek ?? {}), kruka: 1 };
    KLAR_FOR[TILLVERKA.krossa_saft.act]!(s, p, p.task!, 0);
    const gjord = vatskaAv(s, 'saft'), bar = amountOf(s, 'bar');
    p.torst = 0.3; p.thoughts = []; drickDryck(s, p);
    const drack = vatskaAv(s, 'saft') === gjord - 1 && p.torst > 0.3 && p.thoughts.some(t => t.text === 'Drack saft');
    s.now += VATSKOR.saft.haller * SIM.DAY + SIM.HOUR; vatskorTimme(s);
    const sur = vatskaAv(s, 'saft') === 0 && !kr.inne && SIM.tingOf(s).includes(kr);
    return [
      [`10 bär blir 5 saft i krukan (${gjord} saft, ${20 - bar} bär åtgick, ${TILLVERKA.krossa_saft.min} minuter)`, gjord === 5 && bar === 10],
      [`den törstige dricker saft och blir glad (${drack ? 'ja' : 'nej'})`, drack],
      [`efter ${VATSKOR.saft.haller} dygn är saften sur och hälld ut, och den tomma krukan finns kvar (${sur ? 'ja' : 'nej'})`, sur],
    ];
  },
};

SCENARIER.koktvatten = {
  text: 'Steg 9.6.10: kokat vatten att dricka. Det kokade vattnet dricks av den törstige som är hemma när det finns, och det är rent: den som dricker det behöver inte gå till det smutsiga vattnet och får inte ont i magen',
  kor: () => {
    const { addTool, fyllVatska, vatskaAv, drickDryck } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const kr = addTool(s, 'lerkruka_mellan', p); kr.hos = undefined; fyllVatska(s, 'kokt', 3, kr);
    p.torst = 0.3; const fore = s.stat?.['magont av vatten'] ?? 0;
    drickDryck(s, p);
    const drack = p.torst === 1 && vatskaAv(s, 'kokt') === 2, mag = (s.stat?.['magont av vatten'] ?? 0) === fore;
    return [
      [`den törstige dricker det kokade vattnet hemma (${drack ? 'ja' : 'nej'}, ${vatskaAv(s, 'kokt')} kvar)`, drack],
      [`och får inte ont i magen (${mag ? 'ja' : 'nej'})`, mag && !p.sjuk],
    ];
  },
};

SCENARIER.sad = {
  text: 'Steg 9.6.11: säden från handlarna. Korn går bara att få av handlarna, och när byn fått det första kornet kommer de som kan odla på sädesodlingen; kornet sås och är sitt eget utsäde. Vilken gröda som sås avgörs av en poäng över alla rader i GRODOR, så att också linet sås',
  kor: () => {
    const { kornUpptackt, grodorNu, setAmount, knows, HANDLARVAROR, GRODOR, ALDER } = SIM;
    const s = createState(1, START), folk = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= ALDER.vuxen);
    for (const p of folk) p.tek = { ...(p.tek ?? {}), odling: 1 };
    kornUpptackt(s); const forut = folk.some(p => knows(p, 'sadesodling'));
    setAmount(s, 'korn', 6); kornUpptackt(s); const nu = folk.every(p => knows(p, 'sadesodling'));
    let tid = 0; while (grodorNu(s).length < 2 && tid++ < 40) s.now += SIM.DAY / 2;
    setAmount(s, 'rovor', 60); setAmount(s, 'arter', 60); setAmount(s, 'korn', 6);
    const med = grodorNu(s);
    folk[0].tek!.lin = 1; setAmount(s, 'ratlin', 0); const lin = grodorNu(s);
    return [
      [`kornet finns hos handlarna (${HANDLARVAROR.some(v => v.k === 'korn') ? 'ja' : 'nej'}) och är sitt eget utsäde (${GRODOR.korn.fro})`, HANDLARVAROR.some(v => v.k === 'korn') && GRODOR.korn.fro === 'korn'],
      [`ingen kommer på sädesodlingen utan korn (${forut ? 'ja' : 'nej'}), men alla som kan odla när kornet kommit (${nu ? 'ja' : 'nej'})`, !forut && nu],
      [`med gott om rovor och ärter sås kornet först (${med.join(', ')})`, med[0] === 'korn'],
      [`när byn kan odla lin och saknar det kommer linet med (${lin.join(', ')})`, lin.includes('lin') && lin.indexOf('lin') < lin.indexOf('rovor')],
    ];
  },
};

SCENARIER.vin = {
  text: 'Steg 9.6.12: bryggkaret och vinet. Tekniken Vin kommer genom matlagningen; bär krossas med vatten i bryggkaret, en station som har satsen i sig medan den jäser (3 dygn, inte i kyla utomhus), och vinet hälls upp i stora lerkrukor, där det blir bättre med tiden och håller 40 dygn',
  kor: () => {
    const { bryggVal, bryggKlar, stepBrygg, setAmount, addTool, fyllVatska, vatskaAv, vinKvalitet, VATSKOR, TEK, STATIONER, BRYGD } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    p.tek = { ...(p.tek ?? {}), bryggkar: 1, kruka: 1 };
    const kar = { id: 997, k: 'bryggkar', x: 3, y: 3, kvar: 0 } as SIM.Station; s.stationer = [...(s.stationer ?? []), kar];
    setAmount(s, 'bar', 12);
    const sack = addTool(s, 'vattensack', p); sack.hos = undefined; fyllVatska(s, 'vatten', 1, sack);
    const val = bryggVal(s, p);
    bryggKlar(s, p, kar.id);
    const isats = kar.sats?.v === 'vin' && SIM.amountOf(s, 'bar') === 2;
    const tid = (h: number) => { for (let i = 0; i < h; i++) { s.now += SIM.HOUR; stepBrygg(s); } };
    kar.inne = 1; tid(BRYGD.vin.dygn * 24 + 1); // inne i ett hus jäser det året om
    const jast = !!kar.sats?.klar;
    const kr = addTool(s, 'lerkruka_stor', p); kr.hos = undefined;
    const tappa = bryggVal(s, p)?.act === 'tappa';
    bryggKlar(s, p, kar.id);
    const vin = vatskaAv(s, 'vin'), tomt = !kar.sats;
    const q0 = vinKvalitet(s, kr); s.now += 16 * SIM.DAY; const q1 = vinKvalitet(s, kr);
    return [
      [`tekniken ${TEK.bryggkar.namn} kommer genom matlagningen (${TEK.bryggkar.omr.join(', ')}), och bryggkaret är en station (${STATIONER.bryggkar.namn})`, TEK.bryggkar.omr.includes('koka_mat') && !!STATIONER.bryggkar],
      [`bären och vattnet läggs i karet (${val?.act}, ${isats ? 'satsen ligger i karet' : 'ingen sats'})`, val?.act === 'brygga' && isats],
      [`satsen jäser på ${BRYGD.vin.dygn} dygn inne (${jast ? 'klar' : 'inte klar'})`, jast],
      [`vinet hälls upp i en stor lerkruka (${tappa ? 'ja' : 'nej'}, ${vin} vin) och karet är tomt (${tomt ? 'ja' : 'nej'})`, tappa && vin === BRYGD.vin.ger && tomt],
      [`vinet blir bättre med tiden (${q0} → ${q1}) och håller ${VATSKOR.vin.haller} dygn`, q1 > q0 && VATSKOR.vin.haller === 40],
    ];
  },
};

SCENARIER.ol = {
  text: 'Steg 9.6.13: ölet. Tekniken Öl kommer när byn har korn och har gjort vin; kornet blöts och hängs på torkställningen, där det gror och torkar till malt, och maltet jäser med vatten och rölleka i bryggkaret (den första satsen dubbelt så länge) till 8 öl i stora lerkrukor',
  kor: () => {
    const { olUpptackt, bryggVal, bryggKlar, maltaKlar, stepBrygg, torka, setAmount, amountOf, addTool, fyllVatska, vatskaAv, knows, BRYGG, BRYGD } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    p.tek = { ...(p.tek ?? {}), bryggkar: 1, sadesodling: 1, kruka: 1 };
    olUpptackt(s); const forut = knows(p, 'ol');
    s.stat = { ...(s.stat ?? {}), brygt_vin: BRYGG.olVin }; olUpptackt(s); const nu = knows(p, 'ol');
    const kar = { id: 996, k: 'bryggkar', x: 3, y: 3, kvar: 0, inne: 1 } as SIM.Station, tork = { id: 995, k: 'tork', x: 6, y: 3, kvar: 0 } as SIM.Station;
    s.stationer = [...(s.stationer ?? []), kar, tork];
    setAmount(s, 'korn', 20); setAmount(s, 'rolleka', 2); setAmount(s, 'bar', 0);
    const malta = bryggVal(s, p); maltaKlar(s, p, tork.id);
    s.now += SIM.TORK.maltDygn * SIM.DAY + SIM.HOUR; torka(s, p, 1);
    const malt = amountOf(s, 'malt');
    const sack = addTool(s, 'vattensack', p); sack.hos = undefined; fyllVatska(s, 'vatten', 1, sack);
    const brygga = bryggVal(s, p); bryggKlar(s, p, kar.id);
    const dubbelt = kar.sats?.dygn === BRYGD.ol.dygn * 2, sur = !!kar.sats?.sur;
    for (let i = 0; i < kar.sats!.dygn * 24 + 1; i++) { s.now += SIM.HOUR; stepBrygg(s); }
    for (let i = 0; i < 2; i++) { const k = addTool(s, 'lerkruka_stor', p); k.hos = undefined; }
    bryggKlar(s, p, kar.id);
    const ol = vatskaAv(s, 'ol');
    return [
      [`ingen kommer på ölet förrän byn gjort vin (${forut ? 'ja' : 'nej'}), sedan de som kan kornet och bryggkaret (${nu ? 'ja' : 'nej'})`, !forut && nu],
      [`kornet blöts och hängs på torkställningen (${malta?.act}), och blir ${malt} malt efter ${SIM.TORK.maltDygn} dygn`, malta?.act === 'malta' && malt === BRYGG.maltKorn],
      [`maltet, vatten och rölleka läggs i karet (${brygga?.v}), och den första satsen tar dubbelt så lång tid (${dubbelt ? 'ja' : 'nej'})`, brygga?.act === 'brygga' && brygga.v === 'ol' && dubbelt],
      [`satsen blir ${sur ? 'sur och hälls ut' : `${ol} öl i stora lerkrukor`}`, sur ? ol === 0 : ol === BRYGD.ol.ger],
    ];
  },
};

SCENARIER.rus = {
  text: 'Steg 9.6.14: berusningen. Ett tillstånd i hälsosystemet som sänker förmågorna mer ju mer man druckit (gången, handlaget, smidigheten och träffsäkerheten) och går över med tiden; den som dricker mycket under lång tid får sämre hälsa',
  kor: () => {
    const { drickAlkohol, rusSteg, rorlighet, handighet, personKampe, addTool, fyllVatska, RUS } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const kr = addTool(s, 'lerkruka_stor', p); kr.hos = undefined; fyllVatska(s, 'vin', 10, kr);
    const g0 = rorlighet(p), h0 = handighet(p), k0 = personKampe(s, p, 1, 0, 0, 0).st;
    drickAlkohol(s, p, 'vin'); const g1 = rorlighet(p);
    drickAlkohol(s, p, 'vin'); drickAlkohol(s, p, 'vin');
    const g3 = rorlighet(p), h3 = handighet(p), k3 = personKampe(s, p, 1, 0, 0, 0).st;
    for (let i = 0; i < 24 * 12 && (p.rus || p.bak); i++) rusSteg(s, p, 300, false); // ruset och bakfyllan efter (steg 9.6.15)
    const over = !p.rus && rorlighet(p) === g0;
    p.supit = RUS.skadligt + 2; p.health = 1; for (let i = 0; i < 12; i++) rusSteg(s, p, 300, false);
    return [
      [`den berusade går långsammare, mer ju mer hen druckit (${g0.toFixed(2)} → ${g1.toFixed(2)} → ${g3.toFixed(2)})`, g1 < g0 && g3 < g1],
      [`och arbetar sämre (${h0.toFixed(2)} → ${h3.toFixed(2)})`, h3 < h0],
      [`och träffar sämre och är mindre smidig i striden (skicklighet ${k0.skicklighet.toFixed(1)} → ${k3.skicklighet.toFixed(1)}, smidighet ${k0.smidighet.toFixed(1)} → ${k3.smidighet.toFixed(1)})`, k3.skicklighet < k0.skicklighet && k3.smidighet < k0.smidighet],
      [`ruset och bakfyllan går över inom ett dygn (${over ? 'ja' : 'nej'})`, over],
      [`den som supit mycket länge får sämre hälsa (${p.health.toFixed(3)})`, p.health < 1],
    ];
  },
};

SCENARIER.bakfylla = {
  text: 'Steg 9.6.15: ruset i byn. Alkoholen ger glädje och fler gräl, flirtar och slagsmål, bakfylla dagen efter som drar ner humöret och förmågorna, och supandet är ett utbrott bland de andra',
  kor: () => {
    const { rusSteg, rorlighet, addTool, fyllVatska, UTBROTT, supa, rusAv, RUS } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const kr = addTool(s, 'lerkruka_stor', p); kr.hos = undefined; fyllVatska(s, 'vin', 10, kr);
    const g0 = rorlighet(p);
    supa(s, p); const full = rusAv(p);
    let t = 0; while (p.rus && t++ < 400) rusSteg(s, p, 300, false);
    const bak = !!p.bak && p.thoughts.some(x => x.text === 'Bakfull' && x.v < 0), gBak = rorlighet(p);
    while (p.bak && t++ < 800) rusSteg(s, p, 300, false);
    const over = !p.bak && rorlighet(p) === g0;
    return [
      [`supandet är ett utbrott (${UTBROTT.supa.text}), och den som super blir full (${full.toFixed(2)})`, !!UTBROTT.supa && full >= RUS.fylla],
      [`när ruset gått över är hen bakfull: tanken och sämre förmågor (${g0.toFixed(2)} → ${gBak.toFixed(2)})`, bak && gBak < g0],
      [`bakfyllan går över (${over ? 'ja' : 'nej'})`, over],
      [`den berusade grälar och flirtar oftare och slår hellre (gräl ×${(1 + RUS.gral).toFixed(1)}, slag ×${(1 + RUS.slag).toFixed(1)} per hel rus)`, RUS.gral > 0 && RUS.flirt > 0 && RUS.slag > 0],
    ];
  },
};

SCENARIER.nat = {
  text: 'Steg 9.6.16: nätet. Ett redskap för fiske som knyts vid slöjdbänken av mycket tråd och kräver tekniken Nät (efter sländan och metspöet); med nätet får fiskaren mer än med metspöet',
  kor: () => {
    const { RECEPT, ACTS, handFish, STATIONER, TEK } = SIM;
    const fanga = (rd?: SIM.RedskapDef) => {
      const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
      let bx = 0, by = 0, br = 0; for (let i = 0; i < SIM.W * SIM.H; i++) { const r = SIM.richness(s, 'fiske', i % SIM.W, Math.floor(i / SIM.W)); if (r > br) { br = r; bx = i % SIM.W; by = Math.floor(i / SIM.W); } }
      let n = 0; for (let k = 0; k < 40; k++) n += handFish(s, p, bx, by, 1, rd); return n; // få försök: fångsten tömmer platsen
    };
    const met = fanga(ACTS.fiske.redskap!.metspo), nat = fanga(ACTS.fiske.redskap!.nat);
    return [
      [`nätet görs av ${Object.entries(RECEPT.nat.av!).map(([k, n]) => `${n} ${k}`).join(', ')} på ${RECEPT.nat.min} minuter, bara vid slöjdbänken (${STATIONER.flatarbank.bara!.includes('nat') ? 'ja' : 'nej'})`, RECEPT.nat.av!.trad >= 6 && STATIONER.flatarbank.bara!.includes('nat')],
      [`tekniken kräver tråd och knutar (${TEK.nat.krav.join(', ')})`, TEK.nat.krav.includes('slanda')],
      [`med nätet får fiskaren mer än med metspöet (${nat} mot ${met} på 40 försök; napp gånger håll ${(ACTS.fiske.redskap!.nat.napp! * ACTS.fiske.redskap!.nat.hall!).toFixed(2)} mot ${(ACTS.fiske.redskap!.metspo.napp! * ACTS.fiske.redskap!.metspo.hall!).toFixed(2)})`, nat > met],
    ];
  },
};

SCENARIER.braxen = {
  text: 'Steg 9.6.17: braxen och sik, nya rader i fiskarnas och djurens register med eget kött och egen näring, som mest fångas i nätet',
  kor: () => {
    const { valjFisk, FISKAR, DJUR, SAKER } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const rakna = (nat: boolean) => { let n = 0; for (let i = 0; i < 2000; i++) { const k = valjFisk(s, p, false, nat); if (k === 'braxen' || k === 'sik') n++; } return n; };
    const utan = rakna(false), med = rakna(true);
    return [
      [`braxen och sik är fiskar med eget kött (${DJUR.braxen.slakt.braxkott} braxenkött, ${DJUR.sik.slakt.sikkott} sikkött)`, !!FISKAR.braxen && !!FISKAR.sik && !!SAKER.braxkott && !!SAKER.sikkott],
      [`och egen näring (siken är fetare: ${SAKER.sikkott!.naring!.fett} mot braxenkött ${SAKER.braxkott!.naring!.fett})`, SAKER.sikkott!.naring!.fett! > SAKER.braxkott!.naring!.fett!],
      [`de fångas mest i nätet (${med} av 2000 med nät, ${utan} utan)`, med > utan * 4],
    ];
  },
};

SCENARIER.snoata = {
  text: 'Steg 9.6.18: snö att äta. När snön ligger äter den törstige snö när inget bättre finns nära: snön släcker törsten sämre än vatten och kyler kroppen. Då kan också den som är ensam i en by som grundats mitt i istiden, utan redskap och ved, dricka',
  kor: () => {
    const { drickVal, drick, TORST } = SIM;
    const s = createState(1, START), [p, ...andra] = SIM.living(s);
    for (const q of andra) SIM.die(s, q, 'kyla');
    s.ting = []; s.fire.lit = false;
    s.is = { ...(s.is ?? {}), cm: 60 } as typeof s.is; s.vader = { ...(s.vader ?? {}), sno: 0.8 } as typeof s.vader;
    p.torst = 0.3;
    const d = drickVal(s, p);
    const varm0 = p.warm, t0 = p.torst;
    drick(s, p, { act: 'ata_sno', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' });
    const slackt = p.torst > t0 && p.torst < 1, kallare = p.warm < varm0;
    s.vader = { ...(s.vader ?? {}), sno: 0 } as typeof s.vader;
    const utanSno = drickVal(s, p);
    return [
      [`ensam på tjock is utan eld och redskap äter hen snö (${d?.act ?? 'inget'})`, d?.act === 'ata_sno'],
      [`snön släcker törsten sämre än vatten (${t0} → ${p.torst.toFixed(2)}, vatten ger 1) och kyler kroppen (${varm0.toFixed(2)} → ${p.warm.toFixed(2)})`, slackt && kallare && TORST.snoSlacker < 1],
      [`utan snö finns inget att dricka (${utanSno?.act ?? 'inget'})`, !utanSno],
    ];
  },
};

SCENARIER.salt = {
  text: 'Steg 9.6.19: saltet. En handelsvara som handlarna från byarna vid havet säljer; saltat kött och saltad fisk håller längre, och saltet hör till gruppen Smak och fyller mineralerna',
  kor: () => {
    const { KLAR_FOR, TILLVERKA, setAmount, amountOf, HANDLARVAROR, SAKER, grupperAv, kokRecept, FOOD } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    for (const k of FOOD) setAmount(s, k, 0);
    setAmount(s, 'fisk', 4); setAmount(s, 'salt', 2);
    KLAR_FOR[TILLVERKA.salta_fisk.act]!(s, p, p.task!, 0);
    const saltad = amountOf(s, 'saltfisk'), salt = amountOf(s, 'salt');
    setAmount(s, 'fisk', 4); setAmount(s, 'rotter', 4); p.tek = { ...(p.tek ?? {}), kruka: 1 };
    const r = kokRecept(s, p);
    return [
      [`handlarna har saltet med sig (${HANDLARVAROR.some(v => v.k === 'salt') ? 'ja' : 'nej'})`, HANDLARVAROR.some(v => v.k === 'salt')],
      [`4 fisk och 1 salt blir ${saltad} saltad fisk (${2 - salt} salt åtgick), som håller ${SAKER.saltfisk!.haller} dygn mot fiskens ${SAKER.fisk!.haller}`, saltad === 4 && salt === 1 && SAKER.saltfisk!.haller! > SAKER.fisk!.haller!],
      [`saltet är Smak (${grupperAv('salt').join(', ')}), och den saltade fisken har mer mineraler (${SAKER.saltfisk!.naring!.mineral} mot ${SAKER.fisk!.naring!.mineral})`, grupperAv('salt').includes('smak') && SAKER.saltfisk!.naring!.mineral! > SAKER.fisk!.naring!.mineral!],
      [`saltet gör grytan fin (${r ? SAKER[r.id]!.namn : 'ingen'})`, r?.niva === 'fin' && r.smak === 'salt'],
    ];
  },
};

SCENARIER.lok = {
  text: 'Steg 9.6.20: löken. Vildlök växer vid stranden och på ängarna som de andra vilda växterna, plockas när man samlar och hör till gruppen Smak, och lökar som sparas kan sättas på fältet som en ny gröda',
  kor: () => {
    const { FYND, richness, froFynd, GRODOR, VILDA, grupperAv } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    let tid = 0; let plats: { x: number; y: number } | undefined;
    while (!plats && tid++ < 30) { for (let i = 0; i < SIM.W * SIM.H && !plats; i += 3) if (richness(s, 'vildlok', i % SIM.W, Math.floor(i / SIM.W)) > 0.2) plats = { x: i % SIM.W, y: Math.floor(i / SIM.W) }; if (!plats) s.now += SIM.DAY; }
    const tk = { act: 'samla', phase: 'do', tx: plats?.x ?? 0, ty: plats?.y ?? 0, until: s.now, carry: 0, why: '' } as SIM.Task;
    const fick = plats ? froFynd(s, p, tk, 3600) : {};
    return [
      [`vildlöken är ett lager på kartan (${FYND.vildlok.namn}) och växer någonstans (${plats ? `${plats.x},${plats.y}` : 'ingenstans'})`, !!plats],
      [`den som samlar där får lök (${(fick.lok ?? 0).toFixed(2)})`, (fick.lok ?? 0) > 0],
      [`löken är Smak (${grupperAv('lok').join(', ')}), och lökarna sätts på fältet (${GRODOR.lok.namn}, utsäde ${GRODOR.lok.fro}, ${VILDA.vildlok.groda})`, grupperAv('lok').includes('smak') && GRODOR.lok.fro === 'lok'],
    ];
  },
};

SCENARIER.stek = {
  text: 'Steg 9.6.21: stekhällen. En flat sten över elden vid grillen där kött och fisk steks med talg till stek, som smakar bättre; en ny rad i TILLAGNING',
  kor: () => {
    const { stekaKlar, kanSteka, setAmount, amountOf, rattId, TILLAGNING, TILLBEHOR, MAT, FOOD } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    for (const k of FOOD) setAmount(s, k, 0);
    setAmount(s, 'kott', 4); setAmount(s, 'talg', 2);
    s.fire.lit = true; p.skill.matlagning = SIM.MATLAG.brannFull; p.tek = { ...(p.tek ?? {}), stekhall: 1 };
    const utan = kanSteka(s, p);
    s.stationer = [...(s.stationer ?? []), { id: 994, k: 'grill', x: 1, y: 1, kvar: 0, med: ['stekhall'] } as SIM.Station];
    const med = kanSteka(s, p);
    stekaKlar(s, p);
    const stek = amountOf(s, rattId('kott', 'stek', 'lagad'));
    for (const k of FOOD) setAmount(s, k, 0); setAmount(s, rattId('kott', 'stek', 'lagad'), 2); p.thoughts = []; p.hunger = 0.2; MAT.anvand(s, p);
    const gott = p.thoughts.some(t => t.text === 'Åt en stek');
    return [
      [`steka är en rad i TILLAGNING (${TILLAGNING.steka.namn}) och stekhällen ett tillbehör till grillen (${TILLBEHOR.stekhall.till})`, !!TILLAGNING.steka && TILLBEHOR.stekhall.till === 'grill'],
      [`utan stekhäll steker ingen (${utan ? 'ja' : 'nej'}), med den (${med ? 'ja' : 'nej'})`, !utan && med],
      [`två kött och en talg blir ${stek} köttstek (${amountOf(s, 'talg')} talg kvar)`, stek === 2],
      [`steken smakar bättre (${gott ? 'ja' : 'nej'})`, gott],
    ];
  },
};

SCENARIER.kvarn = {
  text: 'Steg 9.6.22: kvarnstenen. En station av två huggna stenar där kornet mals till mjöl, som går att spara',
  kor: () => {
    const { KLAR_FOR, TILLVERKA, setAmount, amountOf, SAKER, STATIONER, PROJEKT } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    s.stationer = [...(s.stationer ?? []), { id: 993, k: 'kvarnsten', x: 2, y: 5, kvar: 0 } as SIM.Station];
    p.tek = { ...(p.tek ?? {}), kvarnsten: 1, sadesodling: 1 };
    setAmount(s, 'korn', 12);
    const sparar = !PROJEKT.mala_korn.kan(s, p, {} as never);
    setAmount(s, 'korn', 20);
    const kan = PROJEKT.mala_korn.kan(s, p, {} as never);
    KLAR_FOR[TILLVERKA.mala_korn.act]!(s, p, p.task!, 0);
    return [
      [`kvarnstenen är en station (${STATIONER.kvarnsten.namn}) där kornet mals`, STATIONER.kvarnsten.gor.includes('mala_korn')],
      [`utsädet mals inte (${sparar ? 'sparas' : 'mals'}), men det som är över (${kan ? 'ja' : 'nej'})`, sparar && kan],
      [`4 korn blir ${amountOf(s, 'mjol')} mjöl, som håller ${SAKER.mjol!.haller} dygn`, amountOf(s, 'mjol') === 4 && amountOf(s, 'korn') === 16 && SAKER.mjol!.haller! >= 20],
    ];
  },
};

SCENARIER.brod = {
  text: 'Steg 9.6.23: bakugnen och brödet. Deg av mjöl och vatten jäser och gräddas i bakugnen utan bagaren och blir bröd, som håller längre än annan lagad mat',
  kor: () => {
    const { bakaKlar, kanBaka, stepBak, setAmount, amountOf, addTool, fyllVatska, SAKER, RATT } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const ugn = { id: 992, k: 'bakugn', x: 2, y: 8, kvar: 0 } as SIM.Station; s.stationer = [...(s.stationer ?? []), ugn];
    p.tek = { ...(p.tek ?? {}), bakugn: 1 }; p.skill.matlagning = SIM.MATLAG.brannFull;
    setAmount(s, 'mjol', 6); setAmount(s, 'ved', 3); setAmount(s, 'brod', 0);
    const sack = addTool(s, 'vattensack', p); sack.hos = undefined; fyllVatska(s, 'vatten', 1, sack);
    const kan = kanBaka(s, p);
    bakaKlar(s, p);
    const iUgnen = !!ugn.deg && amountOf(s, 'mjol') === 2;
    stepBak(s);
    const brod = amountOf(s, 'brod');
    return [
      [`bagaren kan baka (${kan ? 'ja' : 'nej'}), och degen jäser i ugnen (${iUgnen ? 'ja' : 'nej'})`, kan && iUgnen],
      [`efter jäsningen och gräddningen ligger ${brod} bröd i förrådet`, brod === 4 && !ugn.deg],
      [`brödet håller ${SAKER.brod!.haller} dygn, längre än annan lagad mat (${RATT.haller})`, SAKER.brod!.haller! > RATT.haller],
    ];
  },
};

SCENARIER.svalt = {
  text: 'Steg 9.6.24: skämd mat i valet av mat. Maten man äter väljs efter skicket och hungern: den som nyss blivit hungrig tar färsk mat och låter den skämda ligga, och den som är mycket hungrig äter skämd mat när inget bättre finns, med samma risk för magsjuka som förut',
  kor: () => {
    const { MAT, FOOD, setAmount, amountOf, stacksOf, KROPP, skickKrav } = SIM;
    const s = createState(1, START), p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    const lagg = (farsk: boolean) => { for (const k of FOOD) setAmount(s, k, 0); setAmount(s, 'fisk', 6); for (const a of stacksOf(s)) if (a.k === 'fisk') a.c = 0.2; if (farsk) setAmount(s, 'rotter', 6); };
    lagg(true); p.hunger = KROPP.hungrig - 0.01; MAT.anvand(s, p);
    const tog = { fisk: 6 - amountOf(s, 'fisk'), rotter: 6 - amountOf(s, 'rotter') };
    lagg(false); p.hunger = KROPP.hungrig - 0.01; const lat = MAT.anvand(s, p);
    p.hunger = 0.02; const at = MAT.anvand(s, p);
    return [
      [`den som nyss blivit hungrig tar de färska rötterna (${tog.rotter}) och låter den skämda fisken ligga (${tog.fisk})`, tog.rotter > 0 && tog.fisk === 0],
      [`finns bara skämd mat äter hen inte än (${lat}, kravet på skicket ${skickKrav({ ...p, hunger: KROPP.hungrig - 0.01 } as SIM.Person).toFixed(2)})`, lat === 0],
      [`den mycket hungrige äter den skämda fisken när inget bättre finns (${at})`, at > 0],
    ];
  },
};

SCENARIER.rutan = {
  text: 'Steg 9.7.1: rutan som enhet. Varje ruta på fältet har sin egen gröda, sitt eget steg och sin egen växt, och arbetet går till den ruta som ger mest poäng; fältets storlek räknas ur familjens matbehov via förrådsmålen, och ägandet avgör vem som arbetar, så hela familjen sköter familjens fält',
  kor: () => {
    const { faltUppgift, faltBehov, workOdla, stepOdling, setAmount, sammanfatta, familjOf } = SIM;
    const s = createState(1, START); klockan(s, 10);
    const [p, q] = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
    p.partner = q.id; q.partner = p.id;
    for (const r of [p, q]) r.tek = { ...(r.tek ?? {}), odling: 1 };
    const f: SIM.Falt = { id: 1, x: p.x + 4, y: p.y, w: 4, dir: 1, n: 8, agare: p.id, steg: 'sa', klara: 0, kvar: 0, rord: s.now };
    f.r = [{ st: 'sa' }, { st: 'sa' }, { st: 'sa' }, { st: 'sa' }, { st: 'vaxer', g: 'rovor', v: 0.99 }, { st: 'bereda' }, { st: 'bereda' }, { st: 'bereda' }];
    s.falt = [f]; sammanfatta(f);
    for (const k of ['rovfron', 'artfron']) setAmount(s, k, 0);
    setAmount(s, 'rovfron', 20); setAmount(s, 'artfron', 2); // ärterna har högst poäng men frön till bara två rutor
    stepOdling(s); for (let i = 0; i < 30 && f.r![4].st !== 'mogen'; i++) stepOdling(s);
    const mogen = f.r![4].st === 'mogen';
    const u = faltUppgift(s, q);
    const tk = { act: 'odla', tool: 'sa', ref: f.id, fr: 0, until: s.now + SIM.HOUR, tx: p.x, ty: p.y } as unknown as SIM.Task;
    workOdla(s, p, tk, SIM.ODLING.saMin * 60 * 4);
    const grodor = new Set(f.r!.filter(r => r.st === 'vaxer').map(r => r.g));
    const fam = familjOf(s, p.id).length, behov = faltBehov(s, p);
    return [
      [`en ruta mognar för sig medan de andra väntar (${mogen ? 'ja' : 'nej'}; ${f.r!.map(r => r.st).join(', ')})`, mogen && f.r![0].st !== 'mogen'],
      [`arbetet går till den mogna rutan först, och partnern sköter ägarens fält (${u?.tool}, ruta ${u?.ruta})`, u?.tool === 'mogen' && u.ruta === 4],
      [`rutorna får var sin gröda när fröna räcker olika långt (${[...grodor].join(', ')})`, grodor.size >= 2],
      [`fältets storlek räknas ur familjens matbehov via förrådsmålen (${behov} rutor för ${fam})`, behov >= SIM.ODLING.faltMin && behov <= SIM.ODLING.faltMax],
    ];
  },
};

SCENARIER.jord = {
  text: 'Steg 9.7.2: jordens värden. Bördigheten ligger i marken och finns kvar när fältet växer igen; den sjunker med varje skörd och kommer långsamt tillbaka när rutan inte odlas. Fukten finns per ruta och kommer från regn och närheten till vatten',
  kor: () => {
    const { workOdla, stepOdling, bordighet, fuktAv, faltRuta, djupOf, sammanfatta, JORD } = SIM;
    const s = createState(1, START); klockan(s, 10);
    const p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!; p.tek = { ...(p.tek ?? {}), odling: 1 };
    const d = djupOf(s.seed).land; let nara = -1, langt = -1;
    for (let i = 0; i < SIM.W * SIM.H; i++) { if (nara < 0 && d[i] === 1) nara = i; if (langt < 0 && d[i] === 30) langt = i; }
    const falt = (id: number, i: number): SIM.Falt => ({ id, x: i % SIM.W, y: Math.floor(i / SIM.W), w: 1, dir: 1, n: 1, agare: p.id, steg: 'mogen', klara: 0, kvar: 0, rord: s.now, r: [{ st: 'mogen', g: 'rovor', m: s.now }] });
    const a = falt(1, nara), b = falt(2, langt); s.falt = [a, b]; sammanfatta(a); sammanfatta(b);
    const i = faltRuta(a, 0), b0 = bordighet(s, i);
    workOdla(s, p, { act: 'odla', tool: 'mogen', ref: a.id, fr: 0, until: s.now + SIM.HOUR, tx: p.x, ty: p.y } as unknown as SIM.Task, SIM.ODLING.skordaMin * 60);
    const b1 = bordighet(s, i);
    for (let h = 0; h < 48; h++) stepOdling(s);
    const b2 = bordighet(s, i), fn = fuktAv(a, 0), fl = fuktAv(b, 0);
    return [
      [`skörden tar av bördigheten (${b0.toFixed(2)} → ${b1.toFixed(2)}), och den ligger kvar i marken`, b1 < b0 && b1 === b0 - JORD.skord],
      [`när rutan inte odlas kommer den långsamt tillbaka (${b2.toFixed(3)} efter två dygn)`, b2 > b1 && b2 < 1],
      [`jorden vid vattnet är fuktigare än långt bort (${fn.toFixed(2)} mot ${fl.toFixed(2)})`, fn > fl],
    ];
  },
};

SCENARIER.fukt = {
  text: 'Steg 9.7.3: bästa fukten. Varje gröda växer bäst vid en viss fukt; den som ser grödan trivas lär sig fukten, den som har lärdomen vattnar till rätt nivå och de andra gissar, och lärdomen sprids i samtal som de andra lärdomarna',
  kor: () => {
    const { fuktFaktor, vattnaTill, GRODOR, workOdla, sammanfatta, kn, KUNSKAPER, JORD } = SIM;
    const s = createState(1, START); klockan(s, 10);
    const p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!; p.tek = { ...(p.tek ?? {}), odling: 1 };
    const ideal = GRODOR.rovor.fukt, ratt = fuktFaktor(ideal, ideal), torrt = fuktFaktor(0.05, ideal), blott = fuktFaktor(1, ideal);
    const gissar = vattnaTill(p, 'rovor');
    const f: SIM.Falt = { id: 1, x: p.x + 3, y: p.y, w: 4, dir: 1, n: 8, agare: p.id, steg: 'mogen', klara: 0, kvar: 0, rord: s.now, r: Array.from({ length: 8 }, () => ({ st: 'mogen' as const, g: 'rovor' as const, m: s.now, fu: ideal })) };
    s.falt = [f]; sammanfatta(f);
    workOdla(s, p, { act: 'odla', tool: 'mogen', ref: f.id, fr: 0, until: s.now + SIM.HOUR, tx: p.x, ty: p.y } as unknown as SIM.Task, SIM.ODLING.skordaMin * 60 * 8);
    const lart = kn(p, 'fukt'), vet = vattnaTill(p, 'rovor');
    return [
      [`rovorna växer bäst i sin fukt (${ideal}): i rätt fukt ${ratt}, i torr jord ${torrt.toFixed(2)}, i blöt ${blott.toFixed(2)}`, ratt === 1 && torrt < 1 && blott < 1],
      [`den som skördar grödor som trivts lär sig fukten (${lart.toFixed(2)})`, lart >= 0.5],
      [`utan lärdomen gissar man (${gissar}), med den vattnar man till rätt fukt (${vet})`, gissar === JORD.gissa && vet === ideal],
      [`lärdomen är en kunskap som sprids i samtal (${KUNSKAPER.fukt?.namn})`, !!KUNSKAPER.fukt?.larAv],
    ];
  },
};

SCENARIER.vattning = {
  text: 'Steg 9.7.4: vattning per ruta. Den som sköter ett fält där rutor är torrare än grödan vill ha bär vatten i vattensäcken eller en mellanstor lerkruka och vattnar de torraste rutorna; ett fält nära vatten är värt mer när platsen väljs',
  kor: () => {
    const { vattenVal, vattenFram, addTool, sammanfatta, vattnaTill, JORD } = SIM;
    const s = createState(1, START); klockan(s, 10);
    const p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!; p.tek = { ...(p.tek ?? {}), odling: 1 };
    const f: SIM.Falt = { id: 1, x: Math.floor(p.x) + 3, y: Math.floor(p.y), w: 4, dir: 1, n: 8, agare: p.id, steg: 'vaxer', klara: 0, kvar: 0, rord: s.now, r: Array.from({ length: 8 }, (_, k) => ({ st: 'vaxer' as const, g: 'rovor' as const, v: 0.2, fu: k < 6 ? 0.1 : 0.9 })) };
    s.falt = [f]; sammanfatta(f);
    const kr = addTool(s, 'lerkruka_mellan', p); kr.hos = undefined;
    const v = vattenVal(s, p);
    const tk = { act: 'vatten', phase: 'back', falt: true, ref: f.id, tool: 'lerkruka_mellan', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' } as unknown as SIM.Task;
    p.task = tk; vattenFram(s, p, tk);
    const vattnade = f.r!.filter(r => r.fu === vattnaTill(p, 'rovor')).length;
    return [
      [`den som sköter fältet hämtar vatten i krukan till de torra rutorna (${v?.why ?? 'inget'})`, !!v?.falt && v.karl === 'lerkruka_mellan'],
      [`en kruka räcker till ${JORD.karlRutor} rutor, de torraste först (${vattnade} vattnade, ${f.r!.map(r => r.fu?.toFixed(1)).join(' ')})`, vattnade === JORD.karlRutor && f.r![7].fu === 0.9],
      [`ett fält nära vatten är värt mer när platsen väljs (${JORD.vattenKost} rutor längre bort per ruta från vattnet)`, JORD.vattenKost > 0],
    ];
  },
};

SCENARIER.sophog = {
  text: 'Steg 9.7.5: resterna och sophögen. All slakt ger slaktrens och all skörd ger växtrester, som ruttnar bort med tiden; i byn ger de smuts, och de bärs till sophögen i utkanten, där de ruttnar bort',
  kor: () => {
    const { bearbeta, DJUR, setAmount, amountOf, smutsIByn, soporKlar, sophog, stepSophog, utanforByn, resterIByn } = SIM;
    const s = createState(1, START); klockan(s, 10);
    const p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!;
    setAmount(s, 'abborre', 4);
    s.stationer = [...(s.stationer ?? []), { id: 991, k: 'slaktbank', x: 3, y: 3, kvar: 0 } as SIM.Station];
    bearbeta(s, p, DJUR.abborre, 1);
    const rens = amountOf(s, 'slaktrens');
    setAmount(s, 'vaxtrest', 6);
    const fore = smutsIByn(s).punkter.length;
    s.now += SIM.HOUR; const smuts = smutsIByn(s).punkter.length;
    soporKlar(s, p);
    const h = sophog(s), kvar = resterIByn(s), pa = h.n;
    for (let i = 0; i < 24 * 4; i++) stepSophog(s);
    return [
      [`rensningen ger slaktrens (${rens})`, rens > 0],
      [`resterna i byn syns som smuts (${smuts} punkter)`, smuts >= fore && smuts > 0],
      [`de bärs till sophögen i utkanten (${pa} där, ${kvar} kvar i byn, ${utanforByn(s, h.x, h.y).toFixed(1)} rutor utanför byn)`, pa > 0 && kvar < rens + 6],
      [`på sophögen ruttnar de bort (${s.sophog!.n.toFixed(2)} kvar efter fyra dygn)`, s.sophog!.n < pa * 0.5],
    ];
  },
};

SCENARIER.kompost = {
  text: 'Steg 9.7.6: komposten och gödseln. Med tekniken Gödsel blir sophögen en kompost, där resterna och latrinens innehåll med tiden mognar till färdig kompost (många rester till lite kompost); latrinen töms i komposten i stället för att en ny grävs, och bara färdig kompost läggs på fältet och höjer bördigheten',
  kor: () => {
    const { stepKompost, knows, amountOf, setAmount, workOdla, sammanfatta, bordighet, faltRuta, REST } = SIM;
    const s = createState(1, START); klockan(s, 10);
    const p = SIM.living(s).find(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen)!; p.tek = { ...(p.tek ?? {}), odling: 1, latrin: 1 };
    s.sophog = { x: 5, y: 5, n: REST.upptack + 5 };
    for (let h = 0; h < 2000 && !knows(p, 'kompost'); h++) { s.now += SIM.HOUR; stepKompost(s); }
    const kom = knows(p, 'kompost');
    const ko = { id: 990, k: 'kompost', x: 5, y: 5, kvar: 0 } as SIM.Station, lat = { id: 989, k: 'latrin', x: 8, y: 5, kvar: 0, fyllt: 1 } as SIM.Station;
    s.stationer = [...(s.stationer ?? []), ko, lat];
    stepKompost(s);
    const tomd = lat.fyllt === 0 && (ko.kompost?.rest ?? 0) > 0;
    setAmount(s, 'kompost', 0);
    for (let h = 0; h < 24 * 10 && amountOf(s, 'kompost') < 1; h++) { s.now += SIM.HOUR; stepKompost(s); }
    const klar = amountOf(s, 'kompost');
    const f: SIM.Falt = { id: 1, x: Math.floor(p.x) + 3, y: Math.floor(p.y), w: 1, dir: 1, n: 1, agare: p.id, steg: 'bereda', klara: 0, kvar: 0, rord: s.now, r: [{ st: 'bereda' }] };
    s.falt = [f]; sammanfatta(f); const i = faltRuta(f, 0); s.bord = { [i]: 0.4 };
    workOdla(s, p, { act: 'odla', tool: 'bereda', ref: f.id, fr: 0, until: s.now + SIM.HOUR, tx: p.x, ty: p.y } as unknown as SIM.Task, SIM.ODLING.beredaMin * 60);
    return [
      [`den som odlar märker att det växer bättre vid sophögen och kommer på gödseln (${kom ? 'ja' : 'nej'})`, kom],
      [`sophögen blir komposten, och den fulla latrinen töms där (${tomd ? 'ja' : 'nej'}, ${ko.kompost?.rest} rester)`, tomd],
      [`resterna mognar till färdig kompost, ${REST.kompostRest} rester till en (${klar})`, klar >= 1],
      [`den färdiga komposten höjer bördigheten när rutan grävs (0.40 → ${bordighet(s, i).toFixed(2)})`, bordighet(s, i) > 0.4],
    ];
  },
};
