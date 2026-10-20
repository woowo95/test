# Samhällssimulatorn

En by som lever i verklig tid över många generationer: TypeScript och PixiJS, byggd till en enda HTML-fil som publiceras som artefakt.

- Spelet: https://claude.ai/artifact/TdCUKPj4wC55BVGq7db14n
- Designdokument: https://claude.ai/artifact/McP5446XiGQaJ3hbs9YXrc

## Filer

| Fil | Innehåll |
|---|---|
| `src/sim.ts` | Hela simuleringen utan grafik: karta, personer, behov, arbete, samtal, födsel, död, utflyttning, tidsmodell |
| `src/main.ts` | Grafik (PixiJS), panel, zoom och panorering, ikappräkning, testläge, sparning |
| `src/template.html` | Sidans HTML och CSS; skriptet bakas in vid bygget |
| `src/test.ts` | Kör 90 dygn utan grafik för tre världar och skriver ut befolkning, mat och dödsorsaker |
| `build.mjs` | Bygger `samhallssimulatorn.html` |

## Bygga och testa

```
npm install
npm run build   # ger samhallssimulatorn.html
npm test        # 90 dygns testkörning
```

Publicera alltid till samma artefakt-URL så att den sparade byn och länken finns kvar.
