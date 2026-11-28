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
