// Verktygen för att hitta felen (steg 12.1.40–12.1.44, Att hitta felen i fliken Läget): byn som fil, rapporten, vakterna för
// det orimliga och granskaren. Vakterna och granskaren körs med egna kommandon (npm run rimligt, npm run granska) och ligger
// inte i de vanliga testerna; scenarierna här prövar bara att verktygen själva gör rätt
import * as SIM from '../../sim';
import { SCENARIER, testBy, utanWebblasare } from './hjalp';
import { byTillFil, lasByfil } from '../../ui/byfil';
import { konstigHtml, konstigKlick, rapport, sparaRapport } from '../../ui/konstigt';

SCENARIER.byfil = {
  text: 'Byn som fil (steg 12.1.40, ui/byfil.ts): en by som sparats till fil och lästs in igen är exakt lika, också när båda räknas vidare två timmar',
  kor: () => {
    const s = testBy(10), text = byTillFil(s), s2 = lasByfil(text);
    const lika = byTillFil(s2) === text;
    SIM.step(s, 2 * 3600); SIM.step(s2, 2 * 3600);
    const vidare = SIM.serialize(s) === SIM.serialize(s2);
    let fel = false; try { lasByfil('{"inte":"en by"}'); } catch { fel = true; }
    return [
      [`byn ur filen är samma text som byn (${Math.round(text.length / 1024)} KB)`, lika],
      ['de två byarna är exakt lika efter två timmar till', vidare],
      ['en fil som inte är en by ger ett fel', fel],
    ];
  },
};

SCENARIER.konstigt = {
  text: 'Det här är konstigt (steg 12.1.41, ui/konstigt.ts): rutan för en person, en sak, en station eller ett hus har symbolen, ett tryck öppnar raden att skriva i, och rapporten har det spelaren skrev, vad som var valt, personens handling, skäl, fas, plats, börda och personlogg, förråden, behoven, händelserna, versionen och hela byn, sparad i spelets databas med byn i bitar som går att sätta ihop igen',
  kor: async () => {
    const s = testBy(10), p = SIM.living(s).find(q => q.task && !q.gast)!;
    const { r, fil } = rapport(s, 'person', { selected: p.id }, '  Står still vid elden  ', 1_800_000_000_000);
    const skrivet = new Map<string, unknown>(), ordning: string[] = [];
    await sparaRapport({ doc: (path: string) => ({ set: async (v: unknown) => { skrivet.set(path, v); ordning.push(path); } }) }, r, fil);
    const hopsatt = Array.from({ length: r.filBitar }, (_, i) => (skrivet.get(`rapportfil/${r.id}-${i}`) as { t: string }).t).join('');
    const delar = r.text === 'Står still vid elden' && r.valt.vad === p.name && r.person?.namn === p.name && r.person.act === p.task!.act && r.person.skal === p.task!.why
      && !!r.person.plats && !!r.person.bar && r.person.logg.length > 0 && /mat .* dygn/.test(r.forrad) && !!r.behov && r.handelser.length > 0 && !!r.version;
    // rutan: symbolen i de fyra rutorna och inte i andra, och ett tryck öppnar raden
    utanWebblasare();
    const v = { selected: p.id, husId: 1, stationId: -1, sak: '' };
    const iRutor = ['person', 'sak', 'station', 'hus'].every(id => konstigHtml(id, v).includes('data-konstig=')) && konstigHtml('forrad', v) === '';
    const el = { closest: (q: string) => q === '[data-konstig]' ? { dataset: { konstig: `person:${p.id}` } } : null } as unknown as HTMLElement;
    const tryck = konstigKlick(el, async () => true), oppen = konstigHtml('person', v).includes('id="konstigText"');
    konstigKlick(el, async () => true);
    return [
      ['rapporten har det spelaren skrev, det valda, personens handling, skäl, fas, plats, börda och personlogg, förråden, behoven, händelserna och versionen', delar],
      [`byn ligger i ${r.filBitar} bitar som sätts ihop till samma fil, och bitarna skrivs före rapporten`, hopsatt === byTillFil(s) && ordning[ordning.length - 1] === `rapporter/${r.id}` && skrivet.has(`rapporter/${r.id}`)],
      ['symbolen står i rutan för en person, en sak, en station och ett hus, och ett tryck öppnar raden att skriva i', iRutor && tryck && oppen],
    ];
  },
};
