// Scenarier. Religionen (fas 4.1): andligheten, upplevelserna hela livet, tron, nivåerna och gudarna.
import { createState, Person } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, medTal, medTroshus, nyInvanare, satKyrka, utanWebblasare } from './hjalp';
import { hasIcon } from '../../ikoner';
import { setByn } from '../../ui/lage';
import { religion } from '../../ui/flikar/religion';
import { esc, hjalpKlick } from '../../ui/hjalp';

// p ser tecknet k en gång per 25 timmar tills hen har en tro (högst 50 gånger)
const faTro = (s: SIM.State, p: Person, k: Parameters<typeof SIM.tecken>[2]) => { for (let i = 0; i < 50 && p.tro === undefined; i++) { s.now += 25 * SIM.HOUR; SIM.tecken(s, p, k); } };
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
    return medTal(SIM.UPPLEVELSER, 'chans', 3, () => { // allt fastnar, så att provet inte beror på slumpen
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
    });
  },
};

SCENARIER.andeupplevelse = {
  text: 'Upplevelser som flyttar andligheten (steg 4.1.1.3): åt ett håll som lottas, oftare uppåt ju andligare hen redan är, mer hos ett barn än hos en vuxen, och andligheten är den medfödda plus upplevelserna inom 0–100',
  kor: () => {
    const s = createState(9, START);
    return medTal(SIM.UPPLEVELSER, 'chans', 3, () => {
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
    });
  },
};

SCENARIER.blekna = {
  text: 'Vuxnas upplevelser bleknar (steg 4.1.1.4): ett steg per UPPV.blekna dygn och glöms till slut, de tunga hälften så fort, egenskaperna följer med, och barndomen står kvar',
  kor: () => {
    const s = createState(9, START);
    return medTal(SIM.UPPLEVELSER, 'chans', 3, () => {
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
    });
  },
};

SCENARIER.tecken = {
  text: 'Den första tron (steg 4.1.2.1): den som är mycket andlig kan tolka något oförklarligt (blixten, en hård vinter som tar slut, ett barn som blir friskt) till en egen tro med vem som står bakom, vad den vill och vad som händer om man sviker den; den världsliga gör det aldrig, ett nytt tecken stärker tron, och tron dör med sin sista troende',
  kor: () => {
    const s = createState(9, START);
    return medTal({ tecken: SIM.UPPLEVELSER.tecken }, 'chans', 3, () => {
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
      barn.svartSjuk = 1;
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
      // tvillingar som föds levande är ett tecken för föräldrarna (steg 10.3.7)
      let tvSag = false, tvForsok = 0;
      for (; tvForsok < 40 && !tvSag; tvForsok++) {
        s.now += 25 * SIM.HOUR;
        const m = nyInvanare(s, 'k', 25), f = nyInvanare(s, 'm', 28); m.andlig = 100; f.andlig = 100;
        m.pregnantBy = f.id; m.pregnantSince = s.now - 270 * SIM.DAY; m.foder = { f: 'tvillingar', till: s.now };
        SIM.birth(s, m);
        const barn2 = s.people.filter(q => q.mother === m.id && q.born === s.now && SIM.alive(q));
        tvSag = barn2.length === 2 && [m, f].every(q => q.upp?.some(u => u.k === 'tecken' && u.om?.includes('tvillingarna') && u.om.includes(barn2[0].name)));
      }
      // björnen som vände om: den som möter björnen utan att den anfaller (steg 10.3.7)
      const sb = createState(6, START);
      let bt: number | undefined;
      for (let t = sb.now; t < sb.now + 60 * SIM.DAY && bt === undefined; t += 20 * SIM.MIN) { const b = SIM.bjornarOf(sb, t); if (b.some(d => d.art === 'bjorn') && !b.some(d => d.art === 'bjornunge')) bt = t; }
      let bjSag = 0, bjMote = 0;
      const bjJson = JSON.stringify(sb);
      for (let i = 0; bt !== undefined && i < 20; i++) {
        const k = SIM.migrate(JSON.parse(bjJson)); k.now = bt;
        for (let r = 0; r < i * 7; r++) SIM.rnd(k, 'bjorn');
        const mor = SIM.bjornarOf(k, bt).find(d => d.art === 'bjorn')!, p = SIM.living(k)[0];
        for (const q of SIM.living(k)) if (q !== p) { q.x = 2; q.y = 2; }
        p.x = mor.x + 1; p.y = mor.y; p.task = undefined; p.andlig = 100;
        SIM.bjornSteg(k);
        if (!(k.stat?.bjornstrid ?? 0) && !SIM.djurIKartStrid(k, 'bjorn')) { bjMote++; if (p.upp?.some(u => u.k === 'tecken' && u.om === SIM.teckenText('bjornVande'))) bjSag++; }
      }
      // fältet som gav dubbelt mot de andra (fynd 343): skörden på en ruta mot de andra fältens skörd per ruta
      const fx = { id: 901, n: 4 } as SIM.Falt, fb = { id: 902, n: 4, gav: [6, 2] } as SIM.Falt, falt0 = s.falt;
      s.falt = [fx]; const ensamFalt = !SIM.gavDubbelt(s, fx, 100);
      s.falt = [fx, fb]; const dubbel = SIM.gavDubbelt(s, fx, 6) && !SIM.gavDubbelt(s, fx, 5.9); s.falt = falt0;
      return [
        [`ett fält som ger dubbelt mot de andras skörd per ruta är ett tecken, men inte utan andra fält (fynd 343)`, ensamFalt && dubbel],
        [`tvillingar som föds levande är ett tecken för båda föräldrarna (${tvForsok} försök)`, tvSag],
        [`den som möter björnen utan att den anfaller minns björnen som vände om (${bjSag} av ${bjMote} möten)`, bjMote > 0 && bjSag === bjMote],
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
    });
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
      faTro(s, a, k);
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


SCENARIER.fragetecken = {
  text: 'Steg 11.1.3 och 11.1.18: ?-knappen används bara för förklaringar. En berättelse (om tron och om en gud) fälls ut med boksymbolen, varje tro fälls ihop med ▸ vid namnet (den största är utfälld), och de mindre trosriktningarna står under ▸-raden Övriga trosriktningar',
  kor: () => {
    utanWebblasare();
    const s = createState(9, START);
    setByn(s);
    const ny = (k: SIM.TeckenTyp, n: number) => {
      const a = nyInvanare(s, 'k', 40); a.andlig = 100;
      faTro(s, a, k);
      const tr = SIM.troOf(s, a.tro)!;
      for (let j = 1; j < n; j++) nyInvanare(s, 'm', 30).tro = tr.id;
      SIM.stepReligion(s);
      return tr;
    };
    const stor = ny('blixt', 5); ny('brand', 4); ny('vinterSlut', 3); ny('drom', 1);
    if (!stor.gudar?.length) stor.gudar = [{ namn: 'Åskan', form: 'ande', omr: ['vader'], ber: 'Guden kom till när blixten slog ner.' } as never];
    const html = religion.html();
    const fragor = [...html.matchAll(/<button type="button" class="hjalp" data-hjalp="([^"]*)"[^>]*title="([^"]*)"[^>]*>\?<\/button>/g)].map(m => m[2]);
    const bocker = [...html.matchAll(/<button type="button" class="hjalp bok" data-hjalp="([^"]*)"[^>]*title="([^"]*)"/g)].map(m => m[2]);
    const ovriga = (s.tron ?? []).filter(tr => tr.slut === undefined).length - 3;
    const mer = /class="tekhead klick falla" data-hjalp="tro-ovriga"[^>]*aria-expanded="false"[^>]*><b>Övriga trosriktningar<\/b>/.test(html);
    hjalpKlick({ closest: () => ({ dataset: { hjalp: 'tro-ovriga' } }) } as unknown as HTMLElement);
    const oppen = religion.html();
    hjalpKlick({ closest: () => ({ dataset: { hjalp: 'tro-ovriga' } }) } as unknown as HTMLElement);
    return [
      [`?-knappen förklarar bara (${fragor.join('; ')})`, fragor.length > 0 && fragor.every(t => /^(Vad|Hur fungerar|Varför)/.test(t))],
      [`berättelserna fälls ut med boksymbolen (${bocker.join('; ')})`, bocker.includes('Berättelsen om tron') && bocker.includes('Hur guden kom till')],
      [`de mindre trosriktningarna (${ovriga}) står under ▸-raden Övriga trosriktningar, som fälls ut`, ovriga > 0 && mer && /data-hjalp="tro-ovriga"[^>]*aria-expanded="true"/.test(oppen)],
      // steg 11.1.18: den största tron är utfälld och de andra ihopfällda; ett tryck fäller ut en annan
      ['den största tron är utfälld och de andra ihopfällda med ▸ vid namnet', new RegExp(`data-hjalp="troihop-${stor.id}" aria-expanded="true"`).test(html) && /data-hjalp="troupp-\d+" aria-expanded="false"/.test(html) && (html.match(/Grundare:/g) ?? []).length === 1],
    ];
  },
};
SCENARIER.trotext = {
  text: 'Trons berättelse växer med tron (steg 11.1.23): den byggs av stycken ur registret TROSTYCKEN, ett för varje sak tron har fått, så att en personlig tro har ett par meningar och en kyrka en hel berättelse. Berättelsen blir längre när tron får en helig plats och en präst',
  kor: () => {
    const s = createState(9, START);
    const a = nyInvanare(s, 'k', 40); a.andlig = 100;
    faTro(s, a, 'blixt');
    const tr = SIM.troOf(s, a.tro)!;
    if (!tr) return [['en tro uppstod', false]];
    for (let j = 0; j < 6; j++) nyInvanare(s, 'm', 30).tro = tr.id;
    SIM.stepReligion(s);
    const meningar = (x: string) => x.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    const fore = SIM.trosBerattelse(s, tr);
    (s.heliga ??= []).push({ x: Math.floor(a.x), y: Math.floor(a.y), k: 'lund', tro: tr.id, t: s.now, om: 'test' });
    tr.prast = a.id;
    const efter = SIM.trosBerattelse(s, tr);
    return [
      [`den unga tron har ett par meningar (${meningar(fore)}): "${fore}"`, meningar(fore) >= 1 && meningar(fore) <= 4],
      [`med en helig plats och en präst blir berättelsen längre (${meningar(efter)} meningar) och nämner dem`, meningar(efter) > meningar(fore) && efter.includes('Den heliga lunden') && efter.includes(`${a.name} är dess präst`)],
    ];
  },
};

SCENARIER.religionsflik = {
  text: 'Fliken Religion (steg 4.1.3): syns när den första tron finns och visar varje tro med symbol, namn, antal troende, skalorna, grundaren, de troende och upplevelserna som rör tron; de minsta under Övriga trosriktningar, och alla i byn med andlighet och tro',
  kor: () => {
    utanWebblasare();
    const s = createState(9, START);
    setByn(s);
    const fore = religion.syns!();
    const ny = (k: SIM.TeckenTyp, n: number) => {
      const a = nyInvanare(s, 'k', 40); a.andlig = 100;
      faTro(s, a, k);
      const tr = SIM.troOf(s, a.tro)!;
      for (let j = 1; j < n; j++) nyInvanare(s, 'm', 30).tro = tr.id;
      SIM.stepReligion(s);
      return { a, tr };
    };
    const stor = ny('blixt', 5), andra = [ny('brand', 4), ny('vinterSlut', 3), ny('drom', 1)];
    const u = { k: 'tecken' as const, a: 40, e: {}, om: 'en blixt som slog ner i granen', v: 1 as const, t: s.now, n: 1 };
    stor.a.upp = [...stor.a.upp ?? [], u];
    const html = religion.html();
    hjalpKlick({ closest: () => ({ dataset: { hjalp: 'tro-ovriga' } }) } as unknown as HTMLElement); // som ett tryck på knappen
    const oppen = religion.html();
    // bud och högtider fälls ut (steg 11.1.24)
    stor.tr.bud = [{ id: 'hogtid', v: SIM.hogtidVarde(0, 'gille'), t: s.now }, { id: 'fasta', t: s.now }] as never;
    const budStangd = religion.html();
    hjalpKlick({ closest: () => ({ dataset: { hjalp: `bud-${stor.tr.id}-0` } }) } as unknown as HTMLElement);
    const budOppen = religion.html();
    hjalpKlick({ closest: () => ({ dataset: { hjalp: `bud-${stor.tr.id}-0` } }) } as unknown as HTMLElement);
    const budOk = new RegExp(`class="klick falla" data-hjalp="bud-${stor.tr.id}-1" aria-expanded="false"`).test(budStangd) && !budStangd.includes('class="muted small budmer"')
      && /class="muted small budmer">I istiden[^<]*Varför tron antog det: /.test(budOppen);
    stor.tr.bud = undefined;
    const minst = SIM.troNamn(andra[2].tr), tron = (h: string) => h.split('<h3>Andligheten i byn</h3>')[0]; // trosriktningarna, utan listan över personer
    return [
      ['fliken syns inte innan någon tror, sedan syns den', !fore && religion.syns!()],
      [`den största tron står med namn och antal troende (${stor.tr.namn})`, html.includes(stor.tr.namn!) && html.includes('👥 5')],
      ['grundaren står med', html.includes(`data-id="${stor.a.id}"`) && html.includes('Grundare')],
      ['skalorna Natur – Människa och Många – En syns', html.includes('Natur') && html.includes('Människa') && html.includes('Många')],
      ['upplevelsen som rör tron syns', html.includes('en blixt som slog ner i granen')],
      [`den minsta tron (${minst}) ligger under Övriga trosriktningar och syns när man öppnar dem`, html.includes('Övriga trosriktningar') && !tron(html).includes(minst) && tron(oppen).includes(minst)],
      [`trons bud och högtider är rader som fälls ut: högtiden säger när och vad man gör, och båda varför (steg 11.1.24)`, budOk],
      ['trons tyngd står inte som tal: etiketten står ensam, och talet med delarna i förklaringen (steg 11.1.20)', !html.includes('· tyngd') && new RegExp(`title="[^"]*Tyngd [^"]*"><b>${SIM.troEtikett(s, stor.tr).namn}</b></p>`).test(html)],
      ['andligheten och trons styrka förklaras som 0 till 10, utan talet 0 till 100 (steg 11.1.21)', /title="Tron hos [^"]* är [\d,]+ av 10 i styrka/.test(html) && /title="Andlighet [\d,]+ av 10:/.test(html) && !/av 100 stark/.test(html)],
      [`rubrikerna: De troende (N) i varje tro och Andligheten i byn sist (steg 11.1.19)`, html.includes('<h3>De troende (5)</h3>') && html.includes('<h3>Andligheten i byn</h3>') && !html.includes('<h3>Personer</h3>')],
      ['alla i byn står med andlighet och tro', html.includes('<h3>Andligheten i byn</h3>') && SIM.living(s).every(p => html.includes(`data-id="${p.id}"`))],
    ];
  },
};

SCENARIER.trostyngd = {
  text: 'Trons tyngd (steg 10.3.8): vad en tro kan bestämma kommer ur tyngden, summan av de troendes trosstyrka gånger trons ålder upp till ett tak, prästen, kyrkans egendom och trons hus. Varje bud kräver tyngden för sin storlek, ett antaget bud står kvar när tyngden sjunker, och etiketten räknas ur vad tron har',
  kor: () => {
    const s = createState(9, START);
    const a = nyInvanare(s, 'k', 40); a.andlig = 100;
    faTro(s, a, 'blixt');
    const tr = SIM.troOf(s, a.tro)!, folk = [a];
    while (folk.length < 10) { const p = nyInvanare(s, 'm', 30); p.andlig = 50; p.tro = tr.id; folk.push(p); }
    for (const p of folk) p.troStyrka = 100;
    const del = (id: string) => SIM.tyngdDelar(s, tr).find(d => d.id === id)!.v;
    // en ny tro med tio ivriga: bara små bud
    const ny = del('troende'), ny1 = SIM.rymsBud(s, tr, 1), ny2 = SIM.rymsBud(s, tr, 2);
    const barn = nyInvanare(s, 'k', 5); barn.tro = tr.id; barn.troStyrka = 100; const medBarn = del('troende');
    // åldern: full vikt efter 28 dygn, sedan inte mer
    const t0 = tr.t; tr.t = s.now - SIM.TYNGD.alderDygn * SIM.DAY; const full = del('troende'); tr.t = s.now - 3 * SIM.TYNGD.alderDygn * SIM.DAY; const gammal = del('troende'); tr.t = t0;
    for (const p of folk) p.troStyrka = 50; const halv = del('troende'); for (const p of folk) p.troStyrka = 100;
    // prästen, egendomen och huset
    const utanPrast = del('prast'); tr.prast = folk[1].id; const medPrast = del('prast');
    satKyrka(s, tr, { ved: 10 }); const halvEgendom = del('egendom'); satKyrka(s, tr, { ved: 200 }); const fullEgendom = del('egendom'); satKyrka(s, tr, {});
    const hs = structuredClone(s), htr = hs.tron!.find(x => x.id === tr.id)!; medTroshus(hs, htr, false); const halvbyggt = SIM.tyngdDelar(hs, htr).find(d => d.id === 'hus')!.v;
    const ht = SIM.troshusAv(hs, htr)[0], q0 = SIM.living(hs).find(p => p.tro === htr.id), at = ht && q0 && SIM.stationSite(hs, 'altare', q0);
    if (at) (hs.stationer ??= []).push({ id: 9001, k: 'altare', x: at.x, y: at.y, kvar: 0, klar: hs.now, tro: htr.id, inne: 1 }); const klart = SIM.tyngdDelar(hs, htr).find(d => d.id === 'hus')!.v;
    const summa = Math.abs(SIM.tyngd(s, tr) - SIM.tyngdDelar(s, tr).reduce((x, d) => x + d.v, 0)) < 1e-9;
    // etiketterna, den första som stämmer
    const et = () => SIM.troEtikett(s, tr).namn;
    const kyrka = SIM.troEtikett(hs, htr).namn; const prast = et(); tr.prast = undefined;
    (s.heliga ??= []).push({ x: 1, y: 1, k: 'fodd' as SIM.HeligPlats['k'], tro: tr.id, t: s.now, om: 'där tron föddes' }); const seder = et();
    s.heliga[s.heliga.length - 1].skandad = s.now; const vanhelgad = et(); s.heliga.pop();
    const namn = tr.namn; tr.namn = 'Åskans tro'; const delad = et(); tr.namn = undefined; const personlig = et(); tr.namn = namn;
    // ett antaget bud står kvar när de troende dör
    tr.bud = [{ id: 'forstaFangst', t: s.now }];
    for (const p of folk.slice(2)) p.died = s.now;
    SIM.stepReligion(s);
    const kvar = SIM.budIn(tr, 'forstaFangst') && !SIM.rymsBud(s, tr, 2);
    // skalorna: Var och en – Präster med den första prästen, Öppen – Sluten med en andra tro
    const prastFore = SIM.skalaSyns(s, 'prast'); tr.prast = folk[1].id; SIM.stepReligion(s); const prastEfter = SIM.skalaSyns(s, 'prast');
    const oppenFore = SIM.skalaSyns(s, 'oppen');
    const b = nyInvanare(s, 'm', 40); b.andlig = 100;
    faTro(s, b, 'brand');
    SIM.stepReligion(s);
    const oppen = SIM.skalaSyns(s, 'oppen');
    const f = (x: number) => x.toFixed(2);
    return [
      [`de troende: trosstyrkan gånger åldern, 0,25 för en ny tro (${f(ny)} med tio)`, Math.abs(ny - 10 * SIM.TYNGD.alderFran) < 1e-6],
      [`barnen räknas inte (${f(medBarn)})`, medBarn === ny],
      [`hälften så stark tro väger hälften (${f(halv)})`, Math.abs(halv - ny / 2) < 1e-6],
      [`åldern ger full vikt efter 28 dygn och sedan inte mer (${f(full)}, ${f(gammal)})`, Math.abs(full - 10) < 1e-6 && Math.abs(gammal - 10) < 1e-6],
      [`en ny tro med tio ivriga får bud av storlek 1 men inget större (${ny1}, ${ny2})`, ny1 && !ny2],
      [`prästen väger ${SIM.TYNGD.prast} (${utanPrast} → ${medPrast})`, utanPrast === 0 && medPrast === SIM.TYNGD.prast],
      [`egendomen ger upp till ${SIM.TYNGD.egendom}, fullt vid värdet av ${SIM.TYNGD.egendomVed} ved (${f(halvEgendom)}, ${f(fullEgendom)})`, Math.abs(halvEgendom - SIM.TYNGD.egendom / 2) < 1e-6 && fullEgendom === SIM.TYNGD.egendom],
      [`bara ett färdigt hus väger (${halvbyggt} → ${klart})`, halvbyggt === 0 && klart === SIM.TYNGD.hus],
      ['tyngden är summan av delarna', summa],
      [`etiketterna: ${[kyrka, prast, seder, vanhelgad, delad, personlig].join(', ')}`, kyrka === 'Kyrka' && prast === 'Präst' && seder === 'Helig plats' && vanhelgad === 'Personlig tro' && delad === 'Delad tro' && personlig === 'Personlig tro'],
      ['ett antaget bud står kvar när tyngden sjunker', kvar],
      [`Var och en – Präster låses upp med den första prästen (${prastFore} → ${prastEfter})`, !prastFore && prastEfter],
      [`Öppen – Sluten låses upp när en andra tro finns (${oppenFore} → ${oppen})`, !oppenFore && oppen],
      ['etiketten står i fliken, och tyngden i förklaringen (steg 11.1.20)', (() => { utanWebblasare(); setByn(s); const h = religion.html(); return /title="[^"]*Tyngd [^"]*"><b>[^<]+<\/b><\/p>/.test(h); })()],
    ];
  },
};

SCENARIER.gudar = {
  text: 'Gudarna (steg 4.1.5): en tro som får sitt namn får en gud ur tecknet, en ande på Natur-sidan och en gud i människoform i mitten, med ett namn av ordled och aldrig en verklig gud; stora händelser föder nya gudar (Många) eller ger den enda guden ett nytt område (En); en gud som inget bekräftar glöms men aldrig den sista; på Människa-sidan blir en död bybo som byn berättar om förfader, tidigast en generation efter döden; fliken visar gudarna',
  kor: () => {
    const s = createState(9, START);
    // en tro ur tecknet k med skalorna natur och manga, och tre som tror
    const nyTro = (k: SIM.TeckenTyp, natur: number, manga: number) => {
      const a = nyInvanare(s, 'k', 30); a.andlig = 100;
      faTro(s, a, k);
      const tr = SIM.troOf(s, a.tro)!; tr.natur = natur; tr.manga = manga;
      for (let i = 0; i < 2; i++) { const p = nyInvanare(s, 'm', 30); p.andlig = 50; p.tro = tr.id; }
      SIM.stepReligion(s);
      return tr;
    };
    const ande = nyTro('blixt', 10, 20), gud = nyTro('blixt', 50, 80);
    const g1 = ande.gudar?.[0], g2 = gud.gudar?.[0];
    const forled = (o: SIM.GudOmr, n: string) => SIM.GUD_OMR[o].forled.some(f => n.startsWith(f));
    // många namn: av ordled och aldrig en verklig gud
    const namn: string[] = [];
    for (let i = 0; i < 40; i++) { const t = nyTro('brand', 50, 20); namn.push(t.gudar?.[0]?.namn ?? '?'); }
    const verkliga = ['Tor', 'Oden', 'Frej', 'Freja', 'Loke', 'Balder'];
    // stora händelser: Många får en ny gud, En ger den enda guden området
    for (let i = 0; i < 200 && !(ande.gudar ?? []).some(g => g.omr.includes('elden')); i++) SIM.gudHandelse(s, 'elden', 'elden som spred sig');
    for (let i = 0; i < 200 && !(gud.gudar?.[0]?.omr ?? []).includes('elden'); i++) SIM.gudHandelse(s, 'elden', 'elden som spred sig');
    const mangaN = SIM.gudarOf(ande).length, enN = SIM.gudarOf(gud).length, enOmr = gud.gudar?.[0]?.omr.join(',');
    // glömskan: bara åskan bekräftas
    const elden = (ande.gudar ?? []).find(g => g.omr.includes('elden'));
    for (let d = 0; d <= SIM.GUD.glom + 1; d++) { s.now += SIM.DAY; SIM.gudHandelse(s, 'aska', 'åskan'); SIM.stepReligion(s); }
    const glomd = elden?.slut !== undefined, askaKvar = g1?.slut === undefined;
    for (let d = 0; d <= SIM.GUD.glom + 1; d++) { s.now += SIM.DAY; SIM.stepReligion(s); }
    const sista = SIM.gudarOf(ande).length;
    // förfäderna: alla som levde förr är döda; en vargdödare som dog nyss blir inte förfader, en som dog för länge sedan blir det
    s.now += 200 * SIM.DAY;
    const bebis = nyInvanare(s, 'k', 0); // föds nu: kände ingen av de döda
    for (const p of SIM.living(s)) if (p !== bebis) p.died = s.now - 150 * SIM.DAY;
    const fader = nyTro('blixt', 90, 20);
    const v = nyInvanare(s, 'm', 30); v.died = s.now - 2 * SIM.DAY; v.binamn = { k: 'vargdodare', namn: 'Vargdödaren', v: 1, t: s.now };
    for (let i = 0; i < 2000; i++) SIM.stepReligion(s);
    const forTidigt = (fader.gudar ?? []).some(g => g.pid === v.id);
    v.died = s.now - 100 * SIM.DAY;
    for (let i = 0; i < 3000 && !(fader.gudar ?? []).some(g => g.pid === v.id); i++) SIM.stepReligion(s);
    const ff = (fader.gudar ?? []).find(g => g.pid === v.id);
    // en ny tro på Människa-sidan ur jakten får förfadern som sin första gud
    const jakt = nyTro('jakt', 90, 20), jf = jakt.gudar?.[0];
    utanWebblasare(); setByn(s);
    const gid = `gud-${fader.id}-${(fader.gudar ?? []).findIndex(g => g === ff)}`, html = religion.html();
    for (const id of ['tro-ovriga', gid]) hjalpKlick({ closest: () => ({ dataset: { hjalp: id } }) } as unknown as HTMLElement); // som ett tryck på knapparna
    const oppen = religion.html();
    return [
      [`Natur-sidan får en ande som bor någonstans (${g1?.form}, ${g1?.namn}, i ${g1?.i})`, g1?.form === 'ande' && !!g1.i && g1.omr[0] === 'aska'],
      [`mitten får en gud i människoform (${g2?.form}, ${g2?.namn})`, g2?.form === 'gud' && g2.omr[0] === 'aska'],
      [`namnen sätts ihop av ordled (${namn.slice(0, 8).join(', ')})`, namn.every(n => forled('elden', n)) && new Set(namn).size === namn.length],
      ['aldrig en verklig gud', !namn.some(n => verkliga.includes(n))],
      [`en tro med många gudar får en ny gud för elden (${mangaN} gudar)`, mangaN === 2],
      [`en tro med en gud låter guden ta över elden (${enN} gud, ${enOmr})`, enN === 1 && enOmr === 'aska,elden'],
      [`en gud som inget bekräftar glöms (${glomd}), den som bekräftas finns kvar (${askaKvar})`, glomd && askaKvar],
      [`den sista guden glöms aldrig (${sista})`, sista === 1],
      [`en död bybo blir inte förfader för tidigt (${forTidigt})`, !forTidigt],
      [`en generation senare blir vargdödaren förfader för jakten (${ff?.namn}, ${ff?.omr.join(',')})`, ff?.form === 'forfader' && ff.omr[0] === 'jakt' && ff.namn === `${v.name} Vargdödaren`],
      [`en ny tro ur jakten får förfadern som första gud (${jf?.form} ${jf?.namn})`, jf?.form === 'forfader' && jf.pid === v.id],
      ['symbolerna finns', (Object.keys(SIM.GUDAR) as SIM.GudOmr[]).every(o => hasIcon(SIM.GUD_OMR[o].sym))],
      [`fliken visar gudarna med område och berättelse (${html.includes('<h3>Gudar</h3>')}, ${html.includes(SIM.GUD_OMR.jakt.namn)}, ${!html.includes(esc(ff?.ber ?? 'x'))} → ${oppen.includes(esc(ff?.ber ?? 'x'))})`, html.includes('<h3>Gudar</h3>') && html.includes(SIM.GUD_OMR.jakt.namn) && !html.includes(esc(ff?.ber ?? 'x')) && oppen.includes(esc(ff?.ber ?? 'x'))],
    ];
  },
};

for (const n of ['tecken', 'gudar']) { const kor0 = SCENARIER[n].kor; SCENARIER[n].kor = () => { SIM.TRO_PROV.utanTak = true; try { return kor0(); } finally { SIM.TRO_PROV.utanTak = false; } }; }
