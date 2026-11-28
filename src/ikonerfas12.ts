// Björns val ur bildstilen som byggs in i fas 12 (steg 12.6.1). laggTillFas12 anropas sist i ikoner.ts med dess register, så att
// platshållarna där ersätts. Symbolen i listorna är kartbilden mitt i rutan (iRutan); på kartan ritas bilden i sin naturliga
// storlek (kb_<id>, som ikoner.ts lägger till för alla kartbilder)
import { KARTBILDER } from './kartbilder';

type Pix = Record<string, string[]>;
type Pal = Record<string, Record<string, string>>;
type Bild = { w: number; h: number; rader: readonly string[]; pal: Record<string, string> };

// sakerna, teknikerna och djuren vars symbol är en kartbild (iRutan): namnet i spelet och bilden i bildstilen
const LISTA: [string, string][] = [
  ['notter', 'notter'], ['lovkarve', 'lovkarve'], ['salt', 'salt'], ['lok', 'lok'], ['hage', 'hage'], ['bikupa', 'bikupa'], ['gudabild', 'gudabild'],
  ['bryggkar', 'bryggkar'], ['orte', 'vatska_te'], ['ol', 'vatska_ol'], ['vin', 'vatska_vin'], ['mjolk', 'vatska_mjolk'],
  ['gris', 'tam_gris_1'], ['kulting', 'tam_gris_1'], ['slaktgris', 'tam_gris_1'], ['ko', 'tam_ko_1'], ['levko', 'tam_ko_1'], ['slaktko', 'tam_ko_1'],
  ['vildsvin', 'vildsvin_1'], ['i_aventyrare', 'sym_aventyrare'], ['karta', 'sym_kartblad'],
];
// symbolerna som ritas i sin egen storlek (tecknet i panelerna, krönikans kategori och samtalets ämne)
const EGEN: [string, string][] = [
  ['sym_helgon', 'sym_helgon'], ['sym_kvade', 'sym_kvade'], ['sym_kyrkoforrad', 'sym_kyrkoforrad'], ['sym_troende', 'sym_troende'], ['sym_sandebud', 'sym_sandebud'],
  ['kk_tro', 'sym_kk_tro'], ['amne_mat', 'sym_amne_mat'],
];
const spegla = (r: readonly string[]) => r.map(x => [...x].reverse().join(''));

export function laggTillFas12(PIX: Pix, PAL: Pal, iRutan: (b: Bild) => string[]) {
  const lagg = (k: string, b: Bild | undefined, rader?: string[]) => { if (b) { PIX[k] = rader ?? [...b.rader]; PAL[k] = b.pal; } };
  for (const [k, id] of LISTA) { const b = KARTBILDER[id]; if (b) lagg(k, b, iRutan(b)); }
  for (const [k, id] of EGEN) lagg(k, KARTBILDER[id]);
  // vaxljuset (foremal.ts ritar kb_<sort><1|2>[_tand]): samma bild i båda utseendena
  for (const v of ['1', '2']) { lagg('kb_vaxljus' + v, KARTBILDER.vaxljus); lagg('kb_vaxljus' + v + '_tand', KARTBILDER.vaxljus_tand); }
  lagg('vaxljus', KARTBILDER.vaxljus);
  // bryggkaret är tre rutor långt och kan stå vridet: den stående bilden under det gamla namnet också (stationer utan kartbild, steg 3.10.7)
  lagg('bryggkar_karta', KARTBILDER.bryggkar); lagg('bryggkar_karta_v', KARTBILDER.bryggkar_v);
  // gudabilden i två utseenden efter stationens id (stationBild i foremal.ts väljer bland <id>, <id>_2 och <id>_3): stavguden och Tor
  lagg('kb_gudabild_2', KARTBILDER.gudabild_tor);
  // grisen och kon: ritade från sidan, och framåt och bakåt syns de från sidan som fåret och geten (tamBild i ui/vaxter.ts)
  for (const a of ['gris', 'ko']) for (let v = 1; v <= 4; v++) {
    const b = KARTBILDER[`tam_${a}_${v}`]; if (!b) continue;
    lagg(`kb_tam_${a}_${v}_sida`, b); lagg(`kb_tam_${a}_${v}_fram`, b); lagg(`kb_tam_${a}_${v}_vast`, b, spegla(b.rader)); lagg(`kb_tam_${a}_${v}_bak`, b, spegla(b.rader));
  }
  // oxen och hästen (steg 15.1.150): platshållare i paletten tills Björn valt, kons form från sidan i oxens mörkbruna och hästens
  // grå färger, hästen utan horn. Samma bild i de tre utseendena (tamBild i ui/vaxter.ts)
  const ko = KARTBILDER.tam_ko_1;
  if (ko) {
    const oxe: Bild = { ...ko, pal: { ...ko.pal, d: '#521100', f: '#742a01', e: '#7d5b40', h: '#5e3c24' } };
    const hast: Bild = { ...ko, rader: ko.rader.map((r, i) => i < 2 ? r.replace(/[ab]/g, '.') : r), pal: { ...ko.pal, d: '#7e7362', f: '#a0947d', e: '#bdb39b', h: '#987e62' } };
    for (const [a, b] of [['oxe', oxe], ['hast', hast]] as const) {
      for (let v = 1; v <= 3; v++) { lagg(`kb_tam_${a}_${v}_sida`, b); lagg(`kb_tam_${a}_${v}_fram`, b); lagg(`kb_tam_${a}_${v}_vast`, b, spegla(b.rader)); lagg(`kb_tam_${a}_${v}_bak`, b, spegla(b.rader)); }
      for (const k of [a, `lev${a}`]) lagg(k, b, iRutan(b));
    }
  }
  // vildsvinet i skogen i tre utseenden (djurBild i ikoner.ts), likadant från sidan
  for (let v = 1; v <= 3; v++) {
    const b = KARTBILDER[`vildsvin_${v}`]; if (!b) continue;
    lagg(`kb_vild_vildsvin_${v}_sida`, b); lagg(`kb_vild_vildsvin_${v}_fram`, b); lagg(`kb_vild_vildsvin_${v}_vast`, b, spegla(b.rader)); lagg(`kb_vild_vildsvin_${v}_bak`, b, spegla(b.rader));
  }
}
