// Scenarier för fas 15, grupp 5 av 15.1.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, byggKlart, byggare, klockan, kor, setMat, tandEld, tandOchFlinta, testBy } from './hjalp';

// barnen som har sin egen natt: över det lilla barnets ålder och under den som hjälper till
const nattBarn = (s: SIM.State) => SIM.living(s).filter(p => { const a = SIM.ageOf(p, s.now); return a >= SIM.ALDER.smabarn && a < SIM.ALDER.hjalper; });

SCENARIER.barnnatt = {
  text: 'Steg 15.1.46: barnets natt kommer ur kroppen som de vuxnas: ett utvilat barn med fyllt umgänge går inte fram och tillbaka mellan sängen och elden, ett trött barn sover, och barnets samtal har en längd som de vuxnas',
  kor: () => {
    const s = SIM.cloneState(testBy(10, b => nattBarn(b).length > 0)); klockan(s, 23);
    const barn = nattBarn(s);
    for (const p of barn) { Object.assign(p, { hunger: 0.95, rest: 1, social: 1, toa: 0.95, torst: 0.95, warm: 1, health: 1 }); p.task = undefined; }
    // hur ofta barnet byter mellan sängen (sova, vila) och elden (samtal) under fyra timmar
    const plats = (p: SIM.Person) => { const a = p.task?.act; return a === 'samtal' ? 'elden' : a === 'sova' || a === 'vila' ? 'sangen' : undefined; };
    const forra = new Map<number, string>(), byten = new Map<number, number>();
    kor(s, 4, b => {
      for (const p of nattBarn(b)) {
        const pl = plats(p); if (!pl) continue;
        const f = forra.get(p.id);
        if (f && f !== pl) byten.set(p.id, (byten.get(p.id) ?? 0) + 1);
        forra.set(p.id, pl);
      }
    });
    const mest = Math.max(0, ...byten.values());
    // ett trött barn väljer att sova, ett ensamt barn sitter med de vuxna en stund som de vuxna
    const t = SIM.cloneState(s); klockan(t, 23);
    const p = nattBarn(t)[0]!, valj = (x: Partial<SIM.Person>) => { Object.assign(p, x); p.task = undefined; SIM.chooseTask(t, p); return p.task as SIM.Task | undefined; };
    let sover = 0, prat = 0, pratLangd = true;
    for (let i = 0; i < 40; i++) {
      if (valj({ rest: 0.2, social: 1 })?.act === 'sova') sover++;
      const k = valj({ rest: 1, social: 0.1 });
      if (k?.act === 'samtal') { prat++; const d = (k.until - t.now) / SIM.MIN; if (d > SIM.VAL.nattPrat + SIM.VAL.nattPratSpann + 5) pratLangd = false; }
    }
    return [
      [`det finns barn med en egen natt (${barn.length})`, barn.length > 0],
      [`ett utvilat barn går inte fram och tillbaka mellan sängen och elden (högst ${mest} byten på fyra timmar)`, mest <= 2],
      [`ett trött barn sover (${sover} av 40)`, sover >= 30],
      [`ett barn som saknar umgänge sitter med de vuxna (${prat} av 40)`, prat >= 20],
      ['barnets samtal har de vuxnas längd (VAL.nattPrat och nattPratSpann)', pratLangd],
    ];
  },
};

SCENARIER.byggbehov = {
  text: 'Steg 15.1.47: spärren för att försöka planera igen gäller varje byggbehov och ägare för sig. En by som saknar en sovplats planerar sovsalen strax efter att ett annat bygge blivit klart, fast ett annat behov just fick vänta, och skälet "Alla har inte en sovplats" sägs bara vid ett hus som ger en sovplats',
  kor: () => {
    const s = SIM.createState(8, START); klockan(s); byggare(s); tandEld(s); tandOchFlinta(s); SIM.setAmount(s, 'ved', 200); for (const k of ['torrgras', 'grenar', 'flinta', 'sten'] as const) SIM.setAmount(s, k, 60); SIM.setAmount(s, 'yxa', 6); SIM.setAmount(s, 'virke', 300); setMat(s, { torrkott: 400 }); for (const p of SIM.living(s)) SIM.put(s, 'torrkott', 60, { [p.id]: 60 }); SIM.stepBehov(s);
    for (const k in s.byggBehov ?? {}) s.byggBehov![k] -= 24 * SIM.HOUR;
    const saknar = SIM.homeless(s);
    // ett annat bygge pågår för byn: ett förrådshus som inte är klart
    SIM.planBuild(s);
    const forst = SIM.housesOf(s).find(h => !h.klar);
    if (!forst) return [['byn planerar ett första hus', false]];
    // tomten är röjd, så att byggarna bygger och inte fäller träd först
    const rojd = (h: SIM.Hus) => { const g = SIM.groundOf(s); for (let y = h.y - 1; y <= h.y + h.h; y++) for (let x = h.x - 1; x <= h.x + h.w; x++) g.trees[y * SIM.W + x] = 0; s.stubbar = s.stubbar?.filter(k => !(k.x >= h.x - 1 && k.y >= h.y - 1 && k.x <= h.x + h.w && k.y <= h.y + h.h)); SIM.touch(s); };
    rojd(forst); forst.fn = 'forrad';
    // en familj fick inte plats med sitt hus: just det behovet väntar
    const sok = SIM.byggSok(s), annat = 'familjehus:' + SIM.living(s)[0]!.id; sok[annat] = s.now + SIM.BYGG.omforsok * SIM.HOUR;
    // skälet medan förrådshuset byggs: ingen sovplats i det
    const skal = (h: SIM.Hus, tim = 3) => {
      for (const q of SIM.housesOf(s)) if (!q.klar) rojd(q);
      const ut: string[] = [];
      kor(s, tim, b => { for (const p of SIM.living(b)) { const tk = p.task; if (tk?.act === 'bygga' && tk.why?.includes(SIM.husIText(h))) ut.push(tk.why);  } });
      return ut;
    };
    SIM.planBuild(s);
    const underTiden = SIM.housesOf(s).filter(h => !h.klar && h.ag === undefined).length;
    const vidForrad = skal(forst, 8);
    const vantar = (SIM.byggSok(s)[annat] ?? 0) > s.now;
    byggKlart(s, forst); SIM.planBuild(s); // nästa planering, strax efter att förrådshuset blivit klart
    const ny = SIM.housesOf(s).find(h => !h.klar && h.fn === 'sovsal');
    const t0 = s.now; klockan(s, 9); if (s.now < t0) s.now += SIM.DAY; // nästa morgon
    const vidSovsal = ny ? skal(ny) : [];
    return [
      [`byn saknar sovplatser (${saknar})`, saknar > 0],
      [`medan förrådshuset byggs planeras inget annat hus för byn (${underTiden})`, underTiden === 1],
      [`det andra behovet väntar för sig (${annat})`, vantar],
      [`strax efter att förrådshuset blivit klart planeras sovsalen (${ny?.namn ?? 'inget'}, ${ny?.fn})`, !!ny && SIM.arHem(ny)],
      [`vid förrådshuset sägs inte att alla inte har en sovplats (${vidForrad.length} skäl: ${vidForrad[0] ?? '-'})`, vidForrad.length > 0 && !vidForrad.some(w => w.includes('sovplats'))],
      [`vid huset med sovplatser sägs det (${vidSovsal[0] ?? '-'})`, vidSovsal.some(w => w.includes('Alla har inte en sovplats'))],
    ];
  },
};

SCENARIER.handelrad = {
  text: 'Steg 15.1.48: krönikan skriver namnet på den som handlar för byn och "för byn" en gång i meningen, inte "Igik för byn" två gånger, åt båda hållen i bytet',
  kor: () => {
    const s = SIM.createState(6, START);
    const [a, b] = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    if (!a || !b) return [['byn har två vuxna', false]];
    const rader = () => (s.hist?.kronika ?? []).filter(k => k[2] === 'k_handel').map(k => k[1] as string);
    for (let i = 0; i < 48; i++) {
      s.now += SIM.HOUR; // en ny timme ger en ny variant ur mallen
      const byn = SIM.bynPart(s, a.x, a.y, a), b2 = SIM.personPart(s, b, true);
      if (i % 2) SIM.byteKlart(s, byn, b2, [{ k: 'ved', n: 20 }], [{ k: 'silver', n: 20 }]);
      else SIM.byteKlart(s, b2, byn, [{ k: 'ved', n: 20 }], [{ k: 'silver', n: 20 }]);
    }
    const r = rader(), ggr = (t: string, d: string) => t.split(d).length - 1;
    const fel = r.filter(t => ggr(t, 'för byn') !== 1 || ggr(t, a.name) < 1);
    const varianter = new Set(r.map(t => t.replace(/[0-9]+/g, '').replace(a.name, 'A').replace(b.name, 'B').replace(/ved|silver/g, ''))).size;
    return [
      [`stora byten ger rader i krönikan (${r.length}, ${varianter} olika)`, r.length >= 10 && varianter >= 6],
      [`varje rad säger "för byn" en gång och namnet på den som handlar (${fel.length} fel: ${fel[0] ?? r[0] ?? '-'})`, fel.length === 0],
      [`namnet med "för byn" står aldrig två gånger (${r.find(t => ggr(t, `${a.name} för byn`) > 1) ?? 'ingen'})`, !r.some(t => ggr(t, `${a.name} för byn`) > 1)],
    ];
  },
};

SCENARIER.kronikaar = {
  text: 'Steg 15.1.49: året står en gång i krönikan: raderna om tron, gudarna och motgångarna under en årsrubrik börjar inte med "År 13:"',
  kor: () => {
    const rader = (s: SIM.State, slag: string) => (s.hist?.kronika ?? []).filter(k => k[2] === slag).map(k => k[1] as string);
    const medAr = (t: string) => /^År \d/.test(t);
    // tron får sitt namn och gudar av båda formerna (ande och gud i människoform)
    const s = SIM.createState(10, START); klockan(s, 12);
    const p = SIM.living(s)[0]!; SIM.grunda(s, p, 'blixt');
    const tr = SIM.troOf(s, p.tro!)!;
    for (const q of SIM.living(s).slice(1, 4)) q.tro = tr.id; // fler tror: tron får sitt namn och sin första gud
    SIM.stepReligion(s);
    const omr = Object.keys(SIM.GUDAR) as SIM.GudOmr[];
    for (const natur of [0, 50]) {
      tr.natur = natur; tr.manga = 0; const n0 = tr.gudar?.length ?? 0;
      for (let i = 0; i < 400 && (tr.gudar?.length ?? 0) === n0; i++) { s.now += SIM.HOUR; SIM.gudHandelse(s, omr[i % omr.length]!, 'blixten som slog ner'); }
    }
    const tro = rader(s, 'tro'), former = new Set((tr.gudar ?? []).map(g => g.form));
    // en motgång börjar
    let gr: SIM.State | undefined, gm: ReturnType<typeof SIM.motgangNu>;
    for (let seed = 1; seed < 400 && !gr; seed++) { const b = SIM.createState(seed, START); b.founded -= 20 * SIM.DAY; for (let w = 0; w < 64 && !gr; w++) { const m = SIM.motgangNu(b, b.now + w * 7 * SIM.DAY + SIM.DAY); if (m) { gr = b; gm = m; } } }
    let mg: string[] = [];
    if (gr && gm) { gr.now = gm.start; SIM.stepMotgang(gr); mg = rader(gr, 'motgang'); }
    return [
      [`tron och gudarna står i krönikan (${tro.length} rader, gudar som ${[...former].join(' och ')})`, tro.length >= 2 && former.has('ande') && former.has('gud')],
      [`ingen rad om tron börjar med året (${tro.find(medAr) ?? tro[tro.length - 1] ?? '-'})`, !tro.some(medAr) && !tro.some(t => /^Med .*, år \d/.test(t))],
      [`motgången står i krönikan (${mg[0] ?? '-'})`, mg.length > 0],
      [`raden om motgången börjar inte med året`, mg.length > 0 && !mg.some(medAr)],
    ];
  },
};

// kommentarerna i mallens stilmall och skript som inte stängs: (radnummer, början)
export function oppnaKommentarer(html: string): { rad: number; text: string }[] {
  const ut: { rad: number; text: string }[] = [];
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    const css = m[1]!, bas = m.index! + m[0].indexOf(css);
    let i = 0;
    for (;;) {
      const a = css.indexOf('/*', i);
      if (a < 0) break;
      const b = css.indexOf('*/', a + 2), nasta = css.indexOf('/*', a + 2);
      if (b < 0 || nasta >= 0 && nasta < b) ut.push({ rad: html.slice(0, bas + a).split('\n').length, text: css.slice(a, a + 60).replace(/\s+/g, ' ') });
      if (b < 0) break;
      i = b + 2;
    }
  }
  return ut;
}

SCENARIER.mallkommentar = {
  text: 'Steg 15.1.52: varje kommentar i mallens stilmall (template.html) stängs, så att reglerna efter den gäller: sedernas vågar visar symbolen vid sina egna pilar och tal. Vakten larmar när en kommentar inte stängs',
  kor: () => {
    const html = readFileSync(fileURLToPath(new URL('../../template.html', import.meta.url)), 'utf8');
    const oppna = oppnaKommentarer(html);
    const prov = oppnaKommentarer('<style>a { b: 1; } /* stängd */ c { d: 2; } /* öppen\ne { f: 3; } /* nästa */</style>');
    return [
      [`vakten hittar en kommentar som inte stängs (${prov.map(x => `rad ${x.rad}`).join(', ') || 'ingen'})`, prov.length === 1 && prov[0]!.rad === 1],
      [`varje kommentar i mallens stilmall stängs (${oppna.map(x => `rad ${x.rad}: ${x.text}`).join('; ') || 'alla'})`, oppna.length === 0],
      ['regeln efter den förra öppna kommentaren läses (.sedvag .sedord:last-child)', /\*\/\s*\n\.sedvag \.sedord:last-child/.test(html)],
    ];
  },
};
