// hur figuren står i bilden (steg 10.2.55): sitter, går eller står. Ingen ritning här, så att testet (scenariot stalle) kan
// gå igenom en by med samma regler som bilden. Sittanimationen visas bara på en sittplats (en stubbe eller stol vid ett bord,
// stationRutor i stationer.ts) eller på stolen vid en bänk, och gåanimationen bara när figuren flyttat sig sedan förra bilden
import { ACTS, STATION, arbetsDel, blocked, forflyttar, isKlar, kroppFart, lekGang, sittAt, sparPlats, sparUppgift, stationAt, stationDef, stationerOf, storlekAv, vidStation, type Person, type State, type Station } from '../sim';

// handlingarna man gör sittande när det finns en plats att sitta på; annars står man
export const SITTA = new Set(['maltid', 'samtal', 'vila', 'lyssna', 'beratta']);
export type Stalle = 'sitta' | 'ga' | 'sta' | 'ligga';
// gor = handlingen hen gör på platsen (fasen do), vidBank = hen arbetar på stolen vid en bänk, rorde = figuren har flyttat
// sig sedan förra bilden
export function stalle(s: State, l: { ligger: boolean; gor?: string; x: number; y: number; vidBank: boolean; rorde: boolean }): Stalle {
  if (l.ligger) return 'ligga';
  if (l.vidBank || l.gor && SITTA.has(l.gor) && sittAt(s, l.x, l.y)) return 'sitta';
  if (l.gor === 'vila') return 'ligga'; // vilan utan sittplats: man ligger på marken, aldrig stående (steg 10.2.76)
  return l.rorde ? 'ga' : 'sta';
}

// stå vid arbetet (steg 10.2.78): den som arbetar med en ruta (fäller ett träd, hugger eller klyver en stam, gräver bort en stubbe)
// står på en ruta intill, helst söder om den, och är vänd mot den. Simuleringen har arbetet på rutan; bilden ställer figuren bredvid
export const RUTA_ARBETEN = new Set(['falla', 'hugga', 'klyva', 'stubbe']);
export type Riktning = 'fram' | 'bak' | 'sida' | 'vast';
const SIDOR: [number, number, Riktning][] = [[0, 1, 'bak'], [-1, 0, 'sida'], [1, 0, 'vast'], [0, -1, 'fram']]; // rutan intill och hållet mot arbetet
// samRuta (steg 12.1.33): rutorna intill som andra som arbetar redan står på i bilden; den som arbetar på samma ruta som en
// annan står då bredvid, på nästa fria sida, i stället för ovanpå. Är alla sidor tagna står hen på den första
export function vidArbetet(s: State, gor: string | undefined, x: number, y: number, samRuta?: Set<number>): { x: number; y: number; rikt: Riktning } | undefined {
  if (!gor || !RUTA_ARBETEN.has(gor)) return undefined;
  const rx = Math.floor(x), ry = Math.floor(y);
  let forsta: { x: number; y: number; rikt: Riktning } | undefined;
  for (const [dx, dy, rikt] of SIDOR) {
    const nx = rx + dx, ny = ry + dy;
    if (blocked(s, nx + 0.5, ny + 0.5) || stationAt(s, nx + 0.5, ny + 0.5)) continue;
    const v = { x: nx + 0.5, y: ny + 0.5, rikt };
    forsta ??= v;
    if (!samRuta?.has(ny * 4096 + nx)) { samRuta?.add(ny * 4096 + nx); return v; }
  }
  return forsta ?? { x: rx + 0.5, y: ry + 1.5, rikt: 'bak' };
}

// vänd mot bänken (steg 12.1.154): den som arbetar vid en station (bänken, ställningen, ugnen, smedjan) står framför delen man
// arbetar vid (vidStation) och är vänd mot den, vilket håll hen än kom ifrån och vilken rörelse arbetet än har. Riktningen
// sätts ur var stationen ligger, som vid arbetet på en ruta (steg 10.2.78). Bilden och scenariot stalle frågar samma funktion
export function vidStationen(s: State, gor: string | undefined, x: number, y: number): { st: Station; rikt: Riktning } | undefined {
  if (!gor) return undefined;
  for (const t of stationerOf(s)) {
    if (!isKlar(t) || !stationDef(t.k)?.gor.includes(gor as never)) continue;
    const at = vidStation(t);
    if (Math.hypot(x - at.x, y - at.y) >= STATION.vidBank) continue;
    const q = arbetsDel(t), dx = q.x + q.w / 2 - x, dy = q.y + q.h / 2 - y;
    return { st: t, rikt: mot(dx, dy) };
  }
  return undefined;
}
// hållet mot en punkt dx, dy bort: 'sida' är österut, 'vast' västerut, 'fram' söderut (mot betraktaren) och 'bak' norrut
export const mot = (dx: number, dy: number): Riktning => Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'sida' : 'vast') : dy > 0 ? 'fram' : 'bak';

// om figuren går i bilden vid tiden t (steg 12.1.13, Det visuella: En källa för rörelsen): simuleringens spår (forflyttar i
// steg.ts), leken som går i gångfart mellan sina punkter (lekGang i gang.ts) och jägaren under de delar av försöket då hen går
// (jaktPlats i ui/jakt.ts, ur jaktForlopp). Bilden jämför aldrig sina egna ritade platser: svängningen hos den som arbetar
// är ingen gång. Samma funktion ger bilden och scenariot stalle sin indata
export function garIBilden(s: State, p: Person, t: number, jakt?: { gar?: boolean }): boolean {
  if (jakt) return !!jakt.gar;
  if (forflyttar(p, t)) return true;
  const tk = sparUppgift(p, t, s.now), d = tk?.phase === 'do' ? ACTS[tk.act] : undefined, w = d?.vandra;
  if (!tk || !d || !w || d.slag !== 'leka' || d.stilla || d.tur || tk.act === 'sport' && s.sport?.start === tk.ref) return false;
  return lekGang(p.id, w.r * 0.6, (w.h0 + w.h1) / 2, kroppFart(p, t), t).gar;
}

// platsen i simuleringen vid tiden t (steg 12.1.129): spåret (sparPlats), leken mellan sina punkter (lekGang) och jägaren
// (jaktPlats i ui/jakt.ts). Inget av det bilden själv lägger på (svängningen, knuffarna, arbetet bredvid rutan) räknas
export function simPlats(s: State, p: Person, t: number, jakt?: { x: number; y: number }): { x: number; y: number } {
  if (jakt) return { x: jakt.x, y: jakt.y };
  const sp = sparPlats(p, t), x = sp?.x ?? p.x, y = sp?.y ?? p.y;
  const tk = sparUppgift(p, t, s.now), d = tk?.phase === 'do' ? ACTS[tk.act] : undefined, w = d?.vandra;
  if (!tk || !d || !w || d.slag !== 'leka' || d.stilla || d.tur || !(sp?.still ?? true)) return { x, y };
  const l = lekGang(p.id, w.r * 0.6, (w.h0 + w.h1) / 2, kroppFart(p, t), t);
  return { x: x + l.dx, y: y + l.dy };
}
// gånganimationen (steg 12.1.129, Kartan: sömnen, zoomen, skenet och gången): benen rör sig bara när personens plats i
// simuleringen har ändrats sedan förra bilden, oavsett vad aktiviteten säger. Står bildens tid still, eller ligger den
// utanför spåret, står figuren. forra = platserna i förra bilden, per person; bilden och scenariot stalle frågar samma funktion
export const GANG_MIN = 1e-4; // så många rutor måste platsen ha flyttats för att det ska vara gång
export function garNu(s: State, p: Person, t: number, forra: Map<number, { x: number; y: number }>, jakt?: { x: number; y: number; gar?: boolean }) {
  const q = simPlats(s, p, t, jakt), f = forra.get(p.id);
  forra.set(p.id, q);
  return !!f && Math.hypot(q.x - f.x, q.y - f.y) > GANG_MIN && garIBilden(s, p, t, jakt);
}

// sängen (steg 6.8.5 och 12.1.14): den som sover i en färdig säng ligger längs den mitt i bädden, med huvudet i huvudänden
// (vänster i den liggande bädden, uppåt i den stående) och ansiktet uppåt, vilken väg hen än kom ifrån. Har bädden ett
// tillbehör (fällen) ligger den över kroppen så att bara huvudet syns; utan den syns hela kroppen
export function iSangen(s: State, x: number, y: number, sover: boolean): { sang: Station; rikt: 'fram'; tacke: boolean; staende: boolean } | undefined {
  const b = sover ? stationAt(s, x, y) : undefined;
  if (!b || !isKlar(b) || !stationDef(b.k)?.sover) return undefined;
  const { w, h } = storlekAv(b);
  return { sang: b, rikt: 'fram', tacke: !!b.med?.length, staende: h > w };
}
