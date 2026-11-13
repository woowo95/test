// krokarna mellan stationernas eldar (stationseld.ts) och matlagningen (matlagning.ts, som sätter dem): en egen fil utan importer,
// så att det inte spelar någon roll vilken av filerna som läses först (steg 10.2.85)
export const bakKrok = { passivTim: () => 25 / 60 };
export const rokKrok = { dygn: () => 1 };
