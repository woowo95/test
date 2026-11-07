import { DAY, Fire, Person, State } from './typer';
import { balans } from './balans';
import { eldPlats } from './karta';
import { ALDER, ageOf, count, living, log } from './folk';
import { coldOf, temperature } from './vader';
import { amountOf, changed, isStored, enPerRuta } from './lager';
import { bedFor } from './bygg';
import { newFire, woodDays } from './eld';
import { Station } from './stationer';
import { RT } from './recept';
import { flintSpot } from './fynd';
import type { Uppgift } from './projekt';

// ---------- fler lägereldar (steg 2.9.1, och 4.5.6.8: en brasa är en lägereld) ----------
// Den första lägerelden är byns mitt och ligger kvar där den är. Men när byn vuxit och hyddorna ligger långt från den, och det
// är kallt och veden räcker gott, lägger byn en ring av stenar till en lägereld till nära sovplatserna. Den är precis som den
// första (eldarna är ett register i eld.ts, s.eldar): samma bild, stenring, tändning, påfyllning, glöd, kolhög, värme och flik.
// Ringen byggs som ett projekt (projekt.ts) av vilken vuxen som helst, med sex stenar: medan den läggs är den en påbörjad
// station (STATIONER.brasa i stationer.ts), och när den är klar blir den en lägereld (nyEld) och stationen finns inte längre.
// Det byn vill ha (s.brasa) räknas varje timme: de som har sin sovplats långt från alla lägereldar, och nära varandra. I en by
// där var och en håller sig för sig själv (seden gemenskap) räcker ett kortare avstånd för att vilja ha en egen eld.
// Varje lägereld efter den första hör till dem som har sin sovplats närmast den (Fire.folk). Önskan om ved på en eld räknas
// från dem som hör till den och dem som sitter vid den (stepFire i eld.ts, steg 6.3.1); alla eldar är lika. När bränslet
// tryter (slackDygn) sköts bara den eld som flest använder. Dess folk värmer sig, arbetar och samtalar vid den när den brinner
// (spotFor i val.ts).
// En släckt lägereld som ingen längre sover nära tas isär: genast när byn vill ha en någon annanstans, annars efter
// tomDygn, och de sex stenarna läggs i en hög där den stod. Högen bärs in i lagret och stenarna används igen.

// ---------- balanstal (regel 8) ----------
export const BRASA = balans('brasa', {
  langt: 7, // en sovplats ligger långt från elden när den är så här många rutor från lägerelden och alla brasor ...
  langtGem: 2, // ... och så här många rutor färre när seden gemenskap är -1 (var och en för sig), inget när den är 0 eller mer
  grupp: 2, // byn vill ha en brasa när så många har sin sovplats långt från elden och nära varandra ...
  samman: 4, // ... inom så här många rutor från varandra ...
  gruppFull: 4, // ... och vill ha den fullt ut när så många har det
  kyla: 0, // bara när kylan ute (coldOf i vader.ts) är över detta ...
  vedDygn: 4, // ... och bränslet i förrådet räcker så här många dygn (år i spelet) för varje eld, den nya brasan medräknad
  max: 2, // byn har högst så här många brasor
  slackDygn: 2, // ingen tänder eller fyller på en brasa när bränslet räcker kortare än så här många dygn för varje eld
  tomDygn: 3, // en släckt brasa som ingen sover nära tas isär efter så här många dygn
  letaMin: 120, // fattas stenarna går en i taget till stenarna och letar så här många minuter (projekt.ts)
});

// lägereldarna efter den första (eld.ts)
export const brasorOf = (s: State) => s.eldar ?? NONE;
const NONE: Fire[] = [];
// platsen byn vill ha en lägereld till på (mitten av sovplatserna, siteBrasa i stationer.ts), om den vill ha en
export const brasaMal = (s: State) => s.brasa && s.brasa.vill > 0 ? s.brasa : undefined;
// hur mycket byn vill ha en lägereld till (0 till 1), för projektet
export const brasaBrist = (s: State) => s.brasa?.vill ?? 0;
// en sovplats långt från elden: kortare i en by där var och en håller sig för sig själv
const langt = (s: State) => BRASA.langt - BRASA.langtGem * Math.max(0, -s.seder.v.gemenskap);
// hur många dygn bränslet räcker för varje eld, med extra eldar till
export const vedPerEld = (s: State, extra: number) => woodDays(s) / (brasorOf(s).length + 1 + extra);
// stenar som ligger i högar på marken (de från en lägereld som tagits isär), på väg in i lagret
const stenPaMarken = (s: State) => (s.stackar ?? []).reduce((n, a) => a.k === 'sten' && !isStored(s, a.x, a.y) ? n + a.n : n, 0); // utanför lagret: amountOf räknar lagret
// byn behöver stenar till en lägereld till (eld.ts, needStones): den vill ha en, ingen är påbörjad och stenarna räcker inte
export const brasaSten = (s: State) => brasaBrist(s) > 0 && !(s.stationer ?? []).some(t => t.k === 'brasa' && t.kvar > 0) && amountOf(s, 'sten') + stenPaMarken(s) < RT.brasaSten;
// stenarna letas som en del av projektet (projekt.ts): byn samlar sällan, så annars kommer lägerelden aldrig. En i taget, och
// bara den som får bygga en. Stenarna hittas vid stenarna när byn behöver dem (forageItems i eld.ts)
export const kanLetaBrasaSten = (s: State, p: Person) => brasaSten(s) && ageOf(p, s.now) >= ALDER.ansvar && !living(s).some(q => q !== p && q.task?.sok);
export function brasaLeta(s: State, p: Person): Uppgift | undefined {
  const sp = flintSpot(s, p);
  return sp ? { act: 'samla', text: 'Letar efter stenar till en lägereld vid stenarna.', min: BRASA.letaMin, spot: sp, sok: true } : undefined;
}
// ringen är lagd (finishStation i stationer.ts): den påbörjade stationen blir en lägereld på samma ruta, med samma nummer
export function nyEld(s: State, t: Station) {
  s.stationer = (s.stationer ?? []).filter(q => q !== t);
  const f = newFire();
  Object.assign(f, { id: t.id, at: { x: t.x, y: t.y }, ring: true, klar: s.now, folk: [] });
  (s.eldar ??= []).push(f);
  s.byggV = (s.byggV ?? 0) + 1; // rutan är en eldplats: vägarna och platserna räknas om
}

// ---------- varje timme ----------
// vem som hör till vilken brasa, de som sover långt från elden, vad byn vill ha, och brasorna som tas isär
export function stepBrasor(s: State) {
  const br = brasorOf(s);
  if (!br.length && !s.brasa && !(coldOf(temperature(s)) > BRASA.kyla && s.fire.lit)) return;
  const L = langt(s);
  const eldar = [{ x: eldPlats(s).x + 0.5, y: eldPlats(s).y + 0.5 }, ...br.map(f => ({ x: f.at!.x + 0.5, y: f.at!.y + 0.5 }))];
  for (const f of br) f.folk = [];
  const borta: { x: number; y: number }[] = [];
  for (const p of living(s)) {
    const b = bedFor(s, p);
    if (!b) continue;
    let bi = 0, bd = Infinity;
    for (let i = 0; i < eldar.length; i++) { const d = Math.hypot(b.x - eldar[i].x, b.y - eldar[i].y); if (d < bd) { bd = d; bi = i; } }
    if (bi > 0) br[bi - 1].folk!.push(p.id);
    if (bd > L) borta.push(b);
  }
  // gruppen: den som har flest andra långt borta inom samman rutor, och de som ligger där
  let grupp: { x: number; y: number }[] = [];
  for (const a of borta) {
    const g = borta.filter(b => Math.hypot(a.x - b.x, a.y - b.y) <= BRASA.samman);
    if (g.length > grupp.length) grupp = g;
  }
  const tomma = br.filter(f => !f.lit && !f.folk!.length && f.hearth !== 'hard'); // härden står kvar i huset (steg 7.5.3)
  const vill = grupp.length >= BRASA.grupp && s.fire.lit && coldOf(temperature(s)) > BRASA.kyla && br.length - tomma.length < BRASA.max && vedPerEld(s, 1 - tomma.length) >= BRASA.vedDygn;
  s.brasa = vill ? { vill: Math.min(1, grupp.length / BRASA.gruppFull), x: grupp.reduce((n, b) => n + b.x, 0) / grupp.length, y: grupp.reduce((n, b) => n + b.y, 0) / grupp.length } : undefined;
  // en lägereld som ingen sover nära tas isär: genast om byn vill ha en annanstans, annars när den stått släckt i tomDygn
  for (const f of tomma) if (vill || s.now - (f.ut ?? f.klar ?? s.now) >= BRASA.tomDygn * DAY) taIsar(s, f);
}
// lägerelden tas isär och stenarna läggs i en hög där den stod (en stack, som bärs in i lagret, haulJob i lager.ts). Kolet i
// den gamla elden blir kvar i högen med stenarna
function taIsar(s: State, f: Fire) {
  s.eldar = (s.eldar ?? []).filter(q => q !== f);
  if (!s.eldar.length) s.eldar = undefined;
  s.byggV = (s.byggV ?? 0) + 1; // rutan är ledig igen: vägarna och platserna räknas om
  const st = (s.stackar ??= []), { x, y } = f.at!;
  let g = st.find(q => q.x === x && q.y === y && q.k === 'sten');
  if (!g) st.push(g = { x, y, k: 'sten', n: 0, c: 1 });
  g.n += RT.brasaSten; changed(s); enPerRuta(s);
  count(s, 'brasaIsar');
  log(s, 'En lägereld som ingen längre sov nära togs isär. Stenarna ligger kvar och används till nästa.', 'world');
}
