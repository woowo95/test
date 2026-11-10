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

SCENARIER.sjukfoljd = {
  text: 'Steg 9.5.4: febern sänker medvetandet, hostan orken och diarrén ökar törsten; den sjuke vilar när tecknen är tydliga och lägger sig med hög feber; kortet säger stadiet, notiserna följer insjuknandet, när det blir sämre och när hen blir frisk, och kopporna lämnar ärr',
  kor: () => {
    const { insjukna, sjukSteg, medvetande, torstDelar, sjukOrkar, ligger } = SIM;
    const s = createState(3, START), [p] = living(s).filter(q => SIM.ageOf(q, s.now) >= 20);
    const med0 = medvetande(p), torst0 = torstDelar(p).takt, ork0 = sjukOrkar(p, s.now);
    // lunginflammation: feber och hosta. Tecknen kommer, och sjukdomen förs fram till mitten
    insjukna(s, p, 'lunginflammation');
    s.now = p.sjuk!.tecken + 1; sjukSteg(s, p, 1, false, false); p.sjuk!.grad = 0.6;
    const med1 = medvetande(p), ork1 = sjukOrkar(p, s.now), lagg = ligger(p, s.now);
    p.sjuk = undefined;
    // magsjuka: diarré
    insjukna(s, p, 'magsjuka'); s.now = p.sjuk!.tecken + 1; sjukSteg(s, p, 1, false, false); p.sjuk!.grad = 0.6;
    const torst1 = torstDelar(p).takt;
    p.sjuk = undefined;
    const notiser = (s.notiser?.lista ?? []).filter(n => n.id === 'sjuk' || n.id === 'smitta').reduce((a, n) => a + n.n, 0); // raderna: notiser av samma slag slås ihop
    // kopporna: den som blir frisk får ärr
    const q = living(s).filter(x => x !== p && SIM.ageOf(x, s.now) >= 20)[0];
    insjukna(s, q, 'koppor'); s.now = q.sjuk!.tecken + 1; sjukSteg(s, q, 1, false, false); q.sjuk!.mot = 0.999; q.sjuk!.grad = 0;
    sjukSteg(s, q, 3600, true, false);
    const arr = !q.sjuk && !!q.arr?.some(a => a.d === 'huvud') && !!q.immun?.koppor;
    return [
      [`febern sänker medvetandet (${med0.toFixed(2)} → ${med1.toFixed(2)}) och hostan orken (${ork0.toFixed(2)} → ${ork1.toFixed(2)})`, med1 < med0 - 0.05 && ork1 < ork0],
      ['med hög feber lägger hen sig', lagg],
      [`diarrén ökar törsten (${torst0.toFixed(3)} → ${torst1.toFixed(3)} i timmen)`, torst1 > torst0 * 1.2],
      [`notiserna följer sjukdomen (${notiser})`, notiser >= 2],
      ['den som överlevt kopporna har ärr och är immun', arr],
    ];
  },
};

SCENARIER.epidemi = {
  lang: true,
  text: 'Steg 9.5.5: mässlingen och kopporna kommer bara utifrån, med handlare och främlingar (några procent per besök, mässlingen vanligast). Kopporna följs genom samma by med och utan kunskapen Smittan: den som kan den håller sig undan och lägger de sjuka för sig, så färre blir sjuka. Kunskapen lärs när flera i samma hus blir sjuka, och krönikan skriver om epidemin',
  kor: () => {
    const { insjukna, barSmitta } = SIM;
    // risken utifrån
    const r = createState(9, START); let bar = 0, mass = 0;
    for (let i = 0; i < 4000; i++) { const k = barSmitta(r); if (k) { bar++; if (k === 'massling') mass++; } }
    // samma by utan och med kunskapen, i sex dygn (sex år i spelet)
    const kor = (vet: boolean) => {
      const s = createState(21, START);
      if (vet) for (const q of living(s)) SIM.learnK(q, 'smitta', 1, s.now);
      const [p] = living(s).filter(q => SIM.ageOf(q, s.now) >= 18);
      insjukna(s, p, 'koppor');
      for (let h = 0; h < 6 * 24; h++) for (let k = 0; k < 12; k++) SIM.step(s, 300);
      return { s, smittade: Number(s.stat?.smittad_koppor ?? 0), larde: Number(s.stat?.larSmittan ?? 0), epidemi: (s.hist?.kronika ?? []).some(([, t]) => t.startsWith('Kopporna gick genom byn')) };
    };
    const utan = kor(false), med = kor(true);
    return [
      [`en handlare eller främling bär ibland en sjukdom (${(bar / 40).toFixed(1)} % av besöken, ${Math.round(mass / Math.max(1, bar) * 100)} % mässlingen)`, bar > 40 && bar < 250 && mass > bar / 2],
      [`med kunskapen Smittan blir färre sjuka (${med.smittade} mot ${utan.smittade} utan)`, med.smittade < utan.smittade],
      [`utan kunskapen lär sig byn den när flera i samma hus blir sjuka, eller krönikan skriver om epidemin (lärde ${utan.larde}, epidemin ${utan.epidemi ? 'ja' : 'nej'})`, utan.larde > 0 || utan.epidemi],
    ];
  },
};

SCENARIER.lakekonst = {
  text: 'Steg 9.5.7: Läkekonst är en färdighet som växer när man vårdar en skadad, och den skicklige håller ett rengjort sår rent längre. En äldre sparning får färdigheten med noll',
  kor: () => {
    const s = createState(4, START), [p, q] = living(s).filter(x => SIM.ageOf(x, s.now) >= 20);
    const iReg = SIM.SKILLS.includes('lakekonst') && SIM.SKILL_NAMES.lakekonst === 'Läkekonst';
    const fore = p.skill.lakekonst;
    const sar = (inf: number): SIM.Skada => ({ d: 'armV' as SIM.Kroppsdel, k: 'skarsar' as SIM.SkadaTyp, g: 0.5, b: 0, inf });
    q.x = p.x; q.y = p.y;
    q.skador = [sar(0.1)];
    SIM.vardKlar(s, p, { act: 'varda', phase: 'do', tx: q.x, ty: q.y, until: s.now, carry: 0, ref: q.id });
    const ren0 = (q.skador[0].ren ?? s.now) - s.now, vaxte = p.skill.lakekonst > fore;
    p.skill.lakekonst = 16; q.skador = [sar(0.1)];
    SIM.vardKlar(s, p, { act: 'varda', phase: 'do', tx: q.x, ty: q.y, until: s.now, carry: 0, ref: q.id });
    const ren1 = (q.skador[0].ren ?? s.now) - s.now;
    // en äldre sparning utan färdigheten
    const g = SIM.cloneState(s); g.v = 25; for (const x of g.people) delete (x.skill as Partial<Record<string, number>>).lakekonst; // sparad före uppgradering 26
    const m = SIM.migrate(JSON.parse(SIM.serialize(g)));
    const noll = m.people.every(x => x.skill.lakekonst === 0);
    return [
      ['Läkekonst finns i registret över färdigheter', iReg],
      [`den som vårdar får mer läkekonst (${fore.toFixed(2)} → ${p.skill.lakekonst === 16 ? '' : ''}${vaxte ? 'mer' : 'lika'})`, vaxte],
      [`den skicklige håller såret rent längre (${(ren0 / 3600e3).toFixed(1)} mot ${(ren1 / 3600e3).toFixed(1)} timmar)`, ren1 > ren0],
      ['en äldre sparning får läkekonsten med noll', noll],
    ];
  },
};

SCENARIER.vardratt = {
  text: 'Steg 9.5.9: rätten till vård. Vid Sammanhållning vårdas alla lika, vid Självförsörjning vårdar släkten sina egna först, vid Envälde går ledaren och hens släkt före, och vid Ättens växt barnen',
  kor: () => {
    const { vardRatt } = SIM;
    const s = createState(6, START), p = living(s).find(x => SIM.ageOf(x, s.now) >= 20)!;
    // en främling, en syster och ett barn (påhittade, bara för räkningen)
    const frammande: Person = { ...p, id: 99990, mother: -1, father: -2, partner: undefined, born: s.now - 30 * DAY };
    const syster: Person = { ...frammande, id: 99991, mother: p.mother ?? -5 };
    if (p.mother === undefined) p.mother = -5;
    const barn: Person = { ...frammande, id: 99992, born: s.now - 5 * DAY };
    const sed = (k: string, v: number) => { for (const x of Object.keys(s.seder.v)) (s.seder.v as Record<string, number>)[x] = 0; (s.seder.v as Record<string, number>)[k] = v; };
    sed('gemenskap', 1); const lika = vardRatt(s, p, frammande) === 1 && vardRatt(s, p, syster) === 1;
    sed('gemenskap', -1); const egen = vardRatt(s, p, syster) > vardRatt(s, p, frammande);
    sed('barn', 1); const barnFore = vardRatt(s, p, barn) > vardRatt(s, p, frammande);
    return [
      ['vid Sammanhållning vårdas alla lika', lika],
      ['vid Självförsörjning vårdas släkten först', egen],
      ['vid Ättens växt vårdas barnen först', barnFore],
    ];
  },
};
