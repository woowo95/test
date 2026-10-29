import { balans } from './balans';
import { count, living, log } from './folk';
import { motgangNu } from './motgang';
import { freeNear, touch } from './byggnad';
import { nyttVatten } from './mark';
import { takenOf } from './fynd';
import { avbryt } from './lager';
import { sjoNamn, sjoarna, vattenNu } from './sjo';
import { vaderNu } from './vader';
import { DAY, H, State, T, W, inMap } from './typer';

// Torkan (steg 3.8.2, "Motgångarna i spelet" i designdokumentet). En av motgångarna i registret MOTGANGAR (motgang.ts):
// nästan inget regn på hela sommaren, så att markens fukt sjunker mot noll (vader.ts). Sjöarna krymper vid kanten till torr
// sjöbotten (T.Lera, vattnet som det är nu i sjo.ts) som går att gå på, och små sjöar torkar ut helt. Fisken samlas i det
// vatten som är kvar, bär, rötter och svamp växer sämre (fältet torka i FYND), kaninerna söker sig mot vattnet (fynd.ts) och
// grödor som inte vattnas vissnar (odling.ts). Vattnet kommer tillbaka med regnet, en ruta i taget.
// Fisken och kaninerna under torkan har sina tal i FANGST (fynd.ts). Allt som ändrar vattnet sker här, i timsteget, så att det levande läget och ikappräkningen får samma sjöar.

// Balanstal (regel 8)
export const TORKA = balans('torka', {
  regn: 0.25, // under torkan är gränsen för regn (regnFran i vader.ts) så här mycket högre: nästan inget regn ...
  torkar: 2, // ... och marken torkar så här många gånger fortare
  sjunker: [2, 4], // så många dygn (år i spelet) in i torkan har sjöarna sjunkit en och två rutor vid kanten ...
  liten: 40, // ... och vid två rutor torkar sjöar med högst så här många rutor vatten ut helt
  stigRegn: 1, // efter torkan stiger vattnet ett steg för varje så här mycket regn (timmar i det kraftigaste regnet): först fylls de uttorkade sjöarna, sedan kanten
  falt: 24, // timmar som en gröda klarar sig utan vatten under torkan innan den vissnar ...
  vattna: 0.5, // ... ägaren vattnar när det är mindre än så här kvar ...
  sackRutor: 10, // ... och en vattensäck räcker till så här många rutor
});

export const torkaNu = (s: State, t = s.now) => motgangNu(s, t)?.id === 'torka';

// ---------- varje timme (steg.ts) ----------
// under torkan sjunker sjöarna, efteråt stiger de när det regnat
export function stepTorka(s: State) {
  const nu = motgangNu(s), pa = nu?.id === 'torka';
  let st = s.sjoTorr;
  if (!st && !pa) return;
  st ??= s.sjoTorr = { niva: 0, tomma: [], v: 0, t: s.now };
  const fore = vattenNu(s); // vattnet innan något ändras här (sparat tills st.v ändras)
  if (pa) st.pa = true; else delete st.pa;
  if (pa) {
    const gatt = s.now - nu!.start, mal = gatt >= TORKA.sjunker[1] * DAY ? 2 : gatt >= TORKA.sjunker[0] * DAY ? 1 : 0;
    if (mal > st.niva) {
      st.niva = mal;
      const nya = mal >= 2 ? sjoarna(s.seed).rutor.map((r, n) => ({ r, n })).filter(({ r, n }) => n > 0 && r.length <= TORKA.liten && !st!.tomma.includes(n)).map(x => x.n) : [];
      st.tomma.push(...nya);
      vattnetAndrat(s, fore);
      count(s, 'sjon sjunker');
      log(s, nya.length ? `Torkan håller i sig. Sjön har dragit sig tillbaka och ${nya.length === 1 ? sjoNamn(s, nya[0]).toLowerCase() + ' har' : nya.length + ' tjärnar har'} torkat ut.` : 'Torkan håller i sig. Sjön har dragit sig tillbaka från stranden.', 'world');
      if (nya.length) count(s, 'sjo torkat ut', nya.length);
    }
    return;
  }
  // efter torkan: vattnet stiger när det har regnat
  if (!st.niva && !st.tomma.length) { delete s.sjoTorr; return; }
  const v = vaderNu(s);
  if (!v.sno) st.regn = (st.regn ?? 0) + v.nb;
  if ((st.regn ?? 0) < TORKA.stigRegn) return;
  st.regn = 0;
  if (st.tomma.length) st.tomma = [];
  else if (st.niva > 0) st.niva--;
  if (!st.niva && !st.tomma.length) delete s.sjoTorr;
  vattnetAndrat(s, fore);
  count(s, 'sjon stiger');
  log(s, s.sjoTorr ? 'Regnet har fyllt på sjöarna igen.' : 'Sjön är tillbaka vid stranden.', 'world');
}

// vattnet har ändrats: kartan, vägarna och det som stod där vattnet kom tillbaka. flytta = stackarna och tingen flyttas
// upp på land (efter torkan); vid en översvämning ligger de kvar (flod.ts)
export function vattnetAndrat(s: State, fore: Uint8Array, flytta = true) {
  if (s.sjoTorr) { s.sjoTorr.v++; s.sjoTorr.t = s.now; }
  const efter = vattenNu(s);
  nyttVatten(s); touch(s);
  const blot = (x: number, y: number) => { const cx = Math.floor(x), cy = Math.floor(y); return inMap(cx, cy) && efter[cy * W + cx] === T.Vatten && fore[cy * W + cx] !== T.Vatten; };
  // fisken i en sjö som torkat ut är borta, och den kommer tillbaka långsamt
  const fisk = takenOf(s).fiske;
  if (fisk) for (let i = 0; i < W * H; i++) if (efter[i] === T.Vatten && fore[i] !== T.Vatten) fisk[i] = 1;
  for (const p of living(s)) {
    const t = p.task, mal = t && blot(t.tx, t.ty);
    if (blot(p.x, p.y)) { const f = freeNear(s, Math.floor(p.x), Math.floor(p.y)); p.x = f.x + 0.5; p.y = f.y + 0.5; }
    if (mal) avbryt(s, p); // målet står under vatten: hen väljer något annat
  }
  if (!flytta) return;
  for (const a of s.stackar ?? []) if (blot(a.x, a.y)) { const f = freeNear(s, a.x, a.y); a.x = f.x; a.y = f.y; }
  for (const t of s.ting ?? []) if (t.x !== undefined && t.y !== undefined && blot(t.x, t.y)) { const f = freeNear(s, t.x, t.y); t.x = f.x; t.y = f.y; }
}
// hur många rutor av sjön som är torr sjöbotten just nu (gränssnittet)
export const torrRutor = (s: State) => { const t = vattenNu(s); let n = 0; if (s.sjoTorr) for (let i = 0; i < W * H; i++) if (t[i] === T.Lera) n++; return n; };
