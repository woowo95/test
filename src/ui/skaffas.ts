import { RATT_SAKER, rattInfo } from '../sim/ratter';
import { ACTS, DORRAR, MATERIAL, SAKER, STATIONER, TEK, sakNamn } from '../sim';
import { iconImg } from '../ikoner';
import { esc } from './hjalp';

// föremålsrutan (steg 5.3.5.2): vad en sak används till och hur man skaffar den, läst ur registren (saker.ts: skaffa och
// redskap; handlingar.ts: arbetets redskap; stationer.ts, byggnad.ts: materialet). Det som inte står i något register står
// här: hur det samlas i ett arbete (ARBETE) och det som skaffas eller används på andra sätt (HITTAS, ANVANDS)

// arbetet som ger saken (skaffa.act i saker.ts)
const ARBETE: Record<string, string> = {
  samla: 'Samlas på ängen och i skogen', ved: 'Samlas i skogen', jakt: 'Jagas', fiske: 'Fiskas i sjön',
  hugga: 'Huggs av fällda träd', klyva: 'Klyvs ur fällda träd',
};
// det som skaffas på annat sätt än i ett arbete eller av andra saker
const HITTAS: Record<string, string> = {
  ratlin: 'Odlas på fältet', linfron: 'Köps av handlaren, och kommer tillbaka vid skörden', lin: 'Rötas på torkställningen', vargtand: 'Fås när en varg slaktas',
  torrgras: 'Hittas när man samlar', sten: 'Hittas när man samlar, mest vid stenarna och i sanden',
  flinta: 'Hittas ibland när man samlar, mest vid stenarna', lera: 'Grävs vid stranden, fortare med benspaden', byggsten: 'Bryts vid berget och körs hem på kälken eller släden', kol: 'Blir kvar när en eld brunnit ut',
  rovor: 'Odlas på fältet', arter: 'Odlas på fältet', silver: 'Fås av handlaren',
  honung: 'Tas ur vildbinas bon i skogen på sommaren och hösten och skärs ur byns bikupor', // steg 10.7.25 och 10.10.20
  bivax: 'Skärs bort när bikupan skattas: varannan honungskaka ger ett', // steg 10.10.20
  appel: 'Plockas från äppelträden på fältet', appelplanta: 'Köps av handlaren', notter: 'Plockas av den vilda hasseln på hösten, och av hassel som satts', // steg 9.7.13–9.7.14
  jordgubbar: 'Odlas på fältet, och skördas flera gånger', jordgubbsplanta: 'Köps av handlaren', // steg 9.7.9
  kal: 'Odlas på fältet', bonor: 'Köps av handlaren och odlas på fältet', kalfron: 'Köps av handlaren, och kommer tillbaka vid skörden', // steg 9.7.8
  slaktrens: 'Blir kvar när vilt slaktas och fisk rensas', vaxtrest: 'Blir kvar när grödan skördas', // steg 9.7.5
  slaktfar: 'Ett får som avlivats', slaktget: 'En get som avlivats', djurhorn: 'Slaktas ur ett får eller en get', fiskrens: 'Blir kvar när fisk rensas', // djuren (system 9.8)
  ull: 'Klipps av fåren', levfar: 'Köps av handlaren', levget: 'Köps av handlaren', levko: 'Köps av handlaren', levoxe: 'Köps av handlaren', levhast: 'Köps av handlaren', slaktko: 'En ko som avlivats', kokott: 'Slaktas ur en ko', kohud: 'Slaktas ur en ko', levhons: 'Köps av handlaren', kulting: 'Fångas levande i buren', slaktgris: 'En gris som avlivats', lovkarve: 'Skärs av en hamlad björk vart tredje år',
  korn: 'Köps av handlaren, och odlas sedan på fältet', salt: 'Köps av handlaren från byarna vid havet', // steg 9.6.11 och 9.6.19
  ...Object.fromEntries(RATT_SAKER.map(k => [k, rattInfo(k)?.kat === 'stek' ? 'Steks på stekhällen vid grillen' : rattInfo(k)?.kat === 'grop' ? 'Bakas i kokgropen inför en högtid eller ett bröllop' : 'Kokas i en lerkruka över elden'])), // rätterna (steg 9.6.3 och 9.6.21)
  kott: 'Slaktas ur fällt vilt', ben: 'Slaktas ur fällt vilt', skinn: 'Slaktas ur fällt vilt', vitskinn: 'Slaktas ur en hare under istiden, när pälsen är vit', talg: 'Slaktas ur fällt vilt och vargar',
  vargkott: 'Slaktas ur en fälld varg', vargskinn: 'Slaktas ur en fälld varg', vargdel: 'Styckas där en varg föll, när den är för tung att bära hel',
  radjur: 'Fälls med spjut i skogskanten', vildsvin: 'Fälls med spjut inne i skogen', vildsvindel: 'Styckas ur ett fällt vildsvin', svinkott: 'Slaktas ur ett vildsvin', svinskinn: 'Dras av ett vildsvin', fagel: 'Fälls med spjut eller sten, sällan', fjadrar: 'Slaktas ur en fälld fågel', agg: 'Hittas ibland på våren när man samlar', radjursskinn: 'Slaktas ur ett fällt rådjur', radjurdel: 'Styckas där ett rådjur föll, när det är för tungt att bära helt',
  radjurkott: 'Slaktas ur ett fällt rådjur', farkott: 'Slaktas ur ett får', getkott: 'Slaktas ur en get', fagelkott: 'Slaktas ur en fälld fågel', bjornkott: 'Slaktas ur en fälld björn', farskinn: 'Slaktas ur ett får', getskinn: 'Slaktas ur en get',
  blad: 'Skrivs på ett blad pergament med en dos bläck, på fritiden', // steg 10.6.5
  bjorn: 'Fälls på björnjakt av en stor grupp med spjut', bjorndel: 'Styckas där björnen föll', bjornskinn: 'Slaktas ur en fälld björn',
  torv: 'Blir till när den blöta torven torkat', blottorv: 'Grävs i myren med spaden, och torkar till torv som den blöta veden', // steg 12.1.3
  malm: 'Grävs i myren med benspaden, och bryts i järngruvan i bergen', jarnskrot: 'Blir kvar när en järnsak går sönder', // steg 12.1.2, 12.2.7 och 12.2.13
  jarn: 'Blåses ur malm och kol i blästerugnen, och smids om ur järnskrot i smedjan', // steg 12.2.3 och 12.2.7
  ost: 'Ystas av mjölk i en lerkruka vid elden', // steg 12.1.192
};
// det den används till som inte är ett recept. Inget om det som kommer senare (steg 11.1.58): det som inte finns i spelet står inte här
const ANVANDS: Record<string, string[]> = {
  skold: ['I striden'], bage: ['I striden och på jakten'], slunga: ['I striden och på jakten'], horn: ['Hörs över hela kartan'], dryckeshorn: ['Öl, mjöd och vin dricks ur det'], pilar: ['Till bågen'], jarnpilar: ['Till bågen, skadar mer än flintpilen'],
  rokelse: ['Bönen och ritualerna'], brannolja: ['Byn håller några i förrådet'],
  mjarde: ['Sätts ut i vattnet'], snara: ['Sätts ut i skogen'], bur: ['Sätts ut i skogen'], ridsadel: ['Läggs på hästen för den som rider ut på en resa'], packsadel: ['Läggs på hästen eller oxen på en resa'], talt: ['Packas för en resa med en natt på vägen'], kulting: ['Blir byns gris'], slaktgris: ['Slaktas'], grop: ['Grävs i skogen'], plankor: [], salva: ['Läkekonsten'], tjara: ['Byn håller några i förrådet'], benlim: ['Byn håller några i förrådet'], tval: ['Byn håller några i förrådet'], ratlin: ['Rötas på torkställningen'], linfron: ['Sås på fälten'], leksak: ['Barnen leker med den'], huggen_sten: ['Härden'], rolleka: ['Salva'],
  naverask: ['Salvan och limmet'], remsa: ['Förband'], nal: ['Sy ihop ett stort sår'], bagborr: ['Tänder elden'], kalke: ['Drar hem virket och det tunga'], slade: ['Dras av oxen eller hästen med det tunga'], vagn: ['Dras av oxen eller hästen, dubbelt så mycket som släden, men inte i snö'], levoxe: ['Blir byns oxe'], levhast: ['Blir byns häst'], krycka: ['Den som förlorat ett ben'], traben: ['Den som förlorat ett ben'], krok: ['Den som förlorat en hand'], ogonlapp: ['Den som förlorat ett öga'], lerkruka_liten: ['Pynt'], lerkruka_mellan: ['Pynt'], lerkruka_stor: ['Pynt'],
  torrgras: ['Tänder elden'], naver: ['Tänder elden'], flinta: ['Tänder elden'], sten: ['Eldringen'], byggsten: ['Stenvägar och stenväggar'], mossa: ['Förband'], silver: ['Handel'],
  vilt: ['Slaktas'], varg: ['Slaktas'], vargdel: ['Slaktas'], radjur: ['Slaktas'], fagel: ['Slaktas'], fjadrar: ['Pilar och prydnader'], radjurdel: ['Slaktas'], vildsvin: ['Slaktas'], vildsvindel: ['Slaktas'], svinkott: ['Mat'], svinskinn: ['Kläder'], radjursskinn: ['Handel'], bjorn: ['Slaktas'], bjorndel: ['Slaktas'], abborre: ['Rensas'],
  slaktfar: ['Slaktas'], slaktget: ['Slaktas'], djurhorn: ['Handel'], fiskrens: ['Agn och mat åt hunden'], skara: ['Slår ängen till hö'], // djuren (system 9.8)
  levfar: ['Blir byns får'], levget: ['Blir byns get'], levko: ['Blir byns ko'], slaktko: ['Slaktas'], kohud: ['Kläder'], levhons: ['Blir byns höns'],
  blomma: ['Sätts i en lerkruka'], blad: ['Läses av den som har något nytt att lära där'], bok: ['Skrivs i del för del och läses'], // steg 10.6.5–10.6.6
  malm: ['Blåses till järn i blästerugnen'], jarnskrot: ['Smids om till järn i smedjan'], jarnskold: ['I striden'], svard: ['I striden'], // steg 12.2.3–12.2.9
  jarnnal: ['Syr kläder tre gånger så fort som bensylen'], jarngryta: ['Kokar dubbelt så mycket mat som lerkrukan'], oljelampa: ['Lyser inomhus på brännolja'], penna: ['Skriver på pergament'], tunna: ['Rymmer vatten, öl och det som jäser'], stol: ['En sittplats vid bordet, med ryggstöd'], pall: ['En sittplats vid bordet'], // steg 12.1.192
  isborr: ['Borrar genom den tjockaste isen'], eldstal: ['Tänder elden mot en flinta'], lie: ['Slår ängen till hö'], // steg 12.2.11–12.2.12
  bensyl: ['Syr kläder vid slöjdbänken'], boll: ['Sport'], slagtra: ['Sport'], mal: ['Sport'],
  slanda: ['Spinner lin till tråd'], fackla: ['Lyser i mörkret, i handen eller uppsatt'], talgljus: ['Lyser inomhus'], vaxljus: ['Lyser inomhus, dubbelt så länge som talgljuset'], bivax: ['Vaxljus'],
  trumma: ['Spelas på scenen'], benflojt: ['Spelas på scenen'], lyra: ['Spelas på scenen'], rovfron: ['Sås på fältet'], artfron: ['Sås på fältet'], malt: ['Ölet i bryggkaret'], kalfron: ['Sås på fältet'], kompost: ['Gödslar fältet'], jordgubbsplanta: ['Planteras på fältet'], appelplanta: ['Planteras på fältet'], slaktrens: ['Bärs till sophögen'], vaxtrest: ['Bärs till sophögen'], // steg 9.6.13
};

const ikon = (k: string, n?: number) => `<span class="sakval" title="${esc(sakNamn(k))}">${iconImg(k, 16) || esc(sakNamn(k))}${n && n > 1 ? `<small>${n}</small>` : ''}</span>`;
const lista = (xs: string[], ord = 'och') => xs.length > 1 ? xs.slice(0, -1).join(', ') + ` ${ord} ` + xs[xs.length - 1] : xs[0] ?? '';

// det saken går åt till: andra saker, stationer och möbler, väggar och golv, dörrar; och arbeten där den är redskapet
function anvandsTill(k: string) {
  const d = SAKER[k], ut: string[] = [];
  if (d?.mat) ut.push('Äts');
  if (d?.mapp === 'Bränsle') ut.push('Eldas');
  if (d?.klad) ut.push('Bärs på kroppen');
  ut.push(...ANVANDS[k] ?? []);
  const arbeten = [...new Set(Object.values(ACTS).flatMap(a => a.redskap?.[k] ? [a.redskap[k].namn ?? a.namn] : []))];
  ut.push(...arbeten);
  const saker = Object.entries(SAKER).filter(([, q]) => q?.skaffa?.av?.[k] || q?.skaffa?.verktyg?.[k]).map(([id]) => id);
  const bygge = [
    ...Object.values(STATIONER).filter(t => (t.av as Record<string, number>)[k]).map(t => t.namn),
    ...Object.values(MATERIAL).filter(m => m.item === k && m.tek).map(m => m.namn),
    ...Object.values(DORRAR).filter(t => (t.av as Record<string, number>)[k]).map(t => t.namn),
  ];
  return { text: ut, saker, bygge };
}
// hur saken skaffas: i ett arbete, av andra saker (med tekniken och verktyget) eller på annat sätt
function skaffas(k: string) {
  const sk = SAKER[k]?.skaffa;
  const tek = sk?.tek && TEK[sk.tek] ? ` · ${esc(TEK[sk.tek].namn)}` : '';
  if (sk?.av) {
    const verktyg = sk.verktyg ? ` med ${lista(Object.values(sk.verktyg), 'eller')}` : ''; // något av verktygen räcker
    return `Görs av ${Object.entries(sk.av).map(([q, n]) => ikon(q, n)).join('')}${esc(verktyg)}${tek}`;
  }
  const text = HITTAS[k] ?? (sk?.act ? ARBETE[sk.act] : undefined);
  return text ? esc(text) + tek : '';
}
// raderna i föremålsrutans lista
export function skaffasRader(k: string) {
  const a = anvandsTill(k), s = skaffas(k);
  const anv = [...a.text.map(esc), ...a.saker.length ? [`Görs till ${a.saker.map(q => ikon(q)).join('')}`] : [], ...a.bygge.length ? [`Bygger ${esc(lista(a.bygge.map(n => n.toLowerCase())))}`] : []];
  return `${anv.length ? `<dt>Används till</dt><dd class="rader">${anv.map(r => `<div>${r}</div>`).join('')}</dd>` : ''}${s ? `<dt>Skaffas</dt><dd>${s}</dd>` : ''}`;
}
// för scenariot sakruta: står det något om hur saken skaffas och vad den används till?
export const skaffasKant = (k: string) => { const sk = SAKER[k]?.skaffa; return !!(sk?.av || HITTAS[k] || (sk?.act && ARBETE[sk.act])); };
export const anvandsKant = (k: string) => { const a = anvandsTill(k); return a.text.length + a.saker.length + a.bygge.length > 0; };
