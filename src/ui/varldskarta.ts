// ---------- världskartan på skärmen (steg 11.2.16) ----------
// En knapp i sidhuvudet (kartans tecken) öppnar världskartan över hela fönstret. Kartan går att dra med musen eller fingret
// och zooma med hjulet eller två fingrar; Esc, krysset eller knappen igen stänger den. Musen över en ruta visar marken och
// platserna där, och ett tryck utan att dra skriver det under kartan. Själva bilden räknas i ui/varldbild.ts.
import { bynsKarta, varldMark, Varlden } from '../sim';
import { farg } from '../palett';
import { s } from './lage';
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
ruta.innerHTML = `<canvas></canvas><button type="button" class="vkStang" title="Stäng" aria-label="Stäng">✕</button><p class="vkInfo"></p>`;
document.body.appendChild(ruta);
const duk = ruta.querySelector('canvas')!, info = ruta.querySelector<HTMLElement>('.vkInfo')!;

// bilden räknas en gång per värld och när platserna ändrats
let bild: HTMLCanvasElement | undefined, bildFor: Varlden | undefined, bildPlatser = -1, bildVet = -1;
function bilden() {
  const vl = s?.varld, v = s && varldMark(s);
  if (!vl || !v) return undefined;
  const n = vl.platser?.length ?? 0, vet = s!.bynVet?.t ?? 0;
  if (!bild || bildFor !== vl || bildPlatser !== n || bildVet !== vet) { // och när det byn vet räknats om (steg 11.4.7)
    const b = ritaVarld(vl, v, bynsKarta(s!));
    bild = document.createElement('canvas'); bild.width = b.w; bild.height = b.h;
    const g = bild.getContext('2d')!, id = g.createImageData(b.w, b.h);
    id.data.set(b.data); g.putImageData(id, 0, 0);
    bildFor = vl; bildPlatser = n; bildVet = vet;
  }
  return bild;
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
}
const senare = () => { if (!ritas) { ritas = true; requestAnimationFrame(rita); } };

function oppna() {
  if (!s?.varld) return;
  ruta.hidden = false; knapp.setAttribute('aria-expanded', 'true'); info.textContent = '';
  vy = undefined; rita();
  // börja vid huvudbyn, lite inzoomat
  const b = bilden(), vl = s.varld, hb = vl.platser?.find(p => p.by === vl.huvud);
  if (b && hb && vy) {
    const { sw, sh } = matt(), z = Math.min(ZOOM_MAX, Math.max(zoomMin(b.width, b.height, sw, sh), 1));
    vy = begransa({ x: (hb.x + 0.5) * VK - sw / 2 / z, y: (hb.y + 0.5) * VK - sh / 2 / z, z }, b.width, b.height, sw, sh); rita();
  }
}
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
    if (vl && v) { const q = rutaVid(vy, e.clientX - r.left, e.clientY - r.top); info.textContent = rutaText(vl, v, q.x, q.y, s && bynsKarta(s)); }
  }
};
duk.addEventListener('pointerup', slapp);
duk.addEventListener('pointercancel', e => { pekare.delete(e.pointerId); if (!pekare.size) duk.classList.remove('drar'); });
