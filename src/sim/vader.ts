import { clamp, hash3 } from './slump';
import { HOUR, Person, State } from './typer';
import { hourOf, kalender, yearPos } from './tid';
import { balans } from './balans';
import { count, log } from './folk';
import { MOTGANG, hardGrader, motgangVid } from './motgang';
import { TORKA, torkaNu } from './torka';
import { FLOD, flodRegn } from './flod';
import { TORNADO, tornadoNu } from './tornado';

// Balanstal (regel 8): temperaturen och hur fort man kyls
export const VADER = balans('vader', {
  medel: [-10, 6, 16, 6], // medeltemperatur (grader) mitt i istid, vår, sommar, höst
  glidFran: 0.6, // efter så här stor del av en tidsålder glider temperaturen mot nästa ...
  glidSpann: 0.4, // ... under resten av den (så här stor del)
  sol: 4.5, // solen ger så här många grader över dygnet ...
  solTopp: 15, // ... varmast klockan så här mycket (eftermiddag), kallast tolv timmar senare
  // det slumpmässiga vädret är tre vågor: styrkan (grader) och perioden (timmar)
  vaderStor: 3,
  vaderStorTim: 31,
  vaderMellan: 2,
  vaderMellanTim: 79,
  vaderLiten: 1.2,
  vaderLitenTim: 7.3,
  kallFran: 6, // under så här många grader kyls man ...
  kallDiv: 70, // ... med (kallFran - temperaturen) / kallDiv av värmen per timme
  // väderläget (steg 2.11.1): fukten i luften är två långsamma vågor av slump ur byns frö (0 till 1)
  fuktTim: 16, fuktLitenTim: 5, // vågornas längd (timmar) ...
  fuktLiten: 0.35, // ... och hur mycket den korta väger
  regnFran: [0.62, 0.68, 0.72, 0.66], // över så här mycket fukt regnar eller snöar det, per tidsålder (istid, vår, sommar, höst) ...
  regnTak: 0.99, // regngränsen når aldrig 1 (torkan och sommaren tillsammans), då delar nederbörden med noll eller blir ständigt regn
  molnSpann: 0.15, // ... och så här långt under det är det mulet
  snoGrad: 1, // under så här många grader faller det snö i stället för regn
  vindTim: 9, // blåsten: vågens längd (timmar) ...
  blastFran: [0.62, 0.68, 0.75, 0.6], // ... och över så här mycket blåser det, per tidsålder
  askaTim: 1.5, askaFran: 0.8, askaGrad: 12, // åskan: en kort våg, över så här mycket i ett regn när det är varmare än askaGrad
  blixt: 0.15, // chansen per timme med åska att blixten slår ner
  dimmaTim: 5, // dimman (steg 3.7.11): vågens längd (timmar) ...
  dimmaFran: [0.75, 0.68, 0.8, 0.55], // ... och över så här mycket ligger det dimma på morgonen, per tidsålder (mest på hösten)
  dimmaMorgon: [4, 10], // dimman ligger tätast mellan de här timmarna ...
  dimmaDag: 0.55, // ... och vågen är så här mycket svagare resten av dygnet
  dimmaLage: 0.3, // över så här tät dimma är väderläget Dimma
  // vad vädret gör
  molnSol: 0.8, // molnen tar så här stor del av solens värme
  blotTakt: 2.5, // hur fort man blir blöt i regnet (del per timme vid det kraftigaste regnet) ...
  blotSno: 0.4, // ... i snön ...
  blotTrad: 0.5, // ... och under ett träd (gånger)
  torkarUte: 0.25, // så här mycket torkar man per timme ute när det inte regnar ...
  torkarInne: 0.6, // ... och inne eller vid elden
  blotGrader: 8, // den som är helt blöt fryser som om det var så här många grader kallare
  blotTanke: 0.5, // över så här blöt tänker man på det
  blastGrader: 5, // den som är ute i den hårdaste blåsten fryser som om det var så här många grader kallare
  regnEld: 0.5, // en eld ute brinner så här mycket fortare i det kraftigaste regnet
  fuktRegn: 0.2, // markens fukt stiger så här mycket per timme i det kraftigaste regnet ...
  fuktTorkar: 0.006, // ... och sjunker så här mycket per timme (mer när det är varmt)
  torrFukt: 0.05, // under så här mycket fukt är marken torr, och torrheten (timmar, torrTim) stiger en per timme ...
  torrBlot: 12, // ... och sjunker så här många per timme när marken är blöt (en skur fuktar inte skogen hela vägen ner) ...
  torrMax: 240, // ... men blir aldrig mer än så här många timmar (eldsvådorna i brand.ts, steg 3.8.5)
  slitRegn: 1, slitSno: 0.5, // husens väggar och det som ligger ute slits upp till så här mycket mer i det kraftigaste regnet och snöfallet (steg 2.11.2)
  vaxtTorr: 0.7, vaxtBlot: 1.3, // växterna och grödorna växer så här fort i torr och i blöt mark (gånger)
  snoFaller: 0.15, // snön på marken växer så här mycket per timme i det kraftigaste snöfallet ...
  snoSmalter: 0.01, // ... och smälter så här mycket per timme och grad över noll
});

// ---------- väder: temperatur ----------
// Temperaturen följer årstiden mjukt (varje tidsålder glider över i nästa), solen över dygnet
// och ett långsamt slumpmässigt väder. Den räknas fram ur tiden, så den behöver inte sparas.
export function temperature(s: State, t = s.now) {
  const c = yearPos(s, t); // var i året: 0 = istidens början
  const i = Math.floor(c), q = c - i;
  // under slutet av varje tidsålder glider temperaturen mot nästa
  const a = VADER.medel[i], b = VADER.medel[(i + 1) % 4], g = glid(q);
  const base = a + (b - a) * g - hardKyla(s, t, i, g); // en hård vinter är kallare (steg 3.8.1)
  const sun = VADER.sol * Math.cos((hourOf(t) - VADER.solTopp) / 24 * Math.PI * 2); // varmast mitt på eftermiddagen, kallast mitt i natten
  const p = s.seed * 0.618;
  const weather = VADER.vaderStor * Math.sin(t / (VADER.vaderStorTim * HOUR) * 2 * Math.PI + p) + VADER.vaderMellan * Math.sin(t / (VADER.vaderMellanTim * HOUR) * 2 * Math.PI + p * 3.1) + VADER.vaderLiten * Math.sin(t / (VADER.vaderLitenTim * HOUR) * 2 * Math.PI + p * 7.7);
  return base + sun + weather;
}
// hur långt temperaturen glidit mot nästa tidsålder (0–1), q = del av tidsåldern som gått
const glid = (q: number) => { const f = clamp((q - VADER.glidFran) / VADER.glidSpann, 0, 1); return f * f * (3 - 2 * f); };
// den hårda vintern (steg 3.8.1, motgang.ts): hur många grader kallare det är. Kylan glider in i slutet av hösten och ut
// i slutet av istiden, som temperaturen. i = tidsåldern, g = hur långt den glidit mot nästa
function hardKyla(s: State, t: number, i: number, g: number) {
  if (i !== 0 && i !== 3) return 0;
  const k = kalender(s, t), start = i === 0 ? k.start : k.slut;
  if (motgangVid(s, start, 0) !== 'hardVinter') return 0;
  return (i === 0 ? 1 - g : g) * hardGrader(s, start);
}
// hur mycket av en hård vinter som gäller just nu (0–1): elden äter mer ved och vargarna kommer oftare (eld.ts, varg.ts)
export function hardVinter(s: State, t = s.now) {
  const c = yearPos(s, t), i = Math.floor(c), g = glid(c - i);
  if (i !== 0 && i !== 3) return 0;
  const k = kalender(s, t), start = i === 0 ? k.start : k.slut;
  return motgangVid(s, start, 0) === 'hardVinter' ? (i === 0 ? 1 - g : g) : 0;
}
// hur fort man kyls ner utan eld, del av värmen per timme
export function coldOf(temp: number) { return Math.max(0, (VADER.kallFran - temp) / VADER.kallDiv); }

// ---------- väderläget (steg 2.11.1) ----------
// Vädret är klart, mulet, regn, snö, blåst eller åska. Det räknas ur tiden och byns frö precis som temperaturen, så det
// behöver inte sparas och spelet och ikappräkningen ger samma väder. Fukten i luften är två långsamma vågor av slump; över
// regnFran (efter tidsåldern: mest regn på våren och hösten, minst på sommaren) regnar det, eller snöar när det är kallt,
// och strax under är det mulet. Blåsten och åskan är egna vågor. Det som behöver minnas (fukten i marken och snön på
// marken) räknas varje timme i stepVader och står i s.vader.
// Vad vädret gör: regnet blöter den som är ute (p.blot), och den som är blöt fryser fortare; blåsten kyler den som är ute;
// molnen tar solens värme; regnet vattnar marken, så att växterna och grödorna växer fortare (vaxtFaktor); en eld ute
// brinner fortare i regnet; man söker tak när det regnar (val.ts); snön lägger sig på marken. Blixten slår ibland ner;
// bränderna den kan starta kommer i 3.8.2. Taken och slitaget av regn och snö är steg 2.11.2, och hur vädret syns 2.11.4.
// Dimman (steg 3.7.11) ligger oftast på morgonen och på hösten, aldrig när det blåser eller regnar: den gör det svårare att
// se långt (rykten.ts) och att träffa på avstånd (strid.ts). Anfallare som vill vara tysta väljer den (11.2.5).
export type VaderId = 'klart' | 'moln' | 'regn' | 'sno' | 'blast' | 'aska' | 'dimma';
export const VADERLAGE: Record<VaderId, { namn: string; ikon: string; text: string }> = {
  klart: { namn: 'Klart', ikon: '☀', text: 'Solen värmer den som är ute.' },
  moln: { namn: 'Mulet', ikon: '☁', text: 'Molnen tar solens värme.' },
  regn: { namn: 'Regn', ikon: '🌧', text: 'Regnet blöter den som är ute, så att den fryser fortare. Det vattnar marken, och elden ute brinner fortare.' },
  sno: { namn: 'Snö', ikon: '❄', text: 'Snön blöter lite och lägger sig på marken.' },
  blast: { namn: 'Blåst', ikon: '💨', text: 'Vinden kyler den som är ute.' },
  aska: { namn: 'Åska', ikon: '⛈', text: 'Ett kort oväder med regn. Ibland slår blixten ner.' },
  dimma: { namn: 'Dimma', ikon: '🌫', text: 'Man ser inte långt, och det är svårt att träffa på avstånd.' },
};
export interface Vader { lage: VaderId; moln: number; nb: number; sno: boolean; vind: number; aska: boolean; dimma: number }
export interface VaderMinne { fukt: number; sno: number; torr?: number } // torr = hur torr marken är, i timmar (torrTim, steg 3.8.5)

// en jämn slumpvåg ur byns frö: 0 till 1, som ändrar sig under ungefär `tim` timmar (hash3 i slump.ts: att byta den
// skulle ge alla byar ett annat väder)
const hash = hash3;
function vag(s: State, t: number, tim: number, salt: number) {
  const x = t / (tim * HOUR), k = Math.floor(x), f = x - k, g = f * f * (3 - 2 * f);
  const a = hash(s.seed, k, salt), b = hash(s.seed, k + 1, salt);
  return a + (b - a) * g;
}
const vaderCache = new WeakMap<State, { t: number; v: Vader }>();
// hur mycket det regnar eller snöar (0–1) vid fukten m och regngränsen g
export function regnMangd(m: number, g: number) {
  const r = Math.min(g, VADER.regnTak);
  return clamp((m - r) / (1 - r), 0, 1);
}

// vädret nu (eller vid tiden t)
export function vaderNu(s: State, t = s.now): Vader {
  const c = vaderCache.get(s);
  if (c && c.t === t) return c.v;
  const ai = kalender(s, t).ai;
  const m = (1 - VADER.fuktLiten) * vag(s, t, VADER.fuktTim, 1) + VADER.fuktLiten * vag(s, t, VADER.fuktLitenTim, 2);
  const g = VADER.regnFran[ai] - MOTGANG.hardSno * hardVinter(s, t) + (torkaNu(s, t) ? TORKA.regn : 0) - (flodRegn(s, t) ? FLOD.regn : 0), nb = regnMangd(m, g), moln = clamp((m - g + VADER.molnSpann) / VADER.molnSpann, 0, 1);
  const temp = temperature(s, t), sno = nb > 0 && temp < VADER.snoGrad;
  const vind = Math.max(tornadoNu(s, t) ? TORNADO.vind : 0, clamp((vag(s, t, VADER.vindTim, 3) - VADER.blastFran[ai]) / (1 - VADER.blastFran[ai]), 0, 1)); // det stormar medan tornadon drar fram (tornado.ts)
  const aska = nb > 0 && !sno && temp > VADER.askaGrad && vag(s, t, VADER.askaTim, 4) > VADER.askaFran;
  const h = hourOf(t), [m0, m1] = VADER.dimmaMorgon, df = VADER.dimmaFran[ai];
  const dimma = nb > 0 || vind > 0 ? 0 : clamp((vag(s, t, VADER.dimmaTim, 5) * (h >= m0 && h < m1 ? 1 : VADER.dimmaDag) - df) / (1 - df), 0, 1);
  const lage: VaderId = aska ? 'aska' : nb > 0 ? (sno ? 'sno' : 'regn') : vind > 0 ? 'blast' : dimma > VADER.dimmaLage ? 'dimma' : moln > 0.5 ? 'moln' : 'klart';
  const v = { lage, moln, nb, sno, vind, aska, dimma };
  vaderCache.set(s, { t, v });
  return v;
}
// regnar eller snöar det nu?
export const nederbord = (s: State) => vaderNu(s).nb > 0;
const minneOf = (s: State) => (s.vader ??= { fukt: 0.5, sno: 0 });
// hur fort växterna och grödorna växer efter fukten i marken (gånger)
export const vaxtFaktor = (s: State) => VADER.vaxtTorr + (VADER.vaxtBlot - VADER.vaxtTorr) * (s.vader?.fukt ?? 0.5);
// hur mycket mer det som är ute slits i regnet och snön (gånger; husens väggar och det som ligger ute, steg 2.11.2)
export const vaderSlit = (s: State) => { const v = vaderNu(s); return 1 + v.nb * (v.sno ? VADER.slitSno : VADER.slitRegn); };
// hur mycket snö som ligger på marken (0 till 1)
export const snoPaMarken = (s: State) => s.vader?.sno ?? 0;
// hur torr marken är, i timmar: en per torr timme, mindre när det regnat (eldsvådorna, brand.ts)
export const torrTim = (s: State) => s.vader?.torr ?? 0;
// slår blixten ner den här timmen? (loggen här och elden den kan tända, brand.ts)
export const blixtNu = (s: State) => vaderNu(s).aska && hash(s.seed, Math.floor(s.now / HOUR), 7) < VADER.blixt;

// varje timme (steg.ts): fukten och snön på marken, och blixten
export function stepVader(s: State) {
  const v = vaderNu(s), mi = minneOf(s), temp = temperature(s);
  mi.fukt = clamp(mi.fukt + (v.sno ? 0 : v.nb * VADER.fuktRegn) - VADER.fuktTorkar * (1 + Math.max(0, temp) / 10) * (torkaNu(s) ? TORKA.torkar : 1), 0, 1); // fortare under en torka (steg 3.8.2)
  mi.sno = clamp(mi.sno + (v.sno ? v.nb * VADER.snoFaller : 0) - Math.max(0, temp) * VADER.snoSmalter, 0, 1);
  mi.torr = mi.fukt > VADER.torrFukt ? Math.max(0, (mi.torr ?? 0) - VADER.torrBlot) : Math.min(VADER.torrMax, (mi.torr ?? 0) + 1);
  count(s, 'vader_' + v.lage);
  if (blixtNu(s)) {
    count(s, 'blixt');
    log(s, 'Blixten slog ner i skogen. Åskan mullrade länge efteråt.', 'world');
  }
}
// hur många grader kallare det känns för p, av vädret: blöt och i blåsten (bara ute)
export function vaderGrader(s: State, p: Person, ute: boolean) {
  return (p.blot ?? 0) * VADER.blotGrader + (ute ? vaderNu(s).vind * VADER.blastGrader : 0);
}
// p blir blöt ute i regnet och torkar inne, vid elden och när det inte regnar (dt timmar)
export function blotSteg(s: State, p: Person, ute: boolean, underTrad: boolean, vidElden: boolean, dt: number) {
  const v = vaderNu(s), b = p.blot ?? 0;
  let n = b;
  if (!ute || vidElden) n -= VADER.torkarInne * dt;
  else if (v.nb > 0) n += v.nb * VADER.blotTakt * (v.sno ? VADER.blotSno : 1) * (underTrad ? VADER.blotTrad : 1) * dt;
  else n -= VADER.torkarUte * dt;
  n = clamp(n, 0, 1);
  if (n > 0) p.blot = n; else if (b) delete p.blot;
}
