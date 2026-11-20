// Ikappräkningens kärna (steg 12.1.178): byn räknas i bitar, i arbetaren (src/arbetare.ts, en Web Worker) eller, där en
// arbetare inte går att starta, i sidan (catchUp i ui/spara.ts). Byn lämnas över som delarna i sparfilen men med talen
// oavrundade (overlamna i steg.ts), så att arbetaren räknar samma by som sidan och sidan får tillbaka exakt den by
// arbetaren räknat fram. Kärnan läser bara simuleringen, så att scenariot arbetare kan köra den utan webbläsare.
import { State, franOverlamning, nastaSteg, overlamna, step, storStridNu } from '../sim';

export type Overlamning = Record<string, string>;
// meddelandena mellan sidan och arbetaren
export type TillArbetaren = { typ: 'start'; delar: Overlamning; mal: number; bild: boolean } | { typ: 'bild'; bild: boolean };
export type FranArbetaren =
  | { typ: 'forlopp'; nu: number } // byns tid
  | { typ: 'by'; delar: Overlamning } // en ögonblicksbild: att rita i snabbspolningen och att spara
  | { typ: 'klar'; delar: Overlamning } // ikapp, eller en stor strid har börjat
  | { typ: 'fel'; text: string };

export class IkappKarna {
  readonly s: State;
  constructor(delar: Overlamning, readonly mal: number) { this.s = franOverlamning(delar); }
  // ikapp, eller en stor strid stannar räknandet (steg 8.8.9): striden visas i levande läge
  get klar() { return this.s.now >= this.mal || storStridNu(this.s); }
  // räknar högst ms millisekunder datortid, slag för slag som catchUp
  bit(ms: number) {
    const s = this.s, t0 = performance.now();
    while (s.now < this.mal && !storStridNu(s) && performance.now() - t0 < ms) step(s, nastaSteg(s));
    return this.klar;
  }
  delar(): Overlamning { return overlamna(this.s); }
}
