import { RECEPT } from './recept';
import { Act } from './typer';

// ---------- tillverkningen vid stationerna (steg 7.5–7.7) ----------
// Det som görs av material vid en station och läggs i förrådet, utan att vara ett redskap eller plagg: en rad per sak. Varje rad
// blir ett projekt (projekt.ts) och en handling (handlingar.ts, station i stationer.ts). vill = så många byn vill ha i förrådet.
// Salvan, tjäran, benlimmet och tvålen har ingen funktion än, så byn vill bara ha några. vatten = vattnet tas ur en fylld vattensäck,
// som töms men finns kvar (steg 7.6.6, torst.ts). verktyg = redskapet man arbetar med (sländan, steg 7.7.8).
export interface TillverkDef { act: Act; ger: string; n: number; av: Record<string, number>; min: number; tek: string; vill: number; text: string; forsta: string; vatten?: true; verktyg?: string; eld?: true } // eld = kokas vid en eld som brinner, om inte vid stationen
export const TILLVERKA: Record<string, TillverkDef> = {
  hugga_sten: { act: 'hugga_sten', ger: 'huggen_sten', n: 1, av: RECEPT.huggen_sten.av!, min: RECEPT.huggen_sten.min, tek: 'stenhuggarplats', vill: 8, text: 'Hugger till en sten.', forsta: '{namn} högg byns första huggna sten.' },
  klyva_plank: { act: 'klyva_plank', ger: 'plankor', n: 2, av: RECEPT.plankor.av!, min: RECEPT.plankor.min, tek: 'klyvplats', vill: 8, text: 'Klyver virke till plankor.', forsta: '{namn} klöv byns första plankor.' },
  koka_te: { act: 'koka_te', ger: 'te', n: 1, av: { rolleka: 1 }, min: 2, tek: 'orte', vill: 2, vatten: true, eld: true, text: 'Kokar ett örtte av rölleka i en liten lerkruka.', forsta: '{namn} kokade byns första örtte av rölleka.' }, // steg 9.5.8
  koka_salva: { act: 'koka_salva', ger: 'salva', n: 1, av: RECEPT.salva.av!, min: RECEPT.salva.min, tek: 'ortkok', vill: 3, text: 'Kokar en salva av rölleka och talg.', forsta: '{namn} kokade byns första salva.' },
  koka_tjara: { act: 'koka_tjara', ger: 'tjara', n: 1, av: RECEPT.tjara.av!, min: RECEPT.tjara.min, tek: 'ortkok', vill: 2, text: 'Kokar tjära av ved.', forsta: '{namn} kokade byns första tjära.' },
  koka_lim: { act: 'koka_lim', ger: 'benlim', n: 1, av: RECEPT.benlim.av!, min: RECEPT.benlim.min, tek: 'ortkok', vill: 2, vatten: true, text: 'Kokar lim av ben och vatten.', forsta: '{namn} kokade byns första benlim.' },
  koka_tval: { act: 'koka_tval', ger: 'tval', n: 1, av: RECEPT.tval.av!, min: RECEPT.tval.min, tek: 'ortkok', vill: 2, vatten: true, text: 'Kokar tvål av kol, talg och vatten.', forsta: '{namn} kokade byns första tvål.' },
  garva: { act: 'garva', ger: 'lader', n: 1, av: RECEPT.lader.av!, min: RECEPT.lader.min, tek: 'garvning', vill: 6, text: 'Skrapar ett skinn och mjukar upp det med talg.', forsta: '{namn} garvade byns första läder.' },
  spinna: { act: 'spinna', ger: 'trad', n: 1, av: RECEPT.trad.av!, min: RECEPT.trad.min, tek: 'slanda', verktyg: 'slanda', vill: 9, text: 'Spinner lin till tråd med sländan.', forsta: '{namn} spann byns första lintråd.' },
  vava: { act: 'vava', ger: 'lintyg', n: 1, av: RECEPT.lintyg.av!, min: RECEPT.lintyg.min, tek: 'vavstol', vill: 6, text: 'Väver lintyg.', forsta: '{namn} vävde byns första lintyg.' },
  koka_rokelse: { act: 'koka_rokelse', ger: 'rokelse', n: 1, av: RECEPT.rokelse.av!, min: RECEPT.rokelse.min, tek: 'ortkok', vill: 2, text: 'Kokar rökelse till tron.', forsta: '{namn} kokade byns första rökelse.' }, koka_olja: { act: 'koka_olja', ger: 'brannolja', n: 1, av: RECEPT.brannolja.av!, min: RECEPT.brannolja.min, tek: 'ortkok', vill: 2, text: 'Kokar brännolja till lamporna.', forsta: '{namn} kokade byns första brännolja.' },
  gor_pilar: { act: 'gor_pilar', ger: 'pilar', n: 4, av: RECEPT.pilar.av!, min: RECEPT.pilar.min, tek: 'bage', vill: 12, text: 'Gör pilar av ved och flinta.', forsta: '{namn} gjorde byns första pilar.' }, // steg 8.7.6
  gor_leksak: { act: 'gor_leksak', ger: 'leksak', n: 1, av: RECEPT.leksak.av!, min: RECEPT.leksak.min, tek: 'leksak', vill: 3, text: 'Täljer en leksak till barnen.', forsta: '{namn} täljde byns första leksak.' },
};
export const TILLVERKA_LIST = Object.keys(TILLVERKA);
