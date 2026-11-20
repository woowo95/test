// ---------- tron, sederna och styret i den väckta byn (steg 11.13.19, Flera samhällen: Den väckta byn i tal) ----------
// Byggaren ger byn radens tro och ledare. Tron (troUrRad i religion.ts) har radens namn och läggning, och så stor del av folket
// som raden säger tror, de mest andliga först; den näst största tron (annan) får sina troende bland resten. De heliga platserna
// ur minnesbilden hör till den största tron. Ledaren är radens fasta ledare (vacktfasta.ts), som lett byn sedan den senaste nya
// ledaren i världens krönika (ledareUrRad i styre.ts). Sederna kommer som i varje by ur folkets anlag, upplevelser och tro
import { ALDER } from './folk';
import { andlighet, troUrRad } from './religion';
import type { VarldRad } from './radtal';
import { ledareUrRad } from './styre';
import { DAY, Person, State } from './typer';

export function byggTro(b: State, r: VarldRad) {
  const folk = b.people.filter(p => p.died === undefined), fria = folk.slice().sort((a, c) => andlighet(b, c) - andlighet(b, a) || a.id - c.id);
  for (const p of folk) { p.tro = undefined; p.troStyrka = undefined; } // (en fast person som sparats med hela personen hade en tro i den byn hen kom ifrån)
  let storsta: number | undefined;
  for (let rt = r.tro; rt; rt = rt.annan) {
    const n = Math.min(fria.length, Math.round(rt.andel / 100 * folk.length));
    if (n <= 0) continue;
    const tr = troUrRad(b, rt, fria.splice(0, n), r.grundad);
    storsta ??= tr?.id;
  }
  for (const h of b.heliga ?? []) if (h.tro === -1) h.tro = storsta ?? -1;
  if (storsta === undefined && b.heliga) b.heliga = b.heliga.filter(h => h.tro !== -1); // ingen tro kvar som platsen var helig för
  // ledaren
  const l = folk.find(p => p.fastRoll === 'ledare');
  if (!l) return;
  const ny = (b.varld?.kronika ?? []).filter(h => h.k === 'nyLedare' && h.by === r.nr && h.t <= b.now).at(-1)?.t;
  ledareUrRad(b, l, Math.min(b.now, Math.max(ny ?? r.grundad, vuxen(l))));
}
const vuxen = (p: Person) => p.born + ALDER.vuxen * DAY;
