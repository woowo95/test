// Det som hör ihop bryts inte isär (steg 13.10.37, Kartbilden och panelerna): ett ställe för alla paneler. När en panel skrivits
// hålls talet ihop med sin enhet (54 %, 11 dygn), egenskapen med sitt tal (Andlighet −0,8), symbolen med sitt antal, knappen
// sist på raden med ordet före, och skiljetecknet med det som står före det. Talet och sakens namn (26 plankor) får brytas.
// passa krymper det som ska stå på en rad (data-passa: personens namn, rutans rubrik) tills det får plats (steg 13.10.31, 13.10.34)
const NB = '\u00a0';
const ENHET = /(\d) (?=(?:%|dygn|år|månad|månader|veckor?|timm(?:e|ar)|minut(?:er)?|min|kg|grader|°)(?![\p{L}]))/gu;
const TECKEN = /(\p{L}) (?=[+−]\d)/gu; // egenskapen och dess tal
const FORE = / (?=[·⇄])/g; // skiljetecknet står med det före
const SKILJE = /^[\u00a0]?[.,:;)…!?]+/;
const SYMBOL = 'img, svg, canvas';
export function hallIhopText(t: string) { return t.replace(ENHET, '$1' + NB).replace(TECKEN, '$1' + NB).replace(FORE, NB); }
const rad = (el: Element) => /^(block|inline|list-item|inline-block|table-cell)$/.test(getComputedStyle(el).display);
export function hallIhop(rot: HTMLElement) {
  const texter: Text[] = [], w = document.createTreeWalker(rot, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) texter.push(w.currentNode as Text);
  for (const n of texter) { const t = hallIhopText(n.data); if (t !== n.data) n.data = t; }
  // knapparna och symbolerna i texten: det sista ordet före, knappen och skiljetecknet efter i en bit som inte bryts. En symbol
  // hålls bara ihop med ett tal eller en text i samma led
  for (const el of rot.querySelectorAll<HTMLElement>('button, ' + SYMBOL)) {
    const p = el.parentElement!;
    if (el.closest('button, svg') !== (el.matches('button') ? el : null) && !el.matches(SYMBOL)) continue;
    if (el.parentElement!.closest('svg, .ihop') || !rad(p)) continue;
    const knapp = el.matches('button'), fore = el.previousSibling, efter = el.nextSibling;
    const ft = fore instanceof Text ? fore.data : '', et = efter instanceof Text ? efter.data : '';
    const sist = knapp && !el.textContent!.trim() ? /\S+\s?$/.exec(ft) : null; // en knapp som bara är en symbol står med ordet före
    const tal = !knapp ? /^\s?[−+]?\d\S*/.exec(et) : null, skilje = SKILJE.exec(et);
    if (!sist && !tal && !skilje) continue;
    const ihop = document.createElement('span');
    ihop.className = 'ihop';
    p.insertBefore(ihop, el);
    if (sist) { (fore as Text).data = ft.slice(0, sist.index); ihop.append(sist[0]); }
    ihop.append(el);
    const med = tal?.[0] ?? skilje?.[0];
    if (med) { (efter as Text).data = et.slice(med.length); ihop.append(med); }
  }
}
export function passa(rot: HTMLElement) {
  for (const el of rot.querySelectorAll<HTMLElement>('[data-passa]')) {
    el.style.fontSize = '';
    let px = parseFloat(getComputedStyle(el).fontSize);
    const min = Number(el.dataset.passa) || 11;
    while (px > min && el.scrollWidth > el.clientWidth) el.style.fontSize = `${--px}px`;
  }
}
// typsnittet laddas när det först behövs, och innan dess mäts ett annat: mät om när det kommit
if (typeof document !== 'undefined') document.fonts?.addEventListener?.('loadingdone', () => passa(document.body));
