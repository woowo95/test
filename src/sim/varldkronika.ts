// ---------- världens krönika (steg 11.2.19, Flera samhällen: Världens krönika) ----------
// Världen har en egen krönika (vl.kronika). Slagen är rader i registret VARLDSHANDELSER: namnet, om händelsen är stor och en
// text med luckor ({by} byn det gäller, {mot} den andra byn, {plats} platsen). De stora raderna sparas för alltid och de små
// har ett tak (VARLDKRONIKA.smaTak): när taket nås försvinner den äldsta lilla. Spelaren ser allt; vad byn har hört (full färg
// eller blekare) och nyheterna som når byn kommer med kunskapen om världen. Händelserna skrivs av raden och världens regler
// (11.3 och senare); här skrivs huvudbyns grundande när världen skapas.
import { balans } from './balans';
import { Varlden } from './varlden';

export interface VarldHandelseDef { namn: string; stor: boolean; text: string }
export const VARLDSHANDELSER = {
  grundad: { namn: 'Grundad', stor: true, text: '{by} grundas' },
  gattUnder: { namn: 'Gått under', stor: true, text: '{by} går under och blir en ruin' },
  delad: { namn: 'Delad', stor: true, text: 'En grupp lämnar {by} och grundar {mot}' },
  nyLedare: { namn: 'Ny ledare', stor: false, text: '{by} får en ny ledare' },
  krig: { namn: 'Krig', stor: true, text: '{by} och {mot} går i krig' },
  fred: { namn: 'Fred', stor: true, text: '{by} och {mot} sluter fred' },
  forbund: { namn: 'Förbund', stor: true, text: '{by} och {mot} sluter förbund' },
  svalt: { namn: 'Svält', stor: false, text: 'Svält i {by}' },
  farsot: { namn: 'Farsot', stor: false, text: 'En farsot går genom {by}' },
  lager: { namn: 'Rövarläger', stor: false, text: 'Hungriga ur {by} slår läger som rövare: {mot}' },
  upplost: { namn: 'Upplöst', stor: false, text: '{by} överges' },
  utpost: { namn: 'Utpost', stor: false, text: '{by} sätter upp utposten {mot} vid {plats}' },
  handelslager: { namn: 'Handelsläger', stor: false, text: '{by} slår upp handelslägret {mot}' },
  rad: { namn: 'Räd', stor: false, text: '{by} gör en räd mot {mot}' },
  karavan: { namn: 'Plundrad karavan', stor: false, text: 'En karavan plundras vid {plats}' },
  platsbygge: { namn: 'Bygge på leden', stor: false, text: '{by} bygger {plats}' },
  uppdrag: { namn: 'Uppdrag', stor: false, text: '{by} sänder ut ett uppdrag till {plats}' },
} as const satisfies Record<string, VarldHandelseDef>;
export type VarldHandelseId = keyof typeof VARLDSHANDELSER;
export const VARLDHANDELSE_IDS = Object.keys(VARLDSHANDELSER) as VarldHandelseId[];

export const VARLDKRONIKA = balans('varldkronika', {
  smaTak: 300, // så många små händelser sparas; de stora sparas alla
});

// en rad i världens krönika: by och mot är radernas nummer, plats platsens
export interface VarldHandelse { nr: number; t: number; k: VarldHandelseId; by?: number; mot?: number; plats?: number }

export function varldHandelse(vl: Varlden, k: VarldHandelseId, t: number, o: { by?: number; mot?: number; plats?: number } = {}): VarldHandelse {
  const kr = vl.kronika ??= [], h: VarldHandelse = { nr: vl.nastaHandelse = (vl.nastaHandelse ?? 0) + 1, t, k, ...o };
  let i = kr.length;
  while (i > 0 && kr[i - 1].t > t) i--; // i tidsordning
  kr.splice(i, 0, h);
  if (!VARLDSHANDELSER[k].stor) {
    let sma = 0;
    for (const x of kr) if (!VARLDSHANDELSER[x.k].stor) sma++;
    if (sma > VARLDKRONIKA.smaTak) kr.splice(kr.findIndex(x => !VARLDSHANDELSER[x.k].stor), 1); // den äldsta lilla
  }
  return h;
}

// texten för en rad, med namnen ur världens rader och platser
export function varldHandelseText(vl: Varlden, h: VarldHandelse): string {
  const rad = (nr?: number) => vl.rader?.find(r => r.nr === nr)?.namn || vl.platser?.find(p => p.by === nr)?.namn || 'en by';
  const plats = (nr?: number) => vl.platser?.find(p => p.nr === nr)?.namn ?? 'en plats';
  const t = VARLDSHANDELSER[h.k].text.replace('{by}', rad(h.by)).replace('{mot}', rad(h.mot)).replace('{plats}', plats(h.plats));
  return t[0].toUpperCase() + t.slice(1);
}
