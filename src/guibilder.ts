// GENERERAD av bildstil/guitillspelet.cjs ur bildstil/gui.json (steg 5.3.1.4). Ändra inte här: ändra i bildstilen och kör skriptet.
// Gränssnittets bilder: hörnet på panelerna (det övre vänstra; ui/ram.ts speglar det till de andra).
export interface GuiBild { w: number; h: number; rader: string[]; pal: Record<string, string> }
export const GUI: { horn: GuiBild & { val: string; kant: { x: number; y: number } } } = {
 "horn": {
  "val": "ormen",
  "w": 48,
  "h": 22,
  "kant": {
   "x": 10,
   "y": 10
  },
  "rader": [
   "..abbbbba.......................................",
   ".abbcabbba......................................",
   "abbbbbbbbba.....................................",
   "abbbbbbbbbba....................................",
   ".aaaabbbbbba....................................",
   "..dd.abbbba.....................................",
   ".d..a.abbaa.....................................",
   "...a.eaaabba....................................",
   "...aefabbbbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.......",
   "....aa.abbbbbffffffffffffffffffffffffffffaa.....",
   "........abbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbaaaaa",
   ".........abfbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbaaaa",
   "..........abbgggggggggggggggggggggggggfbbbbba...",
   "..........abbaaaaaaaaaaaaaaaaaaaaaaaafbaabbba...",
   "..........abba......................abbaafbba...",
   "..........abba......................abbbfbbga...",
   "..........abba......................aabbbbgaa...",
   "..........abba.......................aagggaa....",
   "..........abba.........................aaa......",
   "..........abba..................................",
   "..........abba..................................",
   "..........abba.................................."
  ],
  "pal": {
   "a": "#24201d",
   "b": "#474138",
   "c": "#dad0bb",
   "d": "#a14808",
   "e": "#a0947d",
   "f": "#7e7362",
   "g": "#2f261d"
  }
 }
};
