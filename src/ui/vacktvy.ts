// ---------- vyn i en väckt by (steg 11.13.11, Flera samhällen: Den väckta byn i tal) ----------
// Medan egna bybor är på besök i en väckt by har sällskapets rad på världskartan knappen Gå in. Den visar den byn i hela
// spelet: kartan, folket och panelerna är byns, med byns namn i sidhuvudet och knappen Hem bredvid. Huvudbyn räknas som förut
// under tiden (main.ts) och sparas; Hem, ikappräkningen, testläget eller att byn somnar visar huvudbyn igen.
import { byPlats, bynsNamn, type State } from '../sim';
import { gaHem, hem, s, vidVy } from './lage';

// namnet i sidhuvudet: den väckta byns plats i världen, annars byns eget namn
export function visatNamn(b: State = s): string {
  if (hem && b.vackt !== undefined && b.varld) return byPlats(b.varld, b.vackt)?.namn ?? bynsNamn(b);
  return bynsNamn(b);
}

const knapp = document.createElement('button');
knapp.type = 'button'; knapp.id = 'vyHem'; knapp.className = 'nyckel calknapp'; knapp.hidden = true;
knapp.title = 'Hem: tillbaka till den egna byn'; knapp.setAttribute('aria-label', 'Hem');
knapp.textContent = '🏠';
document.getElementById('bynamn')?.after(knapp);
knapp.addEventListener('click', () => gaHem());
vidVy.push(() => { knapp.hidden = !hem; });
