// Testarenan (steg 3.7.5): ett fönster i testläget där man ställer upp en strid och ser den hända, utan att byn påverkas.
// Kämparna är folk ur byn (som de är nu), påhittade med egna anlag eller djur ur djurregistret. Striden räknas av
// sim/strid.ts och ritas på byns egen karta nära elden, med kämparna som folket i spelet (Björn efter v146); rutan med
// uppställningen och loggen ligger vid sidan av kartan. Loggen visar symbolerna först med hela meningen när man trycker på raden eller håller musen över den.
import {
  AVSIKTER, Avsikt, KLADER_STRID, MANNISKOVAPEN, STRID, STRIDHANDELSER, STRIDSDJUR, LAGE_ORD, VAPEN, Vapen, DJUR,
  Strid, Uppstallning, Hinder, korManga, djurKampe, foljet, personKampe, nyStrid, stridRapport, stridSteg, stridText, sakNamn, living, byId, timeLabel,
  getMap, eldPlats, T, W as MW, H as MH, ageOf, ALDER,
} from '../sim';
import * as PIXI from 'pixi.js';
import { $, esc, personFarg } from './hjalp';
import { s } from './lage';
import { TS, cam, layout, peopleG, world } from './scen';
import { dolda } from './manniskor';
import { stopFollow } from './portratt';

const AW = 14, AH = 9; // planen i rutor
const MAX = 3; // kämpar per sida
type Kalla = { typ: 'by'; pid: number } | { typ: 'egen' } | { typ: 'djur'; art: string };
interface Rad { kalla: Kalla; vapen: Vapen; reserv?: Vapen; klader: string[]; st: { styrka: number; uthallighet: number; mod: number; smidighet: number; skicklighet: number } }
const ny = (): Rad => ({ kalla: { typ: 'egen' }, vapen: 'hand', klader: [], st: { styrka: 10, uthallighet: 10, mod: 10, smidighet: 10, skicklighet: 10 } });
// platserna (steg 3.7.20): väggarna i rutor på planen (AW × AH). Den som står i öppningen stänger den för fienderna
const PLATSER: Record<string, { tecken: string; namn: string; hinder: Hinder[] }> = {
  oppen: { tecken: '⬜', namn: 'Öppen plan', hinder: [] },
  dorr: { tecken: '🚪', namn: 'En vägg med en dörröppning', hinder: [{ x: AW / 2 - 0.25, y: 0, b: 0.5, h: 4 }, { x: AW / 2 - 0.25, y: 5, b: 0.5, h: 4 }] },
  gang: { tecken: '🛤️', namn: 'En trång gång mellan två väggar', hinder: [{ x: 5, y: 0, b: 4, h: 4 }, { x: 5, y: 5, b: 4, h: 4 }] },
};
const lag: { sidor: [Rad[], Rad[]]; avsikt: Avsikt; fro: number; fart: number; vind: number; dimma: number; halt: number; plats: string } = { sidor: [[ny()], [ny()]], avsikt: 'skada', fro: 1, fart: 1, vind: 0, dimma: 0, halt: 0, plats: 'oppen' };
let st: Strid | undefined, spelar = false, sist = 0, kvar = 0, sedd = 0, filter = -1, manga = '';
const blink = new Map<number, { t: number; h: 'traff' | 'miss' | 'tog'; mot?: number; kast?: 1 }>(); // senaste slaget per kämpe (för utfallet)
const FARG = ['#b2921b', '#61767a'], SIDA = [0xb2921b, 0x61767a]; // sidornas färg (ringen runt kämpen)
const STATNAMN = { styrka: 'Styrka', uthallighet: 'Uthållighet', mod: 'Mod', smidighet: 'Smidighet', skicklighet: 'Skicklighet' } as const;

function uppstallning(): Uppstallning {
  const kampar: Uppstallning['kampar'] = [];
  let id = 1;
  lag.sidor.forEach((sida, sd) => sida.forEach((r, i) => {
    const x = sd === 0 ? 3.5 : AW - 3.5, y = AH / 2 + (i - (sida.length - 1) / 2) * 2, side = sd as 0 | 1;
    const p = r.kalla.typ === 'by' ? byId(s, r.kalla.pid) : undefined;
    if (r.kalla.typ === 'djur') kampar.push(djurKampe(r.kalla.art, id++, side, x, y));
    else if (p) kampar.push({ ...personKampe(s, p, id++, side, x, y), vapen: r.vapen, reserv: r.reserv !== r.vapen ? r.reserv : undefined, klader: r.klader });
    else kampar.push({ id: id++, namn: `Kämpe ${sd === 0 ? 'A' : 'B'}${sida.length > 1 ? i + 1 : ''}`, sida: side, st: { ...r.st }, vapen: r.vapen, reserv: r.reserv !== r.vapen ? r.reserv : undefined, klader: r.klader, fart: 1, x, y });
  }));
  foljet(s, kampar); // byns ledare och vännerna som skyddar hen (steg 3.7.12)
  const hinder = PLATSER[lag.plats].hinder;
  return { avsikt: lag.avsikt, w: AW, h: AH, vind: lag.vind, dimma: lag.dimma, halt: lag.halt, ...(hinder.length ? { hinder } : {}), kampar };
}
let senast: { u: Uppstallning; fro: number } | undefined; // striden som visas (↺ visar den igen)
function starta(u = uppstallning(), fro = lag.fro) { senast = { u, fro }; st = nyStrid(u, fro); sedd = 0; kvar = 0; blink.clear(); filter = -1; manga = ''; byFolk(); visaLogg(); }
// striderna som hänt i byn (steg 3.7.2, s.strider): samma uppställning och frö ger samma strid igen
function visaByStrider() {
  const m = s.strider ?? [];
  $('arByn').innerHTML = `<option value="-1">🏘️ ${m.length ? 'Striderna i byn' : 'Inga strider i byn än'}</option>` + m.map((x, i) => ({ x, i })).reverse().map(({ x, i }) => `<option value="${i}">${esc(timeLabel(s, x.t))}: ${esc(x.u.kampar.map(k => k.namn).join(' mot '))} (${esc(x.orsak)})</option>`).join('');
}

// ---------- uppställningen ----------
function radHtml(sd: number, i: number, r: Rad) {
  const folk = living(s);
  const k = r.kalla.typ === 'by' ? `by:${r.kalla.pid}` : r.kalla.typ === 'djur' ? `djur:${r.kalla.art}` : 'egen';
  const val = [`<option value="egen"${k === 'egen' ? ' selected' : ''}>✏️ Påhittad</option>`,
    ...folk.map(p => `<option value="by:${p.id}"${k === `by:${p.id}` ? ' selected' : ''}>🧑 ${esc(p.name)}</option>`),
    ...STRIDSDJUR().map(a => `<option value="djur:${a}"${k === `djur:${a}` ? ' selected' : ''}>🐾 ${esc((DJUR as Record<string, { strid?: { namn: string } }>)[a].strid!.namn)}</option>`)].join('');
  const manniska = r.kalla.typ !== 'djur';
  const vap = manniska ? `<select data-f="vapen" title="Vapen">${MANNISKOVAPEN.map(v => `<option value="${v}"${r.vapen === v ? ' selected' : ''}>${VAPEN[v].tecken} ${esc(VAPEN[v].namn)}</option>`).join('')}</select>` : '';
  const res = manniska ? `<select data-f="reserv" title="Reservvapen i bältet"><option value="">➰ –</option>${MANNISKOVAPEN.filter(v => (VAPEN[v] as { liten?: true }).liten).map(v => `<option value="${v}"${r.reserv === v ? ' selected' : ''}>➰ ${VAPEN[v].tecken}</option>`).join('')}</select>` : '';
  const kl = manniska ? KLADER_STRID.map(c => `<label title="${esc(sakNamn(c))}"><input type="checkbox" data-f="klad" value="${c}"${r.klader.includes(c) ? ' checked' : ''}> ${esc(sakNamn(c))}</label>`).join('') : '';
  const sl = r.kalla.typ === 'egen' ? `<div class="arStat">${(Object.keys(STATNAMN) as (keyof typeof STATNAMN)[]).map(n => `<label title="${STATNAMN[n]} (1–20)">${STATNAMN[n].slice(0, 3)} <input type="range" min="1" max="20" data-f="st" data-n="${n}" value="${r.st[n]}"><b>${r.st[n]}</b></label>`).join('')}</div>` : '';
  const bort = lag.sidor[sd].length > 1 ? `<button type="button" class="ghost" data-f="bort" title="Ta bort">✕</button>` : '';
  return `<div class="arRad" data-sd="${sd}" data-i="${i}"><div><select data-f="kalla" title="Vem">${val}</select>${vap}${res}${bort}</div><div class="arKl">${kl}</div>${sl}</div>`;
}
function visaUpp() {
  $('arUpp').innerHTML = lag.sidor.map((sida, sd) => `<div class="arSida" style="border-color:${FARG[sd]}"><b style="color:${FARG[sd]}">${sd === 0 ? '◀' : '▶'}</b>${sida.map((r, i) => radHtml(sd, i, r)).join('')}${sida.length < MAX ? `<button type="button" class="ghost" data-f="mer" data-sd="${sd}" title="En till på den här sidan">＋</button>` : ''}</div>`).join('')
    + `<div class="arAvs">${(Object.keys(AVSIKTER) as Avsikt[]).map(a => `<label title="${esc(AVSIKTER[a].text)}"><input type="radio" name="arAvs" value="${a}"${lag.avsikt === a ? ' checked' : ''}> ${esc(AVSIKTER[a].namn)}</label>`).join('')}</div>`;
}
function andra(e: Event) {
  const el = e.target as HTMLInputElement;
  if (el.name === 'arAvs') { lag.avsikt = el.value as Avsikt; return starta(); }
  const rad = el.closest<HTMLElement>('.arRad'), f = el.dataset.f;
  if (!rad || !f) return;
  const r = lag.sidor[Number(rad.dataset.sd)][Number(rad.dataset.i)];
  if (f === 'kalla') {
    const [t, v] = el.value.split(':');
    r.kalla = t === 'by' ? { typ: 'by', pid: Number(v) } : t === 'djur' ? { typ: 'djur', art: v } : { typ: 'egen' };
    const p = r.kalla.typ === 'by' ? byId(s, r.kalla.pid) : undefined;
    if (p) { const k = personKampe(s, p, 0, 0, 0, 0); r.vapen = k.vapen; r.reserv = k.reserv; r.klader = k.klader; }
    visaUpp();
  } else if (f === 'vapen') r.vapen = el.value as Vapen;
  else if (f === 'reserv') r.reserv = (el.value || undefined) as Vapen | undefined;
  else if (f === 'klad') r.klader = el.checked ? [...r.klader, el.value] : r.klader.filter(c => c !== el.value);
  else if (f === 'st') { r.st[el.dataset.n as keyof Rad['st']] = Number(el.value); el.nextElementSibling!.textContent = el.value; }
  starta();
}
function klickUpp(e: Event) {
  const b = (e.target as HTMLElement).closest<HTMLElement>('button');
  if (!b) return;
  if (b.dataset.f === 'mer') lag.sidor[Number(b.dataset.sd)].push(ny());
  else if (b.dataset.f === 'bort') { const rad = b.closest<HTMLElement>('.arRad')!; lag.sidor[Number(rad.dataset.sd)].splice(Number(rad.dataset.i), 1); }
  else return;
  visaUpp(); starta();
}

// ---------- platsen på kartan ----------
// striden visas på byns egen karta (Björn efter v146): planen läggs på marken nära elden där det finns minst vatten, och
// kämparna ritas som folket i spelet. De ur byn som är med syns bara i striden så länge arenan är öppen
let ox = 0, oy = 0;
function valjPlats() {
  const m = getMap(s.seed), e = eldPlats(s);
  let bast = Infinity;
  for (let dy = -16; dy <= 16; dy += 2) for (let dx = -16; dx <= 16; dx += 2) {
    const x0 = Math.round(e.x + dx - AW / 2), y0 = Math.round(e.y + dy - AH / 2);
    if (x0 < 0 || y0 < 0 || x0 + AW > MW || y0 + AH > MH) continue;
    let vatten = 0;
    for (let y = y0; y < y0 + AH; y++) for (let x = x0; x < x0 + AW; x++) if (m.tiles[y * MW + x] === T.Vatten) vatten++;
    const v = vatten * 10 + Math.abs(Math.hypot(dx, dy) - 12); // en bit från elden, så att lägret inte står i vägen
    if (v < bast) { bast = v; ox = x0; oy = y0; }
  }
}
// kameran på planen, till höger om rutan med uppställningen och stor nog att se slagen
function visaPlats() {
  stopFollow();
  const el = $('map'), w = el.clientWidth, h = el.clientHeight, ruta = Math.min($('arena').offsetWidth + 10, w * 0.5);
  const fit = Math.min(w / (MW * TS), h / (MH * TS)), sc = Math.min((w - ruta) * 0.85 / (AW * TS), h * 0.85 / (AH * TS));
  cam.zoom = sc / fit;
  cam.x = (ox + AW / 2) * TS - ruta / 2 / sc; cam.y = (oy + AH / 2) * TS; layout();
}
const arenaG = new PIXI.Graphics();
world.addChildAt(arenaG, world.getChildIndex(peopleG) + 1);
function byFolk() { dolda.clear(); if (!$('arena').hidden && st) for (const k of st.kampar) if (k.pid !== undefined) dolda.add(k.pid); }
// ritas varje bildruta från huvudloopen (main.ts)
export function drawArena() {
  arenaG.clear();
  if ($('arena').hidden || !st) { if (dolda.size) dolda.clear(); return; }
  arenaG.lineStyle(1, 0xffffff, 0.35).drawRect(ox * TS, oy * TS, AW * TS, AH * TS).lineStyle(0); // planens kant
  for (const o of st.hinder ?? []) arenaG.beginFill(0x6b5236).drawRect((ox + o.x) * TS, (oy + o.y) * TS, o.b * TS, o.h * TS).endFill().beginFill(0x4a3926).drawRect((ox + o.x) * TS, (oy + o.y + o.h) * TS - 2, o.b * TS, 2).endFill(); // väggarna (steg 3.7.20), platshållare
  for (const o of st.marken) arenaG.lineStyle(1.2, 0x5a4630, 1).moveTo((ox + o.x) * TS - 4, (oy + o.y) * TS + 2).lineTo((ox + o.x) * TS + 4, (oy + o.y) * TS - 1).lineStyle(0); // vapen på marken (steg 3.7.8)
  for (const k of st.kampar) {
    if (k.lage === 'borta') continue;
    let x = (ox + k.x) * TS, y = (oy + k.y) * TS;
    const b = blink.get(k.id), ny = b && st.t - b.t < 0.35, mal = b?.mot !== undefined ? st.kampar.find(m => m.id === b.mot) : undefined;
    if (ny && mal && b.kast) { const f = (st.t - b.t) / 0.35; arenaG.beginFill(0x8a8378).drawCircle((ox + k.x + (mal.x - k.x) * f) * TS, (oy + k.y + (mal.y - k.y) * f) * TS - 4, 1.5).endFill(); } // det kastade på väg (steg 3.7.7)
    else if (ny && mal) { const d = Math.hypot(mal.x - k.x, mal.y - k.y) || 1; x += ((mal.x - k.x) / d) * 4; y += ((mal.y - k.y) / d) * 4; } // utfallet mot målet
    const p = k.pid !== undefined ? byId(s, k.pid) : undefined;
    const r = k.djur ? 4 : p && ageOf(p, s.now) < ALDER.smabarn ? 2.8 : p && ageOf(p, s.now) < ALDER.vuxen ? 3.8 : 5;
    const traffad = [...blink.values()].some(v => v.mot === k.id && v.h === 'traff' && st!.t - v.t < 0.35);
    const col = k.lage === 'dod' ? 0x6b6560 : traffad ? 0xd65a3a : p ? personFarg(p) : k.djur ? 0x8a6a48 : 0xc9b48a;
    const liggande = k.lage === 'nere' || k.lage === 'dod' || !!k.ligger;
    arenaG.beginFill(0x000000, 0.25).drawEllipse(x, y + r * 0.9, r * 0.9, r * 0.35).endFill();
    arenaG.lineStyle(1.6, SIDA[k.sida], 1).beginFill(col);
    if (liggande) arenaG.drawEllipse(x, y + r * 0.4, r * 1.3, r * 0.6); else if (k.djur) arenaG.drawEllipse(x, y, r * 1.3, r * 0.8); else arenaG.drawCircle(x, y, r);
    arenaG.endFill().lineStyle(0);
    if (k.vapen !== 'hand' && k.vapen !== 'bett' && !liggande) arenaG.lineStyle(1.2, 0x5a4630, 1).moveTo(x + r, y + 2).lineTo(x + r + 2, y - (VAPEN[k.vapen].rack > 1.5 ? 9 : 5)).lineStyle(0);
    if (k.lage === 'dod') arenaG.lineStyle(1.2, 0x24201d, 1).moveTo(x - 3, y - r - 6).lineTo(x + 3, y - r).moveTo(x + 3, y - r - 6).lineTo(x - 3, y - r).lineStyle(0);
    if (k.lage === 'ger') arenaG.lineStyle(1, 0xeeeeee, 1).moveTo(x + 2, y - r).lineTo(x + 2, y - r - 8).lineStyle(0).beginFill(0xffffff).drawRect(x + 2, y - r - 8, 4, 3).endFill(); // vit flagga
    if (k.skador.length) arenaG.beginFill(0x8e2f22).drawRect(x - 5, y + r + 2, Math.round(10 * (1 - Math.max(0, k.blod)) + 1), 1.5).endFill(); // blodet hen förlorat
    if (ny && b.h === 'miss' && mal) arenaG.beginFill(0xffffff, 0.7).drawCircle((ox + mal.x) * TS + 5, (oy + mal.y) * TS - 6, 1.6).drawCircle((ox + mal.x) * TS + 7.5, (oy + mal.y) * TS - 7, 1.2).endFill(); // luft: missen
  }
}

// ---------- loggen och rapporten ----------
function visaLogg() {
  if (!st) return;
  const rader = st.logg.filter(r => filter < 0 || r.a === filter || r.b === filter);
  const namn = (id?: number) => id === undefined ? '' : esc(st!.kampar.find(k => k.id === id)?.namn ?? '');
  const ord = (r: typeof rader[number]) => r.h === 'traff' || r.h === 'miss' || r.h === 'tog' ? `${namn(r.a)} ${r.v ? VAPEN[r.v].tecken : ''} ${namn(r.b)}` : namn(r.a);
  $('arLogg').innerHTML = rader.slice().reverse().map(r => { const t = esc(stridText(st!, r)); return `<li title="${t}"><span class="arT">${r.t.toFixed(1)}</span> ${STRIDHANDELSER[r.h].tecken} ${ord(r)}<span class="arText">${t}</span></li>`; }).join('');
  $('arFilt').innerHTML = `<option value="-1">👥 Alla</option>` + st.kampar.map(k => `<option value="${k.id}"${filter === k.id ? ' selected' : ''}>${esc(k.namn)}</option>`).join('');
  $('arTid').textContent = `${st.t.toFixed(1)} s`;
  $('arSpela').textContent = spelar ? '⏸' : '▶';
  let rap = '';
  if (st.slut) {
    const r = stridRapport(st);
    rap = `<p><b>🏁 ${r.vinnare === -1 ? 'Oavgjort' : `${esc(r.sidor[r.vinnare].namn)} vann`}</b> efter ${r.tid.toFixed(1)} s.${r.mest ? ` Mest skada gjorde ${esc(r.mest.namn)} (${r.mest.varfor}).` : ''}</p>`
      + r.sidor.map(sd => sd.folk.map(f => `<p><span style="color:${FARG[sd.sida]}">●</span> <b>${esc(f.namn)}</b> ${LAGE_ORD[f.lage]}, ${f.traffar}/${f.slag} träffar${f.skador.length ? `: ${esc(f.skador.join('; '))}` : ''}.</p>`).join('')).join('');
  }
  $('arRapport').innerHTML = rap + manga;
}
function korHundra() {
  const r = korManga(uppstallning(), lag.fro, 100), u = uppstallning(), sd = (n: 0 | 1) => esc(u.kampar.filter(k => k.sida === n).map(k => k.namn).join(', '));
  manga = `<p><b>🎲 100 strider</b>: ${sd(0)} vann ${r.vann[0]}, ${sd(1)} vann ${r.vann[1]}${r.oavgjort ? `, ${r.oavgjort} oavgjorda` : ''}. I snitt ${r.tid.toFixed(1)} s.</p>`
    + `<p>${(Object.keys(r.slut) as (keyof typeof r.slut)[]).filter(k => r.slut[k]).map(k => k === 'borta' ? `🚪 kom undan ${r.slut[k]}` : `${STRIDHANDELSER[k as 'dod'].tecken} ${LAGE_ORD[k]} ${r.slut[k]}`).join(' · ')}</p>`
    + r.per.map(p => `<p>${esc(p.namn)}: vann ${p.vann}, dog ${p.dog}, låg ${p.nere}, ${p.traffar.toFixed(1)} träffar per strid.</p>`).join('');
  visaLogg();
}

// ---------- tiden ----------
function steg() {
  if (!st || st.slut) return;
  stridSteg(st);
  for (; sedd < st.logg.length; sedd++) { const r = st.logg[sedd]; if ((r.h === 'traff' || r.h === 'miss' || r.h === 'tog') && r.a !== undefined) blink.set(r.a, { t: r.t, h: r.h, mot: r.b, kast: r.kast }); }
}
function ram(nu: number) {
  if ($('arena').hidden) { spelar = false; return; }
  if (spelar && st) {
    kvar += Math.min(0.25, (nu - sist) / 1000) * lag.fart;
    while (kvar >= STRID.tick && !st.slut) { kvar -= STRID.tick; steg(); }
    if (st.slut) spelar = false;
    visaLogg();
  }
  sist = nu;
  if (spelar) requestAnimationFrame(ram);
}
function spela(on: boolean) { spelar = on; visaLogg(); if (on) { sist = performance.now(); requestAnimationFrame(ram); } }

// ---------- fönstret ----------
export function oppnaArena() {
  $('arena').hidden = false;
  valjPlats(); visaPlats();
  if (!st) starta(); else { byFolk(); visaLogg(); }
  visaUpp(); visaByStrider();
}
$('arena').innerHTML = `<div class="card arena">
  <div class="arTopp"><h2>⚔️ Arena</h2><span><button type="button" class="ghost" id="arVisa" title="Visa striden på kartan">🎯</button><button type="button" class="ghost" id="arStang" title="Stäng arenan">✕</button></span></div>
  <div class="arHuvud">
    <div><div class="arKnappar">
        <button type="button" class="ghost" id="arSpela" title="Spela eller pausa">▶</button>
        <button type="button" class="ghost" id="arSteg" title="Ett steg (${STRID.tick} s)">⏭</button>
        <button type="button" class="ghost" id="arOm" title="Samma strid igen">↺</button>
        <button type="button" class="ghost" id="arFro" title="En ny strid med samma uppställning">🎲</button>
        <button type="button" class="ghost" id="arHundra" title="Samma uppställning 100 gånger">×100</button>
        <select id="arVind" title="Blåsten (sämre kast)">${[0, 0.5, 1].map(v => `<option value="${v}">${v === 0 ? '🍃' : v < 1 ? '💨' : '🌪️'}</option>`).join('')}</select>
        <select id="arDimma" title="Dimman (sämre kast, steg 3.7.11)">${[0, 0.5, 1].map(v => `<option value="${v}">${v === 0 ? '👁' : v < 1 ? '🌁' : '🌫'}</option>`).join('')}</select>
        <select id="arHalt" title="Marken (hal mark fäller lättare)">${[0, 0.5, 1].map(v => `<option value="${v}">${v === 0 ? '🟫' : v < 1 ? '💧' : '🧊'}</option>`).join('')}</select>
        <select id="arPlats" title="Platsen">${Object.entries(PLATSER).map(([k, p]) => `<option value="${k}" title="${esc(p.namn)}">${p.tecken}</option>`).join('')}</select>
        <select id="arFart" title="Fart">${[0.25, 0.5, 1, 2, 4].map(f => `<option value="${f}"${f === 1 ? ' selected' : ''}>${f}×</option>`).join('')}</select>
        <span id="arTid" class="muted"></span>
      </div>
      <select id="arByn" title="Se en strid som hänt i byn igen"></select>
      <div id="arRapport"></div>
    </div>
    <div id="arUpp"></div>
  </div>
  <div class="arLoggTopp"><b>📜</b> <select id="arFilt" title="Visa bara en kämpe"></select></div>
  <ol id="arLogg"></ol>
</div>`;
$('arStang').addEventListener('click', () => { spelar = false; $('arena').hidden = true; byFolk(); });
$('arVisa').addEventListener('click', visaPlats);
$('arSpela').addEventListener('click', () => { if (st?.slut) starta(); spela(!spelar); });
$('arSteg').addEventListener('click', () => { spela(false); steg(); visaLogg(); });
$('arOm').addEventListener('click', () => { starta(senast?.u, senast?.fro); spela(true); });
$('arFro').addEventListener('click', () => { lag.fro = (lag.fro * 1103515245 + 12345) | 0; starta(); spela(true); });
$('arHundra').addEventListener('click', korHundra);
$('arByn').addEventListener('change', e => { const m = s.strider?.[Number((e.target as HTMLSelectElement).value)]; if (m) { starta(m.u, m.fro); spela(true); } });
$('arHalt').addEventListener('change', e => { lag.halt = Number((e.target as HTMLSelectElement).value); starta(); });
$('arDimma').addEventListener('change', e => { lag.dimma = Number((e.target as HTMLSelectElement).value); starta(); });
$('arVind').addEventListener('change', e => { lag.vind = Number((e.target as HTMLSelectElement).value); starta(); });
$('arPlats').addEventListener('change', e => { lag.plats = (e.target as HTMLSelectElement).value; starta(); });
$('arFart').addEventListener('change', e => { lag.fart = Number((e.target as HTMLSelectElement).value); });
$('arFilt').addEventListener('change', e => { filter = Number((e.target as HTMLSelectElement).value); visaLogg(); });
$('arLogg').addEventListener('click', e => (e.target as HTMLElement).closest('li')?.classList.toggle('open'));
$('arUpp').addEventListener('change', andra);
$('arUpp').addEventListener('click', klickUpp);
