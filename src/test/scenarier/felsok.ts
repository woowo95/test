// Verktygen för att hitta felen (steg 12.1.40–12.1.44, Att hitta felen i fliken Läget): byn som fil, rapporten, vakterna för
// det orimliga och granskaren. Vakterna och granskaren körs med egna kommandon (npm run rimligt, npm run granska) och ligger
// inte i de vanliga testerna; scenarierna här prövar bara att verktygen själva gör rätt
import * as SIM from '../../sim';
import { SCENARIER, testBy, utanWebblasare } from './hjalp';
import { byTillFil, lasByfil } from '../../ui/byfil';
import { konstigHtml, konstigKlick, rapport, sparaRapport } from '../../ui/konstigt';
import { Rimlig } from '../rimligt';

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

SCENARIER.rimligt = {
  text: 'Vakterna för det orimliga (steg 12.1.42, src/test/rimligt.ts): varje vakt i RIMLIGT larmar med by, person och tid när det orimliga händer (ett skäl som inte stämmer, en handling som inte hör till skälet, ett förråd långt över taket, den som byter fram och tillbaka, den som är hungrig länge med mat i förrådet, många som gör samma sak av samma skäl, den som står still mitt i arbetet) och tiger när det stämmer',
  kor: () => {
    const s = testBy(10), r = new Rimlig(s, 7), folk = SIM.living(s).filter(p => !p.gast && SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen), p = folk[0]!;
    const uppgift = (act: SIM.Act, why: string): SIM.Task => ({ act, phase: 'go', tx: p.x, ty: p.y, until: s.now + 3600e3, carry: 0, why, dark: false } as SIM.Task);
    const larm = (v: string) => r.larmen.filter(l => l.vakt === v);
    // skälet: byn behöver ved fast förrådet räcker länge, och samla (mat) med skälet ved
    s.arbBehov = { ...s.arbBehov!, ved: SIM.buffert(s, 'ved') * 5, mat: 0 };
    p.task = uppgift('samla', 'Byn behöver ved, förrådet räcker 30 dygn'); r.prov(60);
    const skal = larm('skal').length === 1 && larm('skal')[0].vem === p.name && larm('skal')[0].by === 7, handling = larm('handling').length === 1;
    // det som stämmer: byn behöver mat och samlar, utan larm
    const n0 = r.larmen.length; p.task = uppgift('samla', 'Byn behöver mat, förrådet räcker 0 dygn'); r.prov(60);
    const tyst = r.larmen.length === n0;
    // fram och tillbaka mellan två handlingar
    for (let i = 0; i < 6; i++) { p.task = uppgift(i % 2 ? 'samla' : 'ved', 'x'); s.now += 60e3; r.prov(60); }
    const byten = larm('byten').length >= 1;
    // hungrig länge med mat i förrådet
    p.task = uppgift('vila', 'Tar en paus'); p.hunger = 0.1; SIM.setAmount(s, 'bar', 50);
    for (let i = 0; i < 4 * 60; i++) { s.now += 60e3; p.hunger = 0.1; r.prov(60); }
    const nod = larm('nod').some(l => l.vem === p.name && /hungrig/.test(l.text));
    // ett förråd långt över taket
    SIM.setAmount(s, 'grenar', 10); s.now += SIM.DAY; r.prov(60); SIM.setAmount(s, 'grenar', SIM.materialTak(s, 'grenar') * 10 + 100); s.now += SIM.DAY; r.prov(60); // ett dygn senare har grenarna vuxit långt över taket
    const tak = larm('tak').some(l => /grenar/.test(l.text));
    // många gör samma arbete av samma skäl
    for (const q of folk) q.task = { ...uppgift('ved', 'Mer ved till förrådet'), tx: q.x, ty: q.y } as SIM.Task;
    s.now += 3600e3; r.prov(60);
    const samma = folk.length >= 4 && larm('samma').length >= 1;
    // står still på vägen mitt i arbetet ett helt dygn
    const q = folk[1]!; q.task = uppgift('ved', 'Byn behöver ved'); q.task.tx = q.x + 30;
    for (let i = 0; i < 25 * 60; i++) { s.now += 60e3; r.prov(60); }
    const stilla = larm('stilla').some(l => l.vem === q.name);
    return [
      ['ett skäl som inte stämmer larmar med by och person, och en handling som inte hör till skälet larmar', skal && handling],
      ['ett skäl som stämmer larmar inte', tyst],
      ['den som byter fram och tillbaka mellan två handlingar larmar', byten],
      ['den som är hungrig i fyra timmar med mat i förrådet larmar', nod],
      ['grenar långt över taket larmar', tak],
      [`när alla ${folk.length} vuxna hugger ved av samma skäl larmar det`, samma],
      ['den som står still på vägen ett dygn mitt i arbetet larmar', stilla],
    ];
  },
};
