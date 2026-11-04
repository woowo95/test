// Gästernas liv (steg 4.5.7.7, "Gästerna" i designdokumentet): den som kommer till byn utan att bo där (handlaren, rövarna och
// de som kommer senare) har ett liv bakåt i tiden i sin hemklan: föräldrar, syskon, partner och barn med namn, och händelser ur
// registret LIVSHANDELSER som passar hens ålder och roll och stämmer med varandra (ingen får barn innan hen gift sig, den som
// dött kommer inte tillbaka). Allt räknas ur byns frö och gästens nyckel (gastNyckel: klanen och namnet) med hash3, aldrig ur
// spelets slumpföljder, så att spelet utvecklas likadant och samma gäst får samma liv varje gång. En handlare som kommer igen
// är samma person och har levt vidare: åren sedan sist har fått sina händelser. Ett nytt slag av händelse är en rad i registret
import { hash3 } from './slump';
import { DAY } from './typer';
import { N1, N2, NK, NM } from './folk';
import { KLAN_HEM } from './klaner';

export type Roll = 'handlare' | 'rovare' | 'gast';
export interface Slakting { roll: 'mor' | 'far' | 'syskon' | 'partner' | 'barn'; namn: string; sex: 'm' | 'k'; ar: number; dog?: number } // ar = gästens ålder när hen föddes eller kom in i livet (föräldrarna: 0), dog = gästens ålder när hen dog
export interface LivRad { ar: number; k: string; text: string }
export interface GastLiv { alder: number; familj: Slakting[]; liv: LivRad[]; humor: number; kan: string[]; beskrivning: string }

// åldern när gästen först kommer, efter rollen (år, ett dygn = ett år i spelet)
const ALDRAR: Record<Roll, [number, number]> = { handlare: [24, 56], rovare: [18, 42], gast: [18, 60] };
const HANTVERK = ['garva skinn', 'fläta korgar', 'tälja i trä', 'sy kläder', 'fiska med nät', 'spåra vilt', 'göra rep', 'slå flinta'];
const PLATSER = KLAN_HEM; // man reser till där klanerna bor (klaner.ts)
const DELAR = ['armen', 'benet', 'handen', 'axeln', 'foten'];

// sammanhanget medan livet räknas fram, år för år
interface Liv { r(salt: number): number; ar: number; roll: Roll; sex: 'm' | 'k'; familj: Slakting[]; liv: LivRad[]; namn(sex: 'm' | 'k', salt: number): string; kan: string[]; klan: string; hem: string }
const lever = (c: Liv, roll: Slakting['roll']) => c.familj.filter(f => f.roll === roll && f.dog === undefined);
const hen = (sex: 'm' | 'k') => sex === 'k' ? 'hon' : 'han';

// registret: från och till vilken ålder, chansen ett år (efter rollen), och vad som händer (svarar med texten, eller inget när
// det inte går, t.ex. ingen förälder kvar). en = högst en gång i livet
interface Handelse { fran: number; till: number; chans: Partial<Record<Roll, number>> & { annars: number }; en?: true; gor(c: Liv): string | undefined }
export const LIVSHANDELSER: Record<string, Handelse> = {
  syskon: { fran: 1, till: 16, chans: { annars: 0.12 }, gor: c => {
    if (lever(c, 'mor').length === 0 || c.familj.filter(f => f.roll === 'syskon').length >= 4) return undefined;
    const sex = c.r(1) < 0.5 ? 'm' : 'k', namn = c.namn(sex, 2);
    c.familj.push({ roll: 'syskon', namn, sex, ar: c.ar });
    return `Fick ${sex === 'k' ? 'en lillasyster' : 'en lillebror'}, ${namn}`;
  } },
  hantverk: { fran: 11, till: 22, chans: { annars: 0.2 }, gor: c => {
    if (c.kan.length >= 2) return undefined;
    const h = HANTVERK.filter(x => !c.kan.includes(x))[Math.floor(c.r(3) * (HANTVERK.length - c.kan.length))];
    c.kan.push(h);
    return `Lärde sig att ${h}`;
  } },
  forstaResa: { fran: 13, till: 22, en: true, chans: { handlare: 0.3, annars: 0 }, gor: c => `Följde med på sin första handelsresa, till ${PLATSER[Math.floor(c.r(4) * PLATSER.length)]}` },
  forstaRan: { fran: 15, till: 25, en: true, chans: { rovare: 0.25, annars: 0 }, gor: () => 'Lämnade klanen och slöt sig till en flock rövare' },
  gift: { fran: 18, till: 38, en: true, chans: { rovare: 0.06, annars: 0.14 }, gor: c => {
    const sex = c.sex === 'k' ? 'm' : 'k', namn = c.namn(sex, 5);
    c.familj.push({ roll: 'partner', namn, sex, ar: c.ar });
    return `Gifte sig med ${namn}`;
  } },
  barn: { fran: 19, till: 46, chans: { annars: 0.16 }, gor: c => {
    if (!lever(c, 'partner').length || c.familj.filter(f => f.roll === 'barn').length >= 5) return undefined;
    const sex = c.r(6) < 0.5 ? 'm' : 'k', namn = c.namn(sex, 7);
    c.familj.push({ roll: 'barn', namn, sex, ar: c.ar });
    return `Fick ${sex === 'k' ? 'en dotter' : 'en son'}, ${namn}`;
  } },
  foralder: { fran: 6, till: 99, chans: { annars: 0.035 }, gor: c => {
    const f = [...lever(c, 'mor'), ...lever(c, 'far')];
    if (!f.length || c.ar < 30 && c.r(8) < 0.6) return undefined; // föräldrarna dör oftast när man själv är vuxen
    const q = f[Math.floor(c.r(9) * f.length)];
    q.dog = c.ar;
    return `Förlorade ${q.roll === 'mor' ? 'sin mor' : 'sin far'}, ${q.namn}`;
  } },
  partnerDog: { fran: 22, till: 99, chans: { annars: 0.012 }, gor: c => {
    const q = lever(c, 'partner')[0];
    if (!q) return undefined;
    q.dog = c.ar;
    return `Förlorade ${q.sex === 'k' ? 'sin hustru' : 'sin man'}, ${q.namn}`;
  } },
  barnDog: { fran: 20, till: 99, chans: { annars: 0.012 }, gor: c => {
    const b = lever(c, 'barn');
    if (!b.length) return undefined;
    const q = b[Math.floor(c.r(10) * b.length)];
    q.dog = c.ar;
    return `Förlorade ${q.sex === 'k' ? 'sin dotter' : 'sin son'} ${q.namn}, ${c.ar - q.ar} år gammal`;
  } },
  skadad: { fran: 8, till: 99, chans: { rovare: 0.05, annars: 0.02 }, gor: c => `Skadade ${DELAR[Math.floor(c.r(11) * DELAR.length)]} ${c.r(12) < 0.5 ? 'i ett fall' : c.roll === 'rovare' ? 'i ett slagsmål' : 'på en jakt'}` },
  resa: { fran: 16, till: 99, chans: { handlare: 0.12, annars: 0.015 }, gor: c => `Gjorde en lång resa till ${PLATSER[Math.floor(c.r(13) * PLATSER.length)]}${c.roll === 'handlare' ? ' och kom hem med mycket silver' : ''}` },
  vinter: { fran: 4, till: 99, chans: { annars: 0.03 }, gor: () => `Klarade en sträng vinter då många i klanen svalt` },
  strid: { fran: 15, till: 99, chans: { rovare: 0.14, annars: 0.015 }, gor: c => c.roll === 'rovare' ? (c.r(14) < 0.5 ? 'Var med och plundrade en by' : 'Slogs mot en annan flock och klarade sig') : `Slogs mot rövare som anföll ${c.klan}` },
};

const strHash = (t: string) => { let h = 0; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); return h; };
// gästens nyckel: klanen och namnet, så att en handlare som kommer igen är samma person
export const gastNyckel = (klan: number | undefined, namn: string) => strHash(`${klan ?? -1}:${namn}`);
const tal = (seed: number, nyckel: number, n: number) => hash3(seed, nyckel, n, 0x2545f491, 11);
// åldern när gästen först kommer (hela år)
export const forstaAlder = (seed: number, nyckel: number, roll: Roll) => { const [a, b] = ALDRAR[roll]; return Math.floor(a + tal(seed, nyckel, 0) * (b - a + 1)); };
// när gästen föddes: sparas hos den som kan komma igen (KlanPerson.fodd), annars räknat från när hen kom
export const foddNar = (seed: number, nyckel: number, roll: Roll, nu: number) => nu - forstaAlder(seed, nyckel, roll) * DAY;

// livet är bara ur fröet, nyckeln och åldern (ingen spelstatus), så det sparas här; högst CACHE_MAX liv
const cache = new Map<string, GastLiv>(), CACHE_MAX = 200;
// hela livet fram till i dag. Rollen styr chanserna; klanen och hemmet står i texterna
export function gastLiv(seed: number, nyckel: number, namn: string, sex: 'm' | 'k', roll: Roll, klan: string, hem: string, fodd: number, nu: number): GastLiv {
  const alder = Math.max(0, Math.floor((nu - fodd) / DAY)), id = `${seed}:${nyckel}:${roll}:${alder}`;
  const sparat = cache.get(id);
  if (sparat) return sparat;
  let ar = 0;
  const brukat = new Set<string>();
  const c: Liv = {
    r: salt => hash3(seed, nyckel, ar * 1024 + salt, 0x5bd1e995, 11), ar, roll, sex, familj: [], liv: [], kan: [], klan, hem,
    namn: (sx, salt) => {
      for (let i = 0; i < 8; i++) {
        const t = (k: number) => tal(seed, nyckel, 50000 + ar * 512 + salt * 16 + i * 3 + k), slut = sx === 'k' ? NK : NM;
        const n = N1[Math.floor(t(0) * N1.length)] + (t(1) < 0.7 ? N2[Math.floor(t(2) * N2.length)] : '') + slut[Math.floor(t(1) * 997 % 1 * slut.length)];
        const nn = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
        if (nn !== namn && !brukat.has(nn)) { brukat.add(nn); return nn; }
      }
      return namn + 's släkting';
    },
  };
  brukat.add(namn);
  c.familj.push({ roll: 'mor', namn: c.namn('k', 0), sex: 'k', ar: 0 }, { roll: 'far', namn: c.namn('m', 1), sex: 'm', ar: 0 });
  c.liv.push({ ar: 0, k: 'fodd', text: `Föddes i ${klan} vid ${hem}` });
  const gjort = new Set<string>();
  for (ar = 1; ar <= alder; ar++) {
    c.ar = ar;
    for (const [j, [k, h]] of Object.entries(LIVSHANDELSER).entries()) {
      if (ar < h.fran || ar > h.till || (h.en && gjort.has(k))) continue;
      if (c.r(100 + j) >= (h.chans[roll] ?? h.chans.annars)) continue;
      const text = h.gor(c);
      if (!text) continue;
      gjort.add(k);
      c.liv.push({ ar, k, text });
    }
  }
  if (roll === 'handlare') c.kan.unshift('handla');
  // humöret: sämre en tid efter en förlust, bättre med en levande familj (0–1 som en bybos)
  const forlust = c.liv.filter(l => l.k === 'foralder' || l.k === 'partnerDog' || l.k === 'barnDog').at(-1);
  const humor = Math.max(0.1, Math.min(0.9, 0.6 + (lever(c, 'partner').length ? 0.08 : 0) + Math.min(3, lever(c, 'barn').length) * 0.03 - (forlust && alder - forlust.ar < 3 ? 0.25 : 0)));
  const partner = c.familj.find(f => f.roll === 'partner'), barn = c.familj.filter(f => f.roll === 'barn');
  const delar = [
    `${namn} är ${alder} år och ${roll === 'handlare' ? 'handlare' : roll === 'rovare' ? 'rövare' : 'kommer'} från ${klan} vid ${hem}.`,
    partner ? (partner.dog === undefined ? `${cap(hen(sex))} är gift med ${partner.namn}` : `${cap(hen(sex))} är änk${sex === 'k' ? 'a' : 'ling'} efter ${partner.namn}`) + (barn.length ? ` och har ${barn.length === 1 ? 'ett barn' : `${barn.length} barn`}.` : '.') : `${cap(hen(sex))} har aldrig gift sig.`,
    c.kan.length ? `${cap(hen(sex))} kan ${c.kan.length > 1 ? `${c.kan.slice(0, -1).join(', ')} och ${c.kan.at(-1)}` : c.kan[0]}.` : '',
    forlust && alder - forlust.ar < 3 ? `${cap(hen(sex))} sörjer fortfarande.` : '',
  ];
  const liv: GastLiv = { alder, familj: c.familj, liv: c.liv, humor, kan: c.kan, beskrivning: delar.filter(Boolean).join(' ') };
  if (cache.size > CACHE_MAX) cache.clear();
  cache.set(id, liv);
  return liv;
}
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
