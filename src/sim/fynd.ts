import { upplev } from './uppvaxt';
import { PLATS, campCenter, campDist, campGrid, rektAvstand } from './plats';
import { count, forstaGang, franMitt, gjort, stat, log, think } from './folk';
import { getMap, hash, perKarta, vnoise } from './karta';
import { Markslag, groundOf, markslag, startGround, tileOf } from './mark';
import { sedEvent } from './seder';
import { chance, clamp, clampI, pickNarmaste, rnd } from './slump';
import { kn, learnK, useK } from './kunskap';
import { ageIndex } from './tid';
import { kunnighet } from './ekonomi';
import { LAGER, addTo, amountOf, foodOf } from './lager';
import { nTools } from './agande';
import { DAY, H, HOUR, HOUR_S, OX, OY, Person, State, T, W, egen, inMap, mapKey, tvaDelar, visning } from './typer';
import { FOREST, Ground, isSoil } from './vag';
import { ACTS, RedskapDef, SNABBARE } from './handlingar';
import { balans } from './balans';
import { djupOf, iVattnetNu, sjoRakna, sjoarna, strandAv, vattenNu } from './sjo';
import { smakGift } from './rykten';

// ---------- balanstal (regel 8) ----------
// Fångst och insamling: var viltet håller sig borta, hur fort platserna tömmas och växer tillbaka, fiske, flinta och svamp.
// Det som varje lager (bär, kaniner, abborre, svamp, flinta, rötter) ger står i raderna i FYND, platsernas storlek i PLATS
// (plats.ts) och fiskeredskapens träffsäkerhet i raderna för fiske i handlingar.ts. Avstånd är i rutor, om inget annat sägs
export const FANGST = balans('fangst', {
  // under torkan (steg 3.8.2, torka.ts): fisken samlas i vattnet som är kvar, så här mycket mer fisk per ruta när sjön sjunkit två rutor ...
  torkaFisk: 0.5,
  fiskStor: 150, fiskLiten: 0.3, // ... i en sjö med färre rutor än fiskStor växer fisken tillbaka långsammare, ned till fiskLiten ...
  torkaVilt: 0.5, torkaViltR: 12, // ... och kaninerna trivs så här mycket sämre torkaViltR rutor från vattnet (mindre närmare)
  // var det finns
  stenNara: 2, // så nära en sten finns flintan oftast
  jaktFaktor: 2.1, // kaninerna håller sig långt från byn (skyggIn), så en jakttur är lång; i gengäld ger platserna så mycket mer än förr
  lagerR: 3, // i byns läger växer inget: allt är redan hämtat och marken nött. Lägret växer när byn får fler lagerplatser
  skyggIn: 8, // vilt skyr människor: inget vilt närmare lägret än så här ...
  skyggR: 8, // ... och helt fram först så här mycket längre bort
  vildIn: 4, vildR: 5, // de vilda grödorna växer inte närmare lägret än vildIn, och helt först vildR längre bort (steg 2.10.12)
  nottR: 2, nottMax: 0.8, nottDiv: 10, // nött mark skrämmer också: rutorna inom NottR runt en ruta räknas, och viltet minskar med antalet delat med Div, högst Max
  syn: 8, // byns närområde, som man i stort sett känner till från elden
  aterTom: 0.004, // ett uttag under detta räknas som orört när platsen växer tillbaka
  barFull: 1.35, // så mycket bär en buske ger innan den är tom (full i bärens rad i FYND); den växer tillbaka på lika lång tid. Tre gånger mer än förut (0,45) sedan v135 (Björn efter v134)
  // fiske
  handFiske: 0.55, // fiske med händerna ger ungefär så mycket som samling på en lagom rik plats gånger detta
  forsokSek: 300, // ett fiskeförsök tar så här många sekunder (delat med SNABBARE)
  fiskRikMax: 1.3, // en plats räknas inte som rikare än så här vid napp
  hallSkill: 40, hallUthall: 100, // fisken sitter kvar: redskapets hall plus färdigheten delad med Skill plus uthålligheten delad med Uthall ...
  hallSmid: 0.05, // ... plus så här mycket gånger (smidigheten − 10) / 10 (steg 3.7.6)
  // flinta
  flintaMinsta: 1, flintaBehov: 2, // byn vill ha minst en flinta, och så här många flintor och yxor tillsammans
  flintaAvstand: 30, // en flintplats ligger närmare lägret än så här ...
  flintaRik: 1, // ... och har mer än så här stor chans att hitta flinta (flintFactor)
  flintaUrval: 8, // den väljs bland så här många av de närmaste
  // svamp
  svampTakt: 0.5, // chans att hitta svamp per arbetstimme gånger kunnigheten och hur rik platsen är
  svampUttag: 0.5, // varje svamp som hittas tar så här mycket ur platsen
  kandSkill: 40, kandInt: 100, kandMax: 0.98, // chansen att känna igen den giftiga: kunskapen plus färdigheten delad med Skill plus intelligensen delad med Int, högst Max
  giftAndel: 4, giftMax: 0.6, // att äta giftig svamp ur förrådet: chansen är andelen gift av maten gånger Andel, högst Max
  giftSjukMin: 6, giftSjukSpann: 10, // förgiftningen varar Min till Min + Spann timmar
  giftHalsa: 0.25, // ... och tar så här mycket hälsa
  giftTanke: -0.3, giftTankeDygn: 0.5, // tanken efter förgiftningen och hur länge den varar (dygn)
  giftLar: 0.4, giftKand: 0.75, // hur mycket den förgiftade lär sig om svamp, och kunskapen över vilken hen kan skilja kantarellen från spindlingen
  giftSed: 0.05, // den första förgiftningen gör byn försiktigare
});

// ---------- fynd: mat och saker finns på olika platser ----------
// Varje ruta har en egen rikedom av bär, rötter, vilt och fisk. Den som samlar, jagar eller fiskar tar ur platsen,
// och den växer långsamt tillbaka. Därför går invånarna vidare till nya platser när det tar slut nära byn.
export type Kind = 'samla' | 'jakt' | 'fiske';

// ---------- värmekartor: ett lager per sorts resurs ----------
// Varje lager har ett värde per ruta: hur mycket som finns där just nu. Det är sanningen; vad invånarna tror står i
// deras lärdomar (minne.ts). Två saker hålls isär: var det växer (marken gånger ett dolt mönster som sakta kryper
// över kartan) och hur mycket som finns kvar just nu (uttaget, som växer tillbaka efter årstiden).
// Ett nytt lager är en ny rad i FYND. Filtret på kartan, rutan i hörnet och sparningen följer med.
export type Grupp = 'vaxter' | 'djur' | 'sten';
// filtren på kartan: varje grupp visar alla sina lager samtidigt, ett i taget med egen färg
export const GRUPPER: Record<Grupp, { namn: string; ikon: string }> = {
  vaxter: { namn: 'Växter', ikon: 'bar' },
  djur: { namn: 'Djur', ikon: 'kanin' },
  sten: { namn: 'Sten', ikon: 'flinta' },
};
interface Uttag {
  full: number; // så mycket en full plats ger innan den är tom
  reach: number; // hur stort område ett uttag tömmer (vilt springer)
  regrow: number[]; // hur fort platsen växer tillbaka, del per timme och tidsålder (istid, vår, sommar, höst)
}
// Var på marken det växer: fläckar av slumpat brus som sakta byter form. Under tröskeln växer inget.
interface Monster {
  salt: number;
  skala: number; // fläckarnas storlek i rutor
  period: number; // dygn tills mönstret bytts ut (fläckar kryper, krymper, försvinner och dyker upp); 0 = står still
  troskel: number; // 0–1, högre = mindre och färre fläckar
  gles?: number; // del av rutorna i en fläck där det växer (svamp står utspridd)
}
interface FyndDef {
  namn: string;
  grupp: Grupp;
  ikon: string;
  farg: number; // färgen i filtret
  topp: number; // ungefär vad en mycket rik ruta har; full färg i filtret
  // vad en orörd ruta ger: m är mönstret (0–1) på rutan. Med mönstrets snitt i stället blir det vad marken
  // ser ut att kunna ge för den som inte varit där (skog, äng, vatten syns på håll, fläckarna gör det inte).
  bas(s: State, i: number, m: number): number;
  monster?: Monster;
  arstid?: number[]; // hur mycket som finns per tidsålder (istid, vår, sommar, höst), annars lika året om
  torka?: number; // så mycket finns under en torka (steg 3.8.2, torka.ts), annars som vanligt
  uttag?: Uttag;
  vatten?: number; // lagret finns i vattnet; man står på stranden och når så många rutor ut
}
const SVAMP_SEASON = [0, 0.15, 0.8, 1.5];
const SVAMP_UTTAG: Uttag = { full: 2.5, reach: 1, regrow: [1 / 1200, 1 / 450, 1 / 120, 1 / 120] };
const land = (s: State, i: number) => isSoil(groundOf(s).tiles[i]);
// hur väl varje slags mark passar lagret (gånger resten av värdet)
const BAR_PASSAR: Record<Markslag, number> = { skog: 0.8, ung: 1, hog: 1, kort: 0, bar: 0 };
const JAKT_PASSAR: Record<Markslag, number> = { skog: 0.85, ung: 0.9, hog: 1, kort: 1, bar: 0.3 };
// kaninernas värde på rutan i: marken g, skygghet sky (0 nära folk, 1 långt bort) och mönstret m
const jaktBas = (g: Ground, sky: ArrayLike<number>, i: number, m: number) => isSoil(g.tiles[i]) ? JAKT_PASSAR[markslag(g, i)] * (0.15 + 1.3 * m) * FANGST.jaktFaktor * sky[i] : 0;
// skogsbrynet: en ruta med gräs eller ungskog intill skogen (de fyra grannarna)
const BRYN = new Set<Markslag>(['ung', 'hog', 'kort']);
const intillSkog = (g: Ground, i: number) => {
  const x = i % W;
  return (x > 0 && g.trees[i - 1] >= FOREST) || (x < W - 1 && g.trees[i + 1] >= FOREST) || (i >= W && g.trees[i - W] >= FOREST) || (i + W < W * H && g.trees[i + W] >= FOREST);
};
const ROTTER_PASSAR: Record<Markslag, number> = { skog: 0.5, ung: 0.5, hog: 0.5, kort: 0.4, bar: 0.1 };
// Ordningen bland lagren med uttag är ordningen i sparfilen: nya lager med uttag läggs sist.
const DEF = {
  // bärbuskar i små täta snår i skog och högt gräs; de flyttar sig mycket långsamt. Inga bär i istiden.
  // Sedan steg 2.3.9 lite ovanligare än svampen, men de växer tillbaka fortare och kommer tidigare på våren
  bar: {
    namn: 'Bär', grupp: 'vaxter', ikon: 'bar', farg: 0x9a5cff, topp: 3, arstid: [0, 0.75, 1, 1.15], torka: 0.6,
    monster: { salt: 71, skala: 2.5, period: 70, troskel: 0.77 }, // hälften så många rutor som med 0,72 före steg 3.10.23.7
    bas(s, i, m) {
      if (!land(s, i)) return 0;
      return BAR_PASSAR[markslag(groundOf(s), i)] * 4 * m;
    },
    uttag: { full: FANGST.barFull, reach: 1, regrow: [0, 1 / 120, 1 / 48, 1 / 60] },
  },
  // kaniner trivs bäst i gräs, högt eller lågt, men finns också i skogen. Glest över stora områden som vandrar
  jakt: {
    namn: 'Harar', grupp: 'djur', ikon: 'kanin', farg: 0xc89a60, topp: 1.4 * FANGST.jaktFaktor,
    monster: { salt: 73, skala: 7, period: 7, troskel: 0.25 },
    bas(s, i, m) { return jaktBas(groundOf(s), skyggOf(s), i, m); },
    uttag: { full: 6, reach: 3, regrow: [1 / 800, 1 / 480, 1 / 480, 1 / 600] },
  },
  // fisken har sina favoritplatser i vattnet. Man fiskar från stranden och når ett par rutor ut
  fiske: {
    namn: 'Abborre', grupp: 'djur', ikon: 'abborre', farg: 0x2f7fd0, topp: 1.6, vatten: 2,
    monster: { salt: 79, skala: 3, period: 14, troskel: 0.3 },
    // under en torka samlas fisken i det vatten som är kvar (steg 3.8.2)
    bas: (s, i, m) => iVattnetNu(s, i) ? (0.5 + 1.4 * m) * (1 + FANGST.torkaFisk * (s.sjoTorr?.niva ?? 0) / 2) : 0,
    uttag: { full: 3, reach: 1, regrow: [1 / 300, 1 / 100, 1 / 100, 1 / 140] },
  },
  // kantarellen växer bara i skogen, utspridd över större områden som vandrar långsamt. Mest på hösten.
  // Sedan steg 2.3.9 på ungefär lika många ställen som bären hade förut (en tredjedel så många som innan)
  kantarell: {
    namn: 'Kantarell', grupp: 'vaxter', ikon: 'svamp', farg: 0xffd21f, topp: 0.8, arstid: SVAMP_SEASON, torka: 0.1,
    monster: { salt: 83, skala: 8, period: 28, troskel: 0.66, gles: 0.5 }, // hälften så många rutor som med 0,5 före steg 3.10.23.7
    bas: (s, i, m) => land(s, i) && groundOf(s).trees[i] >= FOREST ? 0.9 * m : 0,
    uttag: SVAMP_UTTAG,
  },
  // den giftiga orangea spindlingen liknar kantarellen. Den har egna områden som kan gå in i kantarellens
  spindling: {
    namn: 'Orange spindling (giftig)', grupp: 'vaxter', ikon: 'spindling', farg: 0xff2d6f, topp: 0.8, arstid: SVAMP_SEASON, torka: 0.1,
    monster: { salt: 89, skala: 8, period: 28, troskel: 0.685, gles: 0.35 }, // som kantarellen, hälften så många rutor (0,55 före steg 3.10.23.7)
    bas: (s, i, m) => land(s, i) && groundOf(s).trees[i] >= FOREST ? 0.9 * m : 0,
    uttag: SVAMP_UTTAG,
  },
  // flinta vid stenarna, ibland i sanden vid stranden och sällan annars. Den växer sakta tillbaka och flyttar sig aldrig
  flinta: {
    namn: 'Flinta', grupp: 'sten', ikon: 'flinta', farg: 0xe8eef2, topp: 4,
    bas: (s, i) => getMap(s.seed).tiles[i] === T.Vatten ? 0 : stoneDist(s.seed)[i] <= FANGST.stenNara ? 4 : getMap(s.seed).tiles[i] === T.Sand ? 1.5 : 0.4,
    uttag: { full: 2, reach: 1, regrow: [1 / 500, 1 / 300, 1 / 300, 1 / 300] },
  },
  // rötter finns glest på jorden, sedan steg 3.10.23.7 på hälften så många rutor som förut. De ger minst, men finns kvar i istiden när bär och svamp är borta
  rotter: {
    namn: 'Rötter', grupp: 'vaxter', ikon: 'rotter', farg: 0xf2d9a0, topp: 0.5, arstid: [0.6, 1, 0.8, 1], torka: 0.6,
    monster: { salt: 97, skala: 3, period: 84, troskel: 0.5, gles: 0.25 }, // hälften så många rutor som utan tröskel före steg 3.10.23.7
    bas(s, i, m) {
      if (!land(s, i)) return 0;
      return ROTTER_PASSAR[markslag(groundOf(s), i)] * m;
    },
    uttag: { full: 0.35, reach: 1, regrow: [1 / 600, 1 / 180, 1 / 180, 1 / 240] },
  },
  // de vilda grödorna (steg 2.10.2, odling.ts): vild rova (åkerkål) i fläckar på ängarna (högt gräs) och vilda ärter i
  // skogsbrynet (gräs eller ungskog intill skogen). Inget i istiden; de växer under sommaren och mognar på hösten. Den som samlar
  // där tar med sig frön till sin egen gröda (VILDA i odling.ts). De växer inte nära byn eller där folk går och nöter marken
  // (steg 2.10.12, orortOf). Den vilda rovan har vildkornets plats och mönster (steg 3.10.23.8; lagret hette vildkorn förut och
  // har samma plats i sparfilen)
  vildrova: {
    namn: 'Vild rova', grupp: 'vaxter', ikon: 'vildrova', farg: 0xe8c040, topp: 1, arstid: [0, 0.3, 0.9, 1.2], torka: 0.6,
    monster: { salt: 101, skala: 4, period: 56, troskel: 0.59 }, // en fjärdedel färre rutor (0,55 före steg 3.10.23.7)
    bas: (s, i, m) => land(s, i) && markslag(groundOf(s), i) === 'hog' ? m * orortOf(s)[i] : 0,
    uttag: { full: 1, reach: 1, regrow: [0, 1 / 240, 1 / 96, 1 / 120] },
  },
  arter: {
    namn: 'Vilda ärter', grupp: 'vaxter', ikon: 'vildarter', farg: 0x6fcf4f, topp: 1, arstid: [0, 0.3, 1, 1.1], torka: 0.6,
    monster: { salt: 103, skala: 3, period: 56, troskel: 0.595 }, // en fjärdedel färre rutor (0,55 före steg 3.10.23.7)
    bas: (s, i, m) => land(s, i) && BRYN.has(markslag(groundOf(s), i)) && intillSkog(groundOf(s), i) ? m * orortOf(s)[i] : 0,
    uttag: { full: 1, reach: 1, regrow: [0, 1 / 240, 1 / 96, 1 / 120] },
  },
} satisfies Record<string, FyndDef>;
export type FyndId = keyof typeof DEF;
export const FYND: Record<FyndId, FyndDef> = DEF;
export const FYND_IDS = Object.keys(FYND) as FyndId[];
export const UTTAG_IDS = FYND_IDS.filter(k => FYND[k].uttag);
// en handling kan ta ur flera lager: den som samlar tar både bär och rötter. Tabellen byggs en gång,
// eftersom lagren frågas efter för varje ruta
export type Lager = FyndId | Kind;
const LAGREN: Record<Lager, readonly FyndId[]> = { ...Object.fromEntries(FYND_IDS.map(k => [k, [k]])) as Record<FyndId, FyndId[]>, samla: ['bar', 'rotter'] };
export const lagren = (k: Lager) => LAGREN[k];
const summa = (k: Lager, fn: (j: FyndId) => number) => { let v = 0; for (const j of lagren(k)) v += fn(j); return v; };
// ungefär vad en mycket rik ruta har, och hur fort platsen växer tillbaka (det snabbaste lagret)
export const toppOf = (k: Lager) => summa(k, j => FYND[j].topp);
export const regrowOf = (k: Lager, ai: number) => Math.max(...lagren(k).map(j => FYND[j].uttag?.regrow[ai] ?? 0));

// mönstret räknas om en gång per dygn (det kryper långsamt) och är detsamma i spelet och vid ikappräkning
const monstren = new WeakMap<State, { dag: number; v: Partial<Record<FyndId, { m: Float32Array; snitt: number }>> }>();
function monsterOf(s: State, k: FyndId) {
  const dag = Math.floor(s.now / DAY);
  let c = monstren.get(s);
  if (!c || c.dag !== dag) { c = { dag, v: {} }; monstren.set(s, c); }
  return c.v[k] ??= monsterDag(s.seed, k, dag);
}
// mönstret dygnet dag: bara ur fröet och dagen
function monsterDag(fro: number, k: FyndId, dag: number) {
  const mo = FYND[k].monster!, m = new Float32Array(W * H), seed = fro + mo.salt * 101;
  const t = mo.period ? dag / mo.period : 0, t0 = Math.floor(t), ft = t - t0, st = ft * ft * (3 - 2 * ft);
  let sum = 0;
  for (let i = 0; i < W * H; i++) {
    // två mönster tonas över i varandra medan de glider lite åt var sitt håll
    const gx = i % W - OX, gy = Math.floor(i / W) - OY, x = gx / mo.skala, y = gy / mo.skala; // läget på den gamla kartan (typer.ts)
    const a = vnoise(seed + t0 * 7919, x + ft * 0.6, y), b = vnoise(seed + (t0 + 1) * 7919, x - (1 - ft) * 0.6, y);
    let v = Math.max(0, (a + (b - a) * st - mo.troskel) / (1 - mo.troskel));
    if (mo.gles !== undefined && hash(seed + 3, gx, gy) > mo.gles) v *= 0.15;
    m[i] = Math.min(1, v * 1.6);
    sum += m[i];
  }
  return { m, snitt: sum / (W * H) };
}
// i byns läger växer inget (FANGST.lagerR)
const iLagret = (s: State, i: number) => iLagretI(campGrid(s), getMap(s.seed).tiles, i);
const iLagretI = (lager: Float64Array, tiles: Uint8Array, i: number) => lager[i] < FANGST.lagerR && tiles[i] !== T.Vatten;
// vilt skyr människor: ett stort område runt lägret, och marken där många går (stigar och nött mark).
// Räknas om en gång per dygn (av gränssnittet i en egen del, typer.ts).
const skygghet = tvaDelar<{ dag: number; v: Float32Array }>();
export const skyggOf = (s: State) => bortaOf(s, skygghet, FANGST.skyggIn, FANGST.skyggR);
// de vilda grödorna växer inte heller nära byn eller där folk går, men närmare än viltet (steg 2.10.12)
const orort = tvaDelar<{ dag: number; v: Float32Array }>();
export const orortOf = (s: State) => bortaOf(s, orort, FANGST.vildIn, FANGST.vildR);
// 0 närmare lägret än inne, 1 från inne + r, och mindre där marken runt omkring är nött
function bortaOf(s: State, c2: typeof skygghet, inne: number, r: number) {
  const dag = Math.floor(s.now / DAY);
  let c = c2.sim.get(s);
  if (c?.dag === dag) return c.v;
  if (visning.pa) { c = c2.bild.get(s); if (c?.dag === dag) return c.v; }
  const g = groundOf(s), v = new Float32Array(W * H), nott = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) nott[i] = isSoil(g.tiles[i]) && markslag(g, i) === 'bar' ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = clamp((campDist(s, x, y) - inne) / r, 0, 1);
    let n = 0;
    for (let dy = -FANGST.nottR; dy <= FANGST.nottR; dy++) for (let dx = -FANGST.nottR; dx <= FANGST.nottR; dx++) if (inMap(x + dx, y + dy)) n += nott[(y + dy) * W + x + dx];
    v[y * W + x] = d * d * (3 - 2 * d) * (1 - Math.min(FANGST.nottMax, n / FANGST.nottDiv));
  }
  egen(c2).set(s, { dag, v });
  return v;
}
// vad en orörd ruta ger nu (utan årstid och uttag)
function capOf(s: State, k: FyndId, i: number) {
  if (iLagret(s, i)) return 0;
  const f = FYND[k];
  return f.bas(s, i, f.monster ? monsterOf(s, k).m[i] : 1);
}
// vad rutan ser ut att kunna ge på håll: marken syns, men inte var fläckarna är
export function synsOf(s: State, k: Lager, i: number): number {
  if (iLagret(s, i)) return 0;
  let v = 0;
  for (const j of lagren(k)) { const f = FYND[j]; v += f.bas(s, i, f.monster ? monsterOf(s, j).snitt : 1) * sasong(s, j); }
  return v;
}
const sasong = (s: State, k: FyndId) => (FYND[k].arstid?.[ageIndex(s)] ?? 1) * (s.sjoTorr?.pa ? FYND[k].torka ?? 1 : 1);
// var det växer just nu, med årstiden men utan uttaget: det man ser av buskar och spår även när det är plockat
export function vaxerAt(s: State, k: Lager, i: number) {
  let v = 0;
  for (const j of lagren(k)) v += capOf(s, j, i) * sasong(s, j);
  return v;
}
// Viltkartan som kaningrupperna väljer plats efter (djur.ts): bara ur kartan och tiden t, så att den är densamma efter
// inläsning och när en cache töms. Marken som när byn grundades, mönstret och årstiden vid t, och viltet skyr elden och
// den första lagerplatsen (som skyggOf, men utan stigarna och utan det lägret vuxit sedan)
const skyggStart = perKarta(seed => {
  const m = getMap(seed), v = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = Math.floor(i / W);
    const d = clamp((Math.min(Math.hypot(x - m.fire.x, y - m.fire.y), rektAvstand(x, y, m.stock.x, m.stock.y, LAGER.startBredd, LAGER.startHojd)) - FANGST.skyggIn) / FANGST.skyggR, 0, 1);
    v[i] = d * d * (3 - 2 * d);
  }
  return v;
});
// torka: att det är torka vid tiden t (djur.ts frågar motgang.ts, som fynd.ts inte kan importera)
// Kartan räknas bara ur seed och dygnet, så de senaste sparas (jägarna som letar frågar ofta, jakt.ts)
const viltMinne = new Map<string, Float64Array>();
export function viltStart(s: State, t: number, torka = false) {
  const key = `${mapKey(s.seed)},${Math.floor(t / DAY)},${ageIndex(s, t)},${torka}`, f = viltMinne.get(key);
  if (f) return f;
  if (viltMinne.size >= 8) viltMinne.delete(viltMinne.keys().next().value!);
  const v = viltRakna(s, t, torka);
  viltMinne.set(key, v);
  return v;
}
function viltRakna(s: State, t: number, torka: boolean) {
  const g = startGround(s.seed), sky = skyggStart(s.seed), m = monsterDag(s.seed, 'jakt', Math.floor(t / DAY)).m;
  const sa = FYND.jakt.arstid?.[ageIndex(s, t)] ?? 1, v = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) v[i] = jaktBas(g, sky, i, m[i]) * sa;
  if (torka) { const { land } = djupOf(s.seed); for (let i = 0; i < W * H; i++) v[i] *= 1 - FANGST.torkaVilt * Math.min(1, (land[i] - 1) / FANGST.torkaViltR); } // under torkan söker kaninerna sig mot vattnet (steg 3.8.2)
  return v;
}
const store = new WeakMap<State, Partial<Record<FyndId, Float32Array>>>();
// uttag per ruta: 0 = orörd, 1 = tom
export function takenOf(s: State) {
  let d = store.get(s);
  if (!d) {
    d = {};
    for (const k of UTTAG_IDS) d[k] = new Float32Array(W * H);
    const bin = fyndBin(s);
    if (bin) {
      UTTAG_IDS.forEach((k, j) => { for (let i = 0; i < W * H && j * W * H + i < bin.length; i++) d![k]![i] = bin.charCodeAt(j * W * H + i) / 255; });
    }
    store.set(s, d);
  }
  return d;
}
// I sparfilen: en byte per ruta och slag (0–255), där en följd av orörda rutor (0) skrivs som 0 och hur många (1–255),
// eftersom det mesta av kartan är orört (sedan kartan blev 120 × 120, steg 2.10.9). Det packade börjar med ~; en äldre
// sparfil utan ~ har en byte per ruta rakt av
export function packFynd(s: State) {
  const d = takenOf(s), ut: string[] = [];
  let noll = 0;
  for (const k of UTTAG_IDS) for (let i = 0; i < W * H; i++) {
    const b = Math.round(clamp(d[k]![i], 0, 1) * 255);
    if (b === 0 && noll < 255) { noll++; continue; }
    if (noll) { ut.push('\0', String.fromCharCode(noll)); noll = 0; }
    if (b === 0) noll = 1; else ut.push(String.fromCharCode(b));
  }
  if (noll) ut.push('\0', String.fromCharCode(noll));
  s.fynd = '~' + btoa(ut.join(''));
}
// det som tagits ur platserna som en byte per ruta och slag, ur sparfilen (tom text om inget sparats eller det inte går att läsa)
export function fyndBin(s: State) {
  if (!s.fynd) return '';
  try {
    if (!s.fynd.startsWith('~')) return atob(s.fynd);
    const p = atob(s.fynd.slice(1)), ut: string[] = [];
    for (let i = 0; i < p.length; i++) {
      if (p.charCodeAt(i) === 0) { ut.push('\0'.repeat(p.charCodeAt(++i))); continue; }
      ut.push(p[i]);
    }
    return ut.join('');
  } catch { return ''; }
}

// strand: land intill vatten, där man kan fiska. Kartans egen strand; under en torka flyttar den ut (strandNu i sjo.ts)
export const shoreOf = perKarta(seed => strandAv(getMap(seed).tiles));
// hur fort fisken växer tillbaka i sjön (1 = som vanligt): långsammare ju mindre sjön är (steg 3.8.2)
const fiskAter = perKarta(seed => {
  const { id, rutor } = sjoarna(seed), v = new Float32Array(W * H).fill(1);
  for (let i = 0; i < W * H; i++) if (id[i] >= 0) v[i] = clamp(rutor[id[i]].length / FANGST.fiskStor, FANGST.fiskLiten, 1);
  return v;
});
// avstånd i rutor till närmaste sten (högst 9)
export const stoneDist = perKarta(seed => {
  const t = getMap(seed).tiles, b = new Uint8Array(W * H).fill(9);
  for (let i = 0; i < W * H; i++) if (t[i] === T.Sten) {
    const x0 = i % W, y0 = Math.floor(i / W);
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
      const x = x0 + dx, y = y0 + dy;
      if (inMap(x, y)) b[y * W + x] = Math.min(b[y * W + x], Math.round(Math.hypot(dx, dy)));
    }
  }
  return b;
});

// vad lagret har på rutan just nu: det filtret visar
export function fyndAt(s: State, k: Lager, i: number) {
  const d = takenOf(s);
  let v = 0;
  for (const j of lagren(k)) { const t = d[j]; v += vaxerAt(s, j, i) * (t ? 1 - t[i] : 1); }
  return v;
}
// rutorna runt en ruta ut till r rutor och deras vikt efter avståndet (0 längst ut), i ordningen dy yttre, dx inre,
// och summan av vikterna. Det beror bara på r och räknas en gång
interface Karna { v: { dx: number; dy: number; w: number }[]; sum: number }
const karnor: Karna[] = [];
function karna(r: number) {
  let k = karnor[r];
  if (!k) {
    k = karnor[r] = { v: [], sum: 0 };
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const w = Math.max(0, 1 - Math.hypot(dx, dy) / (r + 1));
      k.v.push({ dx, dy, w }); k.sum += w;
    }
  }
  return k;
}
// rutan i vattnet (cx + dx, cy + dy) som man når från stranden med vikten w, annars -1
const iVattnet = (tiles: Uint8Array, cx: number, cy: number, dx: number, dy: number, w: number) => {
  const x = cx + dx, y = cy + dy;
  return w > 0 && inMap(x, y) && tiles[y * W + x] === T.Vatten ? y * W + x : -1;
};
// vad den som står på rutan når av ett mått per ruta (fn). För fisk: snittet ute i vattnet framför stranden,
// med vikt efter avståndet
export function standAt(s: State, k: Lager, x: number, y: number, fn: (i: number) => number) {
  const cx = clampI(x, W), cy = clampI(y, H), i = cy * W + cx, r = FYND[lagren(k)[0]].vatten;
  if (!r) return fn(i);
  const tiles = vattenNu(s);
  if (tiles[i] === T.Vatten) return 0;
  let sum = 0, n = 0;
  for (const { dx, dy, w } of karna(r).v) {
    const j = iVattnet(tiles, cx, cy, dx, dy, w);
    if (j >= 0) { sum += fn(j) * w; n += w; }
  }
  return n ? sum / n : 0;
}
// vad platsen ger den som står där just nu, 0 = inget. För ett lager med djur (kaniner) beror det också på var djuren
// faktiskt är: kartan säger var de trivs, och djur.ts säger hur nära en grupp platsen är (setNarvaro)
const narvaro: Partial<Record<Lager, (s: State, i: number) => number>> = {};
export function setNarvaro(k: Lager, fn: (s: State, i: number) => number) { narvaro[k] = fn; }
const nuAt = (s: State, k: Lager, i: number) => { const n = narvaro[k]; return n ? fyndAt(s, k, i) * n(s, i) : fyndAt(s, k, i); };
export function richness(s: State, k: Lager, x: number, y: number) {
  if (FYND[lagren(k)[0]].vatten) return standAt(s, k, x, y, i => nuAt(s, k, i));
  return nuAt(s, k, tileOf(x, y)); // på land: bara rutan man står på
}
// richness för en handling som tar ur flera lager (bär och rötter), och lagrens egna värden (r, samma ordning som lagren),
// så att takeFrom kan dela uttaget utan att räkna om dem. Summan är exakt den richness ger när inget lager har djur
// eller vatten; annars räknas den som vanligt och r saknas
export function richnessDelar(s: State, k: Lager, x: number, y: number): { rich: number; r?: number[] } {
  const ls = lagren(k);
  if (ls.length < 2 || narvaro[k] || ls.some(j => narvaro[j] || FYND[j].vatten)) return { rich: richness(s, k, x, y) };
  const r = ls.map(j => richness(s, j, x, y));
  return { rich: r.reduce((a, b) => a + b, 0), r };
}
// hur mycket platsens värde (richnessDelar) sjunker för varje bär man tar där, när uttaget delas mellan lagren som i
// takeFrom. Bara på land och utan djur (r finns); annars 0
export function sankning(s: State, k: Lager, x: number, y: number, rich: number, r?: number[]) {
  if (!r || rich <= 0) return 0;
  const i = tileOf(x, y), d = takenOf(s);
  let v = 0;
  lagren(k).forEach((j, n) => {
    const u = FYND[j].uttag, kv = u && karna(u.reach);
    if (kv && d[j]) v += vaxerAt(s, j, i) * kv.v[kv.v.length >> 1].w / kv.sum * (u.reach + 1) / u.full * r[n] / rich;
  });
  return v;
}
// hur många gånger byn tagit ur kartan: gränssnittet ritar om den när det ändrats (simuleringen läser det aldrig)
const plock = new WeakMap<State, number>();
export const plockOf = (s: State) => plock.get(s) ?? 0;
// ta ur en plats: mest ur rutan, lite ur grannarna. Fisk tas ur vattnet framför stranden.
// Tar man ur flera lager (bär och rötter) delas uttaget efter hur mycket av vart och ett som finns där (fore = de värdena,
// från richnessDelar, om de redan är räknade)
export function takeFrom(s: State, k: Lager, x: number, y: number, amount: number, fore?: number[]) {
  const ls = lagren(k);
  if (ls.length > 1) {
    const r = fore ?? ls.map(j => richness(s, j, x, y)), sum = r.reduce((a, b) => a + b, 0);
    if (sum > 0) ls.forEach((j, n) => { if (r[n] > 0) takeFrom(s, j, x, y, amount * r[n] / sum); });
    return;
  }
  k = ls[0];
  const d = takenOf(s)[k], u = FYND[k].uttag;
  if (!d || !u) return;
  plock.set(s, plockOf(s) + 1);
  const cx = Math.floor(x), cy = Math.floor(y), rv = FYND[k].vatten;
  if (rv) {
    const tiles = getMap(s.seed).tiles, kv = karna(rv).v;
    let n = 0;
    for (const { dx, dy, w } of kv) if (iVattnet(tiles, cx, cy, dx, dy, w) >= 0) n += w;
    if (n) for (const { dx, dy, w } of kv) {
      const j = iVattnet(tiles, cx, cy, dx, dy, w);
      if (j >= 0) d[j] = Math.min(1, d[j] + amount * w / n / u.full);
    }
    return;
  }
  const r = u.reach, { v, sum } = karna(r);
  for (const { dx, dy, w } of v) {
    const xx = cx + dx, yy = cy + dy;
    if (!inMap(xx, yy)) continue;
    const i = yy * W + xx;
    d[i] = Math.min(1, d[i] + amount * w / sum * (r + 1) / u.full);
  }
}
// en timme: platserna växer tillbaka
// vaxt: hur fort växterna växer åter (vaxtFaktor i vader.ts: fortare i blöt mark); djuren följer inte vädret
export function growFynd(s: State, hours: number, season: number, vaxt = 1) {
  const d = takenOf(s);
  for (const k of UTTAG_IDS) {
    const f = Math.exp(-FYND[k].uttag!.regrow[season] * hours * (FYND[k].grupp === 'vaxter' ? vaxt : 1)), a = d[k]!;
    if (f >= 1) continue;
    // fisken växer tillbaka långsammare i en liten sjö (steg 3.8.2)
    if (k === 'fiske') { const ft = fiskAter(s.seed); for (let i = 0; i < a.length; i++) if (a[i] > 0) { const fi = ft[i] < 1 ? Math.pow(f, ft[i]) : f; a[i] = a[i] * fi < FANGST.aterTom ? 0 : a[i] * fi; } }
    else for (let i = 0; i < a.length; i++) if (a[i] > 0) a[i] = a[i] * f < FANGST.aterTom ? 0 : a[i] * f;
  }
}
// hur mycket de bästa platserna inom räckhåll ger just nu (snitt av de tio bästa), räknas om en gång i timmen
const prospects = new WeakMap<State, { hr: number; v: Partial<Record<string, number>> }>();
export function prospect(s: State, k: Kind) {
  const hr = Math.floor(s.now / HOUR);
  let c = prospects.get(s);
  if (!c || c.hr !== hr) { c = { hr, v: {} }; prospects.set(s, c); }
  if (c.v[k] === undefined) {
    const f = campCenter(s), top: number[] = [];
    for (let y = Math.max(0, f.y - PLATS.dagY); y < Math.min(H, f.y + PLATS.dagY + 1); y++) for (let x = Math.max(0, f.x - PLATS.dagX); x < Math.min(W, f.x + PLATS.dagX + 1); x++) {
      const d = campDist(s, x, y);
      if (d > FANGST.syn) continue;
      const v = richness(s, k, x + 0.5, y + 0.5) - d * PLATS.avstandPris;
      if (v > 0) top.push(v);
    }
    top.sort((a, b) => b - a);
    const n = Math.min(PLATS.toppProspekt, top.length);
    c.v[k] = n ? top.slice(0, n).reduce((a, b) => a + b, 0) / n : 0;
  }
  return c.v[k]!;
}

// ---------- flinta ----------
// flinta hittas oftast vid stenarna, ibland i sanden vid stranden och sällan annars
// hur lätt det är att hitta flinta på platsen just nu: platser där man hittat flinta har mindre kvar ett tag
export const flintFactor = (s: State, x: number, y: number) => richness(s, 'flinta', x, y);
// flintorna och yxorna i byn. Yxorna räknas i styck, som i skog.ts (axes): en sliten yxa är fortfarande en yxa
export const flintorOchYxor = (s: State) => amountOf(s, 'flinta') + nTools(s, 'yxa');
// byn behöver flinta att tända eld med och till en yxa
export const wantsFlint = (s: State) => amountOf(s, 'flinta') < FANGST.flintaMinsta || flintorOchYxor(s) < FANGST.flintaBehov;
// en plats att samla på nära stenarna, där flinta är vanlig. I lägret och där flintan redan plockats finns ingen.
// q väljer med sin egen slumpföljd
export function flintSpot(s: State, q: Person, area?: (x: number, y: number) => boolean): { x: number; y: number } | undefined {
  const m = getMap(s.seed), sd = stoneDist(s.seed), c: { x: number; y: number; d: number }[] = [];
  for (let i = 0; i < W * H; i++) {
    if (sd[i] < 1 || sd[i] > FANGST.stenNara || m.tiles[i] === T.Vatten || m.tiles[i] === T.Sten) continue;
    const x = i % W, y = Math.floor(i / W), d = campDist(s, x, y);
    if (d < FANGST.flintaAvstand && (!area || area(x, y)) && flintFactor(s, x, y) > FANGST.flintaRik) c.push({ x, y, d });
  }
  if (!c.length) return undefined;
  c.sort((a, b) => a.d - b.d);
  const p = pickNarmaste(s, c, FANGST.flintaUrval, 'val', q);
  return { x: p.x + 0.5, y: p.y + 0.5 };
}

// ---------- svamp ----------
// Kantarellen är god. Den orangea spindlingen liknar den men är giftig. Den som blir förgiftad lär sig skilja dem åt
// och kan sedan lära andra (kunskap.ts, minne.ts).
const GIFT = 'giftsvamp'; // giftig svamp som av misstag hamnat i förrådet (syns inte för invånarna)
// svamp som hittas under en stund av samling i skogen; ger hur mycket ätlig mat som hittades.
// Kantarellen och spindlingen har var sitt lager, så de växer på olika ställen.
export function pickMushrooms(s: State, p: Person, x: number, y: number, dtSec: number, got: Record<string, number>) {
  const kv = richness(s, 'kantarell', x, y), gv = richness(s, 'spindling', x, y);
  if (kv + gv <= 0) return 0;
  const rate = FANGST.svampTakt * SNABBARE * kunnighet(p.skill.samla) * (kv + gv);
  if (!chance(s, rate / HOUR_S, dtSec, 'arbete', p)) return 0;
  if (rnd(s, 'arbete', p) < kv / (kv + gv)) {
    takeFrom(s, 'kantarell', x, y, FANGST.svampUttag);
    if (forstaGang(s, 'svamp')) log(s, `${p.name} hittade kantareller i skogen.`, 'world', [p.id]);
    return 1;
  }
  // den giftiga: känner man igen den låter man den stå
  const sure = clamp(kn(p, 'svamp') + p.skill.samla / FANGST.kandSkill + stat(p, 'intelligens', s.now) / FANGST.kandInt, 0, FANGST.kandMax);
  if (rnd(s, 'arbete', p) < sure) { count(s, 'giftsvampKand'); useK(p, 'svamp', s.now); return 0; }
  takeFrom(s, 'spindling', x, y, FANGST.svampUttag);
  count(s, GIFT);
  got[GIFT] = (got[GIFT] ?? 0) + 1;
  return 1; // den ser ut som mat och läggs i förrådet
}
// när någon äter: finns giftig svamp i förrådet kan hen få i sig den
export function eatPoison(s: State, p: Person) {
  const gift = amountOf(s, GIFT);
  // en ensam giftsvamp förfaller lite redan första slaget, så gränsen är nära noll och inte 1
  if (gift < 1e-3 || rnd(s, 'halsa', p) >= Math.min(FANGST.giftMax, gift / Math.max(1, foodOf(s)) * FANGST.giftAndel)) return;
  addTo(s, GIFT, -Math.min(1, gift));
  count(s, 'forgiftad');
  p.sickUntil = Math.max(p.sickUntil ?? 0, s.now + (FANGST.giftSjukMin + rnd(s, 'halsa', p) * FANGST.giftSjukSpann) * HOUR);
  p.poisonUntil = p.sickUntil; p.sickWhy = 'Förgiftad av svamp';
  p.health = clamp(p.health - FANGST.giftHalsa, 0, 1);
  think(p, 'Blev förgiftad av en svamp', FANGST.giftTanke, s.now, FANGST.giftTankeDygn * DAY);
  upplev(s, p, 'svamp'); smakGift(p); // avsmak för svamp (steg 3.3.5)
  const before = kn(p, 'svamp'), v = learnK(p, 'svamp', FANGST.giftLar, s.now);
  log(s, `${p.name} blev förgiftad av svamp ur förrådet.`, 'world', [p.id]);
  if ((s.stat!.forgiftad ?? 0) <= 1) {
    log(s, 'Byn misstänker att en av svamparna är giftig.', 'world');
    sedEvent(s, 'forsiktighet', FANGST.giftSed, 'Någon blev förgiftad av svamp. Byn har blivit försiktigare med vad den äter.');
  }
  if (before < FANGST.giftKand && v >= FANGST.giftKand) log(s, `${p.name} har lärt sig skilja kantarellen från den giftiga orangea spindlingen.`, 'skill', [p.id]);
  // det hen nu vet: den giftiga svampen sorteras bort ur förrådet, och då är den inte längre svamp att äta
  const bort = amountOf(s, GIFT) * v;
  addTo(s, GIFT, -bort); addTo(s, 'svamp', -Math.min(amountOf(s, 'svamp'), bort));
}

// ---------- fiske med händerna ----------
// Man står i strandkanten och försöker gripa fisken. Ett försök tar fem minuter, sedan steg 1.5.13 en tredjedel kortare (SNABBARE). Ibland nappar det, alltså att man
// får tag i en fisk, men oftast slinker den ur händerna. Skickliga fiskare håller fast oftare.
export const TRY_SEC = FANGST.forsokSek / SNABBARE;
// Med fiskespjut träffar man fisken oftare och den sitter kvar på spjutet.
// med metspö nappar fisken oftare och sitter kvar bättre på kroken (masken grävs fram i steg.ts)
type Fiskedon = 'hand' | 'spjut' | 'metspo';
// napp och hall står i raderna för fiske i handlingar.ts: redskapets egna, annars handens
export function handFish(s: State, p: Person, x: number, y: number, ageF: number, rd?: RedskapDef) {
  const gear: Fiskedon = rd?.don ?? 'hand', hand = ACTS.fiske.hand!, napp = rd?.napp ?? hand.napp, hall = rd?.hall ?? hand.hall;
  const st = (p.fiske ??= { f: 0, n: 0, k: 0 }), spear = gear === 'spjut';
  st.f++; count(s, 'fiskeForsok'); gjort(s, p, 'fiskeForsok'); sjoRakna(s, x, y, 'forsok', p); if (spear) count(s, 'spjutForsok'); if (gear === 'metspo') count(s, 'metForsok');
  const season = ACTS.fiske.sasong![ageIndex(s)];
  if (rnd(s, 'arbete', p) >= napp * season * Math.min(FANGST.fiskRikMax, richness(s, 'fiske', x, y)) * ageF) return 0;
  st.n++; count(s, 'fiskeNapp'); sjoRakna(s, x, y, 'napp', p);
  const hold = hall + p.skill.fiske / FANGST.hallSkill + stat(p, 'uthallighet', s.now) / FANGST.hallUthall + FANGST.hallSmid * franMitt(p, 'smidighet', s.now);
  if (rnd(s, 'arbete', p) >= hold) return 0;
  st.k++; gjort(s, p, 'fisk'); sjoRakna(s, x, y, 'fisk', p); const forsta = forstaGang(s, 'fisk'); if (spear) count(s, 'spjutFisk'); if (gear === 'metspo') count(s, 'metFisk');
  takeFrom(s, 'fiske', x, y, 1);
  if (forsta) log(s, `${p.name} fångade byns första abborre ${spear ? 'med spjut' : gear === 'metspo' ? 'med metspö' : 'med händerna'}, efter ${s.stat!.fiskeForsok} försök.`, 'world', [p.id]);
  return 1;
}
