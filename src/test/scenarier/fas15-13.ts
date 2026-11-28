// Scenarier för fas 15, grupp 13 (steg 15.1.121–15.1.128).
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER, klockan, nyInvanare } from './hjalp';

// en by med tio vuxna vars läggning i seden k står långt ut åt hållet rikt, och byns sed i taget
function taketsBy(seed: number, k: SIM.Sed, rikt: number, pot: Partial<SIM.Person['pot']>) {
  const s = SIM.createState(seed, START); klockan(s, 12);
  while (SIM.living(s).length < 10) nyInvanare(s, SIM.living(s).length % 2 ? 'm' : 'k', 30);
  for (const p of SIM.living(s)) { Object.assign(p.pot, pot); p.sedArv = { [k]: rikt }; }
  s.seder.v[k] = rikt; s.seder.at = s.now;
  return s;
}
const vuxenUpp = (s: SIM.State, p: SIM.Person, k: SIM.UpplevelseTyp) => { (p.upp ??= []).push({ k, a: Math.floor(SIM.ageOf(p, s.now)), e: {}, v: 1, t: s.now }); };
const lev = (s: SIM.State, dygn: number) => { for (let i = 0; i < dygn * 4; i++) { s.now += SIM.DAY / 4; SIM.stepSeder(s); } };

SCENARIER.sedrorelse = {
  text: 'Steg 15.1.121: läggningen har en gräns per person, och det man varit med om ligger utanför den. En by vars sed Självförsörjning står i taget flyttar sig mot Sammanhållning när flera i byn ser någon frysa ihjäl medan andra har ved, och en by utan följderna står kvar',
  kor: () => {
    const k: SIM.Sed = 'gemenskap', pot = { empati: 1 };
    const utan = taketsBy(21, k, -1, pot), med = taketsBy(21, k, -1, pot);
    const p0 = SIM.living(med)[0]!, lagg = SIM.drarSed(med, p0, k);
    for (const p of SIM.living(med)) vuxenUpp(med, p, 'frosIhjal');
    const efterUpp = SIM.drarSed(med, p0, k), mal = SIM.sederTarget(med)[k], malUtan = SIM.sederTarget(utan)[k];
    lev(utan, 6); lev(med, 6);
    return [
      [`seden ${k} är öppen`, SIM.sedOppen(med, k)],
      [`läggningen stannar vid gränsen (${lagg.toFixed(2)}) fast personligheten och byns sed drar längre`, lagg === -1],
      [`upplevelsen ligger utanför gränsen (${efterUpp.toFixed(2)})`, efterUpp > -1 + 0.15],
      [`byns mål flyttar sig från taket med följderna (${mal.toFixed(2)}) men inte utan (${malUtan.toFixed(2)})`, mal > -0.95 && malUtan === -1],
      [`efter sex dygn har seden rört sig mot Sammanhållning (${med.seder.v[k].toFixed(2)}), och utan följderna står den kvar (${utan.seder.v[k].toFixed(2)})`, med.seder.v[k] > -0.95 && utan.seder.v[k] <= -0.99],
    ];
  },
};

// byns första vuxna leder byn, och seden k är öppen
const oppna = (s: SIM.State, k: SIM.Sed) => { const l = SIM.living(s)[0]!; s.styre = { historia: [{ id: l.id, namn: l.name, titel: 'Ålderman', fran: s.now }], oppna: [k], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1 } as never; };

SCENARIER.foljder2 = {
  text: 'Steg 15.1.123: följderna minns. Var och en minns varje följd, en gång per händelse och inte en gång per livsdel. En krigisk by som mister tre i strid i rad drar seden Krig tydligt mot Fred, och efter 15 dygn (15 år i spelet) har följden bleknat',
  kor: () => {
    const k: SIM.Sed = 'krig', pot = { aggression: 20, mod: 20, empati: 1 };
    const s = taketsBy(23, k, 1, pot); oppna(s, k);
    while (SIM.living(s).length < 14) nyInvanare(s, SIM.living(s).length % 2 ? 'm' : 'k', 30);
    for (const p of SIM.living(s)) { Object.assign(p.pot, pot); p.sedArv = { [k]: 1 }; }
    const mal0 = SIM.sederTarget(s)[k], v0 = s.seder.v[k];
    for (let i = 0; i < 3; i++) SIM.die(s, SIM.living(s).at(-1)!, 'rovare');
    const kvar = SIM.living(s), f = (p: SIM.Person) => p.foljd?.v[k] ?? 0;
    const flera = kvar.filter(p => f(p) < -0.25).length, mal1 = SIM.sederTarget(s)[k], snitt = kvar.reduce((a, p) => a + SIM.drarSed(s, p, k), 0) / kvar.length;
    const fNu = () => kvar.reduce((a, p) => a + (p.foljd ? f(p) * Math.exp(-(s.now - p.foljd.t) / (SIM.SED.foljdDygn * SIM.DAY)) : 0), 0) / kvar.length;
    const f0 = fNu();
    lev(s, 6); const v6 = s.seder.v[k];
    lev(s, 9); const f15 = fNu(), mal15 = SIM.sederTarget(s)[k];
    // en död i strid utan ett stridslag (drap) är också en följd
    const s2 = taketsBy(24, k, 1, pot); oppna(s2, k); SIM.die(s2, SIM.living(s2).at(-1)!, 'drap');
    const drap = SIM.living(s2).filter(p => (p.foljd?.v[k] ?? 0) < 0).length;
    return [
      [`${flera} av ${kvar.length} minns mer än en av de tre (följden fastnar en gång per händelse)`, flera >= 2],
      [`byns mål för Krig flyttas tydligt (${mal0.toFixed(2)} → ${mal1.toFixed(2)}; läggningen och följderna i snitt ${snitt.toFixed(2)})`, mal1 < mal0 - 0.15],
      [`seden har rört sig mot Fred efter sex dygn (${v0.toFixed(2)} → ${v6.toFixed(2)})`, v6 < v0 - 0.05],
      [`efter 15 dygn har följden bleknat (${f0.toFixed(2)} → ${f15.toFixed(2)} i snitt), och målet går tillbaka mot det första (${mal1.toFixed(2)} → ${mal15.toFixed(2)})`, Math.abs(f15) < Math.abs(f0) * 0.45 && mal15 > mal1 + 0.1],
      [`den som dör av drap i en strid ger också följden stupade (${drap} minns)`, drap > 0],
    ];
  },
};
