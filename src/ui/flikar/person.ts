import { kvOf, paSigVikt, klanById, FORMAGOR, gangDelar, HALSA, Kroppsdel, KROPPSDELAR, NARING, NARINGAR, NARINGBAL, bristGrad, bristerNu, frysFaktor, naringNu, sjunker, skorbjugg, vilaTim, TORST, blodning, delSkada, halsa, skadeLista, skadeText, smarta, torstDelar } from '../../sim';
import { pratText, relationText, beskrivning, binamnInfo, INTRYCK, Intryck, IntryckTyp, anseendeText, intryckOm, LARDOMAR, LKind, anseendeSym, dodSymbol, intryckText, samlatIntryck, SKILL_STAT, gjortDygn, ACTS, ALDER, Act, DAY, Lardom, HUMOR, SKILL_GOR, STAT_GOR, Skill, Stat, coldOf, halsaLage, hearthOf, living, roomAt, temperature, varmeDelar, varmeRaknas, viloSlag, viloTak, takEffekt, SLAG, SLAG_TECKEN, Person, KUNSKAPER, SKILLS, SKILL_NAMES, STATS, STAT_NAMES, SEDER, SED_LIST, sedOppen, TEKNIK, BYN, formogenhetDelar, Ting, halvKlar, ageOf, alive, byId, childrenOf, drar, heldBy, ownedBy, PLATSER, PLATS_LIST, Plats, handOrkar, handPlatser, capacity, kvNamn, handerFor, load, utrustning, bordaIHander, type IHanden, viktOf, SAKER, ownedStock, sakNamn, slagIkon, tingNamn, STACK, describe, duty, habitShare, habitTotal, KROPP, kortTal, moodOf, num, REL, relKey, relTyper, stat, timeLabel, vidBordet, upplevelseText, uppEffekt, vuxenUpp, Upplevelse, yrkeNamn, andlighet, troOf, tolkning, teckenText, troNamn, pratarMed, gastRelationer, actIkon, utbIkon, AMNEN, type ByteMinne, type GastRel, type Slakting, stacksOf, grundvarde, tingVarde, housesOf, husVarde } from '../../sim';
import { gorText } from '../jakt';
import { figurSvg, portrattImg } from '../folkbild';
import { FARGER, farg } from '../../palett';
import { skapad } from '../utseende';
import { hasIcon, iconImg, kvSvg, tecknet } from '../../ikoner';
import { framstegSvg, ringSvg, tartFarg, tartSvg } from '../framsteg';
import { gravidDel } from '../../sim/steg';
import { LAG, byteKnapp, hallCirkel, kvOrd, clockTxt, ansStapel, ansTecken, fmtN, bar, cap, carryTxt, cssFarg, durTxt, esc, hjalpOppen, hjalpText, moodWord, pLink, prickar, relWord, sickNow, tempBar, tempOrd, trend, trendD } from '../hjalp';
import { s, ui, uppgiftVid } from '../lage';
import { tekInfo } from './teknik';
import { gastById, gastRad, type Gast } from '../gaster';
import type { Flik } from '../panel';

// allt om den valda personen i fem flikar (steg 5.3.4.1, registret FLIKAR): Om (presentationen, egenskaperna och tiden),
// Kropp (behoven och hälsan), Saker (utrustningen och förmögenheten), Människor (relationerna och ryktena) och Kunskap.
// Varje flik är delar ur registret DELAR med en rubrik var. Namnet och vad hen gör just nu står alltid överst
export const person: Flik = {
  namn: 'Person',
  html() {
    const g = gastById(ui.selected); // handlaren eller en rövare (steg 4.5.4.12): samma sida med de flikar som finns för hen
    if (g) return gastHtml(g);
    const p = byId(s, ui.selected);
    if (!p && ui.selected !== undefined && ui.selected < 0) return '<p class="muted">Hen har lämnat byn.</p>';
    if (!p) return `<p class="muted">Klicka på en person på kartan eller i listan för att se allt om hen.</p>`;
    const { flikar, flik, delar } = valda(d => alive(p) || !d.levande);
    const med = alive(p) ? pratarMed(s, p) : undefined;
    const status = alive(p) ? statusRad(p, med) : p.died !== undefined ? `Dog ${p.cause} (${timeLabel(s, p.died)})` : `Flyttade från byn (${timeLabel(s, p.left!)})`;
    return `
      <div class="phead">${portrattImg(skapad(s, p), "big stor")}<div><h2>${esc(p.name)}${binamnHtml(p)}${alive(p) ? prickar(p) : ''}${anseende(p)}</h2>${binamnForkl(p)}
      <p class="status">${status}${alive(p) && gravidText(p) ? ` · ${esc(gravidText(p))}` : ''}</p></div></div>
      ${flikRad(flikar, flik)}
      ${delar.map((d, i) => delHtml(d, i, d.kort?.(p), () => d.html(p))).join('')}`;
  },
  klick(el) {
    const ti = el.closest<HTMLElement>('.tid [data-t]');
    if (ti) { tidVald = tidVald === ti.dataset.t ? undefined : ti.dataset.t; return true; }
    const tg = el.closest<HTMLElement>('[data-ptek]'); // en teknik i kunskapen: rutan om den visas eller döljs
    if (tg) { kunTek = kunTek === tg.dataset.ptek ? undefined : tg.dataset.ptek; return true; }
    const f = el.closest<HTMLElement>('[data-pfall]'); // en dels rubrik: fäll ut eller ihop (steg 5.3.4.2)
    if (f) { const id = f.dataset.pfall!; ui.personFall[id] = !utfalld(id, f.dataset.forst === '1'); return true; }
    const b = el.closest<HTMLElement>('[data-pdel]');
    if (!b) return false;
    ui.personDel = b.dataset.pdel!;
    return true;
  },
};

// underflikarna i personrutan: symbolen på knappen, namnet (vid musen och som rubrik) och innehållet.
// levande = visas bara för den som lever (en död eller utflyttad har inga behov och lägger ingen tid på något).
// gast = samma flik för en gäst (gaster.ts, steg 4.5.4.12); en flik utan den visas inte för en gäst
// kort = sammanfattningen på rubriken (steg 5.3.4.2), som syns också när delen är hopfälld
interface Del { id: string; tecken: string; namn: string; levande?: true; html(p: Person): string; kort?(p: Person): string; gast?(g: Gast): string }
interface PFlik { id: string; tecken: string; namn: string; delar: string[] }
const FLIKAR: PFlik[] = [
  { id: 'om', tecken: '🪪', namn: 'Om', delar: ['pres', 'tid'] },
  { id: 'egen', tecken: '{sym_egenskaper}', namn: 'Egenskaper', delar: ['egen'] }, // en egen flik igen (steg 6.9.10)
  { id: 'kropp', tecken: '❤️', namn: 'Kropp', delar: ['behov', 'halsa'] },
  { id: 'saker', tecken: '🎒', namn: 'Saker', delar: ['utr', 'form'] },
  { id: 'folk', tecken: '👥', namn: 'Människor', delar: ['rel', 'ryk'] },
  { id: 'kun', tecken: '🧠', namn: 'Kunskap', delar: ['kun'] },
];
// flikarna som har något att visa, den öppna (ui.personDel är fliken eller en del i den) och dess delar
function valda(finns: (d: Del) => boolean) {
  const delarI = (f: PFlik) => f.delar.map(id => DELAR.find(d => d.id === id)!).filter(finns);
  const flikar = FLIKAR.filter(f => delarI(f).length);
  const flik = flikar.find(f => f.id === ui.personDel || f.delar.includes(ui.personDel)) ?? flikar[0];
  return { flikar, flik, delar: delarI(flik) };
}
// en del: rubriken med symbolen, namnet och sammanfattningen, och resten när den är utfälld (steg 5.3.4.2).
// Fliken minns vad som är utfällt (ui.personFall); från början är flikens första del utfälld (och den man valt) och de andra hopfällda
const utfalld = (id: string, forst: boolean) => ui.personFall[id] ?? forst;
function delHtml(d: Del, i: number, kort: string | undefined, html: () => string) {
  const forst = i === 0 || ui.personDel === d.id, ut = utfalld(d.id, forst); // en del man valt direkt är också utfälld från början
  return `<h3 class="delrub klick" data-pfall="${d.id}" data-forst="${forst ? 1 : 0}" role="button" tabindex="0" aria-expanded="${ut}" title="${ut ? 'Tryck för att fälla ihop' : 'Tryck för att fälla ut'}"><span class="dtk">${d.tecken}</span>${d.namn}${kort ? `<span class="kort">${kort}</span>` : ''}<span class="pil">${ut ? '▾' : '▸'}</span></h3>${ut ? `<div class="delinne">${html()}</div>` : ''}`;
}
const flikRad = (delar: PFlik[], del: PFlik) => `<div class="pdelar" role="tablist">${delar.map(d => `<button type="button" role="tab" data-pdel="${d.id}" aria-selected="${d === del}" title="${d.namn}" aria-label="${d.namn}">${d.tecken}</button>`).join('')}</div>`;
const DELAR: Del[] = [
  { id: 'pres', tecken: '🪪', namn: 'Presentation', html: presHtml, kort: p => `${Math.floor(ageOf(p, s.now))} år · ${esc(yrkeNamn(s, p) ?? '–')}`, gast: gastPres },
  { id: 'behov', tecken: '❤️', namn: 'Behov', levande: true, html: behovHtml, kort: p => moodWord(moodOf(p, s.now)), gast: gastBehov },
  { id: 'halsa', tecken: '🩺', namn: 'Hälsa', levande: true, html: halsaHtml, kort: halsaKort, gast: gastHalsa },
  { id: 'egen', tecken: '{sym_egenskaper}', namn: 'Egenskaper', html: egenHtml, kort: egenKort, gast: gastEgen },
  { id: 'tid', tecken: '🕓', namn: 'Tiden', levande: true, html: tidHtml, kort: tidKort, gast: gastTid },
  { id: 'utr', tecken: '🎒', namn: 'Utrustning', levande: true, html: p => `<p class="muted">${carryTxt(p)}</p>${gearHtml(p)}`, kort: p => { const u = utrustning(s, p, false), n = PLATS_LIST.filter(k => u[k].ting).length; return n ? `${n} på sig` : 'Inget på sig'; }, gast: gastUtr },
  { id: 'form', tecken: '💰', namn: 'Förmögenhet', html: formogenhetLista, kort: p => String(Math.round(formogenhetDelar(s, p.id).sum)) },
  { id: 'kun', tecken: '🧠', namn: 'Kunskap', html: knowledgeHtml, kort: p => { const n = Object.values(p.tek ?? {}).filter(v => v >= 1).length; return n === 1 ? '1 teknik' : `${n} tekniker`; }, gast: gastKun },
  { id: 'rel', tecken: '👥', namn: 'Relationer', html: relHtml, kort: p => { const n = s.people.filter(q => q.id !== p.id && alive(q) && s.rels[relKey(p.id, q.id)]).length; return `känner ${n}`; }, gast: gastRel },
  { id: 'ryk', tecken: '🗣️', namn: 'Rykten', html: ryktenHtml, kort: p => { const a = anseendeSym(s, p.id); return a === '😇' ? 'Gott anseende' : a === '😈' ? 'Dåligt anseende' : a ? 'Blandat anseende' : 'Inget rykte'; }, gast: gastRyk },
];
// sammanfattningarna (steg 5.3.4.2): det som syns på rubriken
// den som väntar barn (steg 8.1.11): i sammanfattningen överst och i fliken Hälsa, med hur långt det har gått
const gravidText = (p: Person) => { const d = gravidDel(p, s.now); return d === undefined ? '' : `väntar barn, ${Math.round(d * 100)} % av tiden`; };
function halsaKort(p: Person) {
  const n = skadeLista(p, s.now).length, l = halsaLage(p, s.now);
  const lage = l === 'svalt' ? 'svälter' : l === 'frys' ? 'fryser' : l === 'torst' ? 'törstar' : l === 'laker' ? 'läker' : '';
  return [n ? `${n} ${n === 1 ? 'skada' : 'skador'}` : '', lage, gravidText(p)].filter(Boolean).join(' · ') || 'Frisk';
}
function egenKort(p: Person) {
  const k = STATS.slice().sort((a, b) => stat(p, b, s.now) - stat(p, a, s.now))[0];
  return k ? `Bäst: ${STAT_NAMES[k].toLowerCase()}` : '';
}
function tidKort(p: Person) {
  const tot = habitTotal(p) - (p.habit.sova ?? 0);
  if (!(tot > 0)) return '';
  const g = HABIT_GROUPS().map(g => ({ g, v: habitShare(p, g.acts, tot) })).sort((a, b) => b.v - a.v)[0];
  return g && g.v > 0 ? `mest ${esc(g.g.name.toLowerCase())}` : '';
}

// en gäst (steg 4.5.4.12): samma huvud och flikrad som en bybo, och i flikarna det man vet om hen
function gastHtml(g: Gast) {
  const { flikar, flik, delar } = valda(d => !!d.gast);
  return `
      <div class="phead"><span class="dot big" style="background:${cssFarg(g.farg)}"></span><div><h2>${esc(g.namn)}</h2><p class="status">${esc(g.gor)}</p></div></div>
      ${flikRad(flikar, flik)}
      ${delar.map((d, i) => delHtml(d, i, undefined, () => d.gast!(g))).join('')}`;
}
// gästens familj i hemklanen (steg 4.5.7.6, 4.5.7.7): namnen, och de som dött märkta
const slakt = (g: Gast, roll: Slakting['roll'][]) => g.liv.familj.filter(f => roll.includes(f.roll)).map(f => `${esc(f.namn)}${f.dog !== undefined ? ' <span class="muted">(död)</span>' : ''}`).join(', ') || '–';
function gastPres(g: Gast) {
  return `<p class="besk">${esc(g.liv.beskrivning)}</p><dl class="kv fam"><dt>${g.sex === 'k' ? 'Kvinna' : 'Man'}</dt><dd>${g.liv.alder} år${g.fran ? ` · från ${esc(g.fran)}` : ''}</dd><dt>Yrke</dt><dd>${esc(g.sort)}</dd>
      <dt>Föräldrar</dt><dd>${slakt(g, ['mor', 'far'])}</dd><dt>Partner</dt><dd>${slakt(g, ['partner'])}</dd><dt>Barn</dt><dd>${slakt(g, ['barn'])}</dd>${g.rader.map(gastRad).join('')}</dl>
      <h3>Viktiga händelser</h3>${g.handelser.length ? `<ul class="fame">${g.handelser.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : '<p class="muted">Inget som minns ännu.</p>'}${bytenHtml(g.byten)}`;
}
// bytena hen var med i (steg 4.5.4.17), de senaste först: vem som gav vad, som symboler. Handslaget visar hela bytet
function bytenHtml(b: ByteMinne[] | undefined) {
  if (!b?.length) return '';
  const sida = (namn: string, v: ByteMinne['ag']) => `${esc(namn)} ${v.map(w => `<span title="${esc(`${w.n} ${sakNamn(w.k).toLowerCase()}`)}">${iconImg(w.k, 12)}${w.n > 1 ? w.n : ''}</span>`).join(' ') || '–'}`;
  return `<h3>Byten</h3><ul class="fame">${b.slice().reverse().map(m => `<li><span class="muted">${esc(clockTxt(m.t))}</span> ${m.avbruten ? `${esc(m.an)} {sym_nej} ${esc(m.bn)}` : `${sida(m.an, m.ag)} ⇄ ${sida(m.bn, m.bg)}`}${byteKnapp(m.nr)}</li>`).join('')}</ul>`;
}
function gastEgen(g: Gast) {
  const rad = (namn: string, v: number) => `<dt>${namn}</dt><dd>${bar(v / 20)}<span>${visa(v)}</span></dd>`;
  const st = STATS.filter(k => g.stats[k] !== undefined).map(k => rad(STAT_NAMES[k], g.stats[k]!)).join(''), sk = SKILLS.filter(k => g.skills[k] !== undefined).map(k => rad(SKILL_NAMES[k], g.skills[k]!)).join('');
  const vet = '<p class="muted">Byn vet inget om det.</p>';
  return `${st ? `<dl class="kv">${st}</dl>` : vet}<h3>Färdigheter</h3>${sk ? `<dl class="kv">${sk}</dl>` : vet}`;
}
// gästens behov (steg 4.5.7.6): humöret efter livet hemma (gastliv.ts); hunger, törst och sömn klarar hen själv på resan
function gastBehov(g: Gast) {
  return `<dl class="kv"><dt>Humör</dt><dd>${bar(g.liv.humor)}<span>${moodWord(g.liv.humor)}</span></dd></dl>
      <p class="muted small">${esc(g.namn)} bär det hen behöver för resan. Mat, vatten och sömn ordnar hen själv, utanför byn.</p>`;
}
// hälsan: blodet (rövarna i en strid) och de gamla skadorna ur livet
function gastHalsa(g: Gast) {
  const skador = g.liv.liv.filter(l => l.k === 'skadad');
  return `<dl class="kv"><dt>Hälsa</dt><dd>${bar(g.blod ?? 1)}<span>${(g.blod ?? 1) >= 0.99 ? 'Frisk' : (g.blod ?? 1) > 0.5 ? 'Skadad' : 'Svårt skadad'}</span></dd></dl>
      <h3>Gamla skador</h3>${skador.length ? `<ul class="fame">${skador.map(l => `<li><span class="muted">${l.ar} år</span> ${esc(l.text)}, läkt</li>`).join('')}</ul>` : '<p class="muted">Inga.</p>'}`;
}
// tiden: livet i hemklanen, år för år (steg 4.5.7.7), och det som hänt i byn
function gastTid(g: Gast) {
  return `<ul class="fame">${g.liv.liv.slice().reverse().map(l => `<li><span class="muted">${l.ar} år</span> ${esc(l.text)}</li>`).join('')}</ul>
      ${g.handelser.length ? `<h3>I byn</h3><ul class="fame">${g.handelser.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}`;
}
function gastKun(g: Gast) {
  return g.liv.kan.length ? `<ul class="fame">${g.liv.kan.map(k => `<li>${esc(cap(k === 'handla' ? 'handla och värdera varor' : k))}</li>`).join('')}</ul>` : '<p class="muted">Byn vet inte vad hen kan.</p>';
}
// relationerna: familjen i hemklanen (de levande först)
function gastRel(g: Gast) {
  const ORD: Record<Slakting['roll'], [string, string]> = { mor: ['Mor', 'Mor'], far: ['Far', 'Far'], syskon: ['Syster', 'Bror'], partner: ['Hustru', 'Man'], barn: ['Dotter', 'Son'] };
  const f = g.liv.familj.slice().sort((a, b) => +(a.dog !== undefined) - +(b.dog !== undefined));
  const byn = (g.rel ?? []).filter(x => alive(x.p)).sort((a, b) => b.r.n - a.r.n || Math.abs(b.r.op) - Math.abs(a.r.op)).slice(0, 10);
  return `${byn.length ? `<h3>I byn</h3><ul class="rels">${byn.map(x => gastRelRad(pLink(x.p), x.r, x.g)).join('')}</ul>` : ''}<h3>I ${esc(g.fran ?? 'hemklanen')}</h3><ul class="rels">${f.map(q => `<li><span>${esc(q.namn)}</span><span class="muted">${ORD[q.roll][q.sex === 'k' ? 0 : 1]}${q.dog !== undefined ? ', död' : ''}</span></li>`).join('')}</ul>`;
}
// en relation mellan en gäst och en bybo (steg 4.5.7.11, gastrel.ts): ordet för vad de tycker, irritationen och lurendrejeriet,
// och vid musen hur mycket handlaren gillar bybon
const opOrd = (op: number) => op > REL.naraVan ? 'Nära vän' : op > REL.vanOrd ? 'Vän' : op > REL.osams ? 'Bekant' : op > REL.ovan ? 'Ogillar' : 'Ovän';
function gastRelRad(namn: string, r: GastRel, g?: number, gast?: boolean, klan?: string) {
  const mer = [r.irr > 0.05 ? 'irriterad' : '', r.lurad ? `lurade bybon ${r.lurad} ${r.lurad === 1 ? 'gång' : 'gånger'}` : '', r.lurat ? `blev lurad ${r.lurat} ${r.lurat === 1 ? 'gång' : 'gånger'}` : ''].filter(Boolean).join(', ');
  const title = `${opOrd(r.op)}${g === undefined ? '' : `. Handlaren ${g > 0.25 ? 'gillar' : g < -0.25 ? 'ogillar' : 'har inget särskilt emot'} bybon${g > 0.25 ? ' och kräver lite mindre' : g < -0.25 ? ' och kräver mer' : ''}`}`;
  return `<li>${namn}${gast ? ' <span class="muted small">gäst</span>' : ''}<span class="rw ${r.op < REL.osams || r.irr > 0.05 ? 'neg' : r.op > REL.vanOrd ? 'pos' : ''}" title="${esc(title)}">${opOrd(r.op)}</span><span class="muted">${r.n} ${r.n === 1 ? 'affär' : 'affärer'}${mer ? ` · ${esc(mer)}` : ''}</span>${klan ? `<span class="muted small">${esc(klan)}</span>` : ''}</li>`;
}
function gastRyk(g: Gast) {
  return `<p class="muted">Byn har inga rykten om ${esc(g.namn)}. Hen är ${g.sort === 'Rövare' ? 'en främling som kommer för att ta' : 'en gäst som kommer och går'}.</p>`;
}
function gastUtr(g: Gast) {
  return `<ul class="fame">${g.bar.map(b => `<li title="${esc(b.title)}">${hasIcon(b.ikon) ? iconImg(b.ikon, 16) + ' ' : ''}${b.text}</li>`).join('') || '<li class="muted">Bär inget</li>'}</ul>`;
}

// en övertygelse: personen drar en sed minst så här mycket åt ena hållet (ett helt steg är 1, seder.ts)
const OVERTYGAD = 0.35;
function presHtml(p: Person) {
  const a = ageOf(p, s.now), kids = childrenOf(s, p), d = drar(s, p);
  const tro = SED_LIST.filter(k => sedOppen(s, k) && Math.abs(d[k]) >= OVERTYGAD).sort((x, y) => Math.abs(d[y]) - Math.abs(d[x]))
    .map(k => { const sed = SEDER[k], namn = d[k] > 0 ? sed.pos : sed.neg; return `<span class="tro" title="${esc(sed.effect)}">${esc(namn)}</span>`; });
  return `<p class="besk">${esc(beskrivning(s, p))}</p><dl class="kv fam"><dt>${p.sex === 'k' ? 'Kvinna' : 'Man'}</dt><dd>${Math.floor(a)} år · född ${timeLabel(s, p.born)}${p.fran !== undefined ? ` · från ${esc(klanById(s, p.fran)?.namn ?? 'en grannklan')}` : ''}</dd>
      <dt>Yrke</dt><dd>${esc(yrkeNamn(s, p) ?? '–')}${p.tag && yrkeNamn(s, p) !== p.tag ? ` <span class="muted">(${esc(p.tag.toLowerCase())})</span>` : ''}</dd>
      <dt>Föräldrar</dt><dd>${p.mother || p.father ? [byId(s, p.mother), byId(s, p.father)].filter(Boolean).map(q => pLink(q)).join(' och ') : 'Bland de första i byn'}</dd>
      <dt>Partner</dt><dd>${pLink(byId(s, p.partner))}</dd><dt>Barn</dt><dd>${kids.length ? kids.map(pLink).join(', ') : '–'}</dd>
      <dt>Övertygelser</dt><dd>${tro.length ? tro.join(' ') : '–'}</dd>${alive(p) ? gangRad(p) : ''}</dl>
      <h3>Viktiga händelser</h3>${p.fame.length ? `<ul class="fame">${p.fame.map(f => `<li>${esc(f.replace(/^Kom på /, 'Uppfann '))}</li>`).join('')}</ul>` : '<p class="muted">Inget som minns ännu.</p>'}
      ${bytenHtml(p.byten)}${livet(p)}`;
}
// gångfarten (steg 3.10.10, i presentationen sedan steg 9.2.28): som del av en frisk vuxens på en stig, och raderna i
// registret som ändrar den just nu (gangDelar: skadorna, bördan, marken, åldern) när man trycker på den. Rörligheten, kroppens
// förmåga, står kvar under Hälsa
function gangRad(p: Person) {
  const gf = gangDelar(s, p);
  return rad(p, 'gang', '🚶 Gångfart', `${bar(gf.fart, gf.fart < LAG.halsa ? 'low' : '')}<span>${Math.round(gf.fart * 100)} %</span>`, gf.delar.map(d => ({ namn: `${d.tecken} ${d.namn}`, v: d.v })), ' %',
    'Hur fort hen går, mot en frisk vuxen på kort gräs eller en stig. Det som drar ner farten tas gånger varandra.');
}
// Livet (steg 4.1.1.2): upplevelserna från barndomen och från vuxenlivet, var för sig
function livet(p: Person) {
  const ande = (u: Upplevelse) => u.n ? `${u.e && Object.keys(u.e).length ? ', ' : ''}Andlighet ${u.n > 0 ? '+' : '−'}${Math.abs(u.n)}` : ''; // syns från början (steg 4.5.3.4)
  const rad = (u: Upplevelse) => `<li>${u.a} år: ${esc(upplevelseText(u))} <span class="muted">${esc(effektText(u.e) + ande(u))}</span></li>`;
  const barn = (p.upp ?? []).filter(u => !vuxenUpp(u)), vuxen = (p.upp ?? []).filter(vuxenUpp);
  if (!barn.length && !vuxen.length) return '';
  return `<h3>Livet</h3>${barn.length ? `<p class="muted">Barndomen</p><ul class="fame">${barn.map(rad).join('')}</ul>` : ''}${vuxen.length ? `<p class="muted">Vuxenlivet</p><ul class="fame">${vuxen.map(rad).join('')}</ul>` : ''}`;
}
// förmögenheten (steg 3.6.4, som en lista sedan steg 6.9.11): allt hen äger, som i ett lager: symbol, namn, antal, kvalitet,
// hållbarhet och värdet sist (ungefär i arbetstimmar, varde.ts). Redskapen och kläderna en rad var, andelarna i förrådet en rad
// per slag och husen. Summan står överst
function formogenhetLista(p: Person) {
  const v = (n: number) => String(Math.round(n));
  type Rad = { ikon: string; namn: string; n: string; kv: string; q?: number; c?: number; varde: number };
  const rader: Rad[] = [];
  for (const t of ownedBy(s, p)) rader.push({ ikon: iconImg(t.halv ? t.halv.gor : t.k, 16), namn: t.halv ? `${sakNamn(t.halv.gor)} (inte klar)` : sakNamn(t.k), n: '1', kv: t.halv ? '' : kvOrd(t), q: t.halv ? undefined : t.q, c: t.halv ? undefined : t.c, varde: tingVarde(t) });
  const andel = new Map<string, { n: number; c: number }>();
  for (const a of stacksOf(s)) { const m = a.ag?.[p.id] ?? 0; if (m <= 0) continue; const x = andel.get(a.k) ?? { n: 0, c: 0 }; x.n += m; x.c += m * a.c; andel.set(a.k, x); }
  for (const [k, x] of andel) if (x.n >= 0.5) rader.push({ ikon: iconImg(k, 16), namn: sakNamn(k), n: fmtN(x.n), kv: '', c: x.c / x.n, varde: x.n * grundvarde(k) });
  for (const h of housesOf(s)) if (h.ag === p.id) rader.push({ ikon: '<span class="tecken">🏠</span>', namn: 'Hus', n: '1', kv: '', varde: husVarde(s, h) });
  rader.sort((a, b) => (ui.kvSort ? kvOf(b) - kvOf(a) : 0) || b.varde - a.varde); // efter kvaliteten med ett tryck på rubriken (steg 9.2.18)
  const sum = formogenhetDelar(s, p.id).sum;
  if (!rader.length) return '<p class="muted">Äger inget.</p>';
  return `<p class="muted small" title="Ungefär i arbetstimmar: det det tar att skaffa eller göra sakerna">Värt ${v(sum)} sammanlagt. <span class="tryck" data-kvsort="1">${ui.kvSort ? '↓ kvalitet' : 'Sortera efter kvalitet'}</span></p>
    <table class="agtab"><tbody>${rader.map(r => `<tr><td>${r.ikon}</td><td>${esc(r.namn)}</td><td class="tal">${r.n}</td><td>${r.kv}</td><td>${r.c === undefined ? '' : hallCirkel(r.c)}</td><td class="tal" title="Värde, ungefär i arbetstimmar">${v(r.varde)}</td></tr>`).join('')}</tbody></table>`;
}
// egenskaper och färdigheter räknas 0–20 men visas på skalan 0–10 (steg 3.10.5): bara visningen ändras
const SKALA = 2;
const visa = (v: number, d = 1) => { const x = v / SKALA; return Number.isInteger(x) ? String(x) : num(x, d); };
// det en upplevelse gjorde med egenskaperna (steg 3.1.2, uppvaxt.ts), till exempel "Mod −1, Uthållighet +0,5"
const plusMinus = (v: number) => (v > 0 ? '+' : '−') + visa(Math.abs(v));
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
  return `<dt class="klick" data-hjalp="${id}" title="${esc(title)}" tabindex="0" role="button">${namn}</dt><dd class="klick" data-hjalp="${id}" title="${esc(title)}">${inner}</dd>
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
  // bara det som räknas vid personens värme (varmeRaknas i steg.ts): under idealet elden, kylan och milt väder, vid och över
  // det hettan, det som kyler mer än elden värmer och att kroppen svalnar (steg 2.3.4)
  const r = varmeRaknas(p.warm, v);
  const kylan = `Kylan, ${Math.round(temp)} grader${v.shelter > 0 ? `, huset skyddar ${Math.round(v.shelter * 100)} %` : ''}${v.fall > 0 ? `, skinnfällen ${Math.round(v.fall * 100)} %` : ''}${v.klad > 0 ? `, kläderna ${Math.round(v.klad * 100)} %` : ''}${frysFaktor(p) > 1 ? `, brist på fett: ${Math.round((frysFaktor(p) - 1) * 100)} % mer` : ''}${v.vaderGrader > 0.5 ? `, ${v.blot > 0.1 ? 'blöt' : 'blåsten'}: känns ${Math.round(v.vaderGrader)} grader kallare` : ''}`;
  const varme: Orsak[] = r.under ? [
    ...v.eld > 0 ? [{ namn: 'Elden värmer', v: v.eld }] : [],
    ...v.kyla > 0 ? [{ namn: kylan, v: -v.kyla }] : [],
    ...v.mild > 0 ? [{ namn: `Milt väder, ${Math.round(temp)} grader`, v: v.mild }] : [],
  ] : [
    ...r.netto < 0 ? [{ namn: v.eld > 0 || v.mild > 0 ? `${kylan} (mer än ${v.eld > 0 ? 'elden' : 'vädret'} värmer)` : kylan, v: r.netto }] : [],
    ...v.sol > 0 ? [{ namn: `Solen, ${Math.round(temp)} grader`, v: v.sol }] : [],
    ...v.kladHetta > 0 ? [{ namn: 'Kläderna värmer', v: v.kladHetta }] : [],
    ...v.eldHetta > 0 ? [{ namn: 'Sitter tätt vid elden', v: v.eldHetta }] : [],
    ...r.svalnar > 0 ? [{ namn: 'Svalnar', v: -r.svalnar }] : [],
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
// fliken Hälsa (steg 2.5.3, figuren sedan steg 5.3.4.3): kroppen som samma figur som på kartan (folkbild.ts), utan kläder.
// Bildens vänstra sida är personens högra. En hel del har sin hudfärg; en skadad går mot senap och sedan mörkare rost ju mer
// skadad den är (delSkada); ett tryck eller musen visar vad som är fel just där. Under kroppen listan över skadorna
// (skadeLista) och förmågorna som staplar under rubriken Status (FORMAGOR, och gångfarten ur GANGFART)
const ZONDEL: Record<string, [Kroppsdel, Kroppsdel]> = { huvud: ['huvud', 'huvud'], bal: ['bal', 'bal'], balte: ['bal', 'bal'], armar: ['armH', 'armV'], hand: ['handH', 'handV'], ben: ['benH', 'benV'], fotter: ['fotH', 'fotV'] };
const FIGMITT = 7; // figurens mitt i punkter (14 breda): till vänster om den är personens högra sida
const SKADEFARG = { latt: 0.34, svar: 0.67 }; // senap under latt, rost en ton mörkare under svar, och två toner mörkare över
function skadeFarg(f: number, ton: number) {
  return f < SKADEFARG.latt ? farg('senap', ton as 0) : farg('rost', Math.max(0, ton - (f < SKADEFARG.svar ? 1 : 2)) as 0);
}
function halsaHtml(p: Person) {
  const rader = skadeLista(p, s.now), delar = (Object.keys(KROPPSDELAR) as Kroppsdel[]).filter(d => !(KROPPSDELAR[d] as { under?: string }).under);
  const vad = (d: Kroppsdel) => rader.filter(r => r.d === d || (KROPPSDELAR[r.d] as { under?: string }).under === d); // de finare delarna syns på delen de sitter på (steg 8.2.1)
  const titel = (d: Kroppsdel) => `${KROPPSDELAR[d].namn}: ${vad(d).length ? vad(d).map(x => `${x.namn.split(' i ')[0].toLowerCase()}, ${x.grad}`).join('; ') : 'hel'}`;
  const q = skapad(s, p), naken = { ...q, klader: { rock: null, skor: false, balte: false }, del: { ...q.del, redskap: null, huvudbonad: null } };
  const gubbe = figurSvg(naken, 'gubbe', 'Kroppen', {
    del: (z, x) => ZONDEL[z]?.[x < FIGMITT ? 0 : 1],
    farg: (d, v) => { const f = delSkada(p, d as Kroppsdel); return f > 0.02 ? skadeFarg(f, v % 4) : FARGER[v]; },
    attr: d => `class="klick${hjalpOppen(`k-${d}-${p.id}`) ? ' vald' : ''}" data-hjalp="k-${d}-${p.id}" data-hjalp-grupp="k-"`,
    titel: d => esc(titel(d as Kroppsdel)),
  });
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
  return `<div class="kropp">${gubbe}${oppen ? `<div class="kroppinfo">${oppen}</div>` : ''}</div>
    <h3>Det som är fel</h3>${lista}<h3>Status</h3><dl class="kv">${formagor}</dl><h3>Näring</h3><dl class="kv">${vatska}${naring}</dl>`;
}
// det en egenskap eller färdighet gör: arbetena som går fortare (ACTS) och raderna i STAT_GOR och SKILL_GOR
function gorHtml(rader: string[], nu: string, extra = '') {
  return `<dd class="forkl"><p class="muted">${esc(nu)}</p>${extra}${rader.length ? `<ul class="thoughts">${rader.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}</dd>`;
}
// det hen gjort med färdigheten (steg 3.10.6, SKILL_STAT): det senaste dygnet och totalt, och för en del av något
// (fisk av försöken) hur stor del det var. Hela tal, så att 2,4 grillade portioner blir 2
function gjortHtml(p: Person, k: Skill) {
  const tal = (v: number) => String(Math.round(v)), rader = SKILL_STAT[k].filter(r => p.gjort?.n[r.k]);
  if (!rader.length) return '';
  return `<p class="muted">Det senaste dygnet (24 timmar, ett år i spelet) och totalt:</p><ul class="thoughts">${rader.map(r => {
    const d = gjortDygn(s, p, r.k), n = p.gjort!.n[r.k], av = r.av ? gjortDygn(s, p, r.av) : 0, avN = r.av ? p.gjort!.n[r.av] ?? 0 : 0;
    const del = (x: number, y: number) => y > 0 ? ` av ${tal(y)} (${Math.min(100, Math.round(100 * x / y))} %)` : '';
    return `<li>${esc(r.namn)}: ${tal(d)}${del(d, av)}, totalt ${tal(n)}${del(n, avN)}</li>`;
  }).join('')}</ul>`;
}
const arbetar = (sk: string[]) => sk.length ? [`Hur mycket hen får ut av arbetet: ${sk.map(k => SKILL_NAMES[k as Skill].toLowerCase()).join(', ')}`] : [];
function ovarNu(p: Person, k: Skill) {
  const d = p.task && ACTS[p.task.act];
  return !!d && p.task!.phase === 'do' && (d.arbete === k || d.ovar === k || (k === 'hantverk' && !!d.hantverk));
}
function egenHtml(p: Person) {
  const now = s.now, d = duty(s, p);
  const statRad = (k: Stat) => {
    const v = stat(p, k, now), id = `e-${k}-${p.id}`, per = stat(p, k, now + DAY) - v; // ett dygn = ett år
    const nu = Math.abs(per) < 0.005 ? 'Ändras inte med åldern just nu.' : `${per > 0 ? 'Växer' : 'Sjunker'} med åldern: ${per > 0 ? '+' : '−'}${visa(Math.abs(per), 2)} om året.`;
    // det som format egenskapen i barndomen (steg 3.1.2): upplevelserna och anlagen hen föddes med
    const upp = (p.upp ?? []).filter(u => u.e[k]).map(u => `${vuxenUpp(u) ? 'Minne' : 'Minne från barndomen'} (${u.a} år): ${upplevelseText(u)}, ${plusMinus(u.e[k]!)}`);
    const anlag = p.anlag && uppEffekt(p, k) ? ` Anlaget är ${visa(p.anlag[k])}; upplevelserna flyttar det ${plusMinus(Math.round(uppEffekt(p, k)))}.` : '';
    const rader = [...upp, ...arbetar(SKILLS.filter(sk => ACTS[sk as Act]?.egenskap === k)), ...STAT_GOR[k]];
    return `<dt class="klick" data-hjalp="${id}" title="${esc(rader.join(', '))}" tabindex="0" role="button">${STAT_NAMES[k]}</dt><dd class="klick" data-hjalp="${id}" title="${esc(rader.join(', '))}">${bar(v / 20)}<span>${visa(v)}</span></dd>${hjalpText(id, gorHtml(rader, nu + anlag))}`;
  };
  const skillRad = (k: Skill) => {
    const v = p.skill[k], id = `f-${k}-${p.id}`, tr = trend(p, 'sk_' + k, v), dd = trendD(p, 'sk_' + k);
    const nu = ovarNu(p, k) ? `Övar just nu${dd ? `: ${dd > 0 ? '+' : ''}${visa(dd, 2)} i timmen` : ''}.` : dd ? `Har ändrats ${visa(dd, 2)} i timmen den senaste stunden.` : 'Ändras inte just nu. Den växer när hen övar.';
    const rader = [...arbetar(ACTS[k as Act]?.arbete === k ? [k] : []), ...SKILL_GOR[k]];
    return `<dt class="klick" data-hjalp="${id}" title="${esc(rader.join(', '))}" tabindex="0" role="button">${SKILL_NAMES[k]}</dt><dd class="klick" data-hjalp="${id}" title="${esc(rader.join(', '))}">${bar(v / 20, 'skill', tr)}<span>${visa(v)}</span></dd>${hjalpText(id, gorHtml(rader, nu, gjortHtml(p, k)))}`;
  };
  // andligheten (steg 4.1.1.1) syns från början, så att man ser den växa (steg 4.5.3.4)
  const ande = (() => {
    const v = andlighet(s, p), id = `e-andlig-${p.id}`, rader = ['Hur viktigt det heliga är för hen, inte vad hen tror på', 'Ärvs delvis från föräldrarna och flyttas av det hen är med om', ...(p.upp ?? []).filter(u => u.n).map(u => `${upplevelseText(u)} (${u.a} år), ${u.n! > 0 ? '+' : '−'}${Math.abs(u.n!)}`)];
    return `<dt class="klick" data-hjalp="${id}" title="${esc(rader.join(', '))}" tabindex="0" role="button">Andlighet</dt><dd class="klick" data-hjalp="${id}" title="${esc(rader.join(', '))}">${bar(v / 100)}<span>${Math.round(v)}</span></dd>${hjalpText(id, gorHtml(rader, 'Skalan går från 0 till 100.'))}`;
  })();
  // tron hen har (steg 4.1.2.1): vem som står bakom, och vid tryck tolkningen och tecknet den kom ur
  const tr = troOf(s, p.tro), tro = tr ? (() => {
    const id = `e-tro-${p.id}`, rader = [...tr.ber ? [tr.ber] : [tolkning(tr)], `${tr.grundare === p.id ? 'Hen' : tr.gnamn} tolkade ${teckenText(tr.k, tr.om)} som ett tecken`, `Tron är ${Math.round(p.troStyrka ?? 0)} av 100 stark hos hen`];
    return `<dt class="klick" data-hjalp="${id}" title="${esc(rader.join('. '))}" tabindex="0" role="button">Tro</dt><dd class="klick" data-hjalp="${id}" title="${esc(rader.join('. '))}">${bar((p.troStyrka ?? 0) / 100)}<span>${tr.sym ? tecknet(tr.sym, '') + ' ' : ''}${esc(troNamn(tr))}</span></dd>${hjalpText(id, gorHtml(rader.slice(1), rader[0]))}`;
  })() : '';
  return `<dl class="kv">${STATS.map(statRad).join('')}${ande}${tro}
      ${ageOf(p, now) >= ALDER.hjalper ? `<dt>Pliktkänsla</dt><dd>${bar(d, 'skill')}<span>${d > 0.75 ? 'Plikttrogen' : d > 0.5 ? 'Gör sin del' : d > 0.3 ? 'Bekväm' : 'Lat'}</span></dd>` : ''}</dl>
      <h3>Färdigheter</h3><dl class="kv">${SKILLS.map(skillRad).join('')}</dl>`;
}
// relationerna med typerna som symboler (steg 3.1.1, RELATIONER i relationer.ts): ett tryck på symbolen visar varför.
// De med en särskild typ (partner, bästa vän, ärkefiende, mentor, rival) först, sedan de starkaste
function relHtml(p: Person) {
  return relInne(p) + utanforHtml(p);
}
// gästerna bybon har en relation till (steg 4.5.7.11): handlaren som är i byn står också i listan ovanför, märkt gäst, och alla
// under "Utanför byn" längst ner, hopfällt
function utanforHtml(p: Person) {
  const g = gastRelationer(s, p);
  if (!g.length) return '';
  const id = `utanfor-${p.id}`, h = s.handlare;
  const rad = (x: (typeof g)[number]) => { const har = h && h.namn === x.q.namn && klanById(s, h.klan)?.namn === x.klan; return gastRelRad(har ? `<button class="plink" data-id="${h!.id}" type="button">${esc(x.q.namn)}</button>` : `<span>${esc(x.q.namn)}</span>`, x.r, undefined, false, x.klan); };
  return `<h3 class="klick" data-hjalp="${id}" title="Gästerna hen känner" tabindex="0" role="button">Utanför byn ${hjalpOppen(id) ? '▾' : '▸'}</h3>${hjalpOppen(id) ? `<ul class="rels">${g.map(rad).join('')}</ul>` : ''}`;
}
function relInne(p: Person) {
  const sarskild = (q: Person) => p.partner === q.id || p.bast === q.id || p.arke === q.id || p.mentor === q.id || q.mentor === p.id || !!p.rivaler?.includes(q.id);
  const rels = s.people.filter(q => q.id !== p.id && s.rels[relKey(p.id, q.id)] && alive(q)).map(q => ({ q, r: s.rels[relKey(p.id, q.id)], sv: sarskild(q) }))
    .sort((x, y) => +y.sv - +x.sv || Math.abs(y.r.op) - Math.abs(x.r.op)).slice(0, 10);
  const h = s.handlare, hr = h ? gastRelationer(s, p).find(x => x.q.namn === h.namn && klanById(s, h.klan)?.namn === x.klan) : undefined;
  const gast = h && hr ? gastRelRad(`<button class="plink" data-id="${h.id}" type="button">${esc(h.namn)}</button>`, hr.r, undefined, true) : '';
  return rels.length || gast ? `<ul class="rels">${gast}${rels.map(({ q, r }) => {
    const typer = relTyper(s, p, q), id = (k: string) => `rt-${p.id}-${q.id}-${k}`;
    const sym = typer.map(t => `<button type="button" class="relsym" data-hjalp="${id(t.id)}" data-hjalp-grupp="rt-${p.id}-${q.id}-" title="${esc(t.namn)}" aria-label="${esc(t.namn)}">${iconImg(t.ikon)}</button>`).join('');
    const oppen = typer.find(t => hjalpOppen(id(t.id))), utf = hjalpOppen(id('mer'));
    // ordet för relationen: ett tryck visar utförligt vad hen tycker om den andra och varför (steg 3.9.6)
    const ord = `<button type="button" class="rw klick ${r.op < REL.osams ? 'neg' : r.op > REL.vanOrd ? 'pos' : ''}" data-hjalp="${id('mer')}" data-hjalp-grupp="rt-${p.id}-${q.id}-" title="Vad ${esc(p.name)} tycker om ${esc(q.name)}">${relWord(p, q, r.op)}</button>`;
    const mer = utf ? `<p class="muted small relfork">${relationText(s, p, q, r).map(esc).join(' ')}</p>` : oppen ? `<p class="muted small relfork"><b>${esc(oppen.namn)}</b>: ${esc(oppen.varfor(s, p, q, r))}</p>` : '';
    return `<li>${pLink(q)}<span class="relsyms">${sym}</span>${ord}<span class="muted">${r.talks} samtal</span>${mer}</li>`;
  }).join('')}</ul>` : '<p class="muted">Inga relationer ännu.</p>';
}

// rykten och intryck (steg 3.3, 3.4): vad byn tycker om hen, och vad hen tror om andra. Varje intryck är en symbol; ett
// tryck visar hur säker hen är, varifrån det kommer, om det är överdrivet eller påhittat och händelserna bakom
const ikTecken = (k: keyof typeof INTRYCK, px = 16) => tecknet('i_' + k, INTRYCK[k].sym, px);
// öknamnet eller hedersnamnet (steg 3.9.1): namnet med symbolen; varför kommer fram när man trycker
function binamnHtml(p: Person) {
  const b = binamnInfo(p);
  if (!b) return '';
  const t = b.heder ? 'Hedersnamn' : 'Öknamn';
  return ` <span class="binamn klick ${b.heder ? 'heder' : 'skam'}" data-hjalp="bn-${p.id}" tabindex="0" title="${t}: ${esc(b.varfor)}" aria-label="${t}">${esc(b.namn)} ${tecknet(b.heder ? 'b_heder' : 'b_skam', b.sym, 14)}</span>`;
}
function binamnForkl(p: Person) {
  const b = binamnInfo(p);
  return b ? hjalpText(`bn-${p.id}`, `<p class="forkl">${b.heder ? 'Hedersnamn' : 'Öknamn'}: byn ser ${esc(p.name)} som ${esc(b.intryck)}.${b.bevis ? ` ${esc(b.varfor)}.` : ''}</p>`) : '';
}
function anseende(p: Person) {
  const a = alive(p) ? anseendeSym(s, p.id) : dodSymbol(s, p.id);
  return a ? ` <span class="anseende" title="${esc(alive(p) ? 'Vad byn tycker om hen' : a === '★' ? 'En legend i byn' : 'Ökänd i byn')}">${ansTecken(a)}</span>` : '';
}
// Vad byn tycker (steg 3.10.5): anseendet som en stapel med neutralt i mitten och en sammanfattning vid musen (eller ett
// tryck); varje symbol har ett tecken för om den drar anseendet uppåt eller nedåt, och ett tryck visar vad den betyder och
// vilka som tycker så
function ryktenHtml(p: Person) {
  const byn = samlatIntryck(s, p.id).slice(0, 6), sam = anseendeText(s, p.id), hid = `ans-${p.id}`;
  const huvud = `<div class="anshuvud klick" data-hjalp="${hid}" title="${esc(sam)}" tabindex="0" role="button">${ansStapel(p.id)}<span class="ansskala"><span>Dåligt</span><span>Neutralt</span><span>Gott</span></span></div>${hjalpText(hid, `<p class="muted small">${esc(sam)}</p>`)}`;
  const bid = (k: IntryckTyp) => `by-${p.id}-${k}`, upp = (k: IntryckTyp) => INTRYCK[k].tecken > 0;
  const vem = (k: IntryckTyp) => living(s).flatMap(q => { const e = intryckOm(q, p.id, k); return e ? [{ q, e }] : []; }).sort((a, b) => b.e.v * b.e.c - a.e.v * a.e.c);
  const syms = byn.map(([k]) => {
    const title = `${cap(INTRYCK[k].namn)}: ${vem(k).length} i byn tycker så. Drar anseendet ${upp(k) ? 'uppåt' : 'nedåt'}`;
    return `<button type="button" class="tnod liten ryk" data-hjalp="${bid(k)}" data-hjalp-grupp="by-${p.id}-" title="${esc(title)}" aria-label="${esc(title)}">${ikTecken(k)}<span class="riktn${upp(k) ? '' : ' ned'}">${upp(k) ? '▲' : '▼'}</span><span class="antal">${vem(k).length}</span></button>`;
  });
  const vald = byn.map(x => x[0]).find(k => hjalpOppen(bid(k)));
  const forkl = vald ? (() => {
    const L = vem(vald), MAX = 10;
    const namn = L.slice(0, MAX).map(({ q, e }) => `${pLink(q)} <span class="muted">(${intryckText(s, e).sure}${e.src === undefined && !e.led ? ', såg det själv' : ''})</span>`).join(', ');
    return `<p class="muted small relfork"><b>${esc(cap(INTRYCK[vald].namn))}</b>, drar anseendet ${upp(vald) ? 'uppåt' : 'nedåt'}. ${esc(INTRYCK[vald].betyder)}<br>Tycker så: ${namn}${L.length > MAX ? ` och ${L.length - MAX} till` : ''}.</p>`;
  })() : '';
  const omHen = byn.length ? `${huvud}<div class="tekrad">${syms.join('')}</div>${forkl}` : '<p class="muted">Byn har ingen särskild bild av hen.</p>';
  const per = new Map<number, Intryck[]>();
  for (const e of p.intryck ?? []) (per.get(e.om) ?? per.set(e.om, []).get(e.om)!).push(e);
  const rader = [...per.values()].sort((a, b) => sum(b) - sum(a)).slice(0, 12).map(L => {
    const q = byId(s, L[0].om), namn = q ? pLink(q) : esc(L[0].namn), dod = !q || !alive(q) ? dodSymbol(s, L[0].om) || '✝' : '';
    const id = (e: Intryck) => `ik-${p.id}-${e.om}-${e.k}`;
    const sym = L.map(e => `<button type="button" class="relsym" data-hjalp="${id(e)}" data-hjalp-grupp="ik-${p.id}-${e.om}-" title="${esc(INTRYCK[e.k].namn)}" aria-label="${esc(INTRYCK[e.k].namn)}">${ikTecken(e.k)}</button>`).join('');
    const e = L.find(x => hjalpOppen(id(x))), t = e && intryckText(s, e);
    const mer = t ? `<p class="muted small relfork"><b>${esc(cap(t.namn))}</b>: ${esc([t.sure, t.varifran, t.slag, t.sant].filter(Boolean).join(', '))}${t.bevis.length ? `<br>${t.bevis.map(b => esc(b)).join('<br>')}` : ''}</p>` : '';
    // fyra celler som de andra listorna i .rels (rutnätet har fyra kolumner): namnet, dödssymbolen, intrycken och en tom
    return `<li>${namn}<span${dod ? ` title="${dod === '★' ? 'En legend' : dod === '☠' ? 'Ökänd' : 'Död'}">${ansTecken(dod, 12)}` : '>'}</span><span class="relsyms">${sym}</span><span></span>${mer}</li>`;
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
// skicket som en linje runt rutan, från toppen medsols (pixelringen, steg 5.3.2.2): runt en rund ruta (30 punkter) och
// längs kanten runt händernas fyrkantiga (30 eller 56 punkter, med hörnen rundade som rutans; steg 2.10.19)
const skickRing = (c: number, hand: boolean, stor: boolean) => ringSvg(c, (stor ? 56 : 30) + 4, hand ? (stor ? 12 : 8) : 0); // yttre bredden med kanten, och hörnen som rutans border-radius
function gearHtml(p: Person) {
  const hand = heldBy(s, p), own = ownedBy(s, p).filter(t => t !== hand && t.bar !== p.id);
  const whose = (t: Ting) => t.agare === p.id ? 'eget' : t.agare === BYN ? 'byns' : `lånat av ${byId(s, t.agare)?.name ?? 'någon'}`;
  const where = (t: Ting) => t.bar !== undefined ? `${byId(s, t.bar)?.name ?? 'någon'} har det på sig` : t.krok !== undefined ? `i ${byId(s, t.krok)?.name ?? 'någon'}s bälte` : t.hos === undefined ? 'i förrådet' : `${byId(s, t.hos)?.name ?? 'någon'} har det i handen`;
  const ting = (t: Ting, title: string, cls = 'kan', px = 16) => `<span class="tnod liten ${cls}" tabindex="0" data-sak="t:${t.id}" title="${esc(title)}" aria-label="${esc(title)}">${iconImg(t.halv?.gor ?? t.k, px)}${kvSvg(t.q, px > 20 ? 14 : 9) && `<span class="kvhorn">${kvSvg(t.q, px > 20 ? 14 : 9)}</span>`}${t.halv ? `<span class="halvmark">${framstegSvg(halvKlar(t.halv), 4)}</span>` : ''}${skickRing(t.c, cls.includes('hand'), px > 20)}</span>`;
  const t = uppgiftVid(p), borda = t ? load(t, s) : 0, bar = !!t && borda > 0, u = utrustning(s, p, bar), ih = bordaIHander(s, p, t, u), kg = (n: number) => `${kortTal(n)} vikt`;
  const bordaTxt = bar ? `bär ${carryTxt(p).replace(/^Bär /, '')}` : '';
  // den som äter vid bordet har maten i den första fria handen (steg 3.10.3)
  const mal = vidBordet(p) ? t?.mal : undefined, malHand = mal ? (['hoger', 'vanster'] as const).find(k => !u[k].ting && !u[k].borda) : undefined;
  const ruta = (k: Plats, stor = false) => {
    const pl = PLATSER[k], x = u[k], cls = stor ? ' stor' : '';
    if (x.ting) {
      const h = handerFor(s, p, x.ting.k);
      const title = `${pl.namn}: ${sakNamn(x.ting.k).toLowerCase()}${x.ting.q !== undefined ? `, ${kvNamn(x.ting).toLowerCase()}` : ''}, ${whose(x.ting)}, ${Math.round(x.ting.c * 100)} %, väger ${kg(viktOf(x.ting.k))}${SAKER[x.ting.k]?.klad?.varme ? `, skyddar ${Math.round(SAKER[x.ting.k]!.klad!.varme * 100)} % mot kylan` : ''}${pl.hand && h === 2 ? ', tar båda händerna' : ''}${k === 'krok' || k === 'krok2' ? x.ting.hos === p.id ? ', hänger i bältet medan hen bär' : ', hänger i bältet tills hen behöver det' : ''}${x.borda ? `; ${bordaTxt}` : ''}`;
      const i = ting(x.ting, title, (k === 'vanster' && x.ting === u.hoger.ting ? 'kan hand pa' : 'kan hand') + cls, stor ? 36 : 16);
      const ik = (k === 'hoger' || k === 'vanster') && ih[k]?.k; // det som ligger i just den handen (steg 6.1.2)
      return x.borda && ik ? i.replace(/<\/span>$/, `<span class="antal">${iconImg(ik, 10)}</span></span>`) : i;
    }
    const ik = (k === 'hoger' || k === 'vanster') ? ih[k]?.k : undefined;
    if (x.borda && ik) { const title = `${pl.namn}: ${sakNamn(ik).toLowerCase()}; ${bordaTxt}`; return `<span class="tnod liten hand${cls}" tabindex="0" title="${esc(title)}" aria-label="${esc(title)}">${iconImg(ik, stor ? 36 : 16)}</span>`; }
    if (k === malHand) { const title = `${pl.namn}: äter ${sakNamn(mal!).toLowerCase()}`; return `<span class="tnod liten hand${cls}" tabindex="0" title="${esc(title)}" aria-label="${esc(title)}">${iconImg(mal!, stor ? 36 : 16)}</span>`; }
    const title = `${pl.namn}: ${pl.hand ? 'tom' : 'inget'}`;
    return `<span class="tnod liten hand tom${cls}" tabindex="0" title="${esc(title)}" aria-label="${esc(title)}">${pl.ikon}</span>`;
  };
  // vad varje hand bär och orkar, i vikt (steg 6.1.8): ett redskap som tar båda händerna och en börda i båda delas lika,
  // och korgen rymmer det den rymmer
  const orkar = capacity(s, p), H = handOrkar(s, p), pl = handPlatser(s, p);
  const handKg = (k: 'hoger' | 'vanster') => {
    const x = u[k], tva = !!x.ting && u.hoger.ting === u.vanster.ting, i = ih[k];
    const tak = pl.find(q => q.hand === k && q.korg)?.kap ?? H;
    const v = (x.ting ? viktOf(x.ting.k) / (tva ? 2 : 1) : 0) + (i?.v ?? 0);
    return `<div class="hbar"><i class="${i ? 'borda' : ''}" style="width:${Math.min(100, Math.round(v / Math.max(0.01, tak) * 100))}%"></i></div><div class="small"><b>${kortTal(v)}</b> / ${kg(tak)}</div>`;
  };
  const paSig = paSigVikt(s, p); // samma vikt som simuleringen räknar mot det hen orkar (utrustning.ts)
  const rad = PLATS_LIST.filter(k => !PLATSER[k].hand).map(k => ruta(k)).join('');
  return `<div class="utrhander"><div class="utrhand">${ruta('hoger', true)}${handKg('hoger')}</div>${utrGubbe(p, u, ih)}<div class="utrhand">${ruta('vanster', true)}${handKg('vanster')}</div></div>
    <div class="tekrad utrrad">${rad}</div><p class="small muted utrkg">På sig <b>${kg(paSig)}</b>${bar ? ` · börda <b>${kg(borda)}</b>` : ''} · orkar <b>${kg(orkar)}</b></p>
    <div class="tekrad">${own.map(t => ting(t, `Äger: ${tingNamn(t).toLowerCase()}, ${Math.round(t.c * 100)} %, väger ${kg(viktOf(t.k))}, ${where(t)}`, 'pa')).join('')}</div>${stockHtml(p)}`;
}
// människan i utrustningen (steg 5.3.4.3): samma figur som på kartan (folkbild.ts), med kläderna på, och redskapen i
// händerna (och i bältet) som små bilder ovanpå, där platserna är
function utrGubbe(p: Person, u: ReturnType<typeof utrustning>, ih: IHanden) {
  const q = skapad(s, p), fig = figurSvg({ ...q, del: { ...q.del, redskap: null } }, '', 'Det hen har på sig');
  // redskapen i händerna (och i bältet) som små bilder ovanpå
  // och det av bördan som ligger i varje hand (steg 6.1.2), i den hand där det ligger
  const bild = (k: Plats) => u[k].ting && !(k === 'vanster' && u.vanster.ting === u.hoger.ting) ? u[k].ting!.halv?.gor ?? u[k].ting!.k : (k === 'hoger' || k === 'vanster') && !u[k].ting ? ih[k]?.k : undefined;
  const pa = (k: Plats, x: number, y: number) => (b => b ? `<span class="utrpa" style="left:${x}%;top:${y}%">${iconImg(b, 22)}</span>` : '')(bild(k));
  return `<div class="utrgubbe">${fig}${pa('hoger', -12, 46)}${pa('vanster', 62, 46)}${pa('krok', 50, 52)}${pa('krok2', 36, 52)}${pa('axel', 60, 8)}</div>`;
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
  // rädslor och föreställningar (kat 'tro' i LARDOMAR) står under Tro, de andra lärdomarna för sig (steg 4.1.2.4)
  const lt = ls.filter(l => LARDOMAR[l.k].kat === 'tro'), lv = ls.filter(l => LARDOMAR[l.k].kat !== 'tro');
  // teknik som symboler: det hen kan fullt, det hen funderar på blekt med en ring som visar hur långt hen kommit.
  // Ett tryck visar samma ruta om tekniken som i teknikfliken (tekInfo), här under symbolerna
  const tk = TEKNIK.filter(x => (p.tek?.[x.id] ?? 0) > 0.01).map(x => {
    const v = p.tek![x.id], kan = v >= 1, title = `${kan ? 'Kan göra' : 'Funderar på'} ${x.namn.toLowerCase()}${kan ? '' : ` (${Math.round(v * 100)} %)`}`;
    return `<button type="button" class="tnod liten ${kan ? 'kan' : 'pa'}${kunTek === x.id ? ' sel' : ''}" data-ptek="${x.id}" title="${esc(title)}" aria-label="${esc(title)}">${iconImg(x.id, 16)}${kan ? '' : `<svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" pathLength="100" stroke-dasharray="${Math.round(v * 100)} 100"/></svg>`}</button>`;
  });
  const rows = ks.map(([k, e]) => ({ n: KUNSKAPER[k]?.namn ?? k, v: e.v }));
  return `${tk.length ? `<h3>Teknik</h3><div class="tekrad">${tk.join('')}</div>${kunTek && (p.tek?.[kunTek] ?? 0) > 0.01 ? tekInfo(living(s), kunTek) : ''}` : ''}<h3>Kunskap</h3>${rows.length ? `<dl class="kv">${rows.map(r => `<dt>${esc(r.n)}</dt><dd>${bar(r.v, 'skill')}<span>${Math.round(r.v * 100)} %</span></dd>`).join('')}</dl>` : '<p class="muted">Ingen särskild kunskap ännu.</p>'}
      <h3>Lärdomar</h3>${lv.length ? lardomHtml(p, lv) : '<p class="muted">Inga lärdomar ännu.</p>'}${lt.length ? `<h3>Tro</h3>${lardomHtml(p, lt)}` : ''}`;
}
// lärdomarna som en symbol per slag (steg 3.3.6) med antalet platser, och en varning när någon av dem inte stämmer.
// Ett tryck visar platserna, vad hen tror, hur säker hen är, varifrån det kommer och om det är fel
function lardomHtml(p: Person, ls: Lardom[]) {
  const slag = [...new Set(ls.map(l => l.k))], id = (k: LKind) => `ld-${p.id}-${k}`;
  const sym = slag.map(k => {
    const d = LARDOMAR[k], n = ls.filter(l => l.k === k), fel = n.some(l => describe(s, l).wrong), title = k === 'flod' ? `${cap(d.namn)}: ${describe(s, n[0]).what.toLowerCase()}` : `${cap(d.namn)}: ${n.length} ${n.length === 1 ? 'plats' : 'platser'}${fel ? ', något stämmer inte' : ''}`; // högvattnet: hur högt det nådde (steg 3.8.7)
    return `<button type="button" class="tnod liten kan${hjalpOppen(id(k)) ? ' sel' : ''}" data-hjalp="${id(k)}" data-hjalp-grupp="ld-${p.id}-" title="${esc(title)}" aria-label="${esc(title)}">${tecknet(d.ikon, d.tecken)}<span class="antal">${n.length}</span>${fel ? '<span class="brist">!</span>' : ''}</button>`;
  }).join('');
  const k = slag.find(x => hjalpOppen(id(x)));
  const lista = k ? `<ul class="lard">${groups(ls.filter(l => l.k === k)).map(g => `<li class="${g[0].k === 'fara' ? 'fara' : ''}"><b>${esc(cap(describe(s, g[0]).place))}</b>${g.map(l => { const d = describe(s, l); return `<span>${esc(d.what)} <small class="muted">${d.sure}, ${esc(d.src)}</small>${d.wrong ? `<small class="fel">${esc(d.wrong)}</small>` : ''}</span>`; }).join('')}</li>`).join('')}</ul>` : '';
  return `<div class="tekrad">${sym}</div>${lista}`;
}
// vad personen brukar ägna sin vakna tid åt, i grupper efter slaget av arbete (SLAG); en handling utan slag står för sig.
// Symbolen är slagets pixelbild, annars handlingens egen (ikon, t.ex. utbrottens grader) eller slagets eller handlingens tecken.
// Räknas första gången den behövs, när symbolerna kan ritas
let habitGroups: { name: string; ikon: string; acts: Act[] }[] | undefined;
const HABIT_GROUPS = () => habitGroups ??= (() => {
  const m = new Map<string, { name: string; ikon: string; acts: Act[] }>();
  for (const a of Object.keys(ACTS) as Act[]) {
    if (a === 'sova') continue;
    const sl = ACTS[a].slag, handel = a === 'handla' || a === 'koa', name = handel ? 'Handel' : sl === 'prata' ? 'Umgås' : sl ? SLAG[sl] : ACTS[a].namn, px = sl && slagIkon(sl); // Umgås är tid utan annat arbete, handeln en egen skiva (steg 8.1.12)
    const egen = !sl && (ACTS[a].ikon ?? 'a_' + a), ikon = handel ? iconImg('silver', 16) : px && hasIcon(px) ? iconImg(px, 16) : egen && hasIcon(egen) ? iconImg(egen, 16) : `<span class="tecken">${(sl ? SLAG_TECKEN[sl] : ACTS[a].tecken) ?? '•'}</span>`;
    (m.get(name) ?? m.set(name, { name, ikon, acts: [] }).get(name)!).acts.push(a);
  }
  return [...m.values()];
})();
// tårtdiagram över den vakna tiden de senaste dygnen (vanorna bleknar, seder.ts). Bara de allra minsta delarna slås ihop
// till Annat (steg 3.10.5)
const SMA = 0.01;
let tidVald: string | undefined; // namnet på delen som är markerad med ett tryck
function tidHtml(p: Person) {
  const tot = habitTotal(p) - (p.habit.sova ?? 0);
  if (!(tot > 0)) return '<p class="muted">Hen har inte hunnit göra något ännu.</p>';
  const all = HABIT_GROUPS().map(g => ({ g, v: habitShare(p, g.acts, tot) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const stora = all.filter(x => x.v >= SMA), annat = all.filter(x => x.v < SMA).reduce((a, x) => a + x.v, 0);
  // färgerna ur paletten i tårtans ordning (steg 5.3.2.2), så att två delar bredvid varandra aldrig har samma färg
  const bitar = stora.map(x => ({ name: x.g.name, ikon: x.g.ikon, v: x.v }));
  if (annat > 0) bitar.push({ name: 'Annat', ikon: '<span class="tecken">…</span>', v: annat });
  const farg = (i: number) => tartFarg(i, bitar.length);
  const tart = tartSvg(bitar.map((b, i) => ({ v: b.v, titel: `${esc(b.name)}: ${Math.round(b.v * 100)} %`, attr: `style="--f:${farg(i)}" data-i="${i}" data-t="${esc(b.name)}"${b.name === tidVald ? ' class="vald"' : ''}` })));
  const vald = bitar.some(b => b.name === tidVald);
  return `<div class="tid${vald ? ' har-vald' : ''}">${tart}
    <ul class="tidlista">${bitar.map((b, i) => `<li title="${esc(b.name)}: ${Math.round(b.v * 100)} %" data-i="${i}" data-t="${esc(b.name)}"${b.name === tidVald ? ' class="vald"' : ''}><span class="fg" style="background:${farg(i)}"></span>${b.ikon}<span class="namn">${esc(b.name)}</span><span class="pc">${Math.round(b.v * 100)} %</span></li>`).join('')}</ul></div>
    ${p.pratArbete ? `<p class="muted small">${iconImg('a_prata', 12)} ${p.pratArbete} samtal under arbetet</p>` : ''}
    <p class="muted small">Den vakna tiden de senaste dygnen. Tryck på en del eller en rad, eller håll musen över den, så lyser båda.</p>`;
}

// överst i personrutan (steg 6.9.1, Sammanfattningen överst i personrutan): aktivitetens symbol och handlingen, och medan hen
// pratar samtalets symbol och vem hen pratar med, på en rad. Skälet (task.why) kommer fram när man trycker på aktiviteten eller
// håller musen över den; ämnet (symbolen och "Pratar om …") likaså på samtalet, med hela samtalets text
function statusRad(p: Person, med: Person | undefined) {
  const t = uppgiftVid(p);
  if (!t) return '–';
  const ik = utbIkon(t) ?? actIkon(t.act), why = t.why;
  const akt = `<span class="akt"${why ? ` title="${esc(why)}" tabindex="0"` : ''}>${ik && hasIcon(ik) ? iconImg(ik, 14) + ' ' : ''}${esc(gorText(p, t))}</span>`;
  if (!med) return akt;
  const x = p.prat, om = x ? (x.k === 'vader' && x.o ? x.o : AMNEN[x.k].namn.toLowerCase()) : '', hel = pratText(s, p);
  const tips = [om && `Pratar om ${om}`, hel].filter(Boolean).join('. '), amne = om ? `om ${om} ` : '';
  const sym = x?.i && hasIcon(x.i) ? iconImg(x.i, 14) : '💬', titel = tips ? ` title="${esc(tips)}" tabindex="0"` : '';
  // steg 9.2.9: raden nämner ämnet. Är samtalet själva aktiviteten står ämnet i den ("Samtalar om regnet vid elden med Gerrkar")
  const gor = gorText(p, t);
  if (amne && /^Samtalar\b/.test(gor)) return `<span class="akt"${titel}>${sym} ${esc(gor.replace(/^Samtalar/, 'Samtalar ' + amne.trim()))} med ${pLink(med)}</span>`;
  return `${akt} · <span class="akt"${titel}>${sym} ${esc(amne)}med ${pLink(med)}</span>`;
}
