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
