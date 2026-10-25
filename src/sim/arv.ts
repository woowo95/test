// ---------- arv och flytt ----------
// När någon dör går allt hen ägde till partnern. Finns ingen partner delas det på barnen, annars på föräldrarna, annars
// på syskonen, och finns ingen av dem blir det byns. Delningen är så jämn som möjligt efter värdet (`varde` i saker.ts),
// utan hänsyn till vad arvingarna behöver: redskapen, som inte går att dela, ges ett i taget (det mest värda först) till
// den som hittills fått minst, och resten (mat, ved, material) delas så att alla får lika mycket i värde. Ett arv är
// inget man skaffat, så delningen efter byns rikedom (delning.ts) gäller inte. Arvet syns i loggen och krönikan men ger
// inga känslor. Ingen sed styr arvet; längre fram kan religionen ge kyrkan en del (steg 10.1.3) och skattelagar staten
// en del (steg 9.5.3).
// Den som flyttar tar med sig så mycket av sitt eget som hen orkar bära, det mest värda för vikten först; resten blir byns.
import { tingOf } from './agande';
import { count, isKin, living, log } from './folk';
import { kronika } from './historik';
import { capacity, carryOff, ownedAll, passOn } from './lager';
import { SAKER, STACK, sakNamn } from './saker';
import { Person, State } from './typer';

const vardeOf = (k: string) => SAKER[k]?.varde ?? 0;

// arvingarna, i tur och ordning: partnern, barnen, föräldrarna, syskonen
export function heirsOf(s: State, p: Person): Person[] {
  const lev = living(s).filter(q => q !== p);
  const partner = lev.find(q => q.id === p.partner);
  if (partner) return [partner];
  const led = [(q: Person) => q.mother === p.id || q.father === p.id, (q: Person) => p.mother === q.id || p.father === q.id, (q: Person) => isKin(p, q)];
  for (const f of led) { const h = lev.filter(f); if (h.length) return h; }
  return [];
}

const lista = (d: string[]) => d.length > 1 ? `${d.slice(0, -1).join(', ')} och ${d[d.length - 1]}` : d[0];

// p har dött: arvingarna får det hen ägde. Anropas innan delarna blir byns (releaseOwner)
export function inherit(s: State, p: Person) {
  const heirs = process.env.PROV === 'arv' ? [] : heirsOf(s, p);
  if (!heirs.length) return;
  const val = heirs.map(() => 0), fick: string[][] = heirs.map(() => []);
  const tools = tingOf(s).filter(t => t.agare === p.id).sort((a, b) => vardeOf(b.k) * b.c - vardeOf(a.k) * a.c || a.id - b.id);
  for (const t of tools) {
    const i = val.indexOf(Math.min(...val));
    t.agare = heirs[i].id; val[i] += vardeOf(t.k) * t.c;
    fick[i].push(sakNamn(t.k).toLowerCase());
  }
  const eget = ownedAll(s, p.id);
  let rest = 0;
  for (const k in eget) rest += eget[k] * vardeOf(k);
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
  count(s, 'arv');
}

// p flyttar: hen tar med sig det mest värda för vikten av sitt eget, så mycket hen orkar bära (ett redskap är en full
// börda, lager.ts: load). Anropas innan resten blir byns (releaseOwner)
export function packUp(s: State, p: Person) {
  let kvar = process.env.PROV === 'arv' ? 0 : capacity(s, p);
  const eget = ownedAll(s, p.id);
  const saker = [
    ...tingOf(s).filter(t => t.agare === p.id).map(t => ({ k: t.k, ting: t.id, n: 1, per: vardeOf(t.k) * t.c, bord: 1 })),
    ...Object.keys(eget).map(k => ({ k, ting: undefined, n: eget[k], per: vardeOf(k) * (STACK[k] ?? 25), bord: 1 / (STACK[k] ?? 25) })),
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
