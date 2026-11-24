// ---------- kroken för följderna (steg 13.9.3, uppvaxt.ts) ----------
// Maten som ruttnar i förrådet blir en upplevelse (ruttnade), men lagret laddas före uppväxten. Lagret anropar kroken här,
// som uppvaxt.ts sätter, så att ingen importring uppstår. Filen importerar inget.
type S = any;
export const foljdKrok = { ruttnade: (_s: S) => {} };
