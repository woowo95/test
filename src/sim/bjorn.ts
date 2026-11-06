// Björnen möter folk (steg 6.6.5). Björnen själv och ungarna går sin väg ur kartan och klockan (bjornarOf i djur.ts); här
// avgörs vad som händer när någon kommer nära den. Den anfaller sällan: oftast blir man rädd och går därifrån. Men den som
// överraskar den på nära håll, och mest den som kommer nära ungarna, kan bli anfallen, och en björn slår hårt.
// Var och en möter björnen högst en gång per år (s.bjornMott), så att samma möte inte slås om varje slag
import { balans } from './balans';
import { kronikaBer, och } from './berattelser';
import { blodas } from './blod';
import { roomAt } from './byggnad';
import { BJORN_STRID, bjornarOf, dodaDjur, halsaOf, satDjurHalsa } from './djur';
import { count, living, log, ovning, think } from './folk';
import { yearNo } from './tid';
import { skada } from './halsa';
import { avbryt } from './lager';
import { die } from './liv';
import { notis } from './notiser';
import { rnd } from './slump';
import { SLAGSMAL, Uppstallning, foljet, nyStrid, personKampe, slitKastat, sparaStrid, stridTillSlut, svartSkadad, vadretIStriden } from './strid';
import { HOUR, Person, SEC, State } from './typer';

export const BJORNMOTE = balans('bjornmote', {
  nara: 2.5, // så nära (rutor) man ska komma björnen för att överraska den ...
  naraUngar: 4, // ... och så nära när den har ungar med sig
  anfall: 0.1, // så ofta anfaller den den som överraskar den ...
  anfallUngar: 0.35, // ... och så ofta när den har ungar
  rädd: 0.25, // så mycket sämre humör den får som ser björnen på nära håll
  räddTim: 6, // i så många timmar
  med: 2.5, // de som är så här nära (rutor) den som anfalls slåss med
});

const vaken = (p: Person) => p.task?.act !== 'sova';

// varje slag (steg.ts): den som är vaken, ute och kommer nära björnen möter den
export function bjornSteg(s: State) {
  const alla = bjornarOf(s);
  const b = alla.find(d => d.art === 'bjorn');
  if (!b) return;
  const ungar = alla.filter(d => d.art === 'bjornunge'), R = ungar.length ? BJORNMOTE.naraUngar : BJORNMOTE.nara;
  const ar = yearNo(s, s.now);
  if (s.bjornMott && s.bjornMott.ar !== ar) s.bjornMott = undefined;
  for (const p of living(s)) {
    if (!vaken(p) || p.task?.act === 'strid' || roomAt(s, p.x, p.y)) continue;
    if (Math.hypot(p.x - b.x, p.y - b.y) > R && !ungar.some(u => Math.hypot(p.x - u.x, p.y - u.y) < BJORNMOTE.nara)) continue;
    const mott = s.bjornMott ??= { ar, ids: [] };
    if (mott.ids.includes(p.id)) continue;
    mott.ids.push(p.id);
    count(s, 'bjornmote');
    if (rnd(s, 'bjorn') < (ungar.length ? BJORNMOTE.anfallUngar : BJORNMOTE.anfall)) {
      const folk = living(s).filter(q => q === p || vaken(q) && q.task?.act !== 'strid' && !roomAt(s, q.x, q.y) && Math.hypot(q.x - p.x, q.y - p.y) <= BJORNMOTE.med);
      for (const q of folk) if (!mott.ids.includes(q.id)) mott.ids.push(q.id);
      bjornStrid(s, b.id, folk, ungar.length > 0);
      return; // en strid per slag
    }
    // den ser björnen, blir rädd och går därifrån
    think(p, ungar.length ? 'Såg en björn med ungar' : 'Såg en björn', -BJORNMOTE.rädd, s.now, BJORNMOTE.räddTim * HOUR);
    avbryt(s, p);
    log(s, `${p.name} kom nära en björn${ungar.length ? ' med ungar' : ''} och drog sig försiktigt undan.`, 'world', [p.id]);
  }
}

// björnen anfaller: en strid där den slår tills den som kom för nära ligger, flyr eller ger upp
function bjornStrid(s: State, id: number, folk: Person[], medUngar: boolean) {
  const W0 = 14, H0 = 8, d = BJORN_STRID;
  const kampar: Uppstallning['kampar'] = folk.map((p, i) => personKampe(s, p, 0, 0, 3, H0 / 2 + (i - (folk.length - 1) / 2)));
  kampar.push({ id: 0, namn: d.namn, sida: 1, djur: 'bjorn', st: { styrka: d.styrka, uthallighet: d.uthallighet, mod: d.mod * (medUngar ? 1.4 : 1), smidighet: d.smidighet, skicklighet: d.skicklighet }, vapen: d.vapen, klader: [], fart: d.fart, x: W0 - 4, y: H0 / 2 });
  kampar.forEach((k, i) => { k.id = i + 1; });
  foljet(s, kampar);
  const u: Uppstallning = { avsikt: 'skada', w: W0, h: H0, ...vadretIStriden(s), kampar };
  const fro = Math.floor(rnd(s, 'strid') * 2147483647), st = nyStrid(u, fro);
  st.kampar[folk.length].blod = halsaOf(s, id).blod;
  stridTillSlut(st);
  const vinnare = st.slut!.vinnare;
  sparaStrid(s, { t: s.now, orsak: 'björnen anföll', u, fro, vinnare }); count(s, 'bjornstrid');
  const bk = st.kampar[folk.length];
  if (bk.lage === 'dod') { dodaDjur(s, id); count(s, 'bjornDodadIStrid'); }
  else satDjurHalsa(s, id, bk.blod, halsaOf(s, id).sar + bk.skador.reduce((a, w) => a + w.g, 0));
  const svara: string[] = [];
  st.kampar.slice(0, folk.length).forEach((k, i) => {
    const p = folk[i];
    let dod = k.lage === 'dod';
    for (const w of k.skador) {
      if (!dod && skada(s, p, w.d, w.k, w.g, 'bjorn', 'när en björn anföll')) dod = true;
      const sk = p.skador?.[p.skador.length - 1];
      if (!dod && sk && w.fast) sk.fast = 1;
    }
    slitKastat(s, p, st, k);
    if (dod) { count(s, 'dodBjorn'); die(s, p, 'bjorn'); return; }
    if (svartSkadad(k)) svara.push(p.name);
    p.blod = Math.min(p.blod ?? 1, Math.max(0, k.blod));
    ovning(p, 'narstrid', SLAGSMAL.ovning);
    think(p, 'Anfölls av en björn', -SLAGSMAL.forlora, s.now, SLAGSMAL.tankeTim * HOUR);
    avbryt(s, p);
    const tid = Math.max(SLAGSMAL.minst, st.slut!.t) * SEC;
    p.task = { act: 'strid', phase: 'do', tx: p.x, ty: p.y, until: s.now + tid, carry: 0, why: 'Anfölls av en björn' };
  });
  blodas(s, folk[0].x, folk[0].y, 'jakt', 1);
  const namn = och(folk.map(p => p.name));
  const text = `En björn${medUngar ? ' med ungar' : ''} anföll ${namn}. ${bk.lage === 'dod' ? 'Björnen dog.' : vinnare === 0 ? 'Björnen gav sig av.' : 'Björnen vann och gick sin väg.'}`;
  log(s, text, 'world', folk.map(p => p.id)); notis(s, 'strid', text, folk.map(p => p.id), { x: Math.floor(folk[0].x), y: Math.floor(folk[0].y) });
  kronikaBer(s, 'k_bjornAnfall', folk[0].id, { folk: namn, svara: svara.length ? ` ${och(svara)} skadades svårt.` : '' });
}
