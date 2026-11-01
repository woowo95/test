import { clamp, gauss, pick, rnd } from './slump';
import { HOUR, Person, State } from './typer';
import { balans } from './balans';
import { ageOf, alive, count, isParent, living, log } from './folk';
import { UPPV, formas, upplev } from './uppvaxt';

// Religionen (fas 4.1, "Religion" i designdokumentet). Andligheten (steg 4.1.1.1) är en egenskap hos varje person, 0–100:
// hur viktigt det heliga är för hen, inte vad hen tror på. Den ärvs delvis och flyttas av upplevelserna (uppvaxt.ts, steg
// 4.1.1.3). Den finns från början men syns i gränssnittet först när den första tron finns.

// ---------- balanstal (regel 8) ----------
export const ANDE = balans('andlighet', {
  arv: 0.6, // så stor del av ett barns andlighet kommer från föräldrarnas snitt; resten är en egen dragning
  arvSlump: 8, // så mycket (gånger gauss) det ärvda ändras
  // upplevelserna som flyttar andligheten (steg 4.1.1.3, "Andlighetens riktning" i designdokumentet)
  riktning: 0.6, // chansen att den går uppåt är hälften plus så här mycket gånger (andligheten − 50) / 100: den troende ser ett tecken, den tvivlande en slump
  vuxen: 8, // så mycket en upplevelse flyttar andligheten hos en vuxen ...
  barn: 16, // ... och hos ett barn
});
export const TRO = balans('tro', {
  // den första tron (steg 4.1.2.1, "Den första tron" i designdokumentet)
  grunda: 70, // så andlig måste den vara som tolkar ett tecken till en egen tro ...
  grundaChans: 0.3, // ... och chansen att hen gör det när hen är med om tecknet
  styrka: 60, // så stark är tron hos den som grundar den (0–100)
  bekrafta: 10, // ett nytt tecken gör tron så här mycket starkare hos den som redan tror
  drom: 0.004, // chansen per sovtimme att någon drömmer något hen inte kan förklara (bara den mycket andliga tolkar det)
  samma: 24, // den som var med om samma sak inom så här många timmar efter att någon tolkade den delar den tron
  skalaSlump: 15, // så mycket (gånger gauss) en ny tros skalor skiljer sig från tecknets
});

// en ny persons andlighet: grundarna och de som flyttar in slumpas jämnt över 0–100, ett barn får en del av föräldrarnas
// snitt. Drar ur personens egen följd 'tro', så att inget annat ändras
export function nyAndlighet(s: State, p: Person, mother?: Person, father?: Person) {
  const egen = rnd(s, 'tro', p) * 100;
  if (!mother || !father) return Math.round(egen);
  const snitt = (andlighet(s, mother) + andlighet(s, father)) / 2;
  return Math.round(clamp(ANDE.arv * snitt + (1 - ANDE.arv) * egen + gauss(s, 'tro', p) * ANDE.arvSlump, 0, 100));
}
// andligheten: den man föddes med (alla har en: en äldre sparfil får den i migrate, varld.ts) plus det upplevelserna flyttat
// (u.n, steg 4.1.1.3), inom 0–100
export function andlighet(_s: State, p: Person) {
  let v = p.andlig ?? 50;
  for (const u of p.upp ?? []) v += u.n ?? 0;
  return clamp(v, 0, 100);
}
// åt vilket håll och hur mycket en upplevelse flyttar p:s andlighet (uppvaxt.ts upplev): uppåt med chansen hälften plus
// ANDE.riktning gånger hur andlig hen redan är. Om tron hjälpte kommer med bönen (steg 10.1). Drar ur personens följd 'tro'
export function andeRiktning(s: State, p: Person, vuxen: boolean) {
  const upp = rnd(s, 'tro', p) < 0.5 + ANDE.riktning * (andlighet(s, p) - 50) / 100;
  return (upp ? 1 : -1) * (vuxen ? ANDE.vuxen : ANDE.barn);
}
// andligheten syns i gränssnittet först när den första tron finns (steg 4.1.2.1)
export const andligSyns = (s: State) => !!s.tron?.length;

// ---------- tecknen (registret) ----------
// det oförklarliga som kan bli en tro (steg 4.1.2.1). text: vad hen var med om ({om} = vem eller vad), natur: var tron börjar på
// skalan Natur – Människa (0 = andar i djur, väder och platser, 100 = förfäder och helgon). bakom, vill och svek: tolkningen,
// en av varje slumpas: vem eller vad som står bakom, vad den vill och vad som händer om man sviker den
interface TeckenDef { text: string; natur: number; bakom: string[]; vill: string[]; svek: string[] }
export const TECKEN = {
  blixt: { text: 'blixten som slog ner', natur: 15,
    bakom: ['Den som bor i åskmolnen', 'Himlens hammare', 'Den stora fågeln vars vingar dånar'],
    vill: ['att man tystnar när det mullrar', 'en bit av varje byte på den höga stenen', 'att elden i byn aldrig får slockna'],
    svek: ['blixten slår ner i ens hus', 'skogen brinner', 'barnen blir döva'] },
  brand: { text: 'elden som spred sig i skogen', natur: 20,
    bakom: ['Den röda som äter skogen', 'Eldens moder', 'Den hungriga i lågorna'],
    vill: ['ved i elden varje kväll innan man äter själv', 'att ingen spottar i elden', 'att askan bärs ut till skogen'],
    svek: ['elden tar huset', 'lågorna kommer om natten', 'man fryser ihjäl'] },
  vinterSlut: { text: 'den hårda vintern som tog slut', natur: 25,
    bakom: ['Den vita som sover under isen', 'Vinterns gamle', 'Solen som kom tillbaka'],
    vill: ['att man delar maten när det är kallt', 'att den första snön hälsas med tystnad', 'att man tänder eld i mörkret'],
    svek: ['vintern kommer tillbaka och stannar', 'isen tar barnen', 'kölden kryper in i husen'] },
  torkaSlut: { text: 'regnet som kom efter torkan', natur: 20,
    bakom: ['Den som bär regnet', 'Molnens moder', 'Källans ande'],
    vill: ['att det första vattnet hälls ut på marken', 'att ingen slösar med vatten', 'att man sjunger när det regnar'],
    svek: ['regnet uteblir', 'sjön torkar ut', 'grödorna vissnar'] },
  flodSlut: { text: 'vattnet som drog sig tillbaka', natur: 15,
    bakom: ['Den som bor i djupet', 'Sjöns herre', 'Vattnets vrede'],
    vill: ['en fisk tillbaka i vattnet för varje fångst', 'att man inte bygger för nära stranden', 'att man är tyst vid strandkanten'],
    svek: ['vattnet stiger igen', 'fisken försvinner', 'någon drunknar'] },
  jakt: { text: 'haren som gick att fånga med bara händerna', natur: 15,
    bakom: ['Harens moder', 'Skogens herre', 'Den gröna som ger bytet'],
    vill: ['att den första biten lämnas i skogen', 'att man tackar bytet', 'att ingen jagar mer än man behöver'],
    svek: ['djuren flyr', 'spjuten missar', 'jägaren blir själv jagad'] },
  barnFrisk: { text: 'att {om} överlevde en svår sjukdom', natur: 75,
    bakom: ['De döda som vakar över barnen', 'Den gamla modern', 'Förfäderna'],
    vill: ['att man talar om de döda vid elden', 'att barnen får äta först', 'att ingen glöms'],
    svek: ['sjukdomen kommer tillbaka', 'barnen blir sjuka', 'de döda vänder sig bort'] },
  drom: { text: 'en dröm', natur: 65,
    bakom: ['Den som talar i sömnen', 'Förfäderna', 'Rösten i mörkret'],
    vill: ['att man berättar sina drömmar', 'att man sover med huvudet mot elden', 'att man lyssnar på de gamla'],
    svek: ['drömmarna blir mardrömmar', 'man går vilse i skogen', 'de döda kommer tillbaka'] },
} satisfies Record<string, TeckenDef>;
export type TeckenTyp = keyof typeof TECKEN;
const TDEF: Record<TeckenTyp, TeckenDef> = TECKEN;
export const teckenText = (k: TeckenTyp, om?: string) => TDEF[k].text.replace('{om}', om ?? '');

// ---------- tron ----------
// en tro (steg 4.1.2): vem som grundade den (id och namn), när, tecknet den kom ur och tolkningen. natur och manga är de två
// första skalorna (0–100: Natur – Människa och Många – En). bekr: när ett tecken senast bekräftade den. slut: när den sista
// som trodde dog
export interface Tro { id: number; grundare: number; gnamn: string; t: number; k: TeckenTyp; om?: string; bakom: string; vill: string; svek: string; natur: number; manga: number; bekr: number; slut?: number }
export const troOf = (s: State, id: number | undefined) => id === undefined ? undefined : s.tron?.find(t => t.id === id);
export const troende = (s: State, tr: Tro) => living(s).filter(p => p.tro === tr.id);
// tolkningen som meningar: "Den som bor i åskmolnen vill att man tystnar när det mullrar. Om man sviker: blixten slår ner i ens hus."
export const tolkning = (tr: Tro) => `${tr.bakom} vill ${tr.vill}. Om man sviker: ${tr.svek}.`;

// p var med om tecknet k: det är en upplevelse (som kan flytta andligheten), det bekräftar tron hen redan har, och den som är
// mycket andlig och inte tror på något kan tolka det till en egen tro. Drar ur personens följd 'tro'
export function tecken(s: State, p: Person, k: TeckenTyp, om?: string) {
  if (!alive(p) || ageOf(p, s.now) < UPPV.fran) return;
  const text = teckenText(k, om);
  upplev(s, p, 'tecken', text);
  const egen = troOf(s, p.tro);
  if (egen) { egen.bekr = s.now; p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + TRO.bekrafta); count(s, 'tro_bekr'); return; }
  if (formas(s, p) || andlighet(s, p) < TRO.grunda || rnd(s, 'tro', p) >= TRO.grundaChans) return;
  // var någon annan med om samma sak och tolkade den nyss, delar hen den tron i stället för att grunda en egen
  const samma = s.tron?.find(t => t.k === k && t.om === om && t.slut === undefined && s.now - t.t <= TRO.samma * HOUR);
  if (samma) { p.tro = samma.id; p.troStyrka = TRO.styrka; count(s, 'tro_samma'); log(s, `${p.name} såg samma tecken som ${samma.gnamn} och tror som hen.`, 'rel', [p.id, samma.grundare]); return; }
  grunda(s, p, k, om);
}
function grunda(s: State, p: Person, k: TeckenTyp, om?: string) {
  const d = TDEF[k], tron = (s.tron ??= []);
  const tr: Tro = {
    id: tron.length + 1, grundare: p.id, gnamn: p.name, t: s.now, k, ...om ? { om } : {},
    bakom: pick(s, d.bakom, 'tro', p), vill: pick(s, d.vill, 'tro', p), svek: pick(s, d.svek, 'tro', p),
    natur: Math.round(clamp(d.natur + gauss(s, 'tro', p) * TRO.skalaSlump, 0, 100)), manga: Math.round(clamp(rnd(s, 'tro', p) * 100, 0, 100)), bekr: s.now,
  };
  tron.push(tr);
  p.tro = tr.id; p.troStyrka = TRO.styrka;
  count(s, 'tro_ny');
  log(s, `${p.name} tolkade ${teckenText(k, om)} som ett tecken. ${tolkning(tr)}`, 'rel', [p.id]);
}

// ---------- varje timme (steg.ts) ----------
// drömmarna, barnet som blev friskt och tron som dog med sin sista troende
export function stepReligion(s: State) {
  for (const p of living(s)) {
    if (p.task?.act === 'sova' && rnd(s, 'tro', p) < TRO.drom) tecken(s, p, 'drom');
    if (p.svartSjuk && !(p.sickUntil && p.sickUntil > s.now)) {
      delete p.svartSjuk;
      if (formas(s, p)) for (const q of living(s)) if (isParent(q, p)) tecken(s, q, 'barnFrisk', p.name);
    }
  }
  for (const tr of s.tron ?? []) if (tr.slut === undefined && !living(s).some(p => p.tro === tr.id)) { tr.slut = s.now; count(s, 'tro_slut'); }
}
