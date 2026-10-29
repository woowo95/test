import { balans } from './balans';
import { blodas } from './blod';
import { freeNear } from './byggnad';
import { KANINER, dodaDjur, djurOf, dragOf, halsaOf, satDjurHalsa } from './djur';
import { count, forstaGang, log, ovning, stat } from './folk';
import { skada } from './halsa';
import { groundOf, markslag, tileOf } from './mark';
import { KANIN } from './redskap';
import { clamp, rnd } from './slump';
import { KAST, SLAGSMAL, STRID, VAPEN, Vapen, Uppstallning, chansMot, djurKampe, kastat, nyStrid, slump, traffa } from './strid';
import { isLight } from './tid';
import { HOUR, Person, State, Task } from './typer';
import { snoPaMarken, vaderNu } from './vader';
import { wearTool } from './agande';

// ---------- jakten som strid (steg 3.7.3) ----------
// Jägaren letar upp en kanin nära jaktplatsen och smyger sig fram. Kaninen ser hen på ett avstånd som beror på kaninens
// skygghet, ljuset, terrängen där den sitter, snön och om gruppen nyss skrämts; den smidiga och vana jägaren syns senare.
// Jägaren gissar var hen blir sedd (bättre med vana): tror hen att hen kommer ända fram smyger hen hela vägen och sticker
// (eller griper med händerna), annars stannar hen och kastar spjutet eller en sten därifrån. Den kanin som inte sett
// jägaren varken duckar eller hoppar undan; den som ser jägaren först flyr, och då hinner jägaren bara kasta efter den.
// Kaninen slår aldrig tillbaka, men den som griper en levande kanin kan bli biten. Hela försöket räknas när det börjar
// med stridens regler och en egen slumpföljd (fröet ur jägarens följd), så att det blir likadant i båda lägena. Gruppen
// skräms av varje försök och är svårare att smyga på en stund. Stenen träffar sämre och tappas oftast bort
export const JAKT = balans('jakt', {
  smygSek: 450, // ett försök: så många sekunder att leta upp en kanin och smyga sig fram
  letaR: 30, // finns ingen kanin nära jaktplatsen går jägaren till den närmaste inom så här många rutor
  upptack: 3, // så långt (rutor) en kanin med medelskygghet ser den som smyger på öppen mark i dagsljus ...
  skygg: 0.6, // ... gånger 1 − skygg/2 + skygg × kaninens skygghet (0–1) ...
  natt: 0.6, hog: 0.7, ung: 0.6, skog: 0.5, bar: 1.15, // ... i mörkret och i terrängen där kaninen sitter ...
  sno: 0.3, // ... och så mycket längre på snö (1 + sno × snön) ...
  skramd: 1.3, skramdTim: 2, // ... och i en grupp som skrämts de senaste timmarna
  smid: 0.04, // den som smyger syns så här mycket senare per poäng smidighet över 10 ...
  vana: 0.03, // ... och per poäng jaktfärdighet
  gissa: 0.5, // jägaren gissar avståndet där hen blir sedd med ett fel på upp till så här stor del (ingen gissning vid jakt 20) ...
  marg: 1.15, // ... och stannar en bit utanför: på så här stor del av det gissade avståndet
  smyg: 1.2, // chansen att träffa en kanin som inte sett en, gånger detta
  flyr: 0.4, // ett kast efter en kanin som just såg en och sprang, gånger detta
  sten: 0.6, // stenen träffar sämre än spjutet ...
  stenBorta: 0.6, stenSek: 120, // ... och tappas oftast bort, och då tar det så här länge att hitta en ny
  hamtaSek: 40, // att hämta det kastade spjutet
  dod: 0.2, // en kanin dör av träffar (och gamla sår) av den här graden sammanlagt; en svagare träff och den springer skadad
  bett: 0.15, bettGrad: 0.06, // den som griper en kanin med händerna blir biten med den här chansen och graden
});
// gruppen skräms (s.djurSkramd: gruppens id och när)
const skramd = (s: State, g: number) => !!s.djurSkramd?.some(x => x.g === g && s.now - x.t < JAKT.skramdTim * HOUR);
function skram(s: State, g: number) {
  s.djurSkramd = [...(s.djurSkramd ?? []).filter(x => x.g !== g && s.now - x.t < JAKT.skramdTim * HOUR), { g, t: s.now }];
}
const TERR = { hog: JAKT.hog, ung: JAKT.ung, skog: JAKT.skog, kort: 1, bar: JAKT.bar };

// ett försök: p jagar nära jaktplatsen med redskapet i handen (ett spjut) eller stenar. Försöket planeras när det börjar
// (t, tiden då det började) och sparas i tk.jf, så att gränssnittet kan visa hur jägaren smyger, siktar och kastar och om
// kaninen ser hen (Björn efter v159). Det som händer i världen händer när det är slut (jaktKlar). Svarar 0, −2 om jägaren
// gick mot en kanin längre bort, eller −1 om ingen kanin finns inom räckhåll
export function jaktForsok(s: State, p: Person, tk: Task, t = s.now): number {
  let m: ReturnType<typeof djurOf>[number] | undefined, md = KANINER.narvR + KANINER.hopp * KANINER.hoppMax;
  const dj = djurOf(s);
  for (const d of dj) { const dd = Math.hypot(d.x - tk.tx, d.y - tk.ty); if (dd < md) { md = dd; m = d; } }
  if (!m) { // ingen kanin nära: jägaren letar upp den närmaste gruppen och går dit
    let n: ReturnType<typeof djurOf>[number] | undefined, nd: number = JAKT.letaR;
    for (const d of dj) { const dd = Math.hypot(d.x - p.x, d.y - p.y); if (dd < nd) { nd = dd; n = d; } }
    if (!n) return -1;
    const sp = freeNear(s, n.x, n.y);
    tk.tx = sp.x; tk.ty = sp.y; tk.phase = 'go'; count(s, 'jaktLetar');
    return -2;
  }
  count(s, 'jaktForsok');
  const drag = dragOf(m.art, m.id), h = halsaOf(s, m.id), now = s.now, jakt = p.skill.jakt ?? 0;
  const v: Vapen = tk.tool && tk.tool in VAPEN && (VAPEN as Record<string, { kast?: unknown }>)[tk.tool].kast ? tk.tool as Vapen : 'sten';
  const vader = vaderNu(s);
  const u: Uppstallning = {
    avsikt: 'doda', w: 20, h: 20, vind: vader.vind, dimma: vader.dimma,
    kampar: [
      { id: 1, namn: p.name, sida: 0, pid: p.id, vapen: v, klader: [], fart: 1, x: 1, y: 10, st: { styrka: stat(p, 'styrka', now), uthallighet: stat(p, 'uthallighet', now), mod: stat(p, 'mod', now), smidighet: stat(p, 'smidighet', now), skicklighet: 5 + (p.skill.narstrid ?? 0) / 2, sikte: 5 + (p.skill.traff ?? 0) / 2 } },
      { ...djurKampe(m.art, 2, 1, 10, 10), fart: drag.snabbhet },
    ],
  };
  u.kampar[1].st.styrka = drag.styrka;
  const st = nyStrid(u, Math.floor(rnd(s, 'arbete', p) * 2147483647)), r = () => slump(st);
  const a = st.kampar[0], b = st.kampar[1];
  b.blod = h.blod;
  // var kaninen ser jägaren, och var jägaren tror att det blir
  const sedd = JAKT.upptack * (1 - JAKT.skygg / 2 + JAKT.skygg * (drag.skygghet ?? 0.5)) * (isLight(now) ? 1 : JAKT.natt)
    * TERR[markslag(groundOf(s), tileOf(m.x, m.y))] * (1 + JAKT.sno * snoPaMarken(s)) * (skramd(s, m.grupp) ? JAKT.skramd : 1)
    / Math.max(0.3, 1 + JAKT.smid * (a.st.smidighet - 10) + JAKT.vana * jakt);
  const tror = sedd * (1 + (r() * 2 - 1) * JAKT.gissa * (1 - clamp(jakt / 20, 0, 1))) * JAKT.marg;
  const kv = (VAPEN[v] as { kast?: { rack: number; skada: number } }).kast!, nar = v === 'sten' ? VAPEN.hand : VAPEN[v]; // med stenar i handen griper man kaninen
  let traff = false, kastD = -1, hand = false, sett: boolean, stopp: number;
  skram(s, m.grupp);
  if (tror <= nar.rack) { // smyger ända fram
    sett = sedd >= nar.rack; stopp = sett ? sedd : nar.rack * 0.5;
    if (!sett) {
      count(s, 'jaktSmyg');
      if (r() < chansMot(a, b, a.st.skicklighet) * JAKT.smyg) {
        traff = true; hand = v === 'sten';
        if (!hand) traffa(st, a, b, VAPEN[v].skada, VAPEN[v].slag);
      }
    } else count(s, 'jaktSedd');
  } else { // kastar därifrån hen tror att hen inte syns, eller efter kaninen som såg hen först
    const osedd = Math.min(tror, kv.rack) >= sedd;
    sett = !osedd;
    kastD = osedd ? Math.min(tror, kv.rack) : sedd <= kv.rack ? sedd : -1;
    stopp = osedd ? kastD : sedd;
    if (!osedd) count(s, 'jaktSedd');
    if (kastD > 0) {
      count(s, 'jaktKast');
      const l = kastD / kv.rack;
      const c = chansMot(a, b, a.st.sikte!) * (1 - STRID.langt * l) * (1 - STRID.vind * st.vind * l) * (1 - STRID.dimma * st.dimma * l) * (osedd ? JAKT.smyg : JAKT.flyr) * (v === 'sten' ? JAKT.sten : 1);
      if (r() < c) { traff = true; traffa(st, a, b, kv.skada, VAPEN[v].slag, true); }
    }
  }
  const g = b.skador.reduce((x, w) => x + w.g, 0);
  const dog = traff && (hand || b.lage === 'dod' || g + h.sar >= JAKT.dod);
  // det kastade: stenen tappas oftast bort och då letar hen upp en ny, annars hämtas det som kastades
  const extra = kastD > 0 ? (v === 'sten' && r() < JAKT.stenBorta ? JAKT.stenSek : JAKT.hamtaSek) : 0;
  tk.jf = { t, id: m.id, x: m.x, y: m.y, sx: p.x, sy: p.y, v, stopp, kast: kastD, sett, ut: dog ? 'fangad' : traff && g > 0 ? 'skadad' : kastD > 0 || !sett ? 'miss' : 'flydde', ...(hand ? { hand: true as const } : {}), extra, g, blod: b.blod };
  return 0;
}
// när försöket är slut: spjutet som kastades hämtas (eller är borta), stacket sliter spjutet, och den fångade kaninen
// bärs hem. En kanin som någon annan hann fånga under tiden är borta
export function jaktKlar(s: State, p: Person, tk: Task) {
  const f = tk.jf!, r = () => rnd(s, 'arbete', p);
  tk.jf = undefined;
  if (f.kast > 0 && f.v !== 'sten') {
    const ut = kastat(s, p, f.v, f.kast, f.x, f.y, r);
    if (ut) {
      tk.tool = undefined;
      if (ut === 'borta' && forstaGang(s, 'spjutBorta')) log(s, `${p.name} kastade ${VAPEN[f.v as Vapen].namn.toLowerCase()} efter en kanin och hittade det aldrig igen.`, 'world', [p.id]);
    }
  } else if (f.ut !== 'miss' && f.ut !== 'flydde' && !f.hand && tk.tool) { // stacket sliter spjutet
    if (wearTool(s, p, tk.tool, r() * KAST.slit)) tk.tool = undefined;
  }
  const h = halsaOf(s, f.id);
  if (h.dod) return;
  if (f.ut === 'fangad') {
    count(s, 'jaktFangst');
    dodaDjur(s, f.id);
    if (forstaGang(s, 'kaniner')) log(s, `${p.name} fångade byns första kanin och bar hem den hel.`, 'world', [p.id]);
    tk.carry += KANIN;
    blodas(s, f.x, f.y, 'jakt', 1); // där kaninen fångades
    ovning(p, f.kast > 0 ? 'traff' : 'narstrid', SLAGSMAL.jakt); // träffsäkerheten eller närstriden (strid.ts)
    if (f.hand && r() < JAKT.bett) { count(s, 'jaktBett'); skada(s, p, r() < 0.5 ? 'handH' : 'handV', 'bett', JAKT.bettGrad, 'jakt', 'när hen grep en kanin'); }
  } else if (f.ut === 'skadad') { count(s, 'jaktSkadad'); satDjurHalsa(s, f.id, Math.min(f.blod, h.blod), h.sar + f.g); }
}
