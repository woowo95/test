// ---------- världskartan på skärmen (steg 11.2.16) ----------
// En knapp i sidhuvudet (kartans tecken) öppnar världskartan över hela fönstret. Kartan går att dra med musen eller fingret
// och zooma med hjulet eller två fingrar; Esc, krysset eller knappen igen stänger den. Musen över en ruta visar marken och
// platserna där, och ett tryck utan att dra skriver det under kartan. Själva bilden räknas i ui/varldbild.ts.
import { bynsKarta, DAGBOK, DAY, SAKER, hortHandelse, kalender, platsRuta, sallskapLage, sallskapNu, sallskapRuta, syns, varldHandelseText, varldMark, Varlden } from '../sim';
import { farg } from '../palett';
import { s } from './lage';
import { omUngefar } from './hjalp';
import { TECKEN, TECKENPAL, VK, Vy, begransa, dra, helaKartan, ritaVarld, rutaText, rutaVid, zooma, ZOOM_MAX, zoomMin } from './varldbild';

const stil = document.createElement('style');
stil.textContent = `
.vkRuta { position: fixed; inset: 0; z-index: 60; background: ${farg('kol', 0)}; display: flex; flex-direction: column; }
.vkRuta[hidden] { display: none; }
.vkRuta canvas { flex: 1; min-height: 0; width: 100%; touch-action: none; cursor: grab; image-rendering: pixelated; }
.vkRuta canvas.drar { cursor: grabbing; }
.vkStang { position: absolute; top: 8px; right: 8px; font: inherit; font-size: 18px; line-height: 1; padding: 6px 10px; border-radius: 3px;
  border: 1px solid ${farg('kol', 3)}; background: ${farg('kol', 1)}; color: ${farg('ben', 3)}; cursor: pointer; }
.vkInfo { margin: 0; padding: 6px 12px; min-height: 1.4em; color: ${farg('ben', 3)}; background: ${farg('kol', 1)}; }
#calVarld img { display: block; image-rendering: pixelated; }
.vkInfo .vkPlats { margin-top: 4px; }
.vkInfo table { border-collapse: collapse; margin-top: 2px; }
.vkInfo th, .vkInfo td { padding: 1px 8px 1px 0; text-align: left; font-weight: normal; }
.vkInfo th { color: ${farg('ben', 1)}; }
.vkInfo .vkVarna { color: ${farg('rost', 3)}; }
.vkKronika { position: absolute; top: 8px; left: 8px; max-width: min(420px, calc(100% - 70px)); max-height: 45%; overflow: auto; padding: 4px 8px;
  background: ${farg('kol', 1)}; color: ${farg('ben', 3)}; border: 1px solid ${farg('kol', 3)}; border-radius: 3px; }
.vkKronika summary { cursor: pointer; }
.vkKronika ol { margin: 4px 0 0; padding-left: 0; list-style: none; }
.vkKronika li.vkBlek { color: ${farg('ben', 1)}; }
`;
document.head.appendChild(stil);

// tecknet som en liten bild (knappen)
function teckenUrl(namn: string, storlek = 16) {
  const c = document.createElement('canvas'); c.width = c.height = VK;
  const g = c.getContext('2d')!, r = TECKEN[namn];
  for (let y = 0; y < VK; y++) for (let x = 0; x < VK; x++) { const k = r[y][x]; if (k !== '.') { g.fillStyle = TECKENPAL[k]; g.fillRect(x, y, 1, 1); } }
  return `<img src="${c.toDataURL()}" width="${storlek}" height="${storlek}" alt="">`;
}

const knapp = document.createElement('button');
knapp.type = 'button'; knapp.id = 'calVarld'; knapp.className = 'nyckel calknapp';
knapp.title = 'Världskartan'; knapp.setAttribute('aria-label', 'Världskartan'); knapp.setAttribute('aria-expanded', 'false');
knapp.innerHTML = teckenUrl('karta');
(document.querySelector('.cal .nycklar') ?? document.querySelector('.cal'))?.appendChild(knapp);

const ruta = document.createElement('div');
ruta.className = 'vkRuta'; ruta.hidden = true; ruta.setAttribute('role', 'dialog'); ruta.setAttribute('aria-label', 'Världskartan');
ruta.innerHTML = `<canvas></canvas><details class="vkKronika"><summary title="Världens krönika: det byn hört i full färg, resten blekare">📜</summary><ol></ol></details><button type="button" class="vkStang" title="Stäng" aria-label="Stäng">✕</button><p class="vkInfo"></p>`;
document.body.appendChild(ruta);
const duk = ruta.querySelector('canvas')!, info = ruta.querySelector<HTMLElement>('.vkInfo')!, kronLista = ruta.querySelector('.vkKronika ol')!;

// bilden räknas en gång per värld och när platserna ändrats
let bild: HTMLCanvasElement | undefined, bildFor: Varlden | undefined, bildPlatser = -1, bildVet = -1, bildLed = -1;
function bilden() {
  const vl = s?.varld, v = s && varldMark(s);
  if (!vl || !v) return undefined;
  const n = vl.platser?.length ?? 0, vet = s!.bynVet?.t ?? 0, led = vl.ledVer ?? 0;
  if (!bild || bildFor !== vl || bildPlatser !== n || bildVet !== vet || bildLed !== led) { // och när en led bytt klass (steg 11.5.1) // och när det byn vet räknats om (steg 11.4.7)
    const b = ritaVarld(vl, v, bynsKarta(s!));
    bild = document.createElement('canvas'); bild.width = b.w; bild.height = b.h;
    const g = bild.getContext('2d')!, id = g.createImageData(b.w, b.h);
    id.data.set(b.data); g.putImageData(id, 0, 0);
    bildFor = vl; bildPlatser = n; bildVet = vet; bildLed = led;
  }
  return bild;
}

// sällskapets bild (steg 11.5.12), åt höger och spegelvänd åt vänster
const spritar: Partial<Record<'h' | 'v', HTMLCanvasElement>> = {};
function sprite(vanster: boolean) {
  const nyckel = vanster ? 'v' : 'h';
  if (spritar[nyckel]) return spritar[nyckel]!;
  const c = document.createElement('canvas'); c.width = c.height = VK;
  const g = c.getContext('2d')!, r = TECKEN.sallskap;
  for (let y = 0; y < VK; y++) for (let x = 0; x < VK; x++) { const k = r[y][vanster ? VK - 1 - x : x]; if (k !== '.') { g.fillStyle = TECKENPAL[k]; g.fillRect(x, y, 1, 1); } }
  return spritar[nyckel] = c;
}
const vandrar = new Map<number, boolean>(); // åt vänster senast (står kvar när sällskapet går rakt upp eller ner)
// gömmorna (steg 11.5.17, platshållare: packningens tecken) under sällskapen
let gommaBild: HTMLCanvasElement | undefined;
function ritaGommor(g: CanvasRenderingContext2D) {
  const vl = s?.varld, v = s && varldMark(s);
  if (!vl?.gommor?.length || !v) return;
  if (!gommaBild) {
    gommaBild = document.createElement('canvas'); gommaBild.width = gommaBild.height = VK;
    const c = gommaBild.getContext('2d')!, r = TECKEN.packning;
    for (let y = 0; y < VK; y++) for (let x = 0; x < VK; x++) { const k = r[y]?.[x]; if (k && k !== '.') { c.fillStyle = TECKENPAL[k]; c.fillRect(x, y, 1, 1); } }
  }
  for (const gm of vl.gommor) g.drawImage(gommaBild, (gm.ruta % v.w) * VK, Math.floor(gm.ruta / v.w) * VK);
}
function ritaSallskap(g: CanvasRenderingContext2D) {
  if (!s) return;
  ritaGommor(g);
  for (const sl of sallskapNu(s.varld)) {
    const l = sallskapLage(s, sl);
    if (!l) continue;
    if (l.dx) vandrar.set(sl.id, l.dx < 0);
    g.drawImage(sprite(vandrar.get(sl.id) ?? false), Math.round(l.x * VK), Math.round(l.y * VK));
  }
}

let vy: Vy | undefined, ritas = false;
const matt = () => { const r = duk.getBoundingClientRect(); return { sw: r.width, sh: r.height }; };
function rita() {
  ritas = false;
  const b = bilden(); if (!b || ruta.hidden) return;
  const { sw, sh } = matt(), dpr = window.devicePixelRatio || 1;
  if (duk.width !== Math.round(sw * dpr) || duk.height !== Math.round(sh * dpr)) { duk.width = Math.round(sw * dpr); duk.height = Math.round(sh * dpr); }
  vy = begransa(vy ?? helaKartan(b.width, b.height, sw, sh), b.width, b.height, sw, sh);
  const g = duk.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = farg('skiffer', 1); g.fillRect(0, 0, duk.width, duk.height);
  g.imageSmoothingEnabled = false;
  g.setTransform(vy.z * dpr, 0, 0, vy.z * dpr, -vy.x * vy.z * dpr, -vy.y * vy.z * dpr);
  g.drawImage(b, 0, 0);
  ritaSallskap(g);
}
const senare = () => { if (!ritas) { ritas = true; requestAnimationFrame(rita); } };

function oppna() {
  if (!s?.varld) return;
  ruta.hidden = false; knapp.setAttribute('aria-expanded', 'true'); info.textContent = '';
  kronLista.innerHTML = kronikaHtml();
  vy = undefined; rita();
  // börja vid huvudbyn, lite inzoomat
  const b = bilden(), vl = s.varld, hb = vl.platser?.find(p => p.by === vl.huvud);
  if (b && hb && vy) {
    const { sw, sh } = matt(), z = Math.min(ZOOM_MAX, Math.max(zoomMin(b.width, b.height, sw, sh), 1));
    vy = begransa({ x: (hb.x + 0.5) * VK - sw / 2 / z, y: (hb.y + 0.5) * VK - sh / 2 / z, z }, b.width, b.height, sw, sh); rita();
  }
}
setInterval(() => { if (!ruta.hidden && sallskapNu(s?.varld).length) senare(); }, 1000); // sällskapen rör sig
function stang() { ruta.hidden = true; knapp.setAttribute('aria-expanded', 'false'); }
knapp.addEventListener('click', () => ruta.hidden ? oppna() : stang());
ruta.querySelector('.vkStang')!.addEventListener('click', stang);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !ruta.hidden) stang(); });
window.addEventListener('resize', () => { if (!ruta.hidden) senare(); });

// zooma kring en punkt, inom gränserna
function zoomaVid(f: number, sx: number, sy: number) {
  const b = bilden(); if (!b || !vy) return;
  const { sw, sh } = matt(), z = Math.min(ZOOM_MAX, Math.max(zoomMin(b.width, b.height, sw, sh), vy.z * f));
  vy = begransa(zooma(vy, z / vy.z, sx, sy), b.width, b.height, sw, sh); senare();
}
duk.addEventListener('wheel', e => {
  e.preventDefault();
  const r = duk.getBoundingClientRect();
  zoomaVid(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
}, { passive: false });

// dra med en pekare, zooma med två
const pekare = new Map<number, { x: number; y: number }>();
let drog = 0;
duk.addEventListener('pointerdown', e => { duk.setPointerCapture(e.pointerId); pekare.set(e.pointerId, { x: e.clientX, y: e.clientY }); drog = 0; duk.classList.add('drar'); });
duk.addEventListener('pointermove', e => {
  const r = duk.getBoundingClientRect(), fore = pekare.get(e.pointerId);
  if (!fore) { // musen över kartan
    const vl = s?.varld, v = s && varldMark(s);
    if (vl && v && vy) { const q = rutaVid(vy, e.clientX - r.left, e.clientY - r.top); duk.title = rutaText(vl, v, q.x, q.y, s && bynsKarta(s)); }
    return;
  }
  const nu = { x: e.clientX, y: e.clientY };
  if (pekare.size === 1 && vy) {
    const b = bilden()!, { sw, sh } = matt();
    drog += Math.abs(nu.x - fore.x) + Math.abs(nu.y - fore.y);
    vy = begransa(dra(vy, nu.x - fore.x, nu.y - fore.y), b.width, b.height, sw, sh); senare();
  } else if (pekare.size === 2) {
    const [a, c] = [...pekare.entries()].map(([id, p]) => id === e.pointerId ? nu : p);
    const [a0, c0] = [...pekare.values()];
    const d0 = Math.hypot(a0.x - c0.x, a0.y - c0.y), d1 = Math.hypot(a.x - c.x, a.y - c.y);
    drog += 10;
    if (d0 > 0) zoomaVid(d1 / d0, (a.x + c.x) / 2 - r.left, (a.y + c.y) / 2 - r.top);
  }
  pekare.set(e.pointerId, nu);
});
const slapp = (e: PointerEvent) => {
  const fanns = pekare.delete(e.pointerId);
  if (!pekare.size) duk.classList.remove('drar');
  if (fanns && !pekare.size && drog < 6 && vy) { // ett tryck utan att dra: rutans text under kartan
    const r = duk.getBoundingClientRect(), vl = s?.varld, v = s && varldMark(s);
    if (vl && v) { const q = rutaVid(vy, e.clientX - r.left, e.clientY - r.top); info.innerHTML = rutaHtml(q.x, q.y); }
  }
};
duk.addEventListener('pointerup', slapp);
duk.addEventListener('pointercancel', e => { pekare.delete(e.pointerId); if (!pekare.size) duk.classList.remove('drar'); });

// ---------- byns ruta (steg 11.4.12): det byn tror bredvid det som är sant, vilka som vet och varningen Bara en vet ----------
const esc = (x: string) => x.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
function rutaHtml(x: number, y: number): string {
  const vl = s?.varld, v = s && varldMark(s);
  if (!s || !vl || !v) return '';
  const kn = bynsKarta(s), delar = [`<div>${esc(rutaText(vl, v, x, y, kn))}</div>`];
  for (const q of (vl.platser ?? []).filter(p => p.x === x && p.y === y && syns(kn, p))) {
    const r = platsRuta(s, q.nr);
    if (!r || r.egen) continue;
    const huvud = `<b>${esc(r.sort)} ${esc(r.namn)}</b>: ${r.niva ? esc(r.niva) : 'okänd för byn'}${r.ar !== undefined ? `, uppgifter från år ${r.ar} (${esc(r.kalla ?? '')})` : ''}`;
    const tab = r.rader.length ? `<table><tr><th></th><th>Byn tror</th><th>Sant nu</th></tr>${r.rader.map(d => `<tr><th>${esc(d.namn)}</th><td>${esc(d.tror ?? '–')}</td><td>${esc(d.sant)}</td></tr>`).join('')}</table>` : '';
    const vem = r.vem.length ? `<div>Vet: ${r.vem.map(esc).join(', ')}</div>` : '';
    delar.push(`<div class="vkPlats">${huvud}${tab}${vem}${r.baraEn ? '<div class="vkVarna">⚠ Bara en vet</div>' : ''}</div>`);
  }
  const vm = varldMark(s!);
  for (const gm of vl.gommor ?? []) { // en gömma på rutan (steg 11.5.17)
    if (!vm || gm.ruta !== y * vm.w + x) continue;
    delar.push(`<div class="vkPlats"><b>🎒 Gömma</b>: ${Object.entries(gm.saker).map(([k, n]) => `${n} ${esc((SAKER[k]?.namn ?? k).toLowerCase())}`).join(', ')}<div>Gömdes år ${kalender(s!, gm.t).ar}</div></div>`);
  }
  for (const sl of sallskapNu(vl)) { // sällskapet på rutan (steg 11.5.12)
    const l = sallskapLage(s, sl);
    if (!l || Math.round(l.x) !== x || Math.round(l.y) !== y) continue;
    const r = sallskapRuta(s, sl), dygn = (d: number) => omUngefar(d * DAY);
    const kvar = r.kvar !== undefined ? `, ${dygn(r.kvar)} kvar` : r.stannar !== undefined ? `, stannar ${dygn(r.stannar)} till` : '';
    delar.push(`<div class="vkPlats"><b>🎒 ${esc(r.titel)}</b>: ${esc(r.skede)}${kvar}<div>${esc(r.ledare)}${r.medl.length ? ` med ${r.medl.map(esc).join(', ')}` : ''}${r.djur.length ? ` och ${r.djur.map(d => esc(d.toLowerCase())).join(', ')}` : ''}</div>${r.pack.length ? `<div>Packning: ${r.pack.map(([k, n]) => `${n} ${esc(k.toLowerCase())}`).join(', ')}</div>` : ''}${sl.dagbok.length ? `<ul class="vkBok">${sl.dagbok.slice(-5).reverse().map(([t, text, slag]) => `<li>År ${kalender(s!, t).ar}: ${slag ? DAGBOK[slag].sym : ''} ${esc(text)}</li>`).join('')}</ul>` : ''}</div>`); // dagboken, det senaste först (steg 11.5.13)
  }
  return delar.join('');
}

// världens krönika (steg 11.4.13): de senaste först, det byn hört i full färg och resten blekare
function kronikaHtml(): string {
  const vl = s?.varld;
  if (!s || !vl) return '';
  return (vl.kronika ?? []).slice(-60).reverse().map(h => `<li${hortHandelse(s!, h) ? '' : ' class="vkBlek"'}>År ${kalender(s!, h.t).ar}: ${esc(varldHandelseText(vl, h))}</li>`).join('');
}

