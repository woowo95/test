// Scenarier för fas 15, grupp 1 av 15.1 (Rättningar från spelgranskningen).
import * as SIM from '../../sim';
import { SCENARIER, byggKlart, testBy } from './hjalp';
import { foretagBy } from './fas14';

// en by med minst tio vuxna, utan företag, där ägaren har god mat och de andra silver
function utanForetag() {
  const s = SIM.cloneState(testBy(25, b => SIM.living(b).filter(q => !q.gast && SIM.ageOf(q, b.now) >= SIM.ALDER.vuxen && SIM.kanGa(q)).length >= 10));
  s.foretag = []; s.foretagLart = undefined;
  const vux = SIM.living(s).filter(q => !q.gast && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen && SIM.kanGa(q)), p = vux[0];
  const fin = SIM.FOOD.find(k => SIM.maltidsNiva(k) === 'fin')!;
  SIM.laggIn(s, fin, 300, p.id); SIM.laggIn(s, 'silver', 400, p.id);
  for (const q of vux) if (q !== p) SIM.laggIn(s, 'silver', 60, q.id);
  return { s, p, vux, fin };
}
// en station av sorten k där byn skulle ställa den nu, färdigbyggd
function stallDit(s: SIM.State, k: string, r?: SIM.Rum) {
  const at = r ? SIM.siteInne(s, k, r) : SIM.stationSite(s, k);
  if (!at) return undefined;
  const t = { id: s.nextStation = (s.nextStation ?? 0) + 1, k, kvar: 0, ...at } as unknown as SIM.Station;
  s.stationer!.push(t); SIM.touch(s); SIM.changed(s);
  return t;
}

SCENARIER.foretagshus = {
  text: 'Steg 15.1.15: huset rymmer verksamheterna. Ytan som planeras för företagets hus räknas ur stationerna verksamheterna behöver (disken och var och ens sak, med golvet framför och dörren). Ett företag med servering och nattlogi får ett hus där disk, bord och bädd ryms, och när stall läggs till byggs huset ut',
  kor: () => {
    const { s, p } = utanForetag(), verk = ['servering', 'nattlogi'];
    for (const q of SIM.living(s)) (q.tek ??= {}).halmbadd = 1;
    const f = SIM.starta(s, p.id, verk), plats = SIM.foretagPlats(verk), a = SIM.foretagKrok.akut(s);
    const h = SIM.planeraHus(s, 'naringshus', a);
    if (h) byggKlart(s, h);
    SIM.foretagTimme(s); SIM.touch(s); SIM.changed(s);
    const golv = SIM.foretagGolv(s, f), rum = SIM.foretagRum(s, f), iRum = (t?: SIM.Station) => !!t && t.k !== '' && SIM.stationRum(s, t)?.hus === f.hus && rum.length > 0;
    const disk = stallDit(s, "disk"), bord = stallDit(s, 'bord', SIM.foretagBord.rum(s)[0]?.r), badd = stallDit(s, 'halmbadd');
    const klarAkut = SIM.foretagKrok.akut(s);
    // stallet läggs till: krubban ryms inte, och huset byggs ut
    const kostar = SIM.utokKostnad(s, f, 'stall'), krubba = SIM.RECEPT.krubba.av as Record<string, number>, sak = Object.entries(krubba).reduce((n, [k, m]) => n + m * SIM.grundvarde(k), 0);
    SIM.utoka(s, f, ['stall']);
    const b = SIM.foretagKrok.akut(s);
    const h2 = SIM.planeraHus(s, 'naringshus', b);
    for (let i = 0; i < 3 && h2?.ut; i++) byggKlart(s, h2); // den nya delen, sedan den gamla väggen
    SIM.touch(s); SIM.changed(s);
    const golv2 = SIM.foretagGolv(s, f), kr = stallDit(s, 'krubba');
    return [
      [`ytan räknas ur disken, bordet och bädden (${plats} rutor, var 9)`, plats === 1 + 3 * 4],
      [`huset som planeras får den ytan (${a.plats} rutor, ägare ${a.ag === p.id})`, a.plats === plats && a.ag === p.id],
      [`huset blir företagets och rymmer den (${golv} rutor)`, f.hus === h?.id && golv >= plats],
      [`disken, bordet och bädden står i företagets rum (${[disk, bord, badd].map(t => iRum(t) ? 'ja' : 'nej').join(', ')})`, iRum(disk) && iRum(bord) && iRum(badd)],
      [`inget mer byggs när allt ryms (${klarAkut.v})`, klarAkut.v === 0],
      [`att lägga till stallet kostar krubban och utbyggnaden (${kostar.toFixed(0)} mot krubban ${sak.toFixed(0)})`, kostar > sak],
      [`stallet gör huset för litet: det byggs ut (${b.plats} rutor till i hus ${b.hus})`, b.v > 0 && b.hus === f.hus && golv2 > golv],
      [`efter utbyggnaden ryms krubban (${golv2} rutor, krubban i rummet: ${iRum(kr)})`, golv2 >= SIM.foretagPlats(f.verk) && iRum(kr)],
    ];
  },
};

SCENARIER.diskplats = {
  text: 'Steg 15.1.16: disken står i företagets hus. Byggsystemet planerar ingen verkstad åt disken eller varubordet, disken gör inte rummet till en verkstad, och en disk som står utanför ett företags rum står i vägen: den flyttas dit eller tas isär',
  kor: () => {
    const { s, f, disk } = foretagBy(), W = SIM.W;
    const iForetaget = (t?: SIM.Station) => !!t && SIM.stationRum(s, t)?.hus === f.hus;
    const taggar = [...SIM.rumTaggar(s, SIM.stationRum(s, disk)!)];
    // utan disk: den som byggs hamnar i företagets rum
    s.stationer = s.stationer!.filter(t => t !== disk); SIM.touch(s); SIM.changed(s);
    const ny = stallDit(s, 'disk'), nyRatt = iForetaget(ny);
    // utan något företags rum med plats: ingen verkstad planeras åt disken eller varubordet
    s.stationer = s.stationer!.filter(t => t !== ny); const hus = f.hus; f.hus = undefined; s.foretag = []; SIM.touch(s); SIM.changed(s);
    const utan = SIM.inneUtanPlats(s), verkstad = SIM.BYGGNADER.verkstad.akut!(s);
    // en disk i ett hus utan företag står i vägen
    const r = SIM.gridOf(s).rooms.find(x => x.hus !== undefined && x.hus !== hus && SIM.husById(s, x.hus)?.klar && SIM.husById(s, x.hus)!.fn !== 'naringshus' && SIM.husById(s, x.hus)!.tro === undefined && x.tiles.length >= 6)!;
    const at = SIM.siteInne(s, 'disk', r) ?? { x: r.tiles[0] % W, y: Math.floor(r.tiles[0] / W), inne: 1 as const };
    const fel = { id: s.nextStation = (s.nextStation ?? 0) + 1, k: 'disk', kvar: 0, ...at } as unknown as SIM.Station;
    s.stationer!.push(fel); SIM.touch(s); SIM.changed(s);
    for (const p of SIM.living(s)) if (SIM.stationRum(s, fel) && Math.hypot(p.x - fel.x, p.y - fel.y) < 3) { p.x = SIM.eldPlats(s).x + 0.5; p.y = SIM.eldPlats(s).y + 0.5; p.task = undefined; }
    SIM.stepStationer(s);
    const kvar = SIM.stationerOf(s).find(t => t.id === fel.id);
    return [
      [`disken gör inte företagets rum till en verkstad (${taggar.join(', ')})`, !taggar.includes('verkstad')],
      [`en disk som byggs hamnar i företagets rum (${ny ? `${ny.x},${ny.y}` : 'ingen plats'})`, nyRatt],
      [`utan företagets rum planeras ingen verkstad åt disken (${utan ?? 'ingen'}, verkstad ${verkstad.v})`, utan !== 'disk' && utan !== 'varubord'],
      [`registret säger att disken och varubordet står i ett företags rum`, !!SIM.stationDef('disk')?.foretag && !!SIM.stationDef('varubord')?.foretag],
      [`ett hus utan företag behåller ingen disk (${kvar ? 'står kvar' : 'borta'})`, !kvar],
    ];
  },
};
