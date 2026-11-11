// Striden (fas 3, system 3.7). Grunden byggdes med testarenan (steg 3.7.5): en strid är två sidor av kämpar (Kampe) på en
import { och, skada as skadaOrd, stor, tal } from './ord';
import { kronikaBer, loggBer, personFalt } from './berattelser';
// liten plats, med en avsikt (AVSIKTER) som avgör när den slutar. Den räknas i fasta tidssteg om STRID.tick sekunder
// (stridSteg), så att den blir likadan i levande läge och i snabbläget. Var och en väljer mål, går fram och slår när målet
// är inom räckhåll; ett slag träffar eller missar, och en träff hamnar på en kroppsdel (KROPPSDELAR i halsa.ts) och blir en
// skada (SKADOR i halsa.ts) efter vapnets slag (VAPEN: hugg, stick, slag eller bett), minus det kläderna tar (SKYDD).
// Smärtan och blodet fäller den skadade, och stridsmodet sjunker av skador tills man ger upp eller flyr. Allt som händer
// står i stridens egen logg (Strid.logg, raderna i STRIDHANDELSER), som sparas med striden och inte i händelseloggen, och
// stridRapport sammanfattar den. Slumpen är stridens egen följd (Strid.r): striden är en ren funktion av uppställningen och
// fröet, så att arenan kan köra om samma strid. När striden kommer in i byn (steg 3.7.2) tas fröet ur byns följd 'strid'.
// Smidigheten (steg 3.7.6) gör en kämpe snabbare och svårare att träffa, och blodtörsten (aggressionen, låg empati och dåligt
// humör, humor.ts) gör att man ger sig senare. Försvaret (steg 3.7.2): den som har den som slår som mål kan parera (med vapen
// bättre än med händerna) eller ducka (smidigheten); den som slåss med någon annan är inringad och försvarar sig inte, och
// den som är utmattad backar undan medan en vän håller striden. Ett djupt stick blir ett sticksår och ett hårt slag mot
// huvudet en hjärnskakning. Byns slagsmål och lek finns längst ner (stridIByn, steg 3.7.2). Avståndet (steg 3.7.7): ett vapen
// som kan kastas (VAPEN.kast) kastas på avstånd med färdigheten Träffsäkerhet (sikte), sämre ju längre bort och ju hårdare
// det blåser (Strid.vind). Skytten håller avståndet, backar undan om hen är snabbare än den som kommer, byter annars till
// reservvapnet i bältet (Kampe.reserv) eller slår med det hen har. Står målet i närstrid med en vän väntar en god och lugn
// skytt eller byter mål; den ovana chansar, och en miss kan träffa vännen (vådaskott). Ett kastat spjut kan fastna i såret:
// det blöder mindre så länge det sitter, och den som står kvar drar ut det (mer blod), annars sitter det kvar till vården.
// Knuffen och fallet (steg 3.7.8): i stället för att slå kan man knuffa. Knuffen gör ingen skada men kan fälla, lättare
// den som är trött, skadad, bär tungt eller står på hal mark (Strid.halt: lera och snö); den som springer på hal mark kan
// halka. Den som ligger kan inte parera eller ducka och är lätt att träffa tills hen rest sig; i ett slagsmål låter den
// som inte är blodtörstig hen resa sig, de andra rusar fram. Ett vapen kan tappas av en träff i armen eller handen och när
// man faller: det blir en sak på marken (Strid.marken) som ägaren eller en motståndare utan vapen hämtar, och den som böjer
// sig ner är lätt att träffa. Sluttningar får betydelse när kartan får höjder.
// Hotet (steg 3.7.9): hela tiden jämför varje sida sin styrka (hur många som står, deras styrka, vapen, ork och smärta) med
// motståndarnas, och de främstas mod drar med de andra. Det läggs till var och ens stridsmod (modNu): den som är svagare
// eller vars främsta tvekar ger upp eller flyr tidigare, i början, mitten eller slutet, och före första slaget kan den som
// är rädd dra sig undan utan strid. Den som är rädd eller utmattad drar sig bakom vännerna medan de håller striden. Leken
// följer inte hotet. Ropen räknas med när larmen kommer (3.7.11), och behovet (hunger, att försvara hemmet) med rovdjuren
// (3.7.1) och räderna (11.2.5).
import { balans } from './balans';
import { GANG } from './gang';
import { blodFaktor, GADELAR, HALSA, KROPPSDELAR, Kroppsdel, SKADOR, SkadaTyp, syn } from './halsa';
import { STRIDSDJUR, djurStrid, kampeSort } from './kampar';
export { STRIDSDJUR };
export type { DjurStrid } from './kampar';
import { KLAD_SLAG, SAKER, sakNamn } from './saker';
import { kladSkyddStrid, kladTung } from './klader';
import { clamp, rnd } from './slump';
import { byId, count, getRel, log, ovning, relKey, stat, think } from './folk';
import { minnsRel } from './relationer';
import { ledareOf } from './styre';
import { blodtorst } from './humor';
import { handelse, smaka, smakAv } from './rykten';
import { GRANNAR4, HOUR, T } from './typer';
import { UTRUSTNING, harBalte, paSig, paSigVikt } from './utrustning';
import { PLAGG, kladAv } from './klader';
import { amountOf, use } from './lager';
import { capacity } from './lager';
import { snoPaMarken, vaderNu } from './vader';
import { viktOf } from './saker';
import { allaTing, ownedBy, toolsOf, wearTool } from './agande';
import { getMap } from './karta';
import { groundOf, markslag, tileOf } from './mark';
import type { Person, State } from './typer';
import { notis } from './notiser';

// ---------- balanstal (regel 8) ----------
export const STRID = balans('strid', {
  // blödningen under striden (steg 9.5.18): den fallne trycker själv så att det blöder tryckSjalv så mycket; en kämpe med minst
  // raddaEmp i empati går till en vän som ligger och blöder när tiden kvar är kortare än det som är kvar av striden och ingen fiende
  // är närmare vännen än raddaFri
  tryckSjalv: 0.5, raddaEmp: 10, raddaFri: 3,
  hjalpAvst: 4, draUndan: 1.5, // hjälparna (steg 9.5.20) håller sig så här långt från fienderna, och drar den fallne så här långt bort
  // olyckshugget (steg 9.5.22): vid varje träff är risken skärpan × graden² × hugg, mindre med skydd på delen (skyddHugg); en arm,
  // ett ben, en hand eller en fot huggs av, och huvudet eller bålen dödar direkt
  hugg: 0.12, skyddHugg: 0.5, huggMin: 0.5, // bara en träff av minst huggMin kan hugga av
  bjornBett: 3, // björnen biter med käftarna vart så här många slag som träffar, och river med ramarna annars (steg 9.5.13)
  smitta: 0.1, // så mycket de andras mod sjunker när någon ger upp (steg 8.8.8)
  pilSonder: 0.25, // så stor del av pilarna går sönder
  ringad: 0.1, // så mycket lättare det är att träffa den som redan slåss med en annan, per extra motståndare (steg 8.7.7)
  bakomTrad: 0.5, // en pil mot någon bakom ett träd träffar trädet så här ofta
  skoldSlag: 0.3, skoldPil: 0.6, // skölden blockerar 3 av 10 slag och 6 av 10 pilar och kast (steg 8.7.3)
  smidPer: 1, // varje steg rustning tar så här mycket smidighet
  tick: 0.2, // sekunder i spelet per tidssteg i striden (samma i båda lägena)
  kortSteg: 1, // sekunder per steg för hela byn när faran är nära (steg 10.1.1, mätt med npm run kortsteg: 43 ms datortid per by och minut i spelet mot 15 med femminuterssteg; 0,5 s kostar 67 och 2 s 29). Används från steg 10.1.4
  tempo: 2, // striden går så här många gånger långsammare än den räknas: allt i den (slagen, stegen, blodet, orken) tar längre tid men slutar likadant (steg 3.7.18)
  maxTid: 480, // en strid slutar senast efter så här många sekunder (oavgjort)
  efterTid: 20, // när ena sidan inte har någon kvar som slåss slutar striden senast så här många sekunder senare, också om någon ännu flyr eller ligger (den som inte kommer undan blir kvar på platsen)
  krypNara: 1, // den som kryper stannar så här många rutor från vännen hen kryper mot (steg 3.7.19) ...
  krypBlod: 0.5, // ... och lämnar så här mycket släpspår per ruta i byn
  kropp: 0.6, // man kommer inte närmare än så här (rutor) till en fiende som står: man går runt hen (steg 3.7.20)
  van: 0.5, // ... och inte närmare än så här till en på samma sida, i striden och på flykten (steg 9.2.78)
  runtUt: 8, // på kartan söks vägen runt en vägg så här många rutor utanför de två (steg 10.1.4)
  flyBort: 6, // den som flyr mot en plats (Kampe.fly) har lämnat striden så här många rutor från närmaste fiende som står (steg 9.2.76)
  fart: 1.6, // rutor i sekunden för en frisk vuxen som springer i strid (gånger djurets fart)
  traffBas: 0.6, // chansen att träffa någon som är lika skicklig
  traffPer: 0.03, // ... och så här mycket mer per poäng skicklighet över motståndarens
  smidUndan: 0.015, // ... och så här mycket mindre per poäng smidighet hos motståndaren över 10 (steg 3.7.6)
  smidFart: 0.02, // farten gånger 1 + smidFart × (smidigheten − 10)
  torst: 0.3, // stridsmodet i början plus så här mycket gånger blodtörsten (0–1)
  traffMin: 0.1, traffMax: 0.95, // chansen att träffa är aldrig lägre eller högre än så här
  trott: 0.4, // den som är helt utmattad träffar så här mycket sämre
  styrka: 0.05, // skadan gånger 1 + (styrka − 10) × detta
  slump: 0.6, // skadan gånger ett tal mellan 1 − slump/2 och 1 + slump/2
  ingen: 0.03, // en träff som blir mindre än så här efter kläderna gör ingen skada
  orkSlag: 0.05, // ett slag tar så mycket ork (0–1), mindre för den uthållige ...
  orkVila: 0.04, // ... och orken kommer tillbaka så här mycket i sekunden mellan slagen
  blodSlag: 0.25, // ett öppet sår tar så här mycket blod direkt (gånger skadans blod och grad) ...
  blodSek: 0.002, // ... och sedan så här mycket i sekunden medan det blöder
  nere: 0.9, // den som har så här ont faller och kan inte slåss längre
  modStart: 0.4, // stridsmodet när striden börjar: modStart + mod / 20 × modMod
  modMod: 0.6,
  modSkada: 1.1, // stridsmodet sjunker så här mycket gånger graden av en skada ...
  modFeg: 0.5, // ... gånger 1 + modFeg × (10 − modet) / 10, högst modFeg åt vardera hållet (steg 9.2.116)
  modVan: 0.2, // ... och så här mycket när en vän faller
  lek: 0.2, // i lek slutar striden vid första skada av den här graden
  brottning: 0.3, // i brottningen (steg 9.2.92) är slagen så här starka mot i ett slagsmål, och ingen dör
  utsatt: 1.5, // chansen att träffa den som ligger eller flyr, gånger detta
  takt: 0.3, // tiden mellan slagen gånger 1 − (uthållighet − 10) / 20 × detta
  // försvaret (steg 3.7.2): bara den som står och har den som slår som mål kan parera eller ducka
  parera: 0.3, // chansen att parera ett slag som skulle ha träffat, med vapen och lika skicklig som den som slår ...
  pareraHand: 0.12, // ... och med händerna
  pareraPer: 0.03, // ... och så här mycket mer per poäng skicklighet över den som slår
  duck: 0.15, // chansen att ducka ett slag som inte parerades, för den med smidighet 10 och full ork ...
  duckSmid: 0.06, // ... gånger 1 + duckSmid × (smidigheten − 10)
  duckTung: 0.15, // ... och så här mycket mindre i ett tungt plagg (rocken, PLAGG i klader.ts: tungt att röra sig i)
  ringa: 1.5, // ett mål vars uppmärksamhet är på någon annan (inringat) väljs som om det stod så här många rutor närmare
  backa: 0.25, // den som har så lite ork backar undan om en vän står kvar i striden ...
  backaTill: 0.6, // ... tills orken är tillbaka till så här mycket
  hjarna: 0.2, // ett slag mot huvudet av minst den här graden ger hjärnskakning ...
  hjarnaOrk: 0.4, // ... som tar så här mycket ork
  // avståndet (steg 3.7.7)
  langt: 0.5, // ett kast träffar så här mycket sämre vid kastets längsta räckvidd (mindre närmare) ...
  vind: 0.6, // ... och så här mycket sämre i den hårdaste blåsten vid längsta räckvidden ...
  dimma: 0.5, // ... och i den tätaste dimman (steg 3.7.11)
  nara: 2.2, // en fiende som har skytten som mål och är så här nära har nått skytten
  hall: 4, // skytten backar undan från den som kommer närmare än så här, om hen är snabbare
  byta: 0.7, // sekunder det tar att byta till reservvapnet i bältet
  kastMin: 2.5, // ett spjut kastas bara mot den som är minst så här långt bort
  vanta: 0.55, // skyttens tålamod (sikte / 20 × 0.6 + stridsmodet × 0.4) från vilket hen väntar på fritt läge ...
  vadaNara: 1.4, // ... när en vän står så här nära målet
  vada: 0.35, // en miss mot den som slåss med en vän träffar vännen med den här chansen
  fastna: 0.6, // chansen att ett kastat spjut som sticker minst fastnaGrad fastnar i såret
  fastnaGrad: 0.25,
  fastBlod: 0.5, // såret blöder så här mycket medan spjutet sitter kvar ...
  draUt: 0.4, // ... den som står kvar drar ut det med den här chansen i sekunden ...
  draBlod: 1, // ... och det tar så här mycket blod till (gånger skadans blod, grad och blodSlag)
  // knuff, fall och tappade vapen (steg 3.7.8)
  knuff: 0.12, // chansen att man knuffar i stället för att slå, med vapen ...
  knuffHand: 0.3, // ... och med händerna
  fallBas: 0.22, // chansen att en knuff fäller någon lika stark, utvilad och frisk på torr mark ...
  fallStyrka: 0.06, // ... gånger 1 + (styrkan − den knuffades styrka) × detta ...
  fallTrott: 1, fallSkadad: 1.5, fallTung: 1, fallHalt: 1.5, // ... och gånger 1 + detta × tröttheten (1 − ork), skadorna (1 − rörligheten), bördan och halkan (0–1)
  ligga: 1.5, // sekunder den som fallit ligger innan hen är uppe (dubbelt så länge för den utmattade)
  halka: 0.05, // chansen i sekunden att halka omkull när man springer, gånger halkan
  leraFran: 0.6, // marken blir hal av fukten över så här mycket (vader.ts) ...
  snoHalt: 0.5, // ... och av snön på marken, gånger detta
  tappa: 0.4, // chansen att tappa vapnet av en träff i armen eller handen av minst tappaGrad ...
  tappaGrad: 0.25,
  tappaFall: 0.3, // ... och när man faller
  hamta: 4, // ett vapen på marken hämtas av den som saknar vapen och är så här nära
  plocka: 0.6, // sekunder det tar att böja sig ner och ta upp det
  ruser: 0.35, // den som har så här mycket blodtörst rusar fram mot den som ligger i ett slagsmål (de andra låter hen resa sig)
  // hotet (steg 3.7.9)
  hot: 0.6, // stridsmodet ändras så här mycket gånger (sidans andel av styrkan − ½) × 2: −hot ensam mot en övermakt ...
  framst: 0.3, // ... och så här mycket gånger (de främstas stridsmod − ½), de två som står närmast fienden
  avsta: 0.2, // före första slaget drar sig den undan vars stridsmod med hotet är under så här mycket
  tyckeSkick: 2, // tycket för vapnet (steg 3.7.10, -1 till 1) ger så här mycket skicklighet med det ...
  tyckeVal: 0.3, // ... och drar så här mycket i valet av vapen inför striden (skadan gånger 1 + tyckeVal × tycket)
  tyckeVann: 0.15, // den som vann med vapnet får så här mycket tycke för det ...
  tyckeLek: 0.02, // ... den som lekte (övade) med det så här mycket ...
  tyckeForlust: 0.25, // ... och den som förlorade svårt (låg nere eller blev svårt skadad) så här mycket ogillande
  tyckeSvar: 0.3, // en svår förlust: skadornas grad sammanlagt minst så här mycket
  backaMod: 0.15, // den som har så lite stridsmod med hotet drar sig bakom vännerna (som den utmattade) ...
  backaModTill: 0.3, // ... tills hen har så här mycket igen
  // ledaren i strid (steg 3.7.12)
  ledVal: 0.5, // ledaren går först när (mod − 10) / 10 + aggression × ledAggr + seden Samtal – Strid (9.2.3) × ledSed är över noll − ledVal × försiktigheten ...
  ledAggr: 0.5, ledSed: 1,
  ledFram: 0.15, // ... och då har hela sidan så här mycket mer stridsmod, och ledaren står längst fram ...
  ledBak: 0.05, // ... annars står ledaren bakom vännerna och leder, och sidan har så här mycket mer
  flock: 0.2, // och för en flock så här mycket till när en av dem flyr, faller eller dör (steg 3.7.1)
  ledFaller: 0.35, // stridsmodet sjunker så här mycket för hela sidan när ledaren faller eller dör (utöver modVan)
  skyddVan: 60, // ledarens närmaste vänner (partner, bästa vän och den som tycker om ledaren minst så här mycket) skyddar hen ...
  skyddVakt: 5, // ... de går mot den som anfaller ledaren inom så här många rutor från ledaren ...
  skydd: 0.4, // ... och kliver emellan och tar slaget med den här chansen, när de står så här nära ledaren:
  skyddNara: 1.6,
});

// ---------- vapnen (registret) ----------
// skada = grad av en full träff från en normalstark vuxen, takt = sekunder mellan slagen, rack = räckvidd i rutor,
// slag = vad det gör med kroppen (SLAGEN), ord = verbet i loggen, skarpa = hur lätt det hugger av en del (olyckshugget, steg 9.5.22). Ett vapen är en sak i saker.ts (samma id), utom
// händerna och djurens bett. kast = vapnet kan kastas (steg 3.7.7): räckvidden, skadan, hur många kast man har (skott) och om
// det fastnar i såret; ett vapen som bara kastas när man har ett reservvapen (spjutet) har reserv. Pilbågen kommer i 9.4.1
interface KastDef { ammo?: string; pil?: true; rack: number; skada: number; skott: number; fastnar?: true; reserv?: true }
interface VapenDef { skarpa: number; namn: string; skada: number; takt: number; rack: number; slag: Slag; ord: string; tecken: string; kast?: KastDef; liten?: true }
export const VAPEN = {
  hand: { skarpa: 0, namn: 'Knytnävarna', skada: 0.14, takt: 0.9, rack: 0.9, slag: 'slag', ord: 'slår', tecken: '👊' },
  kniv: { skarpa: 0.6, namn: 'Flintkniven', skada: 0.32, takt: 0.9, rack: 0.9, slag: 'hugg', ord: 'skär', tecken: '🔪', liten: true }, // liten = ryms i bältet som reserv
  yxa: { skarpa: 0.9, namn: 'Flintyxan', skada: 0.5, takt: 1.5, rack: 1.1, slag: 'hugg', ord: 'hugger', tecken: '🪓', liten: true },
  fiskespjut: { skarpa: 0.3, namn: 'Träspjutet', skada: 0.32, takt: 1.3, rack: 1.8, slag: 'stick', ord: 'sticker', tecken: '🔱', kast: { rack: 6, skada: 0.3, skott: 1, fastnar: true, reserv: true } },
  flintspjut: { skarpa: 0.5, namn: 'Flintspjutet', skada: 0.45, takt: 1.3, rack: 1.8, slag: 'stick', ord: 'sticker', tecken: '🔱', kast: { rack: 6, skada: 0.42, skott: 1, fastnar: true, reserv: true } },
  bage: { skarpa: 0.1, namn: 'Pilbågen', skada: 0.1, takt: 1.2, rack: 0.9, slag: 'slag', ord: 'slår', tecken: '🔱', kast: { rack: 12, skada: 0.4, skott: 12, ammo: 'pilar', pil: true, fastnar: true } }, // steg 8.7.6; pilen sitter kvar i såret (steg 9.5.21)
  slunga: { skarpa: 0, namn: 'Slungan', skada: 0.08, takt: 1.1, rack: 0.9, slag: 'slag', ord: 'slår', tecken: '🪨', kast: { rack: 10, skada: 0.3, skott: 12, ammo: 'sten' }, liten: true },
  benspade: { skarpa: 0.15, namn: 'Benspaden', skada: 0.28, takt: 1.4, rack: 1.3, slag: 'slag', ord: 'slår', tecken: '{sym_benspade}' },
  sten: { skarpa: 0, namn: 'Stenen', skada: 0.25, takt: 1.1, rack: 0.9, slag: 'slag', ord: 'slår', tecken: '🪨', kast: { rack: 8, skada: 0.22, skott: 3 } }, // tre stenar att kasta, sedan slår man med den sista
  bett: { skarpa: 0.2, namn: 'Tänderna', skada: 0.1, takt: 0.8, rack: 0.7, slag: 'bett', ord: 'biter', tecken: '🦷' },
  vargbett: { skarpa: 0.4, namn: 'Vargens käftar', skada: 0.28, takt: 1.4, rack: 0.9, slag: 'bett', ord: 'biter', tecken: '🐺' }, // vargen biter hårt (steg 3.7.1)
  bjornram: { skarpa: 0.5, namn: 'Björnens ramar', skada: 0.4, takt: 1.6, rack: 1.1, slag: 'riv', ord: 'river', tecken: '🐾' }, // björnen river med klorna och slår hårt (steg 6.6.5), och biter ibland med käftarna (STRID.bjornBett, steg 9.5.13)
} satisfies Record<string, VapenDef>;
export type Vapen = keyof typeof VAPEN;
const VAP: Record<string, VapenDef> = VAPEN;
export const VAPEN_LIST = Object.keys(VAPEN) as Vapen[];
// vapnen en människa kan ha i arenan (händerna och sakerna som finns)
export const MANNISKOVAPEN = VAPEN_LIST.filter(v => v === 'hand' || SAKER[v]);

// ---------- slagen: vad ett vapen gör med kroppen ----------
// skada = skadan i SKADOR efter graden (den första vars gräns graden når, från slutet)
type Slag = 'hugg' | 'stick' | 'slag' | 'bett' | 'riv';
const SLAGEN: Record<Slag, { namn: string; skada: [number, SkadaTyp][] }> = {
  hugg: { namn: 'Hugg', skada: [[0, 'skarsar']] },
  stick: { namn: 'Stick', skada: [[0, 'skarsar'], [0.35, 'sticksar']] }, // ett djupt stick blöder mer (steg 3.7.2)
  slag: { namn: 'Slag', skada: [[0, 'blamarke'], [0.3, 'krossar'], [0.65, 'benbrott']] },
  bett: { namn: 'Bett', skada: [[0, 'bett']] },
  riv: { namn: 'Riv', skada: [[0, 'klos']] }, // klorna river (björnen, steg 9.5.13; hunden och katten senare)
};
// ett hårt slag mot huvudet blir hjärnskakning (steg 3.7.2)
const skadaAv = (sl: Slag, g: number, d: Kroppsdel): SkadaTyp => {
  if (sl === 'slag' && d === 'huvud' && g >= STRID.hjarna) return 'hjarnskakning';
  const r = SLAGEN[sl].skada; for (let i = r.length - 1; i > 0; i--) if (g >= r[i][0]) return r[i][1]; return r[0][1];
};

// ---------- var slagen träffar ----------
// hur ofta en träff hamnar på varje del (huvudet sällan)
const TRAFFDEL: Partial<Record<Kroppsdel, number>> = { huvud: 0.07, bal: 0.33, armV: 0.11, armH: 0.11, handV: 0.05, handH: 0.05, benV: 0.1, benH: 0.1, fotV: 0.04, fotH: 0.04 };
const DELAR = Object.keys(TRAFFDEL) as Kroppsdel[];

// ---------- det kläderna tar ----------
// per klädesplagg i saker.ts: delarna det täcker och hur stor del av skadan det tar per slag, plaggets skydd gånger
// materialets (PLAGG och KLADMATERIAL i klader.ts, steg 3.10.12). Rustningen kommer i 9.4.1
export const SKYDD: Record<string, { delar: Kroppsdel[]; tar: Partial<Record<Slag, number>> }> = Object.fromEntries(KLAD_SLAG.flatMap(k => { const sk = kladSkyddStrid(k); return sk ? [[k, sk]] : []; }));
export const KLADER_STRID = Object.keys(SKYDD);

// ---------- avsikten (registret) ----------
// vapen = man slåss med vapen (annars med händerna), nere = man slår den som ligger, slut = vad som avslutar striden för
// den drabbade: 'skada' vid första skadan av graden STRID.lek, 'ge' att man ger upp när modet tar slut, 'fly' att man flyr
interface AvsiktDef { namn: string; text: string; vapen: boolean; nere: boolean; modSlut: 'ge' | 'fly'; lek?: true; sport?: true } // sport = brottningen (steg 9.2.92): svaga slag, ingen dör, och man är kvar i matchen
export const AVSIKTER = {
  lek: { namn: 'Lek', text: 'Man brottas och slår på skoj och slutar vid första riktiga smärta.', vapen: false, nere: false, modSlut: 'ge', lek: true },
  brottning: { namn: 'Brottning', text: 'Två brottas för sportens skull utan vapen. Slagen är svaga och den som känner smärta ger sig; en skada är ovanlig.', vapen: false, nere: false, modSlut: 'ge', lek: true, sport: true },
  slagsmal: { namn: 'Slagsmål', text: 'Med händerna tills den ena ger upp eller ligger.', vapen: false, nere: false, modSlut: 'ge' },
  skada: { namn: 'Skada', text: 'Med vapen tills den andra ligger, flyr eller ger upp.', vapen: true, nere: false, modSlut: 'fly' },
  doda: { namn: 'Döda', text: 'Med vapen, och den som ligger slås ihjäl.', vapen: true, nere: true, modSlut: 'fly' },
} satisfies Record<string, AvsiktDef>;
export type Avsikt = keyof typeof AVSIKTER;
const AVS: Record<Avsikt, AvsiktDef> = AVSIKTER;
// hur striden börjar, som en mening (steg 6.7.1): "Striden börjar: man slåss för att skada."
const BORJAR: Record<Avsikt, string> = { lek: 'man brottas på lek', brottning: 'man brottas i en match', slagsmal: 'man slåss med händerna', skada: 'man slåss för att skada', doda: 'man slåss för att döda' };

// ---------- händelserna i loggen (registret) ----------
// tecken = symbolen först i loggen (platshållare tills bildstilen har dem), ord = hur meningen börjar
export const STRIDHANDELSER = {
  borjar: { tecken: '⚔️', namn: 'Striden börjar' },
  raddar: { tecken: '🩹', namn: 'Drar undan en vän' }, // steg 9.5.18
  hugg: { tecken: '🪓', namn: 'Olyckshugget' }, // steg 9.5.22
  traff: { tecken: '💥', namn: 'Träff' },
  tog: { tecken: '🛡️', namn: 'Kläderna tog slaget' },
  miss: { tecken: '{sym_miss}', namn: 'Miss' },
  parera: { tecken: '⚔️', namn: 'Parerar' }, // steg 3.7.2
  duck: { tecken: '🌀', namn: 'Duckar' },
  backar: { tecken: '↩️', namn: 'Backar' },
  avstand: { tecken: '🏹', namn: 'Håller avståndet' }, // steg 3.7.7
  byter: { tecken: '🔁', namn: 'Byter vapen' },
  vantar: { tecken: '✋', namn: 'Väntar på fritt läge' },
  vada: { tecken: '😬', namn: 'Vådaträff' },
  fastnar: { tecken: '📍', namn: 'Fastnar i såret' },
  drar: { tecken: '🩸', namn: 'Drar ut' },
  knuff: { tecken: '🤚', namn: 'Knuffar' }, // steg 3.7.8
  omkull: { tecken: '⬇️', namn: 'Faller omkull' },
  halkar: { tecken: '💫', namn: 'Halkar' },
  upp: { tecken: '⬆️', namn: 'Reser sig' },
  later: { tecken: '🖐️', namn: 'Låter den andra resa sig' },
  tappar: { tecken: '👐', namn: 'Tappar vapnet' },
  plockar: { tecken: '🤲', namn: 'Tar upp' },
  nere: { tecken: '⤵️', namn: 'Faller' },
  kryper: { tecken: '🐛', namn: 'Kryper undan' }, // steg 3.7.19
  ger: { tecken: '🏳️', namn: 'Ger upp' },
  flykt: { tecken: '🏃', namn: 'Flyr' },
  borta: { tecken: '🚪', namn: 'Har flytt' },
  avstar: { tecken: '🙅', namn: 'Drar sig undan' }, // steg 3.7.9
  skild: { tecken: '🤝', namn: 'Skildes åt' }, // någon gick emellan (steg 10.1.4, kartstrid.ts)
  leder: { tecken: '👑', namn: 'Går först' }, // steg 3.7.12
  skyddar: { tecken: '🛡', namn: 'Kliver emellan' },
  ledareFaller: { tecken: '😱', namn: 'Ledaren föll' },
  kommer: { tecken: '🏃', namn: 'Kommer till' }, // steg 6.6.10
  dod: { tecken: '💀', namn: 'Död' },
  slut: { tecken: '🏁', namn: 'Striden är slut' },
} as const;
export type Handelse = keyof typeof STRIDHANDELSER;

// ---------- en strid ----------
// torst = blodtörsten 0–1 (steg 3.7.6), sikte = skickligheten med kast (Träffsäkerhet, steg 3.7.7; annars skicklighet)
export interface KampeStats { styrka: number; uthallighet: number; mod: number; smidighet: number; skicklighet: number; torst?: number; sikte?: number }
export type KampeLage = 'strid' | 'nere' | 'ger' | 'flykt' | 'borta' | 'dod';
export interface Kampe {
  emp?: number; raddar?: number; // empatin, och den blödande vän hen är på väg till (steg 9.5.18)
  hjalp?: true; // en hjälpare: slåss inte, väntar på avstånd och drar undan den som fallit (steg 9.5.20)
  jagar?: number; // hämnden riktar sig mot just den personen (steg 8.8.5)
  skold?: boolean; // håller en sköld (steg 8.7.3)
  id: number; namn: string; sida: 0 | 1; pid?: number; djur?: string; // pid = personen i byn, djur = sorten i KAMPAR (kampar.ts); utan den en människa
  st: KampeStats; vapen: Vapen; klader: string[]; fart: number; // fart = gånger STRID.fart
  x: number; y: number; // rutor (med decimaler)
  skador: { d: Kroppsdel; k: SkadaTyp; g: number; ny: number; fast?: 1; av?: 1 }[]; // av = delen höggs av (olyckshugget, steg 9.5.22) // ny = öppet sår som blöder (1) eller levrat (0), fast = ett spjut sitter kvar
  blod: number; ork: number; modNu: number; lage: KampeLage;
  vant: number; mal?: number; backar?: true; // sekunder till nästa slag, målet, och om hen backar undan för att hämta andan
  slag: number; traffar: number; gjort: number; // för rapporten: slag, träffar och summan av skadornas grad
  reserv?: Vapen; skott?: number; // steg 3.7.7: reservvapnet i bältet och kasten som är kvar
  haller?: true; vantar?: true; ifatt?: true; vada?: number; // håller avståndet, väntar på fritt läge, blev ifattsprungen utan reserv, vådaträffar
  tung?: number; // steg 3.7.8: bördan (det hen bär genom vad hen orkar, 0–1) ...
  ligger?: number; bocker?: number; later?: number; // ... sekunder kvar på marken och kvar av att böja sig ner, den hen låter resa sig
  fallT?: number; /* stridens tid när hen föll eller började fly */ gast?: 1; /* en gäst (rövare, handlare, främling), inte en bybo */ ledare?: 'fram' | 'bak'; skyddar?: number; // steg 3.7.12: byns ledare (går först eller står bakom), och ledaren (kämpens id) som vännen skyddar
  kryper?: number; // steg 3.7.19: hen kan inte gå och kryper undan; rutorna hen krupit
  fly?: { x: number; y: number }; // steg 9.2.76: dit hen flyr (rutor på platsen), i stället för mot närmaste kanten
}
// en rad i loggen: tiden (sekunder), vem (a) och mot vem (b), del, skada och grad, och det kläderna tog
// Varje rad är en händelse (steg 10.1.3, "Ett slag är en händelse"): tiden, vad som hände, vem och mot vem. Ett anfall (ett slag,
// ett kast eller en knuff) är raden med sl: hur det gick (träff, kläderna tog det, miss, parerat, duckat, vådaträff, knuff, omkull),
// och l är hur länge det tar på klockan (vapnets takt: tiden till samma kämpes nästa anfall). Bilden, loggen, krönikan och
// rapporten läser de här raderna (slagen nedan), så att ett slag i koden är ett slag i bilden
export interface StridRad { t: number; h: Handelse; a?: number; b?: number; d?: Kroppsdel; k?: SkadaTyp; g?: number; v?: Vapen; kl?: string; kast?: 1; sl?: 1; l?: number }
export interface Strid {
  avsikt: Avsikt; t: number; w: number; h: number; r: number; vind: number; dimma: number; // vind = blåsten 0–1 och dimma = dimman 0–1 (vädret)
  halt: number; marken: { v: Vapen; x: number; y: number; av: number }[]; // halkan 0–1 och vapnen som tappats (steg 3.7.8)
  hinder?: Hinder[]; // väggarna på platsen (steg 3.7.20)
  kampar: Kampe[]; logg: StridRad[];
  karta?: true; // striden sker på kartans rutor (steg 10.1.4, kartstrid.ts): x och y är kartans, och väggarna och vattnet är världens
  slut?: { t: number; vinnare: 0 | 1 | -1 };
  avgjord?: number; // när ena sidan inte längre hade någon som slåss (STRID.efterTid)
}
// en vägg på platsen: rektangeln x, y, b(redd), h(öjd) i rutor (steg 3.7.20)
export interface Hinder { x: number; y: number; b: number; h: number }
// uppställningen som en strid börjar ur (arenan och, senare, byn)
export interface Uppstallning { karta?: true; avsikt: Avsikt; w: number; h: number; vind?: number; dimma?: number; halt?: number; hinder?: Hinder[]; kampar: (Omit<Kampe, 'skador' | 'blod' | 'ork' | 'modNu' | 'lage' | 'vant' | 'mal' | 'backar' | 'slag' | 'traffar' | 'gjort' | 'skott' | 'haller' | 'vantar' | 'ifatt' | 'vada' | 'ligger' | 'bocker' | 'later' | 'kryper'> & { blod0?: number })[] } // blod0: blodet när striden börjar (1 om inget sägs)

// stridens egen slumpföljd (samma blandning som rnd i slump.ts)
export function slump(st: Strid) {
  let t = (st.r = (st.r + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// kämpens rad i registret KAMPAR (steg 10.1.2): djur = sorten, och den som inget säger är en människa
const sortAv = (k: { djur?: string }) => kampeSort(k.djur);
const kampeAv = (k: Uppstallning['kampar'][number]): Kampe => ({
  ...k, st: { ...k.st }, klader: [...k.klader], skador: [], blod: k.blod0 ?? 1, ork: 1, // den som redan blöder går in i striden med det blod hen har kvar
  modNu: clamp(STRID.modStart + (k.st.mod / 20) * STRID.modMod + (k.st.torst ?? 0) * STRID.torst, 0.05, 1), lage: 'strid', vant: 0, slag: 0, traffar: 0, gjort: 0,
});
export function nyStrid(u: Uppstallning, fro: number): Strid {
  const kampar: Kampe[] = u.kampar.map(kampeAv);
  const st: Strid = { avsikt: u.avsikt, t: 0, w: u.w, h: u.h, r: fro | 0, vind: u.vind ?? 0, dimma: u.dimma ?? 0, halt: u.halt ?? 0, marken: [], kampar, logg: [{ t: 0, h: 'borjar' }] };
  if (u.hinder?.length) st.hinder = u.hinder.map(o => ({ ...o }));
  if (u.karta) st.karta = true; // på kartans rutor (steg 10.1.4)
  if (!AVS[u.avsikt].vapen) for (const k of kampar) if (!sortAv(k).naturligt) { k.vapen = 'hand'; k.reserv = undefined; }
  for (const k of kampar) { const kv = VAP[k.vapen].kast; if (kv) k.skott = kv.skott; }
  for (const k of kampar) k.vant = slump(st) * VAP[k.vapen].takt; // ingen slår exakt samtidigt
  for (const k of kampar) if (k.ledare === 'fram' && sortAv(k).leder && !AVS[u.avsikt].lek) st.logg.push({ t: 0, h: 'leder', a: k.id });
  return st;
}

// ---------- kroppen i striden ----------
const smartaAv = (k: Kampe) => k.skador.reduce((a, w) => a + SKADOR[w.k].smarta * w.g, 0);
const delFel = (k: Kampe, d: Kroppsdel) => Math.min(1, k.skador.reduce((a, w) => a + (w.d === d ? SKADOR[w.k].fel * w.g : 0), 0));
const smidFart = (k: Kampe) => 1 + STRID.smidFart * (k.st.smidighet - 10); // den smidiga är snabbare (steg 3.7.6)
function rorlighet(k: Kampe) {
  let v = 0;
  for (const d of DELAR) v += ((KROPPSDELAR[d] as { rorlighet?: number }).rorlighet ?? 0) * delFel(k, d);
  return Math.max(HALSA.minst, 1 - v);
}
// den som har ett ben eller en fot så skadad att hen inte kan gå (HALSA.krypFel, som kanGa i halsa.ts; djuren haltar bara)
const kanGaK = (k: Kampe) => !sortAv(k).kryper || !GADELAR.some(d => delFel(k, d) >= HALSA.krypFel);
// den som inte kan gå kryper mot tryggheten (steg 3.7.19): till den närmaste vännen som står kvar, annars bort mot sin egen
// sida av platsen. Lika långsamt som i byn (GANG.krypFart, gang.ts)
function krypa(st: Strid, k: Kampe, dt: number) {
  let van: Kampe | undefined, vd = Infinity;
  for (const o of st.kampar) if (o.sida === k.sida && o !== k && iStrid(o) && dist(k, o) < vd) { vd = dist(k, o); van = o; }
  const x0 = k.x, y0 = k.y, lang = STRID.fart * k.fart * GANG.krypFart * dt;
  if (van) { if (vd > STRID.krypNara) ga(st, k, van.x, van.y, Math.min(lang, vd - STRID.krypNara)); }
  else if (k.fly) ga(st, k, k.fly.x, k.fly.y, lang); // på kartan: mot sin plats
  else ga(st, k, k.sida === 0 ? 0 : st.w, k.y, lang);
  k.kryper! += Math.hypot(k.x - x0, k.y - y0);
}
// den som kan slåss: står kvar i striden
const iStrid = (k: Kampe) => k.lage === 'strid';
const dist = (a: Kampe, b: Kampe) => Math.hypot(a.x - b.x, a.y - b.y);

// målet: den närmaste fienden som går att slå (den som ligger eller flyr bara om avsikten är att döda)
function valjMal(st: Strid, k: Kampe) {
  if (k.jagar !== undefined) { const m = st.kampar.find(o => o.pid === k.jagar && iStrid(o)); if (m) return m; }
  const nere = AVS[st.avsikt].nere;
  const led = k.skyddar !== undefined ? st.kampar.find(o => o.id === k.skyddar && iStrid(o)) : undefined;
  if (led) { // vännen går mot den som anfaller ledaren (steg 3.7.12)
    let hot: Kampe | undefined, hd: number = STRID.skyddVakt;
    for (const m of st.kampar) if (m.sida !== k.sida && iStrid(m) && m.mal === led.id && dist(m, led) <= hd) { hd = dist(m, led); hot = m; }
    if (hot) return hot;
  }
  let bast: Kampe | undefined, bd = Infinity;
  for (const m of st.kampar) {
    if (m.sida === k.sida || !(iStrid(m) || (nere && (m.lage === 'nere' || m.lage === 'flykt') && st.t - (m.fallT ?? st.t) < sortAv(k).forfoljer))) continue; // djuren förföljer inte (KAMPAR)
    const d = dist(k, m) + (m.lage === 'nere' ? 2 : 0) - (iStrid(m) && m.mal !== undefined && m.mal !== k.id ? STRID.ringa : 0); // den som står är farligare än den som ligger, och den som slåss med en annan är lättast (ringa in)
    if (d < bd) { bd = d; bast = m; }
  }
  return bast;
}

// ---------- vägen (steg 3.7.20) ----------
// man går inte igenom en fiende som står (närmare än STRID.kropp) eller en vägg, utan runt. Vänner och de som ligger går man
// igenom. Den som står i en dörröppning stänger den, så bara en kommer fram i taget
const KANT = 0.3; // så nära en vägg eller planens kant kommer man
// Världen striden sker i (steg 10.1.4, "En värld"): när striden stegas på kartan (kartstrid.ts) frågar den världen om väggar och
// vatten, och det som händer blir riktigt direkt: såret sätts på personen när slaget träffar (skada svarar om hen dog av det), och
// den som dör är död (fall). Utan värld (testarenan tills steg 10.1.6, och de äldre striderna) gäller platsens egna hinder
export interface StridVarld { vagg(x: number, y: number): boolean; skada?(k: Kampe, w: Kampe['skador'][number], av: Kampe): boolean; fall?(k: Kampe, h: KampeLage): void }
let varld: StridVarld | undefined;
export function iVarlden<T>(v: StridVarld, f: () => T): T { const forr = varld; varld = v; try { return f(); } finally { varld = forr; } }
const iVagg = (st: Strid, x: number, y: number) => varld ? varld.vagg(x, y) : !!st.hinder?.some(o => x > o.x - KANT && x < o.x + o.b + KANT && y > o.y - KANT && y < o.y + o.h + KANT);
// fiender som står i vägen för k (inte den hen går mot, som står vid mx, my)
const ivagen = (st: Strid, k: Kampe, mx: number, my: number) => st.kampar.filter(o => o.sida !== k.sida && iStrid(o) && Math.hypot(o.x - mx, o.y - my) > 0.01);
function fri(st: Strid, k: Kampe, x: number, y: number, fi: Kampe[]) {
  if (iVagg(st, x, y)) return false;
  for (const o of fi) { const d = Math.hypot(o.x - x, o.y - y); if (d < STRID.kropp && d < dist(k, o) - 1e-9) return false; } // bort från en som står för nära går alltid
  for (const o of st.kampar) { // en på samma sida som står eller flyr: man står inte i varandra (steg 9.2.78)
    if (o === k || o.sida !== k.sida || !(iStrid(o) || o.lage === 'flykt')) continue;
    const d = Math.hypot(o.x - x, o.y - y); if (d < STRID.van && d < dist(k, o) - 1e-9) return false;
  }
  return true;
}
// syns punkten bakom väggarna (en rak linje utan vägg)?
function sikt(st: Strid, x0: number, y0: number, x1: number, y1: number) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.25);
  for (let i = 1; i <= n; i++) if (iVagg(st, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false;
  return true;
}
// vägen runt väggarna (rutor om en halv ruta, bredden först): den sista punkten på vägen som syns härifrån. Fienderna som
// står i vägen räknas med om det finns en väg förbi dem; annars går man fram till dem och väntar
const RUT = 0.5;
function vagRunt(st: Strid, k: Kampe, mx: number, my: number, fi: Kampe[]): [number, number] | undefined {
  // på kartan söks vägen i ett fönster kring de två (STRID.runtUt rutor åt varje håll), inte över hela kartan
  const ut = STRID.runtUt, ox = st.karta ? Math.max(0, Math.floor(Math.min(k.x, mx) - ut)) : 0, oy = st.karta ? Math.max(0, Math.floor(Math.min(k.y, my) - ut)) : 0;
  const bw = st.karta ? Math.min(st.w, Math.ceil(Math.max(k.x, mx) + ut)) - ox : st.w, bh = st.karta ? Math.min(st.h, Math.ceil(Math.max(k.y, my) + ut)) - oy : st.h;
  const W = Math.ceil(bw / RUT), H = Math.ceil(bh / RUT), cell = (x: number, y: number) => clamp(Math.floor((y - oy) / RUT), 0, H - 1) * W + clamp(Math.floor((x - ox) / RUT), 0, W - 1);
  const mitt = (c: number): [number, number] => [ox + (c % W + 0.5) * RUT, oy + (Math.floor(c / W) + 0.5) * RUT];
  const fran = cell(k.x, k.y), till = cell(mx, my);
  for (const med of [fi, []]) {
    const prev = new Int32Array(W * H).fill(-1), ko = [fran];
    prev[fran] = fran;
    for (let i = 0; i < ko.length && prev[till] < 0; i++) {
      const c = ko[i], cx = c % W, cy = Math.floor(c / W);
      for (const [ex, ey] of GRANNAR4) {
        const nx = cx + ex, ny = cy + ey, n = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev[n] >= 0) continue;
        const [px, py] = mitt(n);
        if (n !== till && (iVagg(st, px, py) || med.some(o => Math.hypot(o.x - px, o.y - py) < STRID.kropp))) continue;
        prev[n] = c; ko.push(n);
      }
    }
    if (prev[till] < 0) continue;
    const vag: number[] = [];
    for (let c = till; c !== fran; c = prev[c]) vag.push(c);
    for (let i = 0; i < vag.length; i++) { const [px, py] = mitt(vag[i]); if (i === vag.length - 1 || sikt(st, k.x, k.y, px, py)) return i === 0 ? [mx, my] : [px, py]; }
  }
  return undefined;
}
const VRID = [0.6, -0.6, 1.2, -1.2, 1.8, -1.8]; // åt sidan, mer och mer, när den raka vägen är stängd
function ga(st: Strid, k: Kampe, mx: number, my: number, langd: number) {
  let dx = mx - k.x, dy = my - k.y, d = Math.hypot(dx, dy);
  if (d < 1e-6) return;
  const fi = ivagen(st, k, mx, my);
  if ((st.hinder || varld) && !sikt(st, k.x, k.y, mx, my)) { // bakom en vägg: mot nästa punkt på vägen runt
    const p = vagRunt(st, k, mx, my, fi);
    if (p) { dx = p[0] - k.x; dy = p[1] - k.y; d = Math.hypot(dx, dy); if (d < 1e-6) return; }
  }
  const l = Math.min(langd, d), x = clamp(k.x + dx / d * l, KANT, st.w - KANT), y = clamp(k.y + dy / d * l, KANT, st.h - KANT);
  if (fri(st, k, x, y, fi)) { k.x = x; k.y = y; return; }
  const v = Math.atan2(dy, dx);
  for (const r of VRID) {
    const nx = clamp(k.x + Math.cos(v + r) * l, KANT, st.w - KANT), ny = clamp(k.y + Math.sin(v + r) * l, KANT, st.h - KANT);
    if (fri(st, k, nx, ny, fi)) { k.x = nx; k.y = ny; return; }
  }
  // stängt åt alla håll: hen står kvar
}

// blödningen under striden (steg 9.5.18): den empatiske går till en vän som ligger och blöder när tiden kvar är kortare än det som
// är kvar av striden och ingen fiende står nära vännen, drar undan hen och trycker på såret, och går sedan tillbaka in i striden
const blodSek = (k: Kampe) => k.skador.reduce((a, w) => a + (w.ny ? SKADOR[w.k].blod * w.g * STRID.blodSek * (w.fast ? STRID.fastBlod : 1) : 0), 0);
function raddaSteg(st: Strid, k: Kampe, dt: number) {
  if (!sortAv(k).raddar || !k.hjalp && (k.emp ?? 0) < STRID.raddaEmp) return false; // hjälparna går alltid till den som fallit (steg 9.5.20)
  let v = k.raddar !== undefined ? st.kampar.find(o => o.id === k.raddar) : undefined;
  if (v && (v.lage !== 'nere' || !blodSek(v))) { k.raddar = undefined; v = undefined; }
  if (!v) {
    const kvar = STRID.maxTid - st.t;
    v = st.kampar.filter(o => o !== k && o.sida === k.sida && o.lage === 'nere' && blodSek(o) > 0 && (k.hjalp || (o.blod - HALSA.blodDod) / (blodSek(o) / STRID.tempo * STRID.tryckSjalv) < kvar) // hjälparen går till alla som fallit (steg 9.5.20)
      && !st.kampar.some(f => f.sida !== k.sida && iStrid(f) && dist(f, o) < STRID.raddaFri)).sort((a, b) => dist(k, a) - dist(k, b))[0];
    if (!v) return false;
    k.raddar = v.id; k.mal = undefined;
  }
  if (dist(k, v) > 1) { ga(st, k, v.x, v.y, farten(k) * dt); return true; }
  // drar undan hen från fienderna och trycker på såren: de slutar blöda i striden
  const f = st.kampar.filter(o => o.sida !== k.sida && iStrid(o)).sort((a, b) => dist(a, v) - dist(b, v))[0];
  if (f) { // drar undan hen, men aldrig in i en vägg eller ut i vattnet (på kartan, steg 10.1.4)
    const d = Math.max(0.01, dist(f, v)), nx = clamp(v.x + (v.x - f.x) / d * STRID.draUndan, 0.3, st.w - 0.3), ny = clamp(v.y + (v.y - f.y) / d * STRID.draUndan, 0.3, st.h - 0.3);
    if (!iVagg(st, nx, ny)) { v.x = nx; v.y = ny; }
    if (!iVagg(st, v.x, v.y)) { k.x = v.x; k.y = v.y; }
  }
  for (const w of v.skador) w.ny = 0;
  st.logg.push({ t: st.t, h: 'raddar', a: k.id, b: v.id });
  k.raddar = undefined;
  return true;
}
function falla(st: Strid, k: Kampe, h: 'nere' | 'dod' | 'ger' | 'flykt', rad: Handelse = h) {
  if (h === 'nere' || h === 'flykt') k.fallT ??= st.t; // när hen föll eller vände (hur länge en sort följer efter: KAMPAR.forfoljer)
  k.lage = h; k.mal = undefined; k.ligger = undefined; k.bocker = undefined;
  if (h === 'ger') for (const v of st.kampar) if (v.sida === k.sida && v !== k && iStrid(v)) v.modNu -= STRID.smitta; // varje bybo som gett upp sänker de andras mod (steg 8.8.8)
  st.logg.push({ t: st.t, h: rad, a: k.id });
  varld?.fall?.(k, h); // på kartan är den som dör död direkt (steg 10.1.4)
  // när en faller sjunker modet hos de andra på samma sida; i en flock också när en varg flyr svårt skadad (steg 3.7.1)
  if (h === 'nere' || h === 'dod' || (h === 'flykt' && sortAv(k).flock)) for (const v of st.kampar) if (v.sida === k.sida && v !== k && iStrid(v)) v.modNu -= STRID.modVan + (k.ledare ? STRID.ledFaller : 0) + (sortAv(k).flock ? STRID.flock : 0);
  if (k.ledare && (h === 'nere' || h === 'dod') && !AVS[st.avsikt].lek) st.logg.push({ t: st.t, h: 'ledareFaller', a: k.id }); // steg 3.7.12
}
// någon går emellan (steg 10.1.4): de som står slutar slåss, och striden tar slut utan vinnare
export function skilj(st: Strid) { for (const k of st.kampar) if (iStrid(k)) { k.lage = 'ger'; k.mal = undefined; st.logg.push({ t: st.t, h: 'skild', a: k.id }); } }
export const starKvar = (k: Kampe) => iStrid(k);

const orkAv = (a: Kampe) => { a.slag++; a.ork = Math.max(0, a.ork - STRID.orkSlag * (1 - (a.st.uthallighet - 10) / 40)); };
// ---------- slaget som händelse (steg 10.1.3) ----------
// hur ett anfall kan gå: raden som säger det är anfallets händelse. I parera och duck står försvararen först (a) och den som slog sedan (b)
const UTFALL = new Set<Handelse>(['traff', 'tog', 'miss', 'parera', 'duck', 'vada', 'knuff', 'omkull']);
// anfallet som just gjordes (raderna från n0) märks som en händelse med längden vant (stridens sekunder, gånger tempot = klockans)
function markSlag(st: Strid, n0: number, vant: number) {
  for (let i = n0; i < st.logg.length; i++) if (UTFALL.has(st.logg[i].h)) { st.logg[i].sl = 1; st.logg[i].l = Math.round(vant * STRID.tempo * 1000) / 1000; return; }
}
// ett anfall som händelse: när, hur länge, vem som anföll (fran) och vem det gällde (mot), vapnet, om det kastades och hur det gick
export interface SlagHandelse { t: number; l: number; fran: number; mot: number; v?: Vapen; kast?: 1; utfall: Handelse; rad: number }
export function slagen(st: Strid): SlagHandelse[] {
  const ut: SlagHandelse[] = [];
  st.logg.forEach((r, rad) => {
    if (!r.sl) return;
    const forsvar = r.h === 'parera' || r.h === 'duck';
    ut.push({ t: r.t, l: r.l ?? 0, fran: (forsvar ? r.b : r.a)!, mot: (forsvar ? r.a : r.b)!, v: forsvar ? undefined : r.v, kast: r.kast, utfall: r.h, rad });
  });
  return ut;
}
export const chansMot = (a: Kampe, b: Kampe, skick: number) => clamp((STRID.traffBas + (skick - b.st.skicklighet) * STRID.traffPer - (b.st.smidighet - 10) * STRID.smidUndan) * (1 - STRID.trott * (1 - a.ork)), STRID.traffMin, STRID.traffMax) * (b.lage === 'nere' || b.lage === 'flykt' || b.ligger || b.bocker ? STRID.utsatt : 1); // den som ligger, böjer sig ner eller vänt ryggen är lätt att träffa
const duckar = (st: Strid, b: Kampe) => !b.ligger && !b.bocker && slump(st) < STRID.duck * Math.max(0, 1 + STRID.duckSmid * (b.st.smidighet - 10)) * rorlighet(b) * b.ork * (b.klader.some(kladTung) ? 1 - STRID.duckTung : 1);
function slaEtt(st: Strid, a: Kampe, b: Kampe) {
  const v = VAP[a.vapen];
  if (b.ledare) { // en vän som står nära ledaren kliver emellan och tar slaget (steg 3.7.12)
    const f = st.kampar.find(o => o.skyddar === b.id && iStrid(o) && !o.ligger && !o.bocker && dist(o, b) <= STRID.skyddNara);
    if (f && slump(st) < STRID.skydd) { st.logg.push({ t: st.t, h: 'skyddar', a: f.id, b: b.id }); b = f; }
  }
  orkAv(a);
  // två mot en är farligt (steg 8.7.7): den inringade är lättare att träffa
  const omringad = st.kampar.filter(o => o.sida === a.sida && o !== a && iStrid(o) && o.mal === b.id).length;
  if (slump(st) >= Math.min(0.95, chansMot(a, b, a.st.skicklighet) * (1 + STRID.ringad * omringad))) { st.logg.push({ t: st.t, h: 'miss', a: a.id, b: b.id, v: a.vapen }); return; }
  if (b.skold && !b.ligger && slump(st) < STRID.skoldSlag) { st.logg.push({ t: st.t, h: 'parera', a: b.id, b: a.id, v: b.vapen }); return; } // skölden (steg 8.7.3)
  if (iStrid(b) && b.mal === a.id && !b.backar && !b.ligger && !b.bocker) { // försvaret: bara mot den man vänt sig mot (den inringade försvarar sig inte)
    const par = !sortAv(b).parerar ? 0 : (b.vapen === 'hand' ? STRID.pareraHand : STRID.parera) + (b.st.skicklighet - a.st.skicklighet) * STRID.pareraPer;
    if (par > 0 && slump(st) < par * b.ork) { // djuren parerar inte, de duckar (steg 3.7.1)
      st.logg.push({ t: st.t, h: 'parera', a: b.id, b: a.id, v: b.vapen }); return;
    }
    if (duckar(st, b)) { st.logg.push({ t: st.t, h: 'duck', a: b.id, b: a.id }); return; }
  }
  traffa(st, a, b, v.skada, a.vapen === 'bjornram' && (a.traffar % STRID.bjornBett) === STRID.bjornBett - 1 ? 'bett' : v.slag); // björnen biter vart tredje slag med käftarna, annars river den (steg 9.5.13)
}
// vännen som står i närstrid med målet m (för skytten a), om någon
const vanVid = (st: Strid, a: Kampe, m: Kampe) => st.kampar.find(f => f.sida === a.sida && f !== a && iStrid(f) && dist(f, m) <= STRID.vadaNara && (f.mal === m.id || m.mal === f.id));
// ett kast (steg 3.7.7): sämre på avstånd och i blåsten, och bara den som ser det komma (har kastaren som mål) duckar.
// Missen mot den som slåss med en vän kan träffa vännen
function kasta(st: Strid, a: Kampe, b: Kampe) {
  const v = VAP[a.vapen], kv = v.kast!, d = dist(a, b) / kv.rack;
  orkAv(a);
  a.skott = (a.skott ?? 1) - 1;
  const van = vanVid(st, a, b);
  const chans = chansMot(a, b, a.st.sikte ?? a.st.skicklighet) * (1 - STRID.langt * d) * (1 - STRID.vind * st.vind * d) * (1 - STRID.dimma * st.dimma * d);
  // skölden tar kast och pilar (steg 8.7.3), och ett träd, en vägg eller vattnet mellan dem är ett skydd: pilen träffar trädet hälften av gångerna (steg 8.7.7)
  const bakom = !!st.hinder?.length && !sikt(st, a.x, a.y, b.x, b.y) && slump(st) < STRID.bakomTrad;
  const stopp = (b.skold && !b.ligger && slump(st) < STRID.skoldPil) || bakom;
  if (stopp) { a.skott = a.skott ?? 0; st.logg.push({ t: st.t, h: 'miss', a: a.id, b: b.id, v: a.vapen, kast: 1 }); if (kv.reserv || !a.skott) byt(st, a); return; }
  const traff = slump(st) < chans && !(iStrid(b) && b.mal === a.id && duckar(st, b));
  if (!traff && van && slump(st) < STRID.vada) {
    a.vada = (a.vada ?? 0) + 1;
    st.logg.push({ t: st.t, h: 'vada', a: a.id, b: van.id, v: a.vapen });
    traffa(st, a, van, kv.skada, v.slag, true);
  } else if (traff) traffa(st, a, b, kv.skada, v.slag, true);
  else st.logg.push({ t: st.t, h: 'miss', a: a.id, b: b.id, v: a.vapen, kast: 1 });
  if (kv.reserv || !a.skott) byt(st, a); // spjutet är kastat: till reservvapnet (stenarna: den sista slår man med)
}
function byt(st: Strid, a: Kampe) {
  if (!VAP[a.vapen].kast?.reserv && a.skott === 0) { a.skott = undefined; return; } // den sista stenen har man kvar i handen
  const ny = a.reserv ?? 'hand';
  a.reserv = undefined; a.skott = undefined; a.haller = undefined; a.vapen = ny; a.vant = Math.max(a.vant, STRID.byta);
  st.logg.push({ t: st.t, h: 'byter', a: a.id, v: ny });
}
export const TRAFFDEL_PROV: { del?: Kroppsdel } = {};
// en träff av graden skada med slaget sl: kroppsdelen, kläderna, skadan och följderna
export function traffa(st: Strid, a: Kampe, b: Kampe, skada0: number, sl: Slag, kast?: true) {
  const kastad = kast ? VAP[a.vapen].kast : undefined;
  let x = slump(st);
  let d: Kroppsdel = 'bal';
  for (const del of DELAR) { x -= TRAFFDEL[del]!; if (x <= 0) { d = del; break; } }
  if (TRAFFDEL_PROV.del) d = TRAFFDEL_PROV.del; // scenarierna prövar en träff på en viss del
  let g = skada0 * (1 + (a.st.styrka - 10) * STRID.styrka) * (1 - STRID.slump / 2 + slump(st) * STRID.slump);
  let kl: string | undefined;
  for (const c of b.klader) { const sk = SKYDD[c]; if (sk?.delar.includes(d)) { g *= 1 - (sk.tar[sl] ?? 0); kl = c; } }
  g *= 1 - sortAv(b).skydd; // päls och hud (KAMPAR)
  if (AVS[st.avsikt].sport) g *= STRID.brottning; // brottningen: svaga slag (steg 9.2.92)
  g = Math.min(1, g);
  a.traffar++;
  const kf = kast ? 1 as const : undefined;
  if (g < STRID.ingen) { st.logg.push({ t: st.t, h: 'tog', a: a.id, b: b.id, d, v: a.vapen, kl, kast: kf }); return; }
  const k = skadaAv(sl, g, d);
  if (k === 'hjarnskakning') b.ork = Math.max(0, b.ork - STRID.hjarnaOrk);
  const fast = kastad?.fastnar && sl === 'stick' && g >= STRID.fastnaGrad && slump(st) < STRID.fastna ? 1 as const : undefined;
  // olyckshugget (steg 9.5.22): vapnets skärpa, slagets kraft och skyddet på delen
  const av = !AVS[st.avsikt].sport && !AVS[st.avsikt].lek && g >= STRID.huggMin && VAP[a.vapen].skarpa > 0 && slump(st) < VAP[a.vapen].skarpa * g * g * STRID.hugg * (kl ? STRID.skyddHugg : 1) && ((KROPPSDELAR[d] as { livsviktig?: true }).livsviktig || !!(KROPPSDELAR[d] as { ute?: true }).ute) ? 1 as const : undefined;
  b.skador.push({ d, k, g, ny: SKADOR[k].blod > 0 ? 1 : 0, fast, ...(av ? { av } : {}) });
  b.blod -= SKADOR[k].blod * g * STRID.blodSlag;
  const dogAvSaret = !!varld?.skada?.(b, b.skador[b.skador.length - 1], a); // på kartan sitter såret på personen direkt (steg 10.1.4)
  b.modNu -= STRID.modSkada * g * clamp(1 + STRID.modFeg * (10 - b.st.mod) / 10, 1 - STRID.modFeg, 1 + STRID.modFeg); // den modiga ger upp långsammare (steg 9.2.116)
  a.gjort += g;
  st.logg.push({ t: st.t, h: 'traff', a: a.id, b: b.id, d, k, g, v: a.vapen, kl, kast: kf });
  if (fast) st.logg.push({ t: st.t, h: 'fastnar', a: b.id, d, v: a.vapen });
  if (dogAvSaret) return falla(st, b, 'dod');
  if (iStrid(b) && d !== 'huvud' && d !== 'bal' && !d.startsWith('ben') && !d.startsWith('fot') && g >= STRID.tappaGrad && slump(st) < STRID.tappa) tappa(st, b); // en träff i armen eller handen
  if (av && (KROPPSDELAR[d] as { livsviktig?: true }).livsviktig) { st.logg.push({ t: st.t, h: 'hugg', a: a.id, b: b.id, d, v: a.vapen }); return falla(st, b, 'dod'); } // ett hugg mot huvudet eller bålen dödar (steg 9.5.22)
  if (av) { st.logg.push({ t: st.t, h: 'hugg', a: a.id, b: b.id, d, v: a.vapen }); b.blod -= SKADOR[k].blod * STRID.blodSlag; if (iStrid(b)) return falla(st, b, 'nere'); } // en arm, ett ben, en hand eller en fot huggs av
  if (!AVS[st.avsikt].sport && b.blod < HALSA.blodDod) return falla(st, b, 'dod'); // i brottningen dör ingen
  if (AVS[st.avsikt].lek && g >= STRID.lek) return falla(st, b, 'ger');
  if (b.lage === 'nere') return; // den som redan ligger
  if ((iStrid(b) || b.lage === 'flykt') && !kanGaK(b)) { b.kryper = 0; return falla(st, b, 'nere', 'kryper'); } // kan inte resa sig utan kryper undan (steg 3.7.19)
  if (smartaAv(b) >= STRID.nere) return falla(st, b, 'nere');
}

// knuffen (steg 3.7.8): ingen skada, men den kan fälla. Den som ser den komma kan kliva undan
function knuffa(st: Strid, a: Kampe, b: Kampe) {
  orkAv(a);
  if (iStrid(b) && b.mal === a.id && duckar(st, b)) { st.logg.push({ t: st.t, h: 'duck', a: b.id, b: a.id }); return; }
  const c = STRID.fallBas * Math.max(0.2, 1 + (a.st.styrka - b.st.styrka) * STRID.fallStyrka)
    * (1 + STRID.fallTrott * (1 - b.ork) + STRID.fallSkadad * (1 - rorlighet(b)) + STRID.fallTung * (b.tung ?? 0) + STRID.fallHalt * st.halt);
  if (slump(st) < c) omkull(st, b, a); else st.logg.push({ t: st.t, h: 'knuff', a: a.id, b: b.id });
}
// k faller omkull (knuffad av av, annars halkade hen) och kan tappa vapnet
function omkull(st: Strid, k: Kampe, av?: Kampe) {
  k.ligger = STRID.ligga * (2 - k.ork); k.bocker = undefined; k.haller = undefined; k.backar = undefined;
  st.logg.push(av ? { t: st.t, h: 'omkull', a: av.id, b: k.id } : { t: st.t, h: 'halkar', a: k.id });
  if (slump(st) < STRID.tappaFall) tappa(st, k);
}
// vapnet hamnar på marken (händerna och betten tappar man inte)
function tappa(st: Strid, k: Kampe) {
  if (sortAv(k).naturligt || k.vapen === 'hand') return; // ett djur tappar aldrig sina tänder eller käftar
  st.marken.push({ v: k.vapen, x: clamp(k.x + slump(st) - 0.5, 0.3, st.w - 0.3), y: clamp(k.y + slump(st) - 0.5, 0.3, st.h - 0.3), av: k.id });
  st.logg.push({ t: st.t, h: 'tappar', a: k.id, v: k.vapen });
  k.vapen = 'hand'; k.skott = undefined; k.haller = undefined;
}
// den som saknar vapen (när avsikten är vapen) tar reservvapnet eller hämtar ett vapen på marken. Returnerar true om
// kämpen gjort sitt i det här steget
function hamtaSteg(st: Strid, k: Kampe, dt: number): boolean {
  if (k.vapen !== 'hand' || sortAv(k).naturligt || !AVS[st.avsikt].vapen) return false;
  if (k.reserv) { byt(st, k); return true; }
  let g: Strid['marken'][number] | undefined, gd = STRID.hamta;
  for (const o of st.marken) { const d = Math.hypot(o.x - k.x, o.y - k.y); if (d <= gd) { gd = d; g = o; } }
  if (!g) return false;
  if (gd <= 0.6) k.bocker = STRID.plocka; else ga(st, k, g.x, g.y, farten(k) * dt);
  return true;
}
function plocka(st: Strid, k: Kampe) {
  let i = -1, bd = 0.8;
  st.marken.forEach((o, j) => { const d = Math.hypot(o.x - k.x, o.y - k.y); if (d <= bd) { bd = d; i = j; } });
  if (i < 0) return; // någon annan hann före
  const [o] = st.marken.splice(i, 1);
  k.vapen = o.v; k.skott = VAP[o.v].kast?.skott;
  st.logg.push({ t: st.t, h: 'plockar', a: k.id, b: o.av === k.id ? undefined : o.av, v: o.v });
}

// hotet (steg 3.7.9): kämpens styrka i striden, och stridsmodet med sidans styrka mot motståndarnas och de främstas mod
const kraft = (k: Kampe) => (k.st.styrka / 10) * (0.5 + VAP[k.vapen].skada) * (0.5 + 0.5 * k.ork) * Math.max(0.2, 1 - smartaAv(k)) * (k.ligger ? 0.5 : 1);
function hotet(st: Strid): { andel: [number, number]; framst: [number, number]; led: [number, number] } {
  const kr = [0, 0], fr: [number, number] = [0.5, 0.5], led: [number, number] = [0, 0];
  for (const k of st.kampar) if (k.ledare && iStrid(k)) led[k.sida] = Math.max(led[k.sida], k.ledare === 'fram' ? STRID.ledFram : STRID.ledBak); // ledaren som står kvar (steg 3.7.12)
  for (const k of st.kampar) if (iStrid(k)) kr[k.sida] += kraft(k);
  for (const sd of [0, 1] as const) {
    const egna = st.kampar.filter(k => k.sida === sd && iStrid(k)), fi = st.kampar.filter(k => k.sida !== sd && iStrid(k));
    if (!egna.length || !fi.length) continue;
    const nara = egna.map(k => ({ k, d: Math.min(...fi.map(f => dist(k, f))) })).sort((a, b) => a.d - b.d).slice(0, 2);
    fr[sd] = nara.reduce((a, x) => a + x.k.modNu, 0) / nara.length;
  }
  const sum = kr[0] + kr[1] || 1;
  return { andel: [kr[0] / sum, kr[1] / sum], framst: fr, led };
}
const modMed = (k: Kampe, h: ReturnType<typeof hotet>) => k.modNu + STRID.hot * (h.andel[k.sida] - 0.5) * 2 + STRID.framst * (h.framst[k.sida] - 0.5) + h.led[k.sida];

const farten = (k: Kampe) => STRID.fart * k.fart * smidFart(k) * rorlighet(k);
// den som kan kasta (steg 3.7.7): håller avståndet och kastar. Den som nåtts av en fiende backar om hen är snabbare, byter
// annars till reservvapnet eller slår med det hen har (och minns att hen saknade en reserv). Spjutet kastas bara av den som
// har ett reservvapen och mot den som är en bit bort. Returnerar true om kämpen gjort sitt i det här steget
function avstandSteg(st: Strid, k: Kampe, m: Kampe, d: number, dt: number): boolean {
  const kv = VAP[k.vapen].kast;
  if (!kv || !k.skott || (kv.reserv && !k.reserv)) return false;
  if (kv.reserv) { // spjutet: kastas när målet är på avstånd, annars sticker man med det
    // den som väntar på fritt läge går ändå fram och sticker med spjutet, och kastar om läget blir fritt (det är avsiktligt)
    if (d < STRID.kastMin || d > kv.rack || k.vant > 0) return false;
    return kastaMot(st, k, m);
  }
  let hot: Kampe | undefined, hd = Infinity;
  for (const o of st.kampar) if (o.sida !== k.sida && iStrid(o) && o.mal === k.id && dist(o, k) < hd) { hd = dist(o, k); hot = o; }
  if (hot && hd <= STRID.nara) {
    if (farten(k) > farten(hot)) { backaFran(st, k, hot, hd, dt); kastaMot(st, k, m, true); return true; }
    if (k.reserv) { byt(st, k); return true; }
    k.ifatt = true; k.haller = undefined;
    return false; // slår med stenen hen har
  }
  if (hot && hd < STRID.hall && farten(k) > farten(hot)) backaFran(st, k, hot, hd, dt);
  else if (d > kv.rack * 0.85) ga(st, k, m.x, m.y, Math.min(d - kv.rack * 0.8, farten(k) * dt));
  if (k.vant <= 0 && dist(k, m) <= kv.rack) kastaMot(st, k, m);
  return true;
}
function backaFran(st: Strid, k: Kampe, o: Kampe, d: number, dt: number) {
  if (!k.haller) { k.haller = true; st.logg.push({ t: st.t, h: 'avstand', a: k.id, b: o.id }); }
  const l = d || 1; ga(st, k, k.x - (o.x - k.x) / l * 3, k.y - (o.y - k.y) / l * 3, farten(k) * dt);
}
// kastet mot m, om läget är fritt: står målet i närstrid med en vän väntar den gode och lugne skytten eller byter mål,
// och den ovane eller rädde chansar. Returnerar true om hen kastade
function kastaMot(st: Strid, k: Kampe, m: Kampe, snabbt?: true): boolean {
  if (k.vant > 0) return false;
  const kv = VAP[k.vapen].kast!;
  let mal: Kampe | undefined = m;
  if (vanVid(st, k, m) && !snabbt && ((k.st.sikte ?? k.st.skicklighet) / 20) * 0.6 + k.modNu * 0.4 >= STRID.vanta) {
    mal = st.kampar.find(o => o.sida !== k.sida && iStrid(o) && dist(k, o) <= kv.rack && !vanVid(st, k, o));
    if (!mal) { if (!k.vantar) { k.vantar = true; st.logg.push({ t: st.t, h: 'vantar', a: k.id, b: m.id }); } k.vant = 0.4; return false; }
  }
  k.vantar = undefined; k.mal = mal.id;
  const n0 = st.logg.length;
  kasta(st, k, mal);
  if (k.vant <= 0) k.vant = VAP[k.vapen].takt * (1 - ((k.st.uthallighet - 10) / 20) * STRID.takt) * (0.85 + slump(st) * 0.3) + (VAP[k.vapen].kast ? 0.4 : 0); // att ta fram nästa sten
  markSlag(st, n0, k.vant);
  return true;
}

// ett tidssteg (STRID.tick sekunder på klockan, STRID.tick / STRID.tempo sekunder i striden)
export function stridSteg(st: Strid) {
  if (st.slut) return;
  const dt = STRID.tick / STRID.tempo, avs = AVS[st.avsikt];
  st.t += STRID.tick;
  const hot = hotet(st), slagits = st.logg.some(r => r.h === 'traff' || r.h === 'miss' || r.h === 'tog' || r.h === 'knuff' || r.h === 'omkull');
  for (const k of st.kampar) {
    if (k.lage === 'borta' || k.lage === 'dod') continue;
    // blodet rinner ur öppna sår, också hos den som ligger
    const tryck = k.lage === 'nere' && k.blod >= HALSA.svim ? STRID.tryckSjalv : 1; // den fallne trycker liggande på såret (steg 9.5.18)
    for (const w of k.skador) if (w.ny) k.blod -= SKADOR[w.k].blod * w.g * STRID.blodSek * dt * (w.fast ? STRID.fastBlod : 1) * tryck;
    // den som står kvar drar ut ett spjut som fastnat: det blöder mer (steg 3.7.7)
    if (iStrid(k)) for (const w of k.skador) if (w.fast && slump(st) < STRID.draUt * dt) { w.fast = undefined; k.blod -= SKADOR[w.k].blod * w.g * STRID.blodSlag * STRID.draBlod; st.logg.push({ t: st.t, h: 'drar', a: k.id, d: w.d }); }
    if (k.blod < HALSA.blodDod) { falla(st, k, 'dod'); continue; }
    if (k.blod < HALSA.slass && iStrid(k)) { falla(st, k, 'nere'); continue; } // den som förlorat mycket blod orkar inte slåss och faller ur striden (steg 9.5.17)
    if (k.lage === 'nere' && k.kryper !== undefined) { krypa(st, k, dt); continue; }
    if (k.lage === 'flykt') { // springer mot närmaste kanten och är borta när hen når den
      const lang = farten(k) * dt;
      if (k.fly) { // eller mot sin plats (hus eller eld), och har lämnat striden en bit bort från fienderna (steg 9.2.76)
        ga(st, k, k.fly.x, k.fly.y, lang);
        const fi = st.kampar.filter(o => o.sida !== k.sida && iStrid(o)), nara = fi.length ? Math.min(...fi.map(o => dist(k, o))) : Infinity;
        if (nara >= STRID.flyBort || Math.hypot(k.fly.x - k.x, k.fly.y - k.y) < 0.5 || Math.min(k.x, st.w - k.x, k.y, st.h - k.y) <= 0.31) { k.lage = 'borta'; st.logg.push({ t: st.t, h: 'borta', a: k.id }); }
        continue;
      }
      const ut = [k.x, st.w - k.x, k.y, st.h - k.y], i = ut.indexOf(Math.min(...ut));
      ga(st, k, i === 0 ? 0 : i === 1 ? st.w : k.x, i === 2 ? 0 : i === 3 ? st.h : k.y, lang);
      if (Math.min(k.x, st.w - k.x, k.y, st.h - k.y) <= 0.31) { k.lage = 'borta'; st.logg.push({ t: st.t, h: 'borta', a: k.id }); }
      continue;
    }
    if (!iStrid(k)) continue;
    const mod = avs.lek ? k.modNu : modMed(k, hot); // leken följer inte hotet
    if (!avs.lek && !slagits && sortAv(k).avstar && mod < STRID.avsta) { falla(st, k, avs.modSlut === 'fly' ? 'flykt' : 'ger', 'avstar'); continue; } // drar sig undan utan strid
    if (mod <= 0) { falla(st, k, avs.modSlut === 'fly' ? 'flykt' : 'ger'); continue; }
    k.ork = Math.min(1, k.ork + STRID.orkVila * dt);
    k.vant -= dt;
    // den som ligger reser sig, och den som böjt sig ner tar upp vapnet (steg 3.7.8)
    if (k.ligger) { k.ligger -= dt; if (k.ligger <= 0) { k.ligger = undefined; st.logg.push({ t: st.t, h: 'upp', a: k.id }); } continue; }
    if (k.bocker) { k.bocker -= dt; if (k.bocker <= 0) { k.bocker = undefined; plocka(st, k); } continue; }
    if (hamtaSteg(st, k, dt)) continue;
    if (raddaSteg(st, k, dt)) continue; // en blödande vän går före (steg 9.5.18)
    if (k.hjalp) { // hjälparen slåss inte: hen väntar på avstånd från fienderna (steg 9.5.20)
      const f = st.kampar.filter(o => o.sida !== k.sida && iStrid(o)).sort((a, b) => dist(a, k) - dist(b, k))[0];
      if (f && dist(f, k) < STRID.hjalpAvst) { const d = Math.max(0.01, dist(f, k)); ga(st, k, clamp(k.x + (k.x - f.x) / d * 2, 0.3, st.w - 0.3), clamp(k.y + (k.y - f.y) / d * 2, 0.3, st.h - 0.3), farten(k) * dt); }
      continue;
    }
    const m = valjMal(st, k);
    k.mal = m?.id;
    if (!m) continue;
    const v = VAP[k.vapen], d = dist(k, m);
    // den som är utmattad backar undan och hämtar andan medan en vän håller striden igång (steg 3.7.2)
    if (k.backar && k.ork >= STRID.backaTill && mod >= STRID.backaModTill) k.backar = undefined;
    else if (!k.backar && (k.ork < STRID.backa || (!avs.lek && mod < STRID.backaMod)) && st.kampar.some(o => o.sida === k.sida && o !== k && iStrid(o) && !o.backar)) { k.backar = true; st.logg.push({ t: st.t, h: 'backar', a: k.id }); }
    if (k.backar) { const l = d || 1, f = farten(k) * dt * 0.6; ga(st, k, k.x - (m.x - k.x) / l * 3, k.y - (m.y - k.y) / l * 3, f); continue; }
    if (avstandSteg(st, k, m, d, dt)) continue;
    if (k.ledare === 'bak' && !avs.lek && d > v.rack && st.kampar.some(o => o.sida === k.sida && o !== k && iStrid(o) && !o.backar)) continue; // ledaren står bakom och leder medan vännerna slåss (steg 3.7.12)
    if (d > v.rack) {
      ga(st, k, m.x, m.y, Math.min(d - v.rack * 0.9, farten(k) * dt));
      if (st.halt && slump(st) < STRID.halka * st.halt * dt) { omkull(st, k); continue; } // på hal mark
    }
    // den som ligger: i ett slagsmål låter den som inte är blodtörstig hen resa sig, de andra rusar fram (steg 3.7.8)
    if (m.ligger && !avs.nere && (avs.lek || (!avs.vapen && (k.st.torst ?? 0) < STRID.ruser))) {
      if (k.later !== m.id) { k.later = m.id; st.logg.push({ t: st.t, h: 'later', a: k.id, b: m.id }); }
      continue;
    }
    if (dist(k, m) <= v.rack && k.vant <= 0) { // den som just kom fram slår samma ögonblick
      const n0 = st.logg.length;
      if (!m.ligger && slump(st) < (k.vapen === 'hand' ? STRID.knuffHand : STRID.knuff)) knuffa(st, k, m); // eller knuffar
      else slaEtt(st, k, m);
      k.vant = v.takt * (1 - ((k.st.uthallighet - 10) / 20) * STRID.takt) * (0.85 + slump(st) * 0.3);
      markSlag(st, n0, k.vant);
    }
  }
  // striden pågår så länge båda sidor har någon som står, tills de som flyr har kommit undan och, om avsikten är att
  // döda, tills de som ligger är döda
  const kvar = [0, 1].map(sd => st.kampar.some(k => k.sida === sd && iStrid(k) && !k.hjalp)); // hjälparna slåss inte (steg 9.5.20)
  const ofardig = st.kampar.some(k => k.lage === 'flykt' || (avs.nere && k.lage === 'nere' && st.kampar.some(o => o.sida !== k.sida && iStrid(o) && !o.hjalp && st.t - (k.fallT ?? st.t) < sortAv(o).forfoljer)));
  if (kvar[0] && kvar[1]) st.avgjord = undefined; else st.avgjord ??= st.t; // när ena sidan inte längre har någon som slåss
  if ((!kvar[0] || !kvar[1]) && (!ofardig || st.t - (st.avgjord ?? st.t) >= STRID.efterTid) || st.t >= STRID.maxTid) {
    const vinnare = kvar[0] && !kvar[1] ? 0 : kvar[1] && !kvar[0] ? 1 : -1;
    st.slut = { t: st.t, vinnare };
    st.logg.push({ t: st.t, h: 'slut' });
  }
}
// hela striden till slutet
export function stridTillSlut(st: Strid, v?: StridVarld) { if (v) iVarlden(v, () => { while (!st.slut) stridSteg(st); }); else while (!st.slut) stridSteg(st); return st; }

// en kämpe kommer till en strid som pågår
export function laggTill(st: Strid, k: Uppstallning['kampar'][number]) {
  const n = kampeAv(k), kv = VAP[n.vapen].kast;
  if (!AVS[st.avsikt].vapen && !sortAv(n).naturligt) { n.vapen = 'hand'; n.reserv = undefined; }
  if (kv) n.skott = kv.skott;
  n.vant = slump(st) * VAP[n.vapen].takt;
  st.kampar.push(n); st.logg.push({ t: st.t, h: 'kommer', a: n.id });
}

// ---------- texten ----------
export const delNamn = (d: Kroppsdel) => KROPPSDELAR[d].i;
const namnOf = (st: Strid, id?: number) => st.kampar.find(k => k.id === id)?.namn ?? '?';
// hela meningen för en rad i loggen (syns när man trycker på raden eller håller musen över den)
export function stridText(st: Strid, r: StridRad): string {
  const a = namnOf(st, r.a), b = namnOf(st, r.b), v = r.v ? VAP[r.v] : undefined;
  const med = v && r.v !== 'hand' && r.v !== 'bett' && r.v !== 'vargbett' ? ` med ${v.namn.toLowerCase()}` : '';
  switch (r.h) {
    case 'borjar': return `Striden börjar: ${BORJAR[st.avsikt]}. ${AVS[st.avsikt].text}`;
    case 'miss': return r.kast ? `${a} kastar ${v?.namn.toLowerCase()} mot ${b} men missar.` : `${a} ${v?.ord ?? 'slår'} efter ${b}${med} men missar.`;
    case 'avstand': return `${a} backar undan från ${b} och håller avståndet.`;
    case 'raddar': return `${a} drar undan ${b} och trycker på såret.`;
    case 'hugg': return `${a} hugger av ${b}s ${KROPPSDELAR[r.d!].namn.toLowerCase()}${med}.`;
    case 'byter': return r.v === 'hand' ? `${a} har inget mer att kasta och slåss med händerna.` : `${a} tar ${v?.namn.toLowerCase()} ur bältet.`;
    case 'vantar': return `${a} väntar med kastet: ${b} slåss med en vän.`;
    case 'vada': return `${a} kastar ${v?.namn.toLowerCase()} men träffar sin vän ${b}.`;
    case 'fastnar': return `${v?.namn ?? 'Spjutet'} fastnar i ${delNamn(r.d!)} på ${a}.`;
    case 'drar': return `${a} drar ut spjutet ur ${delNamn(r.d!)}, och det blöder mer.`;
    case 'parera': return `${a} parerar slaget från ${b}${med}.`;
    case 'duck': return `${a} duckar undan slaget från ${b}.`;
    case 'backar': return `${a} drar sig bakom vännerna och hämtar andan.`;
    case 'tog': return `${a} ${r.kast ? 'träffar' : v?.ord ?? 'slår'} ${b} i ${delNamn(r.d!)}${med}, men ${sakNamn(r.kl ?? '').toLowerCase()} tar slaget.`;
    case 'traff': return `${a} ${r.kast ? 'kastar och träffar' : v?.ord ?? 'slår'} ${b} i ${delNamn(r.d!)}${med}: ${skadaOrd(SKADOR[r.k!].ett, r.g!)}${r.kl ? ` (${sakNamn(r.kl).toLowerCase()} tog en del)` : ''}.`;
    case 'knuff': return `${a} knuffar ${b}, men ${b} står kvar.`;
    case 'omkull': return `${a} knuffar omkull ${b}.`;
    case 'halkar': return `${a} halkar och faller omkull.`;
    case 'upp': return `${a} reser sig.`;
    case 'later': return `${a} låter ${b} resa sig.`;
    case 'tappar': return `${a} tappar ${v?.namn.toLowerCase()}.`;
    case 'plockar': return r.b !== undefined ? `${a} tar upp ${v?.namn.toLowerCase()} som ${b} tappade.` : `${a} tar upp ${v?.namn.toLowerCase()} igen.`;
    case 'nere': return `${a} faller och kan inte slåss längre.`;
    case 'kryper': return `${a} kan inte gå längre och kryper undan.`;
    case 'ger': return `${a} ger upp.`;
    case 'flykt': return `${a} vänder och flyr.`;
    case 'borta': return `${a} har flytt från platsen.`;
    case 'avstar': return `${a} vågar inte och drar sig undan utan strid.`;
    case 'skild': return `${a} slutar slåss när någon går emellan.`;
    case 'leder': { // byns ledare, eller rövarnas (steg 9.2.79)
      const k = st.kampar.find(q => q.id === r.a);
      return k?.pid !== undefined && !k.gast ? `${a} är byns ledare och går först. Det ger de andra mod.` : k?.sida === 1 && !k.djur ? `${a} leder rövarna och går först. Det ger de andra mod.` : `${a} leder och går först. Det ger de andra mod.`;
    }
    case 'kommer': return `${a} kommer springande och ger sig in i striden.`;
    case 'skyddar': return `${a} kliver emellan och tar slaget som var menat för ${b}, ledaren.`;
    case 'ledareFaller': return `Ledaren ${a} har fallit, och modet sjunker hos de andra.`;
    case 'dod': return `${a} dör.`;
    case 'slut': return st.slut?.vinnare === -1 ? 'Striden är slut utan att någon sida vann.' : `Striden är slut. ${sidaNamn(st, st.slut!.vinnare as 0 | 1)} vann.`;
  }
}
export const sidaNamn = (st: Strid, sd: 0 | 1) => { const n = st.kampar.filter(k => k.sida === sd).map(k => k.namn); return n.length <= 2 ? och(n) : `${n[0]} och ${tal(n.length - 1)} till`; };

// ---------- rapporten efter striden ----------
export const LAGE_ORD: Record<KampeLage, string> = { strid: 'står kvar', nere: 'ligger skadad', ger: 'gav upp', flykt: 'flydde', borta: 'flydde', dod: 'dog' };
export interface StridRapport {
  vinnare: 0 | 1 | -1; tid: number;
  sidor: { sida: 0 | 1; namn: string; folk: { id: number; namn: string; lage: KampeLage; skador: string[]; slag: number; traffar: number }[] }[];
  mest?: { id: number; namn: string; varfor: string };
}
export function stridRapport(st: Strid): StridRapport {
  const antal = new Map<number, number>(); for (const h of slagen(st)) antal.set(h.fran, (antal.get(h.fran) ?? 0) + 1); // slagen räknas ur händelserna (steg 10.1.3)
  const sidor = ([0, 1] as const).map(sd => ({
    sida: sd, namn: sidaNamn(st, sd),
    folk: st.kampar.filter(k => k.sida === sd).map(k => ({
      id: k.id, namn: k.namn, lage: k.lage, slag: antal.get(k.id) ?? 0, traffar: k.traffar,
      skador: k.skador.map(w => `${stor(skadaOrd(SKADOR[w.k].ett, w.g))} i ${delNamn(w.d)}`),
    })),
  }));
  let mest: Kampe | undefined;
  for (const k of st.kampar) if (k.gjort > 0 && (!mest || k.gjort > mest.gjort)) mest = k;
  return {
    vinnare: st.slut?.vinnare ?? -1, tid: st.slut?.t ?? st.t, sidor,
    mest: mest && { id: mest.id, namn: mest.namn, varfor: `${mest.traffar} träffar av ${mest.slag} slag` },
  };
}

// ---------- samma strid många gånger (arenan) ----------
export interface ManyResultat { n: number; vann: [number, number]; oavgjort: number; tid: number; slut: Record<KampeLage, number>; per: { id: number; namn: string; vann: number; dog: number; nere: number; traffar: number }[] }
export function korManga(u: Uppstallning, fro: number, n: number, v?: StridVarld): ManyResultat { // v = världen striden sker i (kartans väggar, steg 10.1.6)
  const res: ManyResultat = { n, vann: [0, 0], oavgjort: 0, tid: 0, slut: { strid: 0, nere: 0, ger: 0, flykt: 0, borta: 0, dod: 0 }, per: u.kampar.map(k => ({ id: k.id, namn: k.namn, vann: 0, dog: 0, nere: 0, traffar: 0 })) };
  for (let i = 0; i < n; i++) {
    const st = stridTillSlut(nyStrid(u, (fro + Math.imul(i + 1, 0x9e3779b9)) | 0), v);
    const w = st.slut!.vinnare;
    if (w === -1) res.oavgjort++; else res.vann[w]++;
    res.tid += st.slut!.t / n;
    st.kampar.forEach((k, j) => {
      if (k.lage !== 'strid') res.slut[k.lage]++;
      const p = res.per[j];
      if (k.sida === w) p.vann++;
      if (k.lage === 'dod') p.dog++;
      if (k.lage === 'nere') p.nere++;
      p.traffar += k.traffar / n;
    });
  }
  return res;
}

// ---------- kämpar ur byn och påhittade ----------
// en kämpe ur en person i byn: anlagen (åldern med), det bästa vapnet hen bär och kläderna. Skickligheten är färdigheten
// Närstrid (steg 3.7.2) och siktet Träffsäkerhet (steg 3.7.7); smidigheten och blodtörsten (steg 3.7.6). Reservvapnet
// (steg 3.7.7): ett litet vapen i bältet, om hen har ett bälte på sig och orkar bära det; den som en gång blev ifattsprungen
// utan reserv tar alltid med en
const TVA_HAND = new Set<string>(['flintspjut', 'fiskespjut', 'bage']); // med båda händerna: ingen sköld
// kläderna skyddar bara den som har dem på sig, också rustningen och hjälmen (steg 8.7.8)
export function personKampe(s: State, p: Person, id: number, sida: 0 | 1, x: number, y: number): Uppstallning['kampar'][number] {
  // det hen bär, äger och har i handen (man tar med sina saker), men inte det hen äger som någon annan har på sig, i handen
  // eller i bördan (samma regel som taVapen i vakt.ts)
  const egen = (t: { hos?: number; lass?: number; bar?: number }) => (t.hos === undefined || t.hos === p.id) && (t.lass === undefined || t.lass === p.id) && (t.bar === undefined || t.bar === p.id);
  const bar = [...new Set([...paSig(s, p), ...ownedBy(s, p).filter(egen), ...allaTing(s).filter(t => t.hos === p.id)].map(t => t.k))]; // också det en gäst bär (steg 10.1.8)
  const val = (v: Vapen) => VAP[v].skada * (1 + STRID.tyckeVal * smakAv(p, 'v:' + v)); // tycket drar i valet (steg 3.7.10)
  const ammoOk = (v: Vapen) => { const am = VAP[v].kast?.ammo; return !am || !!p.gast || amountOf(s, am) >= 1; }; // en gäst har sina egna pilar // bågen utan pilar och slungan utan stenar tas inte (steg 8.7.6)
  const vapen = MANNISKOVAPEN.filter(v => bar.includes(v) && ammoOk(v)).sort((a, b) => val(b) - val(a))[0] ?? 'hand';
  const res = (MANNISKOVAPEN.filter(v => v !== vapen && VAP[v].liten && bar.includes(v)) as Vapen[]).sort((a, b) => VAP[a].takt - VAP[b].takt)[0]; // den snabbaste (kniven)
  const reserv = res && (p.reservAlltid || (harBalte(s, p) && paSigVikt(s, p) + viktOf(res) <= capacity(s, p) * UTRUSTNING.kropp)) ? res : undefined;
  return {
    emp: stat(p, 'empati', s.now), id, namn: p.name, sida, pid: p.id, blod0: p.blod, vapen, reserv, ledare: ledareOf(s) === p ? ledarPlats(s, p) : p.gast?.ledare ? 'fram' : undefined, gast: p.gast ? 1 : undefined, skold: bar.includes('skold') && !TVA_HAND.has(vapen) ? true : undefined, klader: [...new Set(paSig(s, p).map(q => q.k))].filter(k => SKYDD[k]), fart: 1, x, y, tung: clamp(paSigVikt(s, p) / UTRUSTNING.kropp / Math.max(1, capacity(s, p)), 0, 1),
    st: { styrka: stat(p, 'styrka', s.now), uthallighet: stat(p, 'uthallighet', s.now), mod: stat(p, 'mod', s.now), smidighet: stat(p, 'smidighet', s.now) - paSig(s, p).reduce((a, q) => a + (PLAGG[kladAv(q.k)?.plagg as keyof typeof PLAGG]?.smid ?? 0), 0) - rusSmid(p), skicklighet: 5 + (p.skill.narstrid ?? 0) / 2 + STRID.tyckeSkick * smakAv(p, 'v:' + vapen) - rusTraff(p), sikte: (5 + (p.skill.traff ?? 0) / 2) * syn(p) * blodFaktor(p) - rusTraff(p), /* ruset (steg 9.6.14) */ torst: blodtorst(s, p) },
  };
}
// ledaren i strid (steg 3.7.12): en modig och aggressiv ledare går först, en försiktig står bakom och leder. Seden
// Samtal – Strid (9.2.3) drar åt samma håll när den finns, och byns försiktighet drar bakåt
export function ledarPlats(s: State, p: Person): 'fram' | 'bak' {
  const v = (stat(p, 'mod', s.now) - 10) / 10 + STRID.ledAggr * (stat(p, 'aggression', s.now) - 10) / 10
    + STRID.ledSed * ((s.seder.v as Record<string, number>).strid ?? 0) - STRID.ledVal * (s.seder.v.forsiktighet ?? 0);
  return v > 0 ? 'fram' : 'bak';
}
// ledarens följe: de på samma sida som står ledaren närmast skyddar hen (partner, bästa vän, eller tycker om hen minst skyddVan)
// (läser bara: arenan i gränssnittet ställer upp följet, så en relation som saknas skapas inte här)
export function foljet(s: State, kampar: Uppstallning['kampar']) {
  const led = kampar.find(k => k.ledare && k.pid !== undefined), l = led && byId(s, led.pid!);
  if (!led || !l) return;
  for (const k of kampar) {
    const p = k.pid !== undefined && k !== led && k.sida === led.sida ? byId(s, k.pid) : undefined;
    if (p && (p.partner === l.id || p.bast === l.id || (s.rels[relKey(p.id, l.id)]?.op ?? 0) >= STRID.skyddVan)) k.skyddar = led.id;
  }
}
// en kämpe ur en sort i registret KAMPAR (kampar.ts): kroppen, farten och det naturliga vapnet
export function djurKampe(art: string, id: number, sida: 0 | 1, x: number, y: number): Uppstallning['kampar'][number] {
  const d = djurStrid(art);
  return { id, namn: d.namn, sida, djur: art, st: { styrka: d.styrka, uthallighet: d.uthallighet, mod: d.mod, smidighet: d.smidighet, skicklighet: d.skicklighet }, vapen: d.vapen, klader: [], fart: d.fart, x, y };
}

// ---------- det kastade (steg 3.7.3) ----------
// det som kastas (i jakten och i all strid): det slits och kan försvinna
export const KAST = balans('kast', {
  slit: 0.1, // ett kast sliter en slumpad del av hållbarheten, upp till så här mycket ...
  borta: 0.01, // ... och det kastade försvinner med den här chansen ...
  hog: 2, skog: 2.5, sno: 2, vatten: 6, // ... gånger detta i högt gräs, i snår och skog, i snön (1 + sno × snön) och i vattnet ...
  langt: 1, // ... och gånger 1 + langt × kastets längd mot räckvidden
});

// det kastade vapnet v (från p, d rutor, landade vid x, y): slitaget och risken att det försvinner. r = slumpföljden.
// Svarar 'borta' eller 'trasig' när tinget är borta
export function kastat(s: State, p: Person, v: string, d: number, x: number, y: number, r: () => number): 'borta' | 'trasig' | undefined {
  const kv = VAP[v]?.kast;
  if (!kv || !toolsOf(s, v).length) return undefined; // stenarna är inga ting
  const i = tileOf(x, y), ms = markslag(groundOf(s), i);
  const f = (ms === 'hog' ? KAST.hog : ms === 'skog' || ms === 'ung' || ms === 'buske' ? KAST.skog : 1) * (1 + KAST.sno * snoPaMarken(s))
    * (getMap(s.seed).tiles[i] === T.Vatten ? KAST.vatten : 1) * (1 + KAST.langt * d / kv.rack);
  if (r() < KAST.borta * f) { wearTool(s, p, v, Infinity); count(s, 'kastBorta'); return 'borta'; }
  if (wearTool(s, p, v, r() * KAST.slit)) return 'trasig';
  // det som kastas blir ett ting på marken där det landade (steg 8.7.4); det ligger som allt annat utanför lagret och bärs in
  const t = toolsOf(s, v).find(q => q.agare === p.id && q.bar === undefined) ?? toolsOf(s, v)[0];
  if (t) { t.hos = undefined; t.lass = undefined; t.vid = undefined; t.x = Math.floor(x); t.y = Math.floor(y); count(s, 'kastLigger'); }
  return undefined;
}

// det kämpen k kastade i striden slits och kan ha försvunnit (steg 3.7.3). Varje kast har en rad med kast, också den som
// blev en vådaträff (vada-raden före är bara för berättelsen)
export function slitKastat(s: State, p: Person, st: Strid, k: Kampe) {
  if (k.skold) { const t = toolsOf(s, 'skold').find(q => q.agare === p.id) ; if (t) wearTool(s, p, 'skold', st.logg.filter(r => r.a === k.id && r.h === 'parera').length * 0.05); } // skölden slits (steg 8.7.3)
  let skott = 0;
  for (const r of st.logg) if (r.a === k.id && r.v && r.kast) { const am = VAP[r.v].kast!.ammo; if (am) { if (VAP[r.v].kast!.pil) skott++; continue; } kastat(s, p, r.v, VAP[r.v].kast!.rack / 2, p.x, p.y, () => rnd(s, 'strid')); }
  // en pil går sönder en gång av fyra, de andra plockas upp efteråt (steg 8.7.4)
  const trasiga = Math.floor(skott * STRID.pilSonder); if (trasiga && amountOf(s, 'pilar') >= trasiga) use(s, p, 'pilar', trasiga);
}

// ---------- striden i byn (steg 3.7.2) ----------
// Ett gräl kan bli ett slagsmål, och barn som leker brottas ibland. Striden räknas färdigt på en gång (stridTillSlut, med
// fröet ur byns följd 'strid'), så att den blir likadan i båda lägena; sedan står de som var med och slåss (handlingen
// strid) så länge striden tog, och under tiden väntar de andra behoven (Björn efter v144): ingen går på toa, äter eller
// dricker mitt i striden. Skadorna blir riktiga skador (halsa.ts), den som dog i striden dör, och den som vann ett
// slagsmål blir ett rykte (rykten.ts). De senaste striderna sparas i byn (s.strider) så att arenan kan visa dem igen
export const SLAGSMAL = balans('slagsmal', {
  rapporter: 60, // så många äldre strider sparas som rapport (steg 8.8.10)
  gral: 0.02, // (0,04 före steg 3.10.26: intrycket stark dominerade) chansen att ett gräl mellan två som är minst småbarn blir ett slagsmål ...
  gralTorst: 4, // ... gånger 1 + gralTorst × blodtörsten hos den som grälar (humor.ts)
  lek: 0.12, // chansen i timmen att ett barn som leker brottas med ett annat barn som leker nära ...
  lekNara: 3, // ... inom så här många rutor
  ovning: 0.15, // närstriden växer så här mycket efter en strid (ovning i folk.ts) ...
  ovningLek: 0.06, // ... och efter en lek
  kast: 0.03, // träffsäkerheten växer så här mycket per timme lek (kastlek med stenar och pinnar)
  jakt: 0.05, // ... och så här mycket per kanin man fångar
  op: 8, // relationen sjunker så här mycket efter ett slagsmål ...
  lekOp: 2, // ... och stiger så här mycket efter en lek
  vann: 0.15, forlora: 0.2, tankeTim: 8, // tanken efter att ha vunnit eller förlorat, och hur många timmar den varar
  minst: 20, // den som slåss står kvar minst så här många sekunder (striden tar tid också när den är kort)
});
// svårt skadad efter striden (krönikan, steg 3.7.16): föll av smärtan, eller en skada som är svår i personrutan (HALSA.avbryt)
export function svartSkadad(k: Kampe) { return k.lage === 'nere' || k.skador.some(w => w.g >= HALSA.avbryt); }

// blåsten, dimman och halkan (lera och snö, steg 3.7.8) i en strid i byn just nu
export function vadretIStriden(s: State): Pick<Uppstallning, 'vind' | 'dimma' | 'halt'> {
  const halt = clamp(Math.max(((s.vader?.fukt ?? 0) - STRID.leraFran) / (1 - STRID.leraFran), snoPaMarken(s) * STRID.snoHalt), 0, 1);
  return { vind: vaderNu(s).vind, dimma: vaderNu(s).dimma, halt };
}


// raden i loggen efter en strid i byn: den säger hur striden slutade (steg 6.7.5), så att loggen inte säger emot arenan.
// Den som gav sig av utan att någon slag tagit vågade inte slåss; annars gav upp, flydde eller vann
// (s.log); när någon vann eller ingen vann skrivs raden ur mallen l_slagsmal (steg 6.7.7)
export function stridRad(s: State, st: Strid, namn: (sd: 0 | 1) => string, orsak: string, ids: number[]) {
  const v = st.slut!.vinnare, slogs = `${namn(0)} och ${namn(1)} slogs (${orsak}).`;
  const mall = () => loggBer(s, 'l_slagsmal', ids[0] * 997 + (ids[1] ?? 0), { namn: namn(0), mot: namn(1), orsak, vinnare: v === -1 ? '' : namn(v as 0 | 1), ingen: v === -1 }, 'rel', ids);
  if (v === -1) return mall();
  const f = (1 - v) as 0 | 1, fk = st.kampar.filter(k => k.sida === f), bort = (k: Kampe) => k.lage === 'flykt' || k.lage === 'borta' || k.lage === 'ger';
  if (fk.every(bort) && st.kampar.every(k => !k.skador.length)) return log(s, `${namn(f)} vågade inte slåss med ${namn(v)} och drog sig undan (${orsak}).`, 'rel', ids);
  if (fk.every(k => k.lage === 'ger')) return log(s, `${slogs} ${namn(f)} gav upp.`, 'rel', ids);
  if (fk.every(k => k.lage === 'flykt' || k.lage === 'borta')) return log(s, `${slogs} ${namn(f)} flydde.`, 'rel', ids);
  return mall();
}

// det striden lämnar hos den som var med och lever (övningen, tycket för vapnet, krönikan, relationerna och tankarna). Såren, blodet
// och döden är redan på personen. mot = motståndarna, vanner = den egna sidan, person = kämpens person
export function efterStrid(s: State, st: Strid, k: Kampe, p: Person, mot: Person[], vanner: Person[], person: (o: Kampe) => Person | undefined, lek: boolean, vinnare: 0 | 1 | -1) {
  ovning(p, 'narstrid', lek ? SLAGSMAL.ovningLek : SLAGSMAL.ovning);
  // tycket för vapnet (steg 3.7.10): den som vann eller övade med det gillar det, en svår förlust ger ogillande
  const svar = k.lage === 'nere' || k.skador.reduce((a, w) => a + w.g, 0) >= STRID.tyckeSvar;
  if (svartSkadad(k)) { notis(s, 'strid', `${p.name} skadades svårt i ${lek ? 'en lek' : 'ett slagsmål'} med ${och(mot.map(q => q.name))}.`, [p.id, ...mot.map(q => q.id)], { x: Math.floor(p.x), y: Math.floor(p.y) }); kronikaBer(s, lek ? 'k_skadadLek' : 'k_skadad', p.id, { ...personFalt(p), mot: och(mot.map(q => q.name)) }); } // steg 3.7.16: döden skriver die
  if (lek) smaka(p, 'v:' + k.vapen, STRID.tyckeLek);
  else if (vinnare === k.sida) smaka(p, 'v:' + k.vapen, STRID.tyckeVann);
  else if (vinnare !== -1 && svar) smaka(p, 'v:' + k.vapen, -STRID.tyckeForlust);
  if (k.ifatt) p.reservAlltid = true; // ifattsprungen utan reserv: tar alltid med en sedan (steg 3.7.7)
  if (k.vada) { // vådaträffen: skytten minns det, och de som såg det tycker hen är en klåpare
    const offer = st.kampar.find(o => o.sida === k.sida && o !== k && st.logg.some(r => r.h === 'vada' && r.a === k.id && r.b === o.id));
    const q = offer && person(offer);
    if (q) { think(p, `Träffade ${q.name} av misstag`, -SLAGSMAL.forlora, s.now, SLAGSMAL.tankeTim * HOUR); handelse(s, p, 'vadaskott', q); }
  }
  if (!lek && (k.lage === 'flykt' || k.lage === 'borta' || st.logg.some(r => r.h === 'avstar' && r.a === k.id)) && mot[0]) handelse(s, p, 'backade', mot[0]); // steg 3.7.9
  for (const q of mot) { const r = getRel(s, p, q); r.op = Math.max(-100, Math.min(100, r.op + (lek ? SLAGSMAL.lekOp : -SLAGSMAL.op / 2))); } // båda hållen: op/2 var
  for (const q of mot) if (p.id < q.id) minnsRel(s, p, q, lek ? 'lek' : 'slag'); // det relationen minns, en gång per par (steg 3.9.6)
  if (!lek) for (const q of vanner) if (p.id < q.id) minnsRel(s, p, q, 'sida');
  if (!lek && vinnare !== -1) think(p, k.sida === vinnare ? `Vann slagsmålet mot ${mot[0].name}` : `Förlorade slagsmålet mot ${mot[0].name}`, k.sida === vinnare ? SLAGSMAL.vann : -SLAGSMAL.forlora, s.now, SLAGSMAL.tankeTim * HOUR);
}

import { rusSmid, rusTraff } from './rus';
