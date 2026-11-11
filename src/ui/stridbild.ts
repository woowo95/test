// Bilden spelar stridens händelser (steg 10.1.5, "Ett slag är en händelse" i designdokumentet). Striden på kartan
// (sim/kartstrid.ts) lägger varje anfall i stridBild.slag i samma ögonblick som det sker. Här tas de emot, ett och ett, och
// visas när tiden som visas når dem: den som anfaller gör slagets rörelse en gång, i vapnets takt, och strecket till den som
// träffas syns en kort stund. Ett slag i koden är ett slag i bilden, och inget ritas som inte har hänt. Filen ritar inget
// själv (ingen PIXI), så att scenariot slagbild kan räkna att varje händelse blir ett ritat slag.
import { type KartStrid, type Person, type SlagBild, type State, SEC, kartStrider, stridBild } from '../sim';

export const SLAGBILD = {
  rorelse: 0.7, // slagets rörelse tar så här stor del av tiden till nästa anfall ...
  langst: 900, // ... men högst så här många millisekunder
  streck: 600, // strecket mellan den som slår och den som träffas syns så här länge (ms)
};
// slagen som tagits emot och inte spelats färdigt än, och hur många som tagits emot sedan byn laddades
let aktiva: SlagBild[] = [];
export const raknare = { ritade: 0 };
export function nollstallSlag() { aktiva = []; raknare.ritade = 0; stridBild.slag.length = 0; }
// hur länge slagets rörelse visas (ms)
export const rorelseTid = (h: SlagBild) => Math.max(200, Math.min(SLAGBILD.langst, h.l * SLAGBILD.rorelse));
// nya slag från striden tas emot (varje slag en gång), och de som spelats färdigt vid tiden nu tas bort
export function taEmotSlag(nu: number) {
  if (stridBild.slag.length) { raknare.ritade += stridBild.slag.length; aktiva.push(...stridBild.slag); stridBild.slag.length = 0; }
  if (aktiva.length) aktiva = aktiva.filter(h => h.t + Math.max(rorelseTid(h), SLAGBILD.streck) >= nu);
}
// slaget personen gör vid tiden nu: hur långt i rörelsen hen kommit (0–1) och var den hen slår mot står
export function slagAv(pid: number, nu: number): { andel: number; mot: { x: number; y: number }; h: SlagBild } | undefined {
  for (let i = aktiva.length - 1; i >= 0; i--) {
    const h = aktiva[i];
    if (h.fran !== pid || nu < h.t) continue;
    const d = rorelseTid(h);
    if (nu <= h.t + d) return { andel: (nu - h.t) / d, mot: { x: h.mx, y: h.my }, h };
  }
  return undefined;
}
// strecken vid tiden nu: slagen som nyss skett, och hur mycket av strecket som är kvar (1 → 0)
export function streckNu(nu: number): { h: SlagBild; kvar: number }[] {
  return aktiva.filter(h => nu >= h.t && nu <= h.t + SLAGBILD.streck).map(h => ({ h, kvar: 1 - (nu - h.t) / SLAGBILD.streck }));
}
// kämpen som är personen p i en strid på kartan: vapnet, den hen har som mål och om hen ligger
export function kartKampe(s: State, p: Person) {
  for (const g of kartStrider(s) as KartStrid[]) {
    if (g.fri?.includes(p.id)) continue;
    const k = g.st.kampar.find(x => x.pid === p.id);
    if (!k) continue;
    const m = k.mal !== undefined ? g.st.kampar.find(x => x.id === k.mal) : undefined;
    return { k, mot: m ? { x: m.x, y: m.y } : undefined, ligger: k.lage === 'nere' || k.lage === 'dod' || !!k.ligger };
  }
  return undefined;
}
export { SEC };
