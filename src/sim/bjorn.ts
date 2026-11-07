// Björnen möter folk (steg 6.6.5). Björnen själv och ungarna går sin väg ur kartan och klockan (bjornarOf i djur.ts); här
// avgörs vad som händer när någon kommer nära den. Den anfaller sällan: oftast blir man rädd och går därifrån. Men den som
// överraskar den på nära håll, och mest den som kommer nära ungarna, kan bli anfallen, och en björn slår hårt.
// Var och en möter björnen högst en gång per år (s.bjornMott), så att samma möte inte slås om varje slag.
// Björnjakten (steg 6.6.6): när någon sett björnen kan byn gå på björnjakt, men bara en stor grupp med spjut vågar och
// klarar det. En fälld björn styckas där den föll och bärs hem, och den som fällde den blir björndödare
import { balans } from './balans';
import { kronikaBer, och, personFalt, talOrd } from './berattelser';
import { blodas } from './blod';
import { blocked, freeNear, roomAt } from './byggnad';
import { bjornVarden, bjornarOf, dodaDjur, halsaOf, satDjurHalsa } from './djur';
import { ALDER, KROPP, ageOf, byId, count, forstaGang, getRel, isSick, livet, living, log, ovning, stat, think } from './folk';
import { isLight, yearNo } from './tid';
import { halsa, kanGa, skada } from './halsa';
import { avbryt, foodOf } from './lager';
import { die } from './liv';
import { notis } from './notiser';
import { handelse, larmNu } from './rykten';
import { clamp, rnd } from './slump';
import { SLAGSMAL, VAPEN, Avsikt, Strid, Uppstallning, foljet, nyStrid, personKampe, slitKastat, sparaStrid, stridTillSlut, svartSkadad, vadretIStriden } from './strid';
import { ledareOf } from './styre';
import { lamnaFallt, styckaFallt } from './styckning';
import { upplev } from './uppvaxt';
import { HOUR, MIN, Person, SEC, State, Task } from './typer';

export const BJORNMOTE = balans('bjornmote', {
  nara: 2.5, // så nära (rutor) man ska komma björnen för att överraska den ...
  naraUngar: 4, // ... och så nära när den har ungar med sig
  anfall: 0.1, // så ofta anfaller den den som överraskar den ...
  anfallUngar: 0.35, // ... och så ofta när den har ungar
  rädd: 0.25, // så mycket sämre humör den får som ser björnen på nära håll
  räddTim: 6, // i så många timmar
  med: 2.5, // de som är så här nära (rutor) den som anfalls slåss med
});

export const BJORNJAKT = balans('bjornjakt', {
  vet: 12, // byn vet var björnen går i så här många timmar efter att någon sett den
  spjut: 4, // så många med spjut måste följa med; färre går aldrig på björnjakt
  max: 8, // högst så många följer med
  kraftBas: 0.5, kraftSkada: 2, // en jägares styrka: kraftBas + kraftSkada × vapnets skada (flintspjutet 1,4)
  kraftBjorn: 5, // björnens styrka mot jägarnas
  kvot: 1.2, // jakten blir av när jägarnas styrka mot björnens, gånger (1 + nod × byns hunger), är över detta ...
  nod: 0.5, matNog: 8, // ... byns hunger: 1 − maten per person / matNog
  chans: 0.3, // ... och då med den här chansen i timmen (i dagsljus)
  vagar: 0.9, // den som kallar vågar när mod / 20 + fler × (de med spjut / spjut) är över detta
  fler: 0.3,
  foljMod: 1, foljTycke: 1, foljNod: 0.5, foljSlump: 0.4, folj: 0.1, // den som följer med: modet, tycket för den som kallar, byns hunger och slump, tillsammans över folj
  kallMin: 30, // den som ska följa med har så här många minuter på sig att komma iväg (nivån Tillfälle i val.ts)
  tim: 4, // jägarna letar efter björnen högst så här många timmar
  na: 4, // jägarna anfaller när björnen är så här nära ...
  samlas: 8, // ... med de jägare som är så här nära den första ...
  samlasTim: 0.5, // ... när de andra kommit fram, eller när den första väntat så här många timmar
  gar: 0.2, // björnen märker jägarna och går undan innan de hinner fram med den här chansen
  ungarMod: 1.4, // björnen med ungar slåss modigare
});

const vaken = (p: Person) => p.task?.act !== 'sova';
const harSpjut = (s: State, p: Person) => VAPEN[personKampe(s, p, 0, 0, 0, 0).vapen].slag === 'stick';

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
    if (!s.bjornJakt?.jagare) s.bjornJakt = { ar, sedd: s.now, sag: p.id }; // byn vet var björnen går (björnjakten, steg 6.6.6)
    if (rnd(s, 'bjorn') < (ungar.length ? BJORNMOTE.anfallUngar : BJORNMOTE.anfall)) {
      const folk = living(s).filter(q => q === p || vaken(q) && q.task?.act !== 'strid' && !roomAt(s, q.x, q.y) && Math.hypot(q.x - p.x, q.y - p.y) <= BJORNMOTE.med);
      for (const q of folk) if (!mott.ids.includes(q.id)) mott.ids.push(q.id);
      bjornStrid(s, b.id, folk, ungar.length > 0, 'skada');
      return; // en strid per slag
    }
    // den ser björnen, blir rädd och går därifrån
    think(p, ungar.length ? 'Såg en björn med ungar' : 'Såg en björn', -BJORNMOTE.rädd, s.now, BJORNMOTE.räddTim * HOUR);
    avbryt(s, p);
    log(s, `${p.name} kom nära en björn${ungar.length ? ' med ungar' : ''} och drog sig försiktigt undan.`, 'world', [p.id]);
  }
  const j = s.bjornJakt;
  if (j && Math.floor(s.now / HOUR) !== j.timme) { j.timme = Math.floor(s.now / HOUR); jaktBeslut(s, b.x, b.y); }
}

// platsen på land närmast björnen, där jägarna möter den
function jaktPlats(s: State, x: number, y: number) { const sp = freeNear(s, x, y); return blocked(s, sp.x, sp.y) ? undefined : sp; }

// när byn vet var björnen går kallar den som såg den till björnjakt om hen vågar, annars ledaren eller den modigaste som
// vågar. Jakten blir bara av när minst BJORNJAKT.spjut med spjut följer med och gruppen är stark nog
function jaktBeslut(s: State, bx: number, by: number) {
  const j = s.bjornJakt!;
  if (j.jagare || j.ar !== yearNo(s, s.now) || !isLight(s.now) || s.now - j.sedd > BJORNJAKT.vet * HOUR) return;
  const folk = living(s);
  const kan = folk.filter(q => ageOf(q, s.now) >= ALDER.vaktFran && ageOf(q, s.now) < ALDER.vaktTill && !isSick(q, s.now) && halsa(q) >= KROPP.svag && kanGa(q) && q.task?.act !== 'strid' && q.task?.act !== 'vargjakt' && q.task?.act !== 'bjornjakt' && !larmNu(s, q)?.falskt && harSpjut(s, q));
  if (kan.length < BJORNJAKT.spjut) return;
  const vagar = (q?: Person) => !!q && kan.includes(q) && stat(q, 'mod', s.now) / 20 + BJORNJAKT.fler * kan.length / BJORNJAKT.spjut > BJORNJAKT.vagar;
  const led = ledareOf(s), sag = byId(s, j.sag), modiga = kan.filter(q => vagar(q));
  const kallar = vagar(sag) ? sag! : vagar(led) ? led! : modiga.length ? modiga.reduce((a, q) => stat(q, 'mod', s.now) > stat(a, 'mod', s.now) ? q : a) : undefined;
  if (!kallar) return;
  const nod = clamp(1 - foodOf(s) / Math.max(1, folk.length) / BJORNJAKT.matNog, 0, 1);
  const vill = kan.map(q => ({ q, v: q === kallar ? Infinity : BJORNJAKT.foljMod * (stat(q, 'mod', s.now) - 10) / 10 + BJORNJAKT.foljTycke * getRel(s, q, kallar).op / 100 + BJORNJAKT.foljNod * nod + BJORNJAKT.foljSlump * (rnd(s, 'bjorn', q) - 0.5) }))
    .filter(x => x.v > BJORNJAKT.folj).sort((a, b) => b.v - a.v).slice(0, BJORNJAKT.max).map(x => x.q);
  if (vill.length < BJORNJAKT.spjut) return;
  const kraft = vill.reduce((a, q) => a + BJORNJAKT.kraftBas + BJORNJAKT.kraftSkada * VAPEN[personKampe(s, q, 0, 0, 0, 0).vapen].skada, 0);
  if (kraft / BJORNJAKT.kraftBjorn * (1 + BJORNJAKT.nod * nod) < BJORNJAKT.kvot || rnd(s, 'bjorn') >= BJORNJAKT.chans) return;
  const sp = jaktPlats(s, bx, by);
  if (!sp) return;
  j.jagare = vill.map(q => q.id); j.kallare = kallar.id; j.kallTill = s.now + BJORNJAKT.kallMin * MIN; j.jaktTill = s.now + BJORNJAKT.tim * HOUR; j.samlas = undefined;
  for (const q of vill) avbryt(s, q);
  kallar.task = { act: 'bjornjakt', phase: 'go', tx: sp.x, ty: sp.y, until: j.jaktTill, carry: 0, why: 'Kallar till björnjakt' };
  count(s, 'bjornjakt');
  log(s, `${kallar.name} kallade till björnjakt, och ${vill.length - 1} följde med.`, 'world', vill.map(q => q.id));
}

// jakten är slut: ingen väntar längre på den, och byn måste se björnen igen för en ny jakt
function jaktSlut(s: State) { s.bjornJakt = undefined; }

// nivån Tillfälle (val.ts): den som ska följa med på björnjakten och ännu inte gått
export function bjornjaktVal(s: State, p: Person) {
  const j = s.bjornJakt;
  if (!j?.jagare?.includes(p.id) || p.task?.act === 'bjornjakt' || s.now >= (j.kallTill ?? 0) || s.now >= (j.jaktTill ?? 0)) return undefined;
  const b = bjornarOf(s).find(d => d.art === 'bjorn');
  const sp = b && jaktPlats(s, b.x, b.y), k = j.kallare === undefined ? undefined : byId(s, j.kallare);
  if (!sp) return undefined;
  return { spot: sp, dur: j.jaktTill! - s.now, why: k ? `Följer ${k.name} på björnjakt` : 'Följer med på björnjakt' };
}

// jägaren på väg (MEDAN i steg.ts): följer björnen och anfaller den med de jägare som är nära
export function bjornjaktSteg(s: State, p: Person, tk: Task) {
  if (tk.carry || tk.prog || tk.items) return;
  const j = s.bjornJakt, alla = bjornarOf(s), b = alla.find(d => d.art === 'bjorn');
  if (!j?.jagare?.includes(p.id) || !b || s.now >= (j.jaktTill ?? 0)) { tk.until = s.now; tk.prog = 1; if (j && (!b || s.now >= (j.jaktTill ?? 0))) jaktSlut(s); return; }
  if (Math.hypot(p.x - b.x, p.y - b.y) > BJORNJAKT.na) {
    const sp = jaktPlats(s, b.x, b.y);
    if (sp && Math.hypot(sp.x - tk.tx, sp.y - tk.ty) > 1) { tk.tx = sp.x; tk.ty = sp.y; tk.phase = 'go'; }
    return;
  }
  const jag = j.jagare.map(id => byId(s, id)).filter((q): q is Person => !!q && q.health > 0 && q.task?.act === 'bjornjakt');
  const med = jag.filter(q => Math.hypot(q.x - p.x, q.y - p.y) <= BJORNJAKT.samlas);
  if (med.length < jag.length && s.now - (j.samlas ??= s.now) < BJORNJAKT.samlasTim * HOUR) return; // väntar in de andra
  jaktSlut(s);
  if (rnd(s, 'bjorn') < BJORNJAKT.gar) {
    count(s, 'bjornjaktGick');
    for (const q of med) { q.task!.until = s.now; q.task!.prog = 1; }
    log(s, `Björnen märkte jägarna och gick undan innan ${p.name} och de andra hann fram.`, 'world', med.map(q => q.id));
    kronikaBer(s, 'k_bjornSprang', p.id, { ...personFalt(p), med: med.length > 1 ? ` med ${talOrd(med.length - 1)} till` : '' });
    return;
  }
  bjornStrid(s, b.id, med, alla.some(d => d.art === 'bjornunge'), 'doda');
}

// en strid med björnen: den anfaller den som kom för nära (skada), eller jägarna anfaller den (doda). En fälld björn
// styckas och bärs hem av den första som står kvar och kan stycka den; annars ligger den kvar där den föll
function bjornStrid(s: State, id: number, folk: Person[], medUngar: boolean, avsikt: Avsikt): Strid {
  const W0 = 14, H0 = 8, d = bjornVarden();
  const kampar: Uppstallning['kampar'] = folk.map((p, i) => personKampe(s, p, 0, 0, 3, H0 / 2 + (i - (folk.length - 1) / 2)));
  kampar.push({ id: 0, namn: d.namn, sida: 1, djur: 'bjorn', st: { styrka: d.styrka, uthallighet: d.uthallighet, mod: d.mod * (medUngar ? BJORNJAKT.ungarMod : 1), smidighet: d.smidighet, skicklighet: d.skicklighet }, vapen: d.vapen, klader: [], fart: d.fart, x: W0 - 4, y: H0 / 2 });
  kampar.forEach((k, i) => { k.id = i + 1; });
  foljet(s, kampar);
  const u: Uppstallning = { avsikt, w: W0, h: H0, ...vadretIStriden(s), kampar };
  const fro = Math.floor(rnd(s, 'strid') * 2147483647), st = nyStrid(u, fro);
  st.kampar[folk.length].blod = halsaOf(s, id).blod;
  stridTillSlut(st);
  const vinnare = st.slut!.vinnare, jakt = avsikt === 'doda';
  sparaStrid(s, { t: s.now, orsak: jakt ? 'björnjakt' : 'björnen anföll', u, fro, vinnare }); count(s, 'bjornstrid');
  const bk = st.kampar[folk.length], falld = bk.lage === 'dod';
  if (falld) {
    dodaDjur(s, id); s.bjornFalld = yearNo(s, s.now); count(s, 'bjornDodadIStrid');
    const forsta = forstaGang(s, 'bjornDodad');
    const r = [...st.logg].reverse().find(x => x.h === 'traff' && x.b === bk.id), fallde = r && folk[r.a! - 1];
    if (fallde) {
      handelse(s, fallde, 'bjorndodare'); livet(s, fallde, 'bjornar'); upplev(s, fallde, 'fallde');
      if (forsta) { log(s, `${fallde.name} dödade byns första björn.`, 'world', [fallde.id]); kronikaBer(s, 'k_forstaBjorn', fallde.id, personFalt(fallde)); }
    }
  } else satDjurHalsa(s, id, bk.blod, halsaOf(s, id).sar + bk.skador.reduce((a, w) => a + w.g, 0));
  const svara: string[] = [];
  let bar = false;
  st.kampar.slice(0, folk.length).forEach((k, i) => {
    const p = folk[i];
    let dod = k.lage === 'dod';
    for (const w of k.skador) {
      if (!dod && skada(s, p, w.d, w.k, w.g, 'bjorn', jakt ? 'på björnjakt' : 'när en björn anföll')) dod = true;
      const sk = p.skador?.[p.skador.length - 1];
      if (!dod && sk && w.fast) sk.fast = 1;
    }
    slitKastat(s, p, st, k);
    if (dod) { count(s, 'dodBjorn'); die(s, p, 'bjorn'); return; }
    if (svartSkadad(k)) svara.push(p.name);
    p.blod = Math.min(p.blod ?? 1, Math.max(0, k.blod));
    ovning(p, 'narstrid', SLAGSMAL.ovning);
    if (jakt) think(p, falld ? 'Fällde björnen på björnjakten' : 'Björnen kom undan', falld ? SLAGSMAL.vann : -SLAGSMAL.forlora, s.now, SLAGSMAL.tankeTim * HOUR);
    else think(p, 'Anfölls av en björn', -SLAGSMAL.forlora, s.now, SLAGSMAL.tankeTim * HOUR);
    avbryt(s, p);
    const tid = Math.max(SLAGSMAL.minst, st.slut!.t) * SEC;
    // den första som står kvar styckar den fällda björnen och bär hem det hen orkar; resten ligger i en hög där den föll
    if (falld && !bar && k.lage === 'strid') {
      const t: Task = { act: 'bjornjakt', phase: 'do', tx: p.x, ty: p.y, until: s.now + tid, carry: 1, prog: 1, why: 'Bär hem en fälld björn' };
      styckaFallt(s, p, t, 'bjorn');
      if (t.items?.bjorndel) { p.task = t; bar = true; return; }
    }
    p.task = { act: 'strid', phase: 'do', tx: p.x, ty: p.y, until: s.now + tid, carry: 0, why: jakt ? 'På björnjakt' : 'Anfölls av en björn' };
  });
  if (falld && !bar) { count(s, 'bjornKvar'); lamnaFallt(s, 'bjorn', 1, folk[0].x, folk[0].y); }
  blodas(s, folk[0].x, folk[0].y, 'jakt', 1);
  const namn = och(folk.map(p => p.name)), svaraText = svara.length ? ` ${och(svara)} skadades svårt.` : '';
  const text = jakt ? `${namn} gick på björnjakt. ${falld ? 'Björnen dog.' : 'Björnen kom undan.'}`
    : `En björn${medUngar ? ' med ungar' : ''} anföll ${namn}. ${falld ? 'Björnen dog.' : vinnare === 0 ? 'Björnen gav sig av.' : 'Björnen vann och gick sin väg.'}`;
  log(s, text, 'world', folk.map(p => p.id)); notis(s, 'strid', text, folk.map(p => p.id), { x: Math.floor(folk[0].x), y: Math.floor(folk[0].y) });
  if (jakt) kronikaBer(s, falld ? 'k_bjornjakt' : 'k_bjornjaktMiss', folk[0].id, { folk: namn, svara: svaraText });
  else kronikaBer(s, 'k_bjornAnfall', folk[0].id, { folk: namn, svara: svaraText });
  return st;
}
