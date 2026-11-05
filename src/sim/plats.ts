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
  lekBredd: 8, // lekplatsen (steg 2.10.4, lekplats i stationer.ts) är så många rutor bred ...
  lekFran: 1, // ... ligger helst så här många rutor utanför byns område (omrade.ts) med sin närmaste ruta, helst söderut ...
  lekDjup: 3, // ... och är så här många rutor djup (barnen leker där i val.ts, och byn bygger helst inte där, bygg.ts)
  lekSok: 6, // så långt utanför byns område som lekplatsen kan ligga
  lekHinder: 4, // en ruta på lekplatsen där något står (ett hus, ett lager, en station, ett träd) kostar så här mycket ...
  lekNorr: 1, // ... och en lekplats norr om byns inre mitt så här mycket (förr låg den alltid söder om elden)
  husMellan: 2, // byn sprids ut (steg 2.10.8): så många rutor fritt mellan två hus, plats för en stig (bygg.ts) ...
  uteFri: 1, // ... och så många fria rutor runt en station eller möbel som står ute, mot lagerplatser och andra stationer (stationer.ts; mot en husvägg får den stå)
});

// avståndet från en ruta (px, py) till närmaste ruta i rektangeln med hörnet (rx, ry) och måtten rw×rh (0 inne i den)
export const rektAvstand = (px: number, py: number, rx: number, ry: number, rw: number, rh: number) =>
  Math.hypot(Math.max(rx - px, 0, px - (rx + rw - 1)), Math.max(ry - py, 0, py - (ry + rh - 1)));
