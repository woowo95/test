import { kartKampe } from './stridbild';
import { hp, gastLever, gastTingOf, TEK, HANDEL, HANDLAR_UTR, byId, gillar, handlarPerson, foddNar, gastLiv, gastNyckel, handlarFas, handlarPlats, rovarPlats, rovarna, klanById, grundvarde, handlarVarde, kgOf, kortTal, rymmer, sakNamn } from '../sim';
import type { ByteMinne, GastLiv, GastRel, Person, Roll, State } from '../sim';
import { iconImg } from '../ikoner';
import { esc } from './hjalp';
import { s, ui } from './lage';

// gästerna (steg 4.5.4.12): de som syns på kartan utan att bo i byn, i dag handlaren och rövarna. Gästen är en person
// (p, steg 9.2.111) och får samma sida som en bybo med alla flikar (steg 9.2.114); här står bara det som är särskilt för
// sorten: raderna i presentationen, bytena, livet i hemklanen och handlarens affärer. En ny sort läggs till som en rad i GASTER
export interface Gast {
  id: number; // negativt, så att det aldrig är en bybos id
  namn: string; sex: 'm' | 'k';
  sort: string; // som yrket hos en bybo
  farg: number; // färgen på cirkeln på kartan
  x: number; y: number; // där hen ritas vid tiden som visas
  gor: string; // vad hen gör just nu (som status hos en bybo)
  fran?: string; // varifrån hen kommer
  rader: { namn: string; varde: string; title: string }[]; // det som är särskilt för sorten
  p: Person; // gästen själv (steg 9.2.114)
  byten?: ByteMinne[]; // bytena hen gjort med byn (steg 4.5.4.17)
  liv: GastLiv; // livet i hemklanen (steg 4.5.7.7, gastliv.ts): familjen, händelserna, humöret och det hen kan
  blod?: number; // blodet kvar (rövarna, 0–1)
  ligger?: boolean; // har fallit i striden (rövarna, steg 6.6.10)
  rovare?: Person; // rövaren själv: ritas som en figur ur skaparen (steg 6.6.12, ui/manniskor.ts), de andra gästerna som en cirkel
  rel?: { p: Person; r: GastRel; g: number }[]; // relationerna till byborna (handlaren, steg 4.5.7.11): g = hur mycket hen gillar bybon, −1 till 1
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
export const rovarGastId = (flock: number, i: number) => ROVAR_ID - flock * 100 - i;
export const GASTER: ((s: State, t: number) => Gast[])[] = [
  // handlaren (steg 4.4.1.2)
  (s, t) => {
    const h = s.handlare;
    if (!h) return [];
    const p = handlarPlats(s, h, t), utr = HANDLAR_UTR[h.utr]?.namn ?? h.utr, ko = h.ko?.length ?? 0;
    return [{
      id: h.id, namn: hp(s, h).name, sex: hp(s, h).sex, sort: 'Handlare', farg: 0x4e6a8a, x: p.x, y: p.y, gor: handlarFas(h), // (platsen i bilden: handlarPlats)
      fran: `${klanById(s, hp(s, h).gast!.klan)?.namn ?? 'en grannklan'} vid ${hp(s, h).gast!.hem!}`,
      rader: [
        { namn: 'Silver', varde: `${iconImg('silver', 12)} ${Math.round(h.silver)}`, title: 'Silvret handlaren har med sig' },
        { namn: 'Packning', varde: `${kortTal(kgOf(h.varor))} / ${rymmer(h)} kg`, title: `${utr}: så mycket bär hen och så mycket rymmer den` },
        ...ko ? [{ namn: 'Kö', varde: String(ko), title: 'Så många står i kö vid filten' }] : [],
        ...h.varor.length ? [{ namn: 'Varor', varde: h.varor.map(w => `<span title="${esc(`${sakNamn(w.k)}: ungefär ${handlarPris(w.k, w.q)} silver styck (hen tar ${Math.round(HANDEL.vinst * 100)} % över värdet)`)}">${iconImg(w.k, 12)}${w.n > 1 ? w.n : ''}</span>`).join(' '), title: 'Det handlaren har i packningen' }] : [],
      ],
      p: hp(s, h),
      byten: (h.bytt ?? []).flatMap(b => b.m ? [b.m] : []),
      liv: livFor(s, hp(s, h).gast!.klan, hp(s, h).name, hp(s, h).sex, 'handlare', hp(s, h).born),
      rel: Object.entries(handlarPerson(s, h)?.rel ?? {}).flatMap(([id, r]) => { const q = byId(s, Number(id)); return q ? [{ p: q, r, g: gillar(s, h, q) }] : []; }),
    }];
  },
  // rövarflocken (steg 4.4.5): rövarna i en klunga där flocken står
  (s, t) => {
    return [s.rovare, ...s.rovareFler ?? []].flatMap(r => {
    if (!r) return [];
    const gor = r.gor === 'samlas' ? 'Samlas i skogen' : r.gor === 'kommer' ? 'På väg mot byn' : r.gor === 'vantar' ? 'Väntar utanför byn' : r.gor === 'slass' ? 'Slåss vid förrådet' : r.gor === 'rotar' ? 'Letar i förråden' : r.gor === 'letar' ? 'Letar hus för hus' : 'Flyr', n = r.folk.length;
    return rovarna(s, r).map((q, i) => {
      const sk = kartKampe(s, q); // i striden på kartan (steg 10.1.14): kämpens läge
      return {
      id: rovarGastId(r.id, i), namn: q.name, sex: q.sex, sort: r.rad ? 'Anfallare' : 'Rövare', farg: 0x5a5040,
      ...rovarPlats(q, t), // var och en går för sig (steg 6.6.9)
      rovare: q, gor: sk ? (sk.k.lage === 'dod' ? 'Död' : sk.ligger ? 'Ligger nere' : sk.k.lage === 'flykt' ? 'Flyr' : 'Slåss vid förrådet') : gor, ligger: sk?.ligger,
      fran: klanById(s, r.klan)?.namn,
      rader: [{ namn: 'Flocken', varde: `${n} rövare`, title: `En av ${n} i flocken` },
        // det hen bär (steg 10.1.8): vapnet i handen och resten, som saker
        ...gastTingOf(s, q).length ? [{ namn: 'Bär', varde: gastTingOf(s, q).map(t => `<span title="${esc(sakNamn(t.k))}${t.hos === q.id ? ' (i handen)' : t.bar === q.id ? ' (på sig)' : ''}">${iconImg(t.k, 12)}</span>`).join(' '), title: 'Vapnen och kläderna hen bär' }] : [],
        ...Object.keys(q.gast?.bar ?? {}).length ? [{ namn: 'Bytet', varde: Object.entries(q.gast!.bar!).map(([k, m]) => `${iconImg(k, 12)}${m > 1 ? m : ''}`).join(' '), title: 'Det hen tagit ur byns förråd' }] : [], // bytet (steg 6.6.11)
        ...q.gast?.anhorig ? [{ namn: 'Hämnas', varde: esc(q.gast.anhorig), title: 'Anhörig till den som hämnas (steg 8.8.4)' }] : []],
      p: q, liv: livFor(s, r.klan, q.name, q.sex, 'rovare', q.born), blod: q.blod, // anhörig till den som hämnas (steg 8.8.4)
      };
    });
    });
  },
  // främlingen som kommer gående (steg 9.2.115, framling i liv.ts)
  s => s.people.filter(p => p.gast?.sort === 'framling' && gastLever(p)).map(p => {
    const g = p.gast!, k = klanById(s, g.klan);
    return {
      id: p.id, namn: p.name, sex: p.sex, sort: 'Främling', farg: 0x6a7a4e, ...rovarPlats(p, ui.nu), p, // där hen syns i bilden (steg 10.2.19)
      gor: g.fas === 'pratar' ? 'Pratar med ledaren' : g.fas === 'gar' ? 'Går vidare' : 'På väg mot byn',
      fran: k ? `${k.namn} vid ${k.hem}` : undefined,
      rader: g.tek ? [{ namn: 'Kan', varde: esc(TEK[g.tek]?.namn ?? g.tek), title: 'Det främlingen kan som ingen i byn kan' }] : [],
      liv: livFor(s, g.klan, p.name, p.sex, 'gast', p.born),
    };
  }),
];
export const gaster = (t = ui.nu) => GASTER.flatMap(f => f(s, t));
export const gastById = (id: number | undefined) => id !== undefined && id < 0 ? gaster().find(g => g.id === id) : undefined;
// för sidan: html för en gästs rader
export const gastRad = (r: Gast['rader'][number]) => `<dt title="${esc(r.title)}">${esc(r.namn)}</dt><dd title="${esc(r.title)}">${r.varde}</dd>`;
