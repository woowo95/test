// Scenarier för kartbilden och panelerna i fas 12 (grenen par-paneler).
import * as SIM from '../../sim';
import { SCENARIER, medHus, utanWebblasare } from './hjalp';
import { INGEN, SKUGGA, eldSkuggor, iSkuggan, skrivsOm } from '../../ui/eldskugga';
import { GRAFER, grafHtml } from '../../ui/graf';
import { setByn } from '../../ui/lage';
import { START, kronikaVakt } from '../kor';
import { readdirSync, readFileSync } from 'node:fs';
import { hasIcon } from '../../ikoner';
import { ROLLSYMBOLER, SKYLT, figurRam, rollAv, synligaSkyltar, type Skylt } from '../../ui/namnskyltar';

SCENARIER.namnskyltar = {
  text: 'Steg 12.1.157 och 12.1.262: varje kolonist har sitt namn i liten text vid figuren, och den som har en roll (ledaren, prästen) en symbol vid namnet ur ROLLSYMBOLER. När kartan är utzoomad eller många står tätt göms namnen så att de inte täcker varandra, och rollerna går före',
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
    // figurens ram (steg 12.1.262): stående med ankaret i hörnet, liggande i sängen (ankaret i mitten, spegelvänd) och i den
    // stående sängen (en kvarts varv): mitten är där figuren syns, inte ankaret plus halva bredden
    const R = (o: Partial<Parameters<typeof figurRam>[0]>) => figurRam({ x: 100, y: 50, ax: 0, ay: 0, rot: 0, sx: 1, w: 24, h: 16, ...o });
    const star = R({}), ligg = R({ ax: 0.5, ay: 0.5, sx: -1 }), stSang = R({ ax: 0.5, ay: 0.5, rot: -Math.PI / 2 });
    const nara = (a: number, b: number) => Math.abs(a - b) < 1e-9;
    const ramOk = nara(star.x, 112) && nara(star.topp, 50) && nara(star.botten, 66) && nara(ligg.x, 100) && nara(ligg.topp, 42) && nara(ligg.botten, 58) && nara(stSang.x, 100) && nara(stSang.topp, 38) && nara(stSang.botten, 62);
    return [
      [`namnet hamnar mitt under figuren, också i sängen (stående ${star.x}/${star.topp}/${star.botten}, i sängen ${ligg.x}/${ligg.topp}/${ligg.botten}, i den stående sängen ${stSang.x.toFixed(1)}/${stSang.topp.toFixed(1)}/${stSang.botten.toFixed(1)}; figurRam, steg 12.1.262)`, ramOk],
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

SCENARIER.eldskugga = {
  text: 'Steg 12.3.2 och 12.1.259: elden kastar skuggor. För varje lägereld räknas hur långt ljuset når åt 360 håll innan det träffar en vägg eller en stam (ui/eldskugga.ts), och nattfiltret gör det som ligger bakom ett eller två steg mörkare. Väggen själv är upplyst, det bakom den i skuggan, det framför den inte, och strålarna räknas om bara när något ändrats. Bara bilden',
  kor: () => {
    const s = SIM.createState(3, START); medHus(s);
    const f = SIM.eldXY(s, s.fire), fx = f.x + 0.5, fy = f.y + 0.5;
    // den närmaste väggen inom skenet
    let vagg: { x: number; y: number } | undefined, bd = Infinity;
    for (let y = f.y - SKUGGA.r; y <= f.y + SKUGGA.r; y++) for (let x = f.x - SKUGGA.r; x <= f.x + SKUGGA.r; x++) if (SIM.isWall(s, x, y)) { const d = Math.hypot(x + 0.5 - fx, y + 0.5 - fy); if (d < bd) { bd = d; vagg = { x, y }; } }
    const fore = SIM.serialize(s);
    const { rader, ny } = eldSkuggor(s, [{ x: fx, y: fy }]), igen = eldSkuggor(s, [{ x: fx, y: fy }]);
    const rad = rader[0], v = vagg!, dx = (v.x + 0.5 - fx) / bd, dy = (v.y + 0.5 - fy) / bd;
    const bakom = iSkuggan(rad, fx, fy, fx + dx * (bd + 2), fy + dy * (bd + 2)), framfor = iSkuggan(rad, fx, fy, fx + dx * (bd - 1.5), fy + dy * (bd - 1.5));
    const sjalv = iSkuggan(rad, fx, fy, v.x + 0.5, v.y + 0.5);
    const skuggade = [...rad].filter(d => d !== INGEN).length;
    // ett hus till ändrar nyckeln, och strålarna räknas om
    SIM.touch(s);
    const omraknad = eldSkuggor(s, [{ x: fx, y: fy }]).ny;
    // byta by (steg 12.1.259): bilden är en för hela sidan, minnet per by. Tillbaka i den första byn är strålarna gamla i dess
    // minne men andra än de som står i bilden, och bilden skrivs om
    const b = SIM.createState(5, START), fb = SIM.eldXY(b, b.fire), skrivet: { rader?: Uint8Array[] } = {};
    const forsta = skrivsOm(skrivet, eldSkuggor(s, [{ x: fx, y: fy }]).rader), sammaIgen = skrivsOm(skrivet, eldSkuggor(s, [{ x: fx, y: fy }]).rader);
    const andra = skrivsOm(skrivet, eldSkuggor(b, [{ x: fb.x + 0.5, y: fb.y + 0.5 }]).rader);
    const tillbaka = eldSkuggor(s, [{ x: fx, y: fy }]), tillbakaSkrivs = skrivsOm(skrivet, tillbaka.rader);
    return [
      [`skuggbilden skrivs om när man byter by och byter tillbaka, fast strålarna är gamla i byns minne (${[forsta, sammaIgen, andra, tillbakaSkrivs].map(x => x ? 'skrivs' : 'står').join(', ')}, minnet ${tillbaka.ny ? 'nytt' : 'gammalt'}; steg 12.1.259)`, forsta && !sammaIgen && andra && tillbakaSkrivs && !tillbaka.ny],
      [`det finns en vägg nära elden (${vagg ? bd.toFixed(1) : '–'} rutor bort) och strålar som träffar något (${skuggade} av ${SKUGGA.hall} håll)`, !!vagg && skuggade > 0],
      [`bakom väggen är det skugga, framför och på väggen inte (${bakom ? 'skugga' : 'ljust'} bakom, ${framfor ? 'skugga' : 'ljust'} framför, ${sjalv ? 'skugga' : 'ljust'} på väggen)`, bakom && !framfor && !sjalv],
      [`strålarna räknas en gång och sedan om bara när något ändrats (${ny ? 'ny' : 'gammal'}, ${igen.ny ? 'ny' : 'gammal'}, efter ett nytt hus ${omraknad ? 'ny' : 'gammal'})`, ny && !igen.ny && omraknad],
      ['skuggorna ändrar inget i byn (bara bilden)', SIM.serialize(s).replace(/"byggV":\d+/, '') === fore.replace(/"byggV":\d+/, '')],
    ];
  },
};

SCENARIER.skenet = {
  text: 'Steg 12.1.169: cirkeln där folk kan arbeta är samma cirkel som syns i bilden. Ljusets räckvidd är ett tal per ljuskälla (elden 14 rutor, facklan 12, talgljuset 5, glöden lite), och både bilden (ui/terrang.ts) och simuleringen läser samma tal: strax innanför räckvidden är det ljust nog att arbeta, strax utanför mörkt, och bilden ritar bara ett svagt sken en fjärdedel utanför den (steg 12.1.172)',
  kor: () => {
    const s = SIM.createState(3, START), e = SIM.eldXY(s, s.fire), ex = e.x + 0.5, ey = e.y + 0.5;
    // natten, och ett håll från elden utan hus
    s.now = Date.UTC(2026, 6, 1, 22); s.fire.lit = true; s.fire.fuel = 99;
    const r = SIM.eldRackvidd(s, s.fire), I = SIM.fireHeat(s, s.fire);
    const ute = [0, 1, 2, 3, 4, 5, 6, 7].map(a => a / 8 * 2 * Math.PI).find(a => !SIM.roomAt(s, Math.floor(ex + Math.cos(a) * (r - 0.3)), Math.floor(ey + Math.sin(a) * (r - 0.3))) && !SIM.roomAt(s, Math.floor(ex + Math.cos(a) * (r + 0.3)), Math.floor(ey + Math.sin(a) * (r + 0.3)))) ?? 0;
    const at = (d: number) => SIM.ljusAt(s, ex + Math.cos(ute) * d, ey + Math.sin(ute) * d);
    const innanfor = at(r - 0.3), utanfor = at(r + 0.3);
    // glöden: när elden slocknat lyser glöden lite, också i simuleringen
    const g = { ...s.fire, lit: false, emberUntil: s.now + 3600e3 }, glod = SIM.eldRackvidd(s, g as typeof s.fire);
    // bilden läser samma tal, utan någon faktor (ui/terrang.ts), och skimret krymper bara skenet
    const kod = readFileSync(new URL('../../ui/terrang.ts', import.meta.url), 'utf8');
    const sammaKurva = (kod.match(/k: -1 \}/g) ?? []).length >= 2 && !/k: -0\.\d/.test(kod);
    const bildEld = /r = eldRackvidd\(s, e\)/.test(kod) && /r: TS \* r \* \(1 \+ MORKER\.skenUt\) \* \(I > 0 \? skimmer/.test(kod), bildAndra = /r: TS \* l\.r \* \(1 \+ MORKER\.skenUt\) \* fl,/.test(kod), skimmerMindre = /const skimmer = \([^)]*\) => 1 - /.test(kod);
    return [
      [`talen: elden ${SIM.MORKER.eldR}, facklan ${SIM.FACKLA.r}, talgljuset ${SIM.LJUS.r} rutor`, SIM.MORKER.eldR === 14 && SIM.FACKLA.r === 12 && SIM.LJUS.r === 5],
      [`elden som brinner för fullt (${I.toFixed(2)}) lyser ${r.toFixed(1)} rutor: ljust strax innanför (${innanfor.toFixed(2)}), mörkt strax utanför (${utanfor.toFixed(2)})`, I > 0.99 && innanfor > 0 && utanfor === 0],
      [`glöden lyser lite, också i simuleringen (${glod} rutor)`, glod > 0 && glod < SIM.FACKLA.r],
      [`bilden ritar elden och de andra ljusen med räckvidden i simuleringen och ett svagt sken MORKER.skenUt (${SIM.MORKER.skenUt}) av den utanför, där man inte kan arbeta (${bildEld ? 'elden' : 'inte elden'}, ${bildAndra ? 'de andra' : 'inte de andra'}), och skimret krymper bara skenet (${skimmerMindre ? 'ja' : 'nej'}); alla ljuskällor har samma kurva (${sammaKurva ? 'ja' : 'nej'}, steg 12.1.176)`, bildEld && bildAndra && skimmerMindre && sammaKurva && SIM.MORKER.skenUt > 0 && SIM.MORKER.skenUt < 0.5],
    ];
  },
};

SCENARIER.skentakt = {
  text: 'Steg 12.1.177: inom en ljuskällas räckvidd är arbetstakten full, i det svaga skenet utanför (räckvidden till räckvidden gånger 1 + MORKER.skenUt) går gången och arbetet med takten MORKER.skenFart, och i mörkret utanför med MORKER.fart. Det gäller alla ljuskällor, var och en efter sin räckvidd',
  kor: () => {
    const s = SIM.createState(3, START), e = SIM.eldXY(s, s.fire), ex = e.x + 0.5, ey = e.y + 0.5, [p] = SIM.living(s);
    s.now = Date.UTC(2026, 6, 1, 22); s.fire.lit = true; s.fire.fuel = 99;
    for (const q of SIM.living(s)) if (q !== p) { q.x = ex; q.y = ey; } // ingen annan bär en fackla långt bort
    const r = SIM.eldRackvidd(s, s.fire), ut = SIM.MORKER.skenUt;
    // ett håll från elden där inget hus står i vägen
    const hall = [0, 1, 2, 3, 4, 5, 6, 7].map(a => a / 8 * 2 * Math.PI).find(a => [r - 1, r * (1 + ut / 2), r * (1 + ut) + 1].every(d => !SIM.roomAt(s, Math.floor(ex + Math.cos(a) * d), Math.floor(ey + Math.sin(a) * d)))) ?? 0;
    const takt = (d: number) => { p.x = ex + Math.cos(hall) * d; p.y = ey + Math.sin(hall) * d; return SIM.morkFart(s, p); };
    const ljus = takt(r - 1), sken = takt(r * (1 + ut / 2)), mork = takt(r * (1 + ut) + 1);
    // facklan efter sin räckvidd: en uppsatt fackla långt från elden
    const fx = ex + Math.cos(hall) * (r * (1 + ut) + 20), fy = ey + Math.sin(hall) * (r * (1 + ut) + 20);
    (s.uppsatta ??= []).push({ x: Math.floor(fx), y: Math.floor(fy), c: 1, tand: true });
    const F = SIM.FACKLA.r, vid = (d: number) => { p.x = Math.floor(fx) + 0.5 + d; p.y = Math.floor(fy) + 0.5; return SIM.morkFart(s, p); };
    const fLjus = vid(F - 1), fSken = vid(F * (1 + ut / 2)), fMork = vid(F * (1 + ut) + 1);
    return [
      [`vid elden: full takt i ljuset (${ljus}), ${SIM.MORKER.skenFart} i det svaga skenet (${sken}) och ${SIM.MORKER.fart} i mörkret (${mork})`, ljus === 1 && sken === SIM.MORKER.skenFart && mork === SIM.MORKER.fart],
      [`skenets takt ligger mellan ljusets och mörkrets (${SIM.MORKER.fart} < ${SIM.MORKER.skenFart} < 1)`, SIM.MORKER.fart < SIM.MORKER.skenFart && SIM.MORKER.skenFart < 1],
      [`vid en uppsatt fackla, efter dess räckvidd ${F}: ${fLjus}, ${fSken} och ${fMork}`, fLjus === 1 && fSken === SIM.MORKER.skenFart && fMork === SIM.MORKER.fart],
    ];
  },
};
