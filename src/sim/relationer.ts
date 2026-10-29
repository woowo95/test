import { upplev } from './uppvaxt';
import { ALDER, REL, ageOf, count, getRel, isParent, living, log, relKey, think } from './folk';
import { DAY, Person, Rel, SKILLS, Skill, State } from './typer';
import { balans } from './balans';

// ---------- balanstal (regel 8) ----------
// Relationstyperna (steg 3.1.1, "Relationstyper" i designdokumentet). Relationen (op) går från -100 till 100; vän, nära vän,
// ovän och par står i REL (folk.ts). Typerna räknas om en gång i timmen ur relationerna, så att de blir lika i alla lägen
export const RELT = balans('relationer', {
  bastaVan: 80, // bästa vän: den man står närmast utom partnern, om relationen är över detta och den andra har en tillbaka ...
  bastaSlut: 65, // ... och vänskapen håller så länge den är över detta
  arke: -80, // ärkefiende: den man hatar mest, om relationen är under detta ...
  arkeSlut: -60, // ... tills den blir bättre än detta
  giftDygn: 14, // ett par som varit tillsammans så här många dygn och fortfarande är goda vänner (REL.van) gifter sig
  skiljGift: -45, // ett gift par skiljer sig först under detta (ett par som inte är gift går isär under REL.gral)
  skiljTanke: 2, // en skilsmässa tar så här mycket hårdare och längre än när ett par går isär (SAMTAL.skiltTanke)
  giftSorj: 1.4, // den som var gift sörjer så här mycket mer och längre (LIV.sorjPartner)
  bastSorj: -0.22, bastSorjDygn: 1.5, // den som miste sin bästa vän sörjer så här mycket i så här många dygn
  naraSorj: 1.3, // en nära vän (REL.naraVan) saknar så här mycket mer och längre än en vän (LIV.saknar)
  rivalRom: 30, // två som båda har romans över detta med samma person är rivaler
  rivalFlit: 0.06, // den som har en rival med samma yrke arbetar så här mycket mer (andel) i yrkets arbete
  rivalGral: 0.1, // två rivaler grälar med så här mycket större chans
  rivalGe: 0.5, // och ger varandra så här mycket av det de annars skulle ge
  arkeGral: 0.8, // med sin ärkefiende grälar man nästan varje gång
  arkeStjal: 3, // och tar hellre av hen (vikten när man tar ur andras förråd)
  mentorAlder: 20, // mentorn är minst så här gammal och den unga yngre (ALDER.fullvuxen)
  mentorSkill: 4, // mentorn är så här mycket bättre i en färdighet (0–20) ...
  mentorLart: 6, // ... och har lärt den unga något så här många gånger
  mentorKlar: 1, // mentorskapet slutar när den unga är så här nära mentorn i färdigheten, eller relationen är under REL.vanOrd
  mentorLar: 2, // mentorn lär ut med så här mycket större chans
  mentorOvning: 1.3, // den unga lär sig så här mycket fortare i arbetet bredvid sin mentor
  mentorNara: 6, // "bredvid": så här nära (rutor)
  // vem man pratar med: tillägg till vikten (SAMTAL.valOp och valPartner)
  valBast: 1.2, valMentor: 0.5,
  bastBerattar: 1.5, // man berättar så här mycket mer för sin bästa vän
  // arbete och plats: arbetet som den bästa vännen eller mentorn gör väger så här mycket mer, och det en ovän gör mindre
  bastArbete: 1.15, mentorArbete: 1.2, ovanArbete: 0.85,
  bastSitt: 0.6, // vid elden sätter man sig bredvid sin bästa vän med den här chansen
  ovanAvstand: 1.5, // och inte närmare en ovän än så här (rutor)
});

// ---------- registret ----------
// en rad per relationstyp: om p och q har den (en relation kan ha flera), varför (texten när man trycker på symbolen) och
// symbolen (ikoner.ts). Raderna står i den ordning symbolerna visas. Typerna som ändras räknas och skrivs i loggen i
// stepRelationer nedan; vänskap och ovänskap loggas i samtalen (samtal.ts)
export interface RelTyp { namn: string; ikon: string; har: (s: State, p: Person, q: Person, r: Rel) => boolean; varfor: (s: State, p: Person, q: Person, r: Rel) => string }
const dygnSedan = (s: State, t: number) => Math.max(0, Math.floor((s.now - t) / DAY));
export const RELATIONER: Record<string, RelTyp> = {
  gift: { namn: 'Gifta', ikon: 'r_gift', har: (_s, p, q, r) => p.partner === q.id && r.gift !== undefined, varfor: (s, _p, _q, r) => `Gifta sedan ${dygnSedan(s, r.gift!)} år. Ett äktenskap håller mer än ett par och sörjs mer.` },
  par: { namn: 'Par', ikon: 'r_par', har: (_s, p, q, r) => p.partner === q.id && r.gift === undefined, varfor: (s, _p, _q, r) => `Tillsammans${r.par !== undefined ? ` i ${dygnSedan(s, r.par)} år` : ''}. Efter ${RELT.giftDygn} år gifter de sig om de fortfarande är goda vänner.` },
  bastaVan: { namn: 'Bästa vän', ikon: 'r_bast', har: (_s, p, q) => p.bast === q.id, varfor: (_s, p, q) => `${q.name} är den ${p.name} står närmast, och tvärtom. De arbetar och sitter gärna bredvid varandra, delar som med släkt och berättar mer för varandra.` },
  naraVan: { namn: 'Nära vän', ikon: 'r_naravan', har: (_s, p, q, r) => r.op > REL.naraVan && p.bast !== q.id && p.partner !== q.id, varfor: () => 'Mycket goda vänner: djupa samtal, gåvor och lån.' },
  van: { namn: 'Vän', ikon: 'r_van', har: (_s, p, q, r) => r.op > REL.vanOrd && r.op <= REL.naraVan && p.partner !== q.id, varfor: () => 'Vänner: de pratar gärna och hjälper varandra.' },
  mentor: { namn: 'Mentor', ikon: 'r_mentor', har: (_s, p, q) => q.mentor === p.id, varfor: (_s, p, q) => `${p.name} är mentor för ${q.name} i ${skillNamn(q.mentorSk)}: lär ut mer, och ${q.name} arbetar gärna bredvid och lär sig fortare där.` },
  larling: { namn: 'Lärling', ikon: 'r_larling', har: (_s, p, q) => p.mentor === q.id, varfor: (_s, p, q) => `${q.name} är mentor för ${p.name} i ${skillNamn(p.mentorSk)}, tills ${p.name} har kommit ikapp.` },
  rival: { namn: 'Rival', ikon: 'r_rival', har: (_s, p, q) => !!p.rivaler?.includes(q.id), varfor: (_s, p, q) => `${p.tag && p.tag === q.tag ? `Båda är ${p.tag.toLowerCase()} och tävlar i det` : 'De vill ha samma person'}. De arbetar lite hårdare, grälar oftare och ger varandra mindre.` },
  fiende: { namn: 'Ovän', ikon: 'r_fiende', har: (_s, p, q, r) => r.op < REL.ovan && p.arke !== q.id, varfor: () => 'Ovänner: de undviker att arbeta och sitta nära varandra och grälar när de möts.' },
  arke: { namn: 'Ärkefiende', ikon: 'r_arke', har: (_s, p, q) => p.arke === q.id, varfor: (_s, p, q) => `Den ${p.name} hatar mest. De grälar nästan varje gång de möts, ${p.name} ger ${q.name} aldrig något och tar hellre av hen.` },
};
const SKILL_ORD: Record<Skill, string> = { samla: 'samlande', jakt: 'jakt', fiske: 'fiske', ved: 'vedhuggning', hantverk: 'hantverk', berattande: 'berättande', elda: 'eldning', matlagning: 'matlagning', narstrid: 'närstrid', traff: 'träffsäkerhet' };
const skillNamn = (k?: Skill) => k ? SKILL_ORD[k] : 'något';
// relationstyperna mellan p och q, i registrets ordning
export const relTyper = (s: State, p: Person, q: Person) => { const r = s.rels[relKey(p.id, q.id)]; return r ? Object.entries(RELATIONER).filter(([, t]) => t.har(s, p, q, r)).map(([id, t]) => ({ id, ...t })) : []; };

// ---------- frågor från andra system ----------
export const arBast = (a: Person, b: Person) => a.bast === b.id;
export const arArke = (a: Person, b: Person) => a.arke === b.id || b.arke === a.id;
export const arRivaler = (a: Person, b: Person) => !!a.rivaler?.includes(b.id);
export const arMentor = (m: Person, ung: Person) => ung.mentor === m.id;
// gränsen där ett par går isär: ett gift par håller mer
export const skiljGrans = (r: Rel) => r.gift !== undefined ? RELT.skiljGift : REL.gral;
// den äldre lärde den yngre något i ett samtal (minne.ts och teknik.ts): räknas mot mentorskapet
export function lartUt(s: State, a: Person, b: Person) { if (ageOf(a, s.now) > ageOf(b, s.now)) { const r = getRel(s, a, b); r.lart = (r.lart ?? 0) + 1; } }
// hur mycket mer en handling väger för p när den bästa vännen, mentorn eller en ovän gör den just nu
export function bredvidVikt(s: State, p: Person, act: string, ppl: Person[]) {
  let f = 1;
  for (const q of ppl) {
    if (q === p || q.task?.act !== act) continue;
    if (p.bast === q.id) f *= RELT.bastArbete;
    if (p.mentor === q.id) f *= RELT.mentorArbete;
    if (p.arke === q.id || (s.rels[relKey(p.id, q.id)]?.op ?? 0) < REL.ovan) f *= RELT.ovanArbete;
  }
  return f;
}

// ---------- en gång i timmen ----------
// bästa vänner (ömsesidigt), ärkefiender, äktenskap, rivaler och mentorer räknas om ur relationerna. Det nya skrivs i loggen
// och räknas i byns statistik. Ingen slump, så det blir likadant i det levande läget och i ikappräkningen
export function stepRelationer(s: State) {
  const ppl = living(s), byId = new Map(ppl.map(p => [p.id, p]));
  const rel = (a: Person, b: Person) => s.rels[relKey(a.id, b.id)];
  // bästa vän: den högsta relationen utom partnern och föräldrar och barn; den man redan har håller till bastaSlut
  const topp = new Map<Person, Person | undefined>();
  for (const p of ppl) {
    let best: Person | undefined, bv = -Infinity;
    for (const q of ppl) {
      if (q === p || p.partner === q.id || isParent(p, q) || isParent(q, p)) continue;
      const r = rel(p, q); if (!r) continue;
      const v = r.op + (p.bast === q.id ? RELT.bastaVan - RELT.bastaSlut : 0);
      if (v > RELT.bastaVan && v > bv) { bv = v; best = q; }
    }
    topp.set(p, best);
  }
  for (const p of ppl) {
    const q = topp.get(p), ny = q && topp.get(q) === p ? q.id : undefined;
    if (ny !== undefined && p.bast !== ny && p.id < ny) {
      const r = rel(p, q!)!; count(s, 'bastaVan');
      if (!(r.flags & 8)) { r.flags |= 8; log(s, `${p.name} och ${q!.name} har blivit bästa vänner.`, 'rel', [p.id, ny]); }
      upplev(s, p, 'bastaVan', q!.name); upplev(s, q!, 'bastaVan', p.name); // barn minns sin bästa vän (steg 3.1.2)
    }
    p.bast = ny;
  }
  // ärkefiende: den man hatar mest (behöver inte vara ömsesidigt)
  for (const p of ppl) {
    let worst: Person | undefined, wv = Infinity;
    for (const q of ppl) {
      if (q === p) continue;
      const r = rel(p, q); if (!r) continue;
      const v = r.op - (p.arke === q.id ? RELT.arkeSlut - RELT.arke : 0);
      if (v < RELT.arke && v < wv) { wv = v; worst = q; }
    }
    if (worst && p.arke !== worst.id) { count(s, 'arkefiende'); log(s, `${p.name} ser nu ${worst.name} som sin ärkefiende.`, 'rel', [p.id, worst.id]); }
    p.arke = worst?.id;
  }
  // äktenskap: ett par som varit tillsammans giftDygn dygn och fortfarande är goda vänner
  for (const p of ppl) {
    const q = byId.get(p.partner ?? -1); if (!q || p.id > q.id) continue;
    const r = getRel(s, p, q);
    r.par ??= s.now; // par från äldre sparfiler räknas härifrån
    if (r.gift === undefined && s.now - r.par >= RELT.giftDygn * DAY && r.op > REL.van) {
      r.gift = s.now; count(s, 'gift');
      log(s, `${p.name} och ${q.name} har gift sig.`, 'rel', [p.id, q.id]);
      think(p, `Gifte sig med ${q.name}`, 0.15, s.now, DAY); think(q, `Gifte sig med ${p.name}`, 0.15, s.now, DAY);
    }
  }
  // rivaler: samma yrke (inte dagdrivare) och inte vänner, eller romans med samma person. De slutar när de blir vänner
  const romans = new Map<Person, Person[]>();
  for (const p of ppl) for (const q of ppl) { if (q !== p && (rel(p, q)?.rom ?? 0) > RELT.rivalRom) (romans.get(p) ?? romans.set(p, []).get(p)!).push(q); }
  const vuxen = (p: Person) => ageOf(p, s.now) >= ALDER.vuxen;
  for (const p of ppl) {
    const fore = p.rivaler ?? [], nu: number[] = []; let om: string | undefined;
    if (vuxen(p)) for (const q of ppl) {
      if (q === p || !vuxen(q) || p.partner === q.id) continue;
      const r = rel(p, q), op = r?.op ?? 0, yrke = !!p.tag && p.tag === q.tag && p.tag !== 'Dagdrivare';
      const karlek = !!romans.get(p)?.some(c => c !== q && romans.get(q)?.includes(c));
      if ((yrke || karlek) && op <= (fore.includes(q.id) ? REL.van : REL.vanOrd)) { nu.push(q.id); if (yrke) om = p.tag; }
    }
    for (const id of nu) if (!fore.includes(id) && p.id < id) {
      const q = byId.get(id)!, r = getRel(s, p, q); count(s, 'rival');
      if (!(r.flags & 4)) { r.flags |= 4; log(s, `${p.name} och ${q.name} har blivit rivaler.`, 'rel', [p.id, id]); }
    }
    p.rivaler = nu.length ? nu : undefined; p.rivalom = om;
  }
  // mentor: en vuxen som är mycket bättre i en färdighet än en ung, har lärt hen många gånger och är god vän med hen.
  // Slutar när den unga kommit ikapp eller relationen blir sämre. Den som lärt hen mest blir mentor
  for (const ung of ppl) {
    const m = byId.get(ung.mentor ?? -1);
    if (m && ung.mentorSk && ageOf(ung, s.now) < RELT.mentorAlder && m.skill[ung.mentorSk] - ung.skill[ung.mentorSk] > RELT.mentorKlar && (rel(m, ung)?.op ?? 0) > REL.vanOrd) continue;
    ung.mentor = undefined; ung.mentorSk = undefined;
    if (ageOf(ung, s.now) >= RELT.mentorAlder || ageOf(ung, s.now) < ALDER.lar) continue;
    let best: Person | undefined, bl = 0, bsk: Skill | undefined;
    for (const q of ppl) {
      if (q === ung || ageOf(q, s.now) < RELT.mentorAlder) continue;
      const r = rel(q, ung); if (!r || (r.lart ?? 0) < RELT.mentorLart || r.op <= REL.van || (r.lart ?? 0) <= bl) continue;
      let sk: Skill | undefined, d = RELT.mentorSkill;
      for (const k of SKILLS) if (k !== 'narstrid' && k !== 'traff' && q.skill[k] - ung.skill[k] >= d) { d = q.skill[k] - ung.skill[k]; sk = k; }
      if (sk) { best = q; bl = r.lart!; bsk = sk; }
    }
    if (best && bsk) {
      ung.mentor = best.id; ung.mentorSk = bsk; count(s, 'mentor');
      log(s, `${best.name} har blivit mentor för ${ung.name} i ${skillNamn(bsk)}.`, 'rel', [best.id, ung.id]);
      upplev(s, ung, 'mentor', `${best.name} i ${skillNamn(bsk)}`);
    }
  }
}
