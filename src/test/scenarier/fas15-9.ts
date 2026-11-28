// Scenarier för fas 15, grupp 9 (steg 15.1.96–15.1.104).
import * as SIM from '../../sim';
import { SCENARIER, testBy } from './hjalp';

SCENARIER.affarstyrka = {
  text: 'Steg 15.1.96: affären byggs på det ägaren kan. En skicklig hantverkare som kan göra vattensäckar av skinnen i byn (det alla saknar) öppnar en affär som säljer dem och heter efter dem, och en bybo som varken har något över eller kan göra något öppnar ingen',
  kor: () => {
    const s = SIM.cloneState(testBy(25)); s.foretag = [];
    const K = 'vattensack', tek = SIM.SAKER[K]!.skaffa!.tek!;
    const vux = SIM.living(s).filter(q => !q.gast && SIM.ageOf(q, s.now) >= SIM.ALDER.vuxen);
    const p = vux[0]!, q = vux.find(x => x !== p && !SIM.familjOf(s, p.id).includes(x))!;
    for (const x of SIM.living(s)) if (x.tek) delete x.tek[tek]; // bara hantverkaren kan göra vattensäckar
    (p.tek ??= {})[tek] = 1;
    const sk = SIM.fardighetFor(s, p, K); p.skill[sk] = 16; p.skill.handel = 6; q.skill[sk] = 16;
    SIM.setAmount(s, 'skinn', 20); SIM.setAmount(s, 'rep', 10);
    for (const x of vux) SIM.laggIn(s, 'silver', x === p || x === q ? 400 : 200, x.id);
    s.ting = (s.ting ?? []).filter(t => t.k !== K);
    for (const x of SIM.living(s)) x.bruk = undefined;
    const alla = SIM.living(s).filter(x => !x.gast && x !== p && SIM.saknarNu(s, x).includes(K)).length;
    const kan = SIM.kanSkaffaVaror(s, p, [K]).length > 0, kanInte = SIM.kanSkaffaVaror(s, q, [K]).length === 0;
    const varor = SIM.VERKSAMHETER.affar.varor(s, p.id), ingen = SIM.VERKSAMHETER.affar.varor(s, q.id).filter(k => !SIM.personPart(s, q).over([]).some(w => w.k === k));
    const pp = SIM.startPoang(s, p.id, ['affar']).poang;
    // den andra: inget över och inget hen kan göra
    const qOver = () => { s.ting = (s.ting ?? []).filter(t => t.agare !== q.id); for (const a of s.stackar ?? []) if (a.ag?.[q.id]) delete a.ag[q.id]; SIM.laggIn(s, 'silver', 400, q.id); };
    qOver(); const qVaror = SIM.VERKSAMHETER.affar.varor(s, q.id), qp = SIM.startPoang(s, q.id, ['affar']).poang;
    p.skill[sk] = 0; const osk = SIM.startPoang(s, p.id, ['affar']).poang; p.skill[sk] = 16;
    const f = SIM.starta(s, p.id, ['affar']);
    return [
      [`${alla} bybor saknar en vattensäck`, alla >= 3],
      [`hantverkaren kan göra vattensäckar, med färdigheten ${sk}; den andra kan inte`, kan && kanInte],
      [`hantverkarens affär kan sälja vattensäckar (${varor.join(', ')})`, varor.includes(K) && !ingen.includes(K)],
      [`den som varken har något över eller kan göra något har inga varor (${qVaror.join(', ') || 'inga'})`, qVaror.length === 0],
      [`hantverkarens poäng är positiv (${pp.toFixed(2)}), den andras inte (${qp.toFixed(2)})`, pp > 0 && qp <= 0],
      [`skickligheten ger mer (${pp.toFixed(2)} mot ${osk.toFixed(2)} utan den)`, pp > osk],
      [`affären heter efter vattensäckarna (${f.namn})`, /vattensäckar$/.test(f.namn)],
    ];
  },
};
