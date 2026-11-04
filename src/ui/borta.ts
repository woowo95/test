// Sammanfattningen efter ikappräkningen (steg 5.4.3.4): bara tiden, talen och hur många notiser som är nya, med en knapp
// till genomgången av notiserna (ui/notiser.ts). Det som hänt läses där, en sak i taget, i stället för en lång lista här.
// ui/spara.ts räknar ikapp och visar rutan; den här filen bygger bara innehållet, så att ett scenario kan läsa det.
import { Borta, DAY, living, olasta } from '../sim';
import { durTxt, num } from './hjalp';
import { s } from './lage';

export function bortaHtml(b: Borta) {
  const years = (s.now - b.fran) / DAY;
  const fodda = (s.stat?.fodda ?? 0) - b.fodda, doda = (s.stat?.doda ?? 0) - b.doda;
  // den verkliga tiden och tiden i spelet (ett dygn är ett år), minst en månad
  const man = Math.max(1, Math.round(years * 12));
  const yrs = years >= 1 ? `${num(years)} år` : `${man} ${man === 1 ? 'månad' : 'månader'}`;
  const n = olasta(s);
  return `
    <p class="ovLead">Medan du var borta gick ${durTxt(s.now - b.fran)} (${yrs} i spelet).</p>
    <p class="muted">${fodda} födda · ${doda} döda · ${living(s).length} lever nu i byn</p>
    <p class="ovNotiser">{sym_notis} ${n ? `${n} ${n === 1 ? 'ny notis' : 'nya notiser'}` : 'Inga nya notiser'}</p>
    <div class="ovKnappar">${n ? '<button id="ovNotiser" class="primary" type="button" data-notis="visa">Läs notiserna</button>' : ''}
    <button id="ovClose" class="${n ? '' : 'primary'}" type="button">Till byn</button></div>`;
}
