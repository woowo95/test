// Scenarier för fas 15, grupp 12 (texterna, steg 15.1.114–15.1.120).
import * as SIM from '../../sim';
import { BERATTELSER, Fyllning, MallId, bedrifter, beskrivning, fyll } from '../../sim/berattelser';
import { SCENARIER, testBy } from './hjalp';

// varianterna i en mall som gäller med fälten f
const giltiga = (m: MallId, f: Fyllning) => BERATTELSER[m].filter(v => typeof v === 'string' || v.om(f)).map(v => fyll(typeof v === 'string' ? v : v.t, f));

SCENARIER.persontext = {
  text: 'Steg 15.1.114: texterna om personen. Sportens titel är en titel och ingen bedrift, en upplevelse som varar en tid står inte som en stund, ärkefienden som inte hatar tillbaka kallas inte ovän åt båda håll, och det vackras verkan skrivs',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
    p.fame.push('Den bästa i kast mot mål');
    const minne = giltiga('besk_minne', { hen: 'hon', Hen: 'Hon', honom: 'henne', hans: 'hennes', vid: 3, minne: 'levde i överflöd', varaktig: true });
    const fiende = giltiga('besk_fiende', { hen: 'hon', Hen: 'Hon', honom: 'henne', hans: 'hennes', fiende: 'Ask', omsesidig: false });
    const vacker = giltiga('besk_vacker', { namn: 'Ylva', hen: 'hon', honom: 'henne', del: 'mörka ögon', verkan: 'och den som möter dem glömmer vad den skulle säga' });
    const hed = giltiga('hedersnamn', { namn: 'Ylva', hen: 'hon', Hen: 'Hon', honom: 'henne', binamn: 'den kloka', helt: 'Ylva den kloka', skal: 'kom på hur man kan odla', tillst: false, barn: 0, kallt: false });
    const besk = beskrivning(s, p);
    return [
      ['sportens titel räknas inte som en bedrift', !bedrifter(p).some(x => x.startsWith('Den bästa i'))],
      [`en upplevelse som varar säger inte "var 3 år när" (${minne.length} varianter)`, minne.length > 0 && minne.every(t => !/var 3 år när|hände när/.test(t))],
      ['ärkefienden som inte hatar tillbaka kallas inte ovänner', fiende.length > 0 && fiende.every(t => !/är ovänner|är osams/.test(t))],
      ['det vackras verkan står i någon variant', vacker.some(t => t.includes('glömmer vad den skulle säga'))],
      ['barnen ropar inget när byn saknar barn', hed.every(t => !/Barnen/.test(t))],
      [`beskrivningen skrivs (${besk.slice(0, 80)}…)`, besk.length > 20 && !/undefined|\{/.test(besk)],
    ];
  },
};

SCENARIER.handelsetext = {
  text: 'Steg 15.1.115: texterna om händelserna i byn. Elden nämns bara när den brinner, den som dog vid elden "kom" inte "aldrig tillbaka", modern som dör i barnsäng håller inte barnet hela natten, en ensam jägare är ingen "de" och resan har inget eget verb i dödsorsaken',
  kor: () => {
    const bas = { namn: 'Ylva', helt: 'Ylva', hen: 'hon', Hen: 'Hon', honom: 'henne', hans: 'hennes', orsak: 'av kyla', alder: 'tre', natt: true, eld: false };
    const dog = giltiga('k_dog', { ...bas, nar: 'när hon lade ved på elden', orsakId: 'olycka' });
    const fodd = giltiga('k_fodd', { namn: 'Ask', barnet: 'son', mor: 'Ylva', foraldrar: 'Ylva och Bo', morDor: true, kallt: true, eld: false });
    const bjorn = giltiga('k_bjornjakt', { folk: 'Bo', de: 'han', De: 'Han', arstid: 'hösten', svara: '' });
    const ratt = giltiga('r_ratt', { ledare: 'Bo', namn: 'Ylva', hen: 'hon', honom: 'henne', straff: 'tillrättavisade', brott: 'tog bär', eld: false });
    return [
      ['elden brann lågt står inte när elden är släckt', dog.every(t => !/Elden brann/.test(t))],
      ['den som dog vid elden kom inte "aldrig tillbaka"', dog.every(t => !/aldrig tillbaka/.test(t))],
      ['modern som dör håller inte barnet hela natten, och ingen samlas kring en släckt eld', fodd.every(t => !/famnen|kring elden/.test(t))],
      ['en ensam björnjägare kallas inte de', bjorn.every(t => !/\b[Dd]e (fällde|orkade)/.test(t))],
      ['tinget samlas inte vid en släckt eld', ratt.every(t => !/vid elden|till elden/.test(t))],
      ['den försvunna dog "på en resa", utan "kom aldrig hem"', SIM.DODSORSAKER.forsvunnen.text === 'på en resa'],
    ];
  },
};
