// En ny värld runt byn (steg 12.3.1, Spelaren och tidskontroll: Testläget). Knappen i testläget laddar en ny värld men behåller
// hela byn, så att samma by kan testas i olika miljöer: världens frö blir ett nytt (s.varldFro, ur byns frö och hur många gånger
// det gjorts, s.varldNr), och världen skapas som när byn grundades, med förhistorien och grannbyarna (nyaGrannbyar). Byn själv,
// dess karta, folk, förråd och hus är desamma. Det går inte medan någon ur byn är ute i världen eller har gäster i byn, för de
// hör till den gamla världen. En värld där byn hamnar på en ö utan grannar hoppas över
import { State } from './typer';
import { varldFro } from './varlden';
import { nyaGrannbyar } from './grannbyar';
import { living } from './folk';
import { ute } from './ute';
import { count, log } from './folk';

const NYVARLD_FORSOK = 10; // så många världar prövas för att hitta en där byn har grannar
export function nyVarldHinder(s: State) {
  if (s.people.some(p => ute(p))) return 'Någon ur byn är ute i världen';
  if (living(s).some(p => p.gast) || s.handlare || s.rovare) return 'Byn har gäster från den gamla världen';
  return undefined;
}
export function nyVarld(s: State): { ok: boolean; text: string } {
  const h = nyVarldHinder(s);
  if (h) return { ok: false, text: h };
  // en värld där byn hamnar på en ö utan grannar duger inte att testa i: då tas nästa
  let nr = s.varldNr ?? 0;
  for (let f = 0; f < NYVARLD_FORSOK; f++) {
    nr++;
    s.varldFro = varldFro(s.seed + nr * 1000003);
    delete s.varld;
    nyaGrannbyar(s);
    const vl = s.varld as import('./varlden').Varlden | undefined, h = vl?.platser?.find(p => p.by === vl.huvud);
    if (h?.grannar?.length) break;
  }
  s.varldNr = nr;
  count(s, 'nyVarld');
  log(s, 'Testläget: byn står i en ny värld.', 'world');
  return { ok: true, text: `En ny värld (nummer ${nr}) runt byn` };
}
