import { kvarById, FyndId, Grupp, Person, Pile, State, Task, W, pilesOf, sparUppgift, tingOf, useMap } from '../sim';
import type { FlikId } from './panel';

// det hela gränssnittet delar: byn som visas och vad spelaren har valt.
// Byn byts med setByn (ny by, testläget, inläst sparning); alla moduler ser då den nya. Det som hör till den förra byn
// (pratbubblor, trender, vem som följs) nollställs, och moduler med eget sådant lägger en rad i vidNyBy
export let s: State;
export const vidNyBy: (() => void)[] = [];
// panelen ritas om (panel.ts sätter den); för det som ändras utan ett tryck, t.ex. ett drag i en graf eller ett val i en lista
export let ritaOm = () => {};
export const satRitaOm = (f: () => void) => { ritaOm = f; };
export function setByn(n: State) {
  s = n; ui.nu = n.now; useMap(n); nyBild();
  ui.hovered = undefined; ui.husId = -1; ui.stationId = -1; ui.flytta = -1; ui.flyttaDel = -1; ui.flyttFel = false; ui.hogAt = { x: 0, y: 0 }; ui.filtAt = { x: 0, y: 0 }; ui.byteNr = -1; ui.framNr = -1; ui.matchNr = -1; ui.sak = ''; ui.faltId = -1; ui.faltRuta = -1; ui.djurId = -1; ui.djurHover = -1; ui.eld = undefined; ui.sjoNr = 0; ui.lagerNr = 0; // de pekade in i den förra byn
  for (const f of vidNyBy) f();
}
export const ui = {
  tab: undefined as FlikId | undefined, // fliken i personens panel till vänster (personen, elden, saken …), steg 5.3.1.1
  hoger: undefined as FlikId | undefined, // kartan börjar fri (steg 5.3.7); Folket har ingen egen flik (steg 6.9.15)
  // ↑ den öppna flikens panel till höger (Byn, Teknik, Krönika …)
  selected: undefined as number | undefined, // personen som visas i panelen
  styreDel: 'styre', // delen i stenen Styre (DELAR i flikar/styre.ts, steg 9.3.1)
  omvDel: 'grannar', // delen i stenen Omvärlden (DELAR i flikar/grannar.ts, steg 9.3.3)
  personFall: {} as Record<string, boolean>, // delarna i personens flikar som man fällt ut eller ihop (steg 5.3.4.2)
  personDel: 'om', // fliken i personrutan (FLIKAR i flikar/person.ts), eller en del i den (DELAR)
  hovered: undefined as number | undefined, // personen under musen
  eld: undefined as number | undefined, // lägerelden som eldens flik visar: undefined = den första, annars en till (Fire.id, steg 4.5.6.8)
  follow: undefined as number | undefined, // personen kameran följer
  busy: false, // ikappräkning pågår
  spola: false, // ikappräkningen visas som en snabbspolning av kartan (steg 5.4.5.1; sparas i webbläsaren, ui/spara.ts)
  nu: 0, // tiden som visas (byn är räknad ett slag längre, main.ts)
  sparFel: false, // senaste sparningen i artefaktens databas misslyckades
  molnFel: false, // byn i artefaktens databas gick inte att läsa, och sparas därför inte där (spara.ts)
  lokalFel: false, // senaste sparningen i webbläsaren misslyckades
  testMode: false, // testläget: en kopia av byn som kan spolas fram
  annanBy: undefined as string | undefined, // en annan by än den egna är vald (steg 9.2.16, ui/byar.ts)
  forskjut: 0, // ... och så långt efter klockan går den (ms); den egna byn går i klockans tid
  byFel: '', // det som gick fel när en by lades till eller valdes
  kvSort: false, // stackarna i förrådet, kistan och en persons saker sorteras efter kvalitet (steg 9.2.18)
  lastPointer: 0, // när spelaren senast tryckte: panelen byts inte ut mitt i ett tryck
  husId: -1, // huset som visas i panelen
  stationId: -1, // stationen som visas i panelen
  flytta: -1, // testläget (steg 3.10.1): stationen som flyttas till rutan man trycker på härnäst ...
  flyttaDel: -1, // ... eller bara den delen av den (steg 9.4.2)
  flyttFel: false, // ... och om den inte fick plats där
  brandTest: false, // testläget (steg 4.5.6.6): nästa tryck på kartan tänder en brand där
  blixtTest: false, // testläget (steg 6.4.7): varje tryck på kartan låter en blixt slå ner där, tills knappen trycks igen
  testBorta: { st: [] as number[], lager: [] as { x: number; y: number; w: number; h: number }[] }, // testläget (steg 4.5.7.8): det som tagits bort, och tas bort ur den riktiga byn när testläget slutar
  sjoNr: 0, // sjön som visas i panelen
  faltId: -1, // fältet som visas i panelen (flikar/falt.ts) ...
  faltRuta: -1, // ... och rutan med grödan som visas, eller -1 för hela fältet
  hogAt: { x: 0, y: 0 }, // rutan med högar utanför lagret som visas i panelen
  filtAt: { x: 0, y: 0 }, // platsen man tryckte på en filt (flikar/filt.ts, steg 4.5.4.13)
  framNr: -1, // framträdandet som visas i fliken Framträdandet (steg 5.4.7.1)
  matchNr: -1, // matchen som visas i fliken Matchen (steg 5.4.8.1)
  byteNr: -1, // bytet som visas i filtfliken (ett minne, steg 4.5.4.17), eller -1 för filten man tryckte på
  djurId: -1, // djuret som visas i panelen (flikar/djur.ts)
  djurHover: -1, // djuret under musen (den vita kanten, vaxter.ts)
  sak: '', // saken som visas i panelen: "t:<id>", "s:<x>,<y>,<slag>", toa-högen "f:<ruta>", stubben "u:<ruta>" eller trädet "r:<ruta>" (flikar/sak.ts)
  lagerNr: 0, // vilken lagerplats som visas i panelen
  filter: undefined as Grupp | undefined, // värmekartan som visas på kartan
  filterArt: undefined as FyndId | undefined, // bara en art i gruppen, vald i teckenförklaringen
  stammar: false, // träden visas som stammar (steg 5.3.6)
};

// stackarna räknas fram en gång per bildruta, inte för varje sak som ritas eller visas
let pileCache: Pile[] | undefined;
export const piles = () => pileCache ??= pilesOf(s);
export function nyBild() { pileCache = undefined; }
// högar utanför lagret på en ruta: det som inte fick plats och det som lagts på marken
export const outPilesAt = (x: number, y: number) => piles().filter(q => q.out && q.x === x && q.y === y);
// var saken som visas i panelen (ui.sak) finns i byn, för den vita kanten runt den (steg 3.10.4): rutan den ligger på, stationen
// den står vid eller den som har den på sig, i handen eller bär den
export function sakVar(): { x: number; y: number } | { station: number } | { person: number } | undefined {
  const [slag, rest = ''] = ui.sak.split(':');
  if (slag === 'f' || slag === 'u' || slag === 'r' || slag === 'b' || slag === 'g' || slag === 'h') { const i = Number(rest); return { x: i % W, y: Math.floor(i / W) }; } // toa-högen, stubben (steg 3.10.6), trädet (steg 5.1.4.3) och busken (steg 6.5.3)
  if (slag === 's') { const [x, y] = rest.split(',').map(Number); return { x, y }; }
  if (slag === 'a') { const i = Number(rest); return { x: i % W, y: Math.floor(i / W) }; } // den uppsatta facklan (steg 6.3.7)
  if (slag === 'k') { const k = kvarById(s, Number(rest)); return k && { x: k.x, y: k.y }; } // det som blivit kvar av en människa (steg 8.2.3)
  if (slag === 'v') { const k = s.stockar?.find(q => q.id === Number(rest)); return k && { x: Math.floor(k.x), y: Math.floor(k.y) }; } // stocken
  const t = slag === 't' ? tingOf(s).find(k => k.id === Number(rest)) : undefined;
  if (!t) return undefined;
  const person = t.bar ?? t.hos ?? t.lass;
  if (person !== undefined) return { person };
  if (t.vid !== undefined) return { station: t.vid };
  const p = piles().find(q => q.id === t.id);
  return p && { x: p.x, y: p.y };
}

// vad p gör vid tiden som visas (steg 4.5.6.5): byn är räknad ett slag före klockan som visas, och uppgiften sparas med tiden
// varje gång den eller dess fas byts under slaget (spar.u, steg.ts). Före slagets början, eller när inget sparats: uppgiften nu
export const uppgiftVid = (p: Person, t = ui.nu): Task | undefined => sparUppgift(p, t, s.now);
