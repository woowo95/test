import { balans } from './balans';

// skriftens balanstal (skrift.ts, system 10.6), i en egen fil så att tron (religion.ts, kult.ts, kyrka.ts) kan läsa dem utan att
// läsa skrift.ts, som själv läser tron
export const SKRIFT = balans('skrift', {
  vikt: 0.4, // projektets vikt (som stenhuggarplatsen)
  stenar: 3, min: 15, // huggna stenar och minuter för en runsten
  sorg: 1, // lusten efter den dödas sten är sorgens tyngd delat med partnerns, gånger detta
  stolthet: 0.6, // lusten efter en sten om en bedrift: bedriftens vikt gånger detta, gånger egenintresset ...
  bedriftMin: 0.5, // ... när bedriften väger minst så här (en björn, en varg, en uppfinning, ett perfekt mästerverk)
  stolthetDygn: 3, // ... och lusten avtar till noll på så här många dygn
  avtar: 0.5, // lusten halveras för varje sten personen redan rest
  las: 3, // rutor från stenen där den som går förbi läser den
  lasVikt: 1, // intrycket den som läser får är så här stor del av det ristaren hade
  helig: 0.6, // lusten att rista trons heliga kväden för prästen och lärjungen, halverad för varje helig sten tron redan har (steg 10.6.2)
  heligTanke: 0.02, heligTim: 6, // den troende som läser den heliga stenen: tanken och hur länge den varar
  heligR: 8, // så här långt från den heliga platsen eller trons hus får den heliga stenen stå
  // en tro med minst en helig skrift (steg 10.6.3): chansen att sprida tron i ett samtal, hur mycket en profets syn flyttar skalorna
  // och rösterna för att ta bort ett bud, och chansen att profeten grundar en ny tro
  heligSprid: 1.3, heligTrog: 0.5, heligNyTro: 1.5,
  // att skriva och läsa (steg 10.6.5): minuterna, lusten för varje slag på bladet, vikten bredvid vilan och umgänget och glädjen
  skrivMin: 3, lasMin: 2,
  lardom: 0.6, lardomFara: 1.5, // lusten att skriva en lärdom: säkerheten gånger värdet (högst 1) gånger detta, och en fara gånger lardomFara
  berattelse: 0.4, poesi: 0.5, // lusten att skriva om det starkaste intrycket av någon: intryckets styrka (högst 1) gånger detta
  skrivDiv: 20, // skrivvikten är lusten gånger slagets färdighet delat med detta, gånger ljuset
  fritid: 1, // skrivvikten och läsvikten gånger detta, bredvid vilan, handarbetet och umgänget
  lasLardom: 1, lasHandelse: 1, // läsvikten: nyttan av en ny lärdom, och av ett nytt intryck gånger händelsens vikt
  lasGladje: 0.6, // ... och för poesin och berättelsen dessutom detta
  gladjePoesi: 0.04, gladjeBer: 0.02, gladjeTim: 10, // läsarens glädje och hur länge den varar
  // böckerna (steg 10.6.6): delarna i en bok, den lägsta nivån på en teknik som får en handbok, lusten att skriva den (kunskap gånger
  // andelen som inte kan tekniken, plus kunskapBas), läsvikten för en handbok och de heliga kvädena, och hur mycket av tekniken en
  // läsning ger (gånger larBas + intelligens / 20, som i samtalen)
  bokDelar: 8, bokNiva: 2, kunskap: 0.6, kunskapBas: 0.1, lasKunskap: 1, lasHelig: 0.5, bokLar: 0.1,
  ljusMin: 0.3, // i mindre ljus än så här varken skrivs eller läses det
});
