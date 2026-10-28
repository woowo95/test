// Scenarier. Byns projekt (steg 2.2.7): byn väljer vad den bygger och gör efter vad den saknar.
import { createState, living, ageOf, ALDER, chooseTask, dangers, GORS, STATION_LIST, PROJEKT, projekt, bastaProjekt, projektVarde, addTool, setAmount, State } from '../../sim';
import { START } from '../kor';
import { setItems, setFood, SCENARIER, medBank } from './hjalp';

// en by där alla vuxna kan allt, med material till allt och elden tänd mitt på dagen
function by(seed: number) {
  const s = createState(seed, START);
  s.now = new Date(s.now).setHours(10, 0, 0, 0); Object.assign(s.fire, { lit: true, fuel: 3, ring: true });
  for (const q of s.people) q.tek = { ...q.tek, kniv: 1, korg: 1, rep: 1, yxa: 1, fiskespjut: 1 };
  setItems(s, { flinta: 6, torrgras: 30, grenar: 30 }); setAmount(s, 'ved', 300);
  return s;
}
const vuxna = (s: State) => living(s).filter(q => ageOf(q, s.now) >= ALDER.vuxen);
// de vuxna väljer på dagen n gånger, utan egna behov; räknar hur ofta ett projekt blir valt som arbete (inte på fritiden)
function valjer(s: State, n: number) {
  const acts = new Set([...Object.keys(GORS), 'station', 'tvinna']);
  let proj = 0;
  for (let i = 0; i < n; i++) {
    const p = vuxna(s)[i % vuxna(s).length];
    Object.assign(p, { toa: 1, torst: 1, warm: 1, rest: 1, health: 1, hunger: 1, social: 1, task: undefined });
    chooseTask(s, p); if (p.task && acts.has(p.task.act) && p.task.why?.startsWith('Byn saknar')) proj++;
    p.task = undefined;
  }
  return proj;
}

SCENARIER.projekt = {
  text: 'Allt byn kan bygga eller göra av handarbete står i ett register med vad det väger och vad det kostar. Det byn saknar mest per arbete och material görs först, och tävlar med arbetet när ingen fara går före',
  kor: () => {
    const allt = Object.keys(GORS).every(g => PROJEKT[g]) && STATION_LIST.every(k => PROJEKT[k]) && !!PROJEKT.rep;
    const s = by(4), lista = projekt(s);
    const sorterad = lista.every((r, i) => i === 0 || lista[i - 1].varde >= r.varde);
    const p = vuxna(s)[0], b = bastaProjekt(s, p, dangers(s));
    const forsta = lista.find(r => PROJEKT[r.k].kan(s, p, dangers(s)));
    // har byn knivar nog saknar den inga
    const knivFore = projektVarde(s, 'kniv');
    for (let i = 0; i < 4; i++) addTool(s, 'kniv', p);
    const knivEfter = projektVarde(s, 'kniv'), ejListad = !projekt(s).some(r => r.k === 'kniv');
    // har byn slaktbänken saknar den ingen
    medBank(s, 'slaktbank');
    const bank = projektVarde(s, 'slaktbank') === 0;
    // på dagen tävlar projekten med arbetet när maten räcker, men inte när byn svälter eller fryser
    const m = by(5); setFood(m, 200);
    const mett = valjer(m, 200);
    const h = by(5); setFood(h, 0.1);
    const svalt = valjer(h, 200);
    const k = by(5); setFood(k, 200); Object.assign(k.fire, { lit: false, fuel: 0, emberUntil: undefined });
    for (const q of k.people) q.warm = 0.1; // alla fryser och elden är släckt: kylan är en fara
    const kyla = dangers(k).kyla, iKyla = bastaProjekt(k, vuxna(k)[0], dangers(k));
    const bara = !iKyla || iKyla.u.act === 'tvinna';
    return [
      ['varje redskap, varje station och repet är ett projekt', allt],
      [`listan har det mest värda först (${lista.map(r => r.d.namn).join(', ')})`, lista.length >= 3 && sorterad],
      [`den som har tid gör det mest värda hen kan (${b?.k ?? 'inget'})`, !!b && b.k === forsta?.k],
      [`när byn har knivar nog saknar den ingen (${knivFore.toFixed(2)} → ${knivEfter.toFixed(2)})`, knivFore > 0 && knivEfter === 0 && ejListad],
      ['när byn har en slaktbänk står den inte längre bland projekten', bank],
      [`på dagen görs projekt när maten räcker (${mett} av 200), inte när byn svälter (${svalt})`, mett > 0 && svalt === 0],
      [`när kylan är en fara görs inga redskap eller stationer (${iKyla?.k ?? 'inget'})`, kyla && bara],
    ];
  },
};
