// Scenarier för fas 15, grupp 15 (steg 15.1.141–15.1.150).
import * as SIM from '../../sim';
import { SCENARIER, klockan, kor, tandEld, testBy } from './hjalp';
import { START } from '../kor';
import { foretagBy } from './fas14';

SCENARIER.krubbor = {
  text: 'Steg 15.1.141: krubban står bara i ett fähus. När stallets rum är fullt och inget fähus saknar krubba finns ingen plats: ingen krubba byggs i en verkstad, och bristen står kvar',
  kor: () => {
    const { s, f, r } = foretagBy(['servering']), W = SIM.W;
    for (const q of SIM.living(s)) { q.task = undefined; (q.tek ??= {}).snickarbank = 1; }
    s.stationer = (s.stationer ?? []).filter(q => !SIM.stationDef(q.k)?.fahus); SIM.touch(s); // inga krubbor i byn
    SIM.utoka(s, f, ['stall']);
    const forst = SIM.stationSite(s, 'krubba'), iRummet = !!forst && r.tiles.includes(forst.y * W + forst.x);
    // rummet fylls med diskar tills krubban inte får plats
    for (let i = 0; i < 200; i++) {
      const q = SIM.stationSite(s, 'krubba'); if (!q || !r.tiles.includes(q.y * W + q.x)) break;
      s.stationer!.push({ id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'disk', x: q.x, y: q.y, rot: q.rot, kvar: 0, inne: 1 } as unknown as SIM.Station); SIM.touch(s);
    }
    const utanFahus = SIM.fahusUtanKrubba(s).length, site = SIM.stationSite(s, 'krubba'), brist = SIM.foretagBord.krubbaBrist(s);
    const hus = site && SIM.gridOf(s).rooms.find(x => x.tiles.includes(site.y * W + site.x));
    return [
      [`med plats ställs krubban i stallets rum (${iRummet})`, iRummet],
      [`när rummet är fullt och inget fähus saknar krubba (${utanFahus}) finns ingen plats (${site ? `${site.x},${site.y} i ${hus ? SIM.husById(s, hus.hus!)?.fn : 'ute'}` : 'ingen'})`, !site],
      [`bristen står kvar (${brist})`, brist > 0],
    ];
  },
};

SCENARIER.grannat2 = {
  lang: true,
  text: 'Steg 15.1.142: en väg går åt båda hållen. Varje by finns i sina grannars listor, och huvudbyn i by 1 får en handlare inom 20 dygn (20 år i spelet)',
  kor: () => {
    const s = SIM.createState(1, START), vl = SIM.medVarld(s);
    const byar = (vl.platser ?? []).filter(p => p.k === 'by'), nr = new Map(byar.map(p => [p.nr, p] as const));
    const bada = (l: typeof byar) => l.every(p => (p.grannar ?? []).every(g => { const q = nr.get(g.nr); return !q || !!q.grannar?.some(x => x.nr === p.nr); })); // en by som blivit ruin är ingen by
    const fore = bada(byar), hb = byar.find(p => p.by === vl.huvud)!, hbGr = hb.grannar?.length ?? 0;
    let kom: number | undefined;
    for (let i = 0; i < 20 * 24 && kom === undefined; i++) kor(s, 1, b => { if (kom === undefined && (b.handlare || (b.handlarVantar as number[] | undefined)?.length)) kom = b.now; });
    const efter = (s.varld!.platser ?? []).filter(p => p.k === 'by');
    nr.clear(); for (const p of efter) nr.set(p.nr, p);
    return [
      [`varje by finns i sina grannars listor när världen skapas (${byar.length} byar, huvudbyn har ${hbGr} grannar)`, fore && hbGr > 0],
      [`huvudbyn får en handlare inom 20 dygn (${kom === undefined ? 'ingen' : `efter ${SIM.kortTal((kom - START) / SIM.DAY)} dygn`})`, kom !== undefined],
      [`grannätet är ömsesidigt också efter dygnen (${efter.length} byar)`, bada(efter)],
    ];
  },
};

// en by med en färdig hage, staketet runt om, och faren får (som hageUtanVatten i fas10.ts, men vilken hage som helst)
const medHage = (faren: number, fran = 0) => {
  for (let seed = 3 + fran * 30; seed < 30 + fran * 30; seed++) {
    const b = SIM.createState(seed, START); klockan(b, 8);
    const p = SIM.living(b).filter(r => SIM.ageOf(r, b.now) >= SIM.ALDER.vuxen)[0];
    if (faren) { SIM.setAmount(b, 'levfar', faren); SIM.stepBoskap(b); }
    for (const q of SIM.living(b)) (q.tek ??= {}).staket = 1;
    SIM.setAmount(b, 'grenar', 400); SIM.setAmount(b, 'rep', 4);
    const mat = SIM.hageUppgift(b, p); if (mat?.ref === -1) SIM.hageKlar(b, p, -1);
    for (let v = SIM.hageVal(b, p), n = 0; v && n < 200; v = SIM.hageVal(b, p), n++) SIM.hageKlar(b, p, v.i);
    const h = SIM.hagarOf(b)[0];
    if (h && SIM.hageHel(b, h) && (!fran || !SIM.hageVidVatten(b, h))) { for (const d of SIM.tamdjurOf(b)) d.hage = h.id; return { s: b, h, p }; }
  }
  return undefined;
};

SCENARIER.stampar = {
  text: 'Steg 15.1.143: levande djur byts som allt annat. Djuren i byn räknas i det byn har av den levande varan: en by med en tacka, en hage och hö nog till vintern saknar en bagge och köper en, inte fler, och nästa vår föds ett lamm',
  kor: () => {
    const b = medHage(1);
    if (!b) return [['en by med en hage och en tacka', false]];
    const { s, h } = b, tacka = SIM.tamdjurOf(s)[0]; tacka.hona = true;
    const ho = SIM.hageVidVatten(s, h) ? undefined : SIM.siteHo(s); // vatten i hagen, annars föds inga unga (steg 15.1.144)
    if (ho) { s.stationer = [...(s.stationer ?? []), { id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'vattenho', x: ho.x, y: ho.y, kvar: 0, vatten: SIM.HO.rymmer } as unknown as SIM.Station]; SIM.touch(s); }
    const utanHo = SIM.bynKopAntal(s, 'levfar'), utanHoBehov = SIM.bynBehov(s, 'levfar');
    SIM.setAmount(s, 'torrgras', 60);
    const behov = SIM.bynBehov(s, 'levfar'), antal = SIM.bynKopAntal(s, 'levfar'), getter = SIM.bynKopAntal(s, 'levget');
    // handlaren lämnar det byn köpt
    SIM.put(s, 'levfar', antal); SIM.stepBoskap(s);
    const nya = SIM.tamdjurOf(s).filter(d => d !== tacka && d.art === 'far'), bagge = nya.length === 1 && !SIM.arHona(nya[0]);
    for (const d of nya) d.hage = h.id;
    const efter = SIM.bynBehov(s, 'levfar');
    // till våren: djuren är mätta och har vatten
    let lamm = 0;
    for (let i = 0; i < 24 * 60 && !lamm; i++) {
      s.now += SIM.HOUR;
      for (const d of SIM.tamdjurOf(s)) { d.hunger = 0; d.torstTim = 0; d.torst = 0; }
      SIM.setAmount(s, 'torrgras', 60);
      SIM.stepBoskap(s, 3600);
      lamm = SIM.tamdjurOf(s).filter(d => d.art === 'far').length - 2;
    }
    return [
      [`utan hö räcker en tacka (köper ${utanHo}, behovet ${SIM.kortTal(utanHoBehov)})`, utanHo === 0 && utanHoBehov < SIM.DELA.saknar],
      [`med hage och hö saknar byn ett får (behovet ${SIM.kortTal(behov)}) och köper ett (${antal}), och av getterna köps paret (${getter})`, behov >= SIM.DELA.saknar && antal === 1 && getter === 2],
      [`det köpta fåret är en bagge (${nya.map(d => SIM.arHona(d) ? 'tacka' : 'bagge').join(', ')})`, bagge],
      [`sedan saknar byn inga får (behovet ${SIM.kortTal(efter)})`, efter < SIM.DELA.saknar],
      [`på våren föds ett lamm (${lamm})`, lamm >= 1],
    ];
  },
};

SCENARIER.hagvatten = {
  text: 'Steg 15.1.144: hagen räknar vattnet. Ett löst får som dricker vid sjön vallas inte in i en hel hage som inte når vattnet och saknar ho; byn vill ha en ho där så snart den har betesdjur, och när hon står klar med vatten leds fåret in. Platsen för en ny hage väljs närmare vattnet',
  kor: () => {
    let b: ReturnType<typeof medHage>;
    for (let i = 0; i < 6; i++) { b = medHage(1, i); if (!b || !SIM.hageVidVatten(b.s, b.h)) break; }
    if (!b || SIM.hageVidVatten(b.s, b.h)) return [['en by med en hage som inte når vattnet', false]];
    const { s, h, p } = b, far = SIM.tamdjurOf(s)[0]; far.hage = undefined;
    SIM.setAmount(s, 'grenar', 0); SIM.setAmount(s, 'rep', 4); // grenarna till staketet fyllde lagret, och repet hade då lagts utanför det (steg 15.1.45)
    const torr = SIM.hageDygn(s, h, 1), fore = SIM.vallaVal(s, p); SIM.vallaKlar(s, p, far.id);
    const inne = far.hage !== undefined, brist = SIM.hoBrist(s), plats = SIM.siteHo(s);
    if (!plats) return [['det finns plats för en ho i hagen', false]];
    s.stationer = [...(s.stationer ?? []), { id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'vattenho', x: plats.x, y: plats.y, kvar: 0, vatten: SIM.HO.rymmer } as unknown as SIM.Station]; SIM.touch(s);
    const n = SIM.hageSida(s), land = SIM.djupOf(s.seed).land, avst = (at?: { x: number; y: number }) => at ? land[at.y * SIM.W + at.x] : Infinity;
    const utanVikt = avst(SIM.faltSite(s, n, n * n)), medVikt = avst(SIM.faltSite(s, n, n * n, false, SIM.HAGE.vattenVikt));
    const blot = SIM.hageDygn(s, h, 1), efter = SIM.vallaVal(s, p); if (efter) SIM.vallaKlar(s, p, efter.id);
    return [
      [`utan ho räcker hagen inga dygn för fåret (${SIM.kortTal(torr)})`, torr === 0],
      [`fåret vallas inte in (${fore ? 'valt' : 'inte valt'}, ${inne ? 'inne' : 'löst'})`, !fore && !inne],
      [`byn vill ha en ho i hagen innan djuren står där (brist ${brist})`, brist > 0],
      [`en ny hage ligger inte längre från vattnet med vattnets vikt (${medVikt} mot ${utanVikt} rutor)`, medVikt <= utanVikt && medVikt < Infinity],
      [`med vatten i hon räcker hagen (${SIM.kortTal(blot)} dygn), och fåret leds in (${far.hage === h.id ? 'inne' : 'löst'})`, blot > 1 && efter === far && far.hage === h.id],
    ];
  },
};

SCENARIER.herde = {
  text: 'Steg 15.1.145: djurskötseln gör arbetet fortare. Skötselns handlingar har färdigheten skötsel, den med skötsel 6 mjölkar fortare än den med skötsel 1, övningen följer den arbetade tiden, och vakten kräver färdigheten för en handling med yrke',
  kor: () => {
    const s = SIM.createState(3, START); klockan(s, 10);
    const [a, b] = SIM.living(s).filter(q => SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen);
    a.skill.skotsel = 6; b.skill.skotsel = 1;
    const acts = ['mata', 'mjolka', 'klippa', 'valla', 'avliva', 'slatter', 'hamla', 'skatta'] as const;
    const alla = acts.every(k => SIM.ACTS[k].fardighet === 'skotsel' && SIM.ACTS[k].kunna === 0.5);
    const fa = SIM.kunnaFart(s, a, 'mjolka'), fb = SIM.kunnaFart(s, b, 'mjolka');
    const fore = b.skill.skotsel; SIM.ovaArbete(s, b, 'mjolka', SIM.BOSKAP.mjolkMin); const ovat = b.skill.skotsel - fore;
    const c0 = a.skill.skotsel; SIM.ovaArbete(s, a, 'mjolka', SIM.BOSKAP.mjolkMin); const ovatA = a.skill.skotsel - c0;
    const vakt = SIM.utanFardighet({ ...SIM.ACTS, provherde: { namn: 'Prövar', slag: 'odla', yrke: 'Herde' } as SIM.ActDef }, SIM.GORS);
    return [
      [`skötselns handlingar har färdigheten skötsel och kunna 0,5`, alla],
      [`den med skötsel 6 mjölkar fortare (${SIM.kortTal(SIM.BOSKAP.mjolkMin / fa)} min) än den med skötsel 1 (${SIM.kortTal(SIM.BOSKAP.mjolkMin / fb)} min)`, fa > fb],
      [`övningen följer den arbetade tiden: den långsamma övar mer på samma mjölkning (${ovat.toFixed(4)} mot ${ovatA.toFixed(4)})`, ovat > ovatA && ovatA > 0],
      [`vakten larmar för en handling med yrke utan färdighet (${vakt.join('; ')}), och inte för spelets (${SIM.utanFardighet().length})`, vakt.some(x => x.startsWith('provherde')) && SIM.utanFardighet().length === 0],
    ];
  },
};

SCENARIER.klippning = {
  text: 'Steg 15.1.146: klippningen är ett moget arbete. Ullen går förlorad när den väntar, som mjölken, och vägs på nivå 6 efter det byn behöver av ullen: en by med ett får med full ull och en kniv klipper inom ett dygn (ett år i spelet), och ullen hamnar i förrådet',
  kor: () => {
    const b = medHage(1);
    if (!b) return [['en by med en hage och ett får', false]];
    const { s, h } = b, far = SIM.tamdjurOf(s)[0];
    const ho = SIM.hageVidVatten(s, h) ? undefined : SIM.siteHo(s);
    if (ho) { s.stationer = [...(s.stationer ?? []), { id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'vattenho', x: ho.x, y: ho.y, kvar: 0, vatten: SIM.HO.rymmer } as unknown as SIM.Station]; SIM.touch(s); }
    far.ull = 1; tandEld(s); SIM.setAmount(s, 'ved', 60); SIM.setAmount(s, 'kniv', 2); SIM.setAmount(s, 'torrgras', 60);
    const rad = SIM.ARBETEN.find(r => r.id === 'klippa'), iForb = SIM.FORBATTRA.some(r => r.id === 'klippa');
    const ull0 = SIM.amountOf(s, 'ull');
    let tim = 0;
    for (; tim < 24 && !(s.stat?.klippt); tim++) kor(s, 1, x => { for (const d of SIM.tamdjurOf(x)) { d.hunger = 0; d.torstTim = 0; } });
    if (!s.stat?.klippt) kor(s, 1);
    return [
      [`klippningen är en rad på nivå 6 i ARBETEN (${rad?.niva}) och inte i Förbättra (${iForb})`, rad?.niva === 6 && !iForb],
      [`fåret klipps inom ett dygn (${s.stat?.klippt ? `efter ${tim} timmar` : 'inte'})`, !!s.stat?.klippt],
      [`ullen hamnar i förrådet (${ull0} → ${SIM.amountOf(s, 'ull')})`, SIM.amountOf(s, 'ull') >= ull0 + (SIM.tamArt('far').ull ?? 0)],
    ];
  },
};

SCENARIER.ullagare = {
  text: 'Steg 15.1.147: det djuret ger är djurets ägares. Ullen från byns får hamnar i byns förråd, och ullen från ett eget får blir ägarens, som slakten',
  kor: () => {
    const s = SIM.createState(2, START); klockan(s, 10);
    const [p, q] = SIM.living(s).filter(r => SIM.ageOf(r, s.now) >= SIM.ALDER.vuxen);
    SIM.put(s, 'levfar', 1); SIM.put(s, 'levfar', 1, { [q.id]: 1 }); SIM.stepBoskap(s);
    const byns = SIM.tamdjurOf(s).find(d => d.agare === undefined)!, egna = SIM.tamdjurOf(s).find(d => d.agare === q.id)!;
    byns.ull = 1; egna.ull = 1;
    const byn = () => SIM.amountOf(s, 'ull') - SIM.living(s).reduce((a, r) => a + SIM.ownsId(s, r.id, 'ull'), 0);
    const n = SIM.tamArt('far').ull!, b0 = byn(), p0 = SIM.ownsId(s, p.id, 'ull'), q0 = SIM.ownsId(s, q.id, 'ull');
    SIM.klippKlar(s, p, byns.id);
    const b1 = byn(), p1 = SIM.ownsId(s, p.id, 'ull');
    SIM.klippKlar(s, p, egna.id); // p klipper q:s får och arbetar för q
    const q2 = SIM.ownsId(s, q.id, 'ull'), p2 = SIM.ownsId(s, p.id, 'ull');
    return [
      [`ullen från byns får blir byns (${b0} → ${b1}), inte den som klipper (${p0} → ${p1})`, b1 === b0 + n && p1 === p0],
      [`ullen från ett eget får blir ägarens (${q0} → ${q2}), också när någon annan klipper (${p2})`, q2 === q0 + n && p2 === p0],
    ];
  },
};

SCENARIER.hagelager = {
  text: 'Steg 15.1.148: lagret läggs inte i hagen. Ett lager som växer intill en hage har inga rutor i hagen eller på staketet, en ruta inne i hagen hör inte till förrådet, och ett lager som redan ligger i en hage flyttas ut',
  kor: () => {
    const b = medHage(0);
    if (!b) return [['en by med en hage', false]];
    const { s } = b, z = SIM.zonesOf(s).find(q => q.hus === undefined);
    if (!z) return [['byn har en lagerplats ute', false]];
    // hagen ligger tätt intill lagret, på dess östra sida
    const h = s.hagar![0]; h.x = z.x + z.w + 1; h.y = z.y; s.staket = SIM.hageKant(s, h); s.byggV = (s.byggV ?? 0) + 1; SIM.changed(s);
    const rutorI = () => SIM.zonesOf(s).filter(q => q.hus === undefined).reduce((n, q) => { let k = 0; for (let y = q.y; y < q.y + q.h; y++) for (let x = q.x; x < q.x + q.w; x++) if (SIM.iHageRuta(s, x, y)) k++; return n + k; }, 0);
    let vaxt = 0; for (let i = 0; i < 12; i++) if (SIM.lagerStorre(s)) vaxt++;
    const efterVaxt = rutorI(), forrad = SIM.isStored(s, h.x + 1, h.y + 1);
    // ett lager som ligger i hagen flyttas ut
    const z2 = SIM.zonesOf(s).find(q => q.hus === undefined)!; z2.x = h.x; z2.y = h.y; SIM.changed(s);
    const fore = rutorI(); SIM.lagerIHagen(s); const efter = rutorI();
    return [
      [`lagret växer (${vaxt} gånger) och har ${efterVaxt} rutor i hagen eller på staketet`, vaxt > 0 && efterVaxt === 0],
      [`en ruta inne i hagen hör inte till förrådet (${forrad})`, !forrad],
      [`ett lager i hagen (${fore} rutor) flyttas ut (${efter})`, fore > 0 && efter === 0],
    ];
  },
};

SCENARIER.betevagg = {
  text: 'Steg 15.1.149: djuren betar inte i väggar. Ett löst djur intill ett hus står aldrig på en vägg under ett dygn (ett år i spelet), när det letar bete som när det strövar',
  kor: () => {
    const s = SIM.cloneState(testBy(10, b => SIM.housesOf(b).some(h => h.klar))), W = SIM.W;
    // en ruta utanför en husvägg, med gräs på väggens ruta
    let vid: { x: number; y: number } | undefined;
    for (let i = 0; i < W * SIM.H && !vid; i++) {
      const x = i % W, y = Math.floor(i / W);
      if (!SIM.isWall(s, x, y) || SIM.roomAt(s, x + 0.5, y + 0.5)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!vid && SIM.inMap(x + dx, y + dy) && !SIM.blocked(s, x + dx + 0.5, y + dy + 0.5) && !SIM.roomAt(s, x + dx + 0.5, y + dy + 0.5)) vid = { x: x + dx, y: y + dy };
    }
    if (!vid) return [['ett hus med en vägg mot marken', false]];
    s.tamdjur = []; s.hagar = [];
    const g = SIM.groundOf(s);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = vid.x + dx, y = vid.y + dy; if (SIM.inMap(x, y)) { g.cover[y * W + x] = 1; if (g.buske) g.buske[y * W + x] = SIM.isWall(s, x, y) ? 1 : 0; } } // gräs och buskar också i väggen
    const get = SIM.nyttTamdjur(s, 'get', vid.x + 0.5, vid.y + 0.5, undefined, s.now - 3 * SIM.DAY), far = SIM.nyttTamdjur(s, 'far', vid.x + 0.5, vid.y + 0.5, undefined, s.now - 3 * SIM.DAY);
    let iVagg = 0, at = 0;
    for (let t = 0; t < 24; t++) {
      s.now += SIM.HOUR;
      for (const d of [get, far]) d.hunger = 0.6;
      SIM.stepHagar(s);
      for (const d of [get, far]) { if (SIM.blocked(s, d.x, d.y)) iVagg++; }
      at += (s.stat?.betadeGras ?? 0) + (s.stat?.betadeBuskar ?? 0) > 0 ? 1 : 0;
    }
    return [
      [`djuren betar (${s.stat?.betadeGras ?? 0} gräs, ${s.stat?.betadeBuskar ?? 0} buskar)`, at > 0],
      [`inget djur står på en vägg (${iVagg} timmar)`, iVagg === 0],
    ];
  },
};
