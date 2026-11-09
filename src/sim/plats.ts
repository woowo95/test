import { balans } from './balans';

// Balanstalen (regel 8): hur långt folk går från lägret, vad avståndet kostar och när en plats är tömd
export const PLATS = balans('plats', {
  dagX: 17, // en halv dags gång från lägret: så många rutor åt sidorna (arbetsplatser, det byn känner till bortom närområdet och det den ser från lägret)
  dagY: 13, // ... och så många uppåt och nedåt
  avstandPris: 0.03, // en plats är så mycket mindre värd (i värdet av en rik plats) för varje ruta från lägret
  toppProspekt: 10, // byns närområde räknas som snittet av så många av de bästa platserna (fynd.ts)
  toppArea: 5, // ett område räknas som snittet av så många av de bästa rutorna (minne.ts)
  tomtGrans: 0.08, // en plats som ger mindre än så (rikedom, richness) är tömd: man går därifrån (steg.ts)
  vidare: 0.2, // samlandet (steg 2.12.4): när busken är tom går man vidare till en ruta i närheten som ger minst så mycket (nastaBuske i val.ts), annars hem
  husMellan: 2, // så många rutor fritt mellan två hus (steg 2.10.8 och 9.2.132: 3 i steg 6.2.10–9.2.131), och Byggplanens husregler (byggplan.ts) följer samma tal. Hus som redan står flyttas inte ...
  uteFri: 1, // ... och så många fria rutor runt en station eller möbel som står ute, mot lagerplatser och andra stationer (stationer.ts; mot en husvägg får den stå)
});

// avståndet från en ruta (px, py) till närmaste ruta i rektangeln med hörnet (rx, ry) och måtten rw×rh (0 inne i den)
export const rektAvstand = (px: number, py: number, rx: number, ry: number, rw: number, rh: number) =>
  Math.hypot(Math.max(rx - px, 0, px - (rx + rw - 1)), Math.max(ry - py, 0, py - (ry + rh - 1)));
