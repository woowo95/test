# Samhällssimulatorn

En by som lever i verklig tid över många generationer: TypeScript och PixiJS, byggd till en enda HTML-fil som publiceras som artefakt.

- Spelet: https://claude.ai/artifact/TdCUKPj4wC55BVGq7db14n
- Designdokument: https://claude.ai/artifact/McP5446XiGQaJ3hbs9YXrc

## Filer

Simuleringen ligger i `src/sim/`, gränssnittet i `src/ui/` och startpunkten i `src/main.ts`. Sidans HTML och CSS finns i `src/template.html` och testerna i `src/test/`. `ARKITEKTUR.md` beskriver varje fil och hur man lägger till nya saker.

## Bygga och testa

```
npm install
npm run build   # ger samhallssimulatorn.html
npm run koll    # typkontroll, testbyar, scenarier och samma-kollen på en gång
```

Publicera alltid till samma artefakt-URL så att den sparade byn och länken finns kvar.
