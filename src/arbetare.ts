// Arbetaren som räknar ikapp (steg 12.1.178): en Web Worker. build.mjs bygger filen för sig och lägger den i sidan
// (#arbetarKod i template.html), och catchUp i ui/spara.ts startar den. Den räknar byn i bitar om BIT_MS, skickar byns tid
// efter varje bit, en ögonblicksbild högst en gång i sekunden när snabbspolningen syns (och var SPARA_MS för att sidan ska
// kunna spara byn under tiden), och hela byn när den är ikapp eller en stor strid börjar.
import { spar, stridBild } from './sim';
import { FranArbetaren, IkappKarna, TillArbetaren } from './ui/ikappkarna';

const BIT_MS = 100, BILD_MS = 1000, SPARA_MS = 15000; // datorns tid
const ut = (m: FranArbetaren) => (self as unknown as Worker).postMessage(m);
spar.pa = false; stridBild.pa = false; // vägarna och slagen sparas bara för bilden, som inte ritas här
let karna: IkappKarna | undefined, bild = false, skickad = 0;
// nästa bit efter att meddelandena från sidan fått komma fram (snabbspolningen slås på och av)
const kanal = new MessageChannel();
kanal.port1.onmessage = () => bit();
function bit() {
  const k = karna; if (!k) return;
  try {
    const klar = k.bit(BIT_MS);
    if (klar) { karna = undefined; ut({ typ: 'klar', delar: k.delar() }); return; }
    ut({ typ: 'forlopp', nu: k.s.now });
    const t = performance.now();
    if (t - skickad >= (bild ? BILD_MS : SPARA_MS)) { skickad = t; ut({ typ: 'by', delar: k.delar() }); }
    kanal.port2.postMessage(0);
  } catch (e) { karna = undefined; ut({ typ: 'fel', text: String(e instanceof Error ? e.stack ?? e.message : e) }); }
}
self.onmessage = (e: MessageEvent<TillArbetaren>) => {
  const m = e.data;
  if (m.typ === 'start') {
    try { karna = new IkappKarna(m.delar, m.mal); } catch (e) { ut({ typ: 'fel', text: String(e) }); return; }
    bild = m.bild; skickad = performance.now(); bit();
  } else bild = m.bild;
};
