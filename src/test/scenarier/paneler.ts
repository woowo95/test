// Scenarier för kartbilden och panelerna i fas 12 (grenen par-paneler).
import * as SIM from '../../sim';
import { SCENARIER, utanWebblasare } from './hjalp';
import { GRAFER, grafHtml } from '../../ui/graf';
import { setByn } from '../../ui/lage';
import { START, kronikaVakt } from '../kor';
import { readdirSync, readFileSync } from 'node:fs';
import { hasIcon } from '../../ikoner';
import { ROLLSYMBOLER, SKYLT, rollAv, synligaSkyltar, type Skylt } from '../../ui/namnskyltar';

SCENARIER.namnskyltar = {
  text: 'Steg 12.1.157: varje kolonist har sitt namn i liten text vid figuren, och den som har en roll (ledaren, prästen) en symbol vid namnet ur ROLLSYMBOLER. När kartan är utzoomad eller många står tätt göms namnen så att de inte täcker varandra, och rollerna går före',
  kor: () => {
    const s = SIM.createState(3, START), folk = SIM.living(s).filter(p => SIM.ageOf(p, s.now) >= SIM.ALDER.vuxen);
    const [led, pr, van] = folk;
    s.styre = { ...(s.styre ?? {}), ledare: led.id } as typeof s.styre;
    (s.tron ??= []).push({ id: 9001, prast: pr.id } as SIM.Tro); pr.tro = 9001;
    const bredd = (p: SIM.Person) => p.name.length * 4; // ungefär textens bredd i världens punkter
    const skylt = (p: SIM.Person, x: number, y: number): Skylt => { const r = rollAv(s, p); return { id: p.id, x, y, w: bredd(p), ikon: r?.ikon, forst: r ? 1 : 0 }; };
    const alla = SIM.living(s);
    // utspridda: en per ruta på två rutors avstånd
    const spridda = alla.map((p, i) => skylt(p, (i % 6) * 48 + 20, Math.floor(i / 6) * 32 + 20));
    const narZoom = synligaSkyltar(spridda, 3), utZoom = synligaSkyltar(spridda, 0.8);
    // tätt: alla på samma ruta och två rutor till
    const tata = alla.map((p, i) => skylt(p, 100 + (i % 3) * 3, 100 + (i % 2) * 2));
    const tat = synligaSkyltar(tata, 3);
    const rekt = (k: Skylt) => { const w = k.w + (k.ikon ? SKYLT.ikon + 1 : 0); return { x: k.x - w / 2, y: k.y - SKYLT.hojd, w, h: SKYLT.hojd }; };
    const synliga = tata.filter(k => tat.has(k.id)).map(rekt);
    const overlapp = synliga.some((a, i) => synliga.some((b, j) => i < j && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
    // den valda har sin stora skylt: namnen bredvid den göms
    const stor = synligaSkyltar(tata, 3, [{ x: 60, y: 80, w: 100, h: 40 }]);
    return [
      [`ledaren och prästen har sin roll och den vanliga ingen (${rollAv(s, led)?.id}, ${rollAv(s, pr)?.id}, ${rollAv(s, van)?.id ?? 'ingen'})`, rollAv(s, led)?.id === 'ledare' && rollAv(s, pr)?.id === 'prast' && !rollAv(s, van)],
      [`varje roll i ROLLSYMBOLER har sin symbol i ikoner.ts (${ROLLSYMBOLER.map(r => r.ikon).join(', ')})`, ROLLSYMBOLER.every(r => hasIcon(r.ikon))],
      [`inzoomat syns alla ${alla.length} namn när folk står utspridda (${narZoom.size})`, narZoom.size === alla.length],
      [`utzoomat syns inga namn (${utZoom.size})`, utZoom.size === 0],
      [`när alla står tätt syns bara några namn och inga täcker varandra (${tat.size} av ${alla.length})`, tat.size > 0 && tat.size < alla.length && !overlapp],
      [`i trängseln går rollerna före: de namn som syns är ledarens eller prästens (${[...tat].map(id => SIM.byId(s, id)?.name).join(', ')})`, [...tat].every(id => id === led.id || id === pr.id)],
      [`namnen under den valdas stora skylt göms (${stor.size})`, stor.size === 0],
    ];
  },
};

SCENARIER.kronikakat2 = {
  text: 'Steg 12.1.137: slagen från de nya systemen har sin kategori i KRONIKA_KAT (dom och avrättning i Styre, epidemin i Motgångar, utflyttningen i Liv, troshuset i Tro, grannarnas händelser i Handel och grannar och byns egen rätt i Bygge och uppfinningar), en vakt i testerna larmar för en krönikerad utan kategori, och sex nya rader i NOTISER skrivs när det händer',
  kor: () => {
    const kat = (sl: string) => SIM.kronikaKat(sl);
    const slagen: [string, string][] = [['ledare', 'styre'], ['sjukdom', 'motgang'], ['utflytt', 'liv'], ['tro', 'tro'], ['grannar', 'grannar'], ['sandebud', 'grannar'], ['nyhet', 'grannar'], ['mat', 'bygge']];
    const felKat = slagen.filter(([sl, k]) => kat(sl) !== k);
    // vakten: en rad med ett okänt slag och en utan slag larmar, de andra inte
    const s = SIM.createState(5, START), larm: string[] = [];
    SIM.kronika(s, 'En rad med kategori.', 'bygge'); kronikaVakt(s, t => larm.push(t));
    const forut = larm.length;
    SIM.kronika(s, 'En rad med ett påhittat slag.', 'paahittat'); s.hist!.kronika.push([s.now, 'En rad utan slag.']); kronikaVakt(s, t => larm.push(t));
    // notiserna: en ny tro, en ny lag och det första tamdjuret skrivs när det händer; domen, avrättningen och skörden i koden
    const nya = ['dom', 'avrattning', 'lag', 'tro', 'skord', 'tamdjur'], saknas = nya.filter(id => !SIM.NOTISER[id]);
    const har = (id: string) => (s.notiser?.lista ?? []).some(n => n.id === id);
    const [p] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen);
    SIM.grunda(s, p, 'blixt');
    SIM.FRAGOR.nylag?.gor(s, { id: Object.keys(SIM.LAGAR)[0] }, p);
    SIM.nyttTamdjur(s, 'hund', p.x, p.y, p.id); SIM.nyttTamdjur(s, 'hund', p.x, p.y, p.id);
    const tamN = (s.notiser?.lista ?? []).filter(n => n.id === 'tamdjur').reduce((a, n) => a + n.n, 0);
    const simMapp = new URL('../../sim/', import.meta.url), kod = readdirSync(simMapp).filter(f => f.endsWith('.ts')).map(f => readFileSync(new URL(f, simMapp), 'utf8')).join('\n');
    const iKoden = nya.filter(id => new RegExp(`notis\\(s, '${id}'`).test(kod));
    return [
      [`de nya systemens slag har sin kategori${felKat.length ? ` (fel: ${felKat.map(([sl]) => `${sl} → ${kat(sl)}`).join(', ')})` : ''}`, !felKat.length],
      [`vakten larmar för en rad med ett okänt slag och en utan slag, men inte för en med kategori (${forut} före, ${larm.length - forut} efter)`, forut === 0 && larm.length - forut === 2],
      [`sex nya rader i NOTISER${saknas.length ? ` (saknas: ${saknas.join(', ')})` : ''}`, !saknas.length],
      [`en ny tro, en ny lag och det första tamdjuret ger sin notis, och tamdjuret bara det första (${['tro', 'lag', 'tamdjur'].filter(har).join(', ')}; ${tamN} tamdjursrad)`, har('tro') && har('lag') && har('tamdjur') && tamN === 1],
      [`alla sex skrivs i simuleringen (${iKoden.join(', ')})`, iKoden.length === nya.length],
    ];
  },
};

SCENARIER.grafer = {
  text: 'Steg 12.1.138: nio nya grafer i Byns tal, var och en med sitt tal i HISTORIK_TAL: silver i byn, tamdjur, sjuka, troende och fångar (hur många just då), och skörd, strider, resor och böcker (sedan byns början, räknat i byns statistik när det händer)',
  kor: () => {
    utanWebblasare();
    const s = SIM.createState(5, START), folk = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen);
    const [a, b, c] = folk;
    SIM.setAmount(s, 'silver', 7);
    SIM.nyttTamdjur(s, 'hund', a.x, a.y, a.id);
    b.sjuk = { k: Object.keys(SIM.SJUKDOMAR)[0], t: s.now, tecken: s.now } as unknown as typeof b.sjuk;
    c.tro = 1; a.tro = 1; (s.tron ??= []).push({ id: 1 } as SIM.Tro);
    c.fange = { hus: -1, t: s.now, varfor: 'prov' };
    const st = (s.stat ??= {}) as Record<string, number>;
    st.skord = 12; st.strider = 3; st['resa hemma'] = 2; st.bocker = 1;
    SIM.historikSteg(s);
    const nya: [string, number][] = [['silver', 7], ['tamdjur', 1], ['sjuka', 1], ['troende', 2], ['fangar', 1], ['skord', 12], ['strider', 3], ['resor', 2], ['bocker', 1]];
    const sist = (id: string) => SIM.historikSerie(s, id).at(-1)?.[1];
    const fel = nya.filter(([id, v]) => sist(id) !== v);
    setByn(s);
    const grafer = nya.filter(([id]) => GRAFER[id] && grafHtml(id).includes(GRAFER[id].namn));
    const simMapp = new URL('../../sim/', import.meta.url), kod = readdirSync(simMapp).filter(f => f.endsWith('.ts')).map(f => readFileSync(new URL(f, simMapp), 'utf8')).join('\n');
    return [
      [`de nio talen sparas i historiken med rätt värde${fel.length ? ` (fel: ${fel.map(([id, v]) => `${id} ${sist(id)} i stället för ${v}`).join(', ')})` : ''}`, !fel.length],
      [`de nio graferna finns i GRAFER och ritas (${grafer.length} av 9)`, grafer.length === 9],
      ['böckerna, striderna, resorna och skörden räknas i byns statistik när det händer', /count\(s, 'bocker'\)/.test(kod) && /count\(s, 'strider'\)/.test(kod) && /count\(s, 'resa hemma'\)/.test(kod) && /count\(s, 'skord'/.test(kod)],
    ];
  },
};
