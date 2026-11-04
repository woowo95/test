// Mobil och surfplatta (steg 5.3.7): det som visas när man håller musen över något (title) kommer fram när man trycker.
// Ett tryck med fingret på något som har en förklaring visar den i en liten ruta vid fingret, tills man trycker någon
// annanstans eller efter TIPS_SEK sekunder. Knappen gör samtidigt det den annars gör.
const TIPS_SEK = 4;
const ruta = document.createElement('div');
ruta.className = 'tip trycktips'; ruta.hidden = true;
document.body.appendChild(ruta);
let slut: number | undefined;
function dolj() { ruta.hidden = true; if (slut !== undefined) clearTimeout(slut); slut = undefined; }
document.addEventListener('pointerup', e => {
  if (e.pointerType !== 'touch') return;
  const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[title]');
  const text = el?.title.trim();
  if (!el || !text || el.closest('#map canvas')) { dolj(); return; }
  ruta.textContent = text;
  ruta.hidden = false;
  const b = ruta.offsetWidth, h = ruta.offsetHeight, m = 8;
  ruta.style.left = `${Math.max(m, Math.min(e.clientX - b / 2, innerWidth - b - m))}px`;
  ruta.style.top = `${e.clientY - h - 24 < m ? e.clientY + 24 : e.clientY - h - 24}px`;
  if (slut !== undefined) clearTimeout(slut);
  slut = window.setTimeout(dolj, TIPS_SEK * 1000);
}, true);
