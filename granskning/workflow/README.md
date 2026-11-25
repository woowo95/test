# Workflow-chatten: granskningar

Den här mappen hör till chatten som bara granskar Samhällssimulatorn med workflows: många hjälpare som samtidigt spelar in, mäter, läser koden, tittar på bilderna och prövar varandras fynd. Chatten ändrar ingen kod i `src/`, `bildstil/` eller `test/` och publicerar inget. Bekräftade fel skrivs som nya steg i Färdplanen i designdokumentet; balans nämns för fasens Balans.

## Var saker ligger

- `sgin.ts` – inspelningsskriptet för rövaranfall (kopieras till `src/test/zz_sgin.ts` i en kopia av `fasb`).
- `insp/` – inspelningar, namn `<by>_<timmar>h_<rövare>r.json`, så att nästa granskning kan jämföra samma byar.
- `rapporter/` – granskningarnas rapporter, en fil per granskning med datum och commit på `fasb`.
- `skript/` – workflow-skript och egna hjälpskript.

## Så granskas den senaste koden

```
git fetch origin fasb
git worktree add ../wf-fasb origin/fasb   # utanför repot
cd ../wf-fasb && npm ci
cp <repo>/granskning/workflow/sgin.ts src/test/zz_sgin.ts
```

Ta bort kopian efteråt (`git worktree remove`). Aldrig två tunga tester samtidigt (fyra kärnor i molnet).

## Mallen: stridstestet (B.27–B.35)

1. **Inspelningar**, två i taget: `timeout 1800 node --import tsx src/test/zz_sgin.ts test/facit-byar/<by>.json.gz <timmar> <rövare> <ut.json>`.
   Byarna: 1-30 0,1 h 4; 4634-30 0,1 h 3; 1511-30 1,5 h 2; 1-40 0,1 h 10; 1511-25 0,1 h 6; 1-35 3 h 8; 4634-25 2,5 h 5.
   (I `fasb` 66bae34 saknas `4634-30.json.gz`; ta närmaste, t.ex. 4634-35, och skriv det i rapporten.)
2. **Workflow med fem granskare**, alla med schemat {sammanfattning, kansla, mal[{steg, uppfyllt: ja|delvis|nej|ej mätt, bevis}], fel[{titel, beskrivning, orsak fil:rad, allvar: fel|fult|smasak, losning}]}:
   - *takt*: tider (syns, anfall, första slaget, längd, borta), försök och träffar per person, vad man tål, hackig rörelse.
   - *taktik*: när byn ser gänget, om byn gör sig redo, raden, hjälparna, de gömda, vem som vinner och varför.
   - *koden*: stegens commitar (`git show <commit> -- src`): fel, gaffatejp, chanser per slag i stället för per tid, skillnad levande/ikapp, hårda regler om människornas val, onödigt invecklat.
   - *bilden*: `npm run build`, sparad by i sidan med Playwright (IndexedDB `samhallssimulatorn`, store `delar`, nycklar `egen/<del>` plus `egen` = {delar: [...]}, klockan med `page.clock`), anfall, zoom via `window.__byn` (cam.zoom, cam.x/y = ruta*16, layout()), 4–6 bilder i deviceScaleFactor 2. Fältet kansla är viktigast.
   - *matt*: `npm run strid -- 12 35` och `npm run trangsel`, tidsgräns 50 min var.
   Gemensam bakgrund: vad stegen skulle göra, förra granskningens siffror, Björns grund för striden (en sida vinner när den andra inte har någon kvar som slåss; kroppen avgör död och skada, modet flykt; farliga och lätta att följa, utspridda och inte i klunga; ingen gaffatejp; allt per tid) och att inga filer under `src` ändras.
3. **Skeptiker**: varje del med fynd av allvaret "fel" prövas av en skeptiker som försöker motbevisa dem (läser koden, räknar i inspelningarna) och säger om lösningen är gaffatejp. Bara det som håller blir steg.
4. **Svaret till Björn**: hur det känns, bättre/sämre sedan förra, nya steg med nummer, frågor, de bästa skärmbilderna.

## Senaste resultat att jämföra med (före B.43–B.57)

Gänget syns 4–31 s efter ankomsten, anfaller efter 3,1–5,5 min, hela anfallet 7–13 min; 41–48 % träffar, medianskada per träff 0,01, man flyr efter 13–32 träffar; 1 av 12 föll av kroppen, ingen dog; 3 av 7 anfall utan strid. Felen blev B.43–B.57.

## Referensinspelning

`insp/1-30_0.1h_4r.json` – `fasb` 66bae34 (B.56), by 1-30, 0,1 h fram, 4 rövare: 516 bilder, 0 stridsrader, 735 s. Sedda efter 161 s (Frörhild varnade, tio hörde), plundrade förrådet vid 541 s utan strid, flydde.
