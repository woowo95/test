// Skriptet som låter Claude API:t rita delar till bestskaparen (bildstil/bestskapare.js).
//
//   node bildstil/api/bestar.mjs torrt [lager|lager:grupp …]    bygger frågorna utan att skicka dem och uppskattar kostnaden
//   node bildstil/api/bestar.mjs rita [lager|lager:grupp …]     ritar, kontrollerar, låter API:t granska bilderna och sparar
//   node bildstil/api/bestar.mjs granska [lager …]              bara granskningen av det som redan är sparat
//   --kommentar "…"                                             en kommentar från Björn som följer med frågorna
//
// API:t ritar inga färdiga bilder. Det ger former och mönster som data (samma sorts former som de handgjorda delarna
// är byggda av), och bestskaparen gör om dem till delar som skuggas och sitter ihop med resten. Två rundor:
//   1. ritningen: en fråga per lager (texturerna: en per textur, med versioner av den), med de handgjorda delarna som
//      kod och som bilder. Koden kontrollerar svaren och ritar varje del i besten.
//   2. granskningen: API:t ser sina delar ritade i besten (och felen koden hittat) och rättar dem.
// Det som klarar kontrollerna sparas i bildstil/bestar/<lager>.json, och bygg.cjs bakar in det i sidan. Där står de
// handgjorda delarna kvar; API:ts är nya delar, eller versioner av en handgjord (texturerna), som Björn väljer bland.
// Nyckeln läses ur BJORN_API_NYCKEL och skrivs aldrig ut, och frågorna går direkt till https://api.anthropic.com.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import Anthropic from '@anthropic-ai/sdk';

const HAR = path.dirname(fileURLToPath(import.meta.url)), BILDSTIL = path.resolve(HAR, '..');
const MAPP = path.join(BILDSTIL, 'bestar'), UT = path.join(HAR, 'ut', 'bestar');
const MODELL = 'claude-opus-5-5', INSATS = 'high', MAXTOKENS = 48000;
const PRIS = { in: 2, ut: 10, cacheLas: 0.1, cacheSkriv: 2.5 }; // per miljon tokens med batch
const KALLA = fs.readFileSync(path.join(BILDSTIL, 'bestskapare.js'), 'utf8');

// ---------- planen: hur många av varje lager ----------
// Det billiga (mönster och färger, några få tal) får fler; huvuden, ben och vingar, som är många former, färre.
// Texturerna får versioner av varje handgjord textur; de andra lagren får nya delar.
const PLAN = {
  textur: { namn: 'Textur', versioner: 3, kod: 'TEXTURER', over: { plattor: null }, farger: ['skog', 'aska'] },
  farg: { namn: 'Färger', antal: 12, kod: 'FARGER', over: { vingar: 'lader', pryd: 'tecken', hard: 'knolar', skal: null } },
  kropp: { namn: 'Kropp', antal: 12, kod: 'KROPPAR', over: {},
    // ett tema läggs till de andra delarna i lagret i stället för att ersätta dem: rita kropp:former
    teman: { former: { antal: 10, uppdrag: 'Rita 10 nya kroppsformer som inte är fyrbenta djur som de första: som Lindormen, Snäckbesten och Sköldpaddan (de sista handgjorda). Till exempel en spindel med fyra benpar, en tusenfoting med många benpar, en groda som sitter hopkrupen, en tvåbent best som går upprätt på bakbenen, en krabba med skal, en val eller säl som ålar sig fram, en mask eller igel, en jättefladdermus, en kentaur av två djur, en best som är en vandrande stubbe eller en hög med stenar. Varje form ska läsas på en blick i silhuett och vara helt olik de andra. Använd former, benpar, delar och utan fritt: en form som inte kan ha ben, svans eller vingar ska vara utan dem.' } } },
  horn: { namn: 'Horn', antal: 10, kod: 'HORN', over: { plattor: null } },
  svans: { namn: 'Svans', antal: 8, kod: 'SVANSAR', over: {} },
  huvud: { namn: 'Huvud', antal: 8, kod: 'HUVUDEN', over: {} },
  ogon: { namn: 'Ögon', antal: 8, kod: 'OGON', over: {} },
  ben: { namn: 'Ben', antal: 6, kod: 'BEN', over: {} },
  vingar: { namn: 'Vingar', antal: 6, kod: 'VINGAR', over: { plattor: null } },
  skal: { namn: 'Skal', antal: 6, kod: 'SKAL', over: { plattor: null } },
  plattor: { namn: 'Plattor', antal: 6, kod: 'PLATTOR', over: {} },
  hard: { namn: 'Förhårdnader', antal: 6, kod: 'HARDA', over: { plattor: null } },
  pryd: { namn: 'Prydnader', antal: 8, kod: 'PRYDNADER', over: { plattor: null } },
};

// källkoden för ett lagers handgjorda delar, som exempel för API:t
const kodFor = namn => { const a = KALLA.indexOf(`  const ${namn} = [`); const b = KALLA.indexOf('\n  ]', a), c = KALLA.indexOf('\n', b + 1); return a < 0 ? '' : KALLA.slice(a, c < 0 ? undefined : c); };

// ---------- sidan ----------
let webblasare = null, sida = null;
async function oppnaSidan() {
  if (sida) return sida;
  const pw = createRequire(import.meta.url)('playwright');
  const html = path.join(BILDSTIL, 'bildstil.html');
  if (!fs.existsSync(html)) throw new Error('Bygg sidan först: node bildstil/bygg.cjs');
  webblasare = await pw.chromium.launch(); sida = await webblasare.newPage();
  await sida.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await sida.setContent('<meta charset="utf-8">' + fs.readFileSync(html, 'utf8'), { waitUntil: 'load' }); // utan charset gissar Chromium ibland fel på filen await sida.waitForFunction(() => window.BESTAR?.prov);
  return sida;
}
const stangSidan = async () => { if (webblasare) await webblasare.close(); webblasare = sida = null; };
const bild = async (over, skala = 3) => (await oppnaSidan()).evaluate(([o, s]) => window.BESTAR.bild(o, s), [over, skala]);
const prov = async (lager, d, over, skala = 3) => (await oppnaSidan()).evaluate(([l, x, o, s]) => window.BESTAR.prov(l, x, o, s), [lager, d, over, skala]);
const handgjorda = async lager => (await oppnaSidan()).evaluate(l => window.BESTAR.LAGER.find(x => x.id === l).delar.filter(d => !d.api).map(d => ({ id: d.id, namn: d.namn, text: d.text })), lager);

// ---------- frågorna ----------
const bildBlock = b64 => ({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } });
const MATERIALTEXT = 'kropp (huden; texturen läggs på den), horn, skal, platta (ryggplattor), hard (förhårdnader och benpansar), man (manen), tecken (lysande tecken), hinna (vingens hud), fjader, oga, mun (munnen inuti), tand, klo, slem, mossa, kristall, glod (glöd), benrest (ben som syns i sår), hal (ett hål in i kroppen), flack (fläckar)';
const SYSTEM = `Du ritar delar till bestskaparen i bildstilen för spelet Samhällssimulatorn: en by av nordbor under järnåldern i pixelkonst, med en smutsig och dämpad mid century-palett. Besten är det legendariska odjuret som hotar byn. Den byggs av delar i lager (kropp, ben, huvud, horn, vingar, svans, textur, skal, plattor, förhårdnader, prydnader, färger) som spelaren kombinerar fritt, och den syns bara från sidan med huvudet åt höger (koden spegelvänder den).

Du ritar inte punkt för punkt. Du ger former och mönster som data, och koden ritar dem som de handgjorda delarna:
- Koden skuggar allt: ljus uppifrån och från vänster, skugga nedåt och åt höger, en mörk kolkontur runt varje del, och delarna på bortre sidan (ett ben, ett horn, en vinge) en ton mörkare. Rita aldrig egna skuggor eller konturer med formerna.
- Former: {"typ":"poly","pts":[[x,y],…]} (en månghörning, minst 3 punkter), {"typ":"kapsel","pts":[[x,y],…],"r":[radie per punkt]} (en rundad, böjd lem eller svans: varje punkt har sin radie och formen rundas mellan dem) och {"typ":"ell","c":[x,y],"r":[rx,ry]}. Punkterna räknas från delens fästpunkt (0,0) om inget annat sägs. x åt höger, y nedåt. Decimaler går bra.
- Mönster: {"rader":["..-+", …],"skift":n}: en ruta som upprepas över delen. = är två toner mörkare, - en mörkare, . oförändrad, + en ljusare, * två ljusare. Varje ny rad av rutor flyttas skift punkter åt höger (för tegel, fjäll och fjädrar). Mönstret läggs på skuggningen: varje material har fyra toner (0–3) och grundtonen är oftast 2, så + syns inte där det redan är ljust och = blir mörkast i skuggan. Rutan följer scenens punkter, inte formen, så den ligger likadant över hela kroppen.
- Material (färgen kommer från lagret Färger, som ger varje material en ramp och en grundton): ${MATERIALTEXT}.
- Paletten har åtta ramper med fyra toner från mörk (0) till ljus (3): kol (skugga, kol, konturer), jord (jord, läder, mörkt trä), senap (torrt gräs, halm, eld), rost (blod, kött, lera, bär), oliv (gräs, mossa, löv), barr (granar, mörk skog), skiffer (sten, vatten, järn), ben (ben, snö, glans).

Scenen är 136 × 99 punkter, 16 punkter per ruta. En människa (en ruta hög) står till höger om besten, så att storleken syns. Besten är 3–5 rutor lång. Marken där fötterna står är y = 74 i kroppens koordinater; bildens överkant är y = −15 (där finns plats för vingar och horn). Besten får inte gå längre åt höger än x = 116 (människan) eller ut över bildens vänsterkant (x = 1).

Pixelkonst i liten storlek: en punkt är den minsta detaljen, och en form som är smalare än två punkter försvinner nästan i konturen. Hellre en tydlig silhuett och stora, läsbara former än många små detaljer. Besten ska kännas tung, farlig och gammal, inte gullig.

Svara bara med JSON enligt schemat. Varje del har ett kort svenskt namn (ett eller två ord, stor bokstav först), en text på svenska som beskriver den i en mening, och data: delens data som en JSON-sträng i formatet nedan.`;

const FORMAT = {
  textur: `En textur är ytan på kroppen, halsen, käken, svansen och benen. Data:
{"monster": mönster för kroppen (rutan 2–16 punkter bred och hög),
 "ben": ett eget mönster för benen (valfritt, annars samma; benen är 5–14 punkter breda),
 "kanter": false (standard: mönstret hoppar över den översta och vänstra kantraden, som är ljus) eller true,
 "kant": "ingen" | "tofsar" (pälstofsar som sticker ut längs ryggen och hänger under magen) | "fransar" (korta fransar under magen) | "knolar" (knölar som bucklar ryggens kontur) | "trasig" (trasig kontur med hack) | "droppar" (slem som droppar från magen och käken),
 "pa": upp till 3 lager ovanpå texturen: [{"typ": "flackar" (runda fläckar i ett skakat rutnät) | "sprickor" (smala sprickor mellan kantiga block) | "rygg" (ett lager överst på ryggen, halsen och svansen, som mossa), "mat": material, "storlek": 3–16 (rutnätets sida, eller hur tjockt ryggens lager är), "tathet": 0–1 (hur stor del av rutorna som får en fläck eller spricka), "lyser": true om det lyser i mörkret, "kontur": true om lagret ska ha en mörk kontur, "tuvor": true om ryggens lager ska sticka upp i tuvor, "monster": ett mönster på lagret}]}`,
  farg: `Ett färgschema ger varje material en ramp och en grundton (0–3). Data: {"m": {"kropp": ["barr", 2], …}} med alla material: kropp, horn, skal, platta, hard, man, tecken, hinna, fjader, oga, mun, tand, klo, slem, mossa, kristall, glod, benrest, hal, flack. Kroppens grundton ska vara 1 eller 2 så att skuggningen och texturen (±1–2 toner) får plats. Ögat, tecknen och glöden lyser i mörkret och ska vara ljusa och mättade (senap, rost eller ben, ton 3). Munnen är mörk (rost 0), hålet rost 0, tänderna ljusa. Kontrasten mellan kroppen och delarna (horn, plattor, skal) ska göra dem tydliga. Varje schema ska vara ett eget djur i järnålderns nordiska värld (en mossig skogsbest, en grå klippbest, en blek likbest …) och alla ska vara olika.`,
  kropp: `En kropp bestämmer var allt annat sitter. Data (kroppens koordinater, utan fästpunkt):
{"bal": bålens kontur som en månghörning [[x,y],…] (10–20 punkter, runt, medurs),
 "nacke": [[x,y] där halsen börjar, [x,y] där den slutar och huvudet sitter], "nackeR": [halsens radie vid början, vid slutet] (5–10),
 "h": [x,y] höften där bakbenen börjar, "f": [x,y] bogen där frambenen börjar,
 "svans": [x,y] svansroten, "vinge": [x,y] vingens rot på ryggen,
 "lang": [x0, x1]: hur långt bak och fram skal och plattor räcker på ryggen}
Kroppsformer som inte är fyrbenta (ormar, sniglar, sköldpaddor, spindlar …) använder också:
 "former": [former] som läggs till bålen (en orms kropp som en lång kapsel i bågar; "bal" kan då utelämnas),
 "benpar": [[x, y, "bak" | "fram"], …] lederna där benen sitter, om det inte är två par vid h och f (en spindel har fyra par, en tvåbent best ett par; varje led ritas med ett ben på närmre och ett på bortre sidan),
 "delar": [{"former": [former], "mat": material (skal, hard, horn, kropp, mossa, kristall …), "z": "bak" (bakom kroppen) | "skal" (över kroppen, under benen och huvudet) | "ovan" (överst), "rygg": true om plattor ska stå på delen, "monster": mönster, "kontur": true/false, "lyser": true/false}] för kroppens egna delar (ett snäckskal, ett krabbskal, en stenhög på ryggen),
 "utan": [lager] som inte passar kroppen och inte ritas: ben, svans, vingar, horn, skal (om kroppen har ett eget), plattor, hard, pryd. h, f, svans och vinge ska ändå finnas, som fästpunkter för förhårdnader och prydnader.
Regler: marken är y = 74. h och f ligger inne i bålen, minst 12 punkter över marken (y ≤ 62) och 20–45 punkter isär. Huvudet sticker ut ungefär 24 punkter framför halsens slut, så halsen slutar vid x ≤ 92. Svansen går upp till 30 punkter bakåt från roten, så svansroten ligger vid x ≥ 33 och nära bålens bakre kant. Vingarna når 33 punkter upp från roten, så vingens rot ligger vid y ≥ 18, på ryggen. Bålens översta punkt y ≥ 10, och ingen del av kroppen går under y = 73. Halsen börjar inne i bålen. Benpar som inte är h och f ligger också minst 12 punkter över marken. Variera hållningen: hög och upprätt, låg och lång, puckelrygg, tung framdel, smal och seg, kort och massiv, lång hals, ingen hals …`,
  horn: `Horn sitter på huvudet vid fästpunkten (0,0), uppe på skallen. Huvudet tittar åt höger. Data: {"former": [former], "monster": mönster (valfritt, annars ringar)}. Ett andra horn ritas av koden på bortre sidan, 3 punkter längre fram och en ton mörkare. Storlek: högst 20 punkter brett och 18 högt (y från −18 till +3), roten 2–3,5 punkter tjock så att hornet sitter fast. Variera: grenade horn som en älg eller hjort, raka spjut, spiraler som en vädur, krokar framåt, många små taggar, ett enda horn på nosen …`,
  svans: `Svansen börjar vid svansroten (0,0) i bålens bakre kant och går bakåt (−x). Data: {"former": [former i kroppens material; den första ska vara 5–7 punkter tjock vid roten så att den växer ihop med kroppen], "spets": [x,y] svansens spets, "delar": [{"former": [former], "mat": material (hard, horn, klo, platta, man, fjader, tecken …), "kontur": true/false, "lyser": true/false, "monster": mönster}] för det som sitter på svansen: klubbor, gaddar, fenor, tofsar}. Svansen når högst 32 punkter bakåt och 30 uppåt. Roten ligger 44–60 punkter ner och marken vid y = 74, så svansen får gå högst 12 punkter ner från roten (y ≤ 12). Variera: krullad uppåt, tjock och kort, skorpionsgadd, solfjäder, kluven, tofs …`,
  huvud: `Huvudet sitter vid halsens slut (0,0) och tittar åt höger (+x). Data:
{"skalle": [former för skallen, i kroppens material; den ska täcka (0,0) med minst 6 punkters marginal så att den växer ihop med halsen],
 "delar": [{"former": [former], "mat": material (kropp för käken, mun för munnen inuti, tand, horn för en näbb, klo, hard …), "fore": true om delen ritas framför skallen (tänder, näbb), false bakom (munnen, käken), "kontur": true/false (tänder och mun utan kontur), "lyser": true/false, "monster": mönster}],
 "oga": [x,y] ögat (koden ritar ett lysande öga 2 punkter brett under ett mörkt ögonbryn), "horn": [x,y] där hornen sitter, uppe på skallen, "panna": [x,y] pannan (för benpansar), "nos": [x,y] nosens spets eller null}
Storlek: 18–28 punkter långt, x från −6 till +26, y från −12 till +12. Variera: krokodilgap, hammarhuvud, kort mops med underbett, hästhuvud, ödla med kam, betar som en vildsvin, en kägla av tänder, blind grottbest med stora käkar …`,
  ben: `Benen ritas fyra gånger (två fram, två bak; de bortre mörkare). Data:
{"fram": {"pts": [[dx, t], …], "r": [radie per punkt]}, "bak": {samma för bakbenen},
 "fot": [former för foten, från fotpunkten], "tar": [{"former": [former från fotpunkten], "mat": material (klo, kropp, hard, horn), "kontur": true/false}],
 "monster": mönster på benen (valfritt; . låter texturen synas)}
Den första punkten är [0, 0]: leden vid kroppen (höften eller bogen). dx är förskjutningen åt sidan i punkter; t är hur långt ner mot marken (0 vid leden, 1 vid marken). Leden ligger 12–30 punkter över marken, så t skalar med kroppen. Den sista punkten ska ha t ungefär 0,88–0,95; fotpunkten är rakt under den, på marken, och foten och tårna räknas därifrån med marken vid y = 0 (inget under 0). Radierna: låret 5–8, ner till 2–4. Den andra och tredje punkten är lederna (knä och vrist), där förhårdnader kan sitta. Bakbenen kan böjas annorlunda än frambenen. Variera: hovar, elefantfötter, fågelben med sporrar, insektsben, björntassar, simhud …`,
  vingar: `Vingen sitter vid vingens rot (0,0) på ryggen. Data: {"delar": [{"former": [former], "mat": material (hinna, kropp, fjader, klo, horn), "monster": mönster, "kontur": true/false}]} i ordningen bakifrån och fram. Vingen reser sig uppåt och bakåt: högst 34 punkter upp (y ≥ −34), högst 32 bakåt (x ≥ −32) och högst 8 framåt. Koden ritar den bortre vingen bakom besten, 5 punkter längre fram och 3 högre upp, en ton mörkare. Variera: trasiga läderhinnor, insektsvingar, stubbiga vingar, fenor, korpvinge, vingar av ben med hinnor emellan …`,
  skal: `Skalet ligger över ryggen. Data: {"typ": "band" (följer ryggens linje) | "kupol" (en välvd kupol över ryggen), "fran", "till": 0–1 (var på ryggen mellan lang[0] och lang[1] det börjar och slutar), "over": punkter ovanför ryggens linje (band), "under": punkter under (band och kupol), "hojd": kupolens höjd över ryggen, "monster": mönster för plattorna eller fogarna}. Variera: sköldpadda, bältdjur, en sadel av ben, fjällpansar, en ryggsköld som en skalbagge …`,
  plattor: `Plattor står i rad längs ryggen. Data: {"fran": "svans" (från svansen över ryggen och nacken) | "rygg" (bara på ryggen), "avstand": punkter mellan plattorna (2–12), "bredd": halva bredden i punkter, "hojd": [höjden vid ändarna, höjden mitt på], "form": plattans form som en månghörning i enhetspunkter [[u,v],…], där u går från −1 till 1 (gånger bredden) och v är 0 på ryggens linje, −1 i toppen (gånger höjden) och positivt in i kroppen (0,3–0,6 vid foten så att plattan sitter fast), "monster": mönster}. Variera: sågtänder, rundade fjäll, krokar bakåt, fenor, höga spjut, dubbla rader …`,
  ogon: `Ögonen sitter på huvudet vid ögats punkt (0,0), och huvudet tittar åt höger. Data: {"delar": [{"pkt": [[x,y], …] enskilda punkter, "former": [former] (valfritt, för större ögon), "mat": material (oga för det som lyser, kol (konturens svarta) för ögonbryn och hålor, tand för mjölkvita blinda ögon, kristall, glod …), "ton": tonändring (−9 ger materialets mörkaste ton), "lyser": true om det lyser i mörkret, "kontur": false (standard; ögon har sällan kontur)}]} i ordningen bakifrån och fram (det som ritas sist hamnar överst). Allt klipps till huvudet och kroppen. Huvudena är 18–28 punkter långa och ögat sitter 4–7 punkter under skallens överkant, så ögonen ska vara små: högst 6 punkter breda och 5 höga, från x −10 till +5 och y −4 till +3. De handgjorda ögonen är gjorda i samma form (koden ovan). Variera: ett enda stort öga, ögon som en get med tvärgående pupill, insektsögon, lysande ögon utan bryn, tårar av glöd, ögon som sitter i rad, ögon i en mask av ben, kristallögon …`,
  hard: `Förhårdnader är hårda delar (materialet hard) på huden. Data: {"delar": [{"ankare": fästpunkt, "former": [former från fästpunkten]}]}. Fästpunkterna: panna, oga (ögat), nos, hornet (där hornen sitter), nacke0 (halsens början), nacke1 (halsens slut), rygg (mitt på ryggen, överst), f (bogen), h (höften), vinge (vingens rot), svans (svansroten), spets (svansens spets), led (varje led på de främre benen, upprepas) och skena (varje skenben, upprepas). Variera: kranium av ben, armbågssporrar, knölar längs halsen, pansarplattor på bogen, horniga ögonbryn …`,
  pryd: `Prydnader sitter på besten. Data: {"delar": [{"ankare": fästpunkt (samma som förhårdnader: panna, oga, nos, hornet, nacke0, nacke1, rygg, f, h, vinge, svans, spets, led, skena), "former": [former från fästpunkten], "mat": material (man, tecken, hinna, fjader, horn, klo, hard, mossa, kristall, glod …), "lyser": true om den lyser i mörkret, "kontur": true/false, "inomKroppen": true om delen ska klippas till kroppen (tecken och ränder på huden), "bak": true om den ritas bakom kroppen (taggar och fenor som sticker upp bakom ryggen), "monster": mönster}]}. Variera: skägg, kam på huvudet, krigsmålning, runor som lyser, fjäderkrage, mossa och lavar som hänger, kedjor av ben, brinnande ränder …`,
};
const FARGNAMN = { skog: 'den gröna (skog och glöd)', aska: 'den svarta (aska och blod)' };

async function ritfraga(lager, grupp, kommentar, om = null, tema = null) {
  if (om) return omritfraga(lager, om, kommentar);
  const P = PLAN[lager], hg = await handgjorda(lager), bilder = [], text = [];
  if (lager === 'textur') {
    const g = hg.find(x => x.id === grupp);
    for (const f of P.farger) bilder.push(await bild({ ...P.over, textur: g.id, farg: f }));
    text.push(`Bilderna visar den handgjorda texturen "${g.namn}" (${g.text}) på ${P.farger.map(f => FARGNAMN[f]).join(' och ')} besten, tre gånger större än i bildstilen. Den är gjord med kod:`);
    const a = KALLA.indexOf(`{ id: '${g.id}'`), b = KALLA.indexOf("\n    { id: '", a + 5), slut = KALLA.indexOf('\n  ];', a);
    text.push(KALLA.slice(a, b > 0 && b < slut ? b : slut));
    text.push(FORMAT.textur);
    text.push(`Rita ${P.versioner} versioner av texturen "${g.namn}" (${g.text}), var och en på sitt eget sätt. De ska läsas tydligt som ${g.namn.toLowerCase()} på en blick, på både den gröna och den svarta besten (den svarta har låg kontrast, så mönstret behöver vara tydligt där också), och vara bättre än den handgjorda. Mönstret ska inte se ut som brus eller ett rutnät av prickar: det ska ha en riktning och en form (hårstrån bakåt, fjäll i rader, fjädrar som ligger på varandra, sprickor …). Namnen är "${g.namn}" följt av något kort som skiljer versionerna åt.`);
  } else {
    bilder.push(await bild(P.over));
    for (const h of hg) bilder.push(await bild({ ...P.over, [lager]: h.id }));
    text.push(`Den första bilden är besten som den står nu i bestskaparen, tre gånger större. Sedan kommer de handgjorda delarna i lagret ${P.namn}, en bild var: ${hg.map(h => `"${h.namn}" (${h.text})`).join(', ')}. De är gjorda med kod:`);
    text.push(kodFor(P.kod));
    text.push(FORMAT[lager]);
    if (tema) text.push(`${P.teman[tema].uppdrag} De ska se bra ut i bildstilen och fungera med de andra lagrens delar (de handgjorda) som de passar med.`);
    else text.push(`Rita ${P.antal} nya delar i lagret ${P.namn}, alla olika varandra och olika de handgjorda, så att spelaren får många att kombinera. De ska passa ihop med de andra lagrens delar (de handgjorda) och se bra ut i bildstilen.`);
  }
  if (kommentar) text.push(`Björns kommentar, som ska följas: ${kommentar}`);
  return { custom_id: lager === 'textur' ? `textur__${grupp}` : tema ? `${lager}__${tema}` : lager, lager, grupp, tema, params: { model: MODELL, max_tokens: MAXTOKENS, thinking: { type: 'adaptive' }, output_config: { effort: INSATS, format: { type: 'json_schema', schema: SCHEMA } },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: [...bilder.map(bildBlock), { type: 'text', text: text.join('\n\n') }] }] } };
}
// en enda del ritas om efter Björns kommentar: API:t ser delen som den är nu (texturerna på båda färgerna) och dess data
async function omritfraga(lager, om, kommentar) {
  const P = PLAN[lager], bilder = [], text = [];
  const { id, namn, text: t, grupp, forra, tema, ...data } = om;
  for (const f of (P.farger || [null])) { const r = await prov(lager, om, { ...P.over, ...(f ? { farg: f } : {}) }); if (r.png) bilder.push(r.png); }
  text.push(`${bilder.length > 1 ? 'Bilderna visar' : 'Bilden visar'} delen "${namn}" (${t}) i lagret ${P.namn}, ritad i besten tre gånger större${P.farger ? ` på ${P.farger.map(f => FARGNAMN[f]).join(' och ')} besten` : ''}. Dess data: ${JSON.stringify(data)}`);
  if (grupp && grupp !== id) {
    const a = KALLA.indexOf(`{ id: '${grupp}'`), b = KALLA.indexOf("\n    { id: '", a + 5), slut = KALLA.indexOf('\n  ];', a);
    text.push(`Den är en version av den handgjorda texturen, som är gjord med kod:\n${KALLA.slice(a, b > 0 && b < slut ? b : slut)}`);
  } else text.push(`De handgjorda delarna i lagret är gjorda med kod:\n${kodFor(P.kod)}`);
  text.push(FORMAT[lager]);
  text.push(`Björn har sett delen och skriver: ${kommentar}\nRita om delen efter kommentaren. Svara med en enda del (namnet får ändras om delen blir något annat).`);
  return { custom_id: `${lager}__om__${id}`, lager, grupp: grupp && grupp !== id ? grupp : null, tema, om, kommentar, params: { model: MODELL, max_tokens: MAXTOKENS, thinking: { type: 'adaptive' }, output_config: { effort: INSATS, format: { type: 'json_schema', schema: SCHEMA } },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: [...bilder.map(bildBlock), { type: 'text', text: text.join('\n\n') }] }] } };
}
const SCHEMA = { type: 'object', additionalProperties: false, required: ['delar', 'anteckning'], properties: {
  delar: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['namn', 'text', 'data'], properties: { namn: { type: 'string' }, text: { type: 'string' }, data: { type: 'string' } } } },
  anteckning: { type: 'string' } } };

// granskningen: API:t ser varje del ritad i besten (texturerna på båda färgerna) med felen koden hittat, och rättar dem
async function granskfraga(fraga, delar) {
  const P = PLAN[fraga.lager], bilder = [], text = [];
  text.push(`Du ritade de här delarna i lagret ${P.namn}. Bilderna visar dem ritade i besten, tre gånger större, i ordningen ${delar.map((d, i) => `${i + 1} "${d.namn}"`).join(', ')}${fraga.lager === 'textur' ? ` (varje textur på ${P.farger.map(f => FARGNAMN[f]).join(' och ')} besten)` : ''}.`);
  for (const [i, d] of delar.entries()) {
    for (const b of d.bilder) bilder.push(b);
    text.push(`${i + 1} "${d.namn}" (${d.text}): ${JSON.stringify(d.data)}${d.fel.length ? `\nKoden hittade: ${d.fel.join('; ')}` : ''}`);
  }
  text.push(FORMAT[fraga.lager]);
  text.push(`Titta på bilderna som en pixelkonstnär. Ser varje del ut som den ska, syns den tydligt, sitter den ihop med besten, och är delarna olika varandra? Svara med alla ${delar.length} delarna igen, i samma ordning, rättade där det behövs (det koden hittat måste rättas). En del som inte går att rädda får du byta mot en ny. Skriv i anteckningen kort vad du ändrade.`);
  return { custom_id: fraga.custom_id, params: { ...fraga.params, messages: [...fraga.params.messages, { role: 'assistant', content: [{ type: 'text', text: JSON.stringify({ delar: delar.map(d => ({ namn: d.namn, text: d.text, data: JSON.stringify(d.data) })), anteckning: '' }) }] },
    { role: 'user', content: [...bilder.map(bildBlock), { type: 'text', text: text.join('\n\n') }] }] } };
}

// ---------- koden kontrollerar varje del ----------
// den lägsta punkten i en form (för kroppar som ligger på marken)
const formBotten = s => !s ? -1e9 : s.typ === 'poly' ? Math.max(...(s.pts || []).map(p => p[1])) : s.typ === 'kapsel' ? Math.max(...(s.pts || []).map((p, i) => p[1] + (s.r?.[i] ?? 0))) : s.typ === 'ell' ? (s.c?.[1] ?? 0) + (s.r?.[1] ?? s.r?.[0] ?? 0) : -1e9;
const tal = v => typeof v === 'number' && Number.isFinite(v);
const pkt = p => Array.isArray(p) && p.length === 2 && tal(p[0]) && tal(p[1]);
function formFel(s, namn) {
  if (!s || typeof s !== 'object') return [`${namn}: ingen form`];
  if (s.typ === 'poly') return Array.isArray(s.pts) && s.pts.length >= 3 && s.pts.every(pkt) ? [] : [`${namn}: en poly behöver minst 3 punkter [x,y]`];
  if (s.typ === 'kapsel') return Array.isArray(s.pts) && s.pts.length >= 2 && s.pts.every(pkt) && Array.isArray(s.r) && s.r.length === s.pts.length && s.r.every(tal) ? [] : [`${namn}: en kapsel behöver minst 2 punkter och lika många radier`];
  if (s.typ === 'ell') return pkt(s.c) && Array.isArray(s.r) && s.r.every(tal) ? [] : [`${namn}: en ell behöver c [x,y] och r [rx,ry]`];
  return [`${namn}: okänd formtyp ${s.typ}`];
}
const formerFel = (f, namn) => (Array.isArray(f) && f.length ? f.flatMap((s, i) => formFel(s, `${namn} ${i + 1}`)) : [`${namn}: inga former`]);
const monsterFel = (m, namn) => (!m ? [] : !Array.isArray(m.rader) || !m.rader.length || m.rader.some(r => typeof r !== 'string' || !/^[=\-.+*]+$/.test(r)) ? [`${namn}: mönstrets rader får bara ha tecknen = - . + *`] : m.rader.length > 16 || m.rader.some(r => r.length > 16) ? [`${namn}: mönstret är större än 16 × 16`] : []);
const delarFel = (lista, namn, medAnkare) => (Array.isArray(lista) ? lista.flatMap((p, i) => [...formerFel(p.former, `${namn} ${i + 1}`), ...monsterFel(p.monster, `${namn} ${i + 1}`), ...(medAnkare && !FASTEN.includes(p.ankare) ? [`${namn} ${i + 1}: okänd fästpunkt ${p.ankare}`] : [])]) : [`${namn}: ingen lista`]);
const FASTEN = ['panna', 'oga', 'nos', 'hornet', 'nacke0', 'nacke1', 'rygg', 'f', 'h', 'vinge', 'svans', 'spets', 'led', 'skena'];
const RAMPER = ['kol', 'jord', 'senap', 'rost', 'oliv', 'barr', 'skiffer', 'ben'];
const MATERIAL = ['kropp', 'horn', 'skal', 'platta', 'hard', 'man', 'tecken', 'hinna', 'fjader', 'oga', 'mun', 'tand', 'klo', 'slem', 'mossa', 'kristall', 'glod', 'benrest', 'hal', 'flack'];
function datafel(lager, d) {
  const f = [];
  switch (lager) {
    case 'textur': f.push(...monsterFel(d.monster, 'monster'), ...monsterFel(d.ben, 'ben')); if (!d.monster) f.push('monster saknas'); (d.pa || []).forEach((o, i) => f.push(...monsterFel(o.monster, `pa ${i + 1}`))); break;
    case 'farg': for (const m of MATERIAL) { const v = d.m?.[m]; if (!Array.isArray(v) || !RAMPER.includes(v[0]) || ![0, 1, 2, 3].includes(v[1])) f.push(`materialet ${m} saknas eller har fel ramp/ton`); } break;
    case 'kropp': {
      if (d.bal !== undefined && (!Array.isArray(d.bal) || d.bal.length < 6 || !d.bal.every(pkt))) { f.push('bal behöver minst 6 punkter'); break; }
      if (!d.bal && !d.former) { f.push('bal eller former behövs'); break; }
      if (d.former) f.push(...formerFel(d.former, 'former'));
      if (d.delar) f.push(...delarFel(d.delar, 'delar'));
      const utan = new Set(d.utan || []);
      if (d.utan && (!Array.isArray(d.utan) || d.utan.some(l => !['ben', 'svans', 'vingar', 'horn', 'skal', 'plattor', 'hard', 'pryd'].includes(l)))) f.push('utan får bara innehålla ben, svans, vingar, horn, skal, plattor, hard och pryd');
      if (d.benpar && (!Array.isArray(d.benpar) || !d.benpar.every(b => Array.isArray(b) && pkt(b.slice(0, 2)) && ['bak', 'fram'].includes(b[2])))) f.push('benpar ska vara [[x, y, "bak" | "fram"], …]');
      else if (d.benpar && !utan.has('ben') && d.benpar.some(b => b[1] > 62)) f.push('ett benpar ligger för nära marken (y ≤ 62)');
      const botten = [...(d.bal || []).map(p => p[1]), ...[].concat(d.former || [], ...(d.delar || []).map(p => p.former || [])).map(formBotten)];
      if (Math.max(...botten) > 73.6) f.push(`kroppen går ner i marken (lägst y ${Math.max(...botten).toFixed(1)}, högst 73)`);
      for (const k of ['h', 'f', 'svans', 'vinge']) if (!pkt(d[k])) f.push(`${k} saknas`);
      if (!Array.isArray(d.nacke) || d.nacke.length !== 2 || !d.nacke.every(pkt) || !Array.isArray(d.nackeR) || d.nackeR.length !== 2) f.push('nacke och nackeR behöver två punkter och två radier');
      if (!Array.isArray(d.lang) || d.lang.length !== 2) f.push('lang behöver [x0, x1]');
      if (f.length) break;
      if (!utan.has('ben') && !d.benpar && (d.h[1] > 62 || d.f[1] > 62)) f.push(`höften och bogen måste ligga minst 12 punkter över marken (y ≤ 62; nu ${d.h[1]} och ${d.f[1]})`);
      if (!utan.has('ben') && !d.benpar && d.f[0] - d.h[0] < 18) f.push('bogen måste ligga minst 18 punkter framför höften');
      if (d.nacke[1][0] > 93) f.push(`halsen slutar för långt fram (x ${d.nacke[1][0]}, högst 92)`);
      if (!utan.has('svans') && d.svans[0] < 32) f.push(`svansroten ligger för långt bak (x ${d.svans[0]}, minst 33)`);
      if (!utan.has('vingar') && d.vinge[1] < 17) f.push(`vingens rot ligger för högt (y ${d.vinge[1]}, minst 18)`);
      if (d.bal && Math.min(...d.bal.map(p => p[1])) < 8) f.push('bålen går för högt upp');
      break;
    }
    case 'horn': f.push(...formerFel(d.former, 'former'), ...monsterFel(d.monster, 'monster')); break;
    case 'svans': f.push(...formerFel(d.former, 'former'), ...delarFel(d.delar || [], 'delar')); if (d.spets && !pkt(d.spets)) f.push('spets ska vara [x,y]'); break;
    case 'huvud': f.push(...formerFel(d.skalle, 'skalle'), ...delarFel(d.delar || [], 'delar')); for (const k of ['oga', 'horn', 'panna']) if (!pkt(d[k])) f.push(`${k} saknas`); if (d.nos && !pkt(d.nos)) f.push('nos ska vara [x,y] eller null'); break;
    case 'ben': for (const k of ['fram', 'bak']) { const L = d[k]; if (!L || !Array.isArray(L.pts) || L.pts.length < 2 || !L.pts.every(pkt) || !Array.isArray(L.r) || L.r.length !== L.pts.length) f.push(`${k}: minst 2 punkter [dx,t] och lika många radier`); else if (L.pts[L.pts.length - 1][1] < 0.8 || L.pts[L.pts.length - 1][1] > 1) f.push(`${k}: den sista punkten ska ha t 0,85–0,95`); }
      if (d.fot) f.push(...formerFel(d.fot, 'fot')); f.push(...delarFel(d.tar || [], 'tar'), ...monsterFel(d.monster, 'monster')); break;
    case 'vingar': f.push(...delarFel(d.delar, 'delar')); break;
    case 'skal': if (!['band', 'kupol'].includes(d.typ)) f.push('typ ska vara band eller kupol'); f.push(...monsterFel(d.monster, 'monster')); break;
    case 'plattor': if (!Array.isArray(d.form) || d.form.length < 3 || !d.form.every(pkt)) f.push('form behöver minst 3 punkter [u,v]'); if (!Array.isArray(d.hojd) || d.hojd.length !== 2) f.push('hojd ska vara [min, max]'); f.push(...monsterFel(d.monster, 'monster')); break;
    case 'ogon': if (!Array.isArray(d.delar) || !d.delar.length) f.push('delar saknas'); else d.delar.forEach((p, i) => { if (!(Array.isArray(p.pkt) && p.pkt.length && p.pkt.every(pkt)) && !p.former) f.push(`del ${i + 1}: pkt eller former saknas`); if (p.former) f.push(...formerFel(p.former, `del ${i + 1}`)); if (p.pkt?.some(q => Math.abs(q[0]) > 12 || Math.abs(q[1]) > 8)) f.push(`del ${i + 1}: punkter för långt från ögat`); }); break;
    case 'hard': f.push(...delarFel(d.delar, 'delar', true)); break;
    case 'pryd': f.push(...delarFel(d.delar, 'delar', true)); break;
  }
  return f.slice(0, 10);
}
// varje del läses, kontrolleras och ritas i besten (texturerna på båda färgerna)
async function provaDelar(fraga, svar) {
  const P = PLAN[fraga.lager], ut = [];
  for (const [i, s] of (svar.delar || []).entries()) {
    let data = null, fel = [];
    try { data = JSON.parse(s.data); } catch (e) { fel.push('data är inte JSON'); }
    const id = fraga.om ? fraga.om.id : fraga.lager === 'textur' ? `${fraga.grupp}-${i + 1}` : fraga.tema ? `${fraga.lager}-${fraga.tema}-${i + 1}` : `${fraga.lager}-${i + 1}`;
    const d = { ...(data || {}), id, namn: s.namn, text: s.text, ...(fraga.grupp ? { grupp: fraga.grupp } : {}), ...(fraga.tema ? { tema: fraga.tema } : {}), ...(fraga.om && fraga.kommentar ? { forra: fraga.kommentar } : {}) };
    if (data) fel.push(...datafel(fraga.lager, data));
    const bilder = [];
    if (data && !fel.length) for (const f of (P.farger || [null])) {
      const r = await prov(fraga.lager, d, { ...P.over, ...(f ? { farg: f } : {}) });
      fel.push(...r.fel); if (r.png) bilder.push(r.png);
    }
    ut.push({ namn: s.namn, text: s.text, data: data || s.data, d, fel: [...new Set(fel)], bilder });
  }
  return ut;
}

// ---------- API:t ----------
const ADRESS = 'https://api.anthropic.com';
function klient() {
  const nyckel = process.env.BJORN_API_NYCKEL;
  if (!nyckel) { console.error('BJORN_API_NYCKEL saknas i miljön.'); process.exit(1); }
  return new Anthropic({ apiKey: nyckel, baseURL: ADRESS });
}
const svarText = m => m.content.filter(b => b.type === 'text').map(b => b.text).join('');
const kostnad = u => ((u.input_tokens || 0) * PRIS.in + (u.output_tokens || 0) * PRIS.ut + (u.cache_read_input_tokens || 0) * PRIS.cacheLas + (u.cache_creation_input_tokens || 0) * PRIS.cacheSkriv) / 1e6;
async function batch(client, fragor, namn) {
  console.log(`Skickar ${fragor.length} frågor i en batch (${namn}) …`);
  const b = await client.messages.batches.create({ requests: fragor.map(f => ({ custom_id: f.custom_id, params: f.params })) });
  let st;
  for (;;) {
    st = await client.messages.batches.retrieve(b.id);
    if (st.processing_status === 'ended') break;
    console.log(`  ${namn}: ${st.request_counts.succeeded} klara, ${st.request_counts.processing} kvar …`);
    await new Promise(r => setTimeout(r, 30_000));
  }
  const ut = {}; let summa = 0;
  for await (const r of await client.messages.batches.results(b.id)) {
    if (r.result.type !== 'succeeded') { ut[r.custom_id] = { fel: `${r.result.type}${r.result.type === 'errored' ? ': ' + r.result.error?.error?.message : ''}` }; continue; }
    const m = r.result.message; summa += kostnad(m.usage);
    if (m.stop_reason === 'refusal') { ut[r.custom_id] = { fel: 'avböjd' }; continue; }
    if (m.stop_reason === 'max_tokens') { ut[r.custom_id] = { fel: 'svaret blev för långt' }; continue; }
    try { ut[r.custom_id] = { svar: JSON.parse(svarText(m)), usage: m.usage }; } catch (e) { ut[r.custom_id] = { fel: 'svaret var inte JSON' }; }
  }
  console.log(`  ${namn} klar: ungefär ${summa.toFixed(2)} dollar.`);
  return { ut, summa };
}

// ---------- att spara ----------
const lasFil = lager => { const f = path.join(MAPP, lager + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { lager, om: '', delar: [] }; };
function spara(lager, grupp, delar, anteckning, dollar, om = null, tema = null) {
  fs.mkdirSync(MAPP, { recursive: true });
  const o = lasFil(lager);
  // en ny körning ersätter det förra från samma fråga (texturerna: samma grupp)
  if (om) { const i = o.delar.findIndex(d => d.id === om.id); if (i >= 0 && delar[0]) o.delar[i] = delar[0]; }
  else o.delar = o.delar.filter(d => (lager === 'textur' ? d.grupp !== grupp : tema ? d.tema !== tema : !!d.tema)).concat(delar);
  o.om = 'Ritat av Claude API:t med bildstil/api/bestar.mjs: former och mönster som bestskaparen gör om till delar.';
  o.anteckningar = { ...(o.anteckningar || {}), [om ? om.id : grupp || (tema ? `${lager}:${tema}` : lager)]: anteckning };
  o.kostnad = +(((o.kostnad || 0) + dollar).toFixed(3));
  if (lager === 'textur') o.delar.sort((a, b) => a.id.localeCompare(b.id, 'sv', { numeric: true }));
  skrivFil(o);
}
function skrivFil(o) {
  const rad = d => '    ' + JSON.stringify(d);
  fs.writeFileSync(path.join(MAPP, o.lager + '.json'), `{\n  "lager": ${JSON.stringify(o.lager)},\n  "om": ${JSON.stringify(o.om)},\n  "kostnad": ${o.kostnad},\n  "anteckningar": ${JSON.stringify(o.anteckningar)},\n  "delar": [\n${o.delar.map(rad).join(',\n')}\n  ]\n}\n`);
}

// ---------- kostnaden ----------
// grovt: texten är ungefär ett token per 3,5 tecken och en bild bredd × höjd / 750; svaret med tänkandet ungefär
// 6 000 tokens plus 700 per del, och granskningen läser frågan, svaret och en bild per del och svarar lika långt
const BILD = Math.round((136 * 3) * (99 * 3) / 750);
function uppskatta(fragor) {
  let s = 0;
  for (const f of fragor) {
    const n = f.om ? 1 : f.tema ? PLAN[f.lager].teman[f.tema].antal : PLAN[f.lager].versioner || PLAN[f.lager].antal, bilder = f.params.messages[0].content.filter(c => c.type === 'image').length;
    const tin = Math.round((f.params.system[0].text.length + f.params.messages[0].content.filter(c => c.type === 'text').map(c => c.text).join('').length) / 3.5) + bilder * BILD;
    const tut = 6000 + 700 * n, granskIn = tin + 400 * n + n * (PLAN[f.lager].farger?.length || 1) * BILD;
    s += (tin * PRIS.in + tut * PRIS.ut + granskIn * PRIS.in + tut * PRIS.ut) / 1e6;
  }
  return { lag: s * 0.7, hog: s * 1.4, vantat: s };
}

// ---------- kommandona ----------
const argv = process.argv.slice(2), ki = argv.indexOf('--kommentar');
const kommentar = ki >= 0 ? argv.splice(ki, 2)[1] : null;
const [kommando, ...val] = argv;
const omlage = kommando === 'omrita' || (kommando === 'torrt' && val[0] === 'omrita' && val.shift());
async function fragorFor(val) {
  const fr = [];
  if (omlage) {
    // lager:id="kommentar" (eller --kommentar för alla)
    for (const v of val) {
      const e = v.indexOf('='), [lager, id] = (e >= 0 ? v.slice(0, e) : v).split(':'), k = e >= 0 ? v.slice(e + 1) : kommentar;
      if (!PLAN[lager]) throw new Error('Okänt lager: ' + lager);
      const om = lasFil(lager).delar.find(d => d.id === id);
      if (!om) throw new Error(`${lager}:${id} finns inte`);
      if (!k) throw new Error(`${lager}:${id} saknar kommentar`);
      fr.push(await ritfraga(lager, null, k, om));
    }
    return fr;
  }
  for (const v of (val.length ? val : Object.keys(PLAN))) {
    const [lager, grupp] = v.split(':');
    if (!PLAN[lager]) throw new Error('Okänt lager: ' + lager);
    if (lager === 'textur') { const g = grupp ? [grupp] : (await handgjorda('textur')).map(x => x.id); for (const x of g) fr.push(await ritfraga('textur', x, kommentar)); }
    else if (grupp) { if (!PLAN[lager].teman?.[grupp]) throw new Error(`Okänt tema: ${v}`); fr.push(await ritfraga(lager, null, kommentar, null, grupp)); }
    else fr.push(await ritfraga(lager, null, kommentar));
  }
  return fr;
}
try {
  if (kommando === 'torrt') {
    const fr = await fragorFor(val);
    fs.mkdirSync(UT, { recursive: true });
    fs.writeFileSync(path.join(UT, 'fragor.json'), JSON.stringify(fr.map(f => ({ id: f.custom_id, text: f.params.messages[0].content.filter(c => c.type === 'text').map(c => c.text), bilder: f.params.messages[0].content.filter(c => c.type === 'image').length })), null, 1));
    const u = uppskatta(fr);
    console.log(`${fr.length} frågor: ungefär ${u.lag.toFixed(2)}–${u.hog.toFixed(2)} dollar med batch (väntat ${u.vantat.toFixed(2)}). Frågorna står i ${path.relative(process.cwd(), path.join(UT, 'fragor.json'))}.`);
  } else if (kommando === 'rita' || kommando === 'omrita' || kommando === 'granska') {
    const client = klient(), fr = await fragorFor(val);
    const u = uppskatta(fr);
    console.log(`${fr.length} frågor, ungefär ${u.lag.toFixed(2)}–${u.hog.toFixed(2)} dollar.`);
    let svar = {}, summa = 0;
    if (kommando !== 'granska') { const r = await batch(client, fr, 'ritningen'); svar = r.ut; summa += r.summa; }
    else for (const f of fr) { const o = lasFil(f.lager), del = o.delar.filter(d => (f.lager === 'textur' ? d.grupp === f.grupp : (d.tema || null) === (f.tema || null))); svar[f.custom_id] = { svar: { delar: del.map(d => { const { id, namn, text, grupp, ...data } = d; return { namn, text, data: JSON.stringify(data) }; }) } }; }
    // granskningen
    const forsta = {}, granska = [];
    for (const f of fr) {
      const s = svar[f.custom_id];
      if (!s?.svar) { console.log(`${f.custom_id}: ${s?.fel || 'inget svar'}`); continue; }
      forsta[f.custom_id] = await provaDelar(f, s.svar);
      granska.push(await granskfraga(f, forsta[f.custom_id]));
    }
    const g = granska.length ? await batch(client, granska, 'granskningen') : { ut: {}, summa: 0 };
    summa += g.summa;
    fs.mkdirSync(path.join(HAR, 'logg'), { recursive: true });
    const rapport = [];
    for (const f of fr) {
      if (!forsta[f.custom_id]) continue;
      const s = g.ut[f.custom_id];
      const andra = s?.svar ? await provaDelar(f, s.svar) : [];
      // den granskade delen sparas om den klarar kontrollerna, annars den första om den gör det
      const valda = [];
      const n = Math.max(andra.length, forsta[f.custom_id].length);
      for (let i = 0; i < n; i++) {
        const a = andra[i], b = forsta[f.custom_id][i], v = a && !a.fel.length ? a : b && !b.fel.length ? b : null;
        rapport.push(`${f.custom_id} ${i + 1}: ${v ? `"${v.namn}"${v === a ? '' : ' (den första, granskningen hade fel)'}` : `bortvald: ${(a || b).fel.join('; ')}`}`);
        if (v) valda.push(v.d);
      }
      if (!f.om) valda.forEach((d, i) => { d.id = f.lager === 'textur' ? `${f.grupp}-${i + 1}` : f.tema ? `${f.lager}-${f.tema}-${i + 1}` : `${f.lager}-${i + 1}`; });
      else valda.splice(1);
      const per = summa / fr.length;
      spara(f.lager, f.grupp, valda, s?.svar?.anteckning || svar[f.custom_id]?.svar?.anteckning || '', per, f.om, f.tema);
    }
    console.log(rapport.join('\n'));
    console.log(`Det kostade ungefär ${summa.toFixed(2)} dollar. Bygg sidan igen: node bildstil/bygg.cjs`);
    fs.writeFileSync(path.join(HAR, 'logg', 'bestar-' + new Date().toISOString().slice(0, 19).replace(/:/g, '') + '.json'), JSON.stringify({ kommando, val, kommentar, modell: MODELL, uppskattat: { lag: +u.lag.toFixed(2), hog: +u.hog.toFixed(2) }, dollar: +summa.toFixed(3), rapport }, null, 1));
  } else if (kommando === 'ta-bort') {
    // delar Björn sagt nej till tas bort ur sin fil; de andra behåller sina id, så att svaren på dem gäller
    for (const v of val) {
      const [lager, id] = v.split(':'), o = lasFil(lager), n = o.delar.length;
      o.delar = o.delar.filter(d => d.id !== id);
      if (o.delar.length === n) { console.log(`${v}: finns inte`); continue; }
      skrivFil(o);
      console.log(`${v}: borttagen`);
    }
    console.log('Bygg sidan igen: node bildstil/bygg.cjs');
  } else {
    console.log('Skriv: node bildstil/api/bestar.mjs torrt|rita|granska [lager|lager:grupp …] [--kommentar "…"]');
    console.log('       node bildstil/api/bestar.mjs omrita lager:id="kommentar" …    ritar om delar efter Björns kommentarer');
    console.log('       node bildstil/api/bestar.mjs ta-bort lager:id …              tar bort delar Björn sagt nej till');
  }
} finally { await stangSidan(); }
