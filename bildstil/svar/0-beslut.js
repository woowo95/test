// Björns svar i valdelen: de val som är bestämda flyttas till Valt (BESLUT) tills de byggts in i spelet.
// Inbyggda i steg 8.10.1 och borttagna ur valdelen: lagertonen, nattens färger, den som brinner och siffrorna (fas 6), zzz
// över den som sover (8.1.1), ryggsäcken, linfröna, huset på filten, tvålen, röllekan, läderrustningen, sländan, bältet,
// benlimmet, byxorna, skjortan och tjäran (fas 7). Deras dokument i samlingen 'val' är borttagna. Tjärans version 3 sparas
// till något annat, som Björn bad om: bilder/lerflaska.json.
(() => {
  const INBYGGT = ['f6_lagerton', 'f6_nattfarg', 'f8_zzz', 'f7_ryggsack', 'f7_linfron', 'f7_hus', 'f7_tval', 'f7_rolleka', 'f7_laderrustning', 'f7_slanda', 'f6_brinner', 'f6_siffror', 'f7_balte', 'f7_benlim', 'f7_byxor', 'f7_skjorta', 'f7_tjara'];
  for (let i = VAL.length - 1; i >= 0; i--) if (INBYGGT.includes(VAL[i].id)) VAL.splice(i, 1);
})();
