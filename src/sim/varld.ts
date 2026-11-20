import { balans } from './balans';
import { rovarFlockar } from './rovare';
import { TROSHUS_DELAR, planRutor, vaggSorter, vuxnaTroende } from './troshus';
import { delarAv, delarIRad, rivStation, stationAt, stationDef } from './stationer';
import { nyaGrannbyar } from './grannbyar';
import { gastVapenSatt, gastAv, nyGast, nyttGastId } from './gast';
import { gastNyckel } from './gastliv';
import { stepDelning } from './delning';
import { inZone, put, setStock, zonesOf } from './lager';
import { kyrkaId } from './egendom';
import { newTing } from './agande';
import { MATERIAL, isWall } from './byggnad';
import { enOrd, stor } from './ord';
import { kladNyckel } from './klader';
import { KARTA, behoverStorreKarta, storreKarta } from './kartflytt';
import { VAR, nyKalender } from './tid';
import { ageOf, getRel, log, newPerson, startSkills } from './folk';
import { newSeder, sederTarget } from './seder';
import { rnd } from './slump';
import { DAY, MIN, Person, State, simulera, useMap } from './typer';
import { startSmak } from './rykten';
import { hogtidForm, hogtidVarde, hogtider } from './kult';
import { newFire } from './eld';
import { laggGruvor } from './gruva';
import { varldMark } from './varlden';
import { tanke } from './tankar';

// ---------- skapa värld ----------
// storlek: kartans storlek, för testerna av äldre byar (en ny by får KARTA.bredd × KARTA.hojd, kartflytt.ts)
const START_KLADER = ['rock', 'byxor', 'skor'] as const;
// kläderna från början (steg 10.2.73): 1 = alla har dem på sig. Scenarierna, som prövar annat, börjar utan (storlek.ts)
export const START = balans('start', { klader: 1 });
export function createState(seed: number, now: number, storlek = { W: KARTA.bredd, H: KARTA.hojd }): State { return simulera(() => skapaBy(seed, now, storlek)); } // som simuleringen (typer.ts)
// grundarna kom som ett resande sällskap långt bortifrån, och så gör de som återgrundar en utdöd by: deras trasiga vagn står på
// startplatsen, i lagret där de första sakerna ligger (steg 11.6.13). Finns redan en vagn, eller något annat på rutan, står den kvar
export function stallVagn(s: State) {
  if (s.stationer?.some(t => t.k === 'vagn')) return;
  const z = zonesOf(s)[0], a = s.stackar?.find(q => z && inZone(z, q.x, q.y)), x = a?.x ?? z?.x, y = a?.y ?? z?.y;
  if (x === undefined || y === undefined || stationAt(s, x, y)) return;
  (s.stationer ??= []).push({ id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'vagn', x, y, kvar: 0 });
  s.byggV = (s.byggV ?? 0) + 1;
}
// en by utan folk och saker: grunden för en ny by och för en väckt by (vackt.ts, steg 11.13.2)
export function tomBy(seed: number, founded: number, now: number, storlek: { W: number; H: number }, mer: Partial<State> = {}): State {
  const s: State = { v: SPARVERSION, seed, founded, now, people: [], rels: {}, nextId: 1, log: [], lastAgeIdx: VAR, fire: newFire(), seder: newSeder(), W: storlek.W, H: storlek.H, kal: nyKalender(now), ...mer };
  useMap(s);
  return s;
}
function skapaBy(seed: number, now: number, storlek: { W: number; H: number }): State {
  // en liten koloni: två par och ett barn, utan eld och med lite mat och grenar
  const s = tomBy(seed, now, now, storlek);
  setStock(s, { bar: 30, grenar: 20 });
  stallVagn(s);
  const adults: [string, number][] = [['m', 30], ['k', 27], ['m', 23], ['k', 21]];
  for (const [sex, age] of adults) s.people.push(newPerson(s, sex as 'm' | 'k', now - (age + rnd(s, 'folk')) * DAY));
  const [a, b, c, d] = s.people;
  for (const p of s.people) p.grundare = true;
  pair(s, a, b, true); pair(s, c, d, true);
  s.people.push(newPerson(s, rnd(s, 'folk') < 0.5 ? 'm' : 'k', now - (4 + rnd(s, 'folk') * 0.5) * DAY, b, a));
  // startfärdigheter efter ålder
  for (const p of s.people) { startSkills(s, p, ageOf(p, now)); startSmak(s, p); }
  // kläderna från början (steg 10.2.73): alla har enkla kläder och skor av harskinn som de haft med sig och har på sig, men ingen
  // kan göra nya; de slits som andra plagg. Sparade byar får inga nya kläder
  if (START.klader) for (const p of s.people) for (const pl of START_KLADER) newTing(s, kladNyckel(pl, 'kaninskinn'), 1, p.id).bar = p.id;
  s.seder.v = sederTarget(s);
  stepDelning(s); // en ny by är fattig och delar nästan allt
  nyaGrannbyar(s); // byn får sin värld, och grannarna är byarna i dess grannät (steg 4.4.3, 11.2.15)
  log(s, `${s.people.length} människor slog sig ner vid sjön. De har ingen eld ännu.`, 'world');
  return s;
}


// ---------- uppgradering av sparade byar ----------
// Varje ändring av hur en by sparas får en rad här, med nästa nummer. s.v är numret på den senaste uppgraderingen
// byn fått; migrate kör de som är nyare, i nummerordning. En ny by får det senaste numret och behöver inga.
// En by sparad före v378 (s.v under ALDSTA_SPARNING) går inte att öppna (steg 12.1.71): migrate kastar ForGammalBy, och
// spelet säger att byn är för gammal. Uppgraderingarna före den är borttagna.
export const ALDSTA_SPARNING = 24; // uppgraderingen i v378
export class ForGammalBy extends Error {
  constructor(public v: number) { super(`Byn är sparad i en för gammal version av spelet (sparversion ${v}, före v378) och går inte att öppna.`); this.name = 'ForGammalBy'; }
}
const UPPGRADERINGAR: [number, string, (s: State) => void][] = [
  [25, 'v510: de nya vågskålarna (steg 8.3.4 och 8.3.5) börjar på noll', s => { s.seder.v.fortjanst ??= 0; s.seder.v.fejd ??= 0; s.seder.v.krig ??= 0; s.seder.v.natur ??= 0; s.seder.v.andlig ??= 0; }],
  [26, 'v513: färdigheten Läkekonst (steg 9.5.7) börjar på noll', s => { for (const p of s.people) p.skill.lakekonst ??= 0; }],
  [27, 'v518: handlaren är en person bland folket (steg 9.2.111, gast.ts): namnet, hemmet, klanen, platsen och färdigheten flyttar till personen', s => {
    const h = s.handlare as (import('./handel').Handlare & { namn?: string; hem?: string; klan?: number; sex?: 'm' | 'k'; x?: number; y?: number; handel?: number; fodd?: number; smitta?: import('./sjukdom').SjukId }) | undefined;
    if (!h || h.namn === undefined || gastAv(s, h.id)) return;
    const p = nyGast(s, { id: h.id, namn: h.namn, sex: h.sex ?? 'm', fodd: h.fodd ?? s.now - 35 * DAY, rad: { sort: 'handlare', klan: h.klan, hem: h.hem }, x: h.x ?? h.mx, y: h.y ?? h.my, nyckel: gastNyckel(h.klan, h.namn), skill: { handel: h.handel ?? 0 } });
    if (h.smitta) p.smitta = h.smitta;
    s.people.push(p);
    for (const k of ['namn', 'hem', 'klan', 'sex', 'x', 'y', 'handel', 'fodd', 'smitta'] as const) delete h[k];
  }],
  [28, 'v518: rövarna är personer bland folket (steg 9.2.112, rovare.ts): flocken minns bara deras id', s => {
    type Gammal = { namn: string; sex: 'm' | 'k'; st: { styrka: number; uthallighet: number; mod: number; smidighet: number; skicklighet: number }; vapen: import('./strid').Vapen; blod: number; fodd?: number; x?: number; y?: number; spar?: number[]; bar?: Record<string, number>; anhorig?: string };
    for (const f of rovarFlockar(s)) {
      if (!f || !f.folk.some(r => typeof r !== 'number')) continue;
      f.folk = (f.folk as unknown as Gammal[]).map(r => {
        const ov = Math.max(0, (r.st.skicklighet - 5) * 2);
        const p = nyGast(s, { id: nyttGastId(s), namn: r.namn, sex: r.sex, fodd: r.fodd ?? s.now - 30 * DAY, rad: { sort: 'rovare', klan: f.klan, ...(r.spar ? { spar: r.spar } : {}), ...(r.bar ? { bar: r.bar } : {}), ...(r.anhorig ? { anhorig: r.anhorig } : {}) }, x: r.x ?? f.x, y: r.y ?? f.y, nyckel: gastNyckel(f.klan, r.namn), pot: { styrka: r.st.styrka, uthallighet: r.st.uthallighet, mod: r.st.mod, smidighet: r.st.smidighet }, skill: { narstrid: ov, traff: ov } });
        gastVapenSatt(s, p, r.vapen); // vapnet hen hade är en sak hen bär (steg 10.1.8)
        p.blod = r.blod;
        s.people.push(p);
        return p.id;
      });
    }
  }],
  [29, 'v521: örtköket står i tre delar (steg 9.4.3): härden, torkstället och bänken i en rad där örtköket stod', s => {
    for (const t of s.stationer ?? []) if (t.k === 'ortkok' && !t.delar?.length) { const d = delarIRad(t.k, t.x, t.y, t.rot); if (d) t.delar = d; }
  }],
  [30, 'v521: pyntet lerkruka (steg 4.3.4) är inte längre en möbel: varje lerkruka blir en stor lerkruka (steg 9.4.11) på samma plats, med samma ägare och kvalitet', s => {
    for (const t of (s.stationer ?? []).filter(q => q.k === 'kruka')) {
      if (t.kvar <= 0) (s.ting ??= []).push({ id: s.nextTing = (s.nextTing ?? 0) + 1, k: 'lerkruka_stor', c: 1, agare: t.ag ?? 0, x: t.x, y: t.y, ...(t.q !== undefined ? { q: t.q } : {}) }); // ägaren, eller byn (0)
    }
    s.stationer = (s.stationer ?? []).filter(q => q.k !== 'kruka');
  }],
  [31, 'v521: vätskorna i behållare (steg 9.4.14): en fylld vattensäck har vatten i sig, tjäran läggs i stora lerkrukor och salvan och benlimmet i näveraskar som är byns', s => {
    const ting = (s.ting ??= []);
    for (const t of ting) if (t.fylld) { t.inne = { v: 'vatten', n: 1 }; delete t.fylld; }
    const ny = (k: string, x: number, y: number, v: 'tjara' | 'salva' | 'benlim', n: number) => ting.push({ id: s.nextTing = (s.nextTing ?? 0) + 1, k, c: 1, agare: 0, x, y, inne: { v, n } });
    for (const a of s.stackar ?? []) {
      if (a.k !== 'tjara' && a.k !== 'salva' && a.k !== 'benlim') continue;
      let n = Math.floor(a.n + 1e-9);
      while (n > 0) { const d = a.k === 'tjara' ? Math.min(10, n) : 1; ny(a.k === 'tjara' ? 'lerkruka_stor' : 'naverask', a.x, a.y, a.k, d); n -= d; }
      a.n = 0;
    }
    s.stackar = (s.stackar ?? []).filter(a => a.n > 1e-9 || (a.k !== 'tjara' && a.k !== 'salva' && a.k !== 'benlim'));
  }],
  [32, 'v522: färdigheten Odling (steg 9.7.7) börjar på noll', s => { for (const p of s.people) p.skill.odling ??= 0; }],
  [33, 'v523: rättens hållbarhet är medelvärdet av ingrediensernas (steg 9.6.7): en rätt som höll länge (_l) håller tio dygn', s => {
    const nytt = (k: string) => /^r_\w+_l$/.test(k) ? k.slice(0, -2) + '_h10' : k;
    const gå = (o: unknown): unknown => {
      if (typeof o === 'string') return nytt(o);
      if (ArrayBuffer.isView(o)) return o;
      if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) o[i] = gå(o[i]); return o; }
      if (o && typeof o === 'object') { const r = o as Record<string, unknown>; for (const k of Object.keys(r)) { const v = gå(r[k]), n = nytt(k); if (n !== k) delete r[k]; r[n] = v; } }
      return o;
    };
    gå(s);
  }],
  [34, 'v523: färdigheten Djurskötsel (steg 9.8.1) börjar på noll', s => { for (const p of s.people) p.skill.skotsel ??= 0; }],
  [35, 'v524: stolpen och skjulen tas bort (steg 9.2.137): skjulen och stolparna rivs, veden i stolparna kommer tillbaka, och Byggplanen planerar torkhuset och vedboden på nytt som vanliga hus', s => {
    const skjul = new Set((s.hus ?? []).filter(h => (h as { skjul?: 1 }).skjul).map(h => h.id));
    let ved = 0;
    for (const b of s.byggen ?? []) if (b.m === 'stolpe' || (b.hus !== undefined && skjul.has(b.hus))) ved += b.mat ?? 0;
    s.byggen = (s.byggen ?? []).filter(b => b.m !== 'stolpe' && !(b.hus !== undefined && skjul.has(b.hus)));
    s.hus = (s.hus ?? []).filter(h => !skjul.has(h.id));
    s.byggV = (s.byggV ?? 0) + 1; s.byggBehov = undefined;
    if (ved >= 1) put(s, 'ved', Math.floor(ved));
  }],
  [36, 'v525: striderna sker på kartan (system 10.1). Strider som pågick på det gamla sättet (uppspelade vid sidan av kartan) avbryts, de sparade striderna för arenan tas bort, och ett rövargäng på kartan fortsätter efter det nya förloppet', s => {
    const o = s as unknown as Record<string, unknown>;
    delete o.strider; delete o.djurStrider;
    for (const f of rovarFlockar(s)) if (f) delete (f as unknown as Record<string, unknown>).strid;
    for (const p of s.people) { delete p.framme; if (p.task?.act === 'strid' && !s.kartStrider?.length) p.task.until = Math.min(p.task.until, s.now); }
  }],
  [37, 'v527: timret är virke (steg 10.2.70): väggarna står kvar, och det som burits till en timmervägg räknas om från ved till virke (5 ved är 1 virke)', s => {
    for (const b of s.byggen ?? []) if (b.m === 'timmer') { b.mat = Math.min(MATERIAL.timmer!.n, Math.round(b.mat / 5)); if (b.lm !== undefined) b.lm = Math.round(b.lm / 5); }
  }],  [38, 'v527: örtköket, bakugnen och rökeriet har egna eldar (steg 10.2.85): en deg som står i ugnen och det som hänger i rökeriet får en eld som brinner, så att de blir klara som förut', s => {
    for (const t of s.stationer ?? []) {
      if (t.deg) t.eld = { ved: 1, lit: 1 };
      if (t.k === 'rokeri' && t.tork?.length) { for (const q of t.tork) q.rok = s.now - q.t; t.eld = { ved: 2, lit: 1 }; }
    }
  }],  [39, 'v527: trägolvet läggs av plankor (steg 10.2.90): det som burits till ett trägolv räknas om från ved till plankor (2 ved är 1 planka), och ett trägolv som inte är lagt än blir jordgolv när ingen kan göra plankor', s => {
    const kan = (s.people ?? []).some(p => (p.tek?.klyvplats ?? 0) >= 1);
    for (const b of s.byggen ?? []) if (b.m === 'tra') {
      if (b.b < 1 && !kan) { b.m = 'jord'; b.mat = 0; b.lm = undefined; continue; }
      b.mat = Math.min(1, Math.round(b.mat / 2)); if (b.lm !== undefined) b.lm = Math.min(1, Math.round(b.lm / 2));
    }
  }],
  [40, 'v528: buden bär ett värde (steg 10.3.1): varje antaget bud blir raden, utan värde, och tiden tron grundades som tiden det antogs', s => {
    for (const tr of s.tron ?? []) if (tr.bud) tr.bud = (tr.bud as unknown[]).map(b => typeof b === 'string' ? { id: b as import('./kyrka').BudId, t: tr.t } : b as import('./kyrka').AntagetBud);
  }],
  [41, 'v528: ritualerna är bud (steg 10.3.3): trons högtider blir bud som redan antagits, med formen efter skalan Fest – Försakelse', s => {
    for (const tr of s.tron ?? []) {
      if (tr.slut !== undefined || ((tr as { niva?: number }).niva ?? 0) < 2 || tr.bud?.some(b => b.id === 'hogtid')) continue;
      const n = hogtider(tr);
      for (let ai = 0; ai < 4; ai++) if ((tr.id + ai) % 4 < n) (tr.bud ??= []).push({ id: 'hogtid', v: hogtidVarde(ai, hogtidForm(tr)), t: tr.t });
    }
  }],
  [42, 'v528: den dödes saker är bud (steg 10.3.5): en tro långt åt Livet efter, som redan gav gravgåvor, får budet Gravgåvor', s => {
    for (const tr of s.tron ?? []) if (tr.slut === undefined && (tr.sk?.livet ?? 0) >= 60 && !tr.bud?.some(b => b.id === 'gravgava')) (tr.bud ??= []).push({ id: 'gravgava', t: tr.t });
  }],
  [43, 'v528: trons tyngd (steg 10.3.8): den sparade nivån tas bort, tyngden räknas när någon frågar', s => {
    for (const tr of s.tron ?? []) delete (tr as { niva?: number }).niva;
  }],
  [44, 'v528: den heliga platsen är ett bud (steg 10.3.10): trons platser blir antagna bud oavsett tyngd', s => {
    for (const h of s.heliga ?? []) {
      const tr = s.tron?.find(q => q.id === h.tro), v = `${h.x},${h.y}`;
      if (tr && !h.skandad && !tr.bud?.some(b => b.id === 'helig' && b.v === v)) (tr.bud ??= []).push({ id: 'helig', v, t: h.t });
    }
  }],
  [45, 'v528: prästens bud (steg 10.3.11): den slumpade regeln om vem som får bli präst blir ett antaget bud, och en tro med präst har budet om dräkten', s => {
    for (const tr of s.tron ?? []) {
      const r = (tr as { prastRegel?: string }).prastRegel; delete (tr as { prastRegel?: string }).prastRegel;
      if (tr.slut !== undefined) continue;
      if (r === 'k' || r === 'm') (tr.bud ??= []).push({ id: r === 'k' ? 'prastKvinna' : 'prastMan', t: tr.t });
      if (tr.prast !== undefined && !tr.bud?.some(b => b.id === 'drakt')) (tr.bud ??= []).push({ id: 'drakt', t: tr.t });
    }
  }],
  [46, 'v528: prästen är ett bud (steg 10.3.12): en tro med levande präst har budet Tron ska ha en präst', s => {
    for (const tr of s.tron ?? []) {
      const pr = tr.prast !== undefined ? s.people.find(p => p.id === tr.prast) : undefined;
      if (tr.slut === undefined && pr && pr.died === undefined && pr.tro === tr.id && !tr.bud?.some(b => b.id === 'prast')) (tr.bud ??= []).push({ id: 'prast', t: tr.t });
    }
  }],
  [47, 'v528: Inget kött på heliga dagar förbjuder inte längre slakten (steg 10.3.16), så lagen ur budet finns inte', s => {
    if (s.styre?.lagar) s.styre.lagar = s.styre.lagar.filter(l => l.id !== 'bud_kottHelg');
  }],
  [48, 'v528: kyrkans förråd är saker i lagret som tron äger (steg 10.3.17); talen läggs ut som hela saker, och en död tros blir byns', s => {
    for (const tr of s.tron ?? []) {
      for (const [k, v] of Object.entries(tr.forrad ?? {})) { const n = Math.floor(v + 1e-9); if (n >= 1) put(s, k, n, tr.slut === undefined ? { [kyrkaId(tr.id)]: n } : undefined); }
      delete tr.forrad;
    }
  }],
  [49, 'v528: trons hus byggs (steg 10.3.19): ett gammalt hov eller tempel blir en klar plan som byggs från början, och ingen bygger längre hovet', s => {
    for (const tr of s.tron ?? []) {
      if ((tr.hov || tr.tempel) && tr.slut === undefined) {
        const pl = (tr.plan ??= {});
        pl.storlek ??= 'lagom'; pl.form ??= 'kvadrat'; pl.altare ??= 'ja'; pl.gudabild ??= tr.gudabild ? 'ja' : 'nej'; pl.bank ??= 'nej';
        if (TROSHUS_DELAR.vagg.fragas?.(s, tr)) pl.vagg ??= vaggSorter(s)[0];
        tr.planRutor ??= planRutor(s, tr, pl.storlek); tr.planVuxna ??= vuxnaTroende(s, tr).length;
        for (const d of ['gudabild', 'bank'] as const) if (pl[d] === 'nej') (tr.planNej ??= {})[d] ??= { pa: Math.sign(TROSHUS_DELAR[d].passar(s, tr, 'ja')), golv: 0 }; // tas upp igen när huset står (steg 10.3.21)
      }
      delete tr.hov; delete tr.tempel; delete tr.gudabild;
    }
    for (const p of s.people) if ((p.task?.act as string | undefined) === 'hovbygge') p.task = undefined;
  }],
  [50, 'v529: gravarna blir jordhögar som får sin vård av den som minns den döda (steg 10.4.2), ledaren nu har varit ledare, och trons gravplats blir ett bud (steg 10.4.6)', s => {
    for (const g of s.gravar ?? []) if ((g.stil as string) === 'hog') g.stil = 'jord';
    const l = s.styre?.ledare !== undefined ? s.people.find(p => p.id === s.styre!.ledare) : undefined; if (l) l.ledde = true;
    // trons gravplats blir ett bud (steg 10.4.6), och platsen den redan har behåller sina gravar
    const BUDET = { helig: ['gravHelig', 'helig'], vatten: ['gravSjo', 'sjo'], bryn: ['gravBryn', 'bryn'], by: ['gravNara', 'nara'] } as const;
    for (const tr of s.tron ?? []) {
      if (!tr.gravSlag) continue;
      const [bud, k] = BUDET[tr.gravSlag];
      if (!tr.bud?.some(b => b.id === bud)) (tr.bud ??= []).push({ id: bud, t: s.now });
      const pl = s.gravplatser, gl = pl?.[`t${tr.id}`];
      if (pl && gl) { if (k !== 'nara') pl[`t${tr.id}${k}`] ??= gl; delete pl[`t${tr.id}`]; }
      delete tr.gravSlag;
    }
  }],
  [51, 'v530: seden Delning – Ägande tas bort; Sammanhållning flyttar delningen (steg 10.5.1)', s => {
    delete (s.seder.v as Record<string, number>).delning;
    if (s.styre) s.styre.oppna = s.styre.oppna.filter(k => (k as string) !== 'delning');
  }],
  [52, 'v531: skattelagen blir en skatt på rikedomen, och skatten till ledaren och gästabudet tas bort (steg 10.5.3)', s => {
    delete (s as State & { skattLedare?: number }).skattLedare;
    if (s.delning) s.delning = { andel: s.delning.andel };
  }],
  [53, 'v532: minnet av vad handlarna köpt och flaggan handel tas bort; handelsmålet räknas en gång i timmen (steg 10.5.13)', s => {
    delete (s as State & { handlarKopt?: unknown }).handlarKopt;
    if (s.handlare) delete (s.handlare as { kopt?: unknown }).kopt;
    for (const p of s.people) if (p.task) delete (p.task as { handel?: unknown }).handel;
  }],
  [54, 'v530: bonaden tas bort; de som hänger tas ner och skinnet och repet läggs i förrådet (steg 10.2.110)', s => {
    for (const t of s.stationer ?? []) if (t.k === 'bonad' && t.kvar <= 0) { put(s, 'skinn', 1); put(s, 'rep', 1); }
    if (s.stationer) s.stationer = s.stationer.filter(t => t.k !== 'bonad');
    for (const p of s.people) { if (p.tek) delete p.tek.bonad; if (p.task?.act === 'station' && p.task.tool === 'bonad') p.task = undefined; }
  }],
  [55, 'v530: en station ute som ett hus byggts ut över rivs, som när huset byggs ut nu (steg 10.2.77)', s => {
    for (const t of [...(s.stationer ?? [])]) if (!t.inne && delarAv(t).some(q => { for (let y = q.y; y < q.y + q.h; y++) for (let x = q.x; x < q.x + q.w; x++) if (isWall(s, x + 0.5, y + 0.5)) return true; return false; }))
      rivStation(s, t, `${stor(enOrd(stationDef(t.k)!))} ${stationDef(t.k)!.namn.toLowerCase()} revs, eftersom ett hus byggts ut över den.`);
  }],
  [56, 'v531: grannklanerna blir byar i världen (steg 11.2.15)', s => { nyaGrannbyar(s, s.klaner, false); delete s.klaner; }],
  [57, 'v532: priserna finns i raden, de slumpade priserna hos grannbyarna tas bort (steg 11.6.3)', s => { for (const r of s.varld?.rader ?? []) if (r.syn) delete r.syn.pris; }],
  [58, 'v532: prislärdomarna gäller en by i världen, inte en klan (steg 11.6.4)', s => {
    const rad = new Map((s.varld?.rader ?? []).flatMap(r => r.syn ? [[r.syn.id, r.nr] as const] : []));
    const om = (ls: import('./typer').Person['lardomar']) => ls?.filter(l => l.k !== 'pris' || rad.has(l.a)).map(l => l.k === 'pris' ? { ...l, a: rad.get(l.a)! } : l);
    for (const p of s.people) if (p.lardomar) p.lardomar = om(p.lardomar);
    for (const r of s.varld?.rader ?? []) for (const k of r.syn?.personer ?? []) if (k.kropp?.lardomar) k.kropp.lardomar = om(k.kropp.lardomar);
  }],
  [59, 'v533: världen får sina silvergruvor (steg 11.10.1)', s => { const v = varldMark(s); if (s.varld && v) laggGruvor(s.varld, v); }], // gruvan har alltid funnits där
  [60, 'v534: örtkökets delar byggs var för sig (steg 12.1.17): ett halvbyggt örtkök har tagit allt material, och arbetet kvar ligger på de sista delarna', s => {
    for (const t of s.stationer ?? []) {
      const dl = stationDef(t.k)?.delar;
      if (!dl || !t.delar?.length || t.kvar <= 0 || t.delar.some(q => q.kvar)) continue;
      let kvar = t.kvar;
      for (let i = t.delar.length - 1; i >= 0 && kvar > 0; i--) { const n = Math.min(kvar, (dl[i]?.min ?? 1) * MIN); t.delar[i].kvar = n; t.delar[i].mat = 1; kvar -= n; }
    }
  }],
  [61, 'v535: påbuden görs om (steg 12.1.27): Skriv ner lagarna och Fängelse finns inte längre, och frågorna om påbud som väntar har det gamla formatet (de tas upp igen)', s => {
    const st = s.styre;
    if (!st) return;
    if (st.pabud) { const pb = st.pabud as Record<string, number>; delete pb.lagskrift; delete pb.fangelse; }
    if (st.fragor) st.fragor = st.fragor.filter(f => f.f !== 'pabud');
  }],
];
export const SPARVERSION = UPPGRADERINGAR[UPPGRADERINGAR.length - 1][0];
export function migrate(s: State) { return simulera(() => uppgradera(s)); }
function uppgradera(s: State) {
  if ((s.v ?? 1) < ALDSTA_SPARNING) throw new ForGammalBy(s.v ?? 1);
  { const g = s as State & { tabun?: unknown; tabuAkt?: unknown }; delete g.tabun; delete g.tabuAkt; } // tabun togs bort (steg 10.2.41)
  if (s.stationer?.some(t => (t.k as string) === 'vaggbrade')) s.stationer = s.stationer.filter(t => (t.k as string) !== 'vaggbrade'); // väggbrädet togs bort (steg 10.2.47)
  for (const p of s.people) if (p.tek?.vaggbrade !== undefined) delete p.tek.vaggbrade;
  for (const p of s.people) delete (p as { sickUntil?: number }).sickUntil; // den gamla sjukklockan (före steg 9.5.1) togs bort (steg 12.1.91)
  if (s.plockat) for (const k in s.plockat) if (k.startsWith('ho:')) delete s.plockat[k]; // hötuvorna finns inte: höet är gräset (steg 10.10.9)
  useMap(s);
  if (behoverStorreKarta(s)) storreKarta(s); // först av allt, innan något räknats på den gamla kartan (steg 2.10.9, kartflytt.ts)
  for (const [n, , gor] of UPPGRADERINGAR) if ((s.v ?? 1) < n) { gor(s); s.v = n; }
  return s;
}
export function pair(s: State, a: Person, b: Person, silent = false) {
  a.partner = b.id; b.partner = a.id;
  const r = getRel(s, a, b); r.op = Math.max(r.op, 55); r.rom = Math.max(r.rom, 75);
  r.par = s.now; r.gift = silent ? s.now : undefined; // de som kommer som par (de första och de som vandrar in) är redan gifta (steg 3.1.1)
  if (!silent) {
    log(s, `${a.name} och ${b.name} blev ett par.`, 'rel', [a.id, b.id]);
    tanke(a, 'tillsammans', s.now, { namn: b.name });
    tanke(b, 'tillsammans', s.now, { namn: a.name });
  }
}
