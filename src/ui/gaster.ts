import { HANDEL, HANDLAR_UTR, VAPEN, foddNar, gastLiv, gastNyckel, handlarFas, handlarPlats, klanById, grundvarde, handlarVarde, kgOf, kortTal, rymmer, sakNamn } from '../sim';
import type { ByteMinne, GastLiv, Roll, Skill, Stat, State } from '../sim';
import { iconImg } from '../ikoner';
import { esc } from './hjalp';
import { s, ui } from './lage';

// gästerna (steg 4.5.4.12): de som syns på kartan utan att bo i byn, i dag handlaren och rövarna. De väljs som en bybo och
// får samma sida (personfliken) med de flikar som finns för dem. Det som är särskilt för en sort står som rader i
// presentationen (rader). Ett register: en ny sort (besökare, främlingar) läggs till som en rad i GASTER
export interface Gast {
  id: number; // negativt, så att det aldrig är en bybos id
  namn: string; sex: 'm' | 'k';
  sort: string; // som yrket hos en bybo
  farg: number; // färgen på cirkeln på kartan
  x: number; y: number; // där hen ritas vid tiden som visas
  gor: string; // vad hen gör just nu (som status hos en bybo)
  fran?: string; // varifrån hen kommer
  rader: { namn: string; varde: string; title: string }[]; // det som är särskilt för sorten
  stats: Partial<Record<Stat, number>>; skills: Partial<Record<Skill, number>>; // det man vet om hen (0–20)
  bar: { ikon: string; text: string; title: string }[]; // det hen bär (utrustningen)
  handelser: string[]; // som en bybos viktiga händelser
  byten?: ByteMinne[]; // bytena hen gjort med byn (steg 4.5.4.17)
  liv: GastLiv; // livet i hemklanen (steg 4.5.7.7, gastliv.ts): familjen, händelserna, humöret och det hen kan
  blod?: number; // blodet kvar (rövarna, 0–1)
}
// gästens liv, räknat ur byns frö och hens namn och klan (drar ingen slump)
const livFor = (s: State, klan: number | undefined, namn: string, sex: 'm' | 'k', roll: Roll, fodd: number | undefined) => {
  const k = klanById(s, klan), nyckel = gastNyckel(klan, namn);
  return gastLiv(s.seed, nyckel, namn, sex, roll, k?.namn ?? (roll === 'rovare' ? 'en rövarflock' : 'en grannklan'), k?.hem ?? 'skogarna', fodd ?? foddNar(s.seed, nyckel, roll, s.now), s.now);
};
// handlarens pris i silver för en vara (det hen värderar den till, handlarVarde i handel.ts)
export const handlarPris = (k: string, q?: number) => Math.max(1, Math.round(grundvarde(k) * handlarVarde(s, s.handlare!, k) * (q === undefined ? 1 : 0.6 + 0.2 * q)));
// rövarnas id: under handlarnas (-1, -2 …), en plats per rövare i flocken
const ROVAR_ID = -1e6;
export const GASTER: ((s: State, t: number) => Gast[])[] = [
  // handlaren (steg 4.4.1.2)
  (s, t) => {
    const h = s.handlare;
    if (!h) return [];
    const p = handlarPlats(h, t), utr = HANDLAR_UTR[h.utr]?.namn ?? h.utr, ko = h.ko?.length ?? 0;
    return [{
      id: h.id, namn: h.namn, sex: h.sex, sort: 'Handlare', farg: 0x4e6a8a, x: p.x, y: p.y, gor: handlarFas(h),
      fran: `${klanById(s, h.klan)?.namn ?? 'en grannklan'} vid ${h.hem}`,
      rader: [
        { namn: 'Silver', varde: `${iconImg('silver', 12)} ${Math.round(h.silver)}`, title: 'Silvret handlaren har med sig' },
        { namn: 'Packning', varde: `${kortTal(kgOf(h.varor))} / ${rymmer(h)} kg`, title: `${utr}: så mycket bär hen och så mycket rymmer den` },
        ...ko ? [{ namn: 'Kö', varde: String(ko), title: 'Så många står i kö vid filten' }] : [],
      ],
      stats: {}, skills: { handel: h.handel },
      bar: [{ ikon: 'ryggsack', text: utr, title: `${utr}, rymmer ${rymmer(h)} kg` },
        ...h.varor.map(w => ({ ikon: w.k, text: `${w.n > 1 ? `${w.n} ` : ''}${handlarPris(w.k, w.q)}${iconImg('silver', 12)}`, title: `${sakNamn(w.k)}: ungefär ${handlarPris(w.k, w.q)} silver styck (hen tar ${Math.round(HANDEL.vinst * 100)} % över värdet)` }))],
      handelser: (h.bytt ?? []).filter(b => !b.m).reverse().map(b => `Bytte med ${b.vem}: ${b.fick} mot ${b.gav}`), // från före v271
      byten: (h.bytt ?? []).flatMap(b => b.m ? [b.m] : []),
      liv: livFor(s, h.klan, h.namn, h.sex, 'handlare', h.fodd),
    }];
  },
  // rövarflocken (steg 4.4.5): rövarna i en klunga där flocken står
  s => {
    const r = s.rovare;
    if (!r) return [];
    const gor = r.gor === 'samlas' ? 'Samlas i skogen' : r.gor === 'kommer' ? 'På väg mot byn' : 'Flyr', n = r.folk.length;
    return r.folk.map((q, i) => ({
      id: ROVAR_ID - r.id * 100 - i, namn: q.namn, sex: q.sex, sort: 'Rövare', farg: 0x5a5040,
      x: r.x + (i % 3) * 0.7 - 0.7, y: r.y + Math.floor(i / 3) * 0.7, gor, fran: klanById(s, r.klan)?.namn,
      rader: [{ namn: 'Flocken', varde: `${n} rövare`, title: `En av ${n} i flocken` }],
      stats: { styrka: q.st.styrka, uthallighet: q.st.uthallighet, mod: q.st.mod, smidighet: q.st.smidighet }, skills: { narstrid: q.st.skicklighet },
      bar: [{ ikon: q.vapen, text: VAPEN[q.vapen].namn, title: `Vapnet: ${VAPEN[q.vapen].namn.toLowerCase()}` }],
      handelser: [], liv: livFor(s, r.klan, q.namn, q.sex, 'rovare', q.fodd), blod: q.blod,
    }));
  },
];
export const gaster = (t = ui.nu) => GASTER.flatMap(f => f(s, t));
export const gastById = (id: number | undefined) => id !== undefined && id < 0 ? gaster().find(g => g.id === id) : undefined;
// för sidan: html för en gästs rader
export const gastRad = (r: Gast['rader'][number]) => `<dt title="${esc(r.title)}">${esc(r.namn)}</dt><dd title="${esc(r.title)}">${r.varde}</dd>`;
