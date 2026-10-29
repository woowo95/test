// Testarenan (steg 3.7.5): ett fönster i testläget där man ställer upp en strid och ser den hända, utan att byn påverkas.
// Kämparna är folk ur byn (som de är nu), påhittade med egna anlag eller djur ur djurregistret. Striden räknas av
// sim/strid.ts; här ritas den på en liten plan med 16 punkter per ruta (platshållare tills bildstilen har figurerna), och
// loggen visar symbolerna först med hela meningen när man trycker på raden eller håller musen över den.
import {
  AVSIKTER, Avsikt, KLADER_STRID, MANNISKOVAPEN, STRID, STRIDHANDELSER, STRIDSDJUR, LAGE_ORD, VAPEN, Vapen, DJUR,
  Strid, Uppstallning, korManga, djurKampe, personKampe, nyStrid, stridRapport, stridSteg, stridText, sakNamn, living, byId,
} from '../sim';
import { $, esc } from './hjalp';
import { s } from './lage';

const RUTA = 16, W = 20, H = 14; // planen: rutor och punkter per ruta
const MAX = 3; // kämpar per sida
type Kalla = { typ: 'by'; pid: number } | { typ: 'egen' } | { typ: 'djur'; art: string };
interface Rad { kalla: Kalla; vapen: Vapen; klader: string[]; st: { styrka: number; uthallighet: number; mod: number; skicklighet: number } }
const ny = (): Rad => ({ kalla: { typ: 'egen' }, vapen: 'hand', klader: [], st: { styrka: 10, uthallighet: 10, mod: 10, skicklighet: 10 } });
const lag: { sidor: [Rad[], Rad[]]; avsikt: Avsikt; fro: number; fart: number } = { sidor: [[ny()], [ny()]], avsikt: 'skada', fro: 1, fart: 1 };
let st: Strid | undefined, spelar = false, sist = 0, kvar = 0, sedd = 0, filter = -1, manga = '';
const blink = new Map<number, { t: number; h: 'traff' | 'miss' | 'tog'; mot?: number }>(); // senaste slaget per kämpe (för utfallet)
const FARG = ['#b2921b', '#61767a'], MARK = '#8f9a5a', LINJE = '#7a8450', MORK = '#24201d', BLOD = '#8e2f22';
const STATNAMN = { styrka: 'Styrka', uthallighet: 'Uthållighet', mod: 'Mod', skicklighet: 'Skicklighet' } as const;

function uppstallning(): Uppstallning {
  const kampar: Uppstallning['kampar'] = [];
  let id = 1;
  lag.sidor.forEach((sida, sd) => sida.forEach((r, i) => {
    const x = sd === 0 ? 5 : W - 5, y = H / 2 + (i - (sida.length - 1) / 2) * 2.5, side = sd as 0 | 1;
    const p = r.kalla.typ === 'by' ? byId(s, r.kalla.pid) : undefined;
    if (r.kalla.typ === 'djur') kampar.push(djurKampe(r.kalla.art, id++, side, x, y));
    else if (p) kampar.push({ ...personKampe(s, p, id++, side, x, y), vapen: r.vapen, klader: r.klader });
    else kampar.push({ id: id++, namn: `Kämpe ${sd === 0 ? 'A' : 'B'}${sida.length > 1 ? i + 1 : ''}`, sida: side, st: { ...r.st, smidighet: 10 }, vapen: r.vapen, klader: r.klader, fart: 1, x, y });
  }));
  return { avsikt: lag.avsikt, w: W, h: H, kampar };
}
function starta() { st = nyStrid(uppstallning(), lag.fro); sedd = 0; kvar = 0; blink.clear(); filter = -1; manga = ''; rita(); visaLogg(); }

// ---------- uppställningen ----------
function radHtml(sd: number, i: number, r: Rad) {
  const folk = living(s);
  const k = r.kalla.typ === 'by' ? `by:${r.kalla.pid}` : r.kalla.typ === 'djur' ? `djur:${r.kalla.art}` : 'egen';
  const val = [`<option value="egen"${k === 'egen' ? ' selected' : ''}>✏️ Påhittad</option>`,
    ...folk.map(p => `<option value="by:${p.id}"${k === `by:${p.id}` ? ' selected' : ''}>🧑 ${esc(p.name)}</option>`),
    ...STRIDSDJUR().map(a => `<option value="djur:${a}"${k === `djur:${a}` ? ' selected' : ''}>🐾 ${esc((DJUR as Record<string, { strid?: { namn: string } }>)[a].strid!.namn)}</option>`)].join('');
  const manniska = r.kalla.typ !== 'djur';
  const vap = manniska ? `<select data-f="vapen" title="Vapen">${MANNISKOVAPEN.map(v => `<option value="${v}"${r.vapen === v ? ' selected' : ''}>${VAPEN[v].tecken} ${esc(VAPEN[v].namn)}</option>`).join('')}</select>` : '';
  const kl = manniska ? KLADER_STRID.map(c => `<label title="${esc(sakNamn(c))}"><input type="checkbox" data-f="klad" value="${c}"${r.klader.includes(c) ? ' checked' : ''}> ${esc(sakNamn(c))}</label>`).join('') : '';
  const sl = r.kalla.typ === 'egen' ? `<div class="arStat">${(Object.keys(STATNAMN) as (keyof typeof STATNAMN)[]).map(n => `<label title="${STATNAMN[n]} (1–20)">${STATNAMN[n].slice(0, 3)} <input type="range" min="1" max="20" data-f="st" data-n="${n}" value="${r.st[n]}"><b>${r.st[n]}</b></label>`).join('')}</div>` : '';
  const bort = lag.sidor[sd].length > 1 ? `<button type="button" class="ghost" data-f="bort" title="Ta bort">✕</button>` : '';
  return `<div class="arRad" data-sd="${sd}" data-i="${i}"><div><select data-f="kalla" title="Vem">${val}</select>${vap}${bort}</div><div class="arKl">${kl}</div>${sl}</div>`;
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
    if (p) { const k = personKampe(s, p, 0, 0, 0, 0); r.vapen = k.vapen; r.klader = k.klader; }
    visaUpp();
  } else if (f === 'vapen') r.vapen = el.value as Vapen;
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

// ---------- planen ----------
function rita() {
  const c = $('arPlan') as HTMLCanvasElement, g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.fillStyle = MARK; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = LINJE;
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if ((x * 7 + y * 13) % 5 === 0) g.fillRect(x * RUTA + 5, y * RUTA + 9, 2, 1); // grässtrån
  if (!st) return;
  for (const k of st.kampar) {
    if (k.lage === 'borta') continue;
    let x = k.x * RUTA, y = k.y * RUTA;
    const b = blink.get(k.id), ny = b && st.t - b.t < 0.35, mal = b?.mot !== undefined ? st.kampar.find(m => m.id === b.mot) : undefined;
    if (ny && mal) { const d = Math.hypot(mal.x - k.x, mal.y - k.y) || 1; x += ((mal.x - k.x) / d) * 5; y += ((mal.y - k.y) / d) * 5; } // utfallet mot målet
    const liggande = k.lage === 'nere' || k.lage === 'dod';
    const traffad = [...blink.values()].some(v => v.mot === k.id && v.h === 'traff' && st!.t - v.t < 0.35);
    g.save(); g.translate(Math.round(x), Math.round(y));
    if (liggande) g.rotate(Math.PI / 2);
    const kropp = k.lage === 'dod' ? '#6b6560' : traffad ? '#d65a3a' : FARG[k.sida];
    if (k.djur) { g.fillStyle = kropp; g.fillRect(-5, -3, 10, 6); g.fillRect(3, -6, 2, 4); g.fillRect(-1, -6, 2, 4); g.fillStyle = MORK; g.fillRect(3, -2, 1, 1); }
    else {
      g.fillStyle = '#d8b25f'; g.fillRect(-2, -8, 5, 4); // huvudet
      g.fillStyle = kropp; g.fillRect(-3, -4, 7, 6); // kroppen
      g.fillStyle = MORK; g.fillRect(-2, 2, 2, 5); g.fillRect(1, 2, 2, 5); // benen
      if (k.vapen !== 'hand') { g.fillStyle = '#5a4630'; g.fillRect(4, -7, 1, VAPEN[k.vapen].rack > 1.5 ? 12 : 7); }
    }
    g.restore();
    if (k.lage === 'dod') { g.fillStyle = MORK; g.font = '10px sans-serif'; g.fillText('✕', x - 3, y - 9); }
    const blod = Math.max(0, k.blod), sk = k.skador.length;
    if (sk) { g.fillStyle = BLOD; g.fillRect(x - 6, y + 9, Math.round(12 * (1 - blod)), 2); }
    if (k.lage === 'ger' || k.lage === 'flykt') { g.font = '10px sans-serif'; g.fillText(STRIDHANDELSER[k.lage].tecken, x - 5, y - 10); }
    if (ny && b.h === 'miss' && mal) { g.font = '10px sans-serif'; g.fillText('💨', mal.x * RUTA + 4, mal.y * RUTA - 8); }
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
  for (; sedd < st.logg.length; sedd++) { const r = st.logg[sedd]; if ((r.h === 'traff' || r.h === 'miss' || r.h === 'tog') && r.a !== undefined) blink.set(r.a, { t: r.t, h: r.h, mot: r.b }); }
}
function ram(nu: number) {
  if ($('arena').hidden) { spelar = false; return; }
  if (spelar && st) {
    kvar += Math.min(0.25, (nu - sist) / 1000) * lag.fart;
    while (kvar >= STRID.tick && !st.slut) { kvar -= STRID.tick; steg(); }
    if (st.slut) spelar = false;
    visaLogg();
  }
  sist = nu; rita();
  if (spelar) requestAnimationFrame(ram);
}
function spela(on: boolean) { spelar = on; visaLogg(); if (on) { sist = performance.now(); requestAnimationFrame(ram); } }

// ---------- fönstret ----------
export function oppnaArena() {
  $('arena').hidden = false;
  if (!st) starta(); else { visaLogg(); rita(); }
  visaUpp();
}
$('arena').innerHTML = `<div class="card arena">
  <div class="arTopp"><h2>⚔️ Arena</h2><button type="button" class="ghost" id="arStang" title="Stäng arenan">✕</button></div>
  <div class="arHuvud">
    <div><canvas id="arPlan" width="${W * RUTA}" height="${H * RUTA}"></canvas>
      <div class="arKnappar">
        <button type="button" class="ghost" id="arSpela" title="Spela eller pausa">▶</button>
        <button type="button" class="ghost" id="arSteg" title="Ett steg (${STRID.tick} s)">⏭</button>
        <button type="button" class="ghost" id="arOm" title="Samma strid igen">↺</button>
        <button type="button" class="ghost" id="arFro" title="En ny strid med samma uppställning">🎲</button>
        <button type="button" class="ghost" id="arHundra" title="Samma uppställning 100 gånger">×100</button>
        <select id="arFart" title="Fart">${[0.25, 0.5, 1, 2, 4].map(f => `<option value="${f}"${f === 1 ? ' selected' : ''}>${f}×</option>`).join('')}</select>
        <span id="arTid" class="muted"></span>
      </div>
      <div id="arRapport"></div>
    </div>
    <div id="arUpp"></div>
  </div>
  <div class="arLoggTopp"><b>📜</b> <select id="arFilt" title="Visa bara en kämpe"></select></div>
  <ol id="arLogg"></ol>
</div>`;
$('arStang').addEventListener('click', () => { spelar = false; $('arena').hidden = true; });
$('arSpela').addEventListener('click', () => { if (st?.slut) starta(); spela(!spelar); });
$('arSteg').addEventListener('click', () => { spela(false); steg(); visaLogg(); rita(); });
$('arOm').addEventListener('click', () => { starta(); spela(true); });
$('arFro').addEventListener('click', () => { lag.fro = (lag.fro * 1103515245 + 12345) | 0; starta(); spela(true); });
$('arHundra').addEventListener('click', korHundra);
$('arFart').addEventListener('change', e => { lag.fart = Number((e.target as HTMLSelectElement).value); });
$('arFilt').addEventListener('change', e => { filter = Number((e.target as HTMLSelectElement).value); visaLogg(); });
$('arLogg').addEventListener('click', e => (e.target as HTMLElement).closest('li')?.classList.toggle('open'));
$('arUpp').addEventListener('change', andra);
$('arUpp').addEventListener('click', klickUpp);
