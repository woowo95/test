import { ALDER, Act, Lardom, Person, KUNSKAP_NAMES, SKILLS, SKILL_NAMES, STATS, STAT_NAMES, TEKNIK, BYN, Ting, ageOf, alive, byId, childrenOf, heldBy, ownedBy, ownedStock, sakNamn, tingNamn, STACK, describe, duty, habitShare, habitTotal, KROPP, moodOf, REL, relKey, stat, taskName, timeLabel } from '../../sim';
import { iconImg } from '../../ikoner';
import { LAG, bar, cap, carryTxt, durTxt, esc, hex, moodWord, pLink, relWord, sickNow, trend } from '../hjalp';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// allt om den valda personen: mående, egenskaper, kunskap, familj och relationer
export const person: Flik = {
  namn: 'Person',
  html() {
    const p = byId(s, ui.selected);
    if (!p) return `<p class="muted">Klicka på en person på kartan eller i listan för att se allt om hen.</p>`;
    const a = ageOf(p, s.now), now = s.now;
    const kids = childrenOf(s, p);
    const rels = s.people.filter(q => q.id !== p.id && s.rels[relKey(p.id, q.id)] && alive(q)).map(q => ({ q, r: s.rels[relKey(p.id, q.id)] }))
      .sort((x, y) => Math.abs(y.r.op) - Math.abs(x.r.op)).slice(0, 8);
    const status = alive(p) ? (p.task ? taskName(p.task) : '–') : p.died !== undefined ? `Dog ${p.cause} (${timeLabel(s, p.died)})` : `Flyttade från byn (${timeLabel(s, p.left!)})`;
    return `
      <div class="phead"><span class="dot big" style="background:${hex(p)}"></span><div><h2>${esc(p.name)}</h2>${p.tag && alive(p) ? `<p class="tag">${esc(p.tag)}</p>` : ''}
      <p class="muted">${p.sex === 'k' ? 'Kvinna' : 'Man'}, ${Math.floor(a)} år · född ${timeLabel(s, p.born)}</p><p class="status">${status}</p>${alive(p) && p.task?.why ? `<p class="why">Varför: ${esc(p.task.why)}</p>` : ''}${alive(p) && sickNow(p) ? `<p class="why">${esc(p.sickWhy ?? 'Sjuk')}, ${durTxt(p.sickUntil! - now)} kvar</p>` : ''}${alive(p) ? `<p class="muted">${carryTxt(p)}</p>` : ''}</div></div>
      ${alive(p) ? `<h3>Mående</h3><dl class="kv">
        <dt>Humör</dt><dd>${bar(moodOf(p, now), '', trend(p, 'humor', moodOf(p, now)))}<span>${moodWord(moodOf(p, now))}</span></dd>
        <dt>Mättnad</dt><dd>${bar(p.hunger, '', trend(p, 'hunger', p.hunger))}</dd><dt>Vila</dt><dd>${bar(p.rest, '', trend(p, 'rest', p.rest))}</dd>
        <dt>Gemenskap</dt><dd>${bar(p.social, '', trend(p, 'social', p.social))}</dd><dt>Hälsa</dt><dd>${bar(p.health, p.health < LAG.halsa ? 'low' : '', trend(p, 'health', p.health))}</dd>
        <dt>Värme</dt><dd>${bar(p.warm, p.warm < KROPP.kallt ? 'low' : '', trend(p, 'warm', p.warm))}</dd><dt>Toa</dt><dd>${bar(p.toa, p.toa < KROPP.toaBehov ? 'low' : '', trend(p, 'toa', p.toa))}</dd></dl>
        ${p.fiske ? `<h3>Fiske med händerna</h3><p class="muted">${p.fiske.f} försök, ${p.fiske.n} napp, ${p.fiske.k} ${p.fiske.k === 1 ? 'abborre' : 'abborrar'}</p>` : ''}
        ${a >= ALDER.hjalper ? willHtml(p) : ''}
        ${gearHtml(p)}
        ${p.thoughts.length ? `<ul class="thoughts">${p.thoughts.map(t => `<li class="${t.v < 0 ? 'neg' : 'pos'}">${esc(t.text)} <span>${t.v > 0 ? '+' : ''}${Math.round(t.v * 100)}</span></li>`).join('')}</ul>` : ''}` : ''}
      <h3>Egenskaper</h3><dl class="kv">${STATS.map(k => `<dt>${STAT_NAMES[k]}</dt><dd>${bar(stat(p, k, now) / 20)}<span>${stat(p, k, now).toFixed(1).replace('.', ',')}</span></dd>`).join('')}</dl>
      <h3>Färdigheter</h3><dl class="kv">${SKILLS.map(k => `<dt>${SKILL_NAMES[k]}</dt><dd>${bar(p.skill[k] / 20, 'skill')}<span>${p.skill[k].toFixed(1).replace('.', ',')}</span></dd>`).join('')}</dl>
      ${knowledgeHtml(p)}
      <h3>Familj</h3><dl class="kv fam"><dt>Föräldrar</dt><dd>${p.mother || p.father ? [byId(s, p.mother), byId(s, p.father)].filter(Boolean).map(q => pLink(q)).join(' och ') : 'Bland de första i byn'}</dd>
        <dt>Partner</dt><dd>${pLink(byId(s, p.partner))}</dd><dt>Barn</dt><dd>${kids.length ? kids.map(pLink).join(', ') : '–'}</dd></dl>
      <h3>Relationer</h3>${rels.length ? `<ul class="rels">${rels.map(({ q, r }) => `<li>${pLink(q)}<span class="rw ${r.op < REL.osams ? 'neg' : r.op > REL.vanOrd ? 'pos' : ''}">${relWord(p, q, r.op)}</span><span class="muted">${r.talks} samtal</span></li>`).join('')}</ul>` : '<p class="muted">Inga relationer ännu.</p>'}
      <h3>Eftermäle</h3>${p.fame.length ? `<ul class="fame">${p.fame.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : '<p class="muted">Inget som minns ännu.</p>'}`;
  },
};

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
  const txt = (n: number) => n >= 10 ? String(Math.round(n)) : n.toFixed(1).replace('.', ',').replace(',0', '');
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
  const rows = ks.map(([k, e]) => ({ n: KUNSKAP_NAMES[k] ?? k, v: e.v }));
  return `${tk.length ? `<h3>Teknik</h3><div class="tekrad">${tk.join('')}</div>` : ''}<h3>Kunskap</h3>${rows.length ? `<dl class="kv">${rows.map(r => `<dt>${esc(r.n)}</dt><dd>${bar(r.v, 'skill')}<span>${Math.round(r.v * 100)} %</span></dd>`).join('')}</dl>` : '<p class="muted">Ingen särskild kunskap ännu.</p>'}
      <h3>Lärdomar</h3>${ls.length ? `<ul class="lard">${groups(ls).map(g => `<li class="${g[0].k === 'fara' ? 'fara' : ''}"><b>${esc(cap(describe(s, g[0]).place))}</b>${g.map(l => { const d = describe(s, l); return `<span>${esc(d.what)} <small class="muted">${d.sure}, ${esc(d.src)}</small>${d.wrong ? `<small class="fel">${esc(d.wrong)}</small>` : ''}</span>`; }).join('')}</li>`).join('')}</ul>` : '<p class="muted">Inga lärdomar ännu.</p>'}`;
}
// vad personen brukar ägna sin tid åt, i grupper
const HABIT_GROUPS: { name: string; acts: Act[] }[] = [
  { name: 'Jakt', acts: ['jakt'] }, { name: 'Fiske', acts: ['fiske'] }, { name: 'Samla mat', acts: ['samla'] }, { name: 'Hugga trä', acts: ['ved'] },
  { name: 'Hantverk', acts: ['hantverk'] }, { name: 'Berätta', acts: ['beratta'] }, { name: 'Sköta elden', acts: ['elda', 'tanda'] },
  { name: 'Hålla vakt', acts: ['vakt'] }, { name: 'Prata', acts: ['samtal'] }, { name: 'Vila', acts: ['vila'] }, { name: 'Leka', acts: ['leka'] },
];
function willHtml(p: Person) {
  const d = duty(s, p), tot = habitTotal(p);
  const top = tot > 0 ? HABIT_GROUPS.map(g => ({ g, v: habitShare(p, g.acts, tot) })).filter(x => x.v >= 0.04).sort((a, b) => b.v - a.v).slice(0, 4) : [];
  return `<h3>Vilja</h3><dl class="kv">
    <dt>Pliktkänsla</dt><dd>${bar(d, 'skill')}<span>${d > 0.75 ? 'Plikttrogen' : d > 0.5 ? 'Gör sin del' : d > 0.3 ? 'Bekväm' : 'Lat'}</span></dd>
    ${top.map(x => `<dt>${x.g.name}</dt><dd>${bar(x.v / top[0].v)}<span>${Math.round(x.v * 100)} %</span></dd>`).join('')}</dl>
    ${top.length ? '<p class="muted small">Staplarna visar vad hen ägnat sin vakna tid åt de senaste dygnen.</p>' : ''}`;
}
