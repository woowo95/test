// Scenariotester: ställ en by i ett visst läge, kör den en stund och kontrollera att det som ska hända händer.
// npm run scenario            kör alla
// npm run scenario -- glanta  kör bara ett
import { createState, step, living, groundOf, getMap, fuelStock, DAY, HOUR, W, State, takenOf, Kind } from '../sim';
import { FOREST, HIGH, isSoil } from '../sim/vag';
import { START } from './kor';

type Koll = [string, boolean];
const kor = (s: State, timmar: number, varje?: (s: State) => void) => { for (let i = 0; i < timmar * 12; i++) { step(s, 300, false); varje?.(s); } };
const logg = (s: State, t: string) => s.log.some(l => l.text.includes(t));
// andel jordrutor med skog, inom eller utanför ett avstånd från elden
function skogsandel(s: State, min: number, max: number) {
  const g = groundOf(s), f = getMap(s.seed).fire;
  let n = 0, sk = 0;
  for (let i = 0; i < g.tiles.length; i++) {
    const d = Math.hypot((i % W) - f.x, Math.floor(i / W) - f.y);
    if (!isSoil(g.tiles[i]) || d < min || d >= max) continue;
    n++; if (g.trees[i] >= FOREST) sk++;
  }
  return n ? sk / n : 0;
}

// genomsnittligt uttag (0 = orört, 1 = tomt) på rutor inom ett avstånd från elden
function uttag(s: State, k: Kind, min: number, max: number) {
  const t = takenOf(s)[k], f = getMap(s.seed).fire;
  let n = 0, v = 0;
  for (let i = 0; i < t.length; i++) { const d = Math.hypot((i % W) - f.x, Math.floor(i / W) - f.y); if (d >= min && d < max) { n++; v += t[i]; } }
  return n ? v / n : 0;
}

const SCENARIER: Record<string, { text: string; kor: () => Koll[] }> = {
  glanta: {
    text: 'Ny by: gläntan finns, skogen står runt omkring och marken nöts till stigar',
    kor: () => {
      const s = createState(11, START);
      const forst: Koll[] = [
        ['gläntan är tom på träd', skogsandel(s, 0, 4) === 0],
        ['skog på nästan all jord utanför gläntan', skogsandel(s, 9, 99) > 0.95],
        ['ingen ved, bara grenar i förrådet', s.wood === 0 && (s.items.grenar ?? 0) > 0],
      ];
      kor(s, 10 * 24);
      const g = groundOf(s);
      let trampat = 0; for (let i = 0; i < g.cover.length; i++) if (isSoil(g.tiles[i]) && g.cover[i] < HIGH) trampat++;
      return [...forst,
        ['gräset har trampats ner till kort gräs eller stigar', trampat > 20],
        ['skogen står kvar runt byn efter 10 dygn', skogsandel(s, 9, 99) > 0.85],
        ['elden har tänts', s.fire.lightings > 0]];
    },
  },
  'ingen-yxa': {
    text: 'Byn hittar ingen flinta: inga träd fälls, elden hålls vid liv med grenar',
    kor: () => {
      const s = createState(12, START);
      kor(s, 30 * 24, s => { if (s.items.flinta) s.items.flinta = 0; });
      return [
        ['ingen yxa', !(s.items.yxa ?? 0)],
        ['inga träd fällda', !(s.fallda ?? 0)],
        ['ingen ved, bara grenar', s.wood === 0 && (s.items.grenar ?? 0) > 0],
        ['ingen dog av kyla', !s.people.some(p => p.cause === 'av kyla')],
        ['byn lever', living(s).length > 0]];
    },
  },
  yxa: {
    text: 'Byn har en yxa: träd fälls, stammarna huggs till ved och det växer högt gräs där träden stod',
    kor: () => {
      const s = createState(13, START);
      s.items.yxa = 1;
      const fallda = new Set<number>();
      let ved = 0;
      kor(s, 10 * 24, s => { ved = Math.max(ved, s.wood); for (const k of s.stockar ?? []) fallda.add(Math.floor(k.y) * W + Math.floor(k.x)); });
      const g = groundOf(s);
      let gras = 0; for (const i of fallda) if (g.trees[i] < FOREST && g.cover[i] >= 0.7) gras++;
      return [
        ['träd har fällts', (s.fallda ?? 0) >= 3],
        ['ved har huggits', ved > 0],
        [`gräs där träden stod (${gras} av ${fallda.size})`, gras > fallda.size / 2],
        ['stammarna huggs upp (högst 2 liggande)', (s.stockar ?? []).length <= 2]];
    },
  },
  'vinter-slocknad': {
    text: 'Istiden börjar med slocknad eld, kolhög men inga pinnar: byn tänder på kolhögen med kol som tändmaterial',
    kor: () => {
      const s = createState(16, START);
      kor(s, 20 * 24 + 23); // till istidens början
      Object.assign(s.fire, { lit: false, fuel: 0, emberUntil: undefined, ash: 3, ashUntil: s.now + 3 * DAY });
      s.wood = 0; s.items.grenar = 30; s.items.pinnar = 0; s.items.kol = 2;
      const kyla = s.people.filter(p => p.cause === 'av kyla').length, t0 = s.now;
      let tand = -1;
      kor(s, 4 * 24, s => { if (tand < 0 && s.fire.lit) tand = (s.now - t0) / HOUR; });
      return [
        ['istid', s.lastAgeIdx === 0],
        [`elden tändes igen (efter ${tand.toFixed(1)} h)`, tand >= 0 && tand < 24],
        ['tänd på den gamla kolhögen', logg(s, 'på den gamla kolhögen')],
        ['ingen dog av kyla', s.people.filter(p => p.cause === 'av kyla').length === kyla],
        ['bränsle kvar eller insamlat', fuelStock(s) >= 0]];
    },
  },
  knapphet: {
    text: 'Bär, rötter och vilt tar slut nära byn för en tid, så invånarna går längre bort; fiske med händerna ger få fiskar per försök',
    kor: () => {
      const s = createState(15, START);
      kor(s, 12 * 24);
      const nara = uttag(s, 'samla', 0, 8), langt = uttag(s, 'samla', 16, 30), st = s.stat ?? {};
      return [
        [`mer plockat nära byn än långt bort (${nara.toFixed(2)} mot ${langt.toFixed(2)})`, nara > 0.05 && nara > langt * 3],
        [`vilt jagat (${uttag(s, 'jakt', 0, 12).toFixed(2)})`, uttag(s, 'jakt', 0, 12) > 0],
        [`fiske: ${st.fiskeForsok ?? 0} försök, ${st.fiskeNapp ?? 0} napp, ${st.fisk ?? 0} fiskar`, (st.fiskeForsok ?? 0) > (st.fiskeNapp ?? 0) && (st.fiskeNapp ?? 0) >= (st.fisk ?? 0)],
        ['ingen svalt ihjäl', !s.people.some(p => p.cause === 'av svält')]];
    },
  },
  svamp: {
    text: 'På hösten plockas kantareller, men ibland följer en giftig orange spindling med; efter förgiftningar lär sig byn skilja dem åt',
    kor: () => {
      const s = createState(16, START);
      kor(s, 21 * 24); // vår, sommar och höst
      const st = s.stat ?? {};
      return [
        [`kantareller plockade (${st.svamp ?? 0})`, (st.svamp ?? 0) > 10],
        [`giftsvamp med i korgen (${st.giftsvamp ?? 0}) eller känd och lämnad (${st.giftsvampKand ?? 0})`, (st.giftsvamp ?? 0) + (st.giftsvampKand ?? 0) > 0],
        [`förgiftningar (${st.forgiftad ?? 0}) ger kunskap (${(s.kunskap?.svamp ?? 0).toFixed(2)})`, !(st.forgiftad ?? 0) || (s.kunskap?.svamp ?? 0) > 0],
        ['byn lever', living(s).length > 0]];
    },
  },
  flinta: {
    text: 'Flinta hittas mest vid stenarna',
    kor: () => {
      let sten = 0, annan = 0;
      for (const seed of [21, 22, 23, 24]) {
        const s = createState(seed, START);
        kor(s, 10 * 24, s => { if (s.items.flinta) s.items.flinta = 0; }); // byn letar hela tiden
        sten += s.stat?.flintaSten ?? 0; annan += s.stat?.flintaAnnan ?? 0;
      }
      return [[`flinta vid stenarna ${sten}, på annat håll ${annan}`, sten > annan && sten > 0]];
    },
  },
};

const val = process.argv[2];
let fel = 0;
for (const [namn, sc] of Object.entries(SCENARIER)) {
  if (val && val !== namn) continue;
  const k = sc.kor(), ok = k.every(([, b]) => b);
  if (!ok) fel++;
  console.log(`${ok ? 'OK  ' : 'FEL '} ${namn}: ${sc.text}`);
  for (const [t, b] of k) if (!ok || !b) console.log(`     ${b ? '✓' : '✗'} ${t}`);
}
if (fel) { console.log(`${fel} scenario misslyckades.`); process.exitCode = 1; }
