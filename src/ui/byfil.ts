// Byn som fil (steg 12.1.40, Teknisk plattform: Byn som fil). Byn ligger bara i spelarens webbläsare. I testläget går den att
// spara till en fil och läsa in igen som en ny by i listan under kugghjulet (laggTillBy i byar.ts). Filen är samma text som
// sparningen skriver (serialize, som är delarna i serializeParts hopsatta), så en chatt kan läsa den utan grafik med
// `npm run by -- fil` (src/test/by.ts) och se vad var och en gör och varför. Filen frågar bara simuleringen och rör aldrig byn
import { DAY, State, migrate, serialize } from '../sim';

// texten i filen: byn som sparningen skriver den
export const byTillFil = (s: State) => serialize(s);
// en by ur filens text; fel om texten inte är en by
export function lasByfil(text: string): State {
  const o = JSON.parse(text) as Partial<State>;
  if (!o || typeof o !== 'object' || !Array.isArray(o.people) || typeof o.seed !== 'number' || typeof o.now !== 'number') throw new Error('Filen är ingen by.');
  return migrate(o as State);
}
// filens namn: fröet, året i byn och datorns tid när den sparades
export const filnamn = (s: State) => `by-${s.seed}-ar${Math.floor((s.now - s.founded) / DAY)}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}.json`;
// namnet i listan över byar
export const listnamn = (s: State) => `By ${s.seed} ur fil, år ${Math.floor((s.now - s.founded) / DAY)}`;

// webbläsaren: filen laddas ner
export function laddaNer(s: State) {
  const url = URL.createObjectURL(new Blob([byTillFil(s)], { type: 'application/json' })), a = document.createElement('a');
  a.href = url; a.download = filnamn(s); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
// webbläsaren: spelaren väljer en fil, och dess text kommer tillbaka (undefined om ingen valdes)
export function valjFil(): Promise<string | undefined> {
  return new Promise(res => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json,text/plain';
    inp.addEventListener('change', () => { const f = inp.files?.[0]; if (!f) { res(undefined); return; } f.text().then(res, () => res(undefined)); });
    inp.click();
  });
}
