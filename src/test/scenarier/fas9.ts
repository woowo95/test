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

SCENARIER.vatskor = {
  text: 'Steg 9.4.13–9.4.14: näveraskan är en liten ask av näver och rep med en egen teknik, som görs för hand eller fortare och bättre vid slöjdbänken. Vätskorna (vattnet, tjäran, salvan och benlimmet) finns bara i behållare: ett recept behöver en ledig behållare som passar, och när vätskan används blir den tomma behållaren kvar',
  kor: () => [...naveraskan(), ...vatskorna()],
};
