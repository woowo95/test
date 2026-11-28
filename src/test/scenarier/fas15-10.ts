// Scenarier för fas 15, grupp 10 av system 15.1 (hälsan: infektionen, motståndet, vården och döden).
import * as SIM from '../../sim';
import { SCENARIER, kor, nyInvanare } from './hjalp';
import { START } from '../kor';
import { execSync } from 'child_process';

SCENARIER.vardlista = {
  text: 'Steg 15.1.109: npm run vard går att köra och skriver ut vårdregistret',
  kor: () => {
    let ut = '';
    try { ut = execSync('npx tsx src/test/vard.ts', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { ut = String((e as { stderr?: string }).stderr ?? e); }
    return [
      [`kommandot kraschar inte (${ut.split('\n')[0]?.slice(0, 60)})`, !/Error|before initialization/.test(ut)],
      [`alla behandlingar skrivs (${SIM.VARD_LIST.length})`, SIM.VARD_LIST.every(k => ut.includes(SIM.VARD[k].namn))],
    ];
  },
};

// ett sår på en vuxen, följt i två dygn (två år i spelet) med halsaSteg: hur stor del som blir infekterade. vila = hen sover hela tiden
const vuxen = (s: SIM.State) => SIM.living(s).find(p => SIM.ageOf(p, s.now) >= 20 && SIM.ageOf(p, s.now) < 40)!;
function infProv(s: SIM.State, w: Partial<SIM.Skada> & { k: SIM.SkadaTyp; g: number }, n: number, vila = false) {
  const mall = vuxen(s); let inf = 0;
  SIM.HALSA_PROV.grov = true;
  for (let i = 0; i < n; i++) {
    const t0 = s.now;
    const p: SIM.Person = { ...mall, id: 20000 + i, rngs: undefined, skador: [{ d: 'armV', b: 1, g0: w.g, ...w }], blod: 1, hunger: 1, warm: 1, sjuk: undefined,
      task: vila ? { act: 'sova', phase: 'do', tx: mall.x, ty: mall.y } as SIM.Task : undefined };
    for (let m = 0; m < 48 * 6 && p.skador?.length; m++) { s.now += 600e3; SIM.halsaSteg(s, p, 600); if (p.skador?.some(x => x.inf !== undefined)) { inf++; break; } }
    s.now = t0;
  }
  SIM.HALSA_PROV.grov = false;
  return inf / n;
}
const pct = (x: number) => `${Math.round(x * 100)} %`;

SCENARIER.infrisk = {
  text: 'Steg 15.1.105: infektionsrisken följer såret och vilan. Ett ovårdat bett infekteras i ungefär hälften av fallen och ett skärsår med remsa nästan aldrig; ett sår som levrat sig eller sytts infekteras inte; den som vilar har halva risken; rövarnas och djurens vapen och käftar är blodiga och ger dubbel risk, och vargbettet har ingen egen tärning',
  kor: () => {
    const s = SIM.createState(3, START);
    const bett = infProv(s, { k: 'bett', g: 0.5 }, 300), remsa = infProv(s, { k: 'skarsar', g: 0.3, f: 2, fT: s.now }, 300);
    const levrat = infProv(s, { k: 'bett', g: 0.5, b: 0 }, 100), sytt = infProv(s, { k: 'sticksar', g: 0.7, sydd: 1, b: 0 }, 100);
    const sover = infProv(s, { k: 'bett', g: 0.5 }, 300, true), blodigt = infProv(s, { k: 'bett', g: 0.5, smuts: 1 }, 300);
    const litet = infProv(s, { k: 'bett', g: 0.2 }, 300);
    const slag = ['varg', 'bjorn', 'vildsvin', 'rovare'];
    return [
      [`ett ovårdat bett av grad 0,5 infekteras i 40–60 % av fallen (${pct(bett)})`, bett >= 0.4 && bett <= 0.6],
      [`ett skärsår med remsa nästan aldrig (${pct(remsa)})`, remsa <= 0.05],
      [`ett sår som levrat sig (${pct(levrat)}) eller sytts (${pct(sytt)}) infekteras inte`, levrat === 0 && sytt === 0],
      [`ett litet bett infekteras mer sällan än ett stort (${pct(litet)} mot ${pct(bett)})`, litet < bett],
      [`den som vilar infekteras mer sällan (${pct(sover)} mot ${pct(bett)})`, sover < bett * 0.8],
      [`ett bett av en blodig käft infekteras oftare (${pct(blodigt)} mot ${pct(bett)})`, blodigt > bett * 1.2],
      [`vargarna, björnen, vildsvinet och rövarna har blodiga vapen och käftar (${slag.filter(k => SIM.STRIDSLAG[k]?.blodigt).join(', ')})`, slag.every(k => SIM.STRIDSLAG[k]?.blodigt)],
      ['vargbettet har ingen egen tärning för infektionen', !('bettInf' in SIM.VARG)],
    ];
  },
};

// en vuxen med ett infekterat sår, följd i högst tio dygn (tio år i spelet) med halsaSteg. mat = protein och vitaminer (de andra
// värdena följer), vila = hen sover hela tiden. Svarar med andelen som dog, andelen som blev botade av motståndet och såret efteråt
function infMotProv(s: SIM.State, w: Partial<SIM.Skada>, n: number, mat: number, vila: boolean, d: SIM.Kroppsdel = 'armV') {
  const mall = vuxen(s); let dog = 0, botad = 0;
  SIM.HALSA_PROV.grov = true;
  for (let i = 0; i < n; i++) {
    const t0 = s.now, nv = Object.fromEntries(SIM.NARINGAR.map(x => [x, mat])) as Record<SIM.Naring, number>;
    const p: SIM.Person = { ...mall, id: 21000 + i, rngs: undefined, blod: 1, warm: 1, sjuk: undefined, naring: nv, hunger: SIM.mattnad(nv), te: undefined,
      task: vila ? { act: 'sova', phase: 'do', tx: mall.x, ty: mall.y } as SIM.Task : undefined, skador: [] };
    p.skador!.push({ d, k: 'bett', g: 0.5, b: 0, g0: 0.5, inf: 0, mot: 0, ...w, r: w.r ?? 1 - SIM.SJUK.spann + 2 * SIM.SJUK.spann * SIM.rnd(s, 'halsa', p) });
    const sar = p.skador![0];
    for (let m = 0; m < 240 * 6; m++) {
      s.now += 600e3; p.naring = { ...nv }; p.hunger = SIM.mattnad(nv);
      if (SIM.halsaSteg(s, p, 600) === 'kallbrand') { dog++; break; }
      if (sar.inf === undefined) { botad++; break; }
    }
    s.now = t0;
  }
  SIM.HALSA_PROV.grov = false;
  return { dog: dog / n, botad: botad / n };
}

SCENARIER.infmot = {
  text: 'Steg 15.1.106: kroppen kämpar mot infektionen. Motståndet växer med näringen, vilan, värmen och teet, och när det når 1 är infektionen botad. Den mätta som vilar överlever oftast ett ovårdat infekterat bett, den hungriga som arbetar oftast inte, och kallbrand i benet utan amputation dödar. Sköljningen botar rodnaden men inte febern på en gång, och hjälper inte i kallbranden',
  kor: () => {
    const s = SIM.createState(3, START), H = SIM.HALSA;
    const matt = infMotProv(s, {}, 100, 1, true), hungrig = infMotProv(s, {}, 100, 0.05, false);
    const kallbrand = infMotProv(s, { inf: H.kallbrand + 0.01, mot: 0.9 }, 30, 1, true, 'benV');
    const bal = infMotProv(s, { inf: H.kallbrand + 0.01, mot: 0.9 }, 30, 1, true, 'bal');
    // en sköljning (renTim timmar) på en hungrig som arbetar, med infektionens vanliga takt
    const skolj = (inf: number) => {
      const mall = vuxen(s), nv = Object.fromEntries(SIM.NARINGAR.map(x => [x, 0.05])) as Record<SIM.Naring, number>;
      const p: SIM.Person = { ...mall, id: 22000, rngs: undefined, blod: 1, warm: 1, naring: nv, hunger: SIM.mattnad(nv), task: undefined, te: undefined, skador: [{ d: 'armV', k: 'bett', g: 0.5, b: 0, g0: 0.5, inf, mot: 0, r: 1, ren: s.now + H.renTim * SIM.HOUR }] };
      const t0 = s.now, w = p.skador![0];
      for (let m = 0; m < H.renTim * 6 && w.inf !== undefined; m++) { s.now += 600e3; SIM.halsaSteg(s, p, 600); }
      s.now = t0;
      return w.inf;
    };
    const rodnad = skolj(0.1), feber = skolj(0.4), kall = skolj(0.7);
    const f = (x: number) => `${Math.round(x * 100)} %`;
    return [
      [`den mätta som vilar överlever oftast ett ovårdat infekterat bett (${f(1 - matt.dog)} överlever, ${f(matt.botad)} botade av motståndet)`, matt.dog < 0.2 && matt.botad > 0.8],
      [`den hungriga som arbetar överlever oftast inte (${f(hungrig.dog)} dör)`, hungrig.dog > 0.6],
      [`kallbrand i benet utan amputation dödar (${f(kallbrand.dog)} dör)`, kallbrand.dog === 1],
      [`kallbrand i bålen kan motståndet ännu vinna (${f(bal.botad)} botade)`, bal.botad > 0],
      [`en sköljning botar rodnaden (${rodnad === undefined ? 'botad' : rodnad.toFixed(2)})`, rodnad === undefined],
      [`febern behöver flera sköljningar (${feber === undefined ? 'botad' : feber.toFixed(2)} kvar av 0,4)`, feber !== undefined && feber < 0.4],
      [`sköljningen hjälper inte i kallbranden (${kall === undefined ? 'botad' : kall.toFixed(2)} från 0,7)`, kall !== undefined && kall > 0.7],
    ];
  },
};

SCENARIER.dodsorsak = {
  text: 'Steg 15.1.108: dödsorsaken följer såret. Den som förblöder efter ett rövaranfall dog "av blodförlust efter rövarnas anfall" och räknas som stupad: följden, sorgen och räknaren dog av rövare tas från orsaken, och räknaren för blodförlusten står kvar. Den som får kallbrand i ett vargbett dog av kallbrand efter vargarnas bett, och ett sår ur en olycka heter som förut',
  kor: () => {
    const s = SIM.createState(6, START);
    while (SIM.living(s).length < 10) nyInvanare(s, SIM.living(s).length % 2 ? 'm' : 'k', 25);
    SIM.HALSA_PROV.grov = true;
    // en vuxen får ett stort sår av rövarna och förblöder
    const p = vuxen(s);
    SIM.skada(s, p, 'benV', 'sticksar', 0.9, 'rovare', 'i en strid med rövare', true);
    let satt: SIM.Dodsorsak | undefined;
    for (let m = 0; m < 48 * 60 && !satt; m++) { s.now += 60e3; satt = SIM.halsaSteg(s, p, 60); }
    if (satt) SIM.die(s, p, satt);
    const stupade = SIM.living(s).filter(q => q.upp?.some(u => u.k === 'stupade')).length;
    // ett vargbett som fått kallbrand
    const q = SIM.living(s).find(r => r !== p && SIM.ageOf(r, s.now) >= 20)!;
    SIM.skada(s, q, 'armV', 'bett', 0.2, 'varg', 'i en strid med vargar', true);
    SIM.skada(s, q, 'benH', 'skarsar', 0.2, 'olycka', 'när hen högg ved');
    q.skador![0].inf = 0.99; q.skador![0].mot = 0; q.skador![0].r = 1.5; q.skador![1].inf = 0.5;
    let satt2: SIM.Dodsorsak | undefined;
    for (let m = 0; m < 10 * 60 && !satt2; m++) { s.now += 60e3; satt2 = SIM.halsaSteg(s, q, 60); }
    if (satt2) SIM.die(s, q, satt2);
    // ett sår ur en olycka
    const o = SIM.living(s).find(r => r !== p && r !== q && SIM.ageOf(r, s.now) >= 20)!;
    SIM.skada(s, o, 'armV', 'skarsar', 0.9, 'olycka', 'när hen högg ved');
    let satt3: SIM.Dodsorsak | undefined;
    for (let m = 0; m < 48 * 60 && !satt3; m++) { s.now += 60e3; satt3 = SIM.halsaSteg(s, o, 60); }
    if (satt3) SIM.die(s, o, satt3);
    SIM.HALSA_PROV.grov = false;
    const st = s.stat ?? {};
    return [
      [`den som förblödde efter rövarnas anfall dog ${p.cause}`, satt === 'blod' && p.cause === 'av blodförlust efter rövarnas anfall'],
      [`räknaren dog av rövare (${st['dog av rövare'] ?? 0}) och dog av blodförlust (${st['dog av blodförlust'] ?? 0}) räknar hen`, (st['dog av rövare'] ?? 0) === 1 && (st['dog av blodförlust'] ?? 0) >= 1],
      [`de levande fick upplevelsen att ha mist någon i en strid (${stupade})`, stupade > 0],
      [`kallbranden i vargbettet: dog ${q.cause}`, satt2 === 'kallbrand' && q.cause === 'av kallbrand efter vargarnas bett'],
      [`såret ur en olycka: dog ${o.cause}`, satt3 === 'blod' && o.cause === 'av blodförlust'],
    ];
  },
};

SCENARIER.vardfel = {
  text: 'Steg 15.1.110: vården kan misslyckas med radens risk, mindre för den skicklige (HALSA.lakeRisk). Den ovana som syr misslyckas tydligt oftare än den skickliga, och ett misslyckat sår blir värre; materialet går åt ändå. Avsnörningen för hårt skadar delen efter halva tiden, och benet som sätts fel läker snett',
  kor: () => {
    const s = SIM.createState(3, START), H = SIM.HALSA;
    const [g, q] = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
    SIM.setAmount(s, 'rep', 500);
    const sy = (lake: number, n: number) => {
      g.skill.lakekonst = lake; let fel = 0, varre = 0, rep = 0;
      for (let i = 0; i < n; i++) {
        const w: SIM.Skada = { d: 'armV', k: 'skarsar', g: 0.7, b: 1, g0: 0.7 };
        SIM.setAmount(s, 'rep', 5); SIM.vardGor(s, g, q, w, 'sy'); rep += 5 - SIM.amountOf(s, 'rep'); // repet fylls på: lagret rymmer inte allt
        if (!w.sydd) { fel++; if (w.g > 0.7) varre++; }
      }
      return { fel: fel / n, varre, rep };
    };
    const ovan = sy(0, 200), skicklig = sy(8, 200);
    const fore = Number(s.stat?.vardFel_sy ?? 0);
    // avsnörningen och benet hos den ovana, tills det gått fel
    g.skill.lakekonst = 0;
    let av: SIM.Skada | undefined, ben: SIM.Skada | undefined;
    for (let i = 0; i < 300 && !av; i++) { const w: SIM.Skada = { d: 'benV', k: 'skarsar', g: 0.8, b: 1, g0: 0.8 }; SIM.vardGor(s, g, q, w, 'avsnora'); if (w.av !== undefined && w.av < s.now) av = w; }
    for (let i = 0; i < 300 && !ben; i++) { const w: SIM.Skada = { d: 'benV', k: 'benbrott', g: 0.5, b: 0, g0: 0.5, t0: s.now }; SIM.vardGor(s, g, q, w, 'satta'); if (w.snett) ben = w; }
    const f = (x: number) => `${Math.round(x * 100)} %`;
    return [
      [`den ovana syr fel tydligt oftare än den skickliga (${f(ovan.fel)} mot ${f(skicklig.fel)})`, ovan.fel > 0.1 && ovan.fel > skicklig.fel * 3],
      [`det misslyckade såret blev värre (${ovan.varre} av ${Math.round(ovan.fel * 200)})`, ovan.varre === Math.round(ovan.fel * 200) && ovan.varre > 0],
      [`repet gick åt också när det gick fel (${ovan.rep} av 200)`, ovan.rep === 200],
      [`felen räknas (vardFel_sy ${fore})`, fore === Math.round((ovan.fel + skicklig.fel) * 200)],
      [`avsnörningen för hårt räknas från halva tiden (${av ? ((s.now - av.av!) / SIM.HOUR).toFixed(1) : '–'} timmar)`, !!av && Math.abs((s.now - av.av!) / SIM.HOUR - H.avsnoraTim / 2) < 1e-6],
      [`benet som sattes fel läker snett (${ben ? 'ja' : 'nej'})`, !!ben && !ben.satt],
    ];
  },
};

SCENARIER.aldersdod = {
  text: 'Steg 15.1.111: ingen dör i en olycka som aldrig hände. Tärningen som växer med åldern är kroppen som slits ut: en frisk vuxen som dör av den dör av ålderdom, ett litet barn av en barnsjukdom, ingen i en olycka, och ingen plats blir fruktad. KROPP.dodBas är 0, så olyckorna kommer bara ur OLYCKOR',
  env: { BALANS: 'karta.bredd=120,karta.hojd=120,start.klader=0,kropp.dodAlder=50' }, // tärningen slår genast, så att provet gäller vad den heter
  kor: () => {
    const s = SIM.createState(4, START);
    const fara = () => SIM.living(s).reduce((a, p) => a + (p.lardomar ?? []).filter(l => l.k === 'fara').length, 0) + s.people.filter(p => p.died !== undefined).reduce((a, p) => a + (p.lardomar ?? []).filter(l => l.k === 'fara').length, 0);
    const fara0 = fara();
    SIM.HALSA_PROV.grov = true;
    kor(s, 1);
    SIM.HALSA_PROV.grov = false;
    const doda = s.people.filter(p => p.died !== undefined), orsaker = [...new Set(doda.map(p => p.cause))];
    return [
      [`KROPP.dodBas är 0 (${SIM.KROPP.dodBas})`, SIM.KROPP.dodBas === 0],
      [`de som dog av tärningen dog av ålderdom eller en barnsjukdom (${doda.length} döda: ${orsaker.join(', ')})`, doda.length > 0 && doda.every(p => p.cause === SIM.DODSORSAKER.alderdom.text || p.cause === SIM.DODSORSAKER.barnsjukdom.text)],
      [`de vuxna dog av ålderdom (${doda.filter(p => SIM.ageOf(p, p.died!) >= SIM.ALDER.barnsjuk).map(p => p.cause).join(', ')})`, doda.filter(p => SIM.ageOf(p, p.died!) >= SIM.ALDER.barnsjuk).every(p => p.cause === SIM.DODSORSAKER.alderdom.text)],
      [`ingen dog i en olycka (${doda.filter(p => p.cause === SIM.DODSORSAKER.olycka.text).length})`, !doda.some(p => p.cause === SIM.DODSORSAKER.olycka.text)],
      [`ingen plats blev fruktad (${fara() - fara0} nya)`, fara() === fara0],
    ];
  },
};

SCENARIER.barnsjuk = {
  text: 'Steg 15.1.112: barnadödligheten kommer ur sjukdomarna. Barn under fem år har långsammare motstånd (SJUK.barnMot), så ett sjukt barn dör oftare än en vuxen med samma sjukdom, och ett friskt barn dör inte av en tärning (KROPP.dodBarn är 0)',
  kor: () => {
    const s = SIM.createState(3, START), mall = vuxen(s);
    // en mätt och varm person av en viss ålder med lunginflammation, som sover en tredjedel av dygnet
    const prov = (alder: number, n: number) => {
      let dog = 0;
      for (let i = 0; i < n; i++) {
        const p: SIM.Person = { ...mall, id: 23000 + i, rngs: undefined, born: s.now - alder * SIM.DAY, sjuk: undefined, immun: undefined, naring: undefined, hunger: 1, warm: 1 };
        const t0 = s.now; SIM.insjukna(s, p, 'lunginflammation');
        for (let tid = 0; p.sjuk && tid < 40 * SIM.DAY; ) { s.now += 600e3; tid += 600e3; if (SIM.sjukSteg(s, p, 600, (tid / 3600e3) % 24 < 8, false)) { dog++; break; } }
        s.now = t0;
      }
      return dog / n;
    };
    const barn = prov(SIM.ALDER.smabarn, 200), vuxna = prov(30, 200); // ett barn som är lika farligt sjukt som en vuxen (SJUKDOMAR.dod), och skillnaden är motståndet
    const K = SIM.KROPP, risk = (a: number) => K.dodBas + K.dodAlder * Math.exp(K.dodTakt * a) + K.dodBarn; // tärningen per dygn för ett litet barn
    return [
      [`ett treårigt barn med lunginflammation dör oftare än en vuxen (${Math.round(barn * 100)} % mot ${Math.round(vuxna * 100)} %)`, barn > vuxna * 2 && barn > 0.05],
      [`ett friskt barn dör inte av en tärning: KROPP.dodBarn är 0 och risken för ett tvååring är ${(risk(2) * 100).toFixed(3)} % per dygn`, K.dodBarn === 0 && risk(2) < 1e-4],
    ];
  },
};
