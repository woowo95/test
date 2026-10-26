// ---------- arv och flytt ----------
// När någon dör går allt hen ägde till partnern. Finns ingen partner delas det på barnen, annars på föräldrarna, annars
// på syskonen, och finns ingen av dem blir det byns. Delningen är så jämn som möjligt efter värdet (`grundvarde` i varde.ts),
// utan hänsyn till vad arvingarna behöver: redskapen, som inte går att dela, ges ett i taget (det mest värda först) till
// den som hittills fått minst, och resten (mat, ved, material) delas så att alla får lika mycket i värde. Ett arv är
// inget man skaffat, så delningen efter byns rikedom (delning.ts) gäller inte. Arvet syns i loggen och krönikan men ger
// inga känslor. Ingen sed styr arvet; längre fram kan religionen ge kyrkan en del (steg 10.1.3) och skattelagar staten
// en del (steg 9.5.3). Ett familjehus (byggnader.ts) ärvs som ett redskap, efter sitt värde, och får den nya ägarens namn.
// Den som flyttar tar med sig så mycket av sitt eget som hen orkar bära, det mest värda för vikten först; resten blir byns.
import { tingOf } from './agande';
import { count, isKin, isParent, living, log } from './folk';
import { kronika } from './historik';
import { capacity, carryOff, ownedAll, passOn } from './lager';
import { sakNamn, stackOf, tingNamn } from './saker';
import { grundvarde, husVarde, tingVarde, varuVarde } from './varde';
import { housesOf } from './byggnad';
import { husNamn } from './byggnader';
import { Person, State } from './typer';

// arvingarna, i tur och ordning: partnern, barnen, föräldrarna, syskonen
function heirsOf(s: State, p: Person): Person[] {
  const lev = living(s).filter(q => q !== p);
  const partner = lev.find(q => q.id === p.partner);
  if (partner) return [partner];
  const led = [(q: Person) => isParent(p, q), (q: Person) => isParent(q, p), (q: Person) => isKin(p, q)];
  for (const f of led) { const h = lev.filter(f); if (h.length) return h; }
  return [];
}

const lista = (d: string[]) => d.length > 1 ? `${d.slice(0, -1).join(', ')} och ${d[d.length - 1]}` : d[0];

// p har dött: arvingarna får det hen ägde. Anropas innan delarna blir byns (releaseOwner)
export function inherit(s: State, p: Person) {
  const heirs = heirsOf(s, p);
  if (!heirs.length) return;
  const val = heirs.map(() => 0), fick: string[][] = heirs.map(() => []);
  const tools = tingOf(s).filter(t => t.agare === p.id).sort((a, b) => tingVarde(b) - tingVarde(a) || a.id - b.id);
  for (const t of tools) {
    const i = val.indexOf(Math.min(...val));
    t.agare = heirs[i].id; val[i] += tingVarde(t);
    fick[i].push(tingNamn(t).toLowerCase());
  }
  const hus = housesOf(s).filter(q => q.ag === p.id).sort((a, b) => husVarde(s, b) - husVarde(s, a) || a.id - b.id);
  for (const h of hus) {
    const i = val.indexOf(Math.min(...val));
    fick[i].push(h.namn); h.ag = heirs[i].id; val[i] += husVarde(s, h);
    if (h.namn === husNamn(p.name)) h.namn = husNamn(heirs[i].name);
  }
  const eget = ownedAll(s, p.id);
  const rest = varuVarde(eget);
  if (Object.keys(eget).length) {
    // resten delas så att alla kommer så nära samma värde som det går
    const mal = (val.reduce((a, b) => a + b, 0) + rest) / heirs.length, d = val.map(v => Math.max(0, mal - v)), sd = d.reduce((a, b) => a + b, 0);
    const f: Record<number, number> = {};
    heirs.forEach((h, i) => { f[h.id] = sd > 1e-9 ? d[i] / sd : 1 / heirs.length; });
    passOn(s, p.id, f);
    heirs.forEach((h, i) => { for (const k in eget) { const n = eget[k] * f[h.id]; if (n >= 0.5) fick[i].push(`${Math.round(n)} ${sakNamn(k).toLowerCase()}`); } });
  }
  heirs.forEach((h, i) => {
    if (!fick[i].length) return;
    const text = `${h.name} ärvde ${lista(fick[i])} efter ${p.name}.`;
    log(s, text, 'death', [h.id, p.id]); kronika(s, text);
  });
  if (tools.length || hus.length || Object.keys(eget).length) count(s, 'arv'); // bara när något gick till en arvinge
}

// p flyttar: hen tar med sig det mest värda för vikten av sitt eget, så mycket hen orkar bära (ett redskap är en full
// börda, lager.ts: load). Anropas innan resten blir byns (releaseOwner)
export function packUp(s: State, p: Person) {
  let kvar = capacity(s, p);
  const eget = ownedAll(s, p.id);
  const saker = [
    ...tingOf(s).filter(t => t.agare === p.id).map(t => ({ k: t.k, ting: t.id, n: 1, per: tingVarde(t), bord: 1 })),
    ...Object.keys(eget).map(k => ({ k, ting: undefined, n: eget[k], per: grundvarde(k) * stackOf(k), bord: 1 / stackOf(k) })),
  ].sort((a, b) => b.per - a.per || a.k.localeCompare(b.k));
  for (const x of saker) {
    if (kvar <= 1e-9) break;
    if (x.ting !== undefined) {
      if (kvar < 1 - 1e-9) continue;
      s.ting = tingOf(s).filter(t => t.id !== x.ting); kvar -= 1;
    } else {
      const n = Math.min(x.n, kvar / x.bord);
      carryOff(s, p.id, x.k, n); kvar -= n * x.bord;
    }
  }
}
