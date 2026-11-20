// ikoner för föremål: små pixelbilder (8×8) som används både på kartan och i listorna
// varje tecken är en pixel, '.' är genomskinlig
import { KLADER_AV } from './sim/klader';
import { RATT_SAKER, rattInfo } from './sim/ratter';
import { KARTBILDER } from './kartbilder';
import { STUBBILDER } from './stubbilder';
import { ANIMBILDER } from './animbilder';
import { DJURBILDER, type Hall } from './djurbilder';
import { farg } from './palett';

// slagen av arbete ritas ljust i en färg (vattnet blått)
const AKT = { w: '#dad0bb', a: '#8a9c9e' };
// vädrets symboler (steg 2.11.1): samma färger för alla sex
const VADER_PAL = { K: '#61767a', S: '#dad0bb', W: '#dad0bb', a: '#906f0f', b: '#b2921b', c: '#d8b25f', d: '#8a9c9e', k: '#3e5156', o: '#24201d', s: '#bdb39b', v: '#bdb39b', w: '#a0947d', y: '#d8b25f' };
const AMNE_PAL = { k: '#24201d', r: '#a14808', R: '#bd753e', y: '#906f0f', Y: '#b2921b', j: '#7d5b40', s: '#61767a', b: '#3e5156' };
export const PAL: Record<string, Record<string, string>> = {
  // facklan på väggen (steg 9.2.11, platshållare): en järnhållare i väggen, skaftet snett upp och huvudet av näver och talg
  an_klo: { w: '#dad0bb', r: '#a14808', k: '#24201d' }, an_bett: { w: '#dad0bb', r: '#a14808', k: '#24201d' }, // björnens klor och vargens bett i striden (steg 9.2.31, platshållare)
  kolstubbe: { k: '#24201d', K: '#2f261d', g: '#474138' }, // den svarta stubben efter en brand (steg 9.2.26, platshållare)
  // den uppsatta facklan på marken i människornas skala (steg 9.2.98, platshållare): två tredjedelar så hög som en vuxen
  uppsatt_mark: { k: '#24201d', K: '#474138', j: '#5e3c24', J: '#7d5b40', y: '#906f0f', Y: '#b2921b' },
  uppsatt_mark_tand: { k: '#24201d', K: '#474138', j: '#5e3c24', J: '#7d5b40', y: '#906f0f', Y: '#b2921b', r: '#a14808', o: '#bd753e', g: '#d8b25f', w: '#dad0bb' },
  // samtalens ämnen i 8 punkter (steg 9.2.10, platshållare): en symbol per ämne i den lilla pratbubblan
  ...Object.fromEntries(['amne_gral'].map(k => [k, AMNE_PAL])),
  // trons och gudarnas symboler: amuletter i guld på en mörk bricka (Björn valde stil 3 efter v245, steg 4.5.2)
  ...Object.fromEntries(['tro_blixt', 'tro_brand', 'tro_vinter', 'tro_regn', 'tro_flod', 'tro_hare', 'tro_barn', 'tro_drom', 'gud_aska', 'gud_sjon', 'gud_skord', 'gud_doden', 'gud_jakt', 'gud_elden', 'gud_vintern', 'gud_solen', 'gud_atten', 'gud_kriget', 'gud_hantverk'].map(k => [k, { d: '#5e3c24', e: '#b2921b', f: '#d8b25f', o: '#24201d' }])),
  kanin: { b: '#7e7362', B: '#a0947d', w: '#dad0bb', k: '#24201d', p: '#a0947d' },
  spindling: { c: '#a14808', C: '#bd753e', s: '#bdb39b', S: '#987e62' },
  // sportens föremål (steg 4.3.1.2, platshållare)
  boll_liten: { o: '#24201d', a: '#3f2415', b: '#5e3c24', c: '#7d5b40', e: '#987e62' }, // bollen på kartan i egna 6 punkter (Björn sa ja, bildstil v166, steg 5.5.5)
  // scenen och instrumenten (steg 4.3.2.2, platshållare i bildstilens palett, 16 punkter per ruta)
  scen: { w: '#5e3c24', W: '#7d5b40', L: '#987e62', H: '#a0947d' },
  scen_karta_v: { o: '#24201d', a: '#3f2415', b: '#5e3c24', c: '#7d5b40', e: '#987e62' }, // scenen vriden: version 1 vriden ett kvarts varv (platshållare tills den stående bilden är ritad, steg 4.5.2)
  scen_karta: { o: '#24201d', a: '#3f2415', b: '#5e3c24', c: '#7d5b40', e: '#987e62' }, // (Björn valde version 1 efter v245, steg 4.5.2)
  // pyntet (steg 4.3.4, platshållare i bildstilens palett, 16 punkter per ruta)
  kruka: { o: '#24201d', r: '#521100', R: '#742a01', T: '#bd753e', k: '#2f261d', z: 'rgba(36,32,29,.30)' }, // (Björn valde version 1 efter v245, steg 4.5.2)
  // trons altare (steg 10.3.19, platshållare, 16 punkter per ruta)
  heligt: { o: '#24201d', y: '#d8b25f', e: '#dad0bb', c: '#987e62' }, // symbolen för ett heligt ting (steg 10.3.20, platshållare)
  gudabild: { o: '#24201d', a: '#3f2415', b: '#5e3c24', c: '#7d5b40', e: '#987e62', y: '#d8b25f', z: 'rgba(36,32,29,.30)' }, // gudabilden av trä (steg 10.3.19, platshållare)
  // långhusets bänk (steg 10.2.68, platshållare, 16 punkter per ruta)
  vagnsvrak: { o: '#24201d', a: '#3f2415', b: '#5e3c24', c: '#7d5b40', e: '#987e62', s: '#bdb39b', S: '#a0947d', z: 'rgba(36,32,29,.30)' }, // grundarnas trasiga vagn (steg 11.6.13, platshållare, 16 punkter)
  // filten där stora byten görs (steg 4.4.1.1, platshållare, 16 punkter)
  handslag: { a: '#bd753e', b: '#7d5b40', c: '#647025', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // (steg 4.5.4.17: platshållare; Björn väljer i bildstilen)
  rovare: { h: '#a0947d', H: '#24201d', c: '#474138', C: '#372f25', s: '#7e7362', S: '#bdb39b', o: '#24201d' },
  handlare: { h: '#bdb39b', H: '#2f261d', c: '#3e5156', C: '#474138', b: '#7d5b40', B: '#5e3c24', s: '#24201d' },
  filt: { d: '#3f2415', r: '#742a01', R: '#a14808', y: '#bdb39b', k: '#2f261d' },
  // latrinen och benspaden (steg 2.7.2, Björn valde P6 och S1c/S1g efter v85)
  latrin_karta: { o: '#7d5b40', O: '#987e62', d: '#372f25', k: '#24201d' },
  // grillställningen och den grillade maten (steg 2.8.1; Björn valde 1b för kartan och symbolerna efter v89)
  grill_karta: { w: '#5e3c24', W: '#7d5b40', L: '#987e62', O: '#a0947d', q: '#5e3c24', D: '#24201d', x: 'rgba(36,32,29,.30)' },
  // torkställningen och den torkade maten (steg 2.8.2; Björn valde 4a, fiskhäck med A-ramar, för kartan, och symbolerna efter v89; torkad fisk väntar på Björns val)
  tork_karta: { w: '#5e3c24', W: '#7d5b40', L: '#987e62', O: '#a0947d', x: 'rgba(36,32,29,.30)' },
  // de vilda grödorna, fröna och odlingen (steg 2.10.2, platshållare i bildstilens palett; den vilda rovan, rovfröna och
  // ärtfröna i steg 3.10.23.8, platshållare)
  vildarter: { o: '#353204', g: '#4b4f00', G: '#647025', L: '#898b4c', y: '#b2921b' },
  odling: { k: '#3f2415', j: '#5e3c24', J: '#7d5b40', g: '#4b4f00', G: '#647025', L: '#898b4c' },
  // skogsvården (steg 6.5.2, platshållare): en planta med rotklump bredvid en spade
  skogsvard: { k: '#3f2415', j: '#5e3c24', g: '#4b4f00', G: '#647025', L: '#898b4c', b: '#dad0bb', o: '#24201d' },
  // ledarskapet: ledaren och folket (Björn valde version 3 efter v193, steg 3.10.13)
  ledarskap: { o: '#24201d', a: '#d8b25f', b: '#61767a' },
  // grödorna från fälten och grodden på fältet (steg 2.10.3, platshållare i bildstilens palett)
  grodd: { G: '#647025', L: '#898b4c', g: '#4b4f00' },
  grodd_liten: { G: '#647025', L: '#898b4c', g: '#4b4f00', j: '#7d5b40' },
  ...Object.fromEntries(['klart', 'moln', 'regn', 'sno', 'blast', 'aska', 'dimma'].map(k => ['vader_' + k, VADER_PAL])),
  skinnklader: { b: '#7d5b40', B: '#987e62', d: '#5e3c24', w: '#bdb39b' },
  // stationerna på kartan i blandperspektiv (ovansidan och framsidan): lika breda som rutorna de tar (8 punkter per ruta,
  // stationer.ts); de som är högre än rutan sticker upp över rutan ovanför (foremal.ts)
  slaktbank_karta: { b: '#372f25', B: '#24201d', w: '#5e3c24', W: '#7d5b40', L: '#987e62', H: '#a0947d', r: '#742a01', R: '#521100', Y: '#a14808', x: 'rgba(36,32,29,0.30)' },
  flatarbank_karta: { D: '#24201d', d: '#372f25', w: '#5e3c24', W: '#7d5b40', L: '#987e62', H: '#a0947d', o: '#7e7362', O: '#a0947d', q: '#5e3c24', x: 'rgba(36,32,29,0.30)' },
  // halmbädden och sittplatsen vid slöjdbänken (steg 2.2.5; Björn valde kartbilderna efter v89, symbolen i listan är en platshållare)
  halmbadd_karta: { q: '#987e62', t: '#7d5b40', Y: '#d8b25f', y: '#b2921b', x: 'rgba(36,32,29,0.30)' },
  // borden (steg 2.2.15; Björn valde kartbilderna efter v89). Stubbarna runt dem är sittplatsen ovan
  bord_karta: { H: '#a0947d', w: '#5e3c24', L: '#987e62', W: '#7d5b40', b: '#5e3c24', B: '#7d5b40', d: '#2f261d', x: 'rgba(36,32,29,0.30)' },
  bord2_karta: { H: '#a0947d', w: '#5e3c24', L: '#987e62', W: '#7d5b40', b: '#5e3c24', B: '#7d5b40', d: '#2f261d', x: 'rgba(36,32,29,0.30)' },
  bord3_karta: { H: '#a0947d', w: '#5e3c24', L: '#987e62', W: '#7d5b40', b: '#5e3c24', B: '#7d5b40', d: '#2f261d', x: 'rgba(36,32,29,0.30)' },
  // förvaringen (steg 2.3.6; Björn valde kartbilderna efter v89)
  hylla_karta: { W: '#7d5b40', w: '#372f25', L: '#987e62', r: '#a0947d', x: 'rgba(36,32,29,.30)' },
  kista_karta: { f: '#7e7362', s: '#24201d', F: '#bdb39b', z: '#2f261d', W: '#694902', w: '#24201d', x: 'rgba(36,32,29,.35)' },
  stall_karta: { W: '#7d5b40', L: '#987e62', w: '#372f25', x: 'rgba(36,32,29,.30)' },
  // skinnfällen i halmbädden (steg 2.2.14; Björn valde kartbilden efter v89)
  skinnfall_karta: { z: '#474138', S: '#987e62', s: '#7d5b40', f: '#474138' },
  // skinndörren i dörröppningen (steg 2.2.16; Björn valde kartbilden efter v89)
  tradorr: { o: '#24201d', J: '#7d5b40', j: '#5e3c24', W: '#987e62', k: '#24201d' },
  tradorr_karta: { o: '#24201d', J: '#7d5b40', j: '#5e3c24', W: '#987e62', k: '#24201d' },
  skinndorr_karta: { e: '#bdb39b', E: '#dad0bb', o: '#5e3c24', O: '#7e7362', S: '#987e62', s: '#7d5b40', Z: '#2f261d', z: '#474138', d: '#372f25' },
  pergament: { w: '#dad0bb', k: '#bdb39b' },
  karta: { w: '#dad0bb', k: '#bdb39b', d: '#5e3c24', r: '#a14808', b: '#61767a', o: '#24201d' }, // platserna i världen (steg 11.4.4, platshållare)
  blad: { w: '#dad0bb', k: '#bdb39b', d: '#24201d' },
  // steg 10.10.2, platshållare
  vagn: { o: '#24201d', a: '#5e3c24', b: '#987e62', r: '#bdb39b', z: 'rgba(36,32,29,.30)' }, // steg 11.11.2, platshållare (också tekniken Vagn)
  // steg 10.10.3, platshållare (också tekniken Släde)
  bagborr: { o: '#24201d', a: '#5e3c24', b: '#987e62', r: '#bdb39b', z: 'rgba(36,32,29,.30)' }, // steg 10.6.13, platshållare
  bisymbol: { o: '#24201d', y: '#b2921b' }, // steg 10.10.25, platshållare: ett bi på fältrutan
  bivax: { o: '#24201d', h: '#d8b25f', H: '#b2921b', d: '#906f0f', z: 'rgba(36,32,29,.30)' }, // steg 10.10.20, platshållare
  bikupa: { o: '#24201d', h: '#d8b25f', H: '#b2921b', d: '#906f0f', g: '#5e3c24', z: 'rgba(36,32,29,.30)' }, // steg 10.10.16, platshållare
  honung: { o: '#24201d', h: '#b2921b', H: '#d8b25f', d: '#906f0f', v: '#694902', z: 'rgba(36,32,29,.30)' }, // steg 10.7.25, platshållare
  blomma: { o: '#24201d', g: '#647025', l: '#898b4c', y: '#d8b25f', c: '#bd753e', w: '#dad0bb', z: 'rgba(36,32,29,.30)' }, // steg 10.7.3, platshållare
  bildsten: { o: '#24201d', g: '#8a9c9e', m: '#61767a', r: '#a14808', b: '#3f2415', d: '#474138', y: '#d8b25f', z: 'rgba(36,32,29,.30)' }, // steg 10.7.1, platshållare
  bokhylla: { o: '#24201d', a: '#3f2415', b: '#5e3c24', c: '#7d5b40', r: '#742a01', g: '#4b4f00', w: '#dad0bb', z: 'rgba(36,32,29,.30)' }, // steg 10.6.16, platshållare
  skrivpulpet: { o: '#24201d', a: '#3f2415', b: '#5e3c24', c: '#7d5b40', w: '#dad0bb', d: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 10.6.11, platshållare
  bok: { h: '#7d5b40', w: '#dad0bb', d: '#24201d' }, // steg 10.6.6, platshållare // steg 10.6.5, platshållare // steg 10.6.4, platshållare
  // (Björn valde version 1 efter v245, steg 4.5.2)
  risvagg: { p: '#5e3c24', b: '#7d5b40', B: '#987e62' },
  hogolv: { y: '#d8b25f', Y: '#dad0bb', d: '#7d5b40' },
  tragolv: { b: '#7e7362', B: '#987e62', d: '#5e3c24' },
  paborjat: { w: '#dad0bb', d: '#24201d', y: '#d8b25f' },
  a_samla: AKT,
  a_be: AKT,
  hov: { o: '#372f25', j: '#5e3c24', J: '#7d5b40', y: '#d8b25f' },
  hov_bygge: { o: '#372f25', j: '#5e3c24', J: '#7d5b40' },
  tempel: { o: '#233035', s: '#61767a', S: '#8a9c9e', j: '#3e5156', y: '#d8b25f' },
  grav: { o: '#372f25', j: '#5e3c24', J: '#7d5b40', s: '#61767a', S: '#8a9c9e' },
  helig_sten: { o: '#372f25', s: '#61767a', S: '#8a9c9e', y: '#d8b25f' },
  helig_vatten: { o: '#372f25', b: '#61767a', B: '#8a9c9e', y: '#d8b25f' },
  helig_lund: { o: '#372f25', g: '#647025', G: '#898b4c', y: '#d8b25f' },
  helig_trad: { o: '#372f25', g: '#647025', j: '#5e3c24', y: '#d8b25f' },
  kroppsdel: { o: '#372f25', H: '#bd753e', r: '#a14808', R: '#742a01' },
  dodkropp: { o: '#372f25', H: '#a0947d', w: '#7e7362' },
  skandad: { o: '#372f25', H: '#a0947d', w: '#7e7362', r: '#742a01' },
  zzz: { w: '#dad0bb' },
  a_odla: AKT,
  a_jaga: AKT,
  a_smyga: AKT,
  a_prata: AKT, a_toa: { w: '#dad0bb', a: '#8a9c9e', b: '#3f2415', B: '#5e3c24', c: '#7d5b40' },
  a_sikta: AKT,
  kanin_larm: { k: '#24201d', y: '#d8b25f' },
  a_fiska: AKT,
  a_tra: AKT,
  a_bygga: AKT,
  a_hantverk: AKT,
  a_bara: AKT,
  a_elda: AKT,
  a_leka: AKT,
  // Björns valda symboler efter v89 (steg v91): handlingar (a_), skador (s_), näring (n_) och brister (b_)
  a_svalka: { w: '#dad0bb', a: '#8a9c9e', y: '#d8b25f', r: '#bd753e' },
  a_dricka: { w: '#dad0bb', a: '#8a9c9e', y: '#d8b25f', r: '#bd753e' },
  a_fatt: { w: '#dad0bb', a: '#8a9c9e', y: '#d8b25f', r: '#bd753e' },
  a_smalta: { w: '#dad0bb', a: '#8a9c9e', y: '#d8b25f', r: '#bd753e' },
  a_vatten: { w: '#dad0bb', a: '#8a9c9e' }, // steg 2.10.1, platshållare i bildstilens palett
  // relationstyperna (steg 3.1.1, RELATIONER i relationer.ts), platshållare i bildstilens palett
  // samtalens ämnen (steg 3.9.5, platshållare i bildstilens palett)
  s_mat: { o: '#24201d', b: '#7d5b40', B: '#5e3c24', k: '#742a01', w: '#bdb39b', y: '#b2921b' }, // (Björn sa ja efter v245, steg 4.5.2)
  s_trost: { o: '#24201d', b: '#7d5b40', w: '#bdb39b', h: '#a14808', H: '#742a01' }, // (Björn valde version 2 efter v245, steg 4.5.2)
  s_dod: { o: '#24201d', b: '#7d5b40', B: '#5e3c24', s: '#61767a', g: '#647025' },
  s_barn: { o: '#24201d', b: '#7d5b40', w: '#bdb39b', h: '#a14808' }, // (Björn valde version 2 efter v245, steg 4.5.2)
  b_heder: { o: '#24201d', r: '#a14808', R: '#742a01', l: '#647025', L: '#4b4f00' },
  b_skam: { o: '#24201d', y: '#d8b25f', b: '#61767a', B: '#3e5156' },
  utb1: { o: '#24201d', z: 'rgba(36,32,29,.30)', a: '#bdb39b', w: '#dad0bb', b: '#a0947d', t: '#8a9c9e' },
  utb2: { o: '#24201d', z: 'rgba(36,32,29,.30)', a: '#bd753e', w: '#d8b25f', b: '#a14808' },
  utb3: { o: '#24201d', z: 'rgba(36,32,29,.30)', a: '#a14808', w: '#d8b25f', b: '#742a01', r: '#521100' },
  utb4: { o: '#24201d', z: 'rgba(36,32,29,.30)', a: '#742a01', w: '#dad0bb', b: '#521100', m: '#2f261d', v: '#bdb39b' },
  utb5: { o: '#24201d', z: 'rgba(36,32,29,.30)', a: '#dad0bb', b: '#a0947d', k: '#2f261d' },
  m_hardVinter: { o: '#24201d', s: '#bdb39b', S: '#dad0bb' }, // (Björn valde version 1 efter v245, steg 4.5.2)
  m_tornado: { o: '#24201d', g: '#61767a', G: '#bdb39b', d: '#5e3c24', D: '#dad0bb', k: '#2f261d', K: '#372f25', l: '#4b4f00', j: '#7d5b40' }, // (Björn valde version 2 efter v245, steg 4.5.2)
  m_oversvamning: { o: '#24201d', b: '#3e5156', B: '#61767a', l: '#8a9c9e', k: '#3f2415', j: '#5e3c24', J: '#7d5b40' }, // (Björn valde version 2 efter v245, steg 4.5.2)
  m_torka: { o: '#24201d', y: '#b2921b', Y: '#d8b25f', j: '#7d5b40', J: '#987e62', k: '#3f2415' },
  i_legend: { a: '#d8b25f', b: '#b2921b', g: '#906f0f', o: '#24201d', w: '#dad0bb', z: 'rgba(36,32,29,.30)' },
  i_okand: { a: '#dad0bb', b: '#a0947d', k: '#2f261d', o: '#24201d', z: 'rgba(36,32,29,.30)' },
  a_gott: { a: '#bdb39b', b: '#a0947d', g: '#d8b25f', o: '#24201d', w: '#dad0bb', z: 'rgba(36,32,29,.30)' },
  a_blandat: { a: '#bdb39b', b: '#a0947d', o: '#24201d', w: '#dad0bb', z: 'rgba(36,32,29,.30)' },
  a_daligt: { a: '#a14808', b: '#742a01', h: '#2f261d', o: '#24201d', w: '#bd753e', z: 'rgba(36,32,29,.30)' },
  r_par: { G: '#b2921b', O: '#898b4c', Q: '#647025', R: '#bd753e', S: '#61767a', b: '#dad0bb', d: '#742a01', g: '#d8b25f', k: '#372f25', o: '#24201d', r: '#a14808', s: '#8a9c9e', z: 'rgba(36,32,29,.30)' },
  r_gift: { G: '#b2921b', O: '#898b4c', Q: '#647025', R: '#bd753e', S: '#61767a', b: '#dad0bb', d: '#742a01', g: '#d8b25f', k: '#372f25', o: '#24201d', r: '#a14808', s: '#8a9c9e', z: 'rgba(36,32,29,.30)' },
  r_van: { G: '#b2921b', O: '#898b4c', Q: '#647025', R: '#bd753e', S: '#61767a', b: '#dad0bb', d: '#742a01', g: '#d8b25f', k: '#372f25', o: '#24201d', r: '#a14808', s: '#8a9c9e', z: 'rgba(36,32,29,.30)' },
  r_naravan: { G: '#b2921b', O: '#898b4c', Q: '#647025', R: '#bd753e', S: '#61767a', b: '#dad0bb', d: '#742a01', g: '#d8b25f', k: '#372f25', o: '#24201d', r: '#a14808', s: '#8a9c9e', z: 'rgba(36,32,29,.30)' },
  r_bast: { G: '#b2921b', O: '#898b4c', Q: '#647025', R: '#bd753e', S: '#61767a', b: '#dad0bb', d: '#742a01', g: '#d8b25f', k: '#372f25', o: '#24201d', r: '#a14808', s: '#8a9c9e', z: 'rgba(36,32,29,.30)' },
  r_mentor: { G: '#b2921b', O: '#898b4c', Q: '#647025', R: '#bd753e', S: '#61767a', b: '#dad0bb', d: '#742a01', g: '#d8b25f', k: '#372f25', o: '#24201d', r: '#a14808', s: '#8a9c9e', z: 'rgba(36,32,29,.30)' },
  r_larling: { G: '#b2921b', O: '#898b4c', Q: '#647025', R: '#bd753e', S: '#61767a', b: '#dad0bb', d: '#742a01', g: '#d8b25f', k: '#372f25', o: '#24201d', r: '#a14808', s: '#8a9c9e', z: 'rgba(36,32,29,.30)' },
  r_rival: { G: '#b2921b', O: '#898b4c', Q: '#647025', R: '#bd753e', S: '#61767a', b: '#dad0bb', d: '#742a01', g: '#d8b25f', k: '#372f25', o: '#24201d', r: '#a14808', s: '#8a9c9e', z: 'rgba(36,32,29,.30)' },
  r_fiende: { G: '#b2921b', O: '#898b4c', Q: '#647025', R: '#bd753e', S: '#61767a', b: '#dad0bb', d: '#742a01', g: '#d8b25f', k: '#372f25', o: '#24201d', r: '#a14808', s: '#8a9c9e', z: 'rgba(36,32,29,.30)' },
  r_arke: { G: '#b2921b', O: '#898b4c', Q: '#647025', R: '#bd753e', S: '#61767a', b: '#dad0bb', d: '#742a01', g: '#d8b25f', k: '#372f25', o: '#24201d', r: '#a14808', s: '#8a9c9e', z: 'rgba(36,32,29,.30)' },
  i_valdsam: { a: '#bdb39b', b: '#a0947d', o: '#24201d', z: 'rgba(36,32,29,.30)' },
  i_tjuv: { a: '#987e62', b: '#7d5b40', c: '#372f25', o: '#24201d', z: 'rgba(36,32,29,.30)' },
  i_elak: { a: '#bd753e', b: '#a14808', o: '#24201d', w: '#d8b25f', z: 'rgba(36,32,29,.30)' },
  i_logn: { a: '#bdb39b', b: '#a0947d', n: '#a14808', o: '#24201d', w: '#dad0bb', z: 'rgba(36,32,29,.30)' },
  i_klapare: { o: '#24201d', z: 'rgba(36,32,29,.30)', a: '#a14808', b: '#742a01', w: '#bd753e' }, // (Björn valde version 1 efter v245, steg 4.5.2)
  i_lat: { a: '#8a9c9e', b: '#bdb39b', c: '#a0947d', o: '#24201d', z: 'rgba(36,32,29,.30)' },
  i_fattig: { a: '#7d5b40', b: '#5e3c24', o: '#24201d', w: '#987e62', z: 'rgba(36,32,29,.30)' },
  i_generos: { a: '#647025', b: '#4b4f00', o: '#24201d', r: '#a14808', w: '#898b4c', z: 'rgba(36,32,29,.30)' },
  i_hjalpsam: { a: '#bdb39b', b: '#a0947d', c: '#b2921b', o: '#24201d', z: 'rgba(36,32,29,.30)' },
  i_skicklig: { a: '#d8b25f', b: '#b2921b', o: '#24201d', w: '#dad0bb', z: 'rgba(36,32,29,.30)' },
  i_flitig: { a: '#8a9c9e', b: '#61767a', d: '#7d5b40', h: '#987e62', o: '#24201d', t: '#8a9c9e', z: 'rgba(36,32,29,.30)' },
  i_valbargad: { a: '#987e62', b: '#7d5b40', g: '#647025', o: '#24201d', z: 'rgba(36,32,29,.30)' },
  i_rik: { R: '#bd753e', a: '#987e62', b: '#7d5b40', g: '#647025', o: '#24201d', r: '#a14808', z: 'rgba(36,32,29,.30)' },
  i_rattvis: { a: '#d8b25f', b: '#b2921b', c: '#7d5b40', o: '#24201d', z: 'rgba(36,32,29,.30)' },
  i_orattvis: { a: '#bd753e', b: '#a14808', c: '#7d5b40', o: '#24201d', z: 'rgba(36,32,29,.30)' },
  i_stark: { a: '#bd753e', b: '#a14808', o: '#24201d', w: '#d8b25f', z: 'rgba(36,32,29,.30)' },
  i_feg: { c: '#7d5b40', o: '#24201d', v: '#bdb39b', w: '#dad0bb', z: 'rgba(36,32,29,.30)' },
  // steg 6.6.6: platshållare, björnens huvud
  i_pahittig: { a: '#d8b25f', b: '#b2921b', o: '#24201d', w: '#dad0bb', z: 'rgba(36,32,29,.30)' }, // steg 10.4.9: platshållare, en gnista
  i_skvaller: { a: '#dad0bb', b: '#a0947d', m: '#a14808', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 10.8.6: platshållare, en pratbubbla med en mun
  i_aventyrare: { a: '#dad0bb', b: '#a0947d', r: '#a14808', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 11.8.17: platshållare, en rulle med sigill
  i_forutseende: { a: '#7d5b40', b: '#b2921b', o: '#24201d', w: '#dad0bb', z: 'rgba(36,32,29,.30)' }, // steg 10.4.9: platshållare, en fylld korg
  i_forsvarare: { a: '#8a9c9e', b: '#a14808', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_botare: { a: '#dad0bb', b: '#647025', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_daligLakare: { a: '#dad0bb', b: '#24201d', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_scenBra: { a: '#bd753e', b: '#d8b25f', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_scenDalig: { a: '#bdb39b', b: '#24201d', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_skrivkunnig: { a: '#dad0bb', b: '#3e5156', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_from: { a: '#3e5156', b: '#d8b25f', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_gudlos: { a: '#bdb39b', b: '#24201d', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_suput: { a: '#bd753e', b: '#7d5b40', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_lurendrejare: { a: '#d8b25f', b: '#a14808', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_hederlig: { a: '#dad0bb', b: '#906f0f', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_vittberest: { a: '#a0947d', b: '#24201d', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_brandslackare: { a: '#bd753e', b: '#8a9c9e', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_djurvan: { a: '#dad0bb', b: '#7d5b40', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_fangelsekund: { a: '#a0947d', b: '#24201d', o: '#24201d', z: 'rgba(36,32,29,.30)' }, // steg 12.1.134: platshållare
  i_vargdodare: { a: '#8a9c9e', b: '#61767a', k: '#24201d', o: '#24201d', w: '#dad0bb', z: 'rgba(36,32,29,.30)' },
  l_fara: { a: '#b2921b', b: '#906f0f', k: '#24201d', o: '#24201d', z: 'rgba(36,32,29,.30)' },
  a_varda: { w: '#dad0bb', a: '#8a9c9e', y: '#d8b25f', r: '#bd753e' },
  verkstad: { l: '#5e3c24', O: '#a0947d', L: '#7d5b40', B: '#987e62', b: '#7d5b40', n: '#dad0bb', k: '#3e5156', d: '#2f261d' },
  s_skarsar: { E: '#bdb39b', r: '#a14808', e: '#987e62', H: '#7e7362', h: '#694902', m: '#521100' },
  s_bett: { m: '#521100', r: '#a14808', R: '#a14808', w: '#dad0bb', W: '#dad0bb', b: '#a0947d' },
  s_klos: { w: '#dad0bb', b: '#a0947d', r: '#a14808', R: '#a14808', m: '#521100' },
  s_benbrott: { W: '#dad0bb', w: '#dad0bb', b: '#a0947d', r: '#a14808' },
  s_krossar: { r: '#a14808', R: '#a14808', e: '#987e62', E: '#bdb39b', o: '#505e3e' },
  s_inf: { g: '#898b4c', G: '#d8b25f', q: '#324726' },
  s_forb: { Z: '#898b4c', u: '#a0947d', z: '#647025', x: '#324726' },
  s_ren: { a: '#8a9c9e', f: '#dad0bb', F: '#dad0bb', A: '#dad0bb', c: '#3e5156' },
  s_kall: { g: '#233035', G: '#3e5156', q: '#24201d' },
  fangelse: { a: '#474138', b: '#7d5b40', c: '#a0947d' }, // platshållare: gallret (steg 11.12.1)
  n_energi: { A: '#dad0bb', a: '#d8b25f', D: '#7d5b40' },
  b_energi: { D: '#7d5b40', a: '#d8b25f' },
  n_protein: { A: '#a0947d', a: '#a14808', D: '#742a01' },
  b_protein: { D: '#742a01', a: '#a14808' },
  n_fett: { A: '#dad0bb', a: '#bdb39b', D: '#906f0f' },
  // krönikans kategorier och omröstningens ja, nej och den som lade fram frågan (steg 9.2.73 och 9.2.65, platshållare i 16 punkter tills Björn valt i bildstilen)
  b_fett: { D: '#906f0f', a: '#bdb39b' },
  n_vitamin: { g: '#898b4c', G: '#b2921b', a: '#61767a', A: '#8a9c9e', D: '#233035' },
  b_vitamin: { D: '#233035', a: '#61767a' },
  n_mineral: { A: '#dad0bb', a: '#8a9c9e', D: '#61767a' },
  b_mineral: { D: '#61767a', a: '#8a9c9e' },
};

// trädörren (Björn valde version 2 efter v193, steg 3.10.13): i listorna och i dörröppningen
const PIX_TRADORR = [
  'oooooooooooooooo',
  'oJjJjJjJjJjJjJjo',
  'oWWWWWWWWWWWWWWo',
  'oJjJjJjJjJjJWWjo',
  'oJjJjJjJjJjWWJjo',
  'oJjJjJjJjJWWjJjo',
  'oJjJjJjJjWWJjJjo',
  'oJjJjJjJWWjJjJjo',
  'oJjJjJjWWJjJjkko',
  'oJjJjJWWjJjJjkko',
  'oJjJjWWJjJjJjJjo',
  'oJjJWWjJjJjJjJjo',
  'oJjWWJjJjJjJjJjo',
  'oWWWWWWWWWWWWWWo',
  'oJjJjJjJjJjJjJjo',
  'oooooooooooooooo',
];
export const PIX: Record<string, string[]> = {
  hov: ['................', '.......y........', '......oJo.......', '.....oJJJo......', '....oJJJJJo.....', '...oJJJJJJJo....', '..oJJJJJJJJJo...', '..oooooooooo....', '..ojjjjjjjjo....', '..ojjj.jjjjo....', '..ojjj.jjjjo....', '..ooo.o.oooo....', '................', '................', '................', '................'], // platshållare (steg 8.6.14)
  tempel: ['................', '.......y........', '......oSo.......', '.....oSSSo......', '....oSSSSSo.....', '...oSSSSSSSo....', '..oooooooooo....', '..osjsjsjsjo....', '..osjsj.sjso....', '..osjs...jso....', '..osjs...jso....', '..oooo...ooo....', '................', '................', '................', '................'], // platshållare (steg 8.6.14)
  hov_bygge: ['................', '................', '................', '................', '................', '...o.......o....', '...o.......o....', '..ooooooooooo...', '..oj.......o....', '..oj.......o....', '..oj.......o....', '..oo.......o....', '................', '................', '................', '................'],
  a_be: ['........', '...ww...', '...ww...', '..wwww..', '..wwww..', '.wwwwww.', '.w.ww.w.', '........'], // den som ber (platshållare, system 8.5)
  grav: ['................', '................', '................', '......ssS.......', '......ssS.......', '....jjssSjj.....', '...jJJJJJJJj....', '..jJJJJJJJJJj...', '..jJJJJJJJJJj...', '..jjjjjjjjjjj...', '................', '................', '................', '................', '................', '................'], // platshållare (steg 8.5.1)
  helig_sten: ['................', '................', '.......y........', '......oSo.......', '.....oSSso......', '.....oSSso......', '....oSSSsso.....', '....oSSSsso.....', '...oSSSSssso....', '...oooooooo.....', '................', '................', '................', '................', '................', '................'], // platshållare (steg 8.5.5)
  helig_vatten: ['................', '................', '.......y........', '.....oooooo.....', '....oBBBbbbo....', '...oBBbBbbbbo...', '...oBBBbbBbbo...', '....oBbbbbbo....', '.....oooooo.....', '................', '................', '................', '................', '................', '................', '................'],
  helig_lund: ['................', '.......y........', '....gg....gg....', '...gGGg..gGGg...', '...gGGg..gGGg...', '....gg....gg....', '.....o....o.....', '.....o....o.....', '................', '................', '................', '................', '................', '................', '................', '................'],
  helig_trad: ['................', '.......y........', '.....gggggg.....', '....gggggggg....', '....gggggggg....', '.....gggggg.....', '.......jj.......', '.......jj.......', '.......jj.......', '......ojjo......', '................', '................', '................', '................', '................', '................'],
  kroppsdel: [ // platshållare (steg 8.2.3): en avhuggen kroppsdel, gemensam bild för alla delar
    '................','................','................','................',
    '................','......HHH.......','....oHHHHHo.....','...oHHHHHHHrr...',
    '...oHHHHHHHrR...','....ooooooorr...','................','................',
    '................','................','................','................',
  ],
  skandad: [ // platshållare (steg 10.4.13): en skändad kropp, slängd snett med fläckar
    '................','................','................','.....r..........',
    '...oo.....r.....','..oHHo.....oo...','..oHHoooooowwo..','...owwwwwwwwwo.r',
    '..r.owwwwwwwwwo.','.....oHHoooowwo.','.....oHHo...oo..','......oo....r...',
    '................','...r............','................','................',
  ],
  dodkropp: [ // platshållare (steg 8.5.1): en död kropp på marken
    '................','................','................','................',
    '.....oo.........','....oHHo...oo...','....oHHoooowwo..','..oowwwwwwwwwo..',
    '..oowwwwwwwwwo..','....oHHoooowwo..','....oHHo...oo...','.....oo.........',
    '................','................','................','................',
  ],
  zzz: [ // den som sover (steg 8.1.1), i 8 punkter som de andra små symbolerna
    '...wwwww',
    '......w.',
    '.....w..',
    '....wwww',
    'www.....',
    '..w.....',
    '.w......',
    'www.....',
  ],
  gud_aska: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee.......',
    '....eooooeee....',
    '...ooffffoode...',
    '..offffffffooe..',
    '.offfffffffffoe.',
    '.offfffffffffoe.',
    '.eooooffooooooe.',
    'edddddoffoddddde',
    'eddddoffodddddde',
    '.eddofffffoddde.',
    '.edddooffodddde.',
    '.eddddofoddddde.',
    '..eddofoddddde..',
    '...edooddddde...',
    '....eeeddeee....',
    '.......ee.......',
  ],
  gud_sjon: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee.......',
    '....eeeddeee....',
    '...edddddddde...',
    '..eoooddddoooe..',
    '.eofffoodofffoo.',
    '.offfffoofffffo.',
    '.offoofffffoofo.',
    'edooddooooddoode',
    'edddddddddddddde',
    '.edoooddddooode.',
    '.eofffoodofffoo.',
    '.offfffoofffffo.',
    '.offoofffffoofo.',
    '..ooddooooddoo..',
    '....eeeddeee....',
    '.......ee.......',
  ],
  gud_skord: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......oo.......',
    '....eeoffoee....',
    '...edoffffode...',
    '..edddoffoddde..',
    '.eddooffffoodde.',
    '.edoffoffoffode.',
    '.eddooffffoodde.',
    'eddoffoffoffodde',
    'edddooffffooddde',
    '.edoffoffoffode.',
    '.eddoodffdoodde.',
    '.edddddffddddde.',
    '..eddddffdddde..',
    '...edddffddde...',
    '....eeoffoee....',
    '.......ee.......',
  ],
  gud_doden: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee.......',
    '....eooooooe....',
    '...eoffffffoe...',
    '..eoffffffffoe..',
    '.edoffffffffode.',
    '.edofooofooofoe.',
    '.edofoodfoodfoe.',
    'eddoffffoffffode',
    'edddofffffffodde',
    '.edddofofofodde.',
    '.edddofofofodde.',
    '.eddddoooooddde.',
    '..edddddddddde..',
    '...edddddddde...',
    '....eeeddeee....',
    '.......ee.......',
  ],
  gud_jakt: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee.......',
    '..o.oeeddoeo....',
    '..ofofddofofe...',
    '..eoffodoffode..',
    '.oddoffoffoddoe.',
    '.ofddoffffodfoe.',
    '.eoffoffffoffoe.',
    'edddoffffffoddde',
    'eddddoffffodddde',
    '.eddddoffodddde.',
    '.eddddoffodddde.',
    '.edddoffffoddde.',
    '..eddoffffodde..',
    '...eddoooodde...',
    '....eeeddeee....',
    '.......ee.......',
  ],
  gud_elden: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......oe.......',
    '....eeofoeee....',
    '...eddoffodde...',
    '..eddofffoddde..',
    '.eddofffffoddde.',
    '.eddofffffoddoe.',
    '.edofffffffoofo.',
    'eddofffffffffode',
    'edofffffffffodde',
    '.eofffffffffode.',
    '.eofffffffffode.',
    '.edofffffffodde.',
    '..edoofffoodde..',
    '...eddoooddde...',
    '....eeeddeee....',
    '.......ee.......',
  ],
  gud_vintern: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......oe.......',
    '....eoefdoee....',
    '...eddofoddde...',
    '..oddddfddddoe..',
    '.edofddfddfodde.',
    '.eddofffffoddde.',
    '.odfffffffffdoe.',
    'edddofffffodddde',
    'eddofddfddfoddde',
    '.eoddddfddddode.',
    '.eddddofoddddde.',
    '.edddodfdodddde.',
    '..eddddoddddde..',
    '...edddddddde...',
    '....eeeddeee....',
    '.......ee.......',
  ],
  gud_solen: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......oe.......',
    '...oeeefdeeo....',
    '...efddfddfde...',
    '..eddoooooodde..',
    '.eddoffffffodde.',
    '.edoffffffffode.',
    '.ffoffffffffoff.',
    'eddoffffffffodde',
    'eddoffffffffodde',
    '.eddoffffffodde.',
    '.edddooooooddde.',
    '.eddfddfddfddde.',
    '..eodddfdddode..',
    '...edddodddde...',
    '....eeeddeee....',
    '.......ee.......',
  ],
  gud_atten: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee.......',
    '....ooeddeoo....',
    '...offoddoffo...',
    '..eoffoddoffoe..',
    '.eddooddddoodde.',
    '.edoffoddoffode.',
    '.eoffffofffffoe.',
    'edoffffooffffode',
    'edoffffodoodoode',
    '.edoffoddoffode.',
    '.edoddoddoffode.',
    '.edoddoddoddode.',
    '..ooddoododdoe..',
    '...edddddddde...',
    '....eeeddeee....',
    '.......ee.......',
  ],
  gud_kriget: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee....o..',
    '....eeeddeeeofo.',
    '...edddddddofo..',
    '..edooooooofoe..',
    '.edofffffffoode.',
    '.edoffffffffode.',
    '.edoffffffffode.',
    'eddoffffffffodde',
    'eddoffffffffodde',
    '.eddoffffffodde.',
    '.edofdofffoddde.',
    '.eofdddofodddde.',
    '.ofdddddodddde..',
    '.o.edddddddde...',
    '....eeeddeee....',
    '.......ee.......',
  ],
  gud_hantverk: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee.......',
    '...ooooooooe....',
    '..offffffffoe...',
    '..offffffffode..',
    '.eoffffffffodde.',
    '.edoooofoooodde.',
    '.edddddofodddde.',
    'eddddddofoddddde',
    'eddddddofoddddde',
    '.edddddofodddde.',
    '.edddddofodddde.',
    '.edddddofodddde.',
    '..eddddoffodde..',
    '...eddddoodde...',
    '....eeeddeee....',
    '.......ee.......',
  ],
  // trons symboler (steg 4.1.2.3, TECKEN i religion.ts; platshållare i bildstilens palett, 16 punkter)
  tro_blixt: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee.......',
    '....eooooooe....',
    '...eofffffode...',
    '..edoffffoddde..',
    '.edoffffoddddde.',
    '.edofffoooooode.',
    '.eofffffffffode.',
    'edoooooofffoddde',
    'edddddofffodddde',
    '.edddofffodddde.',
    '.edddoffoddddde.',
    '.eddoffodddddde.',
    '..edofodddddde..',
    '...ofodddddde...',
    '...ooeeddeee....',
    '.......ee.......',
  ],
  tro_brand: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee.......',
    '....eeeodeee....',
    '...eddofoddde...',
    '..edddoffoddde..',
    '.edddofffodddde.',
    '.eddofffffoddde.',
    '.eddofffffoddde.',
    'eddofffffffoddde',
    'eddofffffffoddde',
    '.edoffffffffode.',
    '.edoffffffffode.',
    '.eddoffffffodde.',
    '..eddoffffodde..',
    '...eddooooode...',
    '....offfffffo...',
    '.......ee.......',
  ],
  tro_vinter: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee.......',
    '....eeeodeee....',
    '...edodfdodde...',
    '..edddofodddde..',
    '.edodddfdddodde.',
    '.eddoddfddoddde.',
    '.edddodfdodddde.',
    'eoffffffffffffoe',
    'eddddodfdoddddde',
    '.eddoddfddoddde.',
    '.edodddfdddodde.',
    '.eddddofoddddde.',
    '..eddodfdoddde..',
    '...edddodddde...',
    '....eeeddeee....',
    '.......ee.......',
  ],
  tro_regn: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee.......',
    '....eeeddeee....',
    '...edooooddde...',
    '..edoffffoddde..',
    '.eooofffffooode.',
    '.offfffffffffoe.',
    '.offfffffffffoe.',
    'edooooooooooodde',
    'eddfdddfdddfddde',
    '.efdddfdddfddde.',
    '.edddddddddddde.',
    '.eddfdddfdddfde.',
    '..efdddfdddfde..',
    '...edddddddde...',
    '..f.eefddefe....',
    '.......ee.......',
  ],
  tro_flod: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee.......',
    '....eeeddeee....',
    '...edddddddde...',
    '..ooddddoodddeo.',
    '.offoddoffoddof.',
    'ofddfoofddfoofe.',
    '.edddooddddoode.',
    'edddddddddddddde',
    'edooddddooddddoe',
    '.offoddoffoddof.',
    'ofddfoofddfoofe.',
    '.edddooddddoode.',
    '..edddddddddde..',
    'ffffffffffffffff',
    'ffffffffffffffff',
    '.......ee.......',
  ],
  tro_hare: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee.......',
    '....ooeddeoo....',
    '...offoddoffo...',
    '..eoffoddoffoe..',
    '.edoffoddoffode.',
    '.edoffoddoffode.',
    '.eddofoddofodde.',
    'eddooffooffoodde',
    'edoffffffffffode',
    '.eoffffffffffoe.',
    '.eoffffffffffoe.',
    '.eoffffffffffoe.',
    '..eoffffffffoe..',
    '...eooffffooe...',
    '....eeooooee....',
    '.......ee.......',
  ],
  tro_barn: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee.......',
    '....efefdefe....',
    '...fddooooddf...',
    '..eddoffffodde..',
    '.efdoffffffodfe.',
    '.eddoffffffodde.',
    '.eddoffffffodde.',
    'eddddoffffodddde',
    'edddddooooddddde',
    '.edddoffffoddde.',
    '.eddoffffffodde.',
    '.eddoffffffodde.',
    '..eddoffffodde..',
    '...edooddoode...',
    '....eeeddeee....',
    '.......ee.......',
  ],
  tro_drom: [ // amulett i guld (Björn valde stil 3 efter v245, steg 4.5.2)
    '.......ee.......',
    '....eeeddefe....',
    '...edooooddde...',
    '..eoofffoddddf..',
    '.eofffoodddddde.',
    '.eoffoddddddfde.',
    '.offoddddddddde.',
    'eoffodddddfdddde',
    'eoffodddddddddde',
    '.offfodddddddde.',
    '.eofffoodddddoo.',
    '.eofffffooooofo.',
    '..eooffffffffo..',
    '...edoooooooe...',
    '....eeeddeee....',
    '.......ee.......',
  ],
  // kaninen som sett någon: ett gult utropstecken (Björn valde version 1 efter v193, steg 3.10.13)
  kanin_larm: [
    '..kyyk..',
    '..kyyk..',
    '..kyyk..',
    '..kyyk..',
    '...kk...',
    '..kyyk..',
    '..kyyk..',
    '...kk...',
  ],
  kanin: [
    '.b.b....',
    '.bpb....',
    '.bBb....',
    'bkBBbb..',
    'bBBBBBb.',
    '.bBBBBbw',
    '..bBBbbw',
    '..b..b..',
  ],
  spindling: [
    '..cccc..',
    '.cCCccc.',
    'cCcccccc',
    'cccccccc',
    '...sS...',
    '...sS...',
    '...sS...',
    '..ssSS..',
  ],
  // flätade grenar mellan pinnar
  risvagg: [
    'p..p..p.',
    'pBbpBbpB',
    'pbBpbBpb',
    'pBbpBbpB',
    'pbBpbBpb',
    'pBbpBbpB',
    'pbBpbBpb',
    'p..p..p.',
  ],
  hogolv: [
    '........',
    '........',
    '........',
    '.Y.y.Y..',
    'yYyYyYyY',
    'YyYyYyYy',
    'dddddddd',
    '........',
  ],
  // slaktbänken, tre rutor bred (Björn valde efter v55): en kluven stock med barken framtill, på raka ben av runda grenar,
  // och blod som rinner över kanten ner i en pöl. Den är 11 punkter hög och sticker upp över rutan ovanför
  slaktbank_karta: [
    '.bbbbbbbbbbbbbbbbbbbbbb.',
    'bHHHHHHHHHHHHHHHHHHHHHHb',
    'bLWWYYYYLLLLrLLLLLWWWWLb',
    'bLLrrRRRRrrWWWWWWLLLLLLb',
    'bbbbbbbbbbbbbbbbbbbbbbbb',
    'BbbbbRbrbRbbbbbbbbbbbbbB',
    '.BBBBRBBBBBBBBBBBBBBBBB.',
    '..BBB.R............BBB..',
    '..wwb.R............wwb..',
    '..wwRRRRRR....R....wwb..',
    '.xxrrrrrrrrRrxxxxxxxxxxx',
  ],
  // slaktbänken vriden (steg 3.10.7): stocken går uppifrån och ner, stockänden med benen framtill och blodet rinner över den
  slaktbank_karta_v: [
    '.bbbbbb.',
    'bHHHHLLb',
    'bHLLLLWb',
    'bHLWLLWb',
    'bHLLLLWb',
    'bHYYLLWb',
    'bHYrrLWb',
    'bHLrRLWb',
    'bHLLrLWb',
    'bHLLLLWb',
    'bHLLLWWb',
    'bHLLLLWb',
    'bHLLrLWb',
    'bHLLLLWb',
    'bHWLLLWb',
    'bHLLLLWb',
    'bHLLLLWb',
    'bHLLWLWb',
    'bHLLLLWb',
    'bHLLrLWb',
    'bHHLrLLb',
    'bbbbRbbb',
    'BbbbRbbB',
    '.BBBRBB.',
    '.wb.R.wb',
    '.wbRRRwb',
    'xxrrrrxx',
  ],
  // flätarbänken (slöjdbänken), två rutor bred (Björn valde nr 4a efter v55): två plankor på raka ben, två stolpar med ett
  // rep spänt emellan och en skåra framtill där bensylen ska ligga (den finns inte än, 2.3.2). 16 punkter hög
  flatarbank_karta: [
    '.D............D.',
    '.wOooOooOooOoow.',
    '.wq..........qw.',
    '.w............w.',
    '.w............w.',
    '.wddddddddddddw.',
    'dHHHHHHHWHHHHHHd',
    'dLLLLLLLWLDDDDDd',
    'dLLLLLLLWLLLLLLd',
    'dddddddddddddddd',
    'wWWWWWWWWWWWWWWw',
    '.wwwwwwwwwwwwww.',
    '.DD..........DD.',
    '.wd..........wd.',
    '.wd..........wd.',
    '.xxxxxxxxxxxxxxx',
  ],
  // slöjdbänken vriden (steg 3.10.7): plankorna uppifrån och ner, stolparna med repet längs högra kanten och skåran på
  // skivan
  flatarbank_karta_v: [
    '.......D',
    '.......w',
    '.......O',
    '.......o',
    '.ddddd.o',
    'dHHHHHdO',
    'dLLWLLdo',
    'dLLWLLdo',
    'dLLWLLdO',
    'dLLWLLdo',
    'dLLWDLdo',
    'dLLWDLdO',
    'dLLWDLdo',
    'dLLWLLdD',
    'dLLWLLdw',
    'dLLWLLdw',
    'dLLWLLdw',
    'dLLWLLdw',
    'dLLWLLdw',
    'dddddddd',
    'wWWWWWWw',
    '.wwwwwww',
    '.DD..DDD',
    '.wd..wdw',
    '.wd..wdw',
    '.xxxxxxx',
  ],
  // halmbädden på kartan (Björn valde 2 efter v89, höhög på golvet): två rutor lång, huvudänden till vänster
  halmbadd_karta: [
    '................',
    '.q..qqq.tqqqqqq.',
    '.YYYYyyYqYyyYtYq',
    '.YYYyqYYYyYyyyYt',
    '.YYyyYYytYyYtty.',
    '.YYYYYyYyyYqYYY.',
    '.tq.tttt.q.q..t.',
    '.qqqqtqqqqqqttt.',
    '.tt.t..t.....t..',
    '.xxxxxxxxxxxxxx.',
  ],
  // halmbädden vriden (steg 3.10.7): huvudänden uppåt
  halmbadd_karta_v: [
    '........',
    '.qq.qqt.',
    'qYYYYYYq',
    'tYYYyYYq',
    'qYyYYyYt',
    'qyqYYYyq',
    'tYyYyYqt',
    'qYqyYyYq',
    'qyYytYyq',
    'tYyYyYqt',
    'qYtyYyYq',
    'qyYyqYyt',
    'tYyYyYyq',
    'qyYqyYtq',
    'qtYyYyYt',
    '.qqqtqq.',
    '.t.tt.t.',
    '.xxxxxx.',
  ],
  // hyllan på kartan (Björn valde 1 efter v89, stegehylla med rep): sticker upp över rutan ovanför. Det som ligger i den ritas ovanpå
  hylla_karta: [
    'W......W',
    'w......w',
    'w......w',
    'w......w',
    'rLLLLLLr',
    'w......w',
    'w......w',
    'w......w',
    'rLLLLLLr',
    'w......w',
    'w......w',
    'w......w',
    'rLLLLLLr',
    'xxxxxxxx',
  ],
  // kistan på kartan (Björn valde 5, skinnklädd kista, med högre kontrast efter v89)
  kista_karta: [
    '........',
    '........',
    '........',
    '........',
    'ffsffsff',
    'fFsffsff',
    'ffsfFsff',
    'zfsffsfz',
    'WfsWWsfW',
    'WWsWWsWW',
    'wwwwwwww',
    'xxxxxxxx',
  ],
  // redskapsstället på kartan (Björn valde lutställ 1 efter v89): en slå att luta redskapen mot. Redskapen ritas ovanpå
  stall_karta: [
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    'WLLLLLLW',
    'w......w',
    'w......w',
    'w......w',
    'xxxxxxxx',
  ],
  // det lilla bordet uppifrån (Björn valde 3 efter v89, skiva på stubbar): 2 × 1 rutor. Stubbarna runt det ritas för sig
  bord_karta: [
    '..HHHHHHHHHHHw..',
    '.LLLLLLLwLLLLLL.',
    '.WWWWWWWWWWWWWW.',
    '.HHHHHHHHHHwHHH.',
    '.LLLLLwLLLLLLLL.',
    '.wwwwwwwwwwwwww.',
    '.bBbxxxxxxxxbBb.',
    '.dbdxxxxxxxxdbd.',
  ],
  // det lilla bordet vriden (steg 3.10.7): plankorna uppifrån och ner, benen framtill
  bord_karta_v: [
    '.HLWHLW.',
    '.HLWHLW.',
    '.HLWHwW.',
    '.HLWHLW.',
    '.HwWHLW.',
    '.HLWHLW.',
    '.HLWHLW.',
    '.HLWHLW.',
    '.HLWwLW.',
    '.HLWHLW.',
    '.HLWHLW.',
    '.wLWHLW.',
    '.HLWHLW.',
    '.wwwwww.',
    '.bBxxBb.',
    '.dbxxbd.',
  ],
  // bordet uppifrån, 2 × 2 rutor (Björn valde 3 efter v89)
  bord2_karta: [
    '..HHHHHHHHHHHw..',
    '.LLLLLLLwLLLLLL.',
    '.WWWWWWWWWWWWWW.',
    '.HHHHHHHHHHwHHH.',
    '.LLLLLwLLLLLLLL.',
    '.WWWWWWWWWWWWWW.',
    '.HHHHHHHHwHHHHH.',
    '.LLLwLLLLLLLLLL.',
    '.WWWWWWWWWWWWWW.',
    '.HHHHHHwHHHHHHH.',
    '.LwLLLLLLLLLLLL.',
    '.WWWWWWWWWWWWWW.',
    '.HHHHwHHHHHHHHH.',
    '.wwwwwwwwwwwwww.',
    '.bBbxxxxxxxxbBb.',
    '.dbdxxxxxxxxdbd.',
  ],
  // långbordet uppifrån, 3 × 2 rutor (Björn valde 3 efter v89)
  bord3_karta: [
    '..HHHHHHHHHHHwHHHHHHHH..',
    '.LLLLLLLwLLLLLLLLLLLLwL.',
    '.WWWWWWWWWWWWWWWWWWWWWW.',
    '.HHHHHHHHHHwHHHHHHHHHHH.',
    '.LLLLLwLLLLLLLLLLLLwLLL.',
    '.WWWWWWWWWWWWWWWWWWWWWW.',
    '.HHHHHHHHwHHHHHHHHHHHHw.',
    '.LLLwLLLLLLLLLLLLwLLLLL.',
    '.WWWWWWWWWWWWWWWWWWWWWW.',
    '.HHHHHHwHHHHHHHHHHHHwHH.',
    '.LwLLLLLLLLLLLLwLLLLLLL.',
    '.WWWWWWWWWWWWWWWWWWWWWW.',
    '.HHHHwHHHHHHHHHHHHwHHHH.',
    '.wwwwwwwwwwwwwwwwwwwwww.',
    '.bBbxxxxxxxbBbxxxxxxbBb.',
    '.dbdxxxxxxxdbdxxxxxxdbd.',
  ],
  // långbordet vriden (steg 3.10.7): 2 × 3 rutor, plankorna på längden
  bord3_karta_v: [
    '.HLWHLWHLWHLWHL.',
    '.HLWHLWHLWHLWHL.',
    '.HLWHLwHLWHLWHL.',
    '.HLWHLWHLWHLWHL.',
    '.HLWHLWHLWHLwHL.',
    '.HLWHLWHLWHLWHL.',
    '.HLWHLWHLWHLWHL.',
    '.HLwHLWHLWHLWHL.',
    '.HLWHLWHLWHLWHL.',
    '.HLWHLWHLwHLWHL.',
    '.HLWHLWHLWHLWHL.',
    '.HLWHLWHLWHLWHL.',
    '.HLWHLWHLWHLWHw.',
    '.HLWHLWHLWHLWHL.',
    '.HLWHLWHLWHLWHL.',
    '.HLWHwWHLWHLWHL.',
    '.HLWHLWHLWHLWHL.',
    '.HLWHLWHLWHwWHL.',
    '.HLWHLWHLWHLWHL.',
    '.HwWHLWHLWHLWHL.',
    '.HLWHLWHLWHLWHL.',
    '.wwwwwwwwwwwwww.',
    '.bBbxxxxxxxxbBb.',
    '.dbdxxxxxxxxdbd.',
  ],
  // skinnfällen över halmbädden på kartan (Björn valde 2 efter v89): täcker bädden utom huvudänden
  skinnfall_karta: [
    '................',
    '.......zzzzzzz..',
    '......zSsssSssz.',
    '......fffffffff.',
    '......fffffffff.',
    '......zsSsssSsz.',
    '.......zzzzzzz..',
    '................',
    '................',
    '................',
  ],
  // skinnfällen vriden (steg 3.10.7): över bädden utom huvudänden
  skinnfall_karta_v: [
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '.zzzzzz.',
    'zSsffsSz',
    'zssffssz',
    'zSsffsSz',
    'zssffSsz',
    'zsSffssz',
    'zSsffsSz',
    'zssffssz',
    'zsSffSsz',
    '.zzzzzz.',
    '........',
    '........',
  ],
  // trädörren: plankor med en Z-regel (Björn valde version 2 efter v193, steg 3.10.13)
  tradorr: PIX_TRADORR,
  // trädörren på kartan: samma Z-dörr i dörröppningen (Björn valde version 2 efter v193, steg 3.10.13)
  tradorr_karta: PIX_TRADORR,
  // trädörren i en vägg som går uppåt: dörren från kanten, med reglarna och handtaget
  tradorr_karta_v: [
    '.....oooooo.....',
    '.....oJjJjo.....',
    '.....oWWWWo.....',
    '.....oJjJjo.....',
    '.....oJjJjo.....',
    '.....oJjJjo.....',
    '.....oJjJjo.....',
    '.....oJjJko.....',
    '.....oJjJko.....',
    '.....oJjJjo.....',
    '.....oJjJjo.....',
    '.....oJjJjo.....',
    '.....oJjJjo.....',
    '.....oWWWWo.....',
    '.....oJjJjo.....',
    '.....oooooo.....',
  ],
  // skinndörren på kartan (Björn valde 3 efter v89, två flikar): huden hänger från en stång mellan dörrposterna, delad på mitten. I en vägg som går uppåt ritas den vriden
  skinndorr_karta: [
    '........',
    'eoOooOoe',
    'EeSsZsSE',
    'EsSsZSsE',
    'esSsZssd',
    'dSsSZsSd',
    '.sSZzSs.',
    '..zZzz..',
  ],
  // skinndörren i en vägg som går uppåt (steg 3.10.7, platshållare): stången uppifrån och ner, flikarna hänger från den
  skinndorr_karta_v: [
    '...eE...',
    '..oOoO..',
    '..sSZs..',
    '..SsZS..',
    '..sSzs..',
    '..SZzS..',
    '..sZZs..',
    '...zZ...',
  ],
  latrin_karta: [
    '........',
    '..oOOo..',
    '.oddddO.',
    'oddkkddo',
    'odkkkkdo',
    '.oddddo.',
    '..oooo..',
    '........',
  ],
  // kartbilden (Björn valde 1b): tre rutor bred, spettet med vev på högra sidan, elden i mittrutan syns igenom
  grill_karta: [
    '...w.w............w.w...',
    '..DOLLOLLOLLOLLOLLOLLOL.',
    '....w..............w..L.',
    '....W..............W..L.',
    '....w..............w..Lq',
    '....w..............w....',
    '....W..............W....',
    '....w..............w....',
    '....w..............w....',
    '....W..............W....',
    '....w..............w....',
    '....w..............w....',
    '....W..............W....',
    '....x..............x....',
    '........................',
    '........................',
  ],
  // kartbilden (Björn valde 4a): två rutor bred, sticker upp över raden ovanför. Maten som hänger ritas i foremal.ts
  tork_karta: [
    '.w.w........w.w.',
    'OLwLOLLOLLOLLwLO',
    '..w..........w..',
    '.w.w........w.w.',
    '.w.w........w.w.',
    '.W.W........W.W.',
    'w...w......w...w',
    'w...w......w...w',
    'W...W......W...W',
    'w...w......w...w',
    'x...x......x...x',
    '................',
  ],
  // torkställningen vriden (steg 3.10.7): bockarna framifrån, den bakre högre upp, och slån mellan dem uppifrån och ner
  tork_karta_v: [
    '...w.w..',
    '...wOw..',
    '....w...',
    '...wLw..',
    '...wOw..',
    '...WLW..',
    '..w.O.w.',
    '..w.L.w.',
    '..W.L.W.',
    '..w.O.w.',
    '..x.L.x.',
    '....L...',
    '...wOw..',
    '...wLw..',
    '....w...',
    '...w.w..',
    '...w.w..',
    '...W.W..',
    '..w...w.',
    '.w.....w',
    '.w.....w',
    '.W.....W',
    '.w.....w',
    '.x.....x',
  ],
  // de vilda ärterna (steg 2.10.2, platshållare): en öppen balja med ärter och en klänge
  vildarter: [
    '..........gg....',
    '.........g..g...',
    '.........g......',
    '........gg......',
    '.......g........',
    '......oGo.......',
    '.....oGGGo......',
    '....oGLGLGo.....',
    '...oGLyLyLGo....',
    '..oGLyLyLGGo....',
    '..oGyLyLGGo.....',
    '.oGGLyLGGo......',
    '.oGGGGGGo.......',
    '..ooGGoo........',
    '....oo..........',
    '................',
  ],
  // ledarskapet: ledaren med armarna ut mellan två mindre (Björn valde version 3 efter v193, steg 3.10.13)
  ledarskap: [
    '......oooo......',
    '.....oaaaao.....',
    '.....oaaaao.....',
    '...o.oaaaao.o...',
    '..oaoooaaoooao..',
    '...oaaaaaaaao...',
    '....ooaaaaoo....',
    '.....oaaaao.....',
    '..oo.oaaaao.oo..',
    '.obbooaooaoobbo.',
    'obbbboaooaobbbbo',
    '.obbooaooaoobbo.',
    'obbbboaooaobbbbo',
    'obbbboo..oobbbbo',
    'oboobo....oboobo',
    '.o..o......o..o.',
  ],
  // skogsvården (steg 6.5.2, platshållare): en planta med rotklump som lyfts, och benspaden bredvid
  skogsvard: [
    '.....L.......b..',
    '....LGL......b..',
    '...LGGGL.....b..',
    '..GLGGGLG....b..',
    '...GGGGG.....b..',
    '..GGgGgGG....b..',
    '....g.g......b..',
    '.....g......bbb.',
    '.....g......bbb.',
    '....jjj.....bbb.',
    '...jjkjj.....b..',
    '...jkjkj........',
    '....jjj.........',
    '................',
    'jjjjjjjjjjjjjjjj',
    'kkkkkkkkkkkkkkkk',
  ],
  // odlingen (steg 2.10.2, platshållare): en grodd i en fåra i jorden
  odling: [
    '................',
    '................',
    '........LG......',
    '.......LGGG.....',
    '..GL...LGG......',
    '.GGGL...G.......',
    '..GGG..G........',
    '....G.G.........',
    '.....GG.........',
    '.....g..........',
    '.....g..........',
    'JJJJJjJJJJJJJJJJ',
    'jjjjjjjjjjjjjjjj',
    'JJkkkJJJJkkkJJJJ',
    'jjjjjjjjjjjjjjjj',
    'kkkkkkkkkkkkkkkk',
  ],
  // grodden på fältet (steg 3.6.11, Björn valde version 1: fyra blad mitt på rutan)
  // den unga grodden under första halvan av växandet (steg 5.5.5): 8 punkter i hel skala i stället för grodden i halv skala, med
  // två hjärtblad över en kort stjälk i en liten hög jord (Björns val i bildstilen, steg 10.11.1)
  grodd_liten: ['........', '.LL..LL.', 'LGGL.GGL', '.GGggGG.', '...gg...', '...gg...', '..jjjj..', '.jjjjjj.'],
  grodd: [
    '................',
    '................',
    '................',
    '................',
    '.......LL.......',
    '...LL..GG..LL...',
    '..LGGg.gG.gGGL..',
    '...gGGggGggGg...',
    '.....gGGGGg.....',
    '.......gG.......',
    '........g.......',
    '........g.......',
    '................',
    '................',
    '................',
    '................',
  ],
  // vattensäcken (steg 2.10.1, Björn valde version 2 efter v102): en liggande säck med rem, det droppar ur halsen
  // vädrets symboler (steg 2.11.1, Björn valde version 2 efter v102): klart, mulet, regn, snö, blåst och åska med mörk kontur, 10 × 10 punkter
  vader_klart: [
    '....o.....',
    '..ooaoo...',
    '.oaoboao..',
    '.oobcboo..',
    'oabcccbao.',
    '.oobcboo..',
    '.oaoboao..',
    '..ooaoo...',
    '....o.....',
    '..........',
  ],
  vader_moln: [
    '..........',
    '....oo....',
    '...owwo...',
    '..owWWwo..',
    '.owWWWWwo.',
    'owWWWWWWwo',
    'owwwwwwwwo',
    '.oooooooo.',
    '..........',
    '..........',
  ],
  vader_regn: [
    '...oo.....',
    '..owwoo...',
    '.owWWwwo..',
    'owWWWWWwo.',
    'owwwwwwwo.',
    '.odoodoo..',
    '..odoodo..',
    '.odoodo...',
    '..o..o....',
    '..........',
  ],
  vader_sno: [
    '....o.....',
    '..oosoo...',
    '.osososo..',
    '.oosssoo..',
    'osssSssso.',
    '.oosssoo..',
    '.osososo..',
    '..oosoo...',
    '....o.....',
    '..........',
  ],
  vader_blast: [
    '..........',
    '.ooooo....',
    'ovvvvvo...',
    '.ooooovo..',
    'ovvvvvvo..',
    '.oooooooo.',
    '..ovvvvvvo',
    '.ovoooooo.',
    '..ovvo....',
    '...oo.....',
  ],
  vader_aska: [
    '...oo.....',
    '..okkoo...',
    '.okKKkko..',
    'okKKKKKko.',
    'okkkykkko.',
    '.oooyyoo..',
    '..oyyo....',
    '...oyo....',
    '..oyo.....',
    '...o......',
  ],
  // samtalens ämnen (steg 3.9.5, platshållare i bildstilens palett, 16 punkter): en skål med mat
  s_mat: [ // (Björn sa ja efter v245, steg 4.5.2)
    '................',
    '................',
    '......w..w......',
    '.....w..w.......',
    '......w..w......',
    '................',
    '..oooooooooooo..',
    '.okkkkkkkkkkkko.',
    '.oyykkyykkyykko.',
    '..obbbbbbbbbbo..',
    '..oBbbbbbbbbBo..',
    '...oBbbbbbbBo...',
    '....oBBBBBBo....',
    '.....oooooo.....',
    '................',
    '................',
  ],
  // tröst: två händer som håller om varandra
  s_trost: [ // (Björn valde version 2 efter v245, steg 4.5.2)
    '...ooo...ooo....',
    '..ohhho.oHHHo...',
    '.ohhhhhoHHHHHo..',
    '.ohhhhhoHHHHHo..',
    '..ohhho.oHHHo...',
    '..ooooooooooo...',
    '.owwwwwbbbbbbo..',
    'owwwwhhhhbbbbbo.',
    'owwwwwwbHHHbbbo.',
    'owwwwwwbbbbbbbo.',
    'owwwwwwbbbbbbbo.',
    '.owwwwwbbbbbbo..',
    '.owwowwobbobbo..',
    '.owwowwobbobbo..',
    '..oo.oo.oo.oo...',
    '................',
  ],
  // en död: ett träkors på en stenhög (Björn valde version 2 efter v193, steg 3.10.13)
  s_dod: [
    '................',
    '.......oo.......',
    '.......ob.......',
    '.....oooboo.....',
    '.....obbbbo.....',
    '.....oooboo.....',
    '.......ob.......',
    '.......ob.......',
    '.......ob.......',
    '.......ob.......',
    '.......ob.......',
    '....ooooBooo....',
    '...osssssssso...',
    '..ossssssssss...',
    '.gggggggggggggg.',
    '................',
  ],
  // barnen: ett litet huvud och en kropp
  s_barn: [ // (Björn valde version 2 efter v245, steg 4.5.2)
    '...ooo..........',
    '..ohhho.........',
    '.ohhhhho........',
    '.ohhhhho........',
    '..ohhho.........',
    '.owwwwwo...ooo..',
    'owwwwwwwo.ohhho.',
    'owwwwwwwoohhhhho',
    'owwwwwwwoohhhhho',
    'owwwwwwwhoohhho.',
    '.owwwwwohhobbbo.',
    '.owwwwwoohhbbbbo',
    '.owwowwo.obbbbbo',
    '.owwowwo.obbobbo',
    '.owwowwo.obbobbo',
    '..oo.oo...oo.oo.',
  ],
  // hedersnamnet: en lagerkrans med ett band (Björn valde version 2 efter v193, steg 3.10.13)
  b_heder: [
    '................',
    '.....oo..oo.....',
    '...oolo..oloo...',
    '..olLo....oLlo..',
    '.olLo......oLlo.',
    '.olo........olo.',
    'olLo........oLlo',
    'olo..........olo',
    'olLo........oLlo',
    '.olo........olo.',
    '.olLo......oLlo.',
    '..olLo....oLlo..',
    '...oolo..oloo...',
    '.....oRrrRo.....',
    '....oRo..oRo....',
    '.....o....o.....',
  ],
  // öknamnet: ett mörkt moln med en blixt, byns skvaller (Björn valde version 2 efter v193, steg 3.10.13)
  b_skam: [
    '................',
    '.....oooo.......',
    '...ooBBBBoo.....',
    '..oBBbbbbBBooo..',
    '.oBbbbbbbbbBBBo.',
    'oBbbbbbbbbbbbbBo',
    'oBbbbbbbbbbbbbBo',
    '.oBBBBBBBBBBBBo.',
    '..oooooyooooo...',
    '......oyo.......',
    '.....oyo........',
    '....oyyyyo......',
    '......oyo.......',
    '.....oyo........',
    '.....oo.........',
    '................',
  ],
  // utbrottens grader (steg 3.2.2–3.2.4; Björn valde version 1 efter v193, steg 3.10.13): ansikten som blir argare och argare, och en dödskalle för dråpet
  utb1: [
    '................',
    '.....oooooo.....',
    '...oowwaaaaoo...',
    '..owaaaaaaaaao..',
    '.owaaaaaaaaaaao.',
    '.oaaaaaaaaaaaaoz',
    'oaaooaaaaaaooaao',
    'oaaaaaaaaaaataao',
    'oaaaaaaaaaaataao',
    'oaaaaaaaaaattaao',
    'oaaaaaaaaaaaaaao',
    '.oaaaaooooaaaaoz',
    '.obaaoaaaaoaaboz',
    '..obbaaaaaabbozz',
    '...oobbbbbboozz.',
    '....zoooooozzz..',
  ], // grad 1: gråta, tjura, skrika
  utb2: [
    '................',
    '.....oooooo.....',
    '...oowwaaaaoo...',
    '..owaaaaaaaaao..',
    '.owoaaaaaaaaoao.',
    '.oaaooaaaaooaaoz',
    'oaaaooaaaaooaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaooooooaaaao',
    '.oaaaowowowaaaoz',
    '.obaaooooooaaboz',
    '..obbaaaaaabbozz',
    '...oobbbbbboozz.',
    '....zoooooozzz..',
  ], // grad 2: vara elak, slå sönder något, springa iväg
  utb3: [
    '................',
    '.....oooooo.....',
    '...oowwaararo...',
    '..owaaaaaaraao..',
    '.owooaaaaraooao.',
    '.oaaaooaaooaaaoz',
    'oaaaooaaaaooaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaooooooooaaao',
    '.oaaowowowowaaoz',
    '.obooooooooooboz',
    '..oobaaaaaaboozz',
    '...oobbbbbboozz.',
    '....zoooooozzz..',
  ], // grad 3: ligga kvar i bädden, göra slut, slå
  utb4: [
    '................',
    '.....oooooo.....',
    '...oowwaaaaoo...',
    '..oooaaaaaaooo..',
    '.owaoooaaoooaao.',
    '.oaaaaoaaoaaaaoz',
    'oaaowoaaaaowoaao',
    'oaaaoaaaaaaoaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaooooooooaaao',
    'oaaaowwwwwwoaaao',
    'voaaommmmmmoaaov',
    'vvbaowwwwwwoabvv',
    '.vobboooooobbovz',
    '..zoobbbbbboozzz',
    '....zoooooozzz..',
  ], // grad 4: misshandla
  utb5: [
    '....oooooooo....',
    '...oaaaaaaaao...',
    '..oaaaaaaaaaao..',
    '.oaaaaaaaaaaaao.',
    '.oaaaaaaaaaaaaoz',
    '.oakkkaaaakkkaoz',
    '.oakkkaaaakkkaoz',
    '.oaakaaaaaakaaoz',
    '..oaaaakkaaaaozz',
    '...oaaaaaaaaozz.',
    '....oabababaoz..',
    '....oaaaaaaaoz..',
    '.....obbbbbozz..',
    '......ooooozz...',
    '.......zzzzz....',
    '................',
  ], // grad 5: dråp
  // den hårda vintern (steg 3.8.1, platshållare i bildstilens palett, 16 punkter): en snöflinga med en kall termometer
  m_hardVinter: [ // (Björn valde version 1 efter v245, steg 4.5.2)
    'oooooooooooooooo',
    'oSSSSSSSSSSSSSSo',
    'oSSSsSSSSSsSSSSo',
    '.osSSosSSsoSSSo.',
    '.oSSo.oSSo.oSso.',
    '.oSso.oSso..oSo.',
    '..oSo.osSo..oSo.',
    '..oso..oSo..oo..',
    '..oSo..oso......',
    '...o...oSo......',
    '.......oSo......',
    '........o.......',
    '....o.....o.....',
    '...oso...oso....',
    '....o.....o.....',
    '................',
  ],
  // torkan (Björn valde version 1, steg 5.3.2.1): en större sol, och marken sprucken i flak
  m_torka: [
    '................',
    '..o.ooooo.o.....',
    '...oYYYYYo......',
    '..oYYYYYYYo.....',
    '..oYYYYYYyo.....',
    '.ooYYYYYyyoo....',
    '..oYYYYyyyo.....',
    '...oYYyyyo......',
    '..o.ooooo.o.....',
    '................',
    'oooooooooooooooo',
    'jkjJJjjjkjjJkjjj',
    'jjkjjjkkjjjJjkjj',
    'jjjkkkjjkjJJkkjj',
    'JjjkjjjjjkkkjJkk',
    'JJkjJJJjkjjJjjjJ',
  ],
  m_tornado: [ // (Björn valde version 2 efter v245, steg 4.5.2)
    '.ooooooooooooo..',
    'okKKkKKKkKKKkKo.',
    'okkkkkkkkkkkkko.',
    '.oooogGgGgooooo.',
    '....ogGgGgo.....',
    '.....oGgGo..l...',
    '.....ogGgo.l....',
    '......oGgo......',
    '..l...ogGo......',
    '.......oGo...l..',
    '.......ogo......',
    '......oGo.......',
    '.l....ogo...j...',
    '....dDdoDd..jj..',
    '..dDdDdDdDdD....',
    '................',
  ],
  m_oversvamning: [ // (Björn valde version 2 efter v245, steg 4.5.2)
    '................',
    '.......oo.......',
    '......ojjo......',
    '.....ojJJjo.....',
    '....ojJJJJjo....',
    '...ojJJJJJJjo...',
    '..oooooooooooo..',
    '...okkkkkkkko...',
    '...okkkoookko...',
    '...okkkobbokko..',
    'l.lokkkobboklo.l',
    'BlBlBlBlBlBlBlBl',
    'bBbbbbBbbbbbBbbb',
    'bbbbBbbbbbBbbbbb',
    'bbBbbbbbBbbbbbBb',
    'oooooooooooooooo',
  ],
  vader_dimma: [ // platshållare (steg 3.7.11)
    '..........',
    '.ovvvvvvo.',
    '..........',
    'ovvvvvvvvo',
    '..........',
    '.ovvvvvvo.',
    '..........',
    'ovvvvvvvvo',
    '..........',
    '..ovvvvo..',
  ],
  // sportens föremål (steg 4.3.1.2): platshållare med 16 punkter per ruta
  boll_liten: ['..oo..', '.oeao.', 'oeeaco', 'oaaaao', '.ocao.', '..oo..'],
  // scenen (steg 4.3.2.2, platshållare, 16 punkter): ett golv av kluvna stockar på korta ben
  scen: [
    '................', '................', '................', '.HHHHHHHHHHHHHH.', 'wLLLWLLLLLWLLLLw', 'wLWLLLLWLLLLLWLw', 'wHHHHHHHHHHHHHHw', 'wLLLLWLLLLLWLLLw',
    'wLWLLLLLWLLLLLLw', 'wwwwwwwwwwwwwwww', 'WWWWWWWWWWWWWWWW', '.w............w.', '.w............w.', '................', '................', '................',
  ],
  // scenen på kartan, tre rutor bred och två djup med 16 punkter per ruta (platshållare): kluvna stockar på tvären och en kant framtill
  scen_karta: [ // (Björn valde version 1 efter v245, steg 4.5.2)
    '................................................',
    '.oooooooooooooooooooooooooooooooooooooooooooooo.',
    'oeeeeeeeeeeeeeeeeeeeeeeaeeeeeeeeeeeeeeeeeeeeeeao',
    'occccccccccccccccccccccaccccccccccccccccccccccao',
    'occccccccccccccccccccccaccccccccccccccccccccccao',
    'obbbbbbbbbbbbbbbbbbbbbbabbbbbbbbbbbbbbbbbbbbbbao',
    'oeeeeeeaeeeeeeeeeeeeeeeeeeeeeeaeeeeeeeeeeeeeeeeo',
    'occccccaccccccccccccccccccccccacccccccccccccccco',
    'occccccaccccccccccccccccccccccacccccccccccccccco',
    'obbbbbbabbbbbbbbbbbbbbbbbbbbbbabbbbbbbbbbbbbbbbo',
    'oeeeeeeeeeeeeeaeeeeeeeeeeeeeeeeeeeeeeaeeeeeeeeeo',
    'occcccccccccccaccccccccccccccccccccccaccccccccco',
    'occcccccccccccaccccccccccccccccccccccaccccccccco',
    'obbbbbbbbbbbbbabbbbbbbbbbbbbbbbbbbbbbabbbbbbbbbo',
    'oeeeeeeeeeeeeeeeeeeeeaeeeeeeeeeeeeeeeeeeeeeeaeeo',
    'occccccccccccccccccccaccccccccccccccccccccccacco',
    'occccccccccccccccccccaccccccccccccccccccccccacco',
    'obbbbbbbbbbbbbbbbbbbbabbbbbbbbbbbbbbbbbbbbbbabbo',
    'oeeeeaeeeeeeeeeeeeeeeeeeeeeeaeeeeeeeeeeeeeeeeeeo',
    'occccaccccccccccccccccccccccacccccccccccccccccco',
    'occccaccccccccccccccccccccccacccccccccccccccccco',
    'obbbbabbbbbbbbbbbbbbbbbbbbbbabbbbbbbbbbbbbbbbbbo',
    'oeeeeeeeeeeeaeeeeeeeeeeeeeeeeeeeeeeaeeeeeeeeeeeo',
    'occcccccccccaccccccccccccccccccccccaccccccccccco',
    'occcccccccccaccccccccccccccccccccccaccccccccccco',
    'obbbbbbbbbbbabbbbbbbbbbbbbbbbbbbbbbabbbbbbbbbbbo',
    'oaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaao',
    'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
    'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
    '.oooooooooooooooooeeeeeoooeeeeeoooooooooooooooo.',
    '.................occccco.occccco................',
    '..................ooooo...ooooo.................',
  ],
  // scenen vriden (platshållare): två rutor bred och tre djup, stockarna på längden
  scen_karta_v: [ // scenen vriden: version 1 vriden ett kvarts varv (platshållare tills den stående bilden är ritad, steg 4.5.2)
    '...ooooooooooooooooooooooooooo..',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabcceaaaabccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebcceaaaabcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbaaaaabccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebcceaaaabccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '.oobbabccebccebccebccebccebcceo.',
    'ocebbabccebccebccebccebccebcceo.',
    'ocebbabccebccebccebccebccebcceo.',
    'ocebbabccebccebccebccebccebcceo.',
    'ocebbabccebcceaaaabccebccebcceo.',
    'ocebbabccebccebccebccebccebcceo.',
    '.oobbabccebccebccebccebcceaaaao.',
    '..obbabccebccebccebccebccebcceo.',
    '.oobbabccebccebccebccebccebcceo.',
    'ocebbabccebccebccebccebccebcceo.',
    'ocebbabccebccebccebccebccebcceo.',
    'ocebbabcceaaaabccebccebccebcceo.',
    'ocebbabccebccebccebccebccebcceo.',
    'ocebbabccebccebccebcceaaaabcceo.',
    '.oobbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbaaaaabccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebcceaaaabccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebcceaaaabccebccebcceo.',
    '..obbabccebccebccebccebccebcceo.',
    '..obbabccebccebccebccebcceaaaao.',
    '...ooooooooooooooooooooooooooo..',
  ],
  // filten (steg 4.4.1.1, platshållare, 16 punkter): en vävd filt sedd uppifrån, med ränder och fransar i kortändarna
  // handlaren (steg 4.4.1.2, platshållare, 16 punkter): en vandrare i blå kappa med en stor ryggsäck och en stav
  // silvret (steg 4.4.1.3, platshållare, 16 punkter): tre runda silverbitar i en liten hög
  // handslaget när ett byte är godkänt (steg 4.5.4.17: platshållare i paletten, två händer som möts; Björn väljer i bildstilen)
  handslag: [
    '................',
    '................',
    '................',
    '................',
    '................',
    'oo....oooo....oo',
    'bbo..oaaaao..occ',
    'bbboaaaoaaaaoccc',
    'bbbaaaoaoaaaaccc',
    'bbboaaaaoaaaoccc',
    'bbo.oaaaaaaoz.cc',
    'oo...ooooooozzoo',
    '.......zzzzz....',
    '................',
    '................',
    '................',
  ],
  // rövaren (steg 4.4.5, platshållare, 16 punkter): en gestalt i mörk huva och slitna skinn, med ett spjut
  rovare: [
    '...........S....', '......HHH..S....', '.....HHhHH.s....', '.....HhhhH.s....', '......hhh..s....', '.....CccccCs....', '....CccccccC....', '...Cc.cccccsC...',
    '.....cccccs.....', '.....CcccCs.....', '.....cc.ccs.....', '.....cc.cc......', '.....cc.cc......', '.....oo.oo......', '................', '................',
  ],
  handlare: [
    '......HHH.......', '.....HhhhH......', '.....hhhhh..bbb.', '......hhh..bBBBb', '.....CcccC.bBbBb', '....CcccccCbBBBb', '...s.cccccCbBbBb', '...s.cccccCbBBBb',
    '...s.cccccC.bbb.', '...s.CcccC......', '...s.cc.cc......', '...s.cc.cc......', '...s.cc.cc......', '...s.BB.BB......', '................', '................',
  ],
  filt: [
    '................', '................', '.y.y.y.y.y.y.y..', 'dddddddddddddd..', 'dRRRRRRRRRRRRd..', 'dRyyyyyyyyyyRd..', 'dRrrrrrrrrrrRd..', 'dRRRRRRRRRRRRd..',
    'dRrrrrrrrrrrRd..', 'dRyyyyyyyyyyRd..', 'dRRRRRRRRRRRRd..', 'dddddddddddddd..', '.y.y.y.y.y.y.y..', '................', '................', '................',
  ],
  // lerkrukan (steg 4.3.4, platshållare, 16 punkter): en bränd kruka med ett band av prickar
  kruka: [ // (Björn valde version 1 efter v245, steg 4.5.2)
    '................',
    '................',
    '................',
    '.....oooooo.....',
    '....orrrrrro....',
    '...oTRRRRRRRo...',
    '..oTTTTRRRRRRo..',
    '..oTTTRRRRRRro..',
    '..oTkRkRkRkrko..',
    '..okRkRkRkrkro..',
    '..oRRRRRRrrrro..',
    '..oRRRRRrrrrro..',
    '...oRRRrrrrro...',
    '....oRrrrrro....',
    '.....oooooo.....',
    '...zzzzzzzzzzz..',
  ],
  lerkruka_hog: [ // platshållare (steg 10.7.2): en hög och smal kruka med en hals och ett ristat band
    '................',
    '......oooo......',
    '.....orrrro.....',
    '......oRRo......',
    '.....oTRRRo.....',
    '....oTTRRRRo....',
    '....oTRRRRro....',
    '....okRkRkro....',
    '....oTRRRRro....',
    '....oTRRRrro....',
    '....oRRRRrro....',
    '....oRRRrrro....',
    '.....oRRrro.....',
    '.....oRrrro.....',
    '......oooo......',
    '....zzzzzzzz....',
  ],
  vagnsvrak: [ // platshållare (steg 11.6.13): en vagnskorg av plankor snett uppifrån, lutad där ena hjulet lossnat och ligger bredvid; en säck i korgen
    '................',
    '................',
    '..oooooooooo....',
    '.oeeeeeeeeeeo...',
    '.oeccccccccbo...',
    '.oec.SSs.ccbo...',
    '.oecSssssccbo...',
    '.oecSsssscccbo..',
    '.oebbbbbbbbbbo..',
    '..ooooooooooo...',
    '..oao.....ooo...',
    '.oaaao...occco..',
    '.oaoao..ocooco..',
    '.oaaao...occco..',
    '..ooo.zzz.ooo...',
    '................',
  ],
  heligt: [ // platshållare (steg 10.3.20): en strålande ring
    '................',
    '.......y........',
    '...y...y...y....',
    '....y..e..y.....',
    '.......o........',
    '.....ooooo......',
    '....oyeeeyo.....',
    'yy.oye...eyo.yy.',
    '...oye...eyo....',
    '....oyeeeyo.....',
    '.....ooooo......',
    '................',
    '....y..e..y.....',
    '...y...y...y....',
    '.......y........',
    '................',
  ],
  gudabild: [ // platshållare (steg 10.3.19)
    '......oooo......',
    '.....oeeeeo.....',
    '.....oeoeoo.....',
    '.....oeeeeo.....',
    '......occo......',
    '....ooccccoo....',
    '...occcccccco...',
    '...ocycccycco...',
    '...occccccco....',
    '....occccco.....',
    '....obbbbbo.....',
    '....obbbbbo.....',
    '....obbabbo.....',
    '...ooaaaaaoo....',
    '...oaaaaaaao....',
    '....zzzzzzz.....',
  ],

  // skinnkläderna som teknik: rocken och skorna (platshållare)
  skinnklader: [
    '.ww.....',
    'BbbB....',
    'BBBB....',
    'B..B....',
    '....Bb..',
    '....BBb.',
    '...BBBBb',
    '...ddddd',
  ],
  vagn: [ // platshållare (steg 11.11.2): ett flak på två hjul med ekrar, och två skaklar framåt
    '................',
    '................',
    'r...............',
    '.rr.............',
    '...rr...........',
    '....rroooooooooo',
    '....oaaaaaaaaaao',
    '....obbbbbbbbbbo',
    '....oooooooooooo',
    '......ooo...ooo.',
    '.....obaboobabo.',
    '.....oabaooabao.',
    '.....obaboobabo.',
    '......ooo...ooo.',
    '.....zzzzzzzzzzz',
    '................',
  ],
  bagborr: [ // platshållare (steg 10.6.13): en böjd båge med ett snöre runt en stående pinne på en skiva
    '................',
    '.......oo.......',
    '......obbo......',
    '.....ob..o......',
    '....ob...oo.....',
    '...ob...ora.....',
    '..ob...or.ao....',
    '..ob..or..ao....',
    '..obrrrrrrao....',
    '...ob.....ao....',
    '....ob....ao....',
    '.....obb..ao....',
    '......oo.oaao...',
    '.......oaaaaaao.',
    '.......oooooooo.',
    '........zzzzzz..',
  ],
  bivax: [ // platshållare (steg 10.10.20): en rund kaka av ljust bivax, smält och stelnad
    '................',
    '................',
    '................',
    '.....oooooo.....',
    '...ooHHHHHHoo...',
    '..oHHhhhhhhHHo..',
    '..oHhhhhhhhhHo..',
    '..ohhhhhhhhhho..',
    '..ohhhhhhhhhdo..',
    '..odhhhhhhhddo..',
    '...ooddddddoo...',
    '.....oooooo.....',
    '....zzzzzzzz....',
    '................',
    '................',
    '................',
  ],
  bisymbol: ['.oo.', 'oyyo', '.oo.'], // platshållare (steg 10.10.25): ett bi
  bikupa: [ // platshållare (steg 10.10.16): en halmkupa i ringar av flätat hö, med flustret nere vid foten, på en stubbe av grenar
    '................',
    '......oooo......',
    '....oohHHhoo....',
    '...ohHhhhhHho...',
    '...oddddddddo...',
    '..ohHhhhhhhHho..',
    '..ohhhhhhhhhho..',
    '..oddddddddddo..',
    '.ohHhhhhhhhhHho.',
    '.ohhhhhhhhhhhho.',
    '.oddddddoodddddo',
    '.ohhhhhhoohhhho.',
    '..oooooooooooo..',
    '...gg......gg...',
    '...zzzzzzzzzz...',
    '................',
  ],
  honung: [ // platshållare (steg 10.7.25): en bit vaxkaka med sexkantiga celler fulla av honung
    '................',
    '................',
    '....oooooooo....',
    '...ohHhHhHhHo...',
    '..ohdhdhdhdhdo..',
    '..oHhHhHhHhHho..',
    '.ohdhdhdhdhdhdo.',
    '.oHhHhHhHhHhHho.',
    '.ohdhdhdhdhdhdo.',
    '..oHhHhHhHhHho..',
    '..ohdhdhdhdhdo..',
    '...ovhvhvhvho...',
    '....oooooooo....',
    '.....zzzzzz.....',
    '................',
    '................',
  ],
  blomma: [ // platshållare (steg 10.7.3): en liten bukett ängsblommor med gula och vita kronor
    '................',
    '.....oo....oo...',
    '....oyyo..owwo..',
    '...oyycyo.owcwo.',
    '....oyyo..owwo..',
    '..oo.og...go....',
    '.owwo.g..g......',
    '.owcwo.g.g..oo..',
    '..owwg.ggg.oyyo.',
    '...l.g.gg.gycyo.',
    '....llggg.goyyo.',
    '.....lggglg.o...',
    '......gggl......',
    '.......gg.......',
    '.......gg.......',
    '......zzzz......',
  ],
  bildsten: [ // platshållare (steg 10.7.1): en rest sten med en målad jägare, ett spjut och ett djur i stället för runor
    '................',
    '......oooo......',
    '....oogggggo....',
    '...ogggrbgggo...',
    '...oggrrbgggmo..',
    '...oggrrbggggmo.',
    '...oggrgbggggmo.',
    '...ogrgrggdgdmo.',
    '...oggggggdddmo.',
    '...ogggggdgdgmo.',
    '...oggggggggmo..',
    '...oyyyyyyyymo..',
    '...ogggggggggo..',
    '...ogggggggggo..',
    '....ooooooooo...',
    '...zzzzzzzzzzz..',
  ],
  bokhylla: [ // platshållare (steg 10.6.16): en hylla av plankor med böcker och ett rullat blad
    '................',
    '..oooooooooooo..',
    '..obbbbbbbbbbo..',
    '..ob.oo.o.o.bo..',
    '..obornogwrwbo..',
    '..obornogwrwbo..',
    '..ocooooooooco..',
    '..obbbbbbbbbbo..',
    '..ob.o.oo...bo..',
    '..obgoroowwwbo..',
    '..obgoroowwwbo..',
    '..ocooooooooco..',
    '..obbbbbbbbbbo..',
    '..oa........ao..',
    '..oo........oo..',
    '..zzzzzzzzzzzz..',
  ],
  skrivpulpet: [ // platshållare (steg 10.6.11): en lutande skiva med ett blad, och en pall framför
    '................',
    '................',
    '...oooooooooo...',
    '..occcccccccco..',
    '..ocwwwwwwwcco..',
    '.occwddwdwwccco.',
    '.occwwwwwwwccco.',
    '.ocbbbbbbbbbbco.',
    '.oooooooooooooo.',
    '..oa.......ao...',
    '..oa..ooo..ao...',
    '..oa.obbbo.ao...',
    '..oa.oaaao.ao...',
    '..oo.oa.ao.oo...',
    '.....oo.oo......',
    '..zz..zz.zz.zz..',
  ],
  bok: [
    '........',
    '.hhhhhh.',
    '.hwwwwh.',
    '.hwddwh.',
    '.hwwwwh.',
    '.hwddwh.',
    '.hhhhhh.',
    '........',
  ],
  // ett skrivet blad (steg 10.6.5, platshållare): pergamentet med rader av bläck
  blad: [
    '........',
    '.wwwwwk.',
    '.wddwkk.',
    '.wwwwww.',
    '.wdddww.',
    '.wwwwww.',
    '.kdddwk.',
    '........',
  ],
  // kartan (steg 11.4.4, platshållare, 16 punkter): ett blad med en sjö, en stig och ett kryss där platsen ligger
  karta: [
    '................', '.oooooooooooooo.', '.okwwwwwwwwwwko.', '.owwwbbwwwwwwwo.', '.owwbbbwwwdwwwo.', '.owwwbwwwwdwwwo.', '.owwwwwwwdwwwwo.', '.owdwwwwdwwwwwo.',
    '.owwdwwdwwwwwwo.', '.owwwddwwwrwrwo.', '.owwwwwwwwwrwwo.', '.owwwwwwwwrwrwo.', '.okwwwwwwwwwwko.', '.oooooooooooooo.', '................', '................',
  ],
  // ett tomt blad pergament (steg 10.6.4, platshållare): ett ljust, lite ojämnt blad med hörnet uppvikt
  pergament: [
    '........',
    '.wwwwwk.',
    '.wwwwkk.',
    '.wwwwww.',
    '.wwwwww.',
    '.wwwwww.',
    '.kwwwwk.',
    '........',
  ],
  // golv av plankor
  tragolv: [
    'BbbbdBbb',
    'bbbbdbbb',
    'dddddddd',
    'bbdBbbbb',
    'bbdbbbbb',
    'dddddddd',
    'Bbbbbdbb',
    'bbbbbdbb',
  ],
  // inte klart (paborjat.ts): framstegscirkeln (Björn valde A2 efter v55), här halvfylld. På kartan och i panelerna ritas
  // den med hur långt arbetet kommit (foremal.ts och framstegSvg i ui/framsteg.ts)
  paborjat: [
    '..wwww..',
    '.wddyyw.',
    'wdddyyyw',
    'wdddyyyw',
    'wddddddw',
    'wddddddw',
    '.wddddw.',
    '..wwww..',
  ],
  // slagen av arbete (SLAG i handlingar.ts): enfärgade bilder över huvudet, olika alla sakers symboler
  // en grodd i jorden
  a_odla: [
    '........',
    'ww....ww',
    'www..www',
    '.ww..ww.',
    '..wwww..',
    '...ww...',
    '...ww...',
    '.wwwwww.',
  ],
  // en hand som plockar
  a_samla: [
    '.w.w.w..',
    '.w.w.w..',
    '.wwwww.w',
    '.wwwwwww',
    '.wwwwww.',
    '..wwww..',
    '..wwww..',
    '........',
  ],
  // pratbubblan (steg 3.10.3, platshållare): bubblan med tre prickar och spetsen nere till vänster
  a_prata: [ // (Björn valde version 1 efter v245, steg 4.5.2)
    '.wwwww..',
    'wwwwwww.',
    'w.w.w.w.',
    'wwwwwww.',
    '.wwwww..',
    '.ww.....',
    '.w......',
    '........',
  ],
  // toa (Björn valde version 2 efter bildstil v117, steg 5.3.2.1): en bajshög med stanken som stiger
  a_toa: [
    '.w....w.',
    'w....w..',
    '.w....w.',
    '...bb...',
    '..bcBb..',
    '.bBcBbb.',
    '.bcBBBb.',
    'bbbbbbbb',
  ],
  // jägaren smyger (Björn valde version 3, steg 5.3.2.1): en människa på tå med långa försiktiga steg, lutad framåt
  a_smyga: [
    '.....ww.',
    '.....ww.',
    '....ww..',
    '...www.w',
    '..w.ww..',
    '...w..w.',
    '..w....w',
    '.w......',
  ],
  // jägaren siktar (Björn valde version 1, steg 5.3.2.1): pilbågen snett, med rak sträng och pilen lagd mot den, inte spänd
  a_sikta: [
    '.ww...aa',
    '..aww.aa',
    '...a.w..',
    '....a.w.',
    '...a.aw.',
    '..a...aw',
    'aa.....w',
    'aa......',
  ],
  // ett sikte
  a_jaga: [
    '...w....',
    '.wwwww..',
    '.w.w.w..',
    'www.www.',
    '.w.w.w..',
    '.wwwww..',
    '...w....',
    '........',
  ],
  // en krok över vågor
  a_fiska: [
    '....w...',
    '....w...',
    '....w...',
    '.w..w...',
    '.w..w...',
    '..ww....',
    'a.a.a.a.',
    '.a.a.a.a',
  ],
  // ett träd
  a_tra: [
    '...w....',
    '..www...',
    '.wwwww..',
    '..www...',
    '.wwwww..',
    'wwwwwww.',
    '...w....',
    '...w....',
  ],
  // ett hus
  a_bygga: [
    '...w....',
    '..w.w...',
    '.w...w..',
    'wwwwwww.',
    '.w...w..',
    '.w.w.w..',
    '.w.w.w..',
    '.wwwww..',
  ],
  // en klubba
  a_hantverk: [
    '.wwwww..',
    '.wwwww..',
    '...w....',
    '...w....',
    '...w....',
    '...w....',
    '...w....',
    '........',
  ],
  // en pil ner i en låda
  a_bara: [
    '...w....',
    '...w....',
    '.w.w.w..',
    '..www...',
    'w..w..w.',
    'w.....w.',
    'wwwwwww.',
    '........',
  ],
  // en låga
  a_elda: [
    '...w....',
    '..ww....',
    '..www.w.',
    '.wwwwww.',
    '.ww.www.',
    '.w...ww.',
    '..www...',
    '........',
  ],
  // en boll
  a_leka: [
    '..www...',
    '.w.www..',
    'w.wwwww.',
    'wwwwwww.',
    'wwwwwww.',
    '.wwwww..',
    '..www...',
    '........',
  ],
  // svalkar sig (Björn valde 2 efter v89): solen bakom en trädkrona
  a_svalka: [
    'y.y.....',
    '.yy.www.',
    'yyywwwww',
    '.yywwwww',
    'y.wwwwww',
    '...wwww.',
    '.....w..',
    '.....w..',
  ],
  // dricker (Björn valde 1 efter v89): vatten i kupade händer. Samma bild när man får vatten av de andra
  a_dricka: [
    '...a....',
    '........',
    'w.w..w.w',
    'waaaaaaw',
    'waaaaaaw',
    '.wwwwww.',
    '..wwww..',
    '........',
  ],
  // dricker (Björn valde 1 efter v89): vatten i kupade händer. Samma bild när man får vatten av de andra
  a_fatt: [
    '...a....',
    '........',
    'w.w..w.w',
    'waaaaaaw',
    'waaaaaaw',
    '.wwwwww.',
    '..wwww..',
    '........',
  ],
  // relationstyperna (steg 3.1.1, platshållare i bildstilens palett, 16 punkter)
  // relationen par (steg 3.6.11, Björn valde version 2: färg efter typen och skugga)
  // legend (steg 3.6.11, Björn valde version 2 i bildstilen)
  i_legend: [
    '.ogo..ogo...ogo.',
    '..ozz.oaao...ozz',
    '...z..oaaoz...z.',
    '.o...oawaao...o.',
    'ogooooaaaaoooogo',
    'oaaaaaaaaaaaaaao',
    '.oaaaaawaaaaaaoz',
    '..oaaaaaaaaaaozz',
    '...oaaaaaaaaozz.',
    '...oaaaaaaaaoz..',
    '..oaaaabbaaaao..',
    '..oaaaboobaaaoz.',
    '.oaaabozzobaaao.',
    '.oabbozz..obbaoz',
    'ogooozz....ooogo',
    '.ozzzz......zzoz',
  ],
  // ökänd (steg 3.6.11, Björn valde version 2 i bildstilen)
  i_okand: [
    '....oooooooo....',
    '...oaaaaaaaao...',
    '..oaaaaaaaaaao..',
    '.oaaaaaaaaaaaao.',
    '.oaaaaaaaaaaaaoz',
    '.oakkkaaaakkkaoz',
    '.oakkkaaaakkkaoz',
    '.oaakaaaaaakaaoz',
    '..oaaaakkaaaaozz',
    '...oaaaaaaaaozz.',
    '....oabababaoz..',
    '....oaaaaaaaoz..',
    '.....obbbbbozz..',
    '......ooooozz...',
    '.......zzzzz....',
    '................',
  ],
  // gott anseende (steg 3.6.11, Björn valde version 2 i bildstilen)
  a_gott: [
    '...gggggggggg...',
    '....zoooooozzz..',
    '...oowwaaaaoo...',
    '..owaaaaaaaaao..',
    '.owaaaaaaaaaaao.',
    '.oaaaaaaaaaaaaoz',
    'oaaaoaaaaaaoaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaoaaaaaaoaaao',
    '.oaaaooooooaaaoz',
    '.obaaaaaaaaaaboz',
    '..obbaaaaaabbozz',
    '...oobbbbbboozz.',
    '....zoooooozzz..',
  ],
  // blandat anseende (steg 3.6.11, Björn valde version 2 i bildstilen)
  a_blandat: [
    '................',
    '.....oooooo.....',
    '...oowwaaaaoo...',
    '..owaaaaaaaaao..',
    '.owaaaaaaaaaaao.',
    '.oaaaaaaaaaaaaoz',
    'oaaaoaaaaaaoaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaao',
    '.oaaaooooooaaaoz',
    '.obaaaaaaaaaaboz',
    '..obbaaaaaabbozz',
    '...oobbbbbboozz.',
    '....zoooooozzz..',
  ],
  // dåligt anseende (steg 3.6.11, Björn valde version 2 i bildstilen)
  a_daligt: [
    '..h..........h..',
    '..hh........hhz.',
    '...oowwaaaaoozz.',
    '..owaaaaaaaaao..',
    '.owaaaaaaaaaaao.',
    '.oaaooaaaaooaaoz',
    'oaaaaoaaaaoaaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaooooooaaaao',
    '.oaaoaaaaaaoaaoz',
    '.obaaaaaaaaaaboz',
    '..obbaaaaaabbozz',
    '...oobbbbbboozz.',
    '....zoooooozzz..',
  ],
  r_par: [
    '................',
    '..ddddd..ddddd..',
    '..dRrrrddRrrrdz.',
    '.dRrrrrrrrrrrrd.',
    '.drrrrrrrrrrrrdz',
    '.drrrrrrrrrrrrdz',
    '.drrrrrrrrrrrrdz',
    '.drrrrrrrrrrrrdz',
    '..drrrrrrrrrrdzz',
    '...drrrrrrrrdzz.',
    '...drrrrrrrrdz..',
    '....drrrrrrdzz..',
    '.....ddrrddzz...',
    '......zddzzz....',
    '........zz......',
    '................',
  ],
  // relationen gift (steg 3.6.11, Björn valde version 2: färg efter typen och skugga)
  r_gift: [
    '................',
    '................',
    '................',
    '................',
    '...gggggggggg...',
    '..ggzzzggzzzgg..',
    '.ggzz.gggg...gg.',
    '.ggz..ggggz..ggz',
    '.GGz..GGGGz..GGz',
    '.GGz..GGGGz..GGz',
    '..GG...GGzz.GGzz',
    '...GGGGGGGGGGzz.',
    '....zzzzzzzzzz..',
    '................',
    '................',
    '................',
  ],
  // relationen van (steg 3.6.11, Björn valde version 2: färg efter typen och skugga)
  r_van: [
    '................',
    '................',
    '................',
    '................',
    '....o......o....',
    '..ooQoo..ooQoo..',
    '..oQQQoz.oQQQoz.',
    '..oQQQoz.oQQQoz.',
    '..ooQooz.ooQooz.',
    '..oQoQoz.oQoQoz.',
    '.oQQQQQooQQQQQo.',
    '.oQQQQQooQQQQQoz',
    '.oQQQQQooQQQQQoz',
    '.oQQQQQooQQQQQoz',
    '.oQQQQQooQQQQQoz',
    '.ooooooooooooooz',
  ],
  // relationen naravan (steg 3.6.11, Björn valde version 2: färg efter typen och skugga)
  r_naravan: [
    '................',
    '................',
    '................',
    '................',
    '.....o....o.....',
    '...ooOooooOoo...',
    '...oOOOooOOOoz..',
    '...oOOOooOOOoz..',
    '...ooOooooOooz..',
    '...oOoOooOoOoz..',
    '..oOOOOoOOOOOo..',
    '..oOOOOoOOOOOoz.',
    '..oOOOOoOOOOOoz.',
    '..oOOOOoOOOOOoz.',
    '..oOOOOoOOOOOoz.',
    '..ooooooooooooz.',
  ],
  // relationen bast (steg 3.6.11, Björn valde version 2: färg efter typen och skugga)
  r_bast: [
    '.....dddddd.....',
    '.....drrrrdz....',
    '.....drrrrdz....',
    '......drrdzz....',
    '......ddddz.....',
    '....o..zzzzo....',
    '..ooOoo..ooOoo..',
    '..oOOOoz.oOOOoz.',
    '..oOOOoz.oOOOoz.',
    '..ooOooz.ooOooz.',
    '..oOoOoz.oOoOoz.',
    '.oOOOOOooOOOOOo.',
    '.oOOOOOooOOOOOoz',
    '.oOOOOOooOOOOOoz',
    '.oOOOOOooOOOOOoz',
    '.ooooooooooooooz',
  ],
  // relationen mentor (steg 3.6.11, Björn valde version 2: färg efter typen och skugga)
  r_mentor: [
    '................',
    '................',
    '...oooo.........',
    '..ooGGoo........',
    '..oGGGGoz.......',
    '..ooGGooz.......',
    '...oooozz.......',
    '..oGGGGo........',
    '.oGGGGGGo.oooo..',
    '.oGGGGGGozoOOoz.',
    '.oGGGGGGozooooz.',
    '.oGGGGGGozoOOoz.',
    '.oGGGGGGozoOOoz.',
    '.oGGGGGGozoOOoz.',
    '.oGGGGGGozoOOoz.',
    '.oooooooozooooz.',
  ],
  // relationen larling (steg 3.6.11, Björn valde version 2: färg efter typen och skugga)
  r_larling: [
    '................',
    '................',
    '...oooo.........',
    '..ooGGoo........',
    '..oGGGGoz.......',
    '..ooGGooz.......',
    '...oooozz.......',
    '..oGGGGo........',
    '.oGGGGGGo.oooo..',
    '.oGGGGGGozoOOoz.',
    '.oGGGGGGozooooz.',
    '.oGGGGGGozoOOoz.',
    '.oGGGGGGozoOOoz.',
    '.oGGGGGGozoOOoz.',
    '.oGGGGGGozoOOoz.',
    '.oooooooozooooz.',
  ],
  // relationen rival (steg 3.6.11, Björn valde version 2: färg efter typen och skugga)
  r_rival: [
    '................',
    '................',
    '.........R......',
    '........R.z.....',
    '........Rz......',
    '.......R.z......',
    '.oooo..RRR.oooo.',
    '.ossoz..zRzossoz',
    '.ossoz..R.zossoz',
    '.ooooz..Rz.ooooz',
    '.ossoz.R.z.ossoz',
    'osssso..z.osssso',
    'ossssoz...osssso',
    'ossssoz...osssso',
    'ossssoz...osssso',
    'ooooooz...oooooo',
  ],
  // relationen fiende (steg 3.6.11, Björn valde version 2: färg efter typen och skugga)
  r_fiende: [
    '................',
    '..SSSSS..SSSSS..',
    '..SssssSSssssSz.',
    '.SssssssssssssS.',
    '.SssssssosssssSz',
    '.SsssssossssssSz',
    '.SssssssosssssSz',
    '.SsssssssossssSz',
    '..SsssssossssSzz',
    '...SsssossssSzz.',
    '...SssssosssSz..',
    '....SsssossSzz..',
    '.....SSssSSzz...',
    '......zSSzzz....',
    '........zz......',
    '................',
  ],
  // relationen arke (steg 3.6.11, Björn valde version 2: färg efter typen och skugga)
  r_arke: [
    '................',
    '..ooooo..ooooo..',
    '..oddddooddddoz.',
    '.oddddddddddddo.',
    '.oddddddgdddddoz',
    '.odddddgddddddoz',
    '.oddddddgdddddoz',
    '.odddddddgddddoz',
    '..odddddgddddozz',
    '...odddgddddozz.',
    '...oddddgdddoz..',
    '....odddgddozz..',
    '.....ooddoozz...',
    '......zoozzz....',
    '........zz......',
    '................',
  ],
  // våldsam (steg 3.6.11, Björn valde version 2 i bildstilen: mörk kant och skugga snett nedanför)
  i_valdsam: [
    '................',
    '................',
    '...ooooooooooo..',
    '..oaabaabaabaao.',
    '.oaaabaabaabaaao',
    '.oaaabaabaabaaao',
    '.oaaaaaaaaaaaaao',
    '.oabbbbbbaaaaaao',
    '.oaaaaaaabaaaaao',
    '.oaaaaaaaaaaaaao',
    '..oaaaaaaaaaaaoz',
    '...oaaaaaaaaaozz',
    '....oaaaaaaaozz.',
    '....oaaaaaaaoz..',
    '....oaaaaaaaoz..',
    '.....ooooooozz..',
  ],
  // tjuv (steg 3.6.11, Björn valde version 2 i bildstilen: mörk kant och skugga snett nedanför)
  i_tjuv: [
    '................',
    '.......oo.......',
    '......occo......',
    '.....ocooco.....',
    '......occozz....',
    '.....oaaaao.....',
    '....oaaaaaao....',
    '...oaaaaaaaao...',
    '..oaaaaaaaaaao..',
    '..oaaaabbaaaaoz.',
    '.oaaaaabbaaaaao.',
    '.oaaaaaaaaaaaaoz',
    '.oaaaaaaaaaaaaoz',
    '..obbbbbbbbbbozz',
    '...oooooooooozz.',
    '....zzzzzzzzzz..',
  ],
  // elak (steg 3.6.11, Björn valde version 2 i bildstilen: mörk kant och skugga snett nedanför)
  i_elak: [
    '................',
    '.....oooooo.....',
    '...oowwaaaaoo...',
    '..owaaaaaaaaao..',
    '.owoaaaaaaaaoao.',
    '.oaaooaaaaooaaoz',
    'oaaaooaaaaooaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaao',
    'oaaaaooooooaaaao',
    '.oaaaowowowaaaoz',
    '.obaaooooooaaboz',
    '..obbaaaaaabbozz',
    '...oobbbbbboozz.',
    '....zoooooozzz..',
  ],
  // lögnare (steg 3.6.11, Björn valde version 2 i bildstilen: mörk kant och skugga snett nedanför)
  i_logn: [
    '................',
    '.....oooooo.....',
    '...oowwaaaaoo...',
    '..owaaaaaaaaao..',
    '.owaaaaaaaaaaao.',
    '.oaaoaaaaaoaaaoz',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaannnnnnnn',
    'oaaaaaaannnnnnnn',
    'oaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaao',
    '.oaaaooooaaaaaoz',
    '.obaaaaaaaaaaboz',
    '..obbaaaaaabbozz',
    '...oobbbbbboozz.',
    '....zoooooozzz..',
  ],
  // klåpare (steg 3.6.11, Björn valde version 2 i bildstilen: mörk kant och skugga snett nedanför)
  i_klapare: [ // (Björn valde version 1 efter v245, steg 4.5.2)
    '................',
    '.....oooooo.....',
    '....oaaaaaao....',
    '.....oaaaaozz...',
    '....oaaaaaao....',
    '...oawaaaaaao...',
    '..oawaaaoaaozoo.',
    '..oawaaaaoozoabo',
    '..oaaaaaoaooabbo',
    '..oaaaaaaoaooboz',
    '..obaaaaoaaaoozz',
    '...obaaaaaaaozz.',
    '....obbbbbbozz..',
    '.....oooooozz...',
    '......zzzzzz....',
    '................',
  ],
  // lat (steg 3.6.11, Björn valde version 2 i bildstilen: mörk kant och skugga snett nedanför)
  i_lat: [
    '.........oooo...',
    '........oaaaao..',
    '.........ooaozz.',
    '.........oaooz..',
    '....ooo.oaaaao..',
    '...oaaao.oooozz.',
    '....oaozz.zzzz..',
    '...oaaao........',
    '....ooozz.......',
    '..oooooooooooo..',
    '.obbbbbbbbbbbbo.',
    'obbbbbbbbbbbbbbo',
    'obbbbbbbbbbbbbbo',
    'occcccccccccccco',
    '.ooooooooooooooz',
    '..zzzzzzzzzzzzzz',
  ],
  // fattig (steg 3.6.11, Björn valde version 2 i bildstilen: mörk kant och skugga snett nedanför)
  i_fattig: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '..oooooooooooo..',
    '.owwwwwwwwwwwwo.',
    '.oaaaaaaaaaaaaoz',
    '.oaaaaaaaaaaaaoz',
    '..oaaaaaaaaaaozz',
    '...oaaaaaaaaozz.',
    '....obbbbbbozz..',
    '.....obbbbozz...',
    '......oooozz....',
    '.......zzzz.....',
    '................',
  ],
  // generös (steg 3.6.11, Björn valde version 2 i bildstilen: mörk kant och skugga snett nedanför)
  i_generos: [
    '.....oo..oo.....',
    '....orroorro....',
    '...oroorrooro...',
    '..ooorrrrrrooo..',
    '.oaaaaarraaaaao.',
    '.owwwwwrrwwwwwoz',
    '.oaaaaarraaaaaoz',
    '..oooooooooooozz',
    '..oaaaarraaaaoz.',
    '..oaaaarraaaaoz.',
    '..oaaaarraaaaoz.',
    '..oaaaarraaaaoz.',
    '..obbbbrrbbbboz.',
    '..obbbbrrbbbboz.',
    '...oooooooooozz.',
    '....zzzzzzzzzz..',
  ],
  // hjälpsam (steg 3.6.11, Björn valde version 2 i bildstilen: mörk kant och skugga snett nedanför)
  i_hjalpsam: [
    '................',
    '................',
    '................',
    '.oo..........oo.',
    'occo........occo',
    'occaoo....ooacco',
    'occaaaooooaaacco',
    'occaaaaaaaaaacco',
    'occaabaabaabacco',
    'occoaaaaaaaaocco',
    'occooaaaaaaoocco',
    'occozobbbbozocco',
    '.oozz.oooozz.ooz',
    '..zz...zzzz...zz',
    '................',
    '................',
  ],
  // skicklig (steg 3.6.11, Björn valde version 2 i bildstilen: mörk kant och skugga snett nedanför)
  i_skicklig: [
    '.......oo.......',
    '......oaao......',
    '......oaaoz.....',
    '.....oawaao.....',
    '.oooooaaaaooooo.',
    'oaaaaaaaaaaaaaao',
    '.oaaaaawaaaaaaoz',
    '..oaaaaaaaaaaozz',
    '...oaaaaaaaaozz.',
    '...oaaaaaaaaoz..',
    '..oaaaabbaaaao..',
    '..oaaaboobaaaoz.',
    '.oaaabozzobaaao.',
    '.oabbozz..obbaoz',
    '..ooozz....ooozz',
    '...zzz......zzz.',
  ],
  // flitig (steg 3.6.11, Björn valde version 2 i bildstilen: mörk kant och skugga snett nedanför)
  i_flitig: [
    '..ooooooo.......',
    '.oaaaaaaao...o..',
    'oaaaaaaaaao.oto.',
    'oabbbbbbbaootozz',
    '.oooohhooozzoto.',
    '..zzohhozzz..ozz',
    '....ohhoz.....z.',
    '....ohhoz.......',
    '....ohhoz.......',
    '....ohhoz.......',
    '....oddoz.......',
    '....ohhoz.......',
    '....ohhoz.......',
    '....oddoz.......',
    '.....oozz.......',
    '......zz........',
  ],
  // rik (steg 3.6.11, Björn valde version 2 i bildstilen: mörk kant och skugga snett nedanför)
  // välbärgad (steg 4.5.4.7: platshållare i paletten, en pung med lite i; Björn väljer i bildstilen)
  i_valbargad: [
    '................',
    '................',
    '................',
    '.......oo.......',
    '......oggo......',
    '.....oobboo.....',
    '....oaaaaaao....',
    '...oaaabaaaao...',
    '...oaababaaaoz..',
    '..oaaaaaaabaaoz.',
    '..oabaaaaaaaaoz.',
    '..oaaaabaaaabozz',
    '...oaaaaaaaaoz..',
    '....oooooooozz..',
    '.....zzzzzzzz...',
    '................',
  ],
  i_rik: [
    '................',
    '.....o..o.......',
    '....ogoogoo.....',
    '...orRrrRrroo...',
    '..orrrRrrrRrro..',
    '.oRrrrrRrrrrrRo.',
    '.oaaaaaaaaaaaaoz',
    '.oabababababbaoz',
    '.oaaaaaaaaaaaaoz',
    '.oabababababbaoz',
    '..oaaaaaaaaaaozz',
    '..oabababababao.',
    '...oaaaaaaaaoozz',
    '...obbbbbbbbozz.',
    '....oooooooozz..',
    '.....zzzzzzzz...',
  ],
  // rättvis (steg 3.10.8: intrycket hade bara en emoji; platshållare i paletten, Björn väljer i bildstilen)
  i_rattvis: [
    '................',
    '.......oo.......',
    '......oaao......',
    '.ooooooaaoooooo.',
    'oaaaaaaaaaaaaaao',
    '.ooooooabooooooz',
    '..c...oabo...c.z',
    '..c...oabo...c..',
    '..c...oabo...c..',
    'ooooo.oabo.ooooo',
    'oaaao.oabo.oaaao',
    '.oooz.oabo..oooz',
    '..zz..oabo...zz.',
    '.....oaabbo.....',
    '....oaaabbbo....',
    '....oooooooozz..',
  ],
  // orättvis (steg 3.10.8: intrycket hade bara en emoji; platshållare i paletten, Björn väljer i bildstilen)
  i_orattvis: [
    '................',
    '.......oo.......',
    '......oaao......',
    '.ooooooaaoooooo.',
    'oaaaaaaaaaaaaaao',
    '.ooooooabooooooz',
    '..c...oabo...c.z',
    'ooooo.oabo...c..',
    'oaaao.oabo...c..',
    '.oooz.oabo...c..',
    '..zz..oabo...c..',
    '......oabo.ooooo',
    '......oabo.oaaao',
    '.....oaabbo.oooz',
    '....oaaabbbo.zz.',
    '....oooooooozz..',
  ],
  // stark (steg 3.10.8: intrycket hade bara en emoji; platshållare i paletten, Björn väljer i bildstilen)
  i_stark: [
    '................',
    '...oo.oo.oo.oo..',
    '..owaowaowaowao.',
    '..oaaoaaoaaoaao.',
    '..oaaoaaoaaoaaoz',
    '..oaaoaaoaaoaaoz',
    '.ooaaaaaaaaaaaoz',
    'ooooooooooaaaaoz',
    'owaaaaaaaoaaaboz',
    'ooooooooooaabboz',
    '.oaaaaaaaaabbboz',
    '..oaaaaaaabbbozz',
    '...obbbbbbbbozz.',
    '....oaaaaaboz...',
    '....oaaaabboz...',
    '....ooooooozz...',
  ],
  // feg (steg 3.10.8: intrycket hade bara en emoji; platshållare i paletten, Björn väljer i bildstilen)
  i_feg: [
    '..ooo...........',
    '..ocooooooooo...',
    '..ocowwwwwwwwo..',
    '..ocowwwwwwwwwo.',
    '..ocowwwwwwwvvoz',
    '..ocowwwwwwvvoz.',
    '..ocowwwwwvvvo..',
    '..ocowwwvvvvvoz.',
    '..ocooooooooooz.',
    '..oco.zzzzzzzz..',
    '..oco...........',
    '..oco...........',
    '..oco...........',
    '..oco...........',
    '..oco...........',
    '..ooozz.........',
  ],
  i_pahittig: [ // steg 10.4.9: platshållare
    '................',
    '.......o........',
    '......oao.......',
    '..o...oao...o...',
    '...o..oao..o....',
    '....oowawoo.....',
    '..ooaawwwaaoo...',
    '.oaawwwwwwwaao..',
    '..ooaawwwaaooz..',
    '....oowawoozz...',
    '...o..oao..oz...',
    '..o...oao...o...',
    '......oao.z.....',
    '.......ozz......',
    '................',
    '................',
  ],
  i_skvaller: [ // steg 10.8.6: platshållare
    '................',
    '..oooooooooo....',
    '.oaaaaaaaaaao...',
    'oaaaaaaaaaaaao..',
    'oaaommmmmmoaao..',
    'oaaommoommoaao..',
    'oaaaommmmoaaabo.',
    'oaaaaooooaaaabo.',
    '.oaaaaaaaaaabbo.',
    '..oooaaaaoooobz.',
    '.....oaaoz..zz..',
    '......oaoz......',
    '.......ooz......',
    '........z.......',
    '................',
    '................',
  ],
  i_forsvarare: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..ooabbbbbbaoo..',
    '..oaabbbbbbaaoz.',
    '.ooaabbaabbaaoo.',
    '.oaaabbaabbaaaoz',
    '.oaaabbbbbbaaaoz',
    '.ooaaabbbbaaaooz',
    '..oaaaabbaaaaozz',
    '..ooaaaaaaaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_botare: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..ooaaabbaaaoo..',
    '..oaaaabbaaaaoz.',
    '.ooaabbbbbbaaoo.',
    '.oaaabbbbbbaaaoz',
    '.oaaaaabbaaaaaoz',
    '.ooaaaabbaaaaooz',
    '..oaaaabbaaaaozz',
    '..ooaaaaaaaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_daligLakare: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..oobaabbaaboo..',
    '..oaababbabaaoz.',
    '.ooaabbbbbbaaoo.',
    '.oaaabbbbbbaaaoz',
    '.oaaaabbbbaaaaoz',
    '.ooaababbabaaooz',
    '..oabaabbaabaozz',
    '..ooaaaaaaaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_scenBra: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..ooaaabbaaaoo..',
    '..oaaaabbaaaaoz.',
    '.ooabbbbbbbbaoo.',
    '.oaaabbbbbbaaaoz',
    '.oaaaabbbbaaaaoz',
    '.ooaabbaabbaaooz',
    '..oaabaaaabaaozz',
    '..ooaaaaaaaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_scenDalig: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..ooabbaabbaoo..',
    '..oaabbaabbaaoz.',
    '.ooaaaaaaaaaaoo.',
    '.oaaaaaaaaaaaaoz',
    '.oaaaabbbbaaaaoz',
    '.ooaabaaaabaaooz',
    '..oabaaaaaabaozz',
    '..ooaaaaaaaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_skrivkunnig: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..ooaaaaaabboo..',
    '..oaaaaaabbaaoz.',
    '.ooaaaaabbaaaoo.',
    '.oaaaaabbaaaaaoz',
    '.oaaaabbaaaaaaoz',
    '.ooaabbaaaaaaooz',
    '..oabaaaaaaaaozz',
    '..oobbbbaaaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_from: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..ooaaabaaaaoo..',
    '..oaaabbaaaaaoz.',
    '.ooaaabbbaaaaoo.',
    '.oaaabbbbbaaaaoz',
    '.oaaabbbbbbaaaoz',
    '.ooaabbbbbbaaooz',
    '..oaaabbbbaaaozz',
    '..ooaaaaaaaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_gudlos: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..ooaabbbbaaoo..',
    '..oaabaaaabaaoz.',
    '.ooabaaaababaoo.',
    '.oaabaaabaabaaoz',
    '.oaabaabaaabaaoz',
    '.ooababaaaabaooz',
    '..oaabaaaabaaozz',
    '..ooaabbbbaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_suput: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..oobbbbbbbboo..',
    '..oabaaaaaabaoz.',
    '.ooaabaaaabaaoo.',
    '.oaaabbbbbbaaaoz',
    '.oaaaabbbbaaaaoz',
    '.ooaaaabbaaaaooz',
    '..oaaabbbbaaaozz',
    '..ooaaaaaaaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_lurendrejare: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..oobaaaaaaboo..',
    '..oabbaaaabbaoz.',
    '.ooaabbbbbbaaoo.',
    '.oaaababbabaaaoz',
    '.oaaabbbbbbaaaoz',
    '.ooaaabbbbaaaooz',
    '..oaaaabbaaaaozz',
    '..ooaaaaaaaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_hederlig: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..ooaaabbaaaoo..',
    '..oabbbbbbbbaoz.',
    '.ooabaabbaabaoo.',
    '.oaabaabbaabaaoz',
    '.oaabbabbabbaaoz',
    '.ooaaaabbaaaaooz',
    '..oaabbbbbbaaozz',
    '..ooaaaaaaaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_vittberest: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..oobaaaaaaaoo..',
    '..oaabaaaaaaaoz.',
    '.ooaaabaabaaaoo.',
    '.oaaaaabbabaaaoz',
    '.oaaaaaabbbbaaoz',
    '.ooaaaaaaabbaooz',
    '..oaaaaaabbbaozz',
    '..ooaaaaaaaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_brandslackare: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..ooaaabbaaaoo..',
    '..oaaaabbaaaaoz.',
    '.ooaaabbbbaaaoo.',
    '.oaaabbbbbbaaaoz',
    '.oaaabbbbbbaaaoz',
    '.ooaabbbbbbaaooz',
    '..oaaabbbbaaaozz',
    '..ooaaaaaaaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_djurvan: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..ooabaaaabaoo..',
    '..oabbbaabbbaoz.',
    '.ooaabaaaabaaoo.',
    '.oaaaaabbaaaaaoz',
    '.oaaaabbbbaaaaoz',
    '.ooaabbbbbbaaooz',
    '..oaabbbbbbaaozz',
    '..ooaabaabaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_fangelsekund: [ // steg 12.1.134: platshållare
    '................',
    '......oooo......',
    '....oooaaooo....',
    '...ooaaaaaaoo...',
    '..oobbbbbbbboo..',
    '..oababaababaoz.',
    '.ooababaababaoo.',
    '.oaababaababaaoz',
    '.oaababaababaaoz',
    '.ooababaababaooz',
    '..oabbbbbbbbaozz',
    '..ooaaaaaaaaooz.',
    '...ooaaaaaaoozz.',
    '....oooaaooozz..',
    '.....zoooozzz...',
    '.......zzzz.....',
  ],
  i_aventyrare: [ // steg 11.8.17: platshållare, en rulle med ett rött sigill
    '................',
    '................',
    '..oooooooooooo..',
    '.obaaaaaaaaaabo.',
    '..oaaaaaaaaaaoz.',
    '..oabbbbbbbbaoz.',
    '..oaaaaaaaaaaoz.',
    '..oabbbbbbaaaoz.',
    '..oaaaaaaaaaaoz.',
    '..oabbbbboooaoz.',
    '..oaaaaaaorroz..',
    '.obaaaaaaorrroz.',
    '..oooooooooooz..',
    '...zzzzzzzzzz...',
    '................',
    '................',
  ],
  i_forutseende: [ // steg 10.4.9: platshållare
    '................',
    '....w.w..w.w....',
    '...wbwbwwbwbw...',
    '..oooooooooooo..',
    '.oaaaaaaaaaaaao.',
    '.oabababababao.z',
    '.oaaaaaaaaaaaaoz',
    '..oabababababaoz',
    '..oaaaaaaaaaaoz.',
    '..oabababababoz.',
    '...oaaaaaaaaoz..',
    '...oooooooooozz.',
    '....zzzzzzzzz...',
    '................',
    '................',
    '................',
  ],
  i_vargdodare: [
    '.o............o.',
    '.oo..........oo.',
    '.obo........obo.',
    '.obbo......obbo.',
    '.oaaaooooooaaao.',
    '.oaaaaaaaaaaaao.',
    'oaaaaaaaaaaaaaao',
    'oaakkaaaaaakkaao',
    'oaaaaaaaaaaaaabo',
    '.oaaaawwwwaaabo.',
    '.oaaawwwwwwaaboz',
    '..oaawwkkwwabozz',
    '...oaawwwwabozz.',
    '....oabwwbaozz..',
    '.....obbbboz....',
    '......oooozz....',
  ],
  // farlig plats (steg 3.6.11, Björn valde version 2 i bildstilen: mörk kant och skugga snett nedanför)
  l_fara: [
    '.......oo.......',
    '......oaao......',
    '......oaaoz.....',
    '.....oaaaao.....',
    '.....oakkaoz....',
    '....oaakkaao....',
    '....oaakkaaoz...',
    '...oaaakkaaao...',
    '...oaaakkaaaoz..',
    '..oaaaakkaaaao..',
    '..oaaaaaaaaaaoz.',
    '.oaaaaakkaaaaao.',
    '.oaaaaakkaaaaaoz',
    'oaaaaaaaaaaaaaao',
    'obbbbbbbbbbbbbbo',
    '.ooooooooooooooz',
  ],
  // hämtar vatten i säcken (steg 2.10.1, platshållare i bildstilens palett, 16 punkter): säcken som en kontur och en droppe
  a_vatten: [
    '................',
    '......ww........',
    '.....w..w.......',
    '......ww........',
    '.....w..w.......',
    '....w....w......',
    '...w......w.....',
    '..w........w....',
    '..w........w....',
    '..w........w..a.',
    '..w........w..a.',
    '...w......w..aaa',
    '....w....w...aaa',
    '.....wwww.....a.',
    '................',
    '................',
  ],
  // smälter snö (Björn valde 2 efter v89): en snöflinga som blir en droppe
  a_smalta: [
    'w.w.w...',
    '.www....',
    'wwwww...',
    '.www..a.',
    'w.w.w.a.',
    '.....aaa',
    '.....aaa',
    '......a.',
  ],
  // vårdar (Björn valde läkekorset efter v89)
  a_varda: [
    '..www...',
    '..www...',
    'wwwwwww.',
    'wwwrwww.',
    'wwwwwww.',
    '..www...',
    '..www...',
    '........',
  ],
  // verkstaden, rummets funktion (Björn valde 4 efter v89): en slöjdbänk med tvinnstolpar
  verkstad: [
    'lOLOLOLl',
    'l......l',
    'l......l',
    'BBBBBBBB',
    'bbbbbnkb',
    'dddddddd',
    '.d....d.',
    '.d....d.',
  ],
  // skärsår: en flintkniv med blod
  s_skarsar: [
    '.......E',
    '......Er',
    '.....Ee.',
    '....Eer.',
    '...Ee...',
    '..H...r.',
    '.Hh.....',
    'hh....m.',
  ],
  // bett: huggtänder som droppar
  s_bett: [
    'mrrrrrrm',
    'rRRrrRRr',
    '.wW..wW.',
    '.wb..wb.',
    '..b..b..',
    '..r..r..',
    '........',
    '..r..m..',
  ],
  // klösmärken: tre klor
  s_klos: [
    'w..w..w.',
    'b..b..b.',
    'r..r..r.',
    '.r..r..r',
    '.r..r..r',
    '.R..R..R',
    '.m..m..m',
    '........',
  ],
  // benbrott: ett ben som brutits av
  s_benbrott: [
    'Ww......',
    'wWw.....',
    '.wWb....',
    '..wbr...',
    '...rWw..',
    '....wWb.',
    '...r.bWw',
    '......ww',
  ],
  // krossår: en sten med blodstänk
  s_krossar: [
    '.....r..',
    '.r....R.',
    '...rR..r',
    '.eEEEe..',
    'eEEeeeeo',
    'eeeeeooo',
    '.oooooo.',
    '........',
  ],
  // infektion (Björn valde den gröna klumpen)
  s_inf: [
    '...g.g..',
    '.gGGGGg.',
    '.GqGGGg.',
    'gGGGqGGg',
    '.GGqGGg.',
    '.gGGGqg.',
    '..g.gg..',
    '........',
  ],
  // förband av mossa (Björn valde 2): en tuss mossa bunden med snöre
  s_forb: [
    '........',
    '.ZuZZuZ.',
    'ZzuzZuzZ',
    'zZuZzuZz',
    'zzuzzuzx',
    'xzuzzuzx',
    '.xuxxux.',
    '........',
  ],
  // rengjort (Björn valde 2): en vattendroppe med en glimt
  s_ren: [
    '..a...f.',
    '..aa.fFf',
    '.aAaa.f.',
    '.aAaaa..',
    'aAAaaac.',
    'aAaaacc.',
    '.aaacc..',
    '..ccc...',
  ],
  // kallbrand: samma klump som infektionen, lila och mörkare (Björn efter v89)
  fangelse: [ // platshållare: dörr med galler (steg 11.12.1)
    'bbbbbbbb',
    'bcacacab',
    'bcacacab',
    'bcacacab',
    'bcacacab',
    'bcacacab',
    'bcacacab',
    'bbbbbbbb',
  ],
  s_kall: [
    '...g.g..',
    '.gGGGGg.',
    '.GqGGGg.',
    'gGGGqGGg',
    '.GGqGGg.',
    '.gGGGqg.',
    '..g.gg..',
    '........',
  ],
  // energi: en blixt
  n_energi: [
    '....Aa..',
    '...Aa...',
    '..Aa....',
    '.AaaaaD.',
    '....aD..',
    '...aD...',
    '..aD....',
    '.aD.....',
  ],
  // brist på energi: samma form som en tom kontur, fylld bara i botten
  b_energi: [
    '....DD..',
    '...DD...',
    '..DD....',
    '.DDDDDD.',
    '....DD..',
    '...DD...',
    '..aa....',
    '.aa.....',
  ],
  // protein: en köttbit
  n_protein: [
    '........',
    '..AAa...',
    '.AaaaAa.',
    'AaaAaaaa',
    'aaaaaaaD',
    '.aaaaaDD',
    '..aDDD..',
    '........',
  ],
  // brist på protein: samma form som en tom kontur, fylld bara i botten
  b_protein: [
    '........',
    '..DDD...',
    '.D...DD.',
    'D......D',
    'D......D',
    '.aaaaaaa',
    '..aaaa..',
    '........',
  ],
  // fett: en droppe
  n_fett: [
    '...A....',
    '..AAa...',
    '..Aaa...',
    '.AAaaa..',
    '.Aaaaaa.',
    '.aaaaaD.',
    '..aaDD..',
    '...DD...',
  ],
  // brist på fett: samma form som en tom kontur, fylld bara i botten
  b_fett: [
    '...D....',
    '..D.D...',
    '..D.D...',
    '.D...D..',
    '.D....D.',
    '.D....D.',
    '..aaaa..',
    '...aa...',
  ],
  // vitamin: ett bär
  n_vitamin: [
    '.....gG.',
    '....gG..',
    '..aaga..',
    '.aAAaaa.',
    '.aAaaaaD',
    '.aaaaaaD',
    '..aaaaD.',
    '...DDD..',
  ],
  // brist på vitamin: samma form som en tom kontur, fylld bara i botten
  b_vitamin: [
    '.....DD.',
    '....DD..',
    '..DDDD..',
    '.D..D.D.',
    '.D.....D',
    '.D.....D',
    '..aaaaa.',
    '...aaa..',
  ],
  // mineral: en kristall
  n_mineral: [
    '........',
    '..AAaa..',
    '.AAAaaa.',
    'AAAAaaaD',
    '.aaaaDD.',
    '..aaDD..',
    '...aD...',
    '........',
  ],
  // brist på mineral: samma form som en tom kontur, fylld bara i botten
  b_mineral: [
    '........',
    '..DDDD..',
    '.D....D.',
    'D......D',
    '.D....D.',
    '..aaaa..',
    '...aa...',
    '........',
  ],
  // björnens klor och vargens bett där slaget träffar (steg 9.2.31, platshållare tills Björn valt i bildstilen)
  an_klo: ['w.......', '.w.w....', '..w.w.w.', '.r.w.w..', '..r.r.w.', '...r.r..', '....r...', '........'],
  an_bett: ['.w.w.w..', 'wkwkwkw.', '........', '........', 'wkwkwkw.', '.w.w.w..', '..r.r...', '........'],
  // den svarta stubben efter en brand (steg 9.2.26): svart ända upp, lite ljusare kol mot ljuset (Björns val, steg 10.11.1)
  kolstubbe: ['..KKk...', '.KkkkK..', '.Kkkkk..', '.Kkkkk..', 'Kkkkkkk.', '.kkkkk..'],
  // facklan på väggen (steg 9.2.11, platshållare tills Björn valt i bildstilen): släckt och tänd
  // den uppsatta facklan på marken (steg 9.2.98, platshållare tills Björn sagt ja i bildstilen): 13 punkter hög, en vuxen är ungefär 19
  uppsatt_mark: ['...yY...', '...YY...', '...Jj...', '...jJ...', '...Jj...', '...jJ...', '...Jj...', '...jJ...', '...Jj...', '..kjJk..', '.kKKKKk.'],
  uppsatt_mark_tand: ['...w....', '..gwg...', '..ogo...', '.rgogr..', '..ryY...', '...YY...', '...Jj...', '...jJ...', '...Jj...', '...jJ...', '...Jj...', '...jJ...', '...Jj...', '..kjJk..', '.kKKKKk.'],
  // samtalens ämnen i 8 punkter (steg 9.2.10, platshållare tills Björn valt i bildstilen)
  amne_gral: ['........', '.r...r..', 'rrr.rrr.', '.r...r..', '........', '.r...r..', '........', '........'],
  // krönikans kategorier (steg 9.2.73) och omröstningens ja, nej och den som lade fram frågan (steg 9.2.65): platshållare tills Björn valt i bildstilen
};
// stationerna och möblerna som blir oläsliga förminskade (steg 12.1.72) behåller sin handritade symbol i listorna
PIX.grill = [
    'w.w.w.w.',
    'OLLOLLLL',
    '.w...w.L',
    '.W...W.q',
    '.w.f.w..',
    '.wfFfw..',
    '.WFfFW..',
    '.wgGgw..',
  ];
PAL.grill = { w: '#5e3c24', O: '#a0947d', L: '#987e62', W: '#7d5b40', q: '#5e3c24', f: '#bd753e', F: '#d8b25f', g: '#987e62', G: '#3e5156' };
PIX.tork = [
    'w.w..w.w',
    'OLOLLOLO',
    '.wMmMmw.',
    'w.mMmM.w',
    'w.MmMc.w',
    'w.wM.m.w',
    'w.wm.w.w',
    'W.W..W.W',
  ];
PAL.tork = { w: '#5e3c24', O: '#a0947d', L: '#987e62', M: '#bd753e', m: '#742a01', c: '#3f2415', W: '#7d5b40' };
PIX.slaktbank = [
    '........',
    '........',
    'BBBrBBBB',
    'bbbbbbbb',
    '.d....d.',
    '.d....d.',
    '.d....d.',
    '.d....d.',
  ];
PAL.slaktbank = { b: '#694902', B: '#987e62', d: '#372f25', r: '#742a01' };
PIX.stall = [
    '..G..g..',
    '.gGg.g..',
    'WWGWWgWW',
    '..L..L..',
    '..L..L..',
    'WWLWWLWW',
    '..L..L..',
    '.w....w.',
  ];
PAL.stall = { w: '#5e3c24', W: '#7d5b40', L: '#987e62', g: '#7e7362', G: '#8a9c9e' };
PIX.hylla = [
    'W......W',
    'WyyrgryW',
    'WLLLLLLW',
    'WgyyrygW',
    'WLLLLLLW',
    'WryygyrW',
    'WLLLLLLW',
    'w......w',
  ];
PAL.hylla = { w: '#5e3c24', W: '#7d5b40', L: '#987e62', y: '#b2921b', g: '#7e7362', r: '#a0947d' };
PIX.timmervagg = [
    'eBbbbbBe',
    'dddddddd',
    'eBbbbbBe',
    'dddddddd',
    'eBbbbbBe',
    'dddddddd',
    'eBbbbbBe',
    'dddddddd',
  ];
PAL.timmervagg = { d: '#372f25', b: '#7d5b40', B: '#987e62', e: '#bdb39b' };
// listornas symboler följer kartans bild (steg 12.1.72): en sak utan egen symbol får sin godkända kartbild (kartbilder.ts) som
// symbol, mitt i rutan på 16 × 16 punkter, förminskad om den är större än rutan och dubbelt så stor om den ryms. På kartan ritas
// bilden i sin naturliga storlek (kb_<id>). Regeln går före raderna som lånar en annan saks bild (slaktfåret = rådjuret)
export function iRutan(b: { w: number; h: number; rader: readonly string[] }) {
  const w = 16, f = 2 * b.w <= w && 2 * b.h <= w ? 2 : Math.min(1, w / Math.max(b.w, b.h)), x0 = (w - f * b.w) / 2, y0 = (w - f * b.h) / 2;
  return Array.from({ length: w }, (_, y) => Array.from({ length: w }, (_, x) => { const yy = Math.floor((y - y0) / f), xx = Math.floor((x - x0) / f); return yy >= 0 && xx >= 0 ? b.rader[yy]?.[xx] ?? '.' : '.'; }).join(''));
}
for (const [id, b] of Object.entries(KARTBILDER)) if (!PIX[id] && !id.startsWith('sym_')) { PIX[id] = iRutan(b); PAL[id] = b.pal; } // symbolerna (sym_) ritas av ui/symboler.ts

// det som kan vridas har en egen bild för varje håll (steg 3.10.7, regeln Det som kan vridas): _v är bilden när det står
// vridet (bredd och djup byter plats), med samma färger som den liggande
// kläderna (steg 3.10.12): varje plagg har en grundbild och varje material en palett, och varje plagg av ett material
// (KLADER_AV i klader.ts) ritas med plaggets bild i materialets färger. Rocken, skorna och bältet är de Björn valde efter
// v89 (av kaninskinn och rep); rocken och skorna i 16 × 16 punkter står längre ner (Björns val efter v245)
const PLAGG_BILD: Record<string, string[]> = {
  // en rock med pälskrage och fransar
  rock: ['..dwwd..', '.dwWWwd.', '.dBbbBd.', 'dBBbBBBd', 'dBbBBbBd', 'BBBbBBbB', 'bBbBBbBb', 'd.d.d.d.'],
  // två skor med pälskant, den ena bakom den andra
  skor: ['........', '...ww...', '...dBs..', '...dBBBd', 'ww.ddddd', 'dBs.....', 'dBBBBd..', 'dddddd..'],
  // ett flätat rep i en ring med en knut
  balte: ['..eYeY..', '.Ye..eY.', 'Ye....eY', 'y......y', 'Ye....eY', '.eYeYey.', '...dd...', '...y.y..'],
};
const MATERIAL_FARG: Record<string, Record<string, string>> = {
  kaninskinn: { d: '#5e3c24', w: '#bdb39b', W: '#dad0bb', B: '#987e62', b: '#7d5b40', s: '#dad0bb' },
  vargskinn: { d: '#474138', w: '#bdb39b', W: '#dad0bb', B: '#987e62', b: '#7d5b40', s: '#dad0bb' },
  rep: { e: '#7d5b40', Y: '#bdb39b', y: '#a0947d', d: '#5e3c24' },
};
for (const { k, plagg, mat } of KLADER_AV) if (PLAGG_BILD[plagg] && !KARTBILDER[k]) { // det som har en kartbild har den som symbol (iRutan)
  PIX[k] = PLAGG_BILD[plagg]; PAL[k] = MATERIAL_FARG[mat]; }
// tekniken Bälte har bältets bild
PIX.balte = PIX.balte_rep; PAL.balte = PAL.balte_rep;
// Björns val efter v193 (steg 3.10.13): den fångade kaninen på kartan ser ut som viltet i förrådet
PIX.kanin_dod = KARTBILDER.vilt.rader; PAL.kanin_dod = KARTBILDER.vilt.pal; // i viltets naturliga storlek, som kartan ritar
// pyntet (steg 4.3.4): samma bild på kartan och i listorna, och lerkrukan för intrycket smakfull
for (const k of ['kruka', 'skrivpulpet', 'bokhylla']) { PIX[k + '_karta'] = PIX[k]; PAL[k + '_karta'] = PAL[k]; } // skrivpulpeten och bokhyllan (steg 10.6.11, 10.6.16): platshållarna på kartan
// bänken och krubban vridna ett kvarts varv (platshållare tills de stående bilderna är ritade, steg 10.2.68 och 10.2.88)
for (const k of ['bank', 'krubba', 'altare']) { const r = PIX[k]; PIX[k + '_karta_v'] = Array.from({ length: r[0].length }, (_, x) => Array.from({ length: r.length }, (_, y) => r[r.length - 1 - y][x]).join('')); PAL[k + '_karta_v'] = PAL[k]; }

// den vilda rovan har samma symbol som rovan (Björn efter v245, steg 4.5.2)
PIX.vildrova = PIX.rovor; PAL.vildrova = PAL.rovor;
PIX.i_smakfull = PIX.kruka; PAL.i_smakfull = PAL.kruka;

PIX.snickarbank_karta_v = PIX.flatarbank_karta_v; PAL.snickarbank_karta_v = PAL.flatarbank_karta; // stående snickarbänk: slöjdbänkens stående bild tills bildstilen har en stående (Björns snickarbänk ligger, steg 11.14.1)

PIX.orte = PIX.kruka; PAL.orte = PAL.kruka;
PAL.s_bistick = { o: '#24201d', y: '#d8b25f', k: '#24201d', r: '#a14808', R: '#bd753e' }; // platshållare för bisticket i hälsofliken (steg 10.10.22): ett litet bi och en röd svullnad
PIX.s_bistick = [
  '................',
  '................',
  '....oo..........',
  '...oyko.........',
  '...okyo.........',
  '....ooo.........',
  '......o.........',
  '.......o........',
  '........RRRR....',
  '.......RRrrRR...',
  '.......RrrrrR...',
  '.......RRrrRR...',
  '........RRRR....',
  '................',
  '................',
  '................',
];
PIX.s_spala = PIX.grenar ?? PIX.s_forb; PAL.s_spala = PAL.grenar ?? PAL.s_forb; // platshållare för spjälan (steg 9.5.28) tills Björn valt i bildstilen
PIX.nal = PIX.bensyl; PAL.nal = PAL.bensyl; // nålen är bensylen som redan finns (Björns val, steg 10.11.1); remsan har sin egen bild
for (const k of ['protes']) { PIX[k] = PIX.slagtra ?? PIX.benspade; PAL[k] = PAL.slagtra ?? PAL.benspade; } // platshållare för proteserna (steg 9.5.11) tills Björn valt i bildstilen
PIX.lakesalva = PIX.salva ?? PIX.kruka; PAL.lakesalva = PAL.salva ?? PAL.kruka; // läkesalvans teknik (steg 9.5.10): salvans bild // platshållare för örtteets teknik (steg 9.5.8) tills Björn valt i bildstilen // platshållare för näveraskan (steg 9.4.13) tills Björn valt i bildstilen // platshållare för snickarbänkens teknik (steg 9.4.4) tills Björn valt i bildstilen
PIX.hage = PIX.odling; PAL.hage = PAL.odling; // platshållare för hagen (steg 9.8.4)
PIX.sadesodling = PIX.artfron; PAL.sadesodling = PAL.artfron; // platshållare för kornet (steg 9.6.11) tills Björn valt i bildstilen
PIX.bryggkar = PIX.lerkruka_stor ?? PIX.kruka; PAL.bryggkar = PAL.lerkruka_stor ?? PAL.kruka;  // platshållare för bryggkaret och vinets teknik (steg 9.6.12) tills Björn valt i bildstilen
PIX.ol = PIX.lerkruka_stor ?? PIX.kruka; PAL.ol = PAL.lerkruka_stor ?? PAL.kruka; // platshållare för maltet och ölets teknik (steg 9.6.13) tills Björn valt i bildstilen
// platshållare för nätet (steg 9.6.16) tills Björn valt i bildstilen

for (const k of ['braxkott', 'sikkott']) { PIX[k] = PIX.gaddkott ?? PIX.fisk; PAL[k] = PAL.gaddkott ?? PAL.fisk; } // platshållare för braxens och sikens kött (steg 9.6.17) tills Björn valt i bildstilen
PIX.salt = PIX.sten ?? PIX.flinta; PAL.salt = PAL.sten ?? PAL.flinta; PIX.saltfisk = PIX.torrfisk; PAL.saltfisk = PAL.torrfisk; PIX.saltkott = PIX.torrkott; PAL.saltkott = PAL.torrkott; // platshållare för saltet (steg 9.6.19) tills Björn valt i bildstilen
PIX.vildlok = PIX.vildrova ?? PIX.rotter; PAL.vildlok = PAL.vildrova ?? PAL.rotter; // platshållare för löken (steg 9.6.20) tills Björn valt i bildstilen
// platshållare för stekhällen (steg 9.6.21) tills Björn valt i bildstilen
PIX.mjol = PIX.artfron; PAL.mjol = PAL.artfron; // platshållare för kvarnstenen och mjölet (steg 9.6.22) tills Björn valt i bildstilen
// platshållare för bakugnen och brödet (steg 9.6.23) tills Björn valt i bildstilen
// platshållare för byggstenen (steg 10.10.5) tills Björn valt i bildstilen
// platshållare för den stenlagda vägen (steg 10.10.6) tills Björn valt i bildstilen
PIX.stenvagg = PIX.huggen_sten ?? PIX.sten; PAL.stenvagg = PAL.huggen_sten ?? PAL.sten; // platshållare för stenväggen (steg 10.10.7) tills Björn valt i bildstilen
PIX.kokgrop = PIX.sten; PAL.kokgrop = PAL.sten; // platshållare för kokgropen (steg 10.7.28) tills Björn valt i bildstilen
PIX.sprit = PIX.lerkruka_liten ?? PIX.kruka; PAL.sprit = PAL.lerkruka_liten ?? PAL.kruka; PIX.mjod = PIX.honung; PAL.mjod = PAL.honung; // teknikerna Sprit och Mjöd (steg 10.7.25–10.7.26), platshållare
PIX.brannpanna = PIX.ortkok ?? PIX.sten; PAL.brannpanna = PAL.ortkok ?? PAL.sten; // platshållare för brännpannan (steg 10.7.26) tills Björn valt i bildstilen
// platshållare för resterna (steg 9.7.5) tills Björn valt i bildstilen
PIX.bikupa_karta = PIX.bikupa; PAL.bikupa_karta = PAL.bikupa; // platshållare för bikupan på kartan (steg 10.10.16)
PIX.vagnsvrak_karta = PIX.vagnsvrak; PAL.vagnsvrak_karta = PAL.vagnsvrak; // platshållare för vagnen på kartan (steg 11.6.13)
PIX.vattenho_karta = PIX.vattenho; PAL.vattenho_karta = PAL.vattenho; // platshållare för vattenhon på kartan (steg 10.10.30)
PIX.kompost = PIX.latrin ?? PIX.ved; PAL.kompost = PAL.latrin ?? PAL.ved; // platshållare för komposten (steg 9.7.6) tills Björn valt i bildstilen
PIX.kalfron = PIX.artfron; PAL.kalfron = PAL.artfron; // platshållare för kålen och bönorna (steg 9.7.8) tills Björn valt i bildstilen
PIX.jordgubbsplanta = PIX.bar; PAL.jordgubbsplanta = PAL.bar; // platshållare för jordgubbarna (steg 9.7.9) tills Björn valt i bildstilen
PIX.staket = PIX.grenar; PAL.staket = PAL.grenar; // platshållare för staketets teknik (steg 9.7.10) tills Björn valt i bildstilen
PIX.appelplanta = PIX.grenar; PAL.appelplanta = PAL.grenar; PIX.notter = PIX.rotter; PAL.notter = PAL.rotter; // platshållare för äppelträdet och hasseln (steg 9.7.13–9.7.14) tills Björn valt i bildstilen
PIX.rokfisk = PIX.torrfisk; PAL.rokfisk = PAL.torrfisk; PIX.rokkott = PIX.torrkott; PAL.rokkott = PAL.torrkott; // platshållare för rökeriet och det rökta (steg 9.6.8) tills Björn valt i bildstilen
for (const k of RATT_SAKER) { const h = rattInfo(k)!.huvud, f = ({ kott: 'grillkott', fisk: 'grillfisk', rot: 'rotter', svamp: 'svamp', bar: 'bar', sad: 'artfron' } as Record<string, string>)[h]; const sym = KARTBILDER['sym_' + rattInfo(k)!.kat]; PIX[k] = sym ? sym.rader : PIX[f]; PAL[k] = sym ? sym.pal : PAL[f]; } // rätterna (steg 9.6.3): gruppens symbol ur Björns val (soppa, gröt och gryta, steg 10.11.1), annars en platshållare efter huvudingrediensen
// kunskaperna i pratbubblan (steg 9.9.3): platshållare ur befintliga symboler tills de ritats
for (const [k, f] of [['motvind', 'vader_blast'], ['renahander', 'a_vatten'], ['fukt', 'vader_regn'], ['smitta', 's_dod']] as const) if (PIX[f]) { PIX[k] = PIX[f]; PAL[k] = PAL[f]; }
for (const k of ['lerkruka_liten', 'lerkruka_mellan', 'lerkruka_stor', 'lerkruka_hog']) { if (k.endsWith('hog')) { PAL[k] = PAL.kruka; continue; } PIX[k] = PIX.kruka; PAL[k] = PAL.kruka; } // platshållare för lerkrukans tre storlekar (steg 9.4.11) tills Björn valt i bildstilen // intrycket smakfull (steg 4.3.4): lerkrukan Björn valde
// Björns val efter v245 (steg 4.5.2): rocken (version 2) och skorna (version 1) i 16 × 16 punkter, samma form för kaninskinn och
// vargskinn i materialets färger, och bybornas filt (version 1; handlaren har kvar den förra)
const ROCK16 = [
  '.....oWWWWo.....',
  '...ooWWHHWWoo...',
  '..oWWHo..oHWWo..',
  '.oGGWo....oWGGo.',
  '.oGHGGo..oGGHGo.',
  'oGHHGGGooGGGHHGo',
  'oGHGGgGGGGgGGHGo',
  'oGHGoGGgGGGoGHGo',
  'oGGGoGGgGGGoGGGo',
  'oWWoGGGgGGGGoWWo',
  '.oooGHGgGGHGooo.',
  '...oGHGgGGHGo...',
  '...oGGGgGGGGo...',
  '...oGgGgGgGgo...',
  '...oGoGoGoGoo...',
  '...o.o.o.o.o....',
], SKOR16 = [
  '................',
  '................',
  '........oooo....',
  '.......oWWWWo...',
  '.......oGHGGo...',
  '.......oGHGGGoo.',
  '.......oGGHGGGHo',
  '.......odddddddo',
  '..oooo..ooooooo.',
  '.oWWWWo.........',
  '.oGHGGo.........',
  '.oGHGGGoo.......',
  '.oGGHGGGHoo.....',
  '.oGGGHGGGGHo....',
  '.oddddddddddo...',
  '..oooooooooo....',
];
PIX.rock_kaninskinn = ROCK16; PAL.rock_kaninskinn = { o: '#24201d', G: '#7d5b40', H: '#987e62', g: '#5e3c24', W: '#dad0bb' };
PIX.rock_vargskinn = ROCK16; PAL.rock_vargskinn = { o: '#24201d', G: '#61767a', H: '#8a9c9e', g: '#3e5156', W: '#dad0bb' };
PIX.skor_kaninskinn = SKOR16; PAL.skor_kaninskinn = { o: '#24201d', G: '#7d5b40', H: '#987e62', d: '#3f2415', W: '#dad0bb' };
PIX.skor_vargskinn = SKOR16; PAL.skor_vargskinn = { o: '#24201d', G: '#61767a', H: '#8a9c9e', d: '#233035', W: '#dad0bb' };
PIX.rock_bjornskinn = ROCK16; PAL.rock_bjornskinn = { o: '#24201d', G: '#5e3c24', H: '#7d5b40', g: '#3f2415', W: '#dad0bb' }; // steg 6.6.6: i björnens färger
PIX.skor_bjornskinn = SKOR16; PAL.skor_bjornskinn = { o: '#24201d', G: '#5e3c24', H: '#7d5b40', d: '#3f2415', W: '#dad0bb' };
PIX.rock_farskinn = ROCK16; PAL.rock_farskinn = { o: '#24201d', G: '#bdb39b', H: '#dad0bb', g: '#987e62', W: '#dad0bb' }; PIX.skor_farskinn = SKOR16; PAL.skor_farskinn = { o: '#24201d', G: '#bdb39b', H: '#dad0bb', d: '#987e62', W: '#dad0bb' }; // platshållare (steg 10.3.14)
PIX.rock_vitskinn = ROCK16; PAL.rock_vitskinn = { o: '#7e7362', G: '#bdb39b', H: '#dad0bb', g: '#a0947d', W: '#dad0bb' }; PIX.skor_vitskinn = SKOR16; PAL.skor_vitskinn = { o: '#7e7362', G: '#bdb39b', H: '#dad0bb', d: '#a0947d', W: '#dad0bb' }; // harens vinterpäls (steg 10.7.22), platshållare
PIX.rock_svinskinn = ROCK16; PAL.rock_svinskinn = { o: '#24201d', G: '#474138', H: '#61767a', g: '#24201d', W: '#dad0bb' }; PIX.skor_svinskinn = SKOR16; PAL.skor_svinskinn = { o: '#24201d', G: '#474138', H: '#61767a', d: '#24201d', W: '#dad0bb' }; // platshållare (steg 10.10.4)
PIX.rock_kohud = ROCK16; PAL.rock_kohud = { o: '#24201d', G: '#5e3c24', H: '#987e62', g: '#24201d', W: '#dad0bb' }; PIX.skor_kohud = SKOR16; PAL.skor_kohud = { o: '#24201d', G: '#5e3c24', H: '#987e62', d: '#24201d', W: '#dad0bb' }; // platshållare (steg 10.10.1)
PIX.rock_getskinn = ROCK16; PAL.rock_getskinn = { o: '#24201d', G: '#987e62', H: '#bdb39b', g: '#7d5b40', W: '#dad0bb' }; PIX.skor_getskinn = SKOR16; PAL.skor_getskinn = { o: '#24201d', G: '#987e62', H: '#bdb39b', d: '#7d5b40', W: '#dad0bb' };
PIX.rock_radjursskinn = ROCK16; PAL.rock_radjursskinn = { o: '#24201d', G: '#987e62', H: '#bdb39b', g: '#5e3c24', W: '#dad0bb' }; PIX.skor_radjursskinn = SKOR16; PAL.skor_radjursskinn = { o: '#24201d', G: '#987e62', H: '#bdb39b', d: '#5e3c24', W: '#dad0bb' }; // platshållare: rådjurets rödbruna skinn
// steg 7.1.2: axelremmen, en platshållare (en rem snett över bröstet från axeln till höften, med en knut av rep) tills Björn
// valt bland versionerna i bildstilen (steg 7.1.4)
const AXELREM16 = [
  '................',
  '..oo............',
  '.oGHo...........',
  '.oGHGo..........',
  '..oGHGo.........',
  '...oGHGo........',
  '....oGHGo.......',
  '.....oGHGo......',
  '......oGHGo.....',
  '.......oGHGo....',
  '........oGHGo...',
  '.........oyYyo..',
  '.........oYdYo..',
  '..........oyYGo.',
  '...........oGHo.',
  '............oo..',
];
for (const [m, G, H] of [['kaninskinn', '#7d5b40', '#987e62'], ['vargskinn', '#61767a', '#8a9c9e'], ['bjornskinn', '#5e3c24', '#7d5b40'], ['farskinn', '#bdb39b', '#dad0bb'], ['getskinn', '#987e62', '#bdb39b'], ['kohud', '#5e3c24', '#987e62'], ['radjursskinn', '#987e62', '#bdb39b'], ['svinskinn', '#474138', '#61767a'], ['vitskinn', '#bdb39b', '#dad0bb']]) {
  PIX['axelrem_' + m] = AXELREM16; PAL['axelrem_' + m] = { o: '#24201d', G, H, y: '#a0947d', Y: '#bdb39b', d: '#5e3c24' };
}
PIX.axelrem = PIX.axelrem_kaninskinn; PAL.axelrem = PAL.axelrem_kaninskinn; // tekniken har remmens bild
// steg 7.1.3: ryggsäcken, en platshållare (en säck av skinn med en flik överst, två remmar av rep och en knut) tills Björn
// valt bland versionerna i bildstilen (steg 7.1.4)
const RYGGSACK16 = [
  '................',
  '.....oooooo.....',
  '....oyHHHHyo....',
  '...oyoooooooy...',
  '...oyoHHHHoyo...',
  '..oGoHGGGGHoGo..',
  '..oGooooooooGo..',
  '..oGHGGGGGGHGo..',
  '..oGHGGddGGHGo..',
  '..oGHGGddGGHGo..',
  '..oGHGGGGGGHGo..',
  '..oGHGGGGGGHGo..',
  '..oGHHHHHHHHGo..',
  '..oGGGGGGGGGGo..',
  '...oooooooooo...',
  '................',
];
for (const [m, G, H] of [['kaninskinn', '#7d5b40', '#987e62'], ['vargskinn', '#61767a', '#8a9c9e'], ['bjornskinn', '#5e3c24', '#7d5b40'], ['farskinn', '#bdb39b', '#dad0bb'], ['getskinn', '#987e62', '#bdb39b'], ['kohud', '#5e3c24', '#987e62'], ['radjursskinn', '#987e62', '#bdb39b'], ['svinskinn', '#474138', '#61767a'], ['vitskinn', '#bdb39b', '#dad0bb']]) {
  if (!KARTBILDER['ryggsack_' + m]) { PIX['ryggsack_' + m] = RYGGSACK16; PAL['ryggsack_' + m] = { o: '#24201d', G, H, y: '#a0947d', d: '#5e3c24' }; } // med en kartbild: den (iRutan)
}
PIX.ryggsack = PIX.ryggsack_kaninskinn; PAL.ryggsack = PAL.ryggsack_kaninskinn; // tekniken har säckens bild
PIX.filt_by = [
  '................',
  '................',
  '..y.y.y.y.y.y.y.',
  '.oooooooooooooo.',
  '.oRRRRRRRRRRRRo.',
  '.oSyySyySyySyyo.',
  '.orrrrrrrrrrrro.',
  '.oRRRRRRRRRRRRo.',
  '.orrrrrrrrrrrro.',
  '.oSyySyySyySyyo.',
  '.oRRRRRRRRRRRRo.',
  '.oooooooooooooo.',
  '..y.y.y.y.y.y.y.',
  '................',
  '................',
  '................',
];
PAL.filt_by = { o: '#24201d', r: '#521100', R: '#742a01', S: '#b2921b', y: '#d8b25f' };
// den torra sjöbotten (Björn valde version 1 och 3 efter v245, steg 4.5.2): rutorna blandas så att det inte blir för
// repetitivt (terrang.ts): oftast sprickorna, ibland den fuktiga fläcken, och vända åt olika håll
PIX.lera_spricka = [
  'JJJjJJJJkJJJJjJJ',
  'JJjJJJJkJJJjJJJJ',
  'kkJJJJkJJJJJJJkk',
  'JJkkJkJJJJJJkkJJ',
  'JJJJkJJJJJJkJJJJ',
  'JJJJkJJJJkkJJJJJ',
  'JJJkJkkkkJJJJJJJ',
  'JJkJJJJJkJJJJJJJ',
  'JkJJJJJJJkJJJJJJ',
  'kJJJJJJJJkkJJJkk',
  'JJJJJJJJkJJkkkJJ',
  'JJJJJJJkJJJJJkJJ',
  'JJJJJkkJJJJJJJkJ',
  'JJJJkJJJJJJJJJJk',
  'JJJkJJJJJJJJJJJJ',
  'JJkJJJJJJJJJJJJJ',
];
PAL.lera_spricka = { j: '#5e3c24', J: '#7d5b40', k: '#3f2415' };
PIX.lera_fukt = [
  'JJJJJJJJJJJJJJJJ',
  'JJJJJJJJJJJjJJJJ',
  'JJJjJJJJJJJJJJJJ',
  'JJJJJJJJjJJJJJJJ',
  'JJJJJJjjjjjJJJJJ',
  'JJJJjjjvvvjjjJJJ',
  'JJJjjvvVVvvvjJJJ',
  'JJJjjvVVVVvjjJJJ',
  'JJJJjjvvvvjjJJJJ',
  'JJJJJjjjjjjJJJJJ',
  'JJJJJJJJJJJJJjJJ',
  'JjJJJJJJJJJJJJJJ',
  'JJJJJJJJJjJJJJJJ',
  'JJJJJJJJJJJJJJJJ',
  'JJJJjJJJJJJJJJJJ',
  'JJJJJJJJJJJJJJJJ',
];
PAL.lera_fukt = { j: '#5e3c24', J: '#7d5b40', v: '#61767a', V: '#8a9c9e' };
for (const k in PIX) if (k.endsWith('_v')) PAL[k] ??= PAL[k.slice(0, -2)];

// bildstilens godkända bilder (kartbilder.ts, steg 5.2.4) som PIX och PAL med id:t kb_<id>. kartbild(k) ger id:t för sakens
// kartbild, som ritas i sin naturliga storlek, aldrig förstorad eller förminskad (steg 5.1.2.1)
for (const [id, b] of Object.entries(KARTBILDER)) { PIX['kb_' + id] = b.rader; PAL['kb_' + id] = b.pal; }
// vaxljuset (steg 10.10.24, platshållare): talgljusets bilder med det gula vaxet i stället för den vita talgen
{ const VAX: Record<string, string> = { '#dad0bb': '#d8b25f', '#bdb39b': '#b2921b', '#a0947d': '#906f0f' };
  const gul = (p: Record<string, string>) => Object.fromEntries(Object.entries(p).map(([c, f]) => [c, VAX[f] ?? f]));
  for (const v of ['1', '2', '1_tand', '2_tand']) if (KARTBILDER['talgljus' + v]) { PIX['kb_vaxljus' + v] = KARTBILDER['talgljus' + v].rader; PAL['kb_vaxljus' + v] = gul(KARTBILDER['talgljus' + v].pal); }
  PIX.vaxljus = KARTBILDER.talgljus.rader; PAL.vaxljus = gul(KARTBILDER.talgljus.pal); }
// lågorna där det brinner och tornadon (Björns val i bildstilen, steg 5.1.2.2) heter som förut, så att knappen i testläget hittar dem
// animationernas bilder (steg 5.1.9, animbilder.ts) med id:t an_<id>; ui/animation.ts väljer bild efter klockan
for (const [id, b] of Object.entries(ANIMBILDER)) { PIX['an_' + id] = b.rader; PAL['an_' + id] = b.pal; }
// stubbarna och de fällda träden (steg 6.8.16, stubbilder.ts) med id:t sb_<id>; ui/foremal.ts väljer bild efter trädet och tiden
for (const [id, b] of Object.entries(STUBBILDER)) { PIX['sb_' + id] = b.rader; PAL['sb_' + id] = b.pal; }
for (const k of ['brand', 'tornado']) { PIX[k] = KARTBILDER[k].rader; PAL[k] = KARTBILDER[k].pal; }
// platshållare tills bilderna byggs in (steg 7.8.1)
// huset på filten vid ett husbyte (steg 7.2.12): platshållare tills Björn valt (f7_hus i bildstilen)
PIX.hus = ['................', '.......aa.......', '......abca......', '.....abccba.....', '...aabccbccaa...', '..acbccbccbcca..', '.acbccbccbccbca.', 'acbccbccbccbccba', '.abbbbbbbbbbbba.', '.adddddddddddda.', '.abbeeebbaaabba.', '.addeeeddaaadda.', '.abbeeebbaaabba.', '.adddddddaaadda.', '.abbbbbbbaaabba.', '..aaaaaaaaaaaa..']; // Björns val: stugan med tak av trä, en glugg och en dörr (steg 8.10.1)
PAL.hus = { a: '#24201d', b: '#7d5b40', c: '#987e62', d: '#5e3c24', e: '#2f261d' };
PIX.rustning = PIX.ledarskap; PAL.rustning = PAL.ledarskap; PIX.lag = PIX.ledarskap; PAL.lag = PAL.ledarskap; PIX.i_arrig = PIX.i_stark; PAL.i_arrig = PAL.i_stark; // platshållare
PIX.lon = PIX.silver; PAL.lon = PAL.silver; PIX.i_tigger = PIX.i_fattig; PAL.i_tigger = PAL.i_fattig; // platshållare (steg 10.5.9 och 10.5.11): lönen som silvret, tiggaren som den fattige
for (const k of ['slunga', 'horn']) { PIX[k] = PIX.benspade; PAL[k] = PAL.benspade; } // platshållare (system 8.7)
for (const pl of ['rustning', 'hjalm', 'prastdrakt', 'tecken', 'mask', 'mantel', 'byxor', 'mossa', 'snoskor', 'tunika', 'skjorta', 'kappa', 'sjal', 'halsband']) for (const m of ['kaninskinn', 'vargskinn', 'bjornskinn', 'farskinn', 'getskinn', 'radjursskinn', 'kohud', 'svinskinn', 'lader', 'lintyg', 'ylle', 'benband', 'tandband', 'fjaderband']) if (!KARTBILDER[`${pl}_${m}`]) { PIX[`${pl}_${m}`] = PIX.rock_kaninskinn; PAL[`${pl}_${m}`] = PAL.rock_kaninskinn; }
for (const pl of ['prastdrakt', 'mask', 'mantel', 'byxor', 'mossa', 'snoskor']) { PIX[`${pl}_vitskinn`] = PIX.rock_vitskinn; PAL[`${pl}_vitskinn`] = PAL.rock_vitskinn; } // de andra skinnplaggen av vitt harskinn i vitt (steg 10.7.22), platshållare
for (const m of ['lader', 'lintyg', 'ylle']) for (const pl of ['rock', 'skor']) if (!PIX[`${pl}_${m}`]) { PIX[`${pl}_${m}`] = PIX.rock_kaninskinn; PAL[`${pl}_${m}`] = PAL.rock_kaninskinn; }
for (const k of ['grillgadda', 'grillmort']) { PIX[k] = PIX.grillfisk; PAL[k] = PAL.grillfisk; }
for (const k of ['torrgadda', 'torrmort']) { PIX[k] = PIX.torrfisk; PAL[k] = PAL.torrfisk; }
for (const st of ['fangstbank', 'stenhuggarplats', 'klyvplats', 'ortkok', 'garvning', 'harden', 'vavstol']) for (const k of [st, st + '_karta', st + '_karta_v']) if (k !== st || !KARTBILDER[st]) { PIX[k] = PIX.korg; PAL[k] = PAL.korg; } // en station med kartbild har den som symbol (iRutan)
for (const k of ['rokelse', 'brannolja', 'vittja', 'snara', 'bur', 'grop', 'leksak', 'salva', 'lin', 'ratlin', 'lovkarve']) { PIX[k] = PIX.korg; PAL[k] = PAL.korg; }
// den målade skölden (steg 10.7.1, platshållare): skölden med en målad figur mitt på
{ const b = PIX.skold, mx = 8, my = 8; PIX.skold_malad = b.map((rad, y) => [...rad].map((c, x) => c !== '.' && Math.abs(x - mx + 0.5) <= 1.5 && Math.abs(y - my + 0.5) <= 2.5 && ((x + y) % 2 === 0 || y === my - 2) ? 'Ä' : c).join('')); PAL.skold_malad = { ...PAL.skold, 'Ä': '#a14808' }; }
for (const [m, c, d, f] of [['vargskinn', '#8a9c9e', '#61767a', '#3e5156'], ['bjornskinn', '#987e62', '#7d5b40', '#5e3c24']]) { PIX['ryggsack_' + m] = PIX.ryggsack_kaninskinn; PAL['ryggsack_' + m] = { ...PAL.ryggsack_kaninskinn, c, d, f }; } // Björns ryggsäck i vargens och björnens skinn
PIX.ryggsack = PIX.ryggsack_kaninskinn; PAL.ryggsack = PAL.ryggsack_kaninskinn;
for (const [m, b, c, d] of [['kaninskinn', '#a0947d', '#7e7362', '#bdb39b'], ['vargskinn', '#61767a', '#3e5156', '#8a9c9e'], ['bjornskinn', '#5e3c24', '#3f2415', '#7d5b40']]) { PIX['byxor_' + m] = PIX.byxor_lader; PAL['byxor_' + m] = { ...PAL.byxor_lader, b, c, d }; } // Björns enfärgade byxor (steg 8.10.1) i skinnens färger
// Björns val i bildstilen (steg 9.9.1): samtalens ämnen i 8 punkter (de som han sagt ja till; gräl och maten har kvar sina bilder), krönikans
// kategorier och omröstningens ja, nej och den som lade fram frågan i 16 punkter, med egna paletter
PIX.amne_arbete = ['XkkkkXXX', 'XkkkkXXX', 'XXXtXXXX', 'XXXtXXXX', 'XXXtXXXX', 'XXXtXXXX', 'XXXtXXXX', 'XXXXXXXX']; PAL.amne_arbete = {X: '#dad0bb',k: '#24201d',t: '#7d5b40'};
PIX.amne_barn = ['XHHXXXXX', 'XHHXXXXX', 'ssssXXXX', 'ssssXHHX', 'ssssXHHX', 'XssXGGGG', 'XssXXGGX', 'XsXsXGXG']; PAL.amne_barn = {X: '#dad0bb',H: '#bd753e',s: '#5e3c24',G: '#a14808'};
PIX.amne_dod = ['XXXkXXXX', 'XXXkXXXX', 'XkkkkkXX', 'XXXkXXXX', 'XXXkXXXX', 'XXXkXXXX', 'XtttttXX', 'XXXXXXXX']; PAL.amne_dod = {X: '#dad0bb',k: '#24201d',t: '#7d5b40'};
PIX.amne_fara = ['XXXGXXXX', 'XXGkGXXX', 'XXGkGXXX', 'XGGkGGXX', 'XGGGGGXX', 'GGGkGGGX', 'GGGGGGGX', 'XXXXXXXX']; PAL.amne_fara = {X: '#dad0bb',G: '#a14808',k: '#24201d'};
PIX.amne_karlek = ['XXXXXXXX', 'XGGXGGXX', 'GHGGGGGX', 'GGGGGGGX', 'XGGGGGXX', 'XXGGGXXX', 'XXXGXXXX', 'XXXXXXXX']; PAL.amne_karlek = {X: '#dad0bb',G: '#a14808',H: '#bd753e'};
PIX.amne_kunskap = ['XXXXXqXX', 'XXXXqwqX', 'XXXXXqXX', 'HXHXHXXX', 'HXHXHXHX', 'HHHHHHHX', 'XHHHHHXX', 'XXGGGXXX']; PAL.amne_kunskap = {X: '#dad0bb',q: '#b2921b',w: '#d8b25f',H: '#bd753e',G: '#a14808'};
PIX.amne_langtan = ['XXSXSXXX', 'XXXSXSXX', 'XXXXXXXX', 'tttttttX', 'XtqqqtXX', 'XtttttXX', 'XXtttXXX', 'XXXXXXXX']; PAL.amne_langtan = {X: '#dad0bb',S: '#61767a',t: '#7d5b40',q: '#b2921b'};
PIX.amne_plats = ['XXGGGXXX', 'XGGGGGXX', 'XGGqGGXX', 'XGGGGGXX', 'XXGGGXXX', 'XXGGGXXX', 'XXXGXXXX', 'XXXXXXXX']; PAL.amne_plats = {X: '#dad0bb',G: '#a14808',q: '#b2921b'};
PIX.amne_rykte = ['XXkkkXXX', 'XkXXXkXX', 'XkXkXkXX', 'XXXkXkXX', 'XXkXXkXX', 'XXkXkXXX', 'XXXkXXXX', 'XXXXXXXX']; PAL.amne_rykte = {X: '#dad0bb',k: '#24201d'};
PIX.amne_teknik = ['qXqXXSSX', 'XwXXSTSR', 'qXqXSTRR', 'XXXXtRRX', 'XXXtXXXX', 'XXtXXXXX', 'XtXXXXXX', 'tXXXXXXX']; PAL.amne_teknik = {q: '#b2921b',X: '#dad0bb',S: '#61767a',w: '#d8b25f',T: '#8a9c9e',R: '#3e5156',t: '#7d5b40'};
PIX.amne_trost = ['XXXXXXXX', 'XXXRXXXX', 'XXXRXXXX', 'XXRRRXXX', 'XRRRRRXX', 'XRRSRRXX', 'XXRRRXXX', 'XXXXXXXX']; PAL.amne_trost = {X: '#dad0bb',R: '#3e5156',S: '#61767a'};
PIX.amne_vader_aska = ['XSSSSSXX', 'SSSSSSSX', 'XSSSSSXX', 'XXXpXXXX', 'XXppXXXX', 'XXXppXXX', 'XXXXpXXX', 'XXXXXXXX']; PAL.amne_vader_aska = {X: '#dad0bb',S: '#61767a',p: '#906f0f'};
PIX.amne_vader_blast = ['XSSSSSXX', 'XXXXXXSX', 'SSSSSXXX', 'XXXXXXXX', 'XSSSSSSX', 'XXXXXXXS', 'XXSSSXXX', 'XXXXXXXX']; PAL.amne_vader_blast = {X: '#dad0bb',S: '#61767a'};
PIX.amne_vader_dimma = ['XXXXXXXX', 'XSSSSSSX', 'XXXXXXXX', 'SSSSSSXX', 'XXXXXXXX', 'XSSSSSSX', 'XXXXXXXX', 'XXXXXXXX']; PAL.amne_vader_dimma = {X: '#dad0bb',S: '#61767a'};
PIX.amne_vader_klart = ['XXXpXXXX', 'XpXXXpXX', 'XXXpXXXX', 'pXpppXpX', 'XXXpXXXX', 'XpXXXpXX', 'XXXpXXXX', 'XXXXXXXX']; PAL.amne_vader_klart = {X: '#dad0bb',p: '#906f0f'};
PIX.amne_vader_regn = ['XSSSSSXX', 'SSSSSSSX', 'XSSSSSXX', 'XXXXXXXX', 'XRXXRXXX', 'XXRXXRXX', 'XRXXRXXX', 'XXXXXXXX']; PAL.amne_vader_regn = {X: '#dad0bb',S: '#61767a',R: '#3e5156'};
PIX.amne_vader_sno = ['XXXRXXXX', 'XRXRXRXX', 'XXRRRXXX', 'RRRRRRRX', 'XXRRRXXX', 'XRXRXRXX', 'XXXRXXXX', 'XXXXXXXX']; PAL.amne_vader_sno = {X: '#dad0bb',R: '#3e5156'};
PIX.amne_vardag = ['XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XkXkXkXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX']; PAL.amne_vardag = {X: '#dad0bb',k: '#24201d'};
PIX.amne_varsel = ['XXXXXXXX', 'XkkkXXXX', 'kkwkXXXX', 'XXkkkkXX', 'XXkkkkkk', 'XXkkkkkX', 'XXXkkkXk', 'XXXkXkXX']; PAL.amne_varsel = {X: '#dad0bb',k: '#24201d',w: '#d8b25f'};
PIX.kk_liv = ['................', '....kkk.........', '...kXXXk........', '...kXXXk....kk..', '....kkk....kXXk.', '...kGGGk...kXXk.', '..kGHGGGk...kk..', '..kGHGGGk..kGGk.', '..kGGGGGk.kGHGk.', '..kGGGGGk.kGGGk.', '...kGGGk...kGk..', '...ks.sk...ks.k.', '...ks.sk...ks.k.', '...kk.kk...kk.k.', '................', '................']; PAL.kk_liv = {k: '#24201d',X: '#dad0bb',G: '#a14808',H: '#bd753e',s: '#5e3c24'};
PIX.kk_motgang = ['................', '.......kkkkk....', '......kwqqqk....', '......kqqqk.....', '.....kqqqk......', '.....kqqqkkkk...', '....kqqqqqqqk...', '....kkkkkqqk....', '........kqqk....', '.......kqqk.....', '.......kqk......', '......kqk.......', '......kk........', '.....k..........', '................', '................']; PAL.kk_motgang = {k: '#24201d',w: '#d8b25f',q: '#b2921b'};
PIX.kk_styre = ['................', '................', '................', '..k....k....k...', '.kwk..kwk..kqk..', '.kqqk.kqqk.kqqk.', '.kqqqkkqqqkkqqk.', '.kqqqqqqqqqqqqk.', '.kqqqqGHGqqqqpk.', '.kqqqqGGGqqqqpk.', '.kwwwwwwwwwwwpk.', '.kppppppppppppk.', '..kkkkkkkkkkkk..', '................', '................', '................']; PAL.kk_styre = {k: '#24201d',w: '#d8b25f',q: '#b2921b',G: '#a14808',H: '#bd753e',p: '#906f0f'};
PIX.kk_bygge = ['......k..k......', '.......kk.......', '......ktsk......', '.....ktutsk.....', '....ktuttssk....', '...ktuttssssk...', '..ktuttssssssk..', '.ktuttssssssssk.', 'kkkkkkkkkkkkkkkk', '.kuuuuuuuuuuuuk.', '.kssssskkkksssk.', '.kuuuuukllkuuuk.', '.kssssskllksssk.', '.kuuuuukllkuuuk.', '.kssssskllksssk.', '.kkkkkkkkkkkkkk.']; PAL.kk_bygge = {k: '#24201d',t: '#7d5b40',s: '#5e3c24',u: '#987e62',l: '#2f261d'};
PIX.kk_skrift = PIX.bok!; PAL.kk_skrift = PAL.bok!; // platshållare (steg 10.6.8)
PIX.berattelse = PIX.bok!; PAL.berattelse = PAL.bok!; // boksymbolen som fäller ut en berättelse (steg 11.1.3), platshållare tills Björn valt i bildstilen
PIX.kk_fritid = ['..kuk......ktk..', '..kuk......ktk..', '.kuukkkkkkkkttk.', '.kttttttttttttk.', '.kukkkwkwkwkktk.', '.kuuk.w.w.wkttk.', '.kutk.w.w.wkttk.', '.kttk.w.w.wktsk.', '..ktk.w.w.wksk..', '..kttkw.w.wssk..', '...ktkwkwkwsk...', '...kttutttssk...', '....kuptptpk....', '....ktttttsk....', '.....ktttsk.....', '......kkkk......']; PAL.kk_fritid = {k: '#24201d',u: '#987e62',t: '#7d5b40',w: '#d8b25f',s: '#5e3c24',p: '#906f0f'};
PIX.kk_grannar = ['................', '................', '...kk.......kk..', '..kttk.....kttk.', '.ktsstk...ktsstk', 'kkkkkkkk.kkkkkkk', '.kussuk...kussuk', '.kmkkuk...kukkmk', '.kmkkuk...kukkmk', 'kkkkkkkKLKkkkkkk', 'kKuuLKLKKKKKuuKk', 'kKuuuututuuttuKk', 'kKKKKuutuutKKKKk', 'kKKKKKKLKLKKLKKk', 'kkkkkkkkkkkkkkkk', '................']; PAL.kk_grannar = {k: '#24201d',t: '#7d5b40',s: '#5e3c24',u: '#987e62',m: '#372f25',K: '#647025',L: '#898b4c'};
PIX.kk_strid = ['..kk............', '.kSSk.....kkk...', '.kSSSk...kTTSk..', '.kSSk....kTSSSk.', '.kSktk....kSSRk.', '..k.ktk..ktSRRRk', '....Gttkkttkkkk.', '....Gkttttk.....', '...FF.kttk..G...', '.....kttttk.....', '....kttkkttk....', '...kttk..kttk...', '..kttk.G..kttk..', '.kttk..F...ktk..', '.ktk........ktk.', '..k..........k..']; PAL.kk_strid = {k: '#24201d',S: '#61767a',T: '#8a9c9e',t: '#7d5b40',R: '#3e5156',G: '#a14808',F: '#742a01'};
PIX.r_ja = ['................', '................', '..............kk', '.............kKk', '............kKKk', '...........kKKk.', '.kk.......kKKk..', 'kLk......kKKk...', 'kLKk....kKKk....', '.kKKk..kKKk.....', '..kKKkkKKk......', '...kKKKKk.......', '....kKKk........', '.....kk.........', '................', '................']; PAL.r_ja = {k: '#24201d',K: '#647025',L: '#898b4c'};
PIX.r_nej = ['................', '................', '..kk.......kk...', '.kHGk.....kGGk..', '..kGGk...kGGk...', '...kGGk.kGGk....', '....kGGkkGGk....', '.....kGGGGk.....', '.....kGGGGk.....', '....kGGkkGGk....', '...kGGk.kGGk....', '..kGGk...kGGk...', '.kGGk.....kGGk..', '..kk.......kk...', '................', '................']; PAL.r_nej = {k: '#24201d',H: '#bd753e',G: '#a14808'};
PIX.r_fram = ['................', '....k.k.k.......', '...kXkXkXk......', '...kXkXkXk.k....', '...kXkXkXkkXk...', '...kXXXXXkkXk...', '...kXXXXXXXXk...', '...kXXXXXXXk....', '...kXXXXXXXk....', '....kXXXXXk.....', '....kXXXXXk.....', '....ksssssk.....', '....ksssssk.....', '....kkkkkkk.....', '................', '................']; PAL.r_fram = {k: '#24201d',X: '#dad0bb',s: '#5e3c24'};
// steg 10.11.1: ämnet mat och krönikans kategori tro ur Björns val
// tältet (steg 11.11.1): platshållare, hoprullat skinn med två remmar och grenarna bredvid
PIX.talt = ['................', '................', '................', '..........g.....', '.........g......', '...kkkkkkgkkk...', '..kSsSkSsgSkSk..', '.kSsSsrSsSsrSsk.', '.ksSsSrsSsSrsSk.', '.kSsSsrSsSsrSsk.', '..ksSkrsSsSrSk..', '...kkkrkkkkrk...', '....g...........', '...g............', '................', '................']; PAL.talt = {k: '#24201d', S: '#bd753e', s: '#7d5b40', r: '#3e5156', g: '#5e3c24'};
// packsadeln (steg 11.11.3, platshållare, 16 punkter): en sadel av skinn med en väska på var sida, remmar av rep
PIX.packsadel = ['................', '................', '................', '................', '.....kkkkkk.....', '....kSSSSSSk....', '...kSsSSSSsSk...', '.kkkrkkkkkkrkkk.', 'kSSkr......rkSSk', 'kSsSk......kSsSk', 'kSSSk......kSSSk', 'kSsSk......kSsSk', 'kkkkk......kkkkk', '................', '................', '................']; PAL.packsadel = {k: '#24201d', S: '#bd753e', s: '#7d5b40', r: '#3e5156'};
// ridsadeln (steg 11.11.4, platshållare, 16 punkter): en sadel av skinn med hög bom och stigbyglar i rep
PIX.ridsadel = ['................', '................', '................', '................', '...kk......kk...', '...kSk....kSk...', '...kSSkkkkSSk...', '....kSsSSsSk....', '.....kkkkkk.....', '.....r....r.....', '.....r....r.....', '.....r....r.....', '....kkk..kkk....', '................', '................', '................']; PAL.ridsadel = {k: '#24201d', S: '#bd753e', s: '#7d5b40', r: '#3e5156'};
// tekniken Ridning (steg 11.11.4, platshållare): ryttaren på hästen
PIX.ridning = ['................', '......kk........', '.....kFFk.......', '.....kRRk.......', '....kRRRRk......', '..kkkSSSSkkk.kk.', '.kHHHHSSHHHHkHk.', 'kHHHHHHHHHHHHk..', '.kHHHHHHHHHHk...', '..kHk....kHk....', '..kHk....kHk....', '..kHk....kHk....', '..kk......kk....', '................', '................', '................']; PAL.ridning = {k: '#24201d', F: '#bd753e', R: '#3e5156', S: '#7d5b40', H: '#5e3c24'};
PIX.amne_mat = ['XXRXXRXX', 'XRXXRXXX', 'XGHGHqpX', 'kkkkkkkk', 'XkttttkX', 'XkttttkX', 'XXkttkXX', 'XXkkkkXX']; PAL.amne_mat = {G: '#a14808',H: '#bd753e',R: '#3e5156',X: '#dad0bb',k: '#24201d',p: '#906f0f',q: '#b2921b',t: '#7d5b40'};
PIX.kk_tro = ['................', '................', '.......k........', '...k..kwk..k....', '..kwk.kwk.kwk...', '...kwkwwwkwk....', '..kkkwwwwwkkk...', '.kwwwwwkwqqqqk..', '..kkkwwwqqkkk...', '...kwkwqqkqk....', '..kwk.kqk.kqk...', '...k..kqk..k....', '.......k........', '................', '................', '................']; PAL.kk_tro = {k: '#24201d',q: '#b2921b',w: '#d8b25f'};
// Björns val i bildstilen (steg 9.9.1): mössan, läderhjälmen, manteln, halsbandet och skölden som saker, och lintyget. Samma bild i alla
// material: mössan och manteln i vargens och björnens skinn byter bara färg (jord till skiffer och mörkare jord)
{
  const OMFARGA: Record<string, Record<string, string>> = {
    vargskinn: { '#3f2415': '#233035', '#5e3c24': '#3e5156', '#7d5b40': '#61767a', '#987e62': '#8a9c9e' },
    bjornskinn: { '#7d5b40': '#5e3c24', '#987e62': '#7d5b40', '#5e3c24': '#3f2415', '#3f2415': '#2f261d' },
  };
  const sak = (k: string, bas: string, m?: string) => { PIX[k] = PIX[bas]; PAL[k] = m ? Object.fromEntries(Object.entries(PAL[bas]).map(([t, c]) => [t, OMFARGA[m][c] ?? c])) : PAL[bas]; };
  for (const m of ['kaninskinn', 'lader', 'lintyg', 'ylle', 'benband', 'tandband']) sak('mossa_' + m, 'mossa_kaninskinn');
  for (const m of ['vargskinn', 'bjornskinn']) { sak('mossa_' + m, 'mossa_kaninskinn', m); sak('mantel_' + m, 'mantel_kaninskinn', m); }
  for (const m of ['lader', 'lintyg', 'benband', 'tandband']) sak('mantel_' + m, 'mantel_kaninskinn');
  for (const m of ['kaninskinn', 'vargskinn', 'bjornskinn', 'lader', 'lintyg', 'ylle', 'benband', 'fjaderband']) sak('halsband_' + m, 'halsband_tandband');
  for (const m of ['kaninskinn', 'vargskinn', 'bjornskinn', 'lintyg', 'ylle', 'benband', 'tandband']) sak('hjalm_' + m, 'hjalm_lader');
}
// symbolen för en lägereld (stationen som lägger ringen till en lägereld till, steg 4.5.6.8): den nylagda med stenringen under
// (bildstilens tecken har samma färg i alla bilder, så att två bilder kan läggas på varandra tecken för tecken)
{ const ring = KARTBILDER.lagereld_ring, ny = KARTBILDER.lagereld_ny;
  PIX.lagereld = ring.rader.map((r, y) => [...r].map((c, x) => ny.rader[y][x] !== '.' ? ny.rader[y][x] : c).join('')); PAL.lagereld = { ...ring.pal, ...ny.pal }; }
PIX.slaktfar = PIX.radjur; PAL.slaktfar = PAL.radjur; PIX.slaktget = PIX.radjur; PAL.slaktget = PAL.radjur; // platshållare (steg 9.8.7)
for (const k of ['radjurkott', 'farkott', 'getkott', 'kokott', 'svinkott', 'fagelkott', 'bjornkott']) { PIX[k] = PIX.vargkott; PAL[k] = PAL.vargkott; } PIX.vildsvindel = PIX.radjurdel; PAL.vildsvindel = PAL.radjurdel; // platshållare (steg 10.10.4)
for (const k of ['kohud', 'svinskinn']) { PIX[k] = PIX.radjursskinn; PAL[k] = PAL.radjursskinn; } // platshållare (steg 10.3.14)
PIX.vitskinn = PIX.skinn; PAL.vitskinn = { ...PAL.skinn, F: '#a0947d', G: '#bdb39b', H: '#dad0bb', p: '#dad0bb', q: '#dad0bb' }; // harens vinterpäls (steg 10.7.22), platshållare
 PIX.levfar = PIX.radjur; PAL.levfar = PAL.radjur; PIX.levget = PIX.radjur; PAL.levget = PAL.radjur; PIX.levko = PIX.radjur; PAL.levko = PAL.radjur; PIX.levoxe = PIX.radjur; PAL.levoxe = PAL.radjur; PIX.levhast = PIX.radjur; PAL.levhast = PAL.radjur; PIX.slaktko = PIX.radjur; PAL.slaktko = PAL.radjur; PIX.levhons = PIX.fagel; PAL.levhons = PAL.fagel; // platshållare (steg 9.8.5, 9.8.10)
PIX.fahus = PIX.hogolv; PAL.fahus = PAL.hogolv; // platshållare (steg 9.8.9)
PIX.far = PIX.radjur; PAL.far = PAL.radjur; PIX.get = PIX.radjur; PAL.get = PAL.radjur; PIX.ko = PIX.radjur; PAL.ko = PAL.radjur; PIX.oxe = PIX.radjur; PAL.oxe = PAL.radjur; PIX.hast = PIX.radjur; PAL.hast = PAL.radjur; // platshållare för djuren som slaktas (steg 9.8.7)
// Björns val ur fas 9 och 10 (steg 11.14.1): saker vars symbol är en kartbild med ett annat namn (iRutan); på kartan ritas bilden i
// sin naturliga storlek (kb_<id>)
{
  const LISTA: [string, string][] = [
    // de som heter något annat i bildstilen (de andra får sin kartbild av regeln i iRutan)
    ['appelplanta', 'appeltrad'], ['far', 'tam_far_1'], ['get', 'tam_get_1'], ['levfar', 'tam_far_1'], ['levget', 'tam_get_1'],
    ['hund', 'tam_hund_1_sida'], ['foder', 'sym_foder'], ['skatta', 'sym_skatta'], ['s_bistick', 'sym_bistick'], ['heligt', 'sym_gnistor'],
  ];
  for (const [k, id] of LISTA) { const b = KARTBILDER[id]; if (b) { PIX[k] = iRutan(b); PAL[k] = b.pal; } }
  // de som ritas i sin egen storlek: lerkrukorna (i förrådet, kruka.ts), bisymbolen på fältet och krönikans strid (24 punkter)
  for (const [k, id] of [['lerkruka_liten', 'lerkruka_liten'], ['lerkruka_mellan', 'lerkruka_mellan'], ['lerkruka_stor', 'lerkruka_stor'], ['bisymbol', 'sym_bi'], ['kk_strid', 'sym_kk_strid']]) { const b = KARTBILDER[id]; if (b) { PIX[k] = b.rader; PAL[k] = b.pal; } }
  // vridna och speglade bilder (steg 11.14.1): vattenhon står lodrätt, kälken och släden dras åt alla fyra håll, molnet av bin och
  // de tama djuren västerut
  const spegla = (r: string[]) => r.map(x => [...x].reverse().join(''));
  const vand = (r: string[]) => [...r].reverse();
  const medsols = (r: string[]) => Array.from({ length: r[0].length }, (_, y) => Array.from({ length: r.length }, (_, x) => r[r.length - 1 - x][y]).join(''));
  const motsols = (r: string[]) => Array.from({ length: r[0].length }, (_, y) => Array.from({ length: r.length }, (_, x) => r[x][r[0].length - 1 - y]).join(''));
  const lagg = (k: string, rader: string[], pal: Record<string, string>) => { PIX[k] = rader; PAL[k] = pal; };
  const ho = KARTBILDER.vattenho;
  if (ho) {
    const tom = ho.rader.map(r => r.replace(/[lm]/g, 'b')); // utan vatten syns botten
    lagg('kb_vattenho_v', medsols(ho.rader), ho.pal); lagg('kb_vattenho_tom', tom, ho.pal); lagg('kb_vattenho_v_tom', medsols(tom), ho.pal);
  }
  // kälken är ritad med fören uppåt (den dras norrut), släden med skaklarna åt höger (österut)
  const ka = KARTBILDER.kalke, sl = KARTBILDER.slade;
  if (ka) { lagg('kb_kalke_bak', ka.rader, ka.pal); lagg('kb_kalke_fram', vand(ka.rader), ka.pal); lagg('kb_kalke_sida', medsols(ka.rader), ka.pal); lagg('kb_kalke_vast', motsols(ka.rader), ka.pal); }
  if (sl) { lagg('kb_slade_sida', sl.rader, sl.pal); lagg('kb_slade_vast', spegla(sl.rader), sl.pal); lagg('kb_slade_bak', motsols(sl.rader), sl.pal); lagg('kb_slade_fram', medsols(sl.rader), sl.pal); }
  // stenvägen är 2 × 2 rutor: varje ruta tar den fjärdedel som hör till dess plats, så att mönstret går ihop
  const sv = KARTBILDER.stenvag;
  if (sv) for (let q = 0; q < 4; q++) lagg('kb_stenvag_' + q, sv.rader.slice((q >> 1) * 16, (q >> 1) * 16 + 16).map(r => r.slice((q & 1) * 16, (q & 1) * 16 + 16)), sv.pal);
  const moln = KARTBILDER.biarg_moln; if (moln) lagg('kb_biarg_moln_v', spegla(moln.rader), moln.pal);
  const hons = KARTBILDER.hons; if (hons) lagg('kb_hons_vast', spegla(hons.rader), hons.pal);
  // de tama djuren: hunden och valpen från tre håll, fåret och geten bara från sidan (framåt och bakåt syns de från sidan)
  for (let v = 1; v <= 3; v++) {
    for (const a of ['hund', 'valp']) { const sida = KARTBILDER[`tam_${a}_${v}_sida`]; if (!sida) continue; lagg(`kb_tam_${a}_${v}_vast`, spegla(sida.rader), sida.pal); }
    for (const a of ['far', 'get']) { const b = KARTBILDER[`tam_${a}_${v}`]; if (!b) continue; lagg(`kb_tam_${a}_${v}_sida`, b.rader, b.pal); lagg(`kb_tam_${a}_${v}_fram`, b.rader, b.pal); lagg(`kb_tam_${a}_${v}_vast`, spegla(b.rader), b.pal); lagg(`kb_tam_${a}_${v}_bak`, spegla(b.rader), b.pal); }
  }
}
// tamheten bland djurets egenskaper (steg 11.14.1, platshållare tills Björn valt f10_tamhet i bildstilen): ett halsband med ett rep
PIX.tamhet = [
  '................',
  '................',
  '.....oooooo.....',
  '....odddddo.....',
  '...od....dodo...',
  '...od.....odo...',
  '...od.....odo...',
  '...od....doo....',
  '....odddddo.....',
  '.....oooooo.....',
  '..........oc....',
  '...........oc...',
  '............oc..',
  '.............oc.',
  '..............o.',
  '................',
];
PAL.tamhet = { o: '#24201d', d: '#7d5b40', c: '#bdb39b' };
// djuren på kartan (steg 5.1.11, ritade i bildstilen i 5.2.4.6): varje art har en eller flera ritningar (vargen en, haren två)
// och fyra pälsar, och varje ritning tre håll; västerut är sidan speglad. Bilden heter djur_<art>_<ritning>_<päls>_<håll>,
// där hållet är sida, vast, fram eller bak. Vilken ritning och päls ett djur har räknas ur dess id (djurBild)
export const DJUR_HALL = ['sida', 'vast', 'fram', 'bak'] as const;
export type DjurHall = typeof DJUR_HALL[number];
for (const art of ['varg', 'kanin', 'radjur', 'fagel', 'bjorn', 'bjornunge'] as const) DJURBILDER.ritningar[art].forEach((r, v) => DJURBILDER.pals[art].forEach((pals, p) => {
  if (art === 'fagel' && v !== p) return; // varje fågel har sin egen palett (steg 6.6.3)
  const pal: Record<string, string> = {};
  for (const [ch, [ramp, ton]] of Object.entries({ ...DJURBILDER.fast, ...pals })) pal[ch] = farg(ramp, ton);
  for (const h of DJUR_HALL) {
    const k = `djur_${art}_${v}_${p}_${h}`, rader = r[(h === 'vast' ? 'sida' : h) as Hall];
    PIX[k] = h === 'vast' ? rader.map(rad => [...rad].reverse().join('')) : rader; PAL[k] = pal;
  }
}));
// haren i vinterpäls (steg 10.7.22, platshållare): under istiden är alla harar vita, i varje ritning
const VIT_PALS: Record<string, [string, 0 | 1 | 2 | 3]> = { o: ['ben', 0], d: ['ben', 2], m: ['ben', 3], l: ['ben', 3], c: ['ben', 2], b: ['ben', 3] };
DJURBILDER.ritningar.kanin.forEach((r, v) => {
  const pal: Record<string, string> = {};
  for (const [ch, [ramp, ton]] of Object.entries({ ...DJURBILDER.fast, ...VIT_PALS })) pal[ch] = farg(ramp, ton);
  for (const h of DJUR_HALL) { const k = `djur_kanin_${v}_vit_${h}`, rader = r[(h === 'vast' ? 'sida' : h) as Hall]; PIX[k] = h === 'vast' ? rader.map(rad => [...rad].reverse().join('')) : rader; PAL[k] = pal; }
});
// vildsvinet (steg 10.10.4, platshållare tills Björn valt i bildstilen): björnungens låga, tunga kropp i grå och mörkbrun borst
const VS_PALS: Record<string, [string, 0 | 1 | 2 | 3]>[] = [
  { k: ['kol', 0], s: ['kol', 1], l: ['kol', 0], m: ['kol', 2], r: ['jord', 0], t: ['jord', 1], V: ['ben', 1] },
  { k: ['kol', 0], s: ['jord', 0], l: ['kol', 0], m: ['jord', 1], r: ['kol', 1], t: ['jord', 1], V: ['ben', 1] },
];
VS_PALS.forEach((pals, pi) => {
  const r = DJURBILDER.ritningar.bjornunge[0], pal: Record<string, string> = {};
  for (const [ch, [ramp, ton]] of Object.entries({ ...DJURBILDER.fast, ...pals })) pal[ch] = farg(ramp, ton);
  for (const h of DJUR_HALL) { const k = `djur_vildsvin_0_${pi}_${h}`, rader = r[(h === 'vast' ? 'sida' : h) as Hall]; PIX[k] = h === 'vast' ? rader.map(rad => [...rad].reverse().join('')) : rader; PAL[k] = pal; }
});
PIX.vildsvin = PIX.djur_vildsvin_0_0_sida; PAL.vildsvin = PAL.djur_vildsvin_0_0_sida; // det fällda vildsvinet och djuret i texterna
PIX.gris = PIX.vildsvin; PAL.gris = PAL.vildsvin; PIX.kulting = PIX.vildsvin; PAL.kulting = PAL.vildsvin; PIX.slaktgris = PIX.vildsvin; PAL.slaktgris = PAL.vildsvin; // platshållare (steg 10.10.13)
// djurets bild: ritningen och pälsen ur id:t (som djurets andra egenskaper, steg 3.7.13) och hållet det rör sig åt
const idTal = (id: number, salt: number) => { let h = Math.imul(id ^ salt, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; return (h ^ (h >>> 13)) >>> 0; };
// fågeln (steg 6.6.3): utseendet (orre, ripa, skogsduva) kommer från platsen, inte från id:t
export const fagelBild = (u: number, hall: DjurHall) => `djur_fagel_${u}_${u}_${hall}`;
export function djurBild(art: 'varg' | 'kanin' | 'radjur' | 'vildsvin' | 'bjorn' | 'bjornunge', id: number, hall: DjurHall, vit = false) {
  if (art === 'vildsvin') return `djur_vildsvin_0_${idTal(id, 0x9e37) % VS_PALS.length}_${hall}`;
  const v = idTal(id, 0x51a7) % DJURBILDER.ritningar[art].length, p = idTal(id, 0x9e37) % DJURBILDER.pals[art].length;
  return `djur_${art}_${v}_${vit && art === 'kanin' ? 'vit' : p}_${hall}`;
}
export const kartbild = (k: string) => KARTBILDER[k] ? 'kb_' + k : undefined;
export const kartbildEnsam = (k: string) => !!KARTBILDER[k]?.ensam;

// den vävda mattan (steg 10.7.6, platshållare tills Björn valt i bildstilen): 16 punkter per ruta, en kant, ränder i tvären och
// fransar på kortsidorna. Den runda har golvet synligt i hörnen. Lintyget ljust med röda ränder, yllet ockra med bruna
{
  const MATTA_PAL: Record<string, Record<string, string>> = {
    lin: { o: '#a0947d', a: '#dad0bb', b: '#742a01', c: '#521100', f: '#bdb39b' },
    ylle: { o: '#5e3c24', a: '#906f0f', b: '#5e3c24', c: '#3f2415', f: '#b2921b' },
  };
  const rita = (w: number, h: number, rund: boolean) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => {
    const cx = (w - 1) / 2, cy = (h - 1) / 2, e = ((x - cx) / (w / 2)) ** 2 + ((y - cy) / (h / 2)) ** 2;
    if (rund) { if (e > 1) return '.'; if (e > 0.78) return 'o'; return e < 0.12 ? 'c' : Math.abs(Math.sqrt(e) - 0.6) < 0.08 ? 'b' : 'a'; }
    if (x < 2) return y % 2 === 0 && y > 0 && y < h - 1 ? 'f' : '.'; if (x >= w - 2) return y % 2 === 0 && y > 0 && y < h - 1 ? 'f' : '.'; // fransarna
    if (y === 0 || y === h - 1 || x === 2 || x === w - 3) return 'o';
    const r = (x - 3) % 8; return r === 2 || r === 3 ? 'b' : r === 6 && y % 3 === 1 ? 'c' : 'a';
  }).join(''));
  const STORL: Record<string, [number, number, boolean]> = { liten: [16, 16, false], lang: [32, 16, false], stor: [32, 32, false], rund: [32, 32, true] };
  for (const [k, [w, h, rund]] of Object.entries(STORL)) for (const tyg of ['lin', 'ylle']) {
    const id = `matta_${k}_${tyg}`, rader = rita(w, h, rund);
    PIX[id] = rader; PAL[id] = MATTA_PAL[tyg];
    if (w !== h) { PIX[id + '_karta_v'] = Array.from({ length: w }, (_, x) => Array.from({ length: h }, (_, y) => rader[h - 1 - y][x]).join('')); PAL[id + '_karta_v'] = MATTA_PAL[tyg]; } // den långa vriden
  }
  PIX.matta = PIX.matta_liten_lin; PAL.matta = MATTA_PAL.lin; // tekniken
}
const canvases: Record<string, HTMLCanvasElement> = {};
const urls: Record<string, string> = {};

// pixelbilden som canvas, 8×8
export function iconCanvas(k: string) {
  if (canvases[k]) return canvases[k];
  const rows = PIX[k], pal = PAL[k], c = document.createElement('canvas'); c.width = rows?.[0]?.length ?? 8; c.height = rows?.length ?? 8; // 8×8, utom stationernas kartbilder
  const g = c.getContext('2d')!;
  if (rows) rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return (canvases[k] = c);
}
export const hasIcon = (k: string) => !!PIX[k];
// en ljus symbol utan kant (de för arbetet, ritade för en mörk ruta): i den ljusa pratbubblan ritas den mörk (steg 4.5.6.9)
export const ljusSymbol = (k: string) => !!PIX[k] && !PAL[k]?.o && ['#dad0bb'].includes(PAL[k]?.w ?? '');
// kvalitetens märke (steg 2.2.2, Björn valde version 2 i bildstilen, byggt i steg 3.6.11): usel ett mörkt dammoln, slarvig
// en ojämn grå fläck, normal inget, fin i silver, mästerverk i guld och det perfekta mästerverket i guld med vita gnistor. 8 × 8 punkter
const KV_PIX: readonly ({ pal: Record<string, string>; rader: readonly string[] } | undefined)[] = [
  { pal: { K: '#474138', k: '#372f25' }, rader: ['........', '..kk....', '.kKKk.k.', '.kKKKkK.', '..kkKKk.', '...kkk..', '........', '........'] },
  { pal: { S: '#61767a', s: '#3e5156' }, rader: ['........', '........', '...s....', '..sSs...', '...ss...', '........', '........', '........'] },
  undefined,
  { pal: { a: '#61767a', b: '#8a9c9e', c: '#dad0bb', w: '#dad0bb' }, rader: ['........', '...a....', '...b....', '.abcba..', '...b....', '...a....', '........', '........'] },
  { pal: { a: '#906f0f', b: '#b2921b', c: '#d8b25f', w: '#dad0bb' }, rader: ['...a....', '...b....', '..aca...', 'abcwcba.', '..aca...', '...b....', '...a....', '........'] },
  { pal: { a: '#906f0f', b: '#b2921b', c: '#d8b25f', w: '#dad0bb' }, rader: ['...a..w.', '...b.wcw', '..aca.w.', 'abcwcba.', '..aca...', '...b..w.', '...a.wcw', '......w.'] },
];
export function kvSvg(q: number | undefined, size = 10) {
  const m = KV_PIX[q ?? 2];
  if (!m) return '';
  let r = '';
  m.rader.forEach((row, y) => [...row].forEach((ch, x) => { if (m.pal[ch]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${m.pal[ch]}"/>`; }));
  return `<svg class="ikon kvmark" width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
// ikonen som <img> för listorna
export function iconImg(k: string, size = 16) {
  if (!hasIcon(k)) return '';
  urls[k] ??= iconCanvas(k).toDataURL();
  return `<img class="ikon" src="${urls[k]}" width="${size}" height="${size}" alt="">`;
}
// en symbol i gränssnittet: pixelbilden k om den finns, annars tecknet (emojin i registret)
export const tecknet = (k: string, alt: string, size = 16) => hasIcon(k) ? iconImg(k, size) : alt;

// myren och järnet (fas 12): platshållarna i ikonerjarn.ts
import { laggTillJarn } from './ikonerjarn';
laggTillJarn(PIX, PAL);
