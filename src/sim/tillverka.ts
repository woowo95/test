import { RECEPT } from './recept';
import { Act } from './typer';
import { GARVHUD, SALTKOTT, garvAct } from './handlingar';

// ---------- tillverkningen vid stationerna (steg 7.5–7.7) ----------
// Det som görs av material vid en station och läggs i förrådet, utan att vara ett redskap eller plagg: en rad per sak. Varje rad
// blir ett projekt (projekt.ts) och en handling (handlingar.ts, station i stationer.ts). vill = så många byn vill ha i förrådet.
// Tjäran skyddar trä (13.5.1) och limmet går åt i recepten (13.5.2); byn vill ha det som förbrukningen säger. vatten = vattnet tas ur en fylld vattensäck,
// som töms men finns kvar (steg 7.6.6, torst.ts). verktyg = redskapet man arbetar med (sländan, steg 7.7.8).
// vatska = en vätska som går åt, ur byns behållare (mjölken till osten, steg 12.4.7); kruka = en ledig behållare av den sorten där det sjuder (osten)
export interface TillverkDef { vatska?: { v: string; n: number }; kruka?: string; act: Act; ger: string; n: number; av: Record<string, number>; min: number; tek: string; vill: number; text: string; forsta: string; vatten?: true; verktyg?: string; eld?: true; eller?: { av: string[]; n: number }; sjud?: number; syr?: true } // eld = kokas vid en eld som brinner, om inte vid stationen; eller = en av de här också (den byn har mest av); sjud = minuter vätskan sjuder i krukan på elden utan någon som arbetar (kokningen, matlagning.ts)
export const TILLVERKA: Record<string, TillverkDef> = {
  hugga_sten: { act: 'hugga_sten', ger: 'huggen_sten', n: 1, av: RECEPT.huggen_sten.av!, min: RECEPT.huggen_sten.min, tek: 'stenhuggarplats', vill: 8, text: 'Hugger till en sten.', forsta: '{namn} högg byns första huggna sten.' },
  klyva_plank: { act: 'klyva_plank', ger: 'plankor', n: 2, av: RECEPT.plankor.av!, min: RECEPT.plankor.min, tek: 'klyvplats', vill: 8, text: 'Klyver virke till plankor.', forsta: '{namn} klöv byns första plankor.' },
  skara_remsor: { act: 'skara_remsor', ger: 'remsa', n: 2, av: RECEPT.remsa.av!, min: RECEPT.remsa.min, tek: 'kniv', vill: 4, text: 'Skär remsor av ett skinn till förband.', forsta: '{namn} skar byns första remsor till förband.' }, // steg 9.5.15
  skara_lin: { act: 'skara_lin', ger: 'remsa', n: 2, av: RECEPT.remsa_lin.av!, min: RECEPT.remsa_lin.min, tek: 'kniv', vill: 4, text: 'Skär remsor av lintyg till förband.', forsta: '{namn} skar byns första remsor av lin.' }, // går först när byn har lintyg
  koka_vatten: { act: 'koka_vatten', ger: 'kokt', n: 1, av: {}, min: 2, tek: 'kruka', vill: 4, vatten: true, eld: true, text: 'Kokar vatten i en lerkruka.', forsta: '{namn} kokade vatten för första gången, så att det blev rent.' }, // steg 9.5.25
  mala_korn: { act: 'mala_korn', ger: 'mjol', n: RECEPT.mjol.ger!, av: RECEPT.mjol.av!, min: RECEPT.mjol.min, tek: 'kvarnsten', vill: 8, text: 'Mal korn till mjöl vid kvarnstenen.', forsta: '{namn} malde byns första mjöl.' }, // steg 9.6.22
  salta_fisk: { act: 'salta_fisk', ger: 'saltfisk', n: RECEPT.saltfisk.ger!, av: RECEPT.saltfisk.av!, min: RECEPT.saltfisk.min, tek: 'tork', vill: 8, text: 'Saltar in fisk så att den håller.', forsta: '{namn} saltade in byns första fisk.' }, // saltet (steg 9.6.19)
  // varje köttslag saltas till samma saltade kött (steg 10.3.14); svinet före kon, som raderna alltid stått (projekten tar den första
  // vid lika värde)
  ...Object.fromEntries((['kott', 'vargkott', 'radjurkott', 'farkott', 'getkott', 'svinkott', 'kokott', 'fagelkott', 'bjornkott'] as const).map(k => [`salta_${k}`, {
    act: `salta_${k}` as Act, ger: 'saltkott', n: RECEPT.saltkott.ger!, av: { [k]: RECEPT.saltkott.av!.kott, salt: RECEPT.saltkott.av!.salt }, min: RECEPT.saltkott.min, // receptet med köttslaget i stället för kött (steg 12.1.107)
    tek: 'tork', vill: 8, text: `Saltar in ${SALTKOTT[k]} så att det håller.`, forsta: `{namn} saltade in byns första ${SALTKOTT[k]}.`,
  }])),
  krossa_saft: { act: 'krossa_saft', ger: 'saft', n: 5, av: {}, eller: { av: ['bar', 'appel'], n: 10 }, min: 3, tek: 'kruka', vill: 5, text: 'Krossar bär eller äpplen till saft i en mellanstor lerkruka.', forsta: '{namn} krossade byns första saft.' }, // steg 9.6.9; av bär eller äpplen, det byn har mest av (steg 13.6.3)
  koka_buljong: { act: 'koka_buljong', ger: 'buljong', n: 4, av: { ben: 2 }, eller: { av: ['svamp', 'kal'], n: 1 }, min: 3, tek: 'kruka', vill: 1, vatten: true, eld: true, sjud: 15, text: 'Lägger ben och svamp eller kål med vatten i en lerkruka som får sjuda på elden.', forsta: '{namn} satte byns första buljong att sjuda på elden.' }, // steg 10.7.24
  koka_te: { act: 'koka_te', ger: 'te', n: 1, av: { rolleka: 1 }, min: 2, tek: 'orte', vill: 2, vatten: true, eld: true, text: 'Kokar ett örtte av rölleka i en liten lerkruka.', forsta: '{namn} kokade byns första örtte av rölleka.' }, // steg 9.5.8
  koka_salva: { act: 'koka_salva', ger: 'salva', n: 1, av: RECEPT.salva.av!, min: RECEPT.salva.min, tek: 'lakesalva', vill: 3, text: 'Kokar en läkesalva av rölleka och talg.', forsta: '{namn} kokade byns första salva.' },
  koka_tjara: { act: 'koka_tjara', ger: 'tjara', n: 1, av: RECEPT.tjara.av!, min: RECEPT.tjara.min, tek: 'ortkok', vill: 2, text: 'Kokar tjära av ved.', forsta: '{namn} kokade byns första tjära.' },
  koka_lim: { act: 'koka_lim', ger: 'benlim', n: 1, av: RECEPT.benlim.av!, min: RECEPT.benlim.min, tek: 'ortkok', vill: 2, vatten: true, text: 'Kokar lim av ben och vatten.', forsta: '{namn} kokade byns första benlim.' },
  koka_tval: { act: 'koka_tval', ger: 'tval', n: 1, av: RECEPT.tval.av!, min: RECEPT.tval.min, tek: 'ortkok', vill: 2, vatten: true, text: 'Kokar tvål av kol, talg och vatten.', forsta: '{namn} kokade byns första tvål.' },
  // varje hud garvas för sig till hela läderbitar efter sin storlek, med 1 talg per läder och samma tid per hud (steg 13.2.1)
  ...Object.fromEntries((Object.keys(GARVHUD) as (keyof typeof GARVHUD)[]).map(h => [garvAct(h), {
    act: garvAct(h) as Act, ger: 'lader', n: GARVHUD[h].lader, av: { [h]: 1, talg: RECEPT.lader.av!.talg * GARVHUD[h].lader }, min: RECEPT.lader.min, tek: 'garvning', vill: 6,
    text: `Skrapar ${GARVHUD[h].namn} och mjukar upp huden med talg.`, forsta: '{namn} garvade byns första läder.',
  }])),
  gora_pergament: { act: 'gora_pergament', ger: 'pergament', n: 4, av: RECEPT.pergament.av!, min: RECEPT.pergament.min, tek: 'pergament', vill: 4, text: 'Skrapar och spänner ett skinn till pergament.', forsta: '{namn} gjorde byns första pergament.' }, // steg 10.6.4
  riva_black: { act: 'riva_black', ger: 'black', n: 2, av: { kol: 1 }, min: 2, tek: 'pergament', vill: 2, vatten: true, text: 'Gnider sot av kol med vatten till bläck i en liten lerkruka.', forsta: '{namn} rev byns första bläck.' },
  spinna: { act: 'spinna', ger: 'trad', n: 1, av: RECEPT.trad.av!, min: RECEPT.trad.min, tek: 'slanda', verktyg: 'slanda', vill: 9, text: 'Spinner lin till tråd med sländan.', forsta: '{namn} spann byns första lintråd.' },
  vava: { act: 'vava', ger: 'lintyg', n: 1, av: RECEPT.lintyg.av!, min: RECEPT.lintyg.min, tek: 'vavstol', vill: 6, text: 'Väver lintyg.', forsta: '{namn} vävde byns första lintyg.' },
  spinna_ull: { act: 'spinna_ull', ger: 'ulltrad', n: 1, av: RECEPT.ulltrad.av!, min: RECEPT.ulltrad.min, tek: 'slanda', verktyg: 'slanda', vill: 9, text: 'Spinner ull till tråd med sländan.', forsta: '{namn} spann byns första ulltråd.' }, // steg 9.8.14
  vava_ull: { act: 'vava_ull', ger: 'ylle', n: 1, av: RECEPT.ylle.av!, min: RECEPT.ylle.min, tek: 'vavstol', vill: 6, text: 'Väver ylletyg.', forsta: '{namn} vävde byns första ylletyg.' },
  koka_rokelse: { act: 'koka_rokelse', ger: 'rokelse', n: 1, av: RECEPT.rokelse.av!, min: RECEPT.rokelse.min, tek: 'ortkok', vill: 2, text: 'Kokar rökelse till tron.', forsta: '{namn} kokade byns första rökelse.' }, koka_olja: { act: 'koka_olja', ger: 'brannolja', n: 1, av: RECEPT.brannolja.av!, min: RECEPT.brannolja.min, tek: 'ortkok', vill: 2, text: 'Kokar brännolja i en liten lerkruka eller en oljelampa.', forsta: '{namn} kokade byns första brännolja.' },
  gor_pilar: { act: 'gor_pilar', ger: 'pilar', n: RECEPT.pilar.ger!, av: RECEPT.pilar.av!, min: RECEPT.pilar.min, tek: 'bage', vill: 12, text: 'Gör pilar av ved och flinta, med en fjäder.', forsta: '{namn} gjorde byns första pilar.' }, // steg 8.7.6, och fjädern (steg 13.4.2)
  smida_pilar: { act: 'smida_pilar', ger: 'jarnpilar', n: RECEPT.jarnpilar.ger!, av: RECEPT.jarnpilar.av!, min: RECEPT.jarnpilar.min, tek: 'bage', vill: 12, text: 'Smider pilspetsar av järn och fjädrar pilarna.', forsta: '{namn} smidde byns första järnpilar.' }, // steg 13.4.2: vid smedjan
  sy_ridsadel: { act: 'sy_ridsadel', ger: 'ridsadel', n: 1, av: RECEPT.ridsadel.av!, min: RECEPT.ridsadel.min, tek: 'ridning', vill: 0, text: 'Syr en ridsadel till hästen.', forsta: '{namn} sydde byns första ridsadel. Nu kan någon rida ut på hästen.' }, // steg 11.11.4: en per vuxen häst (TILLVERKVILL)
  sy_packsadel: { act: 'sy_packsadel', ger: 'packsadel', n: 1, av: RECEPT.packsadel.av!, min: RECEPT.packsadel.min, tek: 'ryggsack', vill: 0, text: 'Syr en packsadel till hästen eller oxen.', forsta: '{namn} sydde byns första packsadel. Nu kan djuren bära på resorna.' }, // steg 11.11.3: så många som byn vill ha (sadelBehov)
  sy_talt: { act: 'sy_talt', ger: 'talt', n: 1, av: RECEPT.talt.av!, min: RECEPT.talt.min, tek: 'talt', vill: 0, text: 'Syr ett tält av skinn till resorna.', forsta: '{namn} sydde byns första tält. Nu kan resenärerna sova under tak.' }, // steg 11.11.1: så många som byn vill ha (taltVill)
  // syrningen (steg 13.6.2): kålen eller fisken packas med salt i en stor lerkruka och syras där SYRA.dygn dygn utan eld (stepKok i matlagning.ts)
  syra_kal: { act: 'syra_kal', ger: 'surkal', n: RECEPT.surkal.ger!, av: RECEPT.surkal.av!, kruka: 'lerkruka_stor', min: RECEPT.surkal.min, tek: 'syrning', vill: 0, syr: true, text: 'Packar kål med salt i en stor lerkruka, där den får syras.', forsta: '{namn} packade byns första kål med salt i en kruka för att syras.' },
  syra_fisk: { act: 'syra_fisk', ger: 'surfisk', n: RECEPT.surfisk.ger!, av: RECEPT.surfisk.av!, kruka: 'lerkruka_stor', min: RECEPT.surfisk.min, tek: 'syrning', vill: 0, syr: true, text: 'Packar fisk med salt i en stor lerkruka, där den får syras.', forsta: '{namn} packade byns första fisk med salt i en kruka för att syras.' },
  ysta: { act: 'ysta', ger: 'ost', n: 1, av: {}, vatska: { v: 'mjolk', n: 4 }, kruka: 'lerkruka_mellan', min: 4, tek: 'ost', vill: 0, eld: true, sjud: 15, text: 'Ystar mjölk till ost i en mellanstor lerkruka vid elden.', forsta: '{namn} ystade byns första ost av mjölken.' }, // osten (steg 12.4.7): mjölken som annars skulle surna (TILLVERKVILL)
  gor_leksak: { act: 'gor_leksak', ger: 'leksak', n: 1, av: RECEPT.leksak.av!, min: RECEPT.leksak.min, tek: 'leksak', vill: 3, text: 'Täljer en leksak till barnen.', forsta: '{namn} täljde byns första leksak.' },
};
export const TILLVERKA_LIST = Object.keys(TILLVERKA);
// materialet i ett recept: av, och av det andra (eller) det som tas, det som finns mest av (har)
export const tillverkAv = (d: TillverkDef, har: (k: string) => number): Record<string, number> | undefined => {
  if (!d.eller) return d.av;
  const k = d.eller.av.reduce((b, k) => har(k) > har(b) ? k : b);
  return har(k) >= d.eller.n ? { ...d.av, [k]: d.eller.n } : undefined;
};
