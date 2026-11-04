// Panelerna som ark nerifrån på en liten skärm (steg 5.3.7, Björns val 2026-11-04: "Som ark nerifrån"). Personens panel och
// flikens panel glider upp över kartans nedre halva, ett åt gången (panel.ts), och dras ned i greppet överst för att stängas.
// På en stor skärm ligger de som förut, till vänster och höger; greppet syns bara på den lilla.
import { smal, stang } from './panel';

const STANG = 80; // så många punkter nedåt stänger arket; kortare drag och det glider tillbaka
for (const [id, sida] of [['vPanel', 'v'], ['hPanel', 'h']] as const) {
  const el = document.getElementById(id)!;
  el.insertAdjacentHTML('afterbegin', '<div class="greppa" aria-hidden="true"><i></i></div>');
  const grepp = el.querySelector<HTMLElement>('.greppa')!;
  let fran: number | undefined, dy = 0;
  grepp.addEventListener('pointerdown', e => {
    if (!smal.matches) return;
    fran = e.clientY; dy = 0; grepp.setPointerCapture(e.pointerId); el.classList.add('dras');
  });
  grepp.addEventListener('pointermove', e => {
    if (fran === undefined) return;
    dy = Math.max(0, e.clientY - fran); el.style.transform = `translateY(${dy}px)`;
  });
  const slapp = () => {
    if (fran === undefined) return;
    fran = undefined; el.classList.remove('dras'); el.style.transform = '';
    if (dy > STANG) stang(sida);
  };
  grepp.addEventListener('pointerup', slapp);
  grepp.addEventListener('pointercancel', slapp);
}
