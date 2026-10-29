import { FORMAGOR, HALSA, Kroppsdel, KROPPSDELAR, NARING, NARINGAR, NARINGBAL, bristGrad, bristerNu, frysFaktor, naringNu, sjunker, skorbjugg, vilaTim, TORST, blodning, delSkada, halsa, skadeLista, skadeText, smarta, torstDelar } from '../../sim';
import { pratText, beskrivning, binamnInfo, INTRYCK, Intryck, LARDOMAR, LKind, anseendeSym, dodSymbol, intryckText, samlatIntryck, ACTS, ALDER, Act, DAY, Lardom, HUMOR, SKILL_GOR, STAT_GOR, Skill, Stat, coldOf, halsaLage, hearthOf, living, roomAt, temperature, varmeDelar, viloSlag, viloTak, takEffekt, SLAG, SLAG_TECKEN, Person, KUNSKAPER, SKILLS, SKILL_NAMES, STATS, STAT_NAMES, SEDER, SED_LIST, sedOppen, TEKNIK, BYN, formogenhetDelar, Ting, halvKlar, ageOf, alive, byId, childrenOf, drar, heldBy, ownedBy, PLATSER, PLATS_LIST, Plats, BORDA_KG, UTRUSTNING, bordOf, capacity, kvNamn, handerFor, homeKind, load, utrustning, viktOf, SAKER, ownedStock, sakNamn, slagIkon, tingNamn, STACK, describe, duty, habitShare, habitTotal, KROPP, kortTal, moodOf, num, REL, relKey, relTyper, stat, taskName, timeLabel, upplevelseText, uppEffekt } from '../../sim';
import { framstegSvg, hasIcon, iconImg, kvSvg, tecknet } from '../../ikoner';
import { LAG, fmtN, bar, cap, carryTxt, cssFarg, durTxt, esc, hex, hsl, hjalpOppen, hjalpText, moodWord, pLink, prickar, relWord, sickNow, tempBar, tempOrd, trend, trendD } from '../hjalp';
import { s, ui } from '../lage';
import { tekInfo } from './teknik';
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
      <div class="phead"><span class="dot big" style="background:${hex(p)}"></span><div><h2>${esc(p.name)}${binamnHtml(p)}${alive(p) ? prickar(p) : ''}${anseende(p)}</h2>${binamnForkl(p)}
      <p class="status">${status}</p>${alive(p) && p.task?.why ? `<p class="why">Varför: ${esc(p.task.why)}</p>` : ''}${prat(p)}</div></div>
      <div class="pdelar" role="tablist">${delar.map(d => `<button type="button" role="tab" data-pdel="${d.id}" aria-selected="${d === del}" title="${d.namn}" aria-label="${d.namn}">${d.tecken}</button>`).join('')}</div>
      <h3>${del.namn}</h3>${del.html(p)}`;
  },
  klick(el) {
    const ti = el.closest<HTMLElement>('.tid [data-t]');
    if (ti) { tidVald = tidVald === ti.dataset.t ? undefined : ti.dataset.t; return true; }
    const tg = el.closest<HTMLElement>('[data-ptek]'); // en teknik i kunskapen: rutan om den visas eller döljs
    if (tg) { kunTek = kunTek === tg.dataset.ptek ? undefined : tg.dataset.ptek; return true; }
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
  { id: 'halsa', tecken: '🩺', namn: 'Hälsa', levande: true, html: halsaHtml },
  { id: 'egen', tecken: '💪', namn: 'Egenskaper', html: egenHtml },
  { id: 'tid', tecken: '🕓', namn: 'Tiden', levande: true, html: tidHtml },
  { id: 'utr', tecken: '🎒', namn: 'Utrustning', levande: true, html: p => `<p class="muted">${carryTxt(p)}</p>${gearHtml(p)}` },
  { id: 'kun', tecken: '🧠', namn: 'Kunskap', html: knowledgeHtml },
  { id: 'rel', tecken: '👥', namn: 'Relationer', html: relHtml },
  { id: 'ryk', tecken: '🗣️', namn: 'Rykten', html: ryktenHtml },
];

// en övertygelse: personen drar en sed minst så här mycket åt ena hållet (ett helt steg är 1, seder.ts)
const OVERTYGAD = 0.35;
function presHtml(p: Person) {
  const a = ageOf(p, s.now), kids = childrenOf(s, p), d = drar(s, p);
  const tro = SED_LIST.filter(k => sedOppen(s, k) && Math.abs(d[k]) >= OVERTYGAD).sort((x, y) => Math.abs(d[y]) - Math.abs(d[x]))
    .map(k => { const sed = SEDER[k], namn = d[k] > 0 ? sed.pos : sed.neg; return `<span class="tro" title="${esc(sed.effect)}">${esc(namn)}</span>`; });
  return `<p class="besk">${esc(beskrivning(s, p))}</p><dl class="kv fam"><dt>${p.sex === 'k' ? 'Kvinna' : 'Man'}</dt><dd>${Math.floor(a)} år · född ${timeLabel(s, p.born)}</dd>
      <dt>Yrke</dt><dd>${p.tag ? esc(p.tag) : '–'}</dd>
      <dt>Föräldrar</dt><dd>${p.mother || p.father ? [byId(s, p.mother), byId(s, p.father)].filter(Boolean).map(q => pLink(q)).join(' och ') : 'Bland de första i byn'}</dd>
      <dt>Partner</dt><dd>${pLink(byId(s, p.partner))}</dd><dt>Barn</dt><dd>${kids.length ? kids.map(pLink).join(', ') : '–'}</dd>
      <dt>Övertygelser</dt><dd>${tro.length ? tro.join(' ') : '–'}</dd>${formogenhetRad(p)}</dl>
      <h3>Viktiga händelser</h3>${p.fame.length ? `<ul class="fame">${p.fame.map(f => `<li>${esc(f.replace(/^Kom på /, 'Uppfann '))}</li>`).join('')}</ul>` : '<p class="muted">Inget som minns ännu.</p>'}
      ${p.upp?.length ? `<h3>Upplevelser</h3><ul class="fame">${p.upp.map(u => `<li>${u.a} år: ${esc(upplevelseText(u))} <span class="muted">${esc(effektText(u.e))}</span></li>`).join('')}</ul>` : ''}`;
}
// förmögenheten (steg 3.6.4): värdet av allt hen äger, ungefär i arbetstimmar (varde.ts); delarna när man trycker
function formogenhetRad(p: Person) {
  const f = formogenhetDelar(s, p.id), id = `form-${p.id}`, v = (n: number) => String(Math.round(n));
  const delar = ([['Redskap', f.redskap], ['Kläder', f.klader], ['I förrådet och kistan', f.forrad], ['Hus', f.hus]] as const).filter(x => x[1] >= 0.5);
  return `<dt class="klick" data-hjalp="${id}" title="Värdet av allt hen äger">Förmögenhet</dt><dd class="klick" data-hjalp="${id}">${v(f.sum)}</dd>
    ${hjalpText(id, `<dd class="forkl"><ul class="thoughts">${delar.map(([n, x]) => `<li class="pos">${n} <span>${v(x)}</span></li>`).join('') || '<li>Äger inget</li>'}</ul><p class="muted">Ungefär i arbetstimmar: det det tar att skaffa eller göra sakerna.</p></dd>`)}`;
}
// det en upplevelse gjorde med egenskaperna (steg 3.1.2, uppvaxt.ts), till exempel "Mod −2, Uthållighet +1"
const plusMinus = (v: number) => (v > 0 ? '+' : '−') + Math.abs(v);
const effektText = (e: Partial<Record<Stat, number>>) => (Object.entries(e) as [Stat, number][]).map(([k, v]) => `${STAT_NAMES[k]} ${plusMinus(v)}`).join(', ');
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
// törsten per timme och varför (torstDelar i torst.ts, steg 2.4.1–2.4.2)
function torstRad(p: Person): Orsak[] {
  const d = torstDelar(p), bas = 1 / TORST.tim;
  return [{ namn: d.somn ? 'Törsten växer, långsammare i sömnen' : 'Törsten växer', v: -bas * (d.somn ? TORST.somn : 1) },
    ...d.varm > 0 ? [{ namn: 'För varm', v: -bas * (d.somn ? TORST.somn : 1) * TORST.varm * d.varm * (d.tungt ? TORST.tungt : 1) }] : [],
    ...d.tungt ? [{ namn: 'Arbetar tungt', v: -bas * (TORST.tungt - 1) }] : []];
}
const VILA: Record<ReturnType<typeof viloSlag>, string> = { restVila: 'Vilar', restArbete: 'Arbetar tungt', restVaken: 'Vaken' };
function behovHtml(p: Person) {
  const now = s.now, m = moodOf(p, now), a = ageOf(p, now);
  const humor: Orsak[] = [{ namn: 'Grundhumör', v: HUMOR.bas }]; moodOf(p, now, humor);
  // värmen: samma delar som simuleringen räknar (varmeDelar), med hur många som är i varje rum
  const inRum = new Map<number, number>();
  for (const q of living(s)) { const r = roomAt(s, q.x, q.y); if (r) inRum.set(r.id, (inRum.get(r.id) ?? 0) + 1); }
  const temp = temperature(s), v = varmeDelar(s, p, coldOf(temp), inRum), fh = hearthOf(s.fire);
  const varme: Orsak[] = [
    ...v.eld > 0 ? [{ namn: 'Elden värmer', v: v.eld }] : [],
    ...v.kyla > 0 ? [{ namn: `Kylan, ${Math.round(temp)} grader${v.shelter > 0 ? `, huset skyddar ${Math.round(v.shelter * 100)} %` : ''}${v.fall > 0 ? `, skinnfällen ${Math.round(v.fall * 100)} %` : ''}${v.klad > 0 ? `, kläderna ${Math.round(v.klad * 100)} %` : ''}${frysFaktor(p) > 1 ? `, brist på fett: ${Math.round((frysFaktor(p) - 1) * 100)} % mer` : ''}${v.vaderGrader > 0.5 ? `, ${v.blot > 0.1 ? 'blöt' : 'blåsten'}: känns ${Math.round(v.vaderGrader)} grader kallare` : ''}`, v: -v.kyla }] : [],
    ...v.mild > 0 ? [{ namn: `Milt väder, ${Math.round(temp)} grader`, v: v.mild }] : [],
    // över idealet (steg 2.3.4)
    ...v.sol > 0 ? [{ namn: `Solen, ${Math.round(temp)} grader`, v: v.sol }] : [],
    ...v.kladHetta > 0 ? [{ namn: 'Kläderna värmer', v: v.kladHetta }] : [],
    ...v.eldHetta > 0 ? [{ namn: 'Sitter tätt vid elden', v: v.eldHetta }] : [],
    ...p.warm > 1 ? [{ namn: 'Svalnar', v: -Math.min(p.warm - 1, KROPP.svalnar) }] : [],
  ];
  const tak = viloTak(s, p, v.rum);
  const vs = viloSlag(p), trott = vilaTim(p, vs) - KROPP[vs];
  const vila: Orsak[] = [{ namn: VILA[vs], v: KROPP[vs] }, ...trott ? [{ namn: 'Trött av brist på energi', v: trott }] : [], ...tak ? [{ namn: tak === 'restBadd' ? 'Sover i en halmbädd' : tak === 'restGolv' ? 'Sover på golvet i ett hus' : 'Sover under tak', v: KROPP[tak] * takEffekt(s, p, tak) }] : [],
    ...v.heat > KROPP.eldNara ? [{ namn: 'Slappnar av vid elden', v: fh.comfort * v.heat }] : [],
    ...p.warm > KROPP.extremVarm ? [{ namn: 'Slut av hettan', v: -KROPP.varmTrott * (p.warm - 1) }] : []]; // samma delar som needsStep i steg.ts
  const hl = halsaLage(p, now);
  const halsaDelar: Orsak[] = [...hl === 'svalt' ? [{ namn: 'Svälter', v: -1 / KROPP.svaltTim }] : hl === 'frys' ? [{ namn: 'Fryser farligt', v: -1 / KROPP.frysTim }] : hl === 'torst' ? [{ namn: 'Törstar ihjäl', v: -1 / TORST.tomTim }] : hl === 'laker' ? [{ namn: 'Mätt, otörstig och frisk: läker', v: 1 / KROPP.lakerTim }] : [],
    ...sickNow(p) ? [{ namn: p.sickWhy ?? 'Sjuk', v: -1 / KROPP.sjukTim }] : [],
    // kroppen (steg 2.5.1): blodet som rinner ut, och det som håller hälsan nere
    ...blodning(p) > 0 ? [{ namn: 'Blöder', v: -blodning(p) }] : [],
    ...skorbjugg(p) > 0 ? [{ namn: 'Skörbjugg (brist på vitaminer)', v: -skorbjugg(p) }] : []];
  const skador = [...skadeText(p, now), ...(p.blod ?? 1) < 1 ? [`Har förlorat ${Math.round((1 - (p.blod ?? 1)) * 100)} % av blodet`] : [], ...smarta(p) > HALSA.ontGrans ? ['Har ont'] : []];
  return `${sickNow(p) ? `<p class="why">${esc(p.sickWhy ?? 'Sjuk')}, ${durTxt(p.sickUntil! - now)} kvar</p>` : ''}<dl class="kv">
      ${rad(p, 'humor', 'Humör', `${bar(m, '', trend(p, 'humor', m))}<span>${moodWord(m)}</span>`, humor, '', 'Tankarna försvinner med tiden.')}
      ${rad(p, 'hunger', 'Mättnad', bar(p.hunger, '', trend(p, 'hunger', p.hunger)), [{ namn: 'Hungern växer', v: -1 / KROPP.hungerTim * (a < ALDER.matBarn ? KROPP.hungerBarn : 1) }], ' i timmen', 'Maten hen äter höjer den. Mättnaden är en sammanfattning av näringen (fliken Hälsa).')}
      ${rad(p, 'rest', 'Vila', bar(p.rest, '', trend(p, 'rest', p.rest)), vila, ' i timmen')}
      ${rad(p, 'social', 'Gemenskap', bar(p.social, '', trend(p, 'social', p.social)), [{ namn: 'Saknar sällskap', v: -1 / KROPP.socialTim }], ' i timmen', 'Varje samtal höjer den.')}
      ${rad(p, 'health', 'Hälsa', bar(halsa(p), halsa(p) < LAG.halsa ? 'low' : '', trend(p, 'health', halsa(p))), halsaDelar, ' i timmen', [...skador, ...halsaDelar.length ? [] : ['Oförändrad just nu.']].join('. '))}
      ${rad(p, 'warm', 'Temperatur', `${tempBar(p.warm, trend(p, 'warm', p.warm))}<span>${tempOrd(p.warm)}</span>`, varme, ' i timmen', 'Mitten är lagom, till höger är för varmt. Ett bad kyler av, och i skugga värmer inte solen.')}
      ${rad(p, 'toa', 'Toa', bar(p.toa, p.toa < KROPP.toaBehov ? 'low' : '', trend(p, 'toa', p.toa)), [{ namn: p.task?.act === 'sova' ? 'Behovet växer, långsammare i sömnen' : 'Behovet växer', v: -1 / KROPP.toaTim * (p.task?.act === 'sova' ? KROPP.toaSomn : 1) }], ' i timmen', 'Ett toabesök fyller den.')}
    </dl>`;
}
// fliken Hälsa (steg 2.5.3): kroppen som pixelgubbe nr 3 ("händer och fötter", Björn efter v55), ritad i rutor som
// människorna på kartan, utan kontur. Bildens vänstra sida är personens högra. Varje del är grön när den är hel och går mot
// gult och rött ju mer skadad den är (delSkada); ett tryck eller musen visar vad som är fel just där. Under kroppen listan
// över skadorna (skadeLista) och förmågorna som staplar under rubriken Status (FORMAGOR). Saknade delar (grå) och proteser kommer senare
const GUBBE = ['......hhhh......', ...Array(3).fill('.....hhhhhh.....'), '......hhhh......', '.......hh.......',
  ...Array(8).fill('..AA.bbbbbb.aa..'), '.DDD.bbbbbb.ddd.', '.DD..bbbbbb..dd.', '................',
  ...Array(8).fill('.....LL..ll.....'), '...FFFF..ffff...'];
const GUBBE_DEL: Record<string, Kroppsdel> = { h: 'huvud', b: 'bal', A: 'armH', a: 'armV', D: 'handH', d: 'handV', L: 'benH', l: 'benV', F: 'fotH', f: 'fotV' };
// rutorna per del, hopslagna till en rektangel per lopp i raden (räknas en gång)
const GUBBE_RUTOR = (() => {
  const m = {} as Record<Kroppsdel, string>;
  GUBBE.forEach((r, y) => { for (let x = 0; x < r.length;) { const c = r[x]; let n = 1; while (r[x + n] === c) n++; if (c !== '.') m[GUBBE_DEL[c]] = (m[GUBBE_DEL[c]] ?? '') + `<rect x="${x}" y="${y}" width="${n}" height="1"/>`; x += n; } });
  return m;
})();
const delFarg = (f: number) => `hsl(${Math.round(110 - 104 * f)} 55% 50%)`;
function halsaHtml(p: Person) {
  const rader = skadeLista(p, s.now), delar = Object.keys(KROPPSDELAR) as Kroppsdel[];
  const vad = (d: Kroppsdel) => rader.filter(r => r.d === d);
  const gubbe = delar.map(d => {
    const r = vad(d), titel = `${KROPPSDELAR[d].namn}: ${r.length ? r.map(x => `${x.namn.split(' i ')[0].toLowerCase()}, ${x.grad}`).join('; ') : 'hel'}`;
    return `<g class="klick${hjalpOppen(`k-${d}-${p.id}`) ? ' vald' : ''}" data-hjalp="k-${d}-${p.id}" data-hjalp-grupp="k-" fill="${delFarg(delSkada(p, d))}"><title>${esc(titel)}</title>${GUBBE_RUTOR[d]}</g>`;
  }).join('');
  const oppen = delar.map(d => hjalpText(`k-${d}-${p.id}`, `<p class="forkl"><b>${esc(KROPPSDELAR[d].namn)}</b>: ${vad(d).length ? vad(d).map(r => esc(`${r.namn.split(' i ')[0]}, ${r.grad}, ${r.gar}`)).join('; ') : 'hel'}</p>`)).join('');
  const blod = p.blod ?? 1, brister = bristerNu(p);
  // bristerna (steg 2.6.2): symbolen, och vad den gör när man håller musen över den
  const bristTecken = (k: (typeof brister)[number]) => `<span class="tecken" title="${esc(`${NARING[k].brist.namn}, brist på ${NARING[k].namn.toLowerCase()}: ${NARING[k].brist.gor}`)}">${tecknet('b_' + k, NARING[k].brist.tecken)}</span>`;
  const brist = brister.map(k => `<li class="neg">${bristTecken(k)}<span>${esc(NARING[k].brist.namn)}<small class="muted">brist på ${esc(NARING[k].namn.toLowerCase())}, ${Math.round(bristGrad(p, k) * 100)} %</small></span><span class="gar">↘ äter helst ${esc(NARING[k].langtar)}</span></li>`).join('');
  const lista = rader.length || blod < 1 || brister.length ? `<ul class="skador">${rader.map(r => `<li class="${r.battre ? 'pos' : 'neg'}"><span class="tecken">${tecknet(r.ikon, r.tecken)}</span><span>${esc(r.namn)}${r.vard.map(k => iconImg(k, 12)).join('')}<small class="muted">${esc([r.grad, ...r.bloder ? ['blöder'] : [], ...r.gjort].join(', '))}</small></span><span class="gar">${r.battre ? '↗' : '↘'} ${esc(r.gar)}</span></li>`).join('')}
    ${blod < 1 ? `<li class="${blodning(p) > 0 ? 'neg' : 'pos'}"><span class="tecken">🩸</span><span>Har förlorat ${Math.round((1 - blod) * 100)} % av blodet</span><span class="gar">${blodning(p) > 0 ? '↘ blöder' : '↗ kommer tillbaka'}</span></li>` : ''}${brist}</ul>` : '<p class="muted">Inget är fel.</p>';
  const formagor = (Object.keys(FORMAGOR) as (keyof typeof FORMAGOR)[]).map(k => {
    const f = FORMAGOR[k], v = f.varde(p), ont = 'ont' in f;
    return rad(p, 'f_' + k, `${f.tecken} ${f.namn}`, `${bar(v, (ont ? v > 0.5 : v < LAG.halsa) ? 'low' : '')}<span>${Math.round(v * 100)} %</span>`, f.delar(p), '', `Påverkar: ${f.gor}`);
  }).join('');
  // näringen (steg 2.6.1): mättnaden är en sammanfattning av de fem värdena
  const n = naringNu(p), barn = ageOf(p, s.now) < ALDER.matBarn ? KROPP.hungerBarn : 1;
  const vs = viloSlag(p), svett = (k: (typeof NARINGAR)[number]) => k === 'mineral' && vs === 'restArbete' && p.warm > KROPP.forVarm ? NARINGBAL.svett : 0;
  const naring = NARINGAR.map(k => rad(p, 'n_' + k, `${tecknet('n_' + k, NARING[k].tecken, 14)} ${NARING[k].namn}`, `${bar(n[k], bristGrad(p, k) > 0 ? 'low' : '')}<span>${Math.round(n[k] * 100)} %</span>${bristGrad(p, k) > 0 ? bristTecken(k) : ''}`,
    [{ namn: 'Sjunker', v: -sjunker(k, KROPP.hungerTim) * barn }, ...svett(k) ? [{ namn: 'Tappar salt: arbetar hårt i värmen', v: -sjunker(k, KROPP.hungerTim) * barn * svett(k) }] : []], ' i timmen',
    `Finns i ${NARING[k].fran}. Under ${Math.round(NARINGBAL.brist * 100)} %: ${NARING[k].brist.namn.toLowerCase()} (${NARING[k].brist.gor.charAt(0).toLowerCase() + NARING[k].brist.gor.slice(1)})`)).join('');
  // vätskan står först under näringen (Björn efter v89): samma värde som törsten i simuleringen, fullt = otörstig
  const vatska = rad(p, 'torst', '💧 Vätska', `${bar(p.torst, p.torst < TORST.torstig ? 'low' : '', trend(p, 'torst', p.torst))}<span>${Math.round(p.torst * 100)} %</span>`, torstRad(p), ' i timmen', 'Att dricka fyller den. Vattnet är olika smutsigt på olika ställen, och i istiden smälter man snö vid elden.');
  return `<div class="kropp"><svg class="gubbe" viewBox="0 0 16 26" shape-rendering="crispEdges" role="img" aria-label="Kroppen">${gubbe}</svg>${oppen ? `<div class="kroppinfo">${oppen}</div>` : ''}</div>
    <h3>Det som är fel</h3>${lista}<h3>Status</h3><dl class="kv">${formagor}</dl><h3>Näring</h3><dl class="kv">${vatska}${naring}</dl>`;
}
// det en egenskap eller färdighet gör: arbetena som går fortare (ACTS) och raderna i STAT_GOR och SKILL_GOR
function gorHtml(rader: string[], nu: string) {
  return `<dd class="forkl"><p class="muted">${esc(nu)}</p>${rader.length ? `<ul class="thoughts">${rader.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}</dd>`;
}
const arbetar = (sk: string[]) => sk.length ? [`Hur mycket hen får ut av arbetet: ${sk.map(k => SKILL_NAMES[k as Skill].toLowerCase()).join(', ')}`] : [];
function ovarNu(p: Person, k: Skill) {
  const d = p.task && ACTS[p.task.act];
  return !!d && p.task!.phase === 'do' && (d.arbete === k || d.ovar === k || (k === 'hantverk' && !!d.hantverk) || (k === 'elda' && d.slag === 'elda'));
}
function egenHtml(p: Person) {
  const now = s.now, d = duty(s, p);
  const statRad = (k: Stat) => {
    const v = stat(p, k, now), id = `e-${k}-${p.id}`, per = stat(p, k, now + DAY) - v; // ett dygn = ett år
    const nu = Math.abs(per) < 0.005 ? 'Ändras inte med åldern just nu.' : `${per > 0 ? 'Växer' : 'Sjunker'} med åldern: ${per > 0 ? '+' : '−'}${num(Math.abs(per))} om året.`;
    // det som format egenskapen i barndomen (steg 3.1.2): upplevelserna och anlagen hen föddes med
    const upp = (p.upp ?? []).filter(u => u.e[k]).map(u => `Minne från barndomen (${u.a} år): ${upplevelseText(u)}, ${plusMinus(u.e[k]!)}`);
    const anlag = p.anlag && uppEffekt(p, k) ? ` Anlaget är ${num(p.anlag[k])}; upplevelserna flyttar det ${plusMinus(Math.round(uppEffekt(p, k)))}.` : '';
    const rader = [...upp, ...arbetar(SKILLS.filter(sk => ACTS[sk as Act]?.egenskap === k)), ...STAT_GOR[k]];
    return `<dt class="klick" data-hjalp="${id}" title="${esc(rader.join(', '))}">${STAT_NAMES[k]}</dt><dd class="klick" data-hjalp="${id}" title="${esc(rader.join(', '))}">${bar(v / 20)}<span>${num(v)}</span></dd>${hjalpText(id, gorHtml(rader, nu + anlag))}`;
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
// relationerna med typerna som symboler (steg 3.1.1, RELATIONER i relationer.ts): ett tryck på symbolen visar varför.
// De med en särskild typ (partner, bästa vän, ärkefiende, mentor, rival) först, sedan de starkaste
function relHtml(p: Person) {
  const sarskild = (q: Person) => p.partner === q.id || p.bast === q.id || p.arke === q.id || p.mentor === q.id || q.mentor === p.id || !!p.rivaler?.includes(q.id);
  const rels = s.people.filter(q => q.id !== p.id && s.rels[relKey(p.id, q.id)] && alive(q)).map(q => ({ q, r: s.rels[relKey(p.id, q.id)], sv: sarskild(q) }))
    .sort((x, y) => +y.sv - +x.sv || Math.abs(y.r.op) - Math.abs(x.r.op)).slice(0, 10);
  return rels.length ? `<ul class="rels">${rels.map(({ q, r }) => {
    const typer = relTyper(s, p, q), id = (k: string) => `rt-${p.id}-${q.id}-${k}`;
    const sym = typer.map(t => `<button type="button" class="relsym" data-hjalp="${id(t.id)}" data-hjalp-grupp="rt-${p.id}-${q.id}-" title="${esc(t.namn)}" aria-label="${esc(t.namn)}">${iconImg(t.ikon)}</button>`).join('');
    const oppen = typer.find(t => hjalpOppen(id(t.id)));
    return `<li>${pLink(q)}<span class="relsyms">${sym}</span><span class="rw ${r.op < REL.osams ? 'neg' : r.op > REL.vanOrd ? 'pos' : ''}">${relWord(p, q, r.op)}</span><span class="muted">${r.talks} samtal</span>${oppen ? `<p class="muted small relfork"><b>${esc(oppen.namn)}</b>: ${esc(oppen.varfor(s, p, q, r))}</p>` : ''}</li>`;
  }).join('')}</ul>` : '<p class="muted">Inga relationer ännu.</p>';
}

// rykten och intryck (steg 3.3, 3.4): vad byn tycker om hen, och vad hen tror om andra. Varje intryck är en symbol; ett
// tryck visar hur säker hen är, varifrån det kommer, om det är överdrivet eller påhittat och händelserna bakom
const ikTecken = (k: keyof typeof INTRYCK, px = 16) => tecknet('i_' + k, INTRYCK[k].sym, px);
// anseendet och minnet efter döden som pixelsymboler (steg 3.6.11), med tecknet om bilden saknas
const ANS_IKON: Record<string, string> = { '★': 'i_legend', '☠': 'i_okand', '😇': 'a_gott', '😐': 'a_blandat', '😈': 'a_daligt' };
const ansTecken = (a: string, px = 16) => tecknet(ANS_IKON[a] ?? '', a, px);
// öknamnet eller hedersnamnet (steg 3.9.1): namnet med symbolen; varför kommer fram när man trycker
function binamnHtml(p: Person) {
  const b = binamnInfo(p);
  if (!b) return '';
  const t = b.heder ? 'Hedersnamn' : 'Öknamn';
  return ` <span class="binamn klick ${b.heder ? 'heder' : 'skam'}" data-hjalp="bn-${p.id}" tabindex="0" title="${t}: ${esc(b.varfor)}" aria-label="${t}">${esc(b.namn)} ${tecknet(b.heder ? 'b_heder' : 'b_skam', b.sym, 14)}</span>`;
}
function binamnForkl(p: Person) {
  const b = binamnInfo(p);
  return b ? hjalpText(`bn-${p.id}`, `<p class="forkl">${b.heder ? 'Hedersnamn' : 'Öknamn'}: byn ser ${esc(p.name)} som ${esc(b.intryck)}. ${esc(b.varfor)}.</p>`) : '';
}
function anseende(p: Person) {
  const a = alive(p) ? anseendeSym(s, p.id) : dodSymbol(s, p.id);
  return a ? ` <span class="anseende" title="${esc(alive(p) ? 'Vad byn tycker om hen' : a === '★' ? 'En legend i byn' : 'Ökänd i byn')}">${ansTecken(a)}</span>` : '';
}
function ryktenHtml(p: Person) {
  const byn = samlatIntryck(s, p.id).slice(0, 6);
  const omHen = byn.length ? `<div class="tekrad">${byn.map(([k]) => { const n = living(s).filter(q => q.intryck?.some(e => e.om === p.id && e.k === k)).length, title = `${n} i byn ser hen som ${INTRYCK[k].namn}`; return `<span class="tnod liten ${INTRYCK[k].tecken > 0 ? 'kan' : 'pa'}" tabindex="0" title="${esc(title)}" aria-label="${esc(title)}">${ikTecken(k)}<span class="antal">${n}</span></span>`; }).join('')}</div>` : '<p class="muted">Byn har ingen särskild bild av hen.</p>';
  const per = new Map<number, Intryck[]>();
  for (const e of p.intryck ?? []) (per.get(e.om) ?? per.set(e.om, []).get(e.om)!).push(e);
  const rader = [...per.values()].sort((a, b) => sum(b) - sum(a)).slice(0, 12).map(L => {
    const q = byId(s, L[0].om), namn = q ? pLink(q) : esc(L[0].namn), dod = !q || !alive(q) ? dodSymbol(s, L[0].om) || '✝' : '';
    const id = (e: Intryck) => `ik-${p.id}-${e.om}-${e.k}`;
    const sym = L.map(e => `<button type="button" class="relsym" data-hjalp="${id(e)}" data-hjalp-grupp="ik-${p.id}-${e.om}-" title="${esc(INTRYCK[e.k].namn)}" aria-label="${esc(INTRYCK[e.k].namn)}">${ikTecken(e.k)}</button>`).join('');
    const e = L.find(x => hjalpOppen(id(x))), t = e && intryckText(s, e);
    const mer = t ? `<p class="muted small relfork"><b>${esc(cap(t.namn))}</b>: ${esc([t.sure, t.varifran, t.slag, t.sant].filter(Boolean).join(', '))}${t.bevis.length ? `<br>${t.bevis.map(b => esc(b)).join('<br>')}` : ''}</p>` : '';
    return `<li>${namn}${dod ? ` <span title="${dod === '★' ? 'En legend' : dod === '☠' ? 'Ökänd' : 'Död'}">${ansTecken(dod, 12)}</span>` : ''}<span class="relsyms">${sym}</span>${mer}</li>`;
  });
  return `<h3>Vad byn tycker om hen</h3>${omHen}<h3>Vad hen tror om andra</h3>${rader.length ? `<ul class="rels">${rader.join('')}</ul>` : '<p class="muted">Inga intryck ännu.</p>'}`;
}
const sum = (L: Intryck[]) => L.reduce((t, e) => t + e.v * e.c, 0);
// lärdomar om samma plats visas tillsammans, rädslorna först
function groups(ls: Lardom[]) {
  const m = new Map<string, Lardom[]>();
  for (const l of ls) { const key = (l.k === 'fara' ? 'f' : 'p') + l.a; (m.get(key) ?? m.set(key, []).get(key)!).push(l); }
  return [...m.values()];
}
// utrustningen (steg 2.3.1), som vy nr 3 "Två händer" (Björn efter v92): händerna är det viktigaste, två stora rutor på
// var sin sida om den påklädda människan (bildens vänstra sida är personens högra, som i fliken Hälsa), med en stapel under
// som visar hur mycket handen bär av det den orkar. Kroppens platser i en rad under, och sedan det hen äger. Ringen runt
// ett redskap visar skicket; vad som sitter på platsen och vad det väger syns när man håller över eller trycker på rutan
// skicket som en linje runt rutan, från toppen medsols: en ring runt en rund ruta, och längs kanten runt en fyrkantig (händerna,
// med hörnen rundade som rutans, r i bildens 36 punkter; steg 2.10.19)
function skickRing(c: number, r: number) {
  const d = `pathLength="100" stroke-dasharray="${Math.round(c * 100)} 100"`, a = (x: number, y: number) => `A${r} ${r} 0 0 1 ${x} ${y}`;
  if (!r) return `<svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" ${d}/></svg>`;
  return `<svg class="ring fyrkant" viewBox="0 0 36 36"><path d="M18 2H${34 - r}${a(34, 2 + r)}V${34 - r}${a(34 - r, 34)}H${2 + r}${a(2, 34 - r)}V${2 + r}${a(2 + r, 2)}Z" ${d}/></svg>`;
}
function gearHtml(p: Person) {
  const hand = heldBy(s, p), own = ownedBy(s, p).filter(t => t !== hand && t.bar !== p.id);
  const whose = (t: Ting) => t.agare === p.id ? 'eget' : t.agare === BYN ? 'byns' : `lånat av ${byId(s, t.agare)?.name ?? 'någon'}`;
  const where = (t: Ting) => t.bar !== undefined ? `${byId(s, t.bar)?.name ?? 'någon'} har det på sig` : t.hos === undefined ? 'i förrådet' : `${byId(s, t.hos)?.name ?? 'någon'} har det i handen`;
  const ting = (t: Ting, title: string, cls = 'kan', px = 16) => `<span class="tnod liten ${cls}" tabindex="0" data-sak="t:${t.id}" title="${esc(title)}" aria-label="${esc(title)}">${iconImg(t.halv?.gor ?? t.k, px)}${kvSvg(t.q, px > 20 ? 14 : 9) && `<span class="kvhorn">${kvSvg(t.q, px > 20 ? 14 : 9)}</span>`}${t.halv ? `<span class="halvmark">${framstegSvg(halvKlar(t.halv), 9)}</span>` : ''}${skickRing(t.c, cls.includes('hand') ? (px > 20 ? 9 : 11) : 0)}</span>`;
  const t = p.task, borda = t ? load(t, s) : 0, bar = !!t && borda > 0, u = utrustning(s, p, bar), kg = (n: number) => `${kortTal(n)} kg`;
  const bordaTxt = bar ? `bär ${carryTxt(p).replace(/^Bär /, '')}` : '';
  const ruta = (k: Plats, stor = false) => {
    const pl = PLATSER[k], x = u[k], cls = stor ? ' stor' : '';
    if (x.ting) {
      const h = handerFor(s, p, x.ting.k);
      const title = `${pl.namn}: ${sakNamn(x.ting.k).toLowerCase()}${x.ting.q !== undefined ? `, ${kvNamn(x.ting).toLowerCase()}` : ''}, ${whose(x.ting)}, ${Math.round(x.ting.c * 100)} %, väger ${kg(viktOf(x.ting.k))}${SAKER[x.ting.k]?.klad?.varme ? `, skyddar ${Math.round(SAKER[x.ting.k]!.klad!.varme * 100)} % mot kylan` : ''}${pl.hand && h === 2 ? ', tar båda händerna' : ''}${k === 'krok' ? ', hänger i bältet medan hen bär' : ''}${x.borda ? `; ${bordaTxt}` : ''}`;
      const i = ting(x.ting, title, (k === 'vanster' && x.ting === u.hoger.ting ? 'kan hand pa' : 'kan hand') + cls, stor ? 36 : 16);
      return x.borda ? i.replace(/<\/span>$/, `<span class="antal">${iconImg(homeKind(t!), 10)}</span></span>`) : i;
    }
    if (x.borda) { const title = `${pl.namn}: ${bordaTxt}`; return `<span class="tnod liten hand${cls}" tabindex="0" title="${esc(title)}" aria-label="${esc(title)}">${iconImg(homeKind(t!), stor ? 36 : 16)}</span>`; }
    const title = `${pl.namn}: ${pl.hand ? 'tom' : 'inget'}`;
    return `<span class="tnod liten hand tom${cls}" tabindex="0" title="${esc(title)}" aria-label="${esc(title)}">${pl.ikon}</span>`;
  };
  // vad varje hand bär och orkar, i kg: ett redskap som tar båda händerna och en börda i båda delas lika
  const orkar = capacity(s, p), en = orkar * UTRUSTNING.en;
  const handKg = (k: 'hoger' | 'vanster') => {
    const x = u[k], tva = !!x.ting && u.hoger.ting === u.vanster.ting, bada = !x.ting && !!u.hoger.borda && !!u.vanster.borda;
    const tak = tva || bada ? orkar / 2 : Math.min(orkar, en + (x.ting ? SAKER[x.ting.k]?.rymmer ?? 0 : 0));
    const v = (x.ting ? bordOf(x.ting.k) / (tva ? 2 : 1) : 0) + (x.borda ? borda / (bada ? 2 : 1) : 0);
    return `<div class="hbar"><i class="${x.borda ? 'borda' : ''}" style="width:${Math.min(100, Math.round(v / Math.max(0.01, tak) * 100))}%"></i></div><div class="small"><b>${kg(v * BORDA_KG)}</b> / ${kg(tak * BORDA_KG)}</div>`;
  };
  const paSig = PLATS_LIST.filter(k => !PLATSER[k].hand).reduce((a, k) => a + (u[k].ting && k !== 'krok' ? viktOf(u[k].ting!.k) : 0), 0);
  const rad = PLATS_LIST.filter(k => !PLATSER[k].hand).map(k => ruta(k)).join('');
  return `<div class="utrhander"><div class="utrhand">${ruta('hoger', true)}${handKg('hoger')}</div>${utrGubbe(u)}<div class="utrhand">${ruta('vanster', true)}${handKg('vanster')}</div></div>
    <div class="tekrad utrrad">${rad}</div><p class="small muted utrkg">På sig <b>${kg(paSig)}</b>${bar ? ` · börda <b>${kg(borda * BORDA_KG)}</b>` : ''} · orkar <b>${kg(orkar * BORDA_KG)}</b></p>
    <div class="tekrad">${own.map(t => ting(t, `Äger: ${tingNamn(t).toLowerCase()}, ${Math.round(t.c * 100)} %, väger ${kg(viktOf(t.k))}, ${where(t)}`, 'pa')).join('')}</div>${stockHtml(p)}`;
}
// människan i utrustningen: gubben från förslaget (16×26 rutor) med hud och hår, och det hen har på sig ritat på kroppen:
// yttre lagret som en rock med pälskrage, inre som en tröja, skor, byxor, mössa och bältet. Redskapet i handen syns i handen
const UGUBBE = [
  '......kkkk......', '.....kkkkkk.....', '.....kssssk.....', '.....sesses.....', '......SssS......', '.......SS.......',
  ...Array(8).fill('..sS.ssssSS.sS..'), '.ssS.llllLL.sSs.', '.ss..llllLL..ss.',
  ...Array(9).fill('.....sS..Ss.....'), '...ssss..ssss...'];
const UFARG: Record<string, string> = { s: '#d9a878', S: '#b07e56', k: '#4a3018', e: '#2a1c12', l: '#6e5236', L: '#57402a', B: '#b48a5e', b: '#8a6440', d: '#5e4026', w: '#d8c8a8', r: '#c9a86a', R: '#e2c792', q: '#8a6e3e', t: '#5a7a8a', T: '#46626f', m: '#7a5a36' };
function utrGubbe(u: ReturnType<typeof utrustning>) {
  const g = UGUBBE.map(r => [...r]), put = (x: number, y: number, k: string) => { if (g[y]?.[x] !== undefined) g[y][x] = k; };
  if (u.inre.ting) for (let y = 6; y <= 15; y++) for (let x = 5; x <= 10; x++) put(x, y, x >= 9 ? 'T' : 't');
  if (u.ben.ting) for (let y = 16; y <= 24; y++) for (const x of [5, 6, 9, 10]) put(x, y, x === 6 || x === 9 ? 'L' : 'l');
  if (u.yttre.ting) {
    for (let y = 6; y <= 15; y++) { for (let x = 5; x <= 10; x++) put(x, y, x >= 9 ? 'b' : 'B'); put(7, y, y > 7 ? 'd' : 'B'); }
    for (let y = 6; y <= 13; y++) { put(2, y, 'B'); put(3, y, 'b'); put(12, y, 'B'); put(13, y, 'b'); }
    for (const x of [2, 3, 12, 13]) put(x, 13, 'w');
    for (let x = 6; x <= 9; x++) put(x, 6, 'w');
  }
  if (u.balte.ting) { for (let x = 5; x <= 10; x++) put(x, 14, x % 2 ? 'r' : 'R'); put(7, 15, 'q'); }
  if (u.fotter.ting) { for (let x = 3; x <= 6; x++) put(x, 25, x === 6 ? 'b' : 'B'); for (let x = 9; x <= 12; x++) put(x, 25, x === 9 ? 'b' : 'B'); put(5, 24, 'B'); put(10, 24, 'B'); }
  if (u.huvud.ting) for (let x = 5; x <= 10; x++) { put(x, 0, 'm'); put(x, 1, 'm'); }
  const rects = g.map((r, y) => r.map((k, x) => k !== '.' ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${UFARG[k]}"/>` : '').join('')).join('');
  // redskapen i händerna (och i bältet) som små bilder ovanpå
  const pa = (k: Plats, x: number, y: number) => u[k].ting && !(k === 'vanster' && u.vanster.ting === u.hoger.ting) ? `<span class="utrpa" style="left:${x}%;top:${y}%">${iconImg(u[k].ting!.halv?.gor ?? u[k].ting!.k, 22)}</span>` : '';
  return `<div class="utrgubbe"><svg viewBox="0 0 16 26" shape-rendering="crispEdges" role="img" aria-label="Det hen har på sig">${rects}</svg>${pa('hoger', -12, 46)}${pa('vanster', 62, 46)}${pa('krok', 50, 52)}</div>`;
}
// det hen äger i byns förråd (egendom.ts): symbolen och hur mycket, namnet när man håller över. Saker utan egen stack
// (giftig svamp bland den ätliga) syns inte, som i förrådet
function stockHtml(p: Person) {
  const own = Object.entries(ownedStock(s, p)).filter(([k, n]) => n >= 0.5 && STACK[k]).sort((a, b) => b[1] - a[1]);
  if (!own.length) return '';
  const txt = fmtN;
  return `<div class="tekrad">${own.map(([k, n]) => { const title = `Äger i förrådet: ${txt(n)} ${sakNamn(k).toLowerCase()}`; return `<span class="tnod liten pa" tabindex="0" title="${esc(title)}" aria-label="${esc(title)}">${iconImg(k, 16)}<span class="antal">${txt(n)}</span></span>`; }).join('')}</div>`;
}
let kunTek: string | undefined; // tekniken vars ruta är öppen i kunskapen
// kunskap (alltid rätt) och lärdomar (det personen tror, kan vara fel). Spelaren ser vad som inte stämmer.
function knowledgeHtml(p: Person) {
  const ks = Object.entries(p.kunskap ?? {}).filter(([, e]) => e.v >= 0.05);
  const ls = (p.lardomar ?? []).slice().sort((a, b) => (b.k === 'fara' ? 1 : 0) - (a.k === 'fara' ? 1 : 0) || b.c - a.c);
  // teknik som symboler: det hen kan fullt, det hen funderar på blekt med en ring som visar hur långt hen kommit.
  // Ett tryck visar samma ruta om tekniken som i teknikfliken (tekInfo), här under symbolerna
  const tk = TEKNIK.filter(x => (p.tek?.[x.id] ?? 0) > 0.01).map(x => {
    const v = p.tek![x.id], kan = v >= 1, title = `${kan ? 'Kan göra' : 'Funderar på'} ${x.namn.toLowerCase()}${kan ? '' : ` (${Math.round(v * 100)} %)`}`;
    return `<button type="button" class="tnod liten ${kan ? 'kan' : 'pa'}${kunTek === x.id ? ' sel' : ''}" data-ptek="${x.id}" title="${esc(title)}" aria-label="${esc(title)}">${iconImg(x.id, 16)}${kan ? '' : `<svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" pathLength="100" stroke-dasharray="${Math.round(v * 100)} 100"/></svg>`}</button>`;
  });
  const rows = ks.map(([k, e]) => ({ n: KUNSKAPER[k]?.namn ?? k, v: e.v }));
  return `${tk.length ? `<h3>Teknik</h3><div class="tekrad">${tk.join('')}</div>${kunTek && (p.tek?.[kunTek] ?? 0) > 0.01 ? tekInfo(living(s), kunTek) : ''}` : ''}<h3>Kunskap</h3>${rows.length ? `<dl class="kv">${rows.map(r => `<dt>${esc(r.n)}</dt><dd>${bar(r.v, 'skill')}<span>${Math.round(r.v * 100)} %</span></dd>`).join('')}</dl>` : '<p class="muted">Ingen särskild kunskap ännu.</p>'}
      <h3>Lärdomar</h3>${ls.length ? lardomHtml(p, ls) : '<p class="muted">Inga lärdomar ännu.</p>'}`;
}
// lärdomarna som en symbol per slag (steg 3.3.6) med antalet platser, och en varning när någon av dem inte stämmer.
// Ett tryck visar platserna, vad hen tror, hur säker hen är, varifrån det kommer och om det är fel
function lardomHtml(p: Person, ls: Lardom[]) {
  const slag = [...new Set(ls.map(l => l.k))], id = (k: LKind) => `ld-${p.id}-${k}`;
  const sym = slag.map(k => {
    const d = LARDOMAR[k], n = ls.filter(l => l.k === k), fel = n.some(l => describe(s, l).wrong), title = `${cap(d.namn)}: ${n.length} ${n.length === 1 ? 'plats' : 'platser'}${fel ? ', något stämmer inte' : ''}`;
    return `<button type="button" class="tnod liten kan${hjalpOppen(id(k)) ? ' sel' : ''}" data-hjalp="${id(k)}" data-hjalp-grupp="ld-${p.id}-" title="${esc(title)}" aria-label="${esc(title)}">${tecknet(d.ikon, d.tecken)}<span class="antal">${n.length}</span>${fel ? '<span class="brist">!</span>' : ''}</button>`;
  }).join('');
  const k = slag.find(x => hjalpOppen(id(x)));
  const lista = k ? `<ul class="lard">${groups(ls.filter(l => l.k === k)).map(g => `<li class="${g[0].k === 'fara' ? 'fara' : ''}"><b>${esc(cap(describe(s, g[0]).place))}</b>${g.map(l => { const d = describe(s, l); return `<span>${esc(d.what)} <small class="muted">${d.sure}, ${esc(d.src)}</small>${d.wrong ? `<small class="fel">${esc(d.wrong)}</small>` : ''}</span>`; }).join('')}</li>`).join('')}</ul>` : '';
  return `<div class="tekrad">${sym}</div>${lista}`;
}
// vad personen brukar ägna sin vakna tid åt, i grupper efter slaget av arbete (SLAG); en handling utan slag står för sig.
// Symbolen är slagets pixelbild, annars slagets eller handlingens tecken
const HABIT_GROUPS = (() => {
  const m = new Map<string, { name: string; ikon: string; acts: Act[] }>();
  for (const a of Object.keys(ACTS) as Act[]) {
    if (a === 'sova') continue;
    const sl = ACTS[a].slag, name = sl ? SLAG[sl] : ACTS[a].namn, px = sl && slagIkon(sl);
    const ikon = px && hasIcon(px) ? iconImg(px, 16) : !sl && hasIcon('a_' + a) ? iconImg('a_' + a, 16) : `<span class="tecken">${(sl ? SLAG_TECKEN[sl] : ACTS[a].tecken) ?? '•'}</span>`;
    (m.get(name) ?? m.set(name, { name, ikon, acts: [] }).get(name)!).acts.push(a);
  }
  // en egen färg per grupp, jämnt fördelad runt färghjulet, så att samma slag alltid har samma färg
  return [...m.values()].map((g, i, all) => ({ ...g, farg: cssFarg(hsl(i * 360 / all.length, 0.45, 0.55)) }));
})();
// tårtdiagram över den vakna tiden de senaste dygnen (vanorna bleknar, seder.ts). Små delar slås ihop till Annat
const SMA = 0.04;
let tidVald: string | undefined; // namnet på delen som är markerad med ett tryck
function tidHtml(p: Person) {
  const tot = habitTotal(p) - (p.habit.sova ?? 0);
  if (!(tot > 0)) return '<p class="muted">Hen har inte hunnit göra något ännu.</p>';
  const all = HABIT_GROUPS.map(g => ({ g, v: habitShare(p, g.acts, tot) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const stora = all.filter(x => x.v >= SMA), annat = all.filter(x => x.v < SMA).reduce((a, x) => a + x.v, 0);
  const bitar = stora.map(x => ({ name: x.g.name, ikon: x.g.ikon, farg: x.g.farg, v: x.v }));
  if (annat > 0) bitar.push({ name: 'Annat', ikon: '<span class="tecken">…</span>', farg: 'var(--barbg)', v: annat });
  let vinkel = 0;
  const pt = (v: number) => `${Math.sin(v * 2 * Math.PI).toFixed(4)} ${(-Math.cos(v * 2 * Math.PI)).toFixed(4)}`;
  const tart = bitar.map((b, i) => {
    const fran = vinkel; vinkel += b.v;
    const titel = `<title>${esc(b.name)}: ${Math.round(b.v * 100)} %</title>`;
    const m = `fill="${b.farg}" data-i="${i}" data-t="${esc(b.name)}"${b.name === tidVald ? ' class="vald"' : ''}`;
    return b.v >= 0.9999 ? `<circle r="1" ${m}>${titel}</circle>` : `<path d="M0 0L${pt(fran)}A1 1 0 ${b.v > 0.5 ? 1 : 0} 1 ${pt(vinkel)}Z" ${m}>${titel}</path>`;
  }).join('');
  const vald = bitar.some(b => b.name === tidVald);
  return `<div class="tid${vald ? ' har-vald' : ''}"><svg class="tart" viewBox="-1 -1 2 2" role="img" aria-label="Vad hen ägnat sin vakna tid åt">${tart}</svg>
    <ul class="tidlista">${bitar.map((b, i) => `<li title="${esc(b.name)}: ${Math.round(b.v * 100)} %" data-i="${i}" data-t="${esc(b.name)}"${b.name === tidVald ? ' class="vald"' : ''}><span class="fg" style="background:${b.farg}"></span>${b.ikon}<span class="namn">${esc(b.name)}</span><span class="pc">${Math.round(b.v * 100)} %</span></li>`).join('')}</ul></div>
    <p class="muted small">Den vakna tiden de senaste dygnen. Tryck på en del eller en rad, eller håll musen över den, så lyser båda.</p>`;
}

// det senaste samtalet, med ämnets symbol först (steg 3.9.5)
function prat(p: Person) {
  const t = alive(p) ? pratText(s, p) : '', i = p.prat?.i;
  return t ? `<p class="why">${i && hasIcon(i) ? iconImg(i, 14) : '💬'} ${esc(t)}</p>` : '';
}
