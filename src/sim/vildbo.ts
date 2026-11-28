// hur rikt vildbinas lager måste vara för att ett bo ska finnas där (BIN.boSyns) och hur många kakor i timmen den som står vid
// boet tar (BIN.vildTim, steg 12.1.263). Satt av bin.ts och läst av fynd.ts; en egen fil utan importer, så att ingen
// importcirkel kan nå kroken innan den finns
export const vildboKrok = { syns: () => 0.6, tim: () => 6 };
