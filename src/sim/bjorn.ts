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
import { ALDER, KROPP, ageOf, alive, byId, count, forstaGang, getRel, isSick, livet, living, log, ovning, stat, think } from './folk';
import { isLight, yearNo } from './tid';
import { halsa, kanGa, skada } from './halsa';
import { avbryt, foodOf } from './lager';
import { die } from './liv';
import { notis } from './notiser';
import { handelse, larmNu } from './rykten';
import { clamp, rnd } from './slump';
import { SLAGSMAL, VAPEN, Avsikt, Strid, Uppstallning, foljet, personKampe, slitKastat, sparaStrid, svartSkadad, vadretIStriden } from './strid';
import { DjurKamp, SLUT, arena, borjaDjurStrid, djurIStrid, djurStridNu, gerSigIn, iArena } from './djurstrid';
import { ledareOf } from './styre';
import { lamnaFallt, styckaFallt } from './styckning';
import { upplev } from './uppvaxt';
import { H, HOUR, MIN, Person, SEC, State, Task, W } from './typer';
import { bynsMitt } from './omrade';

export const BJORNMOTE = balans('bjornmote', {
  nara: 2.5, // så nära (rutor) man ska komma björnen för att överraska den ...
  naraUngar: 4, // ... och så nära när den har ungar med sig
  anfall: 0.1, // så ofta anfaller den den som överraskar den ...
  anfallUngar: 0.35, // ... och så ofta när den har ungar
  rädd: 0.25, // så mycket sämre humör den får som ser björnen på nära håll
  räddTim: 6, // i så många timmar
  med: 2.5, // de som är så här nära (rutor) den som anfalls slåss med
  arena: 12, // striden på kartan (steg 9.2.29): arenan är så här många rutor i sidan, med björnen i mitten
  undanTim: 4, // efter en strid som björnen vunnit eller gett upp går den bort från byn och kommer inte tillbaka på så här många timmar (steg 9.2.30) ...
  undanR: 30, // ... så här många rutor bort från platsen
  gaMed: 0.6, // den som jagar nära en björnstrid går med om modet (0 till 1) är minst så här stort, annars håller hen sig undan (steg 9.2.29)
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
  avstand: 5, // på björnjakten börjar jägarna så här många rutor från björnen i striden (steg 9.2.29)
});

const vaken = (p: Person) => p.task?.act !== 'sova';
const harSpjut = (s: State, p: Person) => VAPEN[personKampe(s, p, 0, 0, 0, 0).vapen].slag === 'stick';

// varje slag (steg.ts): den som är vaken, ute och kommer nära björnen möter den
export function bjornSteg(s: State) {
  const alla = bjornarOf(s);
  const b = alla.find(d => d.art === 'bjorn');
  if (!b) return;
  if (djurIStrid(s, 'bjorn')) { jagareVidStriden(s); return; } // striden pågår på kartan (steg 9.2.29)
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
  // striden med björnen har börjat (steg 9.2.29): jägarna som kommer efter går dit och ger sig in i den
  const g = djurIStrid(s, 'bjorn');
  if (g && !g.folk.includes(p.id) && g.dx !== undefined && g.dy !== undefined) {
    if (Math.hypot(p.x - g.dx, p.y - g.dy) <= BJORNMOTE.med * 2) {
      const st = djurStridNu(g, s.now), q = iArena({ ox: g.ox, oy: g.oy, w: g.u.w, h: g.u.h }, p.x, p.y), id = g.u.kampar.length + (g.in?.length ?? 0) + 1;
      if (!st.slut) { gerSigIn(s, g, p, personKampe(s, p, id, 0, q.x, q.y), st); return; }
    }
    tk.tx = g.dx; tk.ty = g.dy; tk.phase = 'go';
    return;
  }
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

// en strid med björnen: den anfaller den som kom för nära (skada), eller jägarna anfaller den (doda). Striden spelas upp på
// kartan (steg 9.2.29, djurstrid.ts): björnen står där den är och människorna där de står, och när den är slut gör bjornSlut
// skadorna riktiga. En fälld björn styckas och bärs hem av den första som står kvar och kan stycka den; annars ligger den
// kvar där den föll
function bjornStrid(s: State, id: number, folk: Person[], medUngar: boolean, avsikt: Avsikt) {
  const d = bjornVarden(), b = bjornarOf(s).find(q => q.id === id) ?? { x: folk[0].x + 1, y: folk[0].y };
  const a = arena(b.x, b.y, BJORNMOTE.arena, BJORNMOTE.arena), bp = iArena(a, b.x, b.y);
  // på björnjakten börjar jägarna en bit från björnen (BJORNJAKT.avstand), åt det håll de kom ifrån, så att spjuten hinner kastas
  const kampar: Uppstallning['kampar'] = folk.map((p, i) => {
    let q = iArena(a, p.x, p.y);
    const d = Math.hypot(q.x - bp.x, q.y - bp.y);
    if (avsikt === 'doda' && d < BJORNJAKT.avstand) { const v = d > 0.01 ? Math.atan2(q.y - bp.y, q.x - bp.x) : Math.PI + i; q = iArena(a, a.ox + bp.x + Math.cos(v) * BJORNJAKT.avstand, a.oy + bp.y + Math.sin(v) * BJORNJAKT.avstand); }
    return personKampe(s, p, i + 1, 0, q.x, q.y);
  });
  kampar.push({ id: 0, namn: d.namn, sida: 1, djur: 'bjorn', st: { styrka: d.styrka, uthallighet: d.uthallighet, mod: d.mod * (medUngar ? BJORNJAKT.ungarMod : 1), smidighet: d.smidighet, skicklighet: d.skicklighet }, vapen: d.vapen, klader: [], fart: d.fart, x: bp.x, y: bp.y });
  kampar.forEach((k, i) => { k.id = i + 1; });
  foljet(s, kampar);
  const u: Uppstallning = { avsikt, w: a.w, h: a.h, ...vadretIStriden(s), kampar };
  const jakt = avsikt === 'doda';
  const g: DjurKamp = { art: 'bjorn', u, fro: Math.floor(rnd(s, 'strid') * 2147483647), blod: { [folk.length + 1]: halsaOf(s, id).blod }, in: [], t0: s.now, ox: a.ox, oy: a.oy,
    folk: folk.map(p => p.id), djur: [id], avsikt, orsak: jakt ? 'På björnjakt' : 'Anfölls av en björn', ...(medUngar ? { ungar: 1 as const } : {}) };
  borjaDjurStrid(s, g, folk);
}
// striden med björnen är slut (djurStriderSteg): det som hände blir riktigt
function bjornSlut(s: State, g: DjurKamp, st: Strid) {
  const id = g.djur[0], avsikt = g.avsikt, medUngar = !!g.ungar, u = g.u, fro = g.fro;
  const folk = g.folk.map(pid => byId(s, pid)!).filter(p => !!p && alive(p));
  if (!folk.length) return;
  const kampeAv = (p: Person) => st.kampar.find(k => k.pid === p.id)!;
  const vinnare = st.slut!.vinnare, jakt = avsikt === 'doda';
  sparaStrid(s, { t: g.t0, orsak: jakt ? 'björnjakt' : 'björnen anföll', u, fro, vinnare, ...(g.in?.length ? { in: g.in } : {}), ...(g.blod ? { blod: g.blod } : {}) }); count(s, 'bjornstrid');
  const bk = st.kampar.find(k => k.djur === 'bjorn')!, falld = bk.lage === 'dod';
  if (falld) {
    dodaDjur(s, id); s.bjornFalld = yearNo(s, s.now); count(s, 'bjornDodadIStrid');
    const forsta = forstaGang(s, 'bjornDodad');
    const r = [...st.logg].reverse().find(x => x.h === 'traff' && x.b === bk.id), fk = r && st.kampar.find(k => k.id === r.a), fallde = fk?.pid !== undefined ? byId(s, fk.pid) : undefined;
    if (fallde) {
      handelse(s, fallde, 'bjorndodare'); livet(s, fallde, 'bjornar'); upplev(s, fallde, 'fallde');
      if (forsta) { log(s, `${fallde.name} dödade byns första björn.`, 'world', [fallde.id]); kronikaBer(s, 'k_forstaBjorn', fallde.id, personFalt(fallde)); }
    }
  } else satDjurHalsa(s, id, bk.blod, halsaOf(s, id).sar + bk.skador.reduce((a, w) => a + w.g, 0));
  const svara: string[] = [];
  let bar = false;
  folk.forEach(p => {
    const k = kampeAv(p);
    if (!k) return;
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
    const tid = SLAGSMAL.minst * SEC; // striden har redan pågått på kartan (steg 9.2.29)
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
  if (!falld) bjornGarUndan(s, folk[0].x, folk[0].y); // björnen som vunnit eller gett upp går bort från byn (steg 9.2.30)
}
SLUT.bjorn = bjornSlut;

// den som jagar nära en björnstrid (steg 9.2.29) avbryter jakten: hen går med i striden om modet räcker, annars håller hen sig undan
function jagareVidStriden(s: State) {
  const g = djurIStrid(s, 'bjorn');
  if (!g || g.dx === undefined || g.dy === undefined) return;
  const st = djurStridNu(g, s.now);
  for (const p of living(s)) {
    if (g.folk.includes(p.id) || !p.task || !JAGAR.has(p.task.act) || Math.hypot(p.x - g.dx, p.y - g.dy) > BJORNMOTE.med) continue;
    if (stat(p, 'mod', s.now) / 20 >= BJORNMOTE.gaMed) {
      const q = iArena({ ox: g.ox, oy: g.oy, w: g.u.w, h: g.u.h }, p.x, p.y), id = g.u.kampar.length + (g.in?.length ?? 0) + 1;
      gerSigIn(s, g, p, personKampe(s, p, id, 0, q.x, q.y), st); count(s, 'bjornstridGickMed');
    } else {
      avbryt(s, p); think(p, 'Såg en björn slåss med folk', -BJORNMOTE.rädd, s.now, BJORNMOTE.räddTim * HOUR); count(s, 'bjornstridUndan');
    }
  }
}
const JAGAR = new Set(['jakt', 'kaninjakt', 'radjurjakt', 'fageljakt']); // de som jagar byte (inte björnjakten, som redan slåss)
// björnen som vunnit eller gett upp (steg 9.2.30) går bort från byn och människorna, och kommer inte tillbaka på några timmar
function bjornGarUndan(s: State, x: number, y: number) {
  const e = bynsMitt(s), v = Math.atan2(y - e.y, x - e.x) || 0;
  const tx = Math.max(1, Math.min(W - 2, x + Math.cos(v) * BJORNMOTE.undanR)), ty = Math.max(1, Math.min(H - 2, y + Math.sin(v) * BJORNMOTE.undanR));
  s.bjornUndan = { fran: s.now, till: s.now + BJORNMOTE.undanTim * HOUR, x0: x, y0: y, x1: tx, y1: ty };
  count(s, 'bjornGickUndan');
}
