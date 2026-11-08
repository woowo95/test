// Sjukdomarna (steg 9.5.1–9.5.2): registret SJUKDOMAR och sjukdomen mot motståndet
import { createState, living, DAY, type Person } from '../../sim';
import * as SIM from '../../sim';
import { START } from '../kor';
import { SCENARIER } from './hjalp';

SCENARIER.sjukdom = {
  text: 'Steg 9.5.1–9.5.2: varje sjukdom är en rad i SJUKDOMAR med orsak, smitta, inkubation, längd, stadier, följder, vård, dödlighet per ålder och immunitet. Sjukdomen och motståndet växer båda; vinner sjukdomen dör man av den, annars blir man frisk, och immun efter mässlingen och kopporna',
  kor: () => {
    const { SJUKDOMAR, SJUK_IDS, insjukna, sjukSteg, isSick, sjukText } = SIM;
    const s = createState(3, START), mall = living(s).find(p => SIM.ageOf(p, s.now) >= 20 && SIM.ageOf(p, s.now) < 40)!;
    const ratt = SJUK_IDS.length === 7 && SJUK_IDS.every(k => { const d = SJUKDOMAR[k]; return d.namn && d.orsak.length && d.inkubation[1] >= d.inkubation[0] && d.langd[1] >= d.langd[0] && d.stadier.length && d.vard.length && 'barn' in d.dod; });
    // en person av en viss ålder, mätt, varm och utvilad, som går igenom sjukdomen: sover en tredjedel av dygnet, annars vilar hen
    const prov = (k: SIM.SjukId, alder: number, n: number) => {
      let dog = 0, frisk = 0, dygn = 0;
      for (let i = 0; i < n; i++) {
        const p: Person = { ...mall, id: 9000 + i, born: s.now - alder * DAY, sjuk: undefined, immun: undefined, hunger: 1, warm: 1 };
        const t0 = s.now;
        insjukna(s, p, k);
        let tid = 0;
        while (p.sjuk && tid < 40 * DAY) { s.now += 600e3; tid += 600e3; if (sjukSteg(s, p, 600, (tid / 3600e3) % 24 < 8, false)) { dog++; break; } }
        if (!p.sjuk && !(dog > 0 && i === dog - 1)) { frisk++; dygn += (s.now - t0) / DAY; }
        s.now = t0;
      }
      return { dog: dog / n, frisk, dygn: frisk ? dygn / frisk : 0 };
    };
    const fork = prov('forkylning', 30, 40), koppVux = prov('koppor', 30, 60), lungGam = prov('lunginflammation', 70, 60), lungVux = prov('lunginflammation', 30, 60);
    // inkubationen döljer sjukdomen, och stadiet står i kortet
    const q: Person = { ...mall, id: 9999, sjuk: undefined, immun: undefined };
    insjukna(s, q, 'massling');
    const dold = !isSick(q, s.now) && isSick(q, q.sjuk!.tecken + 1);
    const text = sjukText(q).startsWith('Mässlingen');
    // immun efter mässlingen: blir inte sjuk igen
    q.sjuk = undefined; q.immun = { massling: 1 };
    const immun = !insjukna(s, q, 'massling');
    return [
      [`registret har sju sjukdomar med alla delar (${SJUK_IDS.join(', ')})`, ratt],
      [`en frisk vuxen blir frisk från förkylningen och dör inte (${fork.frisk} av 40 friska, i snitt ${fork.dygn.toFixed(1)} dygn, ${Math.round(fork.dog * 100)} % döda)`, fork.dog === 0 && fork.frisk === 40 && fork.dygn > 1 && fork.dygn < 4],
      [`kopporna dödar ungefär var tredje vuxen, färre när hen vilar (${Math.round(koppVux.dog * 100)} %)`, koppVux.dog > 0.05 && koppVux.dog < 0.45],
      [`lunginflammationen dödar fler gamla än vuxna (${Math.round(lungGam.dog * 100)} % mot ${Math.round(lungVux.dog * 100)} %)`, lungGam.dog > lungVux.dog],
      ['inkubationen döljer sjukdomen, och kortet säger stadiet', dold && text],
      ['den som haft mässlingen blir inte sjuk i den igen', immun],
    ];
  },
};

SCENARIER.smitta = {
  text: 'Steg 9.5.3: varje timme prövas de som står bredvid en sjuk, är i samma rum eller sitter vid samma eld med sjukdomens smitta. Inkubationen döljer sjukdomen så att den hinner spridas, den som är immun smittas inte, och det som inte smittar sprids inte',
  kor: () => {
    const { insjukna } = SIM;
    // en by där en vuxen får mässlingen; en annan är immun. Byn följs i två dygn (två år i spelet)
    const s = createState(5, START), folk = living(s), [p, imm] = folk.filter(q => SIM.ageOf(q, s.now) >= 18);
    imm.immun = { massling: 1 };
    insjukna(s, p, 'massling');
    let doldSmittad = 0;
    kor2(s, 48, () => { for (const q of living(s)) if (q.sjuk?.av !== undefined && !SIM.isSick(q, s.now)) doldSmittad = Math.max(doldSmittad, 1); });
    const smittade = Number(s.stat?.smittad_massling ?? 0);
    const immunFri = imm.sjuk?.k !== 'massling';
    // matförgiftningen smittar inte
    const m = createState(5, START), [mp] = living(m).filter(q => SIM.ageOf(q, m.now) >= 18);
    insjukna(m, mp, 'matforgiftning');
    kor2(m, 24);
    const ingen = (m.stat?.smittad_matforgiftning ?? 0) === 0;
    return [
      [`mässlingen sprids i byn (${smittade} smittade, ${folk.length} i byn från början)`, smittade >= 2],
      ['den som smittats har först inga tecken (inkubationen)', doldSmittad > 0],
      ['den som är immun smittas inte', immunFri],
      ['matförgiftningen smittar inte', ingen],
    ];
  },
};
// kör byn h timmar, med fn efter varje timme
function kor2(s: SIM.State, h: number, fn?: () => void) { for (let i = 0; i < h; i++) { for (let k = 0; k < 12; k++) SIM.step(s, 300); fn?.(); } }
