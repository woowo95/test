// ---------- vilsegången (steg 11.8.6, Flera samhällen: Uppdragen i tal) ----------
// Ett sällskap från byn som inte kommit hem när det borde (väntad tid gånger VILSEGANG.sen) är saknat. En anhörig hemma (partnern,
// en förälder, ett barn eller ett syskon) utlyser då vilsegången: hen lägger undan en belöning ur det hen har över (det hen äger i
// förrådet utom maten, silvret först, i hela saker, för så stor del av värdet som VILSEGANG.andel, utlysa.ts) och vet själv om uppdraget,
// som sedan sprids i samtal. Platsen är målet för den saknades resa: den som letar går samma väg, och väger det som mål som andra
// uppdrag. Att hitta den saknade sker längs vägen: när ett av byns sällskap som känner till vilsegången är på samma ruta som den
// saknade under samma timme (vagmote.ts) är hen hittad. Lever någon får de saknade vägen visad och vänder hem; är alla döda kommer
// beskedet hem med dem som hittade dem. Finnaren får belöningen i packningen och vänder hem. Hittas ingen tar uppdraget slut av
// sin tid (UPPDRAGTAL.vilseTid) och belöningen går tillbaka till den anhöriga
import { balans } from './balans';
import { count, isKin, living } from './folk';
import { put } from './lager';
import { laggUndan, overVarde, styretNod } from './utlysa';
import { dagbok, hittadDod, resenarer, resenarNamn, sakLista, SAKNADKROK, Sallskap, sallskapFor, vandHem, vantadDygn } from './resa';
import { avslutaUppdrag, belonVarde, larUppdrag, uppdragen, utlys, type Utlyst } from './uppdrag';
import { radTar } from './priser';
import { radNr } from './radtal';
import type { Varlden } from './varlden';
import { DAY, Person, State } from './typer';

export const VILSEGANG = balans('vilsegang', {
  sen: 1.5, // ett sällskap är saknat när det varit borta så många gånger den väntade tiden
  andel: 0.3, // så stor del av värdet av det den anhöriga har över läggs undan som belöning
  styre: 40, // det styret tycker att det är värt att hitta den som ingen anhörig saknar (grundvärde, före UTLYSA.styre)
});

const narstaende = (p: Person, q: Person) => p.partner === q.id || q.partner === p.id || isKin(p, q);
// den anhöriga hemma som utlyser: den som har mest över
function anhorig(s: State, sl: Sallskap): Person | undefined {
  const medl = sl.medl.map(id => s.people.find(q => q.id === id)).filter(Boolean) as Person[];
  const kan = living(s).filter(p => !p.gast && !sl.medl.includes(p.id) && !sallskapFor(s.varld, p.id) && medl.some(q => narstaende(p, q)));
  return kan.sort((a, b) => overVarde(s, b) - overVarde(s, a) || a.id - b.id)[0];
}
const vilseFor = (s: State, id: number) => uppdragen(s.varld!).find(u => u.k === 'vilsegang' && u.om === id);

// var tionde minut för varje sällskap på vägen (resa.ts): är det saknat, utlyser en anhörig vilsegången en gång
SAKNADKROK.koll = (s, sl) => {
  const vl = s.varld;
  if (!vl || sl.by !== vl.huvud || sl.vilse || s.now - sl.borjan < VILSEGANG.sen * Math.max(1, vantadDygn(s, sl)) * DAY) return;
  sl.vilse = 1; // saknat: vägs bara en gång
  const p = anhorig(s, sl);
  if (!p) { styretNod(vl, { k: 'vilsegang', mal: sl.mal, om: sl.id, varde: VILSEGANG.styre, t: s.now }); count(s, 'vilse ingen'); return; } // ingen anhörig hemma: styret kan utlysa (steg 11.8.12)
  const belon = laggUndan(s, p, VILSEGANG.andel * overVarde(s, p));
  const u = utlys(vl, 'vilsegang', sl.mal, { k: 'anhorig', person: p.id }, belon, s.now, { om: sl.id });
  if (!u) { for (const [k, n] of Object.entries(belon)) put(s, k, n, { [p.id]: n }); return; } // målet är ingen plats i världen: belöningen tillbaka
  larUppdrag(s, p, u.id, 1, { t: s.now, v: belonVarde(u), mal: u.mal, k: 'vilsegang' });
  count(s, 'vilse utlyst');
};

// två av byns sällskap på samma ruta under timmen (vagmote.ts): den som letar hittar den saknade
SAKNADKROK.mots = (s, a, b, t) => { hitta(s, a, b, t) || hitta(s, b, a, t); };
const kanner = (s: State, sl: Sallskap, id: number) => sl.uppdrag === id || resenarer(s, sl).some(p => p.lardomar?.some(l => l.k === 'uppdrag' && l.a === id));
// den saknade är hittad av finnare: lever någon får de vägen visad och vänder hem, annars kommer beskedet hem; belöningen ges
function hittad(s: State, vl: Varlden, u: Utlyst, vilse: Sallskap, finnare: string, t: number): Record<string, number> {
  const levande = resenarer(s, vilse).length;
  if (levande) {
    vilse.forlorat = 0;
    dagbok(s, vilse, 'uppdrag', `${finnare} hittade sällskapet och visade vägen hem.`, t);
    if (vilse.skede === 'ute' || vilse.skede === 'framme') vandHem(s, vilse);
  } else hittadDod(s, vilse, finnare);
  const fick = { ...u.belon };
  u.belon = {};
  avslutaUppdrag(s, vl, u, true);
  count(s, levande ? 'vilse hittad' : 'vilse hittad död');
  return fick;
}
export function hitta(s: State, finn: Sallskap, vilse: Sallskap, t: number): boolean {
  const vl = s.varld, u = vl && vilseFor(s, vilse.id);
  if (!vl || !u || !resenarer(s, finn).length || !kanner(s, finn, u.id)) return false;
  const dod = !resenarer(s, vilse).length, namn = resenarNamn(s, vilse), fick = hittad(s, vl, u, vilse, resenarNamn(s, finn), t);
  for (const [k, n] of Object.entries(fick)) if (n >= 1) finn.pack[k] = (finn.pack[k] ?? 0) + n;
  finn.utfall = { namn: 'Vilsegången', hur: 'klart', fick };
  dagbok(s, finn, 'uppdrag', `Hittade ${namn}${dod ? ' döda' : ''} vid leden. Belöningen: ${sakLista(fick) || 'ingen'}.`, t);
  if (finn.skede === 'ute' || finn.skede === 'framme') vandHem(s, finn);
  return true;
}
// en färd från en by som budbäraren nått möter den saknade (steg 11.8.13): belöningen följer med färden hem
SAKNADKROK.fard = (s, sl, f, t) => {
  const vl = s.varld, u = vl && vilseFor(s, sl.id), r = vl && radNr(vl, f.fran);
  if (!vl || !u || !r || !u.kand?.includes(f.fran)) return;
  const fick = hittad(s, vl, u, sl, `Folk från ${r.namn}`, t);
  for (const [k, n] of Object.entries(fick)) { if (k === 'silver') f.silver = (f.silver ?? 0) + n; else radTar(r, k, n); }
  count(s, 'vilse hittad av by');
};
