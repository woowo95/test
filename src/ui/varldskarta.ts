// ---------- världskartan på skärmen (steg 11.2.16) ----------
// Världskartan väljs i fliken Omvärlden och öppnas i helskärm (steg B.38): krysset eller Esc stänger den och går tillbaka till
// Omvärlden. Kartan går att dra med musen eller fingret och zooma med hjulet eller två fingrar. Musen över en ruta visar marken och
// platserna där, och ett tryck utan att dra skriver det nere till vänster. Byns, sällskapets eller färdens ruta ligger ovanpå
// kartan till höger, och på en smal skärm under den.
// Själva bilden räknas i ui/varldbild.ts.
import { BYHANDLING, byTecken, fardRuta, RadFard, byFlikar, PlatsRuta, Sallskap, TEKNIK, vacktMedBesok, bynsUppdrag, fardLage, bynsKarta, DAGBOK, DAY, hortHandelse, kalender, platsRuta, sallskapLage, sallskapNu, sallskapRuta, syns, varldHandelseText, varldMark, Varlden } from '../sim';
import { farg } from '../palett';
import { gaIn, huvud, s } from './lage';
import { durTxt, ejLig, esc, omUngefar } from './hjalp';
import { TECKEN, TECKENPAL, VK, fardTecken, kandaRutor, huvudbynsPlats, Vy, begransa, dra, helaKartan, namnPaKartan, namnUtanKrock, NAMNZOOM, ritaVarld, rutaText, rutaVid, zooma, ZOOM_MAX, zoomMin } from './varldbild';
import { bildDuk } from './bildduk';

const stil = document.createElement('style');
stil.textContent = `
.vkRuta { position: fixed; inset: 0; z-index: 60; background: ${farg('kol', 0)}; display: flex; flex-direction: column; }
.vkRuta[hidden] { display: none; }
.vkDuk { position: relative; flex: 1 1 0; min-height: 0; overflow: hidden; }
.vkStang { position: absolute; top: 8px; right: 8px; z-index: 2; min-width: 40px; min-height: 40px; font: inherit; font-size: 18px; line-height: 1; border-radius: 3px;
  border: 1px solid ${farg('kol', 3)}; background: ${farg('kol', 1)}; color: ${farg('ben', 3)}; cursor: pointer; }
.vkDuk canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; image-rendering: pixelated; }
.vkDuk canvas.drar { cursor: grabbing; }
.vkInfo { position: absolute; left: 8px; bottom: 8px; max-width: min(420px, calc(100% - 16px)); max-height: 40%; overflow: auto; box-sizing: border-box; margin: 0; padding: 6px 8px; border: 1px solid ${farg('kol', 3)}; color: ${farg('ben', 3)}; background: ${farg('kol', 1)}; border-radius: 3px; }
.vkInfo:empty { display: none; }
.vkInfo .vkPlats { margin-top: 4px; }
.vkInfo table { border-collapse: collapse; margin-top: 2px; }
.vkInfo th, .vkInfo td { padding: 1px 8px 1px 0; text-align: left; font-weight: normal; }
.vkInfo th { color: ${farg('ben', 1)}; }
.vkInfo .vkGaIn { font: inherit; margin-left: 6px; padding: 1px 6px; border-radius: 3px; border: 1px solid ${farg('kol', 3)}; background: ${farg('kol', 2)}; color: ${farg('ben', 3)}; cursor: pointer; }
.vkInfo .vkVarna { color: ${farg('rost', 3)}; }
.vkSida { position: absolute; top: 56px; right: 8px; width: min(340px, 40%); max-height: calc(100% - 64px); overflow: auto; padding: 8px 10px; box-sizing: border-box;
  color: ${farg('ben', 3)}; background: ${farg('kol', 1)}; border: 1px solid ${farg('kol', 3)}; border-radius: 3px; }
.vkSida .plink { font: inherit; padding: 0; border: 0; background: none; color: inherit; text-decoration: underline; cursor: pointer; }
@media (max-width: 700px) { .vkSida { position: static; width: auto; max-height: 45%; border-width: 1px 0 0; border-radius: 0; } }
.vkSida .vkTom { color: ${farg('ben', 1)}; }
.vkSida .vkFlikar { display: flex; flex-wrap: wrap; gap: 2px; margin: 4px 0; }
.vkSida .vkFlikar button { font: inherit; padding: 1px 6px; border-radius: 3px; border: 1px solid ${farg('kol', 3)}; background: ${farg('kol', 2)}; color: ${farg('ben', 3)}; cursor: pointer; }
.vkSida .vkFlikar button[aria-selected="true"] { background: ${farg('kol', 3)}; border-color: ${farg('ben', 1)}; }
.vkSida table { border-collapse: collapse; }
.vkSida th, .vkSida td { padding: 1px 8px 1px 0; text-align: left; font-weight: normal; vertical-align: top; }
.vkSida th { color: ${farg('ben', 1)}; }
.vkSida ul { margin: 2px 0; padding-left: 0; list-style: none; }
.vkSida .vkOkand { color: ${farg('ben', 1)}; }
.vkSida .vkViss { font-size: 0.85em; margin-left: 3px; cursor: help; }
.vkSida .vkDag { cursor: help; }
.vkSida .vkBok { margin-top: 4px; }
.vkSida .vkVarna { color: ${farg('rost', 3)}; }
.vkKronika { position: absolute; top: 6px; left: 6px; max-width: min(420px, calc(100% - 70px)); max-height: 45%; overflow: auto; padding: 4px 8px;
  background: ${farg('kol', 1)}; color: ${farg('ben', 3)}; border: 1px solid ${farg('kol', 3)}; border-radius: 3px; }
.vkKronika summary { cursor: pointer; }
.vkKronika ol { margin: 4px 0 0; padding-left: 0; list-style: none; }
.vkKronika li.vkBlek { color: ${farg('ben', 1)}; }
`;
document.head.appendChild(stil);

// ett tecken ur TECKEN som en liten bild, åt höger eller spegelvänt åt vänster, en sparad duk per tecken (sällskapen, karavanen
// och gravarna)
const teckenDukar: Record<string, HTMLCanvasElement> = {};
function teckenBild(namn: string, spegel = false) {
  const nyckel = namn + (spegel ? 'v' : 'h');
  if (teckenDukar[nyckel]) return teckenDukar[nyckel];
  return teckenDukar[nyckel] = bildDuk({ w: VK, h: VK, rader: TECKEN[namn]!, pal: TECKENPAL }, { speglaX: spegel });
}

const ruta = document.createElement('div');
ruta.className = 'vkRuta'; ruta.hidden = true; ruta.setAttribute('role', 'dialog'); ruta.setAttribute('aria-label', 'Världskartan');
ruta.innerHTML = `<div class="vkDuk"><canvas></canvas><details class="vkKronika"><summary title="Världens krönika: det byn hört i full färg, resten blekare">📜</summary><ol></ol></details><div class="vkInfo"></div></div><aside class="vkSida" aria-label="Rutan för det valda"></aside><button type="button" class="vkStang" title="Stäng" aria-label="Stäng">✕</button>`;
document.body.appendChild(ruta);
const duk = ruta.querySelector('canvas')!, info = ruta.querySelector<HTMLElement>('.vkInfo')!, kronLista = ruta.querySelector('.vkKronika ol')!, sida = ruta.querySelector<HTMLElement>('.vkSida')!;
const visas = () => !ruta.hidden;

// bilden räknas en gång per värld och när platserna ändrats
let bild: HTMLCanvasElement | undefined, bildFor: Varlden | undefined, bildPlatser = -1, bildVet = -1, bildLed = -1, bildMark = '', bildByar = '';
// platserna med ett uppdrag eller fynd som byn känner till och tror på (steg 11.8.16)
const markNr = () => [...new Set(bynsUppdrag(s!).filter(u => u.nr !== undefined && !u.tomt && u.tilltro >= 0.25).map(u => u.nr!))].sort((a, b) => a - b);
function bilden() {
  const vl = s?.varld, v = s && varldMark(s);
  if (!vl || !v) return undefined;
  const n = vl.platser?.length ?? 0, vet = s!.bynVet?.t ?? 0, led = vl.ledVer ?? 0, mk = markNr(), mks = mk.join(',');
  const byar = new Map((vl.platser ?? []).filter(p => p.k === 'by').map(p => [p.nr, byTecken(s!, p.nr)] as const)); // byarnas tecken (steg 15.1.80)
  const bys = [...byar.values()].map(b => `${b.tecken}${b.hallning ?? ''}${b.krig ? 'k' : ''}`).join(',');
  if (!bild || bildFor !== vl || bildPlatser !== n || bildVet !== vet || bildLed !== led || bildMark !== mks || bildByar !== bys) { // och när en led bytt klass (steg 11.5.1) // och när det byn vet räknats om (steg 11.4.7)
    const b = ritaVarld(vl, v, bynsKarta(s!), mk, byar);
    bild = document.createElement('canvas'); bild.width = b.w; bild.height = b.h;
    const g = bild.getContext('2d')!, id = g.createImageData(b.w, b.h);
    id.data.set(b.data); g.putImageData(id, 0, 0);
    bildFor = vl; bildPlatser = n; bildVet = vet; bildLed = led; bildMark = mks; bildByar = bys;
  }
  return bild;
}

const vandrar = new Map<number, boolean>(); // åt vänster senast (står kvar när sällskapet går rakt upp eller ner)
// gömmorna (steg 11.5.17, platshållare: packningens tecken) under sällskapen
function ritaGommor(g: CanvasRenderingContext2D) {
  const vl = s?.varld, v = s && varldMark(s);
  if (!vl || !v) return;
  for (const gr of vl.gravar ?? []) g.drawImage(teckenBild('rose'), (gr.ruta % v.w) * VK, Math.floor(gr.ruta / v.w) * VK); // gravarna vid leden (steg 11.5.18), med röset (steg 15.1.82, platshållare)
}
function ritaSallskap(g: CanvasRenderingContext2D) {
  if (!s) return;
  ritaGommor(g);
  for (const sl of sallskapNu(s.varld)) {
    const l = sallskapLage(s, sl);
    if (!l) continue;
    if (l.dx) vandrar.set(sl.id, l.dx < 0);
    g.drawImage(teckenBild(fardTecken({ vagn: sl.fordon.length > 0, djur: sl.djur.length > 0 }).tecken, vandrar.get(sl.id) ?? false), Math.round(l.x * VK), Math.round(l.y * VK));
  }
  const vl = s.varld, v = varldMark(s), kn = bynsKarta(s), kand = vl && v && kn ? kandaRutor(vl, v, kn) : () => true;
  if (vl && v) for (const f of vl.farder ?? []) { // byarnas färder (steg 11.6.6), med tecknet för färdsättet (FARDTECKEN, steg 15.1.79)
    const l = fardLage(vl, f, s.now, v.w);
    if (!l || !kand(Math.round(l.x), Math.round(l.y))) continue; // en färd i land byn inte känner ritas inte
    const tk = fardTecken({ anfall: !!f.anfall, vagn: !!f.last?.vagnar, djur: !!f.last?.djur }).tecken;
    g.drawImage(teckenBild(tk, l.dx < 0), Math.round(l.x * VK), Math.round(l.y * VK));
  }
}

let vy: Vy | undefined, ritas = false;
const matt = () => { const r = duk.getBoundingClientRect(); return { sw: r.width, sh: r.height }; };
function rita() {
  ritas = false;
  const b = bilden(); if (!b || !visas()) return;
  const { sw, sh } = matt(), dpr = window.devicePixelRatio || 1;
  if (duk.width !== Math.round(sw * dpr) || duk.height !== Math.round(sh * dpr)) { duk.width = Math.round(sw * dpr); duk.height = Math.round(sh * dpr); }
  vy = begransa(vy ?? helaKartan(b.width, b.height, sw, sh), b.width, b.height, sw, sh);
  const g = duk.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = farg('skiffer', 1); g.fillRect(0, 0, duk.width, duk.height);
  g.imageSmoothingEnabled = false;
  g.setTransform(vy.z * dpr, 0, 0, vy.z * dpr, -vy.x * vy.z * dpr, -vy.y * vy.z * dpr);
  g.drawImage(b, 0, 0);
  ritaSallskap(g);
  ritaNamn(g, dpr);
}
// platsernas namn (steg 11.9.3) i skärmens storlek under tecknet, i bläck med en ljus kant, när kartan är inzoomad
function ritaNamn(g: CanvasRenderingContext2D, dpr: number) {
  const vl = s?.varld; if (!vl || !vy || vy.z < NAMNZOOM) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.textAlign = 'center'; g.textBaseline = 'top'; g.lineJoin = 'round'; g.lineWidth = 3;
  const font = (n: { egen: boolean }) => `${n.egen ? 700 : 500} 12px "Pixelify Sans", system-ui, sans-serif`;
  const bredd = (n: { egen: boolean; namn: string }) => { g.font = font(n); return g.measureText(ejLig(n.namn)).width + 4; }; // med den ljusa kanten
  for (const n of namnUtanKrock(namnPaKartan(vl, bynsKarta(s!)), vy.z, bredd)) { // huvudbyns först, och inget namn över ett annat (steg 15.1.81)
    const sx = ((n.x + 0.5) * VK - vy.x) * vy.z, sy = ((n.y + 1) * VK - vy.y) * vy.z + 1;
    g.font = font(n);
    const namn = ejLig(n.namn); // fi och fl slås inte ihop, i kanten och fyllningen (steg 12.1.50, 12.1.204)
    g.strokeStyle = farg('ben', 3); g.strokeText(namn, sx, sy);
    g.fillStyle = n.egen ? farg('rost', 0) : farg('kol', 1); g.fillText(namn, sx, sy);
  }
}
const senare = () => { if (!ritas) { ritas = true; requestAnimationFrame(rita); } };

// kartan öppnas över hela skärmen (OPPNA i flikar/grannar.ts ropar på den) och stängs med krysset eller Esc;
// vyn börjar vid huvudbyn, lite inzoomat, första gången för varje värld
let vyFor: Varlden | undefined;
function oppna() {
  if (!s?.varld) return;
  ruta.hidden = false;
  kronLista.innerHTML = kronikaHtml();
  if (vyFor !== s.varld) { vy = undefined; info.textContent = ''; valt = undefined; }
  skrivSida();
  rita();
  const b = bilden(), vl = s.varld, hb = huvudbynsPlats(vl);
  if (vyFor !== vl && b && hb && vy) {
    const { sw, sh } = matt(), z = Math.min(ZOOM_MAX, Math.max(zoomMin(b.width, b.height, sw, sh), 1));
    vy = begransa({ x: (hb.x + 0.5) * VK - sw / 2 / z, y: (hb.y + 0.5) * VK - sh / 2 / z, z }, b.width, b.height, sw, sh); rita();
  }
  vyFor = vl;
}
const stang = () => { ruta.hidden = true; };
window.addEventListener('varldskarta', oppna);
ruta.querySelector('.vkStang')!.addEventListener('click', stang);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && visas()) { e.stopImmediatePropagation(); stang(); } }, true);
// rutan för en vald färd eller ett sällskap följer färden (steg 15.1.188): klockan skriver om den när texten ändrats ("Framme om …",
// lasten, och när färden kommit fram). Byns ruta skrivs inte om varje sekund
setInterval(() => {
  if (!visas()) return;
  if (valt?.fard !== undefined || valt?.sl !== undefined) { const h = sidaHtml(); if (h !== sidaSist) { sidaSist = h; sida.innerHTML = h; } }
  if (sallskapNu(s?.varld).length || s?.varld?.farder?.length) senare(); // sällskapen rör sig
}, 1000);
window.addEventListener('resize', () => { if (visas()) senare(); });

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
  if (fanns && !pekare.size && drog < 6 && vy) { // ett tryck utan att dra: rutans text i rutan nere till vänster
    const r = duk.getBoundingClientRect(), vl = s?.varld, v = s && varldMark(s);
    if (vl && v) {
      const q = rutaVid(vy, e.clientX - r.left, e.clientY - r.top), kn = bynsKarta(s!);
      info.innerHTML = rutaHtml(q.x, q.y);
      // symbolen där den ritas, den översta först (steg B.39)
      const mx = vy.x + (e.clientX - r.left) / vy.z, my = vy.y + (e.clientY - r.top) / vy.z;
      const traff = (l?: { x: number; y: number }) => !!l && mx >= Math.round(l.x * VK) && mx < Math.round(l.x * VK) + VK && my >= Math.round(l.y * VK) && my < Math.round(l.y * VK) + VK;
      const kand = kn ? kandaRutor(vl, v, kn) : () => true, synlig = (l?: { x: number; y: number }) => !!l && kand(Math.round(l.x), Math.round(l.y)) ? l : undefined; // en färd i okänt land syns inte och går inte att trycka på
      const fd = [...vl.farder ?? []].reverse().find(x => traff(fardLage(vl, x, s!.now, v.w)) && !!synlig(fardLage(vl, x, s!.now, v.w)));
      const sl = [...sallskapNu(vl)].reverse().find(x => traff(sallskapLage(s!, x)));
      const by = (vl.platser ?? []).find(p => p.x === q.x && p.y === q.y && syns(kn, p) && p.by !== undefined);
      if (fd) { valt = { fard: fd.id }; skrivSida(); }
      else if (sl) { valt = { sl: sl.id }; skrivSida(); }
      else if (by) { valt = { by: by.nr }; skrivSida(); }
    }
  }
};
duk.addEventListener('pointerup', slapp);
// Gå in (steg 11.13.11): världskartan stängs och den väckta byn visas
info.addEventListener('click', e => {
  const nr = (e.target as HTMLElement).closest<HTMLElement>('[data-gain]')?.dataset.gain;
  const b = nr !== undefined ? vacktMedBesok(huvud(), Number(nr)) : undefined;
  if (b) { stang(); gaIn(b); }
});
duk.addEventListener('pointercancel', e => { pekare.delete(e.pointerId); if (!pekare.size) duk.classList.remove('drar'); });

// ---------- byns ruta (steg 11.4.12): det byn tror bredvid det som är sant, vilka som vet och varningen Bara en vet ----------
function rutaHtml(x: number, y: number): string {
  const vl = s?.varld, v = s && varldMark(s);
  if (!s || !vl || !v) return '';
  const kn = bynsKarta(s), delar = [`<div>${esc(rutaText(vl, v, x, y, kn))}</div>`];
  for (const q of (vl.platser ?? []).filter(p => p.x === x && p.y === y && syns(kn, p))) {
    if (q.by !== undefined) continue; // byarna har sin ruta bredvid kartan (steg 12.1.30)
    const r = platsRuta(s, q.nr);
    if (!r || r.egen) continue;
    const huvud = `<b>${esc(r.sort)} ${esc(r.namn)}</b>: ${r.niva ? esc(r.niva) : 'okänd för byn'}${r.ar !== undefined ? `, uppgifter från år ${r.ar} (${esc(r.kalla ?? '')})` : ''}`;
    const vem = r.vem.length ? `<div>Vet: ${r.vem.map(esc).join(', ')}</div>` : '';
    const kartor = r.kartor.length ? `<div>Kartor: ${r.kartor.map(esc).join(', ')}</div>` : ''; // steg 11.7.4
    delar.push(`<div class="vkPlats">${huvud}${vem}${kartor}${r.baraEn ? '<div class="vkVarna">⚠ Bara en vet</div>' : ''}</div>`);
  }
  for (const u of bynsUppdrag(s)) { // uppdragen och fynden byn känner till på rutan (steg 11.8.16)
    const q = u.nr !== undefined ? vl.platser?.find(p => p.nr === u.nr) : undefined;
    if (!q || q.x !== x || q.y !== y) continue;
    delar.push(`<div class="vkPlats"><b>📜 ${esc(u.namn)}</b>: ${u.tomt ? 'tomt' : `värt ${u.varde} silver`}${u.fynd ? '' : `, utlyst av ${esc(u.av)}`}<div>Vet: ${u.vet.map(esc).join(', ')}</div></div>`);
  }
  const vm = varldMark(s!);
  for (const gr of vl.gravar ?? []) if (vm && gr.ruta === y * vm.w + x) delar.push(`<div class="vkPlats"><b>✝ Grav</b>: ${esc(gr.namn)}<div>Begravd vid leden år ${kalender(s!, gr.t).ar}</div></div>`); // steg 11.5.18
  return delar.join('');
}

// ---------- byns ruta bredvid kartan (steg 12.1.30, Tydligare gränssnitt: Omvärlden, Byns ruta) ----------
// Ett tryck på en by visar dess ruta med flikar som runstenarna i den egna byn. Varje uppgift säger om byn vet (👁, sett själv)
// eller tror (👂, hört eller läst), hur gammal den är och varifrån; det byn inte vet är ett grått ?. Den egna byn har samma ruta
export const BYFLIKAR = [
  { id: 'oversikt', tecken: '🏠', namn: 'Översikt' },
  { id: 'folket', tecken: '👥', namn: 'Folket' },
  { id: 'styre', tecken: '⚖️', namn: 'Styre och tro' },
  { id: 'kunskap', tecken: '🧠', namn: 'Kunskap' },
  { id: 'historia', tecken: '📜', namn: 'Historia' },
  { id: 'forb', tecken: '🤝', namn: 'Förbindelsen' },
] as const;
type ByFlikId = (typeof BYFLIKAR)[number]['id'];
let valt: { by?: number; sl?: number; fard?: number } | undefined, byFlik: ByFlikId = 'oversikt';
let sidaSist = ''; // det som senast skrevs i rutan (steg 15.1.188)
function skrivSida() { sidaSist = sidaHtml(); sida.innerHTML = sidaSist; }
const OKAND = '<span class="vkOkand" title="Byn vet inte">?</span>';
function alderText(ar: number) { const n = kalender(s!, s!.now).ar - ar; return n <= 0 ? 'från i år' : n === 1 ? 'ett år gammal' : `${n} år gammal`; }
function viss(r: PlatsRuta, sant?: string, varde?: string) {
  if (!r.visshet) return '';
  const titel = `${r.visshet === 'vet' ? 'Byn vet' : 'Byn tror'}: ${r.ar !== undefined ? `${alderText(r.ar)} (år ${r.ar})` : ''}${r.kalla ? `, ${r.kalla}` : ''}${sant !== undefined && varde !== undefined && sant !== varde ? `. Sant nu: ${sant}` : ''}`;
  return `<span class="vkViss" title="${esc(titel)}">${r.visshet === 'vet' ? '👁' : '👂'}</span>`;
}
const uppg = (r: PlatsRuta, varde: string | undefined, sant?: string) => varde === undefined || !r.visshet ? OKAND : `${esc(varde)}${viss(r, sant, varde)}`;
function sidaHtml(): string {
  if (!s?.varld) return '';
  const sl = valt?.sl !== undefined ? sallskapNu(s.varld).find(x => x.id === valt!.sl) : undefined;
  if (sl) return sallskapHtml(sl);
  const fd = valt?.fard !== undefined ? s.varld.farder?.find(x => x.id === valt!.fard) : undefined;
  if (fd) return fardHtml(fd);
  const f = valt?.by !== undefined ? byFlikar(s, valt.by, id => TEKNIK.find(x => x.id === id)?.namn ?? id) : undefined;
  if (!f) return '<div class="vkTom">Tryck på en by, ett sällskap eller en färd på kartan</div>';
  const r = f.ruta, rad = (id: string) => r.rader.find(d => d.id === id);
  const tal = (id: string) => { const d = rad(id); return `<tr><th>${esc(d?.namn ?? id)}</th><td>${uppg(r, d?.tror, d?.sant)}</td></tr>`; };
  const flikar = `<div class="vkFlikar" role="tablist">${BYFLIKAR.map(x => `<button type="button" role="tab" data-vkflik="${x.id}" aria-selected="${x.id === byFlik}" title="${x.namn}">${x.tecken}</button>`).join('')}</div>`;
  let inne = '';
  if (byFlik === 'oversikt') inne = `<table><tr><th>Namn</th><td>${esc(r.namn)}</td></tr><tr><th>Sort</th><td>${esc(r.sort)}</td></tr>${['kvar', 'folk', 'mat', 'rikedom', 'styrka'].map(tal).join('')}</table>`
    + `${r.niva && !r.egen ? `<div>${esc(r.niva)}${r.vem.length ? `, vet: ${r.vem.map(esc).join(', ')}` : ''}</div>` : ''}${r.kartor.length ? `<div>Kartor: ${r.kartor.map(esc).join(', ')}</div>` : ''}${r.baraEn ? '<div class="vkVarna">⚠ Bara en vet</div>' : ''}`;
  else if (byFlik === 'folket') inne = f.folket ? (f.folket.length ? `<ul>${f.folket.map(p => `<li>${p.id !== undefined ? `<button class="plink" data-id="${p.id}" type="button">${esc(p.namn)}</button>` : esc(p.namn)} <span class="vkOkand">${esc(p.roll)}</span>${viss(r)}</li>`).join('')}</ul>` : '<div>Byn känner ingen där</div>') : OKAND;
  else if (byFlik === 'styre') inne = `<table>${tal('led')}<tr><th>Tro</th><td>${f.tro ? `${esc(f.tro.namn)}, ${f.tro.andel} %${viss(r)}` : r.visshet ? `Ingen${viss(r)}` : OKAND}</td></tr>${tal('lyder')}</table>`;
  else if (byFlik === 'kunskap') inne = f.tek ? (f.tek.length ? `<ul>${f.tek.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${viss(r)}` : `<div>Inga tekniker${viss(r)}</div>`) : OKAND;
  else if (byFlik === 'historia') inne = `${f.grundad !== undefined ? `<div>Grundad år ${f.grundad}${f.ursprung ? ` av folk från ${esc(f.ursprung)}` : ''}${viss(r)}</div>` : `<div>Ursprung ${OKAND}</div>`}${f.historia.length ? `<ul>${f.historia.slice(-30).reverse().map(h => `<li>År ${h.ar}: ${esc(h.text)}</li>`).join('')}</ul>` : '<div class="vkOkand">Byn har inte hört något om den i världens krönika</div>'}`;
  else inne = r.egen ? '<div>Den egna byn</div>' : f.forb ? `<table><tr><th>Hållning</th><td>${f.forb.hallning ? `${esc(f.forb.hallning)} (${f.forb.inst})${viss(r)}` : OKAND}</td></tr><tr><th>Krig eller fred</th><td>${f.forb.lage ? esc(f.forb.lage) : 'Ingetdera'}</td></tr><tr><th>Räder</th><td>${f.forb.rader}</td></tr><tr><th>Vägen dit</th><td>${f.forb.dygn !== undefined ? `${durTxt(f.forb.dygn * DAY)} till fots` : 'Ingen känd väg'}</td></tr></table>` : OKAND;
  const namn = BYFLIKAR.find(x => x.id === byFlik)!.namn;
  return `<div><b>${esc(r.sort)} ${esc(r.namn)}</b>${viss(r)}</div>${flikar}<div class="vkFlikNamn vkOkand">${namn}</div>${inne}`;
}
// sällskapets ruta (steg 11.5.12 och 12.1.31): vilka som går, vart, varför, packningen och dagboken från vägen, det senaste
// först; dagbokens tecken är bildstilens symboler (symboler.ts byter emojin) och säger sitt namn vid tryck
function sallskapHtml(sl: Sallskap): string {
  const r = sallskapRuta(s!, sl), dygn = (d: number) => omUngefar(d * DAY);
  const kvar = r.kvar !== undefined ? `, ${dygn(r.kvar)} kvar` : r.stannar !== undefined ? `, stannar ${dygn(r.stannar)} till` : '';
  const inKnapp = vacktMedBesok(huvud(), sl.mal) && vacktMedBesok(huvud(), sl.mal) !== s ? `<button type="button" class="vkGaIn" data-gain="${sl.mal}" title="Gå in: visa byn medan de egna är där">🚪 Gå in</button>` : ''; // steg 11.13.11
  const vem = r.vem.map((p, i) => `<button class="plink" data-id="${p.id}" type="button">${esc(p.namn)}</button>${i === 0 ? ' <span class="vkOkand">leder</span>' : ''}`).join(', ');
  const bok = sl.dagbok.length ? `<ul class="vkBok">${sl.dagbok.slice(-12).reverse().map(([t, text, slag]) => `<li>År ${kalender(s!, t).ar}: ${slag ? `<span class="vkDag" title="${esc(DAGBOK[slag].namn)}">${DAGBOK[slag].sym}</span> ` : ''}${esc(text)}</li>`).join('')}</ul>` : '<div class="vkOkand">Inget i dagboken än</div>';
  return `<div><b>🎒 ${esc(r.titel)}</b></div>`
    + `<table><tr><th>Vart</th><td>${esc(r.mal)}</td></tr><tr><th>Varför</th><td>${esc(r.varfor)}</td></tr><tr><th>Skede</th><td>${esc(r.skede)}${kvar} ${inKnapp}</td></tr>`
    + `<tr><th>Vilka</th><td>${vem || '–'}${r.djur.length ? ` med ${r.djur.map(d => esc(d.toLowerCase())).join(', ')}` : ''}</td></tr>`
    + `${r.pack.length ? `<tr><th>Packning</th><td>${r.pack.map(([k, n]) => `${n} ${esc(k.toLowerCase())}`).join(', ')}</td></tr>` : ''}</table>${bok}`;
}
// en annan bys färd (steg B.39): varifrån, vart, varför, vilka, vad de bär och när de väntas fram
function fardHtml(f: RadFard): string {
  const r = fardRuta(s!, f, BYHANDLING.barare);
  if (!r) return '';
  return `<div><b>🚶 ${esc(r.titel)}: ${esc(r.fran)}</b></div>`
    + `<table><tr><th>Från</th><td>${esc(r.fran)}</td></tr><tr><th>Vart</th><td>${esc(r.hemat ? `Hem från ${r.till}` : r.till)}</td></tr><tr><th>Varför</th><td>${esc(r.varfor)}</td></tr>`
    + `<tr><th>Vilka</th><td>${r.folk.length ? r.folk.map(esc).join(', ') : r.antal === 1 ? 'En person' : `${r.antal} personer`}${r.djur.length ? ` med ${r.djur.map(d => esc(d.toLowerCase())).join(', ')}` : ''}</td></tr>`
    + `<tr><th>Bär</th><td>${r.bar.length ? r.bar.map(esc).join(', ') : 'Inget'}</td></tr>`
    + `<tr><th>${r.hemat ? 'Hemma' : 'Framme'}</th><td>om ${omUngefar(r.kvar * DAY)}</td></tr></table>`;
}
sida.addEventListener('click', e => {
  const el = e.target as HTMLElement, b = el.closest<HTMLElement>('[data-vkflik]');
  if (b) { byFlik = b.dataset.vkflik as ByFlikId; skrivSida(); return; }
  const nr = el.closest<HTMLElement>('[data-gain]')?.dataset.gain; // Gå in (steg 11.13.11)
  const v = nr !== undefined ? vacktMedBesok(huvud(), Number(nr)) : undefined;
  if (v) { stang(); gaIn(v); return; }
  if (el.closest('[data-id]')) stang(); // personens panel (panel.ts)
});

// världens krönika (steg 11.4.13): de senaste först, det byn hört i full färg och resten blekare
function kronikaHtml(): string {
  const vl = s?.varld;
  if (!s || !vl) return '';
  return (vl.kronika ?? []).slice(-60).reverse().map(h => `<li${hortHandelse(s!, h) ? '' : ' class="vkBlek"'}>År ${kalender(s!, h.t).ar}: ${esc(varldHandelseText(vl, h))}</li>`).join('');
}

