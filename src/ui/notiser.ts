// Genomgången av notiserna (steg 5.4.3.2): brevet i raden överst (ui/raden.ts) visar hur många som är olästa, och ett tryck
// öppnar en ruta under raden som visar notiserna en och en (sim/notiser.ts): den viktigaste och senaste först, med nästa,
// föregående, ta bort och ta bort alla. Namnen i texten öppnar personen (panel.ts tar hand om data-id), och en notis som
// gäller en plats har en knapp som visar platsen på kartan (interaktion.ts sätter `visaPlats`). Den som visas är läst.
import { NOTISER, NOTIS_SLAG, type LogEntry, kalender, lasNotis, notiserNu, olasta, taBortNotis } from '../sim';
import { esc, linkify } from './hjalp';
import { ritaOm, s } from './lage';

export const notisVal: { oppen: boolean; nr?: number; fraga?: boolean } = { oppen: false }; // fraga: "ta bort alla?" väntar på ja
let visaPlats = (_x: number, _y: number, _zoom?: number) => {};
export const satVisaPlats = (f: (x: number, y: number, zoom?: number) => void) => { visaPlats = f; };
export const visaPaKartan = (x: number, y: number, zoom?: number) => visaPlats(x, y, zoom); // kameran till platsen (lärdomarna, steg 10.2.63)

// brevet i raden överst: tomt sigill och antalet olästa
export const notisKnapp = () => { const n = olasta(s); return `${'{sym_notis}'}${n ? ` ${n}` : ''}`; };
export const notisTitel = () => {
  const n = olasta(s), alla = s.notiser?.lista.length ?? 0;
  return `${n ? `${n} ${n === 1 ? 'oläst notis' : 'olästa notiser'}` : 'Inga olästa notiser'}${alla > n ? ` (${alla} i allt)` : ''}. Tryck för att läsa dem en och en`;
};
export const harNotiser = () => (s.notiser?.lista.length ?? 0) > 0;

// den som visas: den valda om den finns kvar, annars den första
function nu() {
  const lista = notiserNu(s); let i = lista.findIndex(n => n.nr === notisVal.nr);
  if (i < 0) i = 0;
  return { lista, i, n: lista[i] };
}
export function notisHtml() {
  const { lista, i, n } = nu();
  if (!n) return `<p class="muted">Inga notiser</p><div class="notisknappar"><button type="button" data-notis="stang">Stäng</button></div>`;
  notisVal.nr = n.nr; lasNotis(s, n.nr);
  const typ = NOTISER[n.id], slag = NOTIS_SLAG[typ.slag], k = kalender(s, n.t);
  const rader = n.rader.map((text, i) => `<li>${linkify({ t: n.t, text, ids: n.ids, fram: n.fram?.[i] || undefined, match: n.match?.[i] || undefined } as LogEntry)}</li>`).join('');
  const fler = n.n > n.rader.length ? `<p class="muted">och ${n.n - n.rader.length} till samma dygn</p>` : '';
  const plats = n.plats ? `<button type="button" data-notis="plats" title="Visa platsen på kartan" aria-label="Visa platsen på kartan">{sym_oga}</button>` : '';
  return `<div class="notishuvud notis-${typ.slag}" title="${slag.namn}">{${slag.bild}}<b>${esc(typ.rubrik)}</b><span class="muted">År ${k.ar}</span><span class="notisnr">${i + 1} / ${lista.length}</span></div>
    <ul class="notisrader">${rader}</ul>${fler}
    <div class="notisknappar">
      <button type="button" data-notis="forra" ${i === 0 ? 'disabled' : ''} aria-label="Föregående" title="Föregående">◀</button>
      <button type="button" data-notis="nasta" ${i === lista.length - 1 ? 'disabled' : ''} aria-label="Nästa" title="Nästa">▶</button>
      ${plats}
      <button type="button" data-notis="bort" title="Ta bort den här notisen" aria-label="Ta bort den här notisen">{sym_papperskorg}</button>
      ${notisVal.fraga ? `<button type="button" data-notis="allaJa" class="fara">Ja, ta bort alla ${lista.length}</button>` : `<button type="button" data-notis="alla" title="Ta bort alla notiser" aria-label="Ta bort alla notiser">{sym_papperskorg} alla</button>`}
      <button type="button" data-notis="stang" aria-label="Stäng" title="Stäng">✕</button>
    </div>`;
}
// ett tryck i rutan (eller på brevet); true = klart
export function notisKlick(vad: string) {
  const { lista, i, n } = nu();
  if (vad !== 'alla') notisVal.fraga = false;
  if (vad === 'oppna') notisVal.oppen = !notisVal.oppen;
  else if (vad === 'stang') notisVal.oppen = false;
  else if (vad === 'visa') { notisVal.oppen = true; notisVal.nr = undefined; } // från sammanfattningen (ui/borta.ts): den viktigaste först
  else if (vad === 'nasta' || vad === 'forra') notisVal.nr = lista[Math.max(0, Math.min(lista.length - 1, i + (vad === 'nasta' ? 1 : -1)))]?.nr;
  else if (vad === 'bort' && n) { taBortNotis(s, n.nr); notisVal.nr = (lista[i + 1] ?? lista[i - 1])?.nr; if (!harNotiser()) notisVal.oppen = false; }
  else if (vad === 'alla') notisVal.fraga = true;
  else if (vad === 'allaJa') { taBortNotis(s); notisVal.oppen = false; }
  else if (vad === 'plats' && n?.plats) visaPlats(n.plats.x, n.plats.y);
  else return false;
  return true;
}
if (typeof document !== 'undefined') {
  document.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-notis]');
    if (b && notisKlick(b.dataset.notis!)) ritaOm();
  });
}
