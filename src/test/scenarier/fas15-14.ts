// Scenarier för fas 15, grupp 14 (steg 15.1.129–15.1.140).
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, jaktFran, klockan, kor, tandEld } from './hjalp';

// en jägare fångar haren d (som jaktKlar gör när försöket slutar med en fångst)
function fanga(s: SIM.State, p: SIM.Person, d: { id: number; x: number; y: number }) {
  const tk: SIM.Task = { act: 'jakt', phase: 'do', tx: d.x, ty: d.y, until: s.now + SIM.HOUR, carry: 0, why: 'test' };
  tk.jf = { t: s.now, id: d.id, x: d.x, y: d.y, sx: p.x, sy: p.y, v: 'sten', stopp: 1, kast: -1, sett: false, ut: 'fangad', extra: 0, g: 0, blod: 1 };
  p.task = tk; SIM.jaktKlar(s, p, tk);
}

SCENARIER.harutjakt = {
  text: 'Steg 15.1.129: hararna jagas ut. En grupp som jagats fem gånger har färre harar än en orörd grupp på samma plats, en dödad hare räknas en gång, och gruppen har fler igen efter återväxten',
  kor: () => {
    const s = SIM.createState(6, START); klockan(s, 10);
    const g0 = SIM.grupperOf(s).sort((a, b) => b.n - a.n)[0]!, orord = SIM.cloneState(s), p = SIM.living(s)[0]!;
    const syns = (b: SIM.State) => SIM.djurOf(b, b.now, []).filter(d => d.grupp === g0.id).length;
    const fore = syns(s);
    let fangade = 0;
    for (let i = 0; i < 5; i++) {
      const d = SIM.djurOf(s, s.now, []).find(q => q.grupp === g0.id);
      if (!d) break;
      fanga(s, p, d); fangade++;
    }
    const grupp = (b: SIM.State, t = b.now) => SIM.grupperOf(b, t).find(g => g.id === g0.id);
    const n = grupp(s)!.n, nOrord = grupp(orord)!.n, synsNu = syns(s);
    // återväxten: lagret växer tillbaka (FYND.jakt.uttag.regrow), och gruppen räknas som den var på platsen
    const t0 = s.now;
    SIM.growFynd(s, 600, 2);
    const nAter = grupp(s, t0)!.n;
    return [
      [`gruppen hade ${g0.n} harar (${fore} syns), och ${fangade} fångades`, fangade >= Math.min(5, g0.n) && fore === g0.n],
      [`den jagade gruppen har färre harar (${n}) än den orörda (${nOrord})`, n < nOrord],
      [`en dödad hare räknas en gång: ${synsNu} syns, och lagret säger ${n}`, synsNu === Math.min(n, g0.n0 - fangade) && synsNu <= g0.n - Math.min(fangade, g0.n) + 1],
      [`gruppen har fler igen efter återväxten (${n} → ${nAter})`, nAter > n],
    ];
  },
};

SCENARIER.jaktval = {
  text: 'Steg 15.1.131: ett fällt djur är värt det slakten ger. En jägare med spjut, ett rådjur på 10 rutor och en hare på 4 väljer rådjuret',
  kor: () => {
    const s = SIM.createState(6, START); klockan(s, 10);
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!, tiles = SIM.getMap(s.seed).tiles;
    // en plats med en hare på 4 rutor och ett rådjur på 10 (där cirklarna kring dem möts)
    let plats: { x: number; y: number; h: number; r: number } | undefined;
    for (let t = 0; t < 400 && !plats; t++) {
      s.now += SIM.HOUR / 2;
      const hararna = SIM.djurOf(s, s.now, []), rad = SIM.flockOf(s, SIM.FLOCKARTER.radjur, s.now, []);
      for (const h of hararna) for (const r of rad) {
        const d = Math.hypot(r.x - h.x, r.y - h.y);
        if (d < 7 || d > 13) continue;
        const a = (16 - 100 + d * d) / (2 * d), b = Math.sqrt(16 - a * a), ux = (r.x - h.x) / d, uy = (r.y - h.y) / d;
        for (const sg of [1, -1]) {
          const x = h.x + ux * a - uy * b * sg, y = h.y + uy * a + ux * b * sg;
          if (!plats && SIM.inMap(Math.floor(x), Math.floor(y)) && tiles[Math.floor(y) * SIM.W + Math.floor(x)] !== SIM.T.Vatten && !SIM.blocked(s, x, y)) plats = { x, y, h: h.id, r: r.id };
        }
      }
    }
    if (!plats) return [['en plats med en hare på 4 rutor och ett rådjur på 10', false]];
    p.x = plats.x; p.y = plats.y;
    const tk = jaktFran(s, p, 'flintspjut', plats);
    SIM.jaktForsok(s, p, tk);
    const val = tk.jf?.id, valt = SIM.flockArtAv(val ?? -1)?.art ?? (val === undefined ? 'inget' : 'hare eller fågel'), alla = [...SIM.djurOf(s, s.now), ...SIM.flockOf(s, SIM.FLOCKARTER.radjur, s.now)];
    const avs = (id: number) => { const d = alla.find(q => q.id === id); return d ? Math.hypot(d.x - p.x, d.y - p.y).toFixed(1) : '?'; };
    return [
      [`haren på ${avs(plats.h)} rutor och rådjuret på ${avs(plats.r)}`, true],
      [`jägaren väljer ett rådjur (valde ${valt}${val !== undefined ? ' på ' + avs(val) + ' rutor' : ''})`, valt === 'radjur'],
      [`det fällda djuret är värt det slakten ger: vilt ${SIM.grundvarde('vilt').toFixed(1)}, rådjur ${SIM.grundvarde('radjur').toFixed(1)}, vildsvin ${SIM.grundvarde('vildsvin').toFixed(1)}, fågel ${SIM.grundvarde('fagel').toFixed(1)}`,
        SIM.grundvarde('radjur') > SIM.grundvarde('vilt') * 3 && SIM.grundvarde('vildsvin') > SIM.grundvarde('radjur')],
    ];
  },
};

SCENARIER.fiskbyte = {
  text: 'Steg 15.1.132: fiskaren lämnar en utfiskad plats. En fiskare vid en tömd plats går till en annan inom en timme i spelet. I en by fiskar de där rikedomen är över 0,5, med 5–15 % napp per försök, och byter plats',
  kor: () => {
    const s = SIM.createState(6, START); klockan(s, 9); tandEld(s);
    const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    Object.assign(p, { hunger: 0.9, rest: 0.9, social: 0.9, toa: 0.9, torst: 0.9, warm: 0.9, health: 1 });
    const sp = SIM.spotFor(s, 'fiske', p);
    for (let i = 0; i < 200 && SIM.richness(s, 'fiske', sp.x, sp.y) > 0.04; i++) SIM.takeFrom(s, 'fiske', sp.x, sp.y, 1);
    SIM.lookAround(s, p, sp.x, sp.y);
    p.x = sp.x; p.y = sp.y;
    const tk: SIM.Task = { act: 'fiske', phase: 'do', tx: sp.x, ty: sp.y, until: s.now + 3 * SIM.HOUR, carry: 0, why: 'test', dark: !SIM.isLight(s.now) };
    p.task = tk;
    const t0 = s.now, rik0 = SIM.richness(s, 'fiske', sp.x, sp.y);
    let bytte = -1, rikNy = 0;
    for (let i = 0; i < SIM.HOUR / SIM.SEC && bytte < 0 && p.task === tk; i++) {
      SIM.step(s, 1);
      if (Math.hypot(tk.tx - sp.x, tk.ty - sp.y) > 1.5) { bytte = s.now - t0; rikNy = SIM.richness(s, 'fiske', tk.tx, tk.ty); }
    }
    // i en by: rikedomen där de fiskar, napp per försök och platsbytena
    const b = SIM.createState(6, START), a0 = { ...(b.stat ?? {}) }, rik: number[] = [];
    kor(b, 72, v => { for (const q of SIM.living(v)) if (q.task?.act === 'fiske' && q.task.phase === 'do' && Math.floor(v.now / SIM.SEC) % 60 === 0) rik.push(SIM.richness(v, 'fiske', q.task.tx, q.task.ty)); });
    const d = (k: string) => (b.stat?.[k] ?? 0) - (a0[k] ?? 0), napp = d('fiskeNapp') / Math.max(1, d('fiskeForsok'));
    const med = rik.length ? [...rik].sort((x, y) => x - y)[Math.floor(rik.length / 2)] : 0;
    return [
      [`fiskaren lämnar den tömda platsen (${rik0.toFixed(2)}) inom en timme (${bytte < 0 ? (p.task === tk ? 'stannade' : 'slutade fiska') : Math.round(bytte / SIM.MIN) + ' min'}) för en rikare (${rikNy.toFixed(2)})`, bytte >= 0 && bytte <= SIM.HOUR && rikNy > rik0],
      [`i byn fiskar de där rikedomen är ${med.toFixed(2)} (medianen av ${rik.length} prov)`, rik.length > 0 && med > 0.5],
      [`napp per försök: ${(napp * 100).toFixed(1)} % (${d('fiskeNapp')} av ${d('fiskeForsok')})`, napp >= 0.05 && napp <= 0.15],
      [`fiskaren bytte plats vid vattnet (fiskeByter ${s.stat?.fiskeByter ?? 0}; i byn ${d('fiskeByter')} gånger på tre dygn)`, (s.stat?.fiskeByter ?? 0) > 0],
    ];
  },
};
