// Scenarier. Religionen (fas 4.1): andligheten, upplevelserna hela livet, tron, nivåerna och gudarna.
import { createState, Person } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, nyInvanare } from './hjalp';
import { hasIcon } from '../../ikoner';

SCENARIER.andlighet = {
  text: 'Andligheten (steg 4.1.1.1): alla har en mellan 0 och 100, grundarna spridda över hela skalan, barnen delvis som föräldrarna, och den syns först när den första tron finns',
  kor: () => {
    const s = createState(9, START);
    const alla = SIM.living(s), inom = alla.every(p => p.andlig !== undefined && p.andlig >= 0 && p.andlig <= 100);
    // många grundare: spridda över skalan
    const ny = Array.from({ length: 200 }, () => { const p = nyInvanare(s, 'k', 20); return p.andlig!; });
    const lag = ny.filter(v => v < 25).length, hog = ny.filter(v => v > 75).length;
    // barnen till två mycket andliga och två världsliga
    const barnAv = (v: number) => {
      const mo = nyInvanare(s, 'k', 30), fa = nyInvanare(s, 'm', 30); mo.andlig = fa.andlig = v;
      let sum = 0; for (let i = 0; i < 40; i++) sum += SIM.newPerson(s, 'k', s.now, mo, fa).andlig!;
      return sum / 40;
    };
    const hogt = barnAv(95), lagt = barnAv(5);
    const syns = SIM.andligSyns(s);
    s.tron = [{ id: 1 } as SIM.Tro];
    return [
      [`alla i byn har en andlighet mellan 0 och 100 (${alla.map((p: Person) => p.andlig).join(', ')})`, inom],
      [`nykomlingarna är spridda över skalan (${lag} under 25 och ${hog} över 75 av 200)`, lag > 30 && hog > 30],
      [`barnen ärver delvis: snittet ${Math.round(hogt)} hos barnen till två med 95, ${Math.round(lagt)} till två med 5`, hogt > 65 && lagt < 35 && hogt < 95],
      ['andligheten syns först när den första tron finns', !syns && SIM.andligSyns(s)],
    ];
  },
};

SCENARIER.vuxenliv = {
  text: 'Upplevelser hela livet (steg 4.1.1.2): en förälder som mister sitt barn minns det, likaså den som mister sin partner, den som blir lämnad och den gamla som ser alla jämnåriga dö; upplevelserna från vuxenlivet står för sig i Livet',
  kor: () => {
    const s = createState(9, START);
    const chans = Object.fromEntries(Object.entries(SIM.UPPLEVELSER).map(([k, d]) => [k, d.chans]));
    for (const d of Object.values(SIM.UPPLEVELSER)) d.chans = 3; // allt fastnar, så att provet inte beror på slumpen
    try {
      const har = (p: Person, k: string) => !!p.upp?.some(u => u.k === k && u.v === 1);
      const mor = nyInvanare(s, 'k', 30), far = nyInvanare(s, 'm', 32), barn = nyInvanare(s, 'm', 2);
      barn.mother = mor.id; barn.father = far.id; SIM.pair(s, mor, far, true);
      SIM.die(s, barn, 'olycka');
      const a = nyInvanare(s, 'k', 40), b = nyInvanare(s, 'm', 41); SIM.pair(s, a, b, true);
      SIM.die(s, a, 'olycka');
      const c = nyInvanare(s, 'k', 30), d = nyInvanare(s, 'm', 30); SIM.pair(s, c, d, true);
      SIM.skiljas(s, c, d, SIM.getRel(s, c, d));
      const g1 = nyInvanare(s, 'k', 70), g2 = nyInvanare(s, 'm', 71);
      for (const q of SIM.living(s)) if (q !== g1 && q !== g2 && Math.abs(q.born - g1.born) <= SIM.UPPV.jamnarig * SIM.DAY) SIM.die(s, q, 'olycka');
      SIM.die(s, g2, 'olycka');
      return [
        [`föräldrarna minns att de miste sitt barn (${(mor.upp ?? []).map(SIM.upplevelseText).join('; ')})`, har(mor, 'barnDod') && har(far, 'barnDod')],
        [`den som miste sin partner minns det (${(b.upp ?? []).map(SIM.upplevelseText).join('; ')})`, !!b.upp?.some(u => u.v === 1 && SIM.upplevelseText(u).includes('sin partner'))],
        [`den som blev lämnad minns det (${(d.upp ?? []).map(SIM.upplevelseText).join('; ')}), inte den som lämnade`, har(d, 'lamnad') && !har(c, 'lamnad')],
        [`den gamla som såg alla jämnåriga dö (${(g1.upp ?? []).map(SIM.upplevelseText).join('; ')})`, har(g1, 'gammal')],
        ['de vuxnas upplevelser har en tid och räknas', mor.upp!.every(u => u.t !== undefined) && (s.stat?.upp_vuxen ?? 0) >= 4],
      ];
    } finally {
      for (const [k, d] of Object.entries(SIM.UPPLEVELSER)) d.chans = chans[k];
    }
  },
};

SCENARIER.andeupplevelse = {
  text: 'Upplevelser som flyttar andligheten (steg 4.1.1.3): åt ett håll som lottas, oftare uppåt ju andligare hen redan är, mer hos ett barn än hos en vuxen, och andligheten är den medfödda plus upplevelserna inom 0–100',
  kor: () => {
    const s = createState(9, START);
    const chans = Object.fromEntries(Object.entries(SIM.UPPLEVELSER).map(([k, d]) => [k, d.chans]));
    for (const d of Object.values(SIM.UPPLEVELSER)) d.chans = 3;
    try {
      const andel = (v: number) => {
        let upp = 0;
        for (let i = 0; i < 100; i++) { const p = nyInvanare(s, 'k', 30); p.andlig = v; SIM.upplev(s, p, 'hardVinter'); if ((p.upp?.[0]?.n ?? 0) > 0) upp++; }
        return upp;
      };
      const hog = andel(90), lag = andel(10);
      const v = nyInvanare(s, 'm', 30), b = nyInvanare(s, 'm', 8);
      SIM.upplev(s, v, 'skadad', 'x'); SIM.upplev(s, b, 'skadad', 'x');
      const vn = Math.abs(v.upp?.[0]?.n ?? 0), bn = Math.abs(b.upp?.[0]?.n ?? 0);
      const t = nyInvanare(s, 'k', 30); t.andlig = 98; SIM.upplev(s, t, 'svalt'); SIM.upplev(s, t, 'frys');
      const ingen = nyInvanare(s, 'k', 30); SIM.upplev(s, ingen, 'flyttade');
      return [
        [`den andliga (90) ser oftare ett tecken: uppåt ${hog} av 100, den världsliga (10) ${lag} av 100`, hog > 60 && lag < 40],
        [`ett barn flyttas mer än en vuxen (${bn} mot ${vn})`, vn > 0 && bn > vn],
        [`andligheten är den medfödda plus upplevelserna, inom 0–100 (${SIM.andlighet(s, t)})`, SIM.andlighet(s, t) >= 0 && SIM.andlighet(s, t) <= 100 && SIM.andlighet(s, t) === Math.max(0, Math.min(100, 98 + t.upp!.reduce((a, u) => a + (u.n ?? 0), 0)))],
        ['en rad utan ande flyttar inte andligheten', !!ingen.upp?.length && ingen.upp.every(u => u.n === undefined)],
      ];
    } finally {
      for (const [k, d] of Object.entries(SIM.UPPLEVELSER)) d.chans = chans[k];
    }
  },
};

SCENARIER.blekna = {
  text: 'Vuxnas upplevelser bleknar (steg 4.1.1.4): ett steg per UPPV.blekna dygn och glöms till slut, de tunga hälften så fort, egenskaperna följer med, och barndomen står kvar',
  kor: () => {
    const s = createState(9, START);
    const chans = Object.fromEntries(Object.entries(SIM.UPPLEVELSER).map(([k, d]) => [k, d.chans]));
    for (const d of Object.values(SIM.UPPLEVELSER)) d.chans = 3;
    try {
      const v = nyInvanare(s, 'm', 30), b = nyInvanare(s, 'm', 8);
      SIM.upplev(s, v, 'flyttade'); SIM.upplev(s, v, 'barnDod', 'x'); SIM.upplev(s, b, 'foralder', 'x');
      const k = Object.keys(v.upp!.find(u => u.k === 'flyttade')!.e)[0] as SIM.Stat, fore = v.pot[k];
      const dygn = (n: number) => { s.now += n * SIM.DAY; SIM.stepUppvaxt(s); };
      dygn(SIM.UPPV.blekna + 1);
      const glomd = !v.upp!.some(u => u.k === 'flyttade'), efter = v.pot[k], tungKvar = v.upp!.some(u => u.k === 'barnDod');
      dygn(SIM.UPPV.blekna * 4);
      return [
        [`efter ${SIM.UPPV.blekna + 1} dygn är det som gav 1 glömt, och egenskapen tillbaka (${fore} → ${efter})`, glomd && efter === v.anlag![k]],
        [`den tunga (miste sitt barn) finns kvar efter ${SIM.UPPV.blekna + 1} dygn, men är glömd efter ${SIM.UPPV.blekna * 5 + 1}`, tungKvar && !v.upp!.some(u => u.k === 'barnDod')],
        ['barndomen står kvar', b.upp!.some(u => u.k === 'foralder') && JSON.stringify(b.upp![0].e) !== '{}'],
        [`glömda räknas (${s.stat?.upp_glomd})`, (s.stat?.upp_glomd ?? 0) === 2],
      ];
    } finally {
      for (const [k, d] of Object.entries(SIM.UPPLEVELSER)) d.chans = chans[k];
    }
  },
};

SCENARIER.tecken = {
  text: 'Den första tron (steg 4.1.2.1): den som är mycket andlig kan tolka något oförklarligt (blixten, en hård vinter som tar slut, ett barn som blir friskt) till en egen tro med vem som står bakom, vad den vill och vad som händer om man sviker den; den världsliga gör det aldrig, ett nytt tecken stärker tron, och tron dör med sin sista troende',
  kor: () => {
    const s = createState(9, START);
    const chans = SIM.UPPLEVELSER.tecken.chans;
    SIM.UPPLEVELSER.tecken.chans = 3;
    try {
      // var och en med sin egen blixt, mer än ett dygn mellan dem
      const grupp = (v: number) => Array.from({ length: 60 }, () => { s.now += 25 * SIM.HOUR; const p = nyInvanare(s, 'k', 30); p.andlig = v; SIM.tecken(s, p, 'blixt'); return p; });
      const varldslig = grupp(0), andlig = grupp(100);
      const grundare = andlig.filter(p => p.tro !== undefined);
      const tr = SIM.troOf(s, grundare[0]?.tro);
      const helt = !!tr && tr.grundare === grundare[0].id && !!tr.bakom && !!tr.vill && !!tr.svek && tr.k === 'blixt' && tr.natur >= 0 && tr.natur <= 100;
      // ett nytt tecken bekräftar tron och ger ingen ny
      const g = grundare[0], fore = g?.troStyrka ?? 0, antal = s.tron?.length ?? 0;
      if (g) SIM.tecken(s, g, 'brand');
      const efter = s.tron?.length ?? 0;
      // ett svårt sjukt barn som blir friskt är ett tecken för föräldrarna
      const mo = nyInvanare(s, 'k', 30), fa = nyInvanare(s, 'm', 30); mo.andlig = 100;
      const barn = SIM.newPerson(s, 'k', s.now - 8 * SIM.DAY, mo, fa); s.people.push(barn); Object.assign(barn, { x: mo.x, y: mo.y, health: 1 });
      barn.svartSjuk = 1; barn.sickUntil = s.now - 1;
      SIM.stepReligion(s);
      const sag = !!mo.upp?.some(u => u.k === 'tecken' && u.om?.includes(barn.name));
      // den som var med om samma sak delar tron som just uppstod
      const vittnen = Array.from({ length: 30 }, () => { const p = nyInvanare(s, 'm', 40); p.andlig = 100; return p; });
      const fore2 = s.tron?.length ?? 0;
      for (const p of vittnen) SIM.tecken(s, p, 'torkaSlut');
      const nya = (s.tron?.length ?? 0) - fore2, delar = vittnen.filter(p => p.tro !== undefined).length;
      // tron dör med den sista troende
      for (const p of grundare.slice(1)) { const t = SIM.troOf(s, p.tro)!; for (const q of s.people) if (q.tro === t.id && q !== p) q.tro = undefined; }
      const sista = grundare[1]; if (sista) sista.died = s.now;
      SIM.stepReligion(s);
      const dog = !sista || SIM.troOf(s, sista.tro)?.slut === s.now;
      return [
        [`den världsliga (andlighet 0) tolkar inte blixten som en tro (${varldslig.filter(p => p.tro !== undefined).length} av 60)`, varldslig.every(p => p.tro === undefined)],
        [`den mycket andliga gör det ibland (${grundare.length} av 60)`, grundare.length >= 5 && grundare.length < 40],
        [`tron har grundare, tecken och tolkning (${tr ? SIM.tolkning(tr) : 'ingen'})`, helt],
        ['alla minns blixten som något oförklarligt', andlig.every(p => p.upp?.some(u => u.k === 'tecken'))],
        [`ett nytt tecken stärker tron (${fore} → ${g?.troStyrka}) utan att ge en ny`, !!g && g.troStyrka! > fore && efter === antal],
        ['barnet som blev friskt är ett tecken för föräldern', sag && barn.svartSjuk === undefined],
        [`de som var med om samma sak delar en tro (${nya} ny, ${delar} av 30 tror)`, nya === 1 && delar > 2],
        ['tron dör med sin sista troende', dog],
        ['andligheten syns när den första tron finns', SIM.andligSyns(s)],
      ];
    } finally {
      SIM.UPPLEVELSER.tecken.chans = chans;
    }
  },
};

SCENARIER.sprida = {
  text: 'Tron sprids (steg 4.1.2.2): den som tror övertygar den andliga men inte den världsliga, oftare om de tycker om varandra, och oftare när ett tecken nyss bekräftat tron; den som redan har en annan tro byter inte, och två som tror likadant stärker varandra',
  kor: () => {
    const s = createState(9, START);
    const a = nyInvanare(s, 'k', 40); a.andlig = 95; a.pot.karisma = 16;
    s.tron = []; a.tro = 1; a.troStyrka = 60;
    s.tron.push({ id: 1, grundare: a.id, gnamn: a.name, t: s.now, k: 'blixt', ar: 1, bakom: 'Himlens hammare', vill: 'att man tystnar när det mullrar', svek: 'skogen brinner', natur: 15, manga: 50, bekr: s.now - 30 * SIM.DAY });
    const tr = s.tron[0];
    // hur många av 40 som börjar tro efter 300 samtal var (man talar med varandra hundratals gånger på några dygn)
    const prov = (ande: number, op: number) => {
      let n = 0;
      for (let i = 0; i < 40; i++) {
        const b = nyInvanare(s, 'm', 30); b.andlig = ande; const r = SIM.getRel(s, a, b); r.op = op;
        for (let j = 0; j < 300 && b.tro === undefined; j++) SIM.predika(s, a, b, r, 'djupt samtal');
        if (b.tro === 1) n++;
      }
      return n;
    };
    const andlig = prov(90, 30), varldslig = prov(10, 30), ovan = prov(90, -80);
    tr.bekr = s.now; const bekr = prov(90, 30);
    const annan = nyInvanare(s, 'm', 30); annan.andlig = 100; annan.tro = 2; const ra = SIM.getRel(s, a, annan); ra.op = 80;
    for (let j = 0; j < 50; j++) SIM.predika(s, a, annan, ra, 'djupt samtal');
    const med = nyInvanare(s, 'm', 30); med.tro = 1; med.troStyrka = 40; SIM.predika(s, a, med, SIM.getRel(s, a, med), 'småprat');
    const gral = nyInvanare(s, 'm', 30); gral.andlig = 100; const rg = SIM.getRel(s, a, gral); rg.op = 80;
    for (let j = 0; j < 50; j++) SIM.predika(s, a, gral, rg, 'gräl');
    return [
      [`den andliga övertygas, den världsliga inte (${andlig} mot ${varldslig} av 40)`, andlig > 5 && varldslig === 0],
      [`vänner oftare än ovänner (${andlig} mot ${ovan} av 40)`, andlig > ovan + 5],
      [`ett tecken nyss gör tron mer övertygande (${bekr} mot ${andlig} av 40)`, bekr > andlig + 3],
      ['den som har en annan tro byter inte', annan.tro === 2],
      [`två som tror likadant stärker varandra (40 → ${med.troStyrka})`, med.troStyrka! > 40],
      ['ett gräl för inte tron vidare', gral.tro === undefined],
    ];
  },
};

SCENARIER.tronamn = {
  text: 'Namn och berättelse (steg 4.1.2.3): när tre tror får tron ett namn som ingen annan tro har, tecknets symbol och en berättelse om hur den började, och det står i krönikan',
  kor: () => {
    const s = createState(9, START);
    const ny = (k: SIM.TeckenTyp) => {
      const a = nyInvanare(s, 'k', 40); a.andlig = 100;
      for (let i = 0; i < 50 && a.tro === undefined; i++) { s.now += 25 * SIM.HOUR; SIM.tecken(s, a, k); }
      return a;
    };
    const a = ny('blixt'), tr = SIM.troOf(s, a.tro)!;
    const b = nyInvanare(s, 'm', 30); b.tro = tr.id;
    SIM.stepReligion(s);
    const fore = tr.namn;
    const c = nyInvanare(s, 'm', 30); c.tro = tr.id;
    SIM.stepReligion(s);
    // fler tror från blixten: de får andra namn
    const namn = [tr.namn];
    for (let i = 0; i < 3; i++) {
      const g = ny('blixt'), t2 = SIM.troOf(s, g.tro)!;
      for (let j = 0; j < 2; j++) nyInvanare(s, 'm', 30).tro = t2.id;
      SIM.stepReligion(s); namn.push(t2.namn);
    }
    const kron = (s.hist?.kronika ?? []).some(k => k[1].includes(`${tr.namn} fick sitt namn`));
    return [
      [`tron har inget namn med två troende (${fore ?? 'inget'})`, fore === undefined],
      [`med tre troende får den ett namn (${tr.namn})`, !!tr.namn],
      [`och tecknets symbol (${tr.sym})`, tr.sym === 'tro_blixt' && hasIcon(tr.sym)],
      [`och en berättelse där grundaren och tecknet står (${tr.ber})`, !!tr.ber && tr.ber.includes(a.name) && tr.ber.includes('blixten') && !tr.ber.includes('{')],
      [`ingen annan tro har samma namn (${namn.join(', ')})`, new Set(namn).size === namn.length && namn.every(Boolean)],
      ['krönikan berättar det', kron],
    ];
  },
};

SCENARIER.trokategori = {
  text: 'Kategorin Tro (steg 4.1.2.4): rädslorna (de farliga platserna) hör till tron och visas där, de andra lärdomarna står kvar bland lärdomarna',
  kor: () => {
    const tro = (Object.keys(SIM.LARDOMAR) as SIM.LKind[]).filter(k => SIM.LARDOMAR[k].kat === 'tro');
    return [
      [`rädslorna hör till tron (${tro.join(', ')})`, tro.includes('fara')],
      ['platserna med mat, flinta och vatten är kvar bland lärdomarna', !['samla', 'jakt', 'fiske', 'flinta', 'vatten'].some(k => tro.includes(k as SIM.LKind))],
    ];
  },
};
