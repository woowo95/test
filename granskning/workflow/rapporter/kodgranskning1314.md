# Kodgranskningen av fas 13 och 14 (varld 7978df68)

Workflow `skript/kodgranskning1314.js` (körning wf_b8ebce0d-f85): fem granskare (företagen och ekonomin, striden, valet och arbetet, byn, gränssnittet och testerna) och en skeptiker per del. Fas 13 och 14 är 83199587~1..7488f1f3: 242 filer, omkring 13 700 nya rader i src. Allt underlag, med skeptikernas domar: `kodgranskning1314-underlag.md`.

29 fynd höll. 1 föll: järngruvorna i TAKTER är inte fel.

## Steg i Färdplanen (15.1.171–15.1.188)
- Buggar: 171 statistiken räknas dubbelt (forstaGang), 177 kläderna skyddar inte mot klorna, 178 lägret delar aldrig ut ringbrynjan, 179 NaN i rollen vid rövarlarmet, 181 toan avbryter den som fryser farligt varje slag (omkring 37 % av datortiden i de byar där det händer), 184 de sjuka läggs aldrig i rummets ände, 185 vakarna fryser aldrig igen, 188 färdens ruta på världskartan står still.
- Mot dokumentet: 173 marknadens "har över" går en egen väg, 187 pergamentkartan syns inte i spelet.
- Optimering (samma spel): 174 kopval (49 ms per person och val), 176 rövarens platsvärden, 182 faltNu, akel och varmarePlagg.
- Sammanslagning och död kod (samma spel): 175 företagens dubbletter, 180 vem som kan slåss och iStriden, 183 den mogna maten och mjärdarna, 186 historikKolumner, fargMin, BILDSTEN utanför balans(), myrVatten i nyckeln och PLAGG_FALT.barsele.
- Balansfråga: 172 gästen utan köp ger −1 i stället för FRYKTE.utan.

## Frågor till Björn (Frågor och val, systemet kg1314)
wf17 skyddet mot klorna, wf18 om färgkartan ska finnas kvar bredvid pergamentet.

## Siffror
- npm run kostnad, 24 byar i 120 minuter i spelet: 16,3–17,3 ms per minut och by; vilan 33–34 %. Utan de två byarna med toa-loopen: 11,8 ms.
- Ekonomin i 1511-45: kopval 2,7 % av datortiden, foretagsgastSteg 0,4 %.
- Pergamentet: ritaPergament 1,2 s per bild, ritaVarld 45 ms.
