// Vakten för knappar som täcker annat (steg 12.1.51, en av vakterna för formen i steg 12.1.43): en knapp som ligger ovanpå
// något annat som syns, till exempel zoomens +, − och Byn över kolonisternas kort när panelen är öppen. Mätningen görs i sidan
// (TACK_MATA, en text som utseende.ts kör med page.evaluate): för varje knapp som syns prövas punkter i den, och det som ligger
// under knappen i samma punkt och varken är knappens förälder eller dess barn är det som täcks. Kartans canvas och tomma ytor
// räknas inte; bara det som har text eller en bild. Svaret är en rad per knapp och det den täcker
export const TACK_MAX = 6; // så här många exempel
export const TACK_MATA = `(() => {
  const syns = el => { const st = getComputedStyle(el); return st.visibility !== 'hidden' && st.display !== 'none' && +st.opacity > 0.05; };
  const namn = el => (el.getAttribute('aria-label') || el.title || el.textContent || el.className || el.tagName).trim().replace(/\\s+/g, ' ').slice(0, 24);
  const innehall = el => el.tagName === 'IMG' || [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  const tackande = el => { const m = /rgba?\\(([^)]+)\\)/.exec(getComputedStyle(el).backgroundColor); const a = m ? m[1].split(',').map(Number) : [0, 0, 0, 0]; return (a.length < 4 || a[3] > 0.9) && el !== document.body && el !== document.documentElement; };
  const ut = [];
  for (const b of document.querySelectorAll('button, [role="button"]')) {
    const r = b.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || !syns(b)) continue;
    const tackt = new Set();
    for (const [fx, fy] of [[0.5, 0.5], [0.15, 0.2], [0.85, 0.2], [0.15, 0.8], [0.85, 0.8]]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const stack = document.elementsFromPoint(x, y), i = stack.findIndex(e => e === b || b.contains(e));
      if (i < 0) continue; // knappen ligger själv under något
      for (const e of stack.slice(i + 1)) {
        if (e.contains(b)) { if (tackande(e)) break; continue; } // det som ligger under en ogenomskinlig förälder syns inte
        if (b.contains(e) || e.tagName === 'CANVAS' || e.closest('[aria-hidden="true"]') || !syns(e) || !innehall(e)) continue; // en dekoration (bandet) räknas inte
        if (e.closest('button, [role="button"]') && e.closest('button, [role="button"]').contains(b)) continue;
        tackt.add(namn(e));
      }
    }
    if (tackt.size) ut.push(namn(b) + ' täcker ' + [...tackt].slice(0, 3).join(', '));
  }
  return ut;
})()`;
