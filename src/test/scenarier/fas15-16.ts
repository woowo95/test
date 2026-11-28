// Scenarier för fas 15, grupp 16 (steg 15.1.151–15.1.160).
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, testBy } from './hjalp';

// en vuxen i en ny by, utan något på sig (det som bärs läggs till i scenariot)
function vuxenUtanSaker(s: SIM.State) {
  const p = SIM.living(s).find(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen)!;
  for (const t of SIM.allaTing(s)) if (t.agare === p.id || t.bar === p.id || t.hos === p.id) { t.agare = -1; t.bar = undefined; t.hos = undefined; }
  return p;
}

SCENARIER.stridsvarde = {
  text: 'Steg 15.1.151: stridsvärdet ur kroppen och det man bär. En bybo med svärd och brynja har högre värde än samma bybo med kniv, och en stark högre än en svag med samma vapen',
  kor: () => {
    const s = SIM.createState(6, START), p = vuxenUtanSaker(s);
    const hand = SIM.stridsvarde(s, p);
    const kniv = SIM.newTing(s, 'kniv', 1, p.id);
    const medKniv = SIM.stridsvarde(s, p);
    kniv.agare = -1;
    SIM.newTing(s, 'svard', 1, p.id); const br = SIM.newTing(s, 'ringbrynja_jarn', 1, p.id); br.bar = p.id;
    const rustad = SIM.stridsvarde(s, p);
    const st0 = p.pot.styrka;
    p.pot.styrka = 16; const stark = SIM.stridsvarde(s, p);
    p.pot.styrka = 5; const svag = SIM.stridsvarde(s, p);
    p.pot.styrka = st0;
    const mitt = SIM.stridsvardeAv({ st: SIM.MITTKROPP, vapen: 'hand', klader: [] });
    return [
      [`kniven ger mer än händerna (${SIM.kortTal(medKniv)} mot ${SIM.kortTal(hand)})`, medKniv > hand],
      [`svärd och brynja ger mer än kniven (${SIM.kortTal(rustad)} mot ${SIM.kortTal(medKniv)})`, rustad > medKniv * 1.5],
      [`en stark har högre värde än en svag med samma svärd och brynja (${SIM.kortTal(stark)} mot ${SIM.kortTal(svag)})`, stark > svag * 1.5],
      [`en vuxen med mittersta kropp och händerna har ett värde kring 6 (${SIM.kortTal(mitt)})`, mitt > 4 && mitt < 8],
    ];
  },
};

SCENARIER.radstyrka = {
  text: 'Steg 15.1.152: världen räknar i stridsvärde. Mot samma mål skickar en by med järnvapen färre anfallare än en by med stenredskap, med samma vinstchans, och huvudbyns rad har de vuxnas stridsvärden',
  kor: () => {
    const s = SIM.cloneState(testBy(10)), vl = s.varld!;
    const r = vl.rader!.find(x => SIM.lever(vl, x) && x.sort === 'by' && SIM.radGrannar(vl, x).some(g => g.nr !== vl.huvud))!;
    const mot = SIM.radGrannar(vl, r).find(g => g.nr !== vl.huvud)!;
    mot.tal.folk = 40; mot.tal.styrka = 30; mot.tal.kraft = 0; mot.tal.mat = 0;
    const varor = SIM.radVaror(mot) as Record<string, number>; for (const g in varor) varor[g] = 0; // inget att bära hem: storleken är styrkan som behövs
    const rik = (tek: string[]): SIM.VarldRad => ({ ...r, tek, tal: { ...r.tal, folk: 400, styrka: 300, kraft: 0, rikedom: 400 * 600 } });
    const jarn = rik(SIM.TEKNIK.map(t => t.id)), sten = rik(['kniv', 'yxa', 'fiskespjut']);
    const nJ = SIM.flockStorlek(jarn, 0, mot), nS = SIM.flockStorlek(sten, 0, mot), pJ = SIM.vinstChans(jarn, mot, nJ), pS = SIM.vinstChans(sten, mot, nS);
    const uJ = SIM.radUtrustning(jarn), uS = SIM.radUtrustning(sten);
    SIM.skrivHuvudRad(s);
    const h = SIM.radNr(vl, vl.huvud)!, summa = Math.round(SIM.living(s).filter(p => SIM.vuxenKan(s, p)).reduce((a, p) => a + SIM.stridsvarde(s, p), 0));
    const proc = (p: number) => `${Math.round(100 * p)} %`;
    return [
      [`järnbyn bär ${uJ.vapen} och ${uJ.klader.join(', ') || 'inget skydd'}${uJ.skold ? ' och sköld' : ''}; stenbyn ${uS.vapen} och ${uS.klader.join(', ') || 'inget skydd'}`, ['svard', 'jarnyxa', 'jarnspjut'].includes(uJ.vapen) && !['svard', 'jarnyxa', 'jarnspjut'].includes(uS.vapen)],
      [`värdet per person är högre i järnbyn (${SIM.kortTal(SIM.radVarde(jarn))} mot ${SIM.kortTal(SIM.radVarde(sten))})`, SIM.radVarde(jarn) > SIM.radVarde(sten) * 1.5],
      [`järnbyn skickar färre än stenbyn mot samma mål (${nJ} mot ${nS})`, nJ < nS && nJ >= SIM.BYANFALL.minst],
      [`med samma vinstchans (${proc(pJ)} mot ${proc(pS)})`, Math.abs(pJ - pS) < 0.08],
      [`huvudbyns rad har de vuxnas stridsvärden (${h.tal.kraft}, summan ${summa}) och styrkan är antalet (${h.tal.styrka})`, h.tal.kraft === summa && h.tal.kraft > h.tal.styrka],
    ];
  },
};
