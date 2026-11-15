// ---------- bina (system 10.10, steg 10.10.14–10.10.27; Djuren i detalj: Bina) ----------
// Binas drag (steg 10.10.14): hur mycket som blommar för bina på en plats, ett tal mellan 0 och 1. Det som blommar är rader i
// registret DRAGKALLOR, och en ny dragväxt är en ny rad. Summan inom BIN.r rutor delas med BIN.dragFullt, och talet är högst 1.
// På hösten och i istiden blommar inget. Draget räknas när någon frågar (kupans plats och ruta), inte varje slag
import { balans } from './balans';
import { fyndAt } from './fynd';
import { groundOf } from './mark';
import { BUSKE } from './vag';
import { BARBUSKE } from './buskar';
import { GRODOR, GrodaSlag, faltOf, faltRuta, rutorAv } from './odling';
import { torkaNu } from './torka';
import { HOST, ISTID, SOMMAR, VAR, kalender } from './tid';
import { State, W, inMap } from './typer';

export const BIN = balans('bin', {
  r: 10, // bina flyger så här många rutor från samhället
  dragFullt: 20, // så mycket som blommar inom räckhåll ger draget 1
  torka: 0.6, // i torkan blommar buskar och grödor så här mycket (ängsblommorna har lagrets egen torka)
});

// en dragkälla: vad den ger inom räckhåll av (x, y), i tidsåldern ai, med eller utan torka. ikon = symbolen i kupans ruta
export interface DragKalla { namn: string; ikon: string; summa: (s: State, x: number, y: number, ai: number, torr: boolean) => number }
// rutorna inom BIN.r rutor från (x, y)
function inomR(x: number, y: number, fn: (i: number) => void) {
  const cx = Math.floor(x), cy = Math.floor(y), r = BIN.r;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r) continue;
    const xx = cx + dx, yy = cy + dy;
    if (inMap(xx, yy)) fn(yy * W + xx);
  }
}
// bärbuskarna blommar mest på våren
const BUSK_ARSTID = [0, 0.5, 0.25, 0];
export const DRAGKALLOR: Record<string, DragKalla> = {
  // ängsblommorna: värmekartans lager, 1 per full ruta, med lagrets egen årstid och torka
  blomma: { namn: 'Ängsblommor', ikon: 'blomma', summa: (s, x, y) => { let n = 0; inomR(x, y, i => { n += fyndAt(s, 'blomma', i); }); return n; } },
  // bärbuskarna: 0,5 per buske på våren och 0,25 på sommaren
  barbuske: { namn: 'Bärbuskar', ikon: 'bar', summa: (s, x, y, ai, torr) => {
    const b = groundOf(s).buske, v = BUSK_ARSTID[ai] * (torr ? BIN.torka : 1);
    if (!b || !v) return 0;
    let n = 0; inomR(x, y, i => { if (b[i] === BUSKE + BARBUSKE) n += v; }); return n;
  } },
  // fältrutorna som växer eller är mogna med en gröda som har ett dragtal (drag på grödans rad i GRODOR), på våren och sommaren
  grodor: { namn: 'Grödor', ikon: 'bonor', summa: (s, x, y, ai, torr) => {
    if (ai !== VAR && ai !== SOMMAR) return 0;
    const r2 = BIN.r * BIN.r, cx = Math.floor(x), cy = Math.floor(y);
    let n = 0;
    for (const f of faltOf(s)) rutorAv(f).forEach((r, k) => {
      const d = r.g && (GRODOR[r.g as GrodaSlag] as { drag?: number }).drag;
      if (!d || (r.st !== 'vaxer' && r.st !== 'mogen')) return;
      const i = faltRuta(f, k), dx = i % W - cx, dy = Math.floor(i / W) - cy;
      if (dx * dx + dy * dy <= r2) n += d;
    });
    return n * (torr ? BIN.torka : 1);
  } },
};
export const DRAG_LIST = Object.keys(DRAGKALLOR);
// varje källas del av det som blommar inom räckhåll av (x, y) just nu
export function dragDelar(s: State, x: number, y: number): Record<string, number> {
  const ai = kalender(s).ai, ut: Record<string, number> = {};
  if (ai === HOST || ai === ISTID) { for (const k of DRAG_LIST) ut[k] = 0; return ut; }
  const torr = torkaNu(s);
  for (const k of DRAG_LIST) ut[k] = DRAGKALLOR[k].summa(s, x, y, ai, torr);
  return ut;
}
// draget på (x, y): summan delad med BIN.dragFullt, högst 1
export const drag = (s: State, x: number, y: number) => Math.min(1, Object.values(dragDelar(s, x, y)).reduce((a, b) => a + b, 0) / BIN.dragFullt);

