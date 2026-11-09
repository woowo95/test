// Kontrollerna av texterna (steg 4.5.1.2): det som är fel i en text som spelet skrivit. Används av npm run texter (alla fel
// i texter.txt) och av vakten i korBy (kor.ts), som larmar när en text som skrivs är fel, så att nya texter inte blir sämre.
// En kontroll är en rad i registret KONTROLLER: vad den heter och vad den hittar i texten (och fälten den fylldes med).
// titta(s) skriver de texter som bara visas när man trycker på något, som om någon tittade (beskrivningen av en person,
// samtalet, relationerna och sakernas berättelser).
import { State, alive, byId, living } from '../sim';
import { Fyllning, beskrivning, pratText, relationText, sakBerattelse } from '../sim/berattelser';
import { SAKER, sakNamn } from '../sim/saker';
import { STATIONER } from '../sim/stationer';

// ord som inte fanns på järnåldern
const NYA_ORD = ['procent', 'kilo', 'kilogram', 'meter', 'centimeter', 'minut', 'minuter', 'minuten', 'sekund', 'sekunder', 'klockan', 'okej', 'ok', 'jobb', 'jobbet', 'jobba', 'jobbar', 'kille', 'tjej', 'pengar', 'kronor', 'socker', 'potatis', 'kaffe', 'papper', 'dator', 'krut', 'gevär', 'telefon', 'bil', 'tåg', 'fabrik', 'polis', 'kontor', 'skola', 'skolan', 'stress', 'semester', 'cigarett', 'tobak', 'glasögon'];
const NYA = new RegExp(`(^|[^\\p{L}])(${NYA_ORD.join('|')})(?=[^\\p{L}]|$)`, 'iu');
// sakernas och stationernas namn efter genus (ett rep, en korg), med gemen bokstav
const ord = (l: { namn: string; ett?: true }[], ett: boolean) => l.filter(d => !!d.ett === ett).map(d => d.namn.toLowerCase());
const reg = [...Object.values(SAKER).filter(d => d !== undefined), ...Object.values(STATIONER)] as { namn: string; ett?: true }[];
const ETT = ord(reg, true), EN = ord(reg, false);
const efter = (artikel: string, l: string[]) => new RegExp(`(^|[^\\p{L}])${artikel} (\\p{L}+ )?(${l.join('|')})(?=[^\\p{L}]|$)`, 'iu');
const FEL_ETT = efter('ett', EN), FEL_EN = efter('en', ETT);
// måttord mellan artikeln och saken: "en bit harkött", "ett par skor" (artikeln hör till måttet, ordlagret ord.ts)
const MATT = new Set(['bit', 'famn', 'klump', 'tuva', 'näve', 'par', 'stycke', 'knippe', 'liten', 'stort', 'mycket']);
// adjektiv som slutar på t också i en-form (en trött, en vit)
const T_ADJ = new Set(['trött', 'vit', 'söt', 'våt', 'het', 'fet', 'lätt', 'rätt', 'tätt', 'flat', 'stolt', 'kort', 'hårt', 'svart', 'tyst', 'snabbt', 'mätt', 'sist', 'först', 'bäst', 'störst', 'minst', 'mest', 'lägst', 'högst', 'yngst', 'äldst', 'fast', 'kvickt', 'lat', 'blöt', 'glatt', 'brant', 'tjockt', 'grått', 'rått', 'gott', 'ett']);

const person = ['hen', 'honom', 'hans'] as const;
const FORM: Record<string, Record<typeof person[number], string>> = { m: { hen: 'han', honom: 'honom', hans: 'hans' }, k: { hen: 'hon', honom: 'henne', hans: 'hennes' } };

export interface Kontroll { id: string; namn: string; hitta: (t: string, f: Fyllning, kon: (namn: string) => string | undefined, start: boolean) => string | undefined }
export const KONTROLLER: Kontroll[] = [
  { id: 'lucka', namn: 'En tom lucka', hitta: t => /undefined|NaN|null|\{|\}/.exec(t)?.[0] ?? (/ {2}|^ | $| [,.:;!?]/.test(t) ? 'mellanslag' : /[,.:;]{2}/.test(t.replace(/\.\.\./g, '')) ? 'dubbla tecken' : undefined) },
  { id: 'versal', namn: 'Stor bokstav mitt i ett ord, eller liten i början av en mening', hitta: (t, _f, _k, start) => /\p{Ll}\p{Lu}/u.exec(t)?.[0] ?? /[.!?] \p{Ll}/u.exec(t)?.[0] ?? (start ? /^\p{Ll}/u.exec(t)?.[0] : undefined) },
  { id: 'dubbelord', namn: 'Samma ord två gånger i rad', hitta: t => /(^|[^\p{L}])(\p{L}+)[ ,]+\2(?=[^\p{L}]|$)/iu.exec(t)?.[2] },
  { id: 'pronomen', namn: 'Fel pronomen (han eller hon)', hitta: (_, f, kon) => {
    const k = typeof f.namn === 'string' ? kon(f.namn) : undefined;
    if (!k) return undefined;
    for (const p of person) { const v = f[p]; if (typeof v === 'string' && v.toLowerCase() !== FORM[k][p]) return `${f.namn}: ${v}`; }
    return undefined;
  } },
  { id: 'genus', namn: 'En eller ett, eller adjektivets form, efter ordets genus', hitta: t => {
    for (const re of [FEL_ETT, FEL_EN]) { const a = re.exec(t); if (a && !MATT.has((a[2] ?? '').trim().toLowerCase())) return a[0].trim(); }
    const m = new RegExp(`(^|[^\\p{L}])en (\\p{L}+t) (${EN.join('|')})(?=[^\\p{L}]|$)`, 'iu').exec(t);
    return m && !T_ADJ.has(m[2].toLowerCase()) ? m[0].trim() : undefined;
  } },
  { id: 'nyttOrd', namn: 'Ett ord som inte fanns på järnåldern', hitta: t => NYA.exec(t)?.[2] },
  // ordlagret (steg 6.7.1, src/sim/ord.ts): det simuleringen vet ska inte stå som rådata i texten
  { id: 'hen', namn: 'hen, hens eller henom om en viss person', hitta: t => /(^|[^\p{L}])(hen|hens|henom)(?=[^\p{L}]|$)/iu.exec(t)?.[2] },
  { id: 'artikel', namn: 'Ett rykte utan en framför (som lögnare, är tjuv)', hitta: t => ARTIKEL.exec(t)?.[0].trim() },
  { id: 'andelse', namn: 'En ändelse hängd på ett namn (Lerkrukaen, väggbrädeen)', hitta: (t, f) => {
    const namn = Object.values(f).filter((v): v is string => typeof v === 'string' && /^\p{Lu}/u.test(v));
    for (const n of namn) if (/[ae]$/.test(n) && [...t.matchAll(new RegExp(`${n}(en|n|na|et)(?=[^\\p{L}]|$)`, 'gu'))].some(m => !VANLIGA.has(m[0].toLowerCase()) && !namn.some(v => new RegExp(`(^|[^\\p{L}])${m[0]}(?=[^\\p{L}]|$)`, 'u').test(v)))) return n; // Arka och Arkan är två namn, också i samma fält (Ragma och Ulvan)
    return /\p{Ll}(aen|een|aet|eet)(?=[^\p{L}]|$)/u.exec(t)?.[0];
  } },
  { id: 'siffra', namn: 'En siffra före ett ord (1 rutor, efter 3 försök); utom ålder, år och årtal', hitta: t => { const m = /(^|[^\p{L}\d.,])(\d+) (\p{L}+)/u.exec(t); return m && !/^(år|års|dygn|timmar|timme|kg)$/u.test(m[3]) && !/(^|[^\p{L}])år $/u.test(t.slice(0, m.index + m[1].length)) ? `${m[2]} ${m[3]}` : undefined; } }, // "år 17 dog" är ett årtal
  { id: 'ochoch', namn: 'Namn fogade med och … och (A och B och C)', hitta: t => /(\p{Lu}\p{Ll}+) och (\p{Lu}\p{Ll}+) och (\p{Lu}\p{Ll}+)/u.exec(t)?.[0] },
];
// vanliga ord som råkar vara ett namn med en ändelse (Inge + n = Ingen)
const VANLIGA = new Set(['ingen', 'inget', 'inga']);
const ARTIKEL = new RegExp(`(^|[^\\p{L}])(som|är|var) (lögnare|tjuv|klåpare|vargdödare)(?=[^\\p{L}]|$)`, 'iu');
// fel som bara gäller en hel beskrivning eller en lång text: upprepningar och för långa meningar. De skrivs i texter.txt
export const STIL: Kontroll[] = [
  { id: 'sammaMening', namn: 'Samma mening två gånger', hitta: t => { const m = meningar(t); return m.find((x, i) => m.indexOf(x) !== i); } },
  { id: 'sammaBorjan', namn: 'Samma början på två meningar', hitta: t => { const b = meningar(t).map(x => x.split(' ').slice(0, 2).join(' ').toLowerCase()); return b.find((x, i) => b.indexOf(x) !== i && x.includes(' ')); } },
  { id: 'lang', namn: 'En för lång mening (fler än 30 ord)', hitta: t => meningar(t).find(x => x.split(' ').length > 30)?.slice(0, 60) },
];
const meningar = (t: string) => t.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);

// könet hos den som heter namn i byn, om alla med det namnet har samma
export function konI(s: State) {
  return (namn: string) => { const l = s.people.filter(p => p.name === namn); return l.length && l.every(p => p.sex === l[0].sex) ? l[0].sex : undefined; };
}
// felen i en text: kontrollernas id och det som hittades
// start: texten är en hel mening som ska börja med stor bokstav (beskrivningen och dess delar får den i mening())
export function kollaText(t: string, f: Fyllning, kon: (namn: string) => string | undefined, stil = false, start = false) {
  const ut: { id: string; vad: string }[] = [];
  for (const k of stil ? [...KONTROLLER, ...STIL] : KONTROLLER) { const v = k.hitta(t, f, kon, start); if (v !== undefined) ut.push({ id: k.id, vad: v }); }
  return ut;
}

// skriver de texter som bara visas när man trycker på något, för alla i byn och alla saker med ett minne
export function titta(s: State) {
  for (const p of living(s)) {
    beskrivning(s, p); pratText(s, p);
    for (const k in s.rels) {
      const [a, b] = k.split('-').map(Number);
      if (a !== p.id && b !== p.id) continue;
      const q = byId(s, a === p.id ? b : a);
      if (q && alive(q)) relationText(s, p, q, s.rels[k]);
    }
  }
  for (const p of s.people.filter(p => !alive(p)).slice(-5)) beskrivning(s, p);
  for (const t of s.ting ?? []) if (t.ber) sakBerattelse(s, t, sakNamn(t.k));
  for (const st of s.stationer ?? []) if (st.ber) sakBerattelse(s, st, (STATIONER as Record<string, { namn: string }>)[st.k]?.namn ?? st.k);
}
