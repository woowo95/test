import { ACTS, ALDER, Act, DAY, Lardom, SAMTAL, SKILL_GOR, STAT_GOR, Skill, Stat, coldOf, halsaLage, hearthOf, living, roomAt, temperature, varmeDelar, viloSlag, viloTak, SLAG, SLAG_TECKEN, Person, KUNSKAPER, SKILLS, SKILL_NAMES, STATS, STAT_NAMES, SEDER, SED_LIST, TEKNIK, BYN, Ting, ageOf, alive, byId, childrenOf, drar, heldBy, ownedBy, ownedStock, sakNamn, slagIkon, tingNamn, STACK, describe, duty, habitShare, habitTotal, KROPP, kortTal, moodOf, num, REL, relKey, stat, taskName, timeLabel } from '../../sim';
import { hasIcon, iconImg } from '../../ikoner';
import { LAG, bar, cap, carryTxt, cssFarg, durTxt, esc, hex, hsl, hjalpText, moodWord, pLink, prickar, relWord, sickNow, tempBar, tempOrd, trend, trendD } from '../hjalp';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// allt om den valda personen, i underflikar (DELAR): först en presentation, sedan behov, egenskaper, tiden, utrustning,
// kunskap och relationer. Namnet och vad hen gör just nu står alltid överst
export const person: Flik = {
  namn: 'Person',
  html() {
    const p = byId(s, ui.selected);
    if (!p) return `<p class="muted">Klicka på en person på kartan eller i listan för att se allt om hen.</p>`;
    const delar = DELAR.filter(d => alive(p) || !d.levande), del = delar.find(d => d.id === ui.personDel) ?? delar[0];
    const status = alive(p) ? (p.task ? taskName(p.task) : '–') : p.died !== undefined ? `Dog ${p.cause} (${timeLabel(s, p.died)})` : `Flyttade från byn (${timeLabel(s, p.left!)})`;
    return `
      <div class="phead"><span class="dot big" style="background:${hex(p)}"></span><div><h2>${esc(p.name)}${alive(p) ? prickar(p) : ''}</h2>
      <p class="status">${status}</p>${alive(p) && p.task?.why ? `<p class="why">Varför: ${esc(p.task.why)}</p>` : ''}</div></div>
      <div class="pdelar" role="tablist">${delar.map(d => `<button type="button" role="tab" data-pdel="${d.id}" aria-selected="${d === del}" title="${d.namn}" aria-label="${d.namn}">${d.tecken}</button>`).join('')}</div>
      <h3>${del.namn}</h3>${del.html(p)}`;
  },
  klick(el) {
    const b = el.closest<HTMLElement>('[data-pdel]');
    if (!b) return false;
    ui.personDel = b.dataset.pdel!;
    return true;
  },
};

// underflikarna i personrutan: symbolen på knappen, namnet (vid musen och som rubrik) och innehållet.
// levande = visas bara för den som lever (en död eller utflyttad har inga behov och lägger ingen tid på något)
interface Del { id: string; tecken: string; namn: string; levande?: true; html(p: Person): string }
const DELAR: Del[] = [
  { id: 'pres', tecken: '🪪', namn: 'Presentation', html: presHtml },
  { id: 'behov', tecken: '❤️', namn: 'Behov', levande: true, html: behovHtml },
  { id: 'egen', tecken: '💪', namn: 'Egenskaper', html: egenHtml },
  { id: 'tid', tecken: '🕓', namn: 'Tiden', levande: true, html: tidHtml },
  { id: 'utr', tecken: '🎒', namn: 'Utrustning', levande: true, html: p => `<p class="muted">${carryTxt(p)}</p>${gearHtml(p)}` },
  { id: 'kun', tecken: '🧠', namn: 'Kunskap', html: knowledgeHtml },
  { id: 'rel', tecken: '👥', namn: 'Relationer', html: relHtml },
];

// en övertygelse: personen drar en sed minst så här mycket åt ena hållet (ett helt steg är 1, seder.ts)
const OVERTYGAD = 0.35;
function presHtml(p: Person) {
  const a = ageOf(p, s.now), kids = childrenOf(s, p), d = drar(s, p);
  const tro = SED_LIST.filter(k => Math.abs(d[k]) >= OVERTYGAD).sort((x, y) => Math.abs(d[y]) - Math.abs(d[x]))
    .map(k => { const sed = SEDER[k], namn = d[k] > 0 ? sed.pos : sed.neg; return `<span class="tro" title="${esc(sed.effect)}">${esc(namn)}</span>`; });
  return `<dl class="kv fam"><dt>${p.sex === 'k' ? 'Kvinna' : 'Man'}</dt><dd>${Math.floor(a)} år · född ${timeLabel(s, p.born)}</dd>
      <dt>Yrke</dt><dd>${p.tag ? esc(p.tag) : '–'}</dd>
      <dt>Föräldrar</dt><dd>${p.mother || p.father ? [byId(s, p.mother), byId(s, p.father)].filter(Boolean).map(q => pLink(q)).join(' och ') : 'Bland de första i byn'}</dd>
      <dt>Partner</dt><dd>${pLink(byId(s, p.partner))}</dd><dt>Barn</dt><dd>${kids.length ? kids.map(pLink).join(', ') : '–'}</dd>
      <dt>Övertygelser</dt><dd>${tro.length ? tro.join(' ') : '–'}</dd></dl>
      <h3>Viktiga händelser</h3>${p.fame.length ? `<ul class="fame">${p.fame.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : '<p class="muted">Inget som minns ännu.</p>'}`;
}
// en rad med stapel som går att trycka på, eller hålla musen över: då syns vad som påverkar den just nu.
// delar = det som ändrar värdet (per timme, eller i humörpoäng när enhet är tom), mer = det som inte är en jämn takt
type Orsak = { namn: string; v: number };
const tal = (v: number) => { const a = Math.abs(v * 100); return (v > 0 ? '+' : v < 0 ? '−' : '') + (a > 0 && a < 1 ? a.toFixed(1).replace('.', ',') : String(Math.round(a))); };
function rad(p: Person, key: string, namn: string, inner: string, delar: Orsak[], enhet: string, mer = '') {
  const id = `b-${key}-${p.id}`, d = trendD(p, key);
  const title = [...delar.map(x => `${x.namn} ${tal(x.v)}${enhet}`), mer].filter(x => x).join(', ');
  const lista = delar.length ? `<ul class="thoughts">${delar.map(x => `<li class="${x.v < 0 ? 'neg' : 'pos'}">${esc(x.namn)} <span>${tal(x.v)}${enhet}</span></li>`).join('')}</ul>` : '';
  const matt = d === undefined ? '' : `<p class="muted">Har ändrats ${tal(d)} i timmen den senaste stunden.</p>`;
  return `<dt class="klick" data-hjalp="${id}" title="${esc(title)}">${namn}</dt><dd class="klick" data-hjalp="${id}" title="${esc(title)}">${inner}</dd>
    ${hjalpText(id, `<dd class="forkl">${matt}${lista}${mer ? `<p class="muted">${esc(mer)}</p>` : ''}</dd>`)}`;
}
const VILA: Record<ReturnType<typeof viloSlag>, string> = { restVila: 'Vilar', restArbete: 'Arbetar tungt', restVaken: 'Vaken' };
function behovHtml(p: Person) {
  const now = s.now, m = moodOf(p, now), a = ageOf(p, now);
  const humor: Orsak[] = [{ namn: 'Grundhumör', v: SAMTAL.humorBas }]; moodOf(p, now, humor);
  // värmen: samma delar som simuleringen räknar (varmeDelar), med hur många som är i varje rum
  const inRum = new Map<number, number>();
  for (const q of living(s)) { const r = roomAt(s, q.x, q.y); if (r) inRum.set(r.id, (inRum.get(r.id) ?? 0) + 1); }
  const temp = temperature(s), v = varmeDelar(s, p, coldOf(temp), inRum), fh = hearthOf(s.fire);
  const varme: Orsak[] = [
    ...v.eld > 0 ? [{ namn: 'Elden värmer', v: v.eld }] : [],
    ...v.kyla > 0 ? [{ namn: `Kylan, ${Math.round(temp)} grader${v.shelter > 0 ? `, huset skyddar ${Math.round(v.shelter * 100)} %` : ''}`, v: -v.kyla }] : [],
    ...v.mild > 0 ? [{ namn: `Milt väder, ${Math.round(temp)} grader`, v: v.mild }] : [],
  ];
  const tak = viloTak(s, p, v.rum);
  const vila: Orsak[] = [{ namn: VILA[viloSlag(p)], v: KROPP[viloSlag(p)] }, ...tak ? [{ namn: tak === 'restGolv' ? 'Sover på golvet i ett hus' : 'Sover under tak', v: KROPP[tak] }] : [],
    ...v.heat > KROPP.eldNara ? [{ namn: 'Slappnar av vid elden', v: fh.comfort * v.heat }] : []];
  const hl = halsaLage(p, now);
  const halsa: Orsak[] = [...hl === 'svalt' ? [{ namn: 'Svälter', v: -1 / KROPP.svaltTim }] : hl === 'frys' ? [{ namn: 'Fryser farligt', v: -1 / KROPP.frysTim }] : hl === 'laker' ? [{ namn: 'Mätt och frisk: läker', v: 1 / KROPP.lakerTim }] : [],
    ...sickNow(p) ? [{ namn: p.sickWhy ?? 'Sjuk', v: -1 / KROPP.sjukTim }] : []];
  return `${sickNow(p) ? `<p class="why">${esc(p.sickWhy ?? 'Sjuk')}, ${durTxt(p.sickUntil! - now)} kvar</p>` : ''}<dl class="kv">
      ${rad(p, 'humor', 'Humör', `${bar(m, '', trend(p, 'humor', m))}<span>${moodWord(m)}</span>`, humor, '', 'Tankarna försvinner med tiden.')}
      ${rad(p, 'hunger', 'Mättnad', bar(p.hunger, '', trend(p, 'hunger', p.hunger)), [{ namn: 'Hungern växer', v: -1 / KROPP.hungerTim * (a < ALDER.matBarn ? KROPP.hungerBarn : 1) }], ' i timmen', 'Maten hen äter höjer den.')}
      ${rad(p, 'rest', 'Vila', bar(p.rest, '', trend(p, 'rest', p.rest)), vila, ' i timmen')}
      ${rad(p, 'social', 'Gemenskap', bar(p.social, '', trend(p, 'social', p.social)), [{ namn: 'Saknar sällskap', v: -1 / KROPP.socialTim }], ' i timmen', 'Varje samtal höjer den.')}
      ${rad(p, 'health', 'Hälsa', bar(p.health, p.health < LAG.halsa ? 'low' : '', trend(p, 'health', p.health)), halsa, ' i timmen', halsa.length ? '' : 'Oförändrad just nu.')}
      ${rad(p, 'warm', 'Temperatur', `${tempBar(p.warm, trend(p, 'warm', p.warm))}<span>${tempOrd(p.warm)}</span>`, varme, ' i timmen', 'Mitten är lagom. Ett bad kyler av.')}
      ${rad(p, 'toa', 'Toa', bar(p.toa, p.toa < KROPP.toaBehov ? 'low' : '', trend(p, 'toa', p.toa)), [{ namn: p.task?.act === 'sova' ? 'Behovet växer, långsammare i sömnen' : 'Behovet växer', v: -1 / KROPP.toaTim * (p.task?.act === 'sova' ? KROPP.toaSomn : 1) }], ' i timmen', 'Ett toabesök fyller den.')}
    </dl>`;
}
// det en egenskap eller färdighet gör: arbetena som går fortare (ACTS) och raderna i STAT_GOR och SKILL_GOR
function gorHtml(rader: string[], nu: string) {
  return `<dd class="forkl"><p class="muted">${esc(nu)}</p>${rader.length ? `<ul class="thoughts">${rader.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}</dd>`;
}
const arbetar = (sk: string[]) => sk.length ? [`Hur mycket hen får ut av arbetet: ${sk.map(k => SKILL_NAMES[k as Skill].toLowerCase()).join(', ')}`] : [];
function ovarNu(p: Person, k: Skill) {
  const d = p.task && ACTS[p.task.act];
  return !!d && p.task!.phase === 'do' && (d.arbete === k || (k === 'hantverk' && !!d.hantverk) || (k === 'elda' && d.slag === 'elda'));
}
function egenHtml(p: Person) {
  const now = s.now, d = duty(s, p);
  const statRad = (k: Stat) => {
    const v = stat(p, k, now), id = `e-${k}-${p.id}`, per = stat(p, k, now + DAY) - v; // ett dygn = ett år
    const nu = Math.abs(per) < 0.005 ? 'Ändras inte med åldern just nu.' : `${per > 0 ? 'Växer' : 'Sjunker'} med åldern: ${per > 0 ? '+' : '−'}${num(Math.abs(per))} om året.`;
    const rader = [...arbetar(SKILLS.filter(sk => ACTS[sk as Act]?.egenskap === k)), ...STAT_GOR[k]];
    return `<dt class="klick" data-hjalp="${id}" title="${esc(rader.join(', '))}">${STAT_NAMES[k]}</dt><dd class="klick" data-hjalp="${id}" title="${esc(rader.join(', '))}">${bar(v / 20)}<span>${num(v)}</span></dd>${hjalpText(id, gorHtml(rader, nu))}`;
  };
  const skillRad = (k: Skill) => {
    const v = p.skill[k], id = `f-${k}-${p.id}`, tr = trend(p, 'sk_' + k, v), dd = trendD(p, 'sk_' + k);
    const nu = ovarNu(p, k) ? `Övar just nu${dd ? `: ${dd > 0 ? '+' : ''}${num(dd)} i timmen` : ''}.` : dd ? `Har ändrats ${num(dd)} i timmen den senaste stunden.` : 'Ändras inte just nu. Den växer när hen övar.';
    const rader = [...arbetar(ACTS[k as Act]?.arbete === k ? [k] : []), ...SKILL_GOR[k]];
    return `<dt class="klick" data-hjalp="${id}" title="${esc(rader.join(', '))}">${SKILL_NAMES[k]}</dt><dd class="klick" data-hjalp="${id}" title="${esc(rader.join(', '))}">${bar(v / 20, 'skill', tr)}<span>${num(v)}</span></dd>${hjalpText(id, gorHtml(rader, nu))}`;
  };
  return `<dl class="kv">${STATS.map(statRad).join('')}
      ${ageOf(p, now) >= ALDER.hjalper ? `<dt>Pliktkänsla</dt><dd>${bar(d, 'skill')}<span>${d > 0.75 ? 'Plikttrogen' : d > 0.5 ? 'Gör sin del' : d > 0.3 ? 'Bekväm' : 'Lat'}</span></dd>` : ''}</dl>
      <h3>Färdigheter</h3><dl class="kv">${SKILLS.map(skillRad).join('')}</dl>
      ${p.fiske ? `<h3>Fiske</h3><p class="muted">${p.fiske.f} försök, ${p.fiske.n} napp, ${p.fiske.k} ${p.fiske.k === 1 ? 'abborre' : 'abborrar'}</p>` : ''}`;
}
function relHtml(p: Person) {
  const rels = s.people.filter(q => q.id !== p.id && s.rels[relKey(p.id, q.id)] && alive(q)).map(q => ({ q, r: s.rels[relKey(p.id, q.id)] }))
    .sort((x, y) => Math.abs(y.r.op) - Math.abs(x.r.op)).slice(0, 8);
  return rels.length ? `<ul class="rels">${rels.map(({ q, r }) => `<li>${pLink(q)}<span class="rw ${r.op < REL.osams ? 'neg' : r.op > REL.vanOrd ? 'pos' : ''}">${relWord(p, q, r.op)}</span><span class="muted">${r.talks} samtal</span></li>`).join('')}</ul>` : '<p class="muted">Inga relationer ännu.</p>';
}

// lärdomar om samma plats visas tillsammans, rädslorna först
function groups(ls: Lardom[]) {
  const m = new Map<string, Lardom[]>();
  for (const l of ls) { const key = (l.k === 'fara' ? 'f' : 'p') + l.a; (m.get(key) ?? m.set(key, []).get(key)!).push(l); }
  return [...m.values()];
}
// utrustningen: handplatsen och det hen äger, som symboler. Ringen runt symbolen visar skicket; namnet, skicket och
// var tinget är syns när man håller över eller trycker på symbolen
function gearHtml(p: Person) {
  const hand = heldBy(s, p), own = ownedBy(s, p).filter(t => t !== hand);
  const whose = (t: Ting) => t.agare === p.id ? 'eget' : t.agare === BYN ? 'byns' : `lånat av ${byId(s, t.agare)?.name ?? 'någon'}`;
  const where = (t: Ting) => t.hos === undefined ? 'i förrådet' : `${byId(s, t.hos)?.name ?? 'någon'} har det i handen`;
  const ting = (t: Ting, title: string, cls = 'kan') => `<span class="tnod liten ${cls}" tabindex="0" title="${esc(title)}" aria-label="${esc(title)}">${iconImg(t.halv?.gor ?? t.k, 16)}${t.halv ? `<span class="halvmark">${iconImg('paborjat', 9)}</span>` : ''}<svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" pathLength="100" stroke-dasharray="${Math.round(t.c * 100)} 100"/></svg></span>`;
  const slot = hand ? ting(hand, `I handen: ${sakNamn(hand.k).toLowerCase()}, ${whose(hand)}, ${Math.round(hand.c * 100)} %`, 'kan hand')
    : `<span class="tnod liten hand tom" tabindex="0" title="Handen är tom" aria-label="Handen är tom">✋</span>`;
  return `<h3>Utrustning</h3><div class="tekrad">${slot}${own.map(t => ting(t, `Äger: ${tingNamn(t).toLowerCase()}, ${Math.round(t.c * 100)} %, ${where(t)}`, 'pa')).join('')}</div>${stockHtml(p)}`;
}
// det hen äger i byns förråd (egendom.ts): symbolen och hur mycket, namnet när man håller över. Saker utan egen stack
// (giftig svamp bland den ätliga) syns inte, som i förrådet
function stockHtml(p: Person) {
  const own = Object.entries(ownedStock(s, p)).filter(([k, n]) => n >= 0.5 && STACK[k]).sort((a, b) => b[1] - a[1]);
  if (!own.length) return '';
  const txt = (n: number) => kortTal(n).replace(',0', '');
  return `<div class="tekrad">${own.map(([k, n]) => { const title = `Äger i förrådet: ${txt(n)} ${sakNamn(k).toLowerCase()}`; return `<span class="tnod liten pa" tabindex="0" title="${esc(title)}" aria-label="${esc(title)}">${iconImg(k, 16)}<span class="antal">${txt(n)}</span></span>`; }).join('')}</div>`;
}
// kunskap (alltid rätt) och lärdomar (det personen tror, kan vara fel). Spelaren ser vad som inte stämmer.
function knowledgeHtml(p: Person) {
  const ks = Object.entries(p.kunskap ?? {}).filter(([, e]) => e.v >= 0.05);
  const ls = (p.lardomar ?? []).slice().sort((a, b) => (b.k === 'fara' ? 1 : 0) - (a.k === 'fara' ? 1 : 0) || b.c - a.c);
  // teknik som symboler: det hen kan fullt, det hen funderar på blekt med en ring som visar hur långt hen kommit.
  // Ett tryck öppnar tekniken i teknikfliken (data-tekgo, fångas i teknik.ts)
  const tk = TEKNIK.filter(x => (p.tek?.[x.id] ?? 0) > 0.01).map(x => {
    const v = p.tek![x.id], kan = v >= 1, title = `${kan ? 'Kan göra' : 'Funderar på'} ${x.namn.toLowerCase()}${kan ? '' : ` (${Math.round(v * 100)} %)`}`;
    return `<button type="button" class="tnod liten ${kan ? 'kan' : 'pa'}" data-tekgo="${x.id}" title="${esc(title)}" aria-label="${esc(title)}">${iconImg(x.id, 16)}${kan ? '' : `<svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" pathLength="100" stroke-dasharray="${Math.round(v * 100)} 100"/></svg>`}</button>`;
  });
  const rows = ks.map(([k, e]) => ({ n: KUNSKAPER[k]?.namn ?? k, v: e.v }));
  return `${tk.length ? `<h3>Teknik</h3><div class="tekrad">${tk.join('')}</div>` : ''}<h3>Kunskap</h3>${rows.length ? `<dl class="kv">${rows.map(r => `<dt>${esc(r.n)}</dt><dd>${bar(r.v, 'skill')}<span>${Math.round(r.v * 100)} %</span></dd>`).join('')}</dl>` : '<p class="muted">Ingen särskild kunskap ännu.</p>'}
      <h3>Lärdomar</h3>${ls.length ? `<ul class="lard">${groups(ls).map(g => `<li class="${g[0].k === 'fara' ? 'fara' : ''}"><b>${esc(cap(describe(s, g[0]).place))}</b>${g.map(l => { const d = describe(s, l); return `<span>${esc(d.what)} <small class="muted">${d.sure}, ${esc(d.src)}</small>${d.wrong ? `<small class="fel">${esc(d.wrong)}</small>` : ''}</span>`; }).join('')}</li>`).join('')}</ul>` : '<p class="muted">Inga lärdomar ännu.</p>'}`;
}
// vad personen brukar ägna sin vakna tid åt, i grupper efter slaget av arbete (SLAG); en handling utan slag står för sig.
// Symbolen är slagets pixelbild, annars slagets eller handlingens tecken
const HABIT_GROUPS = (() => {
  const m = new Map<string, { name: string; ikon: string; acts: Act[] }>();
  for (const a of Object.keys(ACTS) as Act[]) {
    if (a === 'sova') continue;
    const sl = ACTS[a].slag, name = sl ? SLAG[sl] : ACTS[a].namn, px = sl && slagIkon(sl);
    const ikon = px && hasIcon(px) ? iconImg(px, 16) : `<span class="tecken">${(sl ? SLAG_TECKEN[sl] : ACTS[a].tecken) ?? '•'}</span>`;
    (m.get(name) ?? m.set(name, { name, ikon, acts: [] }).get(name)!).acts.push(a);
  }
  // en egen färg per grupp, jämnt fördelad runt färghjulet, så att samma slag alltid har samma färg
  return [...m.values()].map((g, i, all) => ({ ...g, farg: cssFarg(hsl(i * 360 / all.length, 0.45, 0.55)) }));
})();
// tårtdiagram över den vakna tiden de senaste dygnen (vanorna bleknar, seder.ts). Små delar slås ihop till Annat
const SMA = 0.04;
function tidHtml(p: Person) {
  const tot = habitTotal(p) - (p.habit.sova ?? 0);
  if (!(tot > 0)) return '<p class="muted">Hen har inte hunnit göra något ännu.</p>';
  const all = HABIT_GROUPS.map(g => ({ g, v: habitShare(p, g.acts, tot) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const stora = all.filter(x => x.v >= SMA), annat = all.filter(x => x.v < SMA).reduce((a, x) => a + x.v, 0);
  const bitar = stora.map(x => ({ name: x.g.name, ikon: x.g.ikon, farg: x.g.farg, v: x.v }));
  if (annat > 0) bitar.push({ name: 'Annat', ikon: '<span class="tecken">…</span>', farg: 'var(--barbg)', v: annat });
  let vinkel = 0;
  const pt = (v: number) => `${Math.sin(v * 2 * Math.PI).toFixed(4)} ${(-Math.cos(v * 2 * Math.PI)).toFixed(4)}`;
  const tart = bitar.map(b => {
    const fran = vinkel; vinkel += b.v;
    const titel = `<title>${esc(b.name)}: ${Math.round(b.v * 100)} %</title>`;
    return b.v >= 0.9999 ? `<circle r="1" fill="${b.farg}">${titel}</circle>`
      : `<path d="M0 0L${pt(fran)}A1 1 0 ${b.v > 0.5 ? 1 : 0} 1 ${pt(vinkel)}Z" fill="${b.farg}">${titel}</path>`;
  }).join('');
  return `<div class="tid"><svg class="tart" viewBox="-1 -1 2 2" role="img" aria-label="Vad hen ägnat sin vakna tid åt">${tart}</svg>
    <ul class="tidlista">${bitar.map(b => `<li title="${esc(b.name)}" aria-label="${esc(b.name)}"><span class="fg" style="background:${b.farg}"></span>${b.ikon}<span>${Math.round(b.v * 100)} %</span></li>`).join('')}</ul></div>
    <p class="muted small">Den vakna tiden de senaste dygnen. Håll musen över en del eller en rad för att se vad det är.</p>`;
}
