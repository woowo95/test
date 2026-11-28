// ---------- kroken för följderna (steg 13.9.3, uppvaxt.ts) ----------
// Maten som ruttnar i förrådet blir en upplevelse (ruttnade), men lagret laddas före uppväxten. Lagret anropar kroken här,
// som uppvaxt.ts sätter, så att ingen importring uppstår. Filen importerar inget.
type S = any;
// Sedernas följder åt båda hållen (steg 15.1.159): alla = alla i byn var med om upplevelsen (uppvaxt.ts sätter den), och skogNara och
// viltNara säger om skog att fälla och vilt finns nära byn (skogsvard.ts sätter dem)
export const foljdKrok = { ruttnade: (_s: S) => {}, alla: (_s: S, _k: string) => {}, skogNara: (_s: S) => false, viltNara: (_s: S) => false };
