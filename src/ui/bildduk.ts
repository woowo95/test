// En pixelbild (rader och palett) ritad punkt för punkt på en egen duk (kodgenomgången 165 och 207): runstenarna, vågbandet,
// panelernas hörn och världskartans tecken. En punkt i bilden är en punkt på duken; '.' och tecken utan färg lämnas tomma.
// Behöver document, så den ligger för sig och läses aldrig av testerna. Varje fil har kvar sitt eget minne av färdiga bilder
export interface Pixelbild { w?: number; h?: number; rader: readonly string[]; pal: Record<string, string> }
export function bildDuk(b: Pixelbild, o: { speglaX?: boolean; speglaY?: boolean; bakgrund?: string } = {}) {
  const w = b.w ?? b.rader[0]?.length ?? 0, h = b.h ?? b.rader.length;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  if (o.bakgrund) { g.fillStyle = o.bakgrund; g.fillRect(0, 0, w, h); }
  b.rader.forEach((rad, y) => { for (let x = 0; x < rad.length; x++) { const k = rad[x]!, f = k !== '.' && b.pal[k]; if (f) { g.fillStyle = f; g.fillRect(o.speglaX ? w - 1 - x : x, o.speglaY ? h - 1 - y : y, 1, 1); } } });
  return c;
}
