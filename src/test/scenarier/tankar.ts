// Scenarier för humörets tankar, drömmarna, upplevelserna, rykten, berättelserna och samtalsämnena från de nya systemen
// (steg 12.1.131–12.1.136).
import { readdirSync, readFileSync } from 'node:fs';
import * as SIM from '../../sim';
import { SCENARIER, medTal, testBy } from './hjalp';


SCENARIER.tankar = {
  text: 'Humörets register (steg 12.1.131, tankar.ts): varje tanke är en rad i TANKAR med text, styrka, tid och händelse; ett system ger tanken genom att nämna raden, och alla tankar i testbyarna finns som rader',
  kor: () => {
    // ingen tanke ges förbi registret
    const simMapp = new URL('../../sim/', import.meta.url);
    const forbi = readdirSync(simMapp).filter(f => f.endsWith('.ts') && f !== 'tankar.ts')
      .flatMap(f => readFileSync(new URL(f, simMapp), 'utf8').split('\n').filter(l => /\bthink\(/.test(l) && !/export function think/.test(l)).map(() => f));
    // varje tanke i en testby har sin rad
    const s = testBy(20);
    const texter = new Set(s.people.flatMap(p => p.thoughts.map(t => t.text)));
    const utan = s.people.flatMap(p => p.thoughts).filter(t => t.k === undefined || !(t.k in SIM.TANKAR)).map(t => t.text); // tanken frågas om nyckeln (steg 12.1.234)
    // raderna: texten, styrkan och tiden ur raden, f och tid vid anropet
    const p = s.people.find(q => !q.died)!, now = s.now;
    SIM.tanke(p, 'fryser', now); const fr = p.thoughts.find(t => t.text === 'Fryser')!;
    SIM.tanke(p, 'sovBadd', now, { f: 0.5 }); const sb = p.thoughts.find(t => t.text === 'Sov gott i halmbädden')!;
    SIM.tanke(p, 'gifte', now, { namn: 'Ask', tid: SIM.HOUR }); const gi = p.thoughts.find(t => t.text === 'Gifte sig med Ask')!;
    // tanken känns igen på nyckeln (steg 12.1.234): en björn är ingen match, och en gammal tanke utan nyckel får raden som passar bäst
    const q = s.people.filter(x => !x.died)[1] ?? p; q.thoughts = [];
    SIM.tanke(q, 'sagBjorn', now, { v: -0.05, tid: SIM.HOUR });
    const bjornEjFest = !SIM.harTanke(q, ['sagMatch'], now) && SIM.harTanke(q, ['sagBjorn'], now);
    const gammal = SIM.tankeNyckel({ text: 'Såg en björn' }), gammalMatch = SIM.tankeNyckel({ text: 'Såg Ask och Embla' });
    let kastar = false; try { SIM.tanke(p, 'harOnt', now); } catch { kastar = true; }
    const utanNar = Object.entries(SIM.TANKAR).filter(([, d]) => !(d as SIM.TankeDef).nar).map(([k]) => k);
    return [
      [`ingen tanke ges förbi registret${forbi.length ? ` (${[...new Set(forbi)].join(', ')})` : ''}`, forbi.length === 0],
      [`alla ${texter.size} olika tankar i en testby finns i TANKAR${utan.length ? ` (saknas: ${utan.slice(0, 5).join('; ')})` : ''}`, texter.size > 3 && utan.length === 0],
      ['tanken får radens styrka och tid', fr.v === -0.12 && fr.until === now + SIM.HOUR],
      ['f gör raden svagare', sb.v === 0.09 * 0.5 && sb.until === now + 8 * SIM.HOUR],
      ['namnet fylls i och tiden kan ges vid anropet', gi.v === 0.15 && gi.until === now + SIM.HOUR],
      ['en rad utan styrka kräver den vid anropet', kastar],
      ['tanken bär sin nyckel, och den som såg en björn har inte sett en match', bjornEjFest && q.thoughts[0]?.k === 'sagBjorn'],
      [`en sparad tanke utan nyckel får raden som passar bäst (${gammal}, ${gammalMatch})`, gammal === 'sagBjorn' && gammalMatch === 'sagMatch'],
      [`varje rad säger vad som ger den${utanNar.length ? ` (${utanNar.join(', ')})` : ''}`, utanNar.length === 0],
      ...nyaTankar(),
    ];
  },
};

// de nya tankarna (steg 12.1.131): några av händelserna och lägena prövade direkt
function nyaTankar(): [string, boolean][] {
  const s = SIM.cloneState(testBy(20)), har = (p: SIM.Person, t: string) => p.thoughts.some(x => x.text === t && x.until > s.now);
  const folk = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), [a, b, c] = folk;
  // djuret dör: ägaren
  const d = SIM.nyttTamdjur(s, 'far', a.x, a.y, a.id); SIM.tamDor(s, d, 'alder');
  // kläderna: nya, slitna och fina
  const plagg = (p: SIM.Person) => SIM.tingOf(s).filter(t => t.bar === p.id && !!SIM.kladAv(t.k));
  const ge = (p: SIM.Person) => { if (!plagg(p).length) { const k = SIM.KLADER_AV[0]; const t = SIM.addTool(s, SIM.kladNyckel(k.plagg, k.mat), p); t.bar = p.id; } };
  ge(a); ge(b);
  for (const t of plagg(a)) { t.c = 1; t.q = 4; }
  for (const t of plagg(b)) { t.c = 0.1; t.q = 2; }
  for (const p of [a, b]) p.thoughts = p.thoughts.filter(x => !/kläder/.test(x.text));
  SIM.tankarTimme(s);
  // olyckan: c förlorar allt hen äger
  const varde = () => SIM.formogenheter(s).egen.get(c.id) ?? 0, fore = varde();
  SIM.forlustFore(s, 'brand');
  s.forlustFore!.brand!.v[c.id] = Math.max(SIM.TANKELAGE.forlustMin, fore) * 10; // c ägde tio gånger mer när branden började
  SIM.forlustEfter(s, 'brand');
  const saknas = (['mittDjurDog', 'fickUnge', 'hundFoljer', 'hemlangtan', 'komHem', 'sagStort', 'husetBrann', 'forloradeAllt', 'slackteElden', 'friskIgen', 'fickProtes', 'nyaKlader', 'slitnaKlader', 'finaKlader', 'egetHus', 'soverISang', 'ljusInne', 'sitterPaStol', 'godSkord', 'missvaxt', 'orattvisLag', 'hogSkatt', 'frikandes', 'fickTatuering'] as const).filter(k => !(k in SIM.TANKAR));
  return [
    [`de 24 nya tankarna är rader${saknas.length ? ` (saknas ${saknas.join(', ')})` : ''}`, saknas.length === 0],
    ['ägaren får Mitt djur dog', har(a, 'Mitt djur dog')],
    ['nya och fina kläder ger Nya kläder och Fina kläder', har(a, 'Nya kläder') && har(a, 'Fina kläder') && !har(a, 'Slitna kläder')],
    ['slitna kläder ger Slitna kläder', har(b, 'Slitna kläder') && !har(b, 'Nya kläder')],
    [`den som mist allt i en olycka får Förlorade allt (före ${Math.round(fore)})`, har(c, 'Förlorade allt') && !s.forlustFore],
    ['den som inte förlorat något får den inte', !har(a, 'Förlorade allt')],
  ];
}

SCENARIER.drommar = {
  text: 'Drömmar på morgonen (steg 12.1.132, drommar.ts): den som sover drömmer ur det hen bär på (sorgen, faran, att ha det bra), registret DROMMAR, och den som vaknat har drömmen som tanke',
  kor: () => {
    const bas = testBy(20);
    // en natt i taget: hen sover i åtta timmar och vaknar, tills drömmen kommit (högst 40 nätter)
    const natter = (forbered: (s: SIM.State, p: SIM.Person) => void) => {
      const s = SIM.cloneState(bas), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
      p.thoughts = []; delete p.sorg; forbered(s, p);
      const sov = { ...(p.task ?? {}), act: 'sova', phase: 'do' } as SIM.Task;
      for (let n = 0; n < 40; n++) {
        p.task = sov; for (let h = 0; h < 8; h++) { s.now += SIM.HOUR; SIM.drommar(s, 3600); }
        p.task = undefined; s.now += SIM.HOUR; SIM.drommar(s, 3600);
        const t = p.thoughts.find(x => /^Dröm|mardröm/.test(x.text) && x.until > s.now);
        if (t) return { text: t.text, n: n + 1, kvar: !!p.drom };
      }
      return { text: '', n: 40, kvar: !!p.drom };
    };
    const sorg = natter((s, p) => { p.sorg = [{ namn: 'Ulv', vem: -5, ord: 'sin vän', v: -0.2, dygn: 5, t0: s.now }]; p.health = 0.3; });
    const fara = natter((s, p) => { SIM.tanke(p, 'anfollsVargar', s.now, { v: -0.2, tid: 400 * SIM.HOUR }); p.health = 0.3; });
    const gott = natter((_s, p) => { for (const k of ['hunger', 'rest', 'social', 'health', 'warm', 'torst'] as const) p[k] = 1; p.thoughts = Array.from({ length: 6 }, (_, i) => ({ text: 'Glad ' + i, v: 0.3, until: Infinity })); });
    const inget = natter((_s, p) => { p.health = 0.3; p.hunger = 0.3; });
    return [
      [`den som sörjer drömmer om den döde (${sorg.text}, natt ${sorg.n})`, sorg.text === 'Drömde om Ulv'],
      [`den som nyss varit i fara får en mardröm (${fara.text}, natt ${fara.n})`, fara.text === 'Hade en mardröm'],
      [`den som har det bra drömmer gott (${gott.text}, natt ${gott.n})`, gott.text === 'Drömde något gott'],
      [`den som inte bär på något drömmer inte (${inget.text || 'ingen dröm'} på 40 nätter)`, !inget.text],
      ['drömmen blir en tanke först när hen vaknat, och sedan är den borta', !sorg.kvar && !fara.kvar],
      ['varje dröm i DROMMAR blir en tanke i TANKAR', Object.values(SIM.DROMMAR).every(d => d.tanke in SIM.TANKAR)],
    ];
  },
};

SCENARIER.uppvaxt2 = {
  text: 'Nya upplevelser i uppväxten (steg 12.1.133, UPPLEVELSER i uppvaxt.ts): tio rader för barn ur de nya systemen, var och en med flera utfall, som fastnar när barnet är med om saken',
  kor: () => {
    const NYA = ['djur', 'resaBarn', 'rovareBort', 'rovarePlundring', 'epidemi', 'foralderDomd', 'foralderSop', 'fester', 'lasaBarn', 'faltet'] as const;
    const rader = NYA.filter(k => k in SIM.UPPLEVELSER && SIM.UPPLEVELSER[k].vem === 'barn' && (SIM.UPPLEVELSER[k].e.length >= 2 || ((SIM.UPPLEVELSER[k] as { rus?: number[] }).rus?.length ?? 0) >= 2));
    const s = SIM.cloneState(testBy(20, b => SIM.living(b).some(c => SIM.ageOf(c, b.now) >= SIM.UPPV.fran && SIM.ageOf(c, b.now) < SIM.UPPV.alder && SIM.living(b).some(q => SIM.isParent(q, c)))));
    const barn = SIM.living(s).find(c => SIM.ageOf(c, s.now) >= SIM.UPPV.fran && SIM.ageOf(c, s.now) < SIM.UPPV.alder && SIM.living(s).some(q => SIM.isParent(q, c)))!;
    const far = SIM.living(s).find(q => SIM.isParent(q, barn))!, vuxen = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && q !== far)!;
    const har = (p: SIM.Person, k: string) => !!p.upp?.some(u => u.k === k);
    let epi = false;
    medTal(SIM.UPPLEVELSER, 'chans', 1, () => {
      barn.upp = []; SIM.allaBarn(s, 'epidemi'); epi = har(barn, 'epidemi') && !har(vuxen, 'epidemi'); barn.upp = [];
      barn.x = far.x; barn.y = far.y; barn.task = undefined; SIM.supa(s, far);
      barn.task = { act: 'odla', phase: 'do', tx: barn.x, ty: barn.y, until: s.now + SIM.HOUR } as SIM.Task; SIM.stepUppvaxt(s);
    });
    return [
      [`tio nya rader för barn med flera utfall (${rader.length})`, rader.length === NYA.length],
      ['barnet var med om epidemin, den vuxne får den inte', epi],
      [`barnet såg ${far.name} supa`, har(barn, 'foralderSop') && barn.upp!.find(u => u.k === 'foralderSop')!.om === far.name],
      ['barnet hjälpte till på fältet', har(barn, 'faltet')],
      [`upplevelserna formar barnet (${(barn.upp ?? []).map(u => u.k).join(', ')})`, (barn.upp ?? []).some(u => NYA.includes(u.k as typeof NYA[number]) && Object.keys(u.e).length > 0)],
    ];
  },
};

SCENARIER.rykten2 = {
  text: 'Nya rykten med binamn (steg 12.1.134, rykten.ts och berattelser.ts): femton nya intryck i INTRYCK med sina händelser i HANDELSER och fyra binamn var i BINAMN, och den som flyr från rövarna får intrycket feg',
  kor: async () => {
    const { hasIcon } = await import('../../ikoner');
    const NYA = ['forsvarare', 'botare', 'daligLakare', 'scenBra', 'scenDalig', 'skrivkunnig', 'from', 'gudlos', 'suput', 'lurendrejare', 'hederlig', 'vittberest', 'brandslackare', 'djurvan', 'fangelsekund'] as const;
    const utan = NYA.filter(k => !(k in SIM.INTRYCK));
    const binamn = NYA.filter(k => k in SIM.BINAMN && SIM.BINAMN[k].namn.length === 4 && SIM.BINAMN[k].namn.every(([m, k2]) => !!m && !!k2));
    const handelse = NYA.filter(k => Object.values(SIM.HANDELSER).some(h => h.i === k));
    const ikon = NYA.filter(k => hasIcon('i_' + k));
    // vittnena: den som stod kvar mot rövarna och den som sprang
    const s = SIM.cloneState(testBy(20)), [a, b, v] = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    for (const p of [a, b]) { p.x = v.x + 1; p.y = v.y; }
    v.task = undefined; v.intryck = []; // (vittnet minns bara de starkaste intrycken)
    SIM.handelse(s, a, 'forsvarade'); SIM.handelse(s, b, 'sprang');
    const om = (p: SIM.Person, k: SIM.IntryckTyp) => !!SIM.intryckOm(v, p.id, k);
    return [
      [`femton nya intryck${utan.length ? ` (saknas ${utan.join(', ')})` : ''}`, utan.length === 0],
      [`fyra binamn i mannens och kvinnans form för varje (${binamn.length})`, binamn.length === NYA.length],
      [`en händelse som ger varje (${handelse.length})`, handelse.length === NYA.length],
      [`en symbol för varje (${ikon.length})`, ikon.length === NYA.length],
      ['vittnet ser försvararen', om(a, 'forsvarare') && !om(a, 'feg')],
      ['den som sprang när rövarna kom får intrycket feg', SIM.HANDELSER.sprang.i === 'feg' && om(b, 'feg')],
    ];
  },
};

SCENARIER.mallar = {
  text: 'Nya berättelsemallar (steg 12.1.135, BERATTELSER i berattelser.ts): tio mallar med minst åtta varianter var för krönikan, skrivna när händelsen sker, med en kategori i krönikan; beskrivningen och eftermälet använder samma mallar för det personen var med om, och texterna drar inte ur spelets slump',
  kor: () => {
    const NYA = ['k_rovare', 'k_brand', 'k_tornado', 'k_flod', 'k_epidemi', 'k_tro', 'k_resa', 'k_handel', 'k_djur', 'k_ratt'] as const;
    const by = (v: SIM.Variant) => typeof v === 'string' || v.om({});
    const fa = NYA.filter(k => !(k in SIM.BERATTELSER) || SIM.BERATTELSER[k].filter(by).length + SIM.BERATTELSER[k].filter(v => typeof v !== 'string' && !v.om({}) && !v.om({ person: true })).length < 8);
    const utanKat = NYA.filter(k => !SIM.kronikaKat(k));
    const s = SIM.cloneState(testBy(20)), rader = () => s.hist?.kronika ?? [];
    const slump = JSON.stringify(s.rngs ?? {});
    // djuret dör, smittan tar slut
    const n0 = rader().length, p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && !(s.tron ?? []).some(t => t.grundare === q.id))!; // den som grundat en tro får tron i eftermälet
    const d = SIM.nyttTamdjur(s, 'far', p.x, p.y, p.id); SIM.tamDor(s, d, 'alder');
    for (const q of SIM.living(s)) delete q.sjuk;
    s.epidemi = { k: 'magsjuka', ids: [p.id, -1, -2], skriven: 1 }; SIM.smittaTimme(s);
    const nya = rader().slice(n0), djur = nya.find(r => r[2] === 'k_djur'), epi = nya.find(r => r[2] === 'k_epidemi');
    // personen som var med om branden
    p.upp = [...p.upp ?? [], { k: 'brand', a: 20, e: {} }];
    p.died = s.now; p.cause = 'av ålder'; // eftermälet tar alltid med det hen var med om
    const besk = SIM.beskrivning(s, p), personText = SIM.BERATTELSER.k_brand.filter(v => typeof v !== 'string' && v.om({ person: true })).map(v => (v as { t: string }).t.replace(/^\{\w+\} /, '').replace(/\.$/, '')); // utan namnet först, som texten kan byta mot han eller hon
    return [
      [`tio mallar med minst åtta varianter var för krönikan${fa.length ? ` (för få: ${fa.join(', ')})` : ''}`, fa.length === 0],
      [`varje mall har en kategori i krönikan${utanKat.length ? ` (saknas ${utanKat.join(', ')})` : ''}`, utanKat.length === 0],
      [`ett djur som dör står i krönikan (${djur?.[1] ?? 'ingen rad'})`, !!djur && !djur[1].includes('{')],
      [`smittan som tagit slut står i krönikan (${epi?.[1] ?? 'ingen rad'})`, !!epi && !epi[1].includes('{') && !s.epidemi],
      [`eftermälet säger att ${p.name} var med om branden`, personText.some(t => besk.includes(t))],
      ['texterna drar inte ur spelets slump', JSON.stringify(s.rngs ?? {}) === slump],
    ];
  },
};

SCENARIER.amnen2 = {
  text: 'Nya samtalsämnen (steg 12.1.136, AMNEN i berattelser.ts): åtta ämnen (djur, sjukdom, strid, tro, skörd, fest, lagar och resor) som kommer upp när någon av de två nyss varit med om saken, med sina texter i personrutan',
  kor: async () => {
    const { hasIcon } = await import('../../ikoner');
    const NYA = ['djur', 'sjukdom', 'strid', 'tro', 'skord', 'fest', 'lagar', 'resor'] as const;
    const fa = NYA.filter(k => !(k in SIM.AMNEN) || !(`p_${k}` in SIM.BERATTELSER) || SIM.BERATTELSER[`p_${k}` as SIM.MallId].length < 8 || !hasIcon(SIM.AMNEN[k].ikon ?? ''));
    const s = SIM.cloneState(testBy(20)), [a, b] = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen && !p.gast);
    const amnen = (forbered: () => void) => {
      for (const p of [a, b]) { p.thoughts = []; delete p.sjuk; }
      forbered();
      const ut = new Map<string, string | undefined>(), t0 = s.now;
      for (let m = 0; m < 300; m++) { s.now = t0 + m * SIM.MIN; SIM.samtalBorjar(); const x = SIM.samtalAmne(s, a, b, 'prat'); ut.set(x.k, x.o); }
      s.now = t0;
      return ut;
    };
    const strid = amnen(() => SIM.tanke(a, 'vannSlagsmal', s.now, { namn: 'Ulv', v: 0.1, tid: SIM.DAY }));
    const sjuk = amnen(() => { b.sjuk = { k: 'forkylning', t0: s.now, tecken: 1, grad: 0.5, mot: 0, r: 0.5 }; });
    const fest = amnen(() => SIM.tanke(b, 'gastabud', s.now, { v: 0.1 }));
    const inget = amnen(() => undefined);
    const text = (() => { a.prat = { m: b.id, k: 'sjukdom', o: 'förkylning', t: s.now }; return SIM.pratText(s, a); })();
    return [
      [`åtta nya ämnen med minst åtta texter och en symbol var${fa.length ? ` (saknas: ${fa.join(', ')})` : ''}`, fa.length === 0],
      ['den som nyss slagits pratar om striden', strid.has('strid') && !inget.has('strid')],
      [`den som är sjuk pratar om sjukdomen (${sjuk.get('sjukdom') ?? 'inget'})`, sjuk.get('sjukdom') === 'förkylning'],
      ['den som varit på gästabudet pratar om festen', fest.has('fest') && !inget.has('fest')],
      [`texten i personrutan (${text})`, !!text && !text.includes('{')],
      ['det farliga går före vardagen', SIM.AMNEN.strid.prio > SIM.AMNEN.vardag.prio && SIM.AMNEN.sjukdom.prio > SIM.AMNEN.mat.prio],
    ];
  },
};

SCENARIER.gudlos = {
  text: 'Gudlös av att hålla sig borta från tron (steg 12.1.173, gudlosDygn i rykten.ts): en gång om dygnet får den som aldrig är med på byns böner och ritualer intrycket gudlös hos dem som ser hen, när de andra i byn tror; i en by utan tro får ingen det',
  kor: () => {
    const prov = (medTro: boolean) => {
      const s = SIM.cloneState(testBy(20)), vuxna = SIM.living(s).filter(p => !p.gast && SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), [borta, ...andra] = vuxna;
      for (const p of vuxna) { p.intryck = []; delete p.gjort; p.x = vuxna[0].x; p.y = vuxna[0].y; p.task = undefined; p.tro = medTro ? 1 : undefined; }
      borta.tro = undefined;
      for (const p of andra) SIM.gjort(s, p, 'tro', 2);
      SIM.gudlosDygn(s);
      return { borta, andra, s };
    };
    const a = prov(true), b = prov(false);
    const ser = (x: typeof a, p: SIM.Person) => x.andra.filter(q => SIM.intryckOm(q, p.id, 'gudlos')).length;
    return [
      [`den som aldrig är med ses som gudlös (${ser(a, a.borta)} av ${a.andra.length})`, ser(a, a.borta) > 0],
      ['de som är med ses inte som gudlösa', a.andra.every(p => ser(a, p) === 0)],
      ['i en by utan tro får ingen intrycket', ser(b, b.borta) === 0],
    ];
  },
};

SCENARIER.ruslust = {
  text: 'Lusten till rus (steg 12.1.175, rusLust i rus.ts): chansen att ta en dryck på kvällen är gånger lusten ur humöret, vanan, byns seder och uppväxten; en ledsen person med vana dricker oftare än en glad utan, och Såg en förälder supa ger ett plus eller minus på lusten i stället för egenskaper',
  kor: () => {
    const s = SIM.cloneState(testBy(20)), [ledsen, glad] = SIM.living(s).filter(p => !p.gast && SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    ledsen.thoughts = [{ text: 'Mår uselt', v: -0.8, until: Infinity }]; ledsen.supit = SIM.RUS.vanaFull;
    glad.thoughts = Array.from({ length: 5 }, (_, i) => ({ text: 'Glad ' + i, v: 0.3, until: Infinity })); glad.supit = 0;
    for (const p of [ledsen, glad]) { p.upp = (p.upp ?? []).filter(u => !u.rus); }
    const t0 = new Date(s.now).setHours(21, 0, 0, 0);
    s.now = t0;
    const nL = SIM.kvallsVikt(s, ledsen), nG = SIM.kvallsVikt(s, glad); // vikten för drycken i kvällens dragning (steg 13.8.8)
    // uppväxten: plus eller minus på lusten, inga egenskaper
    const ung = (b: SIM.State) => SIM.living(b).find(c => SIM.ageOf(c, b.now) >= SIM.UPPV.fran && SIM.ageOf(c, b.now) < SIM.UPPV.alder);
    const sb = SIM.cloneState(testBy(20, b => !!ung(b))), barn = ung(sb);
    let u: SIM.Upplevelse | undefined;
    if (barn) { barn.upp = []; medTal(SIM.UPPLEVELSER, 'chans', 1, () => SIM.upplev(sb, barn, 'foralderSop', 'Ulv')); u = barn.upp.find(x => x.k === 'foralderSop'); }
    const fore = SIM.rusLust(s, glad); glad.upp = [...glad.upp ?? [], { k: 'foralderSop', a: 8, e: {}, rus: 2 }]; const efter = SIM.rusLust(s, glad);
    return [
      [`en ledsen med vana dricker oftare än en glad utan (vikten ${nL.toFixed(2)} mot ${nG.toFixed(2)})`, nL > nG * 1.5],
      [`lusten: ledsen ${SIM.rusLust(s, ledsen).toFixed(2)}, glad ${fore.toFixed(2)}`, SIM.rusLust(s, ledsen) > 1 && fore < 1],
      [`Såg en förälder supa ändrar lusten (${u?.rus ?? '–'}) och inga egenskaper`, !!u && Math.abs(u.rus ?? 0) === 2 && Object.keys(u.e).length === 0],
      ['plus på lusten ur uppväxten gör lusten större', efter > fore],
    ];
  },
};
