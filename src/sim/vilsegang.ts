// ---------- vilsegången (steg 11.8.6, Flera samhällen: Uppdragen i tal) ----------
// Ett sällskap från byn som inte kommit hem när det borde (väntad tid gånger VILSEGANG.sen) är saknat. En anhörig hemma (partnern,
// en förälder, ett barn eller ett syskon) utlyser då vilsegången: hen lägger undan en belöning ur det hen har över (det hen äger i
// förrådet utom maten, silvret först, i hela saker, för så stor del av värdet som VILSEGANG.andel) och vet själv om uppdraget,
// som sedan sprids i samtal. Platsen är målet för den saknades resa: den som letar går samma väg, och väger det som mål som andra
// uppdrag. Att hitta den saknade sker längs vägen: när ett av byns sällskap som känner till vilsegången är på samma ruta som den
// saknade under samma timme (vagmote.ts) är hen hittad. Lever någon får de saknade vägen visad och vänder hem; är alla döda kommer
// beskedet hem med dem som hittade dem. Finnaren får belöningen i packningen och vänder hem. Hittas ingen tar uppdraget slut av
// sin tid (UPPDRAGTAL.vilseTid) och belöningen går tillbaka till den anhöriga
import { balans } from './balans';
import { count, isKin, living } from './folk';
import { ownedStock, put, use } from './lager';
import { dagbok, hittadDod, resenarer, resenarNamn, SAKNADKROK, Sallskap, sallskapFor, vandHem, vantadDygn } from './resa';
import { isFood } from './saker';
import { avslutaUppdrag, belonVarde, larUppdrag, uppdragen, utlys } from './uppdrag';
import { grundvarde } from './varde';
import { DAY, Person, State } from './typer';

export const VILSEGANG = balans('vilsegang', {
  sen: 1.5, // ett sällskap är saknat när det varit borta så många gånger den väntade tiden
  andel: 0.3, // så stor del av värdet av det den anhöriga har över läggs undan som belöning
});

// det p har över: det hen äger i förrådet utom maten, i grundvärde
export function harOver(s: State, p: Person): [string, number][] {
  return Object.entries(ownedStock(s, p)).filter(([k, n]) => !isFood(k) && Math.floor(n) >= 1 && grundvarde(k) > 0).map(([k, n]) => [k, Math.floor(n)] as [string, number]);
}
// p lägger undan en belöning ur det hen har över, för andelen av värdet: silvret först, sedan det som är värt mest, i hela saker
export function laggUndan(s: State, p: Person, andel: number): Record<string, number> {
  const over = harOver(s, p), mal = andel * over.reduce((a, [k, n]) => a + n * grundvarde(k), 0), ut: Record<string, number> = {};
  let v = 0;
  for (const [k, n] of over.sort((a, b) => (b[0] === 'silver' ? 1 : 0) - (a[0] === 'silver' ? 1 : 0) || grundvarde(b[0]) - grundvarde(a[0]) || a[0].localeCompare(b[0]))) {
    const m = Math.min(n, Math.floor((mal - v) / grundvarde(k)));
    if (m < 1) continue;
    use(s, undefined, k, m, true, p.id);
    ut[k] = m; v += m * grundvarde(k);
  }
  return ut;
}

const narstaende = (p: Person, q: Person) => p.partner === q.id || q.partner === p.id || isKin(p, q);
// den anhöriga hemma som utlyser: den som har mest över
function anhorig(s: State, sl: Sallskap): Person | undefined {
  const medl = sl.medl.map(id => s.people.find(q => q.id === id)).filter(Boolean) as Person[];
  const kan = living(s).filter(p => !p.gast && !sl.medl.includes(p.id) && !sallskapFor(s.varld, p.id) && medl.some(q => narstaende(p, q)));
  const varde = (p: Person) => harOver(s, p).reduce((a, [k, n]) => a + n * grundvarde(k), 0);
  return kan.sort((a, b) => varde(b) - varde(a) || a.id - b.id)[0];
}
const vilseFor = (s: State, id: number) => uppdragen(s.varld!).find(u => u.k === 'vilsegang' && u.om === id);

// var tionde minut för varje sällskap på vägen (resa.ts): är det saknat, utlyser en anhörig vilsegången en gång
SAKNADKROK.koll = (s, sl) => {
  const vl = s.varld;
  if (!vl || sl.by !== vl.huvud || sl.vilse || s.now - sl.borjan < VILSEGANG.sen * Math.max(1, vantadDygn(s, sl)) * DAY) return;
  sl.vilse = 1; // saknat: vägs bara en gång
  const p = anhorig(s, sl);
  if (!p) { count(s, 'vilse ingen'); return; }
  const belon = laggUndan(s, p, VILSEGANG.andel);
  const u = utlys(vl, 'vilsegang', sl.mal, { k: 'anhorig', person: p.id }, belon, s.now, { om: sl.id });
  if (!u) { for (const [k, n] of Object.entries(belon)) put(s, k, n, { [p.id]: n }); return; } // målet är ingen plats i världen: belöningen tillbaka
  larUppdrag(s, p, u.id, 1, { t: s.now, v: belonVarde(u), mal: u.mal, k: 'vilsegang' });
  count(s, 'vilse utlyst');
};

// två av byns sällskap på samma ruta under timmen (vagmote.ts): den som letar hittar den saknade
SAKNADKROK.mots = (s, a, b, t) => { hitta(s, a, b, t) || hitta(s, b, a, t); };
const kanner = (s: State, sl: Sallskap, id: number) => sl.uppdrag === id || resenarer(s, sl).some(p => p.lardomar?.some(l => l.k === 'uppdrag' && l.a === id));
export function hitta(s: State, finn: Sallskap, vilse: Sallskap, t: number): boolean {
  const vl = s.varld, u = vl && vilseFor(s, vilse.id);
  if (!vl || !u || !resenarer(s, finn).length || !kanner(s, finn, u.id)) return false;
  const finnare = resenarNamn(s, finn), levande = resenarer(s, vilse).length;
  if (levande) {
    vilse.forlorat = 0;
    dagbok(s, vilse, 'uppdrag', `${finnare} hittade sällskapet och visade vägen hem.`, t);
    if (vilse.skede === 'ute' || vilse.skede === 'framme') vandHem(s, vilse);
  } else hittadDod(s, vilse, finnare);
  const fick = { ...u.belon };
  u.belon = {};
  avslutaUppdrag(s, vl, u, true);
  for (const [k, n] of Object.entries(fick)) if (n >= 1) finn.pack[k] = (finn.pack[k] ?? 0) + n;
  finn.utfall = { namn: 'Vilsegången', hur: 'klart', fick };
  dagbok(s, finn, 'uppdrag', `Hittade ${resenarNamn(s, vilse)}${levande ? '' : ' döda'} vid leden. Belöningen: ${Object.entries(fick).map(([k, n]) => `${n} ${k}`).join(', ') || 'ingen'}.`, t);
  if (finn.skede === 'ute' || finn.skede === 'framme') vandHem(s, finn);
  count(s, levande ? 'vilse hittad' : 'vilse hittad död');
  return true;
}
