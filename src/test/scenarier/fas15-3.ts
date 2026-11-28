// Scenarier för fas 15, grupp 3 (grundvärdet, steg 15.1.30–15.1.56).
import * as SIM from '../../sim';
import { SCENARIER } from './hjalp';

const v = (k: string) => SIM.grundvarde(k), t = (x: number) => SIM.kortTal(x);

SCENARIER.prisniva = {
  text: 'Steg 15.1.30: påslaget per teknisk nivå räknas bara för de nivåer saken ligger över sitt högsta material. En tunika av lin är värd mindre än en ringbrynja, odlade grödor mer än samlade bär, och varje sak med högre rang är värd mer än den sämre i samma grupp',
  kor: () => {
    const fel: string[] = [];
    for (const k of SIM.SAK_LIST) {
      const r = SIM.SAKER[k]!.rang ?? 0;
      if (r > 0) for (const j of SIM.SAK_LIST) if ((SIM.SAKER[j]!.rang ?? 0) < r && SIM.gruppOf(j) === SIM.gruppOf(k) && v(k) <= v(j)) fel.push(`${k} ${t(v(k))} mot ${j} ${t(v(j))}`);
    }
    return [
      [`en tunika av lin (${t(v('tunika_lintyg'))}) är värd mindre än en ringbrynja (${t(v('ringbrynja_jarn'))})`, v('tunika_lintyg') < v('ringbrynja_jarn')],
      [`lintyget (${t(v('lintyg'))}) är värt omkring 17, inte omkring 100`, v('lintyg') > 10 && v('lintyg') < 30],
      [`odlat korn (${t(v('korn'))}) är värt mer än samlade bär (${t(v('bar'))})`, v('korn') > v('bar')],
      [`järnyxan (${t(v('jarnyxa'))}) är värd mer än flintyxan (${t(v('yxa'))}) men inte åtta gånger så mycket`, v('jarnyxa') > v('yxa') && v('jarnyxa') < 6 * v('yxa')],
      [`järnpilen (${t(v('jarnpilar'))}) är värd mer än flintpilen (${t(v('pilar'))})`, v('jarnpilar') > v('pilar')],
      [`varje sak med högre rang är värd mer än den sämre i samma grupp${fel.length ? ': ' + fel.join(', ') : ''}`, fel.length === 0],
    ];
  },
};

SCENARIER.djurvarde = {
  text: 'Steg 15.1.31: ett fällt eller slaktat djur är värt summan av det som slaktas ur det, för de vilda och de tama, och djuren höjer inte golvet för nivån',
  kor: () => {
    const fel: string[] = [], djur = Object.values(SIM.DJUR as Record<string, SIM.Djurart>).filter(d => d.kniv);
    for (const d of djur) { const delar = SIM.varuVarde(d.slakt) / d.mat; if (Math.abs(v(d.sak) - delar) > 0.01) fel.push(`${d.sak} ${t(v(d.sak))} mot delarna ${t(delar)}`); }
    const delar = (k: string) => { const d = djur.find(x => x.sak === k)!; return t(SIM.varuVarde(d.slakt) / d.mat); };
    return [
      [`vargen (${t(v('varg'))}, delarna ${delar('varg')}) och rådjuret (${t(v('radjur'))}, delarna ${delar('radjur')}) är värda sina delar`, !fel.some(x => /^(varg|radjur) /.test(x))],
      [`det slaktade fåret (${t(v('slaktfar'))}, delarna ${delar('slaktfar')}) och kon (${t(v('slaktko'))}) räknas likadant`, !fel.some(x => /^slakt/.test(x))],
      [`varje djur som slaktas är värt sina delar${fel.length ? ': ' + fel.join(', ') : ''}`, fel.length === 0 && djur.length >= 10],
      [`en varg (${t(v('varg'))}) är värd mer än en kanin (${t(v('vilt') * SIM.KANIN)})`, v('varg') > v('vilt') * SIM.KANIN],
      [`djuren höjer inte golvet: odlat korn är värt ${t(v('korn'))}, inte omkring 40`, v('korn') < 5],
    ];
  },
};

SCENARIER.skinnvarde = {
  text: 'Steg 15.1.32: ett skinn är värt efter hur många bitar det ger, och vargtänder och djurhorn är värda som ben. Ett björnskinn är värt mer än ett harskinn, och ett halsband av vargtänder minst lika mycket som ett av ben',
  kor: () => [
    [`ett björnskinn (${t(v('bjornskinn'))}) är värt mer än ett harskinn (${t(v('skinn'))})`, v('bjornskinn') > v('skinn')],
    [`ett vargskinn (${t(v('vargskinn'))}) är värt dubbelt så mycket som ett harskinn och en kohud (${t(v('kohud'))}) tre gånger`, Math.abs(v('vargskinn') - 2 * v('skinn')) < 0.01 && Math.abs(v('kohud') - 3 * v('skinn')) < 0.01],
    [`en vargtand (${t(v('vargtand'))}) och ett djurhorn (${t(v('djurhorn'))}) är värda som ett ben (${t(v('ben'))})`, Math.abs(v('vargtand') - v('ben')) < 0.01 && Math.abs(v('djurhorn') - v('ben')) < 0.01],
    [`ett halsband av vargtänder (${t(v('halsband_tandband'))}) är värt minst lika mycket som ett av ben (${t(v('halsband_benband'))})`, v('halsband_tandband') >= v('halsband_benband') - 0.01],
    [`en mask av vargskinn (${t(v('mask_vargskinn'))}) är inte billigare än en av harskinn (${t(v('mask_kaninskinn'))})`, v('mask_vargskinn') >= v('mask_kaninskinn') - 0.01],
    [`kohuden höjer inte kläderna: en mantel av harskinn är värd ${t(v('mantel_kaninskinn'))}`, v('mantel_kaninskinn') <= v('mantel_kohud') + 0.01 && v('mantel_kaninskinn') < 20],
  ],
};

SCENARIER.rattvarde = {
  text: 'Steg 15.1.33: varje rätt får sitt grundvärde ur ingredienserna och arbetet, och en finare måltid får ett påslag. En rätt är värd mer än sina ingredienser, och en fest mer än en vardagsrätt',
  kor: () => {
    const ratter = SIM.RATT_SAKER, fel: string[] = [];
    for (const k of ratter) { const u = SIM.rattUr(k); if (!u) { fel.push(`${k} utan recept`); continue; } const ing = SIM.varuVarde(u.av) / u.ger; if (!(v(k) > ing)) fel.push(`${k} ${t(v(k))} mot ingredienserna ${t(ing)}`); }
    const lagade = ratter.filter(k => SIM.rattInfo(k)?.niva === 'lagad'), fester = ratter.filter(k => SIM.rattInfo(k)?.niva === 'fest');
    const maxLagad = Math.max(...lagade.map(v)), minFest = Math.min(...fester.map(v));
    const gryta = SIM.rattId('kott', 'gryta', 'lagad'), fin = SIM.rattId('kott', 'gryta', 'fin');
    return [
      [`varje rätt (${ratter.length}) är värd mer än sina ingredienser per portion${fel.length ? ': ' + fel.slice(0, 5).join(', ') : ''}`, fel.length === 0],
      [`köttgrytan (${t(v(gryta))}) är värd mer än det råa köttet (${t(v('kott'))}), och den fina (${t(v(fin))}) mer än den lagade`, v(gryta) > v('kott') && v(fin) > v(gryta)],
      [`den billigaste festen (${t(minFest)}) är värd mer än den dyraste vardagsrätten (${t(maxLagad)})`, minFest > maxLagad],
    ];
  },
};
