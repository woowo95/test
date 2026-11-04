// Bygger sidan Texterna (texter/texterna.html) av texter/forslag.json, som prova.ts skriver.
// Ett kort per rättelse, ny kontroll och mall. Björn svarar ja eller nej och kan skriva en kommentar;
// svaren sparas i sidans databas, samlingen 'val' (ett dokument per kort: { svar: 'ja' | 'nej', kommentar, nar }).
//   npx tsx texter/prova.ts texter/matning/texter-fore.json texter/matning/logg-*.json && node texter/bygg.cjs
const fs = require('fs');
const path = require('path');
const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'forslag.json'), 'utf8'));

const GRUPPNAMN = {
  '1a': 'hen blir han eller hon', '1b': 'Ändelser, genus och tal', '1c': 'Skälet i hedersnamn och öknamn',
  '1d': 'Artikeln i ryktena', '1e': 'Binamnen', '1f': 'Namnen', 'ord': 'Ord',
};
const kort = [];
for (const r of d.rattelser) {
  const g = r.grupp.split(' ')[0];
  kort.push({ id: 'r-' + r.id, del: 'rattelser', grupp: g, rubrik: GRUPPNAMN[g] || r.grupp, fil: r.fil, nu: r.nu, blir: r.blir, varfor: r.varfor, exempel: r.exempel || [] });
}
for (const k of d.kontroller) {
  const i = d.idag[k.id] || { n: 0, ex: [] };
  kort.push({ id: 'k-' + k.id, del: 'kontroller', rubrik: k.namn, antal: Math.round(i.n), ex: i.ex.slice(0, 5) });
}
for (const p of d.prov) {
  const v = d.varianter[p.mall] || {}; const m = d.mallar[p.mall] || {};
  kort.push({
    id: 'm-' + p.mall, del: 'mallar', mall: p.mall, ny: p.ny, fore: p.fore, efter: p.efter,
    varfor: v.varfor || (m.nu ? 'I dag en fast rad: ' + m.nu : ''), fil: m.fil || '', ta_bort: v.ta_bort || [],
    nya: p.varianter.filter(x => x.ny).map(x => ({ text: x.text, villkor: x.villkor, fel: x.fel })),
    gamla: p.varianter.filter(x => !x.ny).map(x => x.text),
  });
}
const data = JSON.stringify(kort).replace(/</g, '\\u003c');

const html = `<title>Texterna</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500;700&family=Alegreya+Sans:wght@400;500;700&family=IBM+Plex+Mono:wght@400&display=swap">
<style>
/* Layout: en smal lässpalt med kort under varandra; före/efter står bredvid varandra och staplas på mobilen. */
:root {
  --bg: #f2f3ee; --yta: #fbfbf8; --fg: #1e2722; --svag: #5d6a62; --linje: #d5dad2;
  --mossa: #3c6a4b; --mossa-ljus: #e1ece3; --rost: #9a4a2e; --rost-ljus: #f4e4dc; --gul: #8a6d1d;
  --rubrik: 'Alegreya', Georgia, serif; --text: 'Alegreya Sans', system-ui, sans-serif; --kod: 'IBM Plex Mono', ui-monospace, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #131915; --yta: #1b231e; --fg: #e3e8e2; --svag: #9aa79f; --linje: #2f3a33;
  --mossa: #8cc29b; --mossa-ljus: #213428; --rost: #e39a7c; --rost-ljus: #3a241c; --gul: #d8b860; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #131915; --yta: #1b231e; --fg: #e3e8e2; --svag: #9aa79f; --linje: #2f3a33;
  --mossa: #8cc29b; --mossa-ljus: #213428; --rost: #e39a7c; --rost-ljus: #3a241c; --gul: #d8b860; color-scheme: dark }
body { background: var(--bg); color: var(--fg); font: 17px/1.5 var(--text); }
main { max-width: 52rem; margin: 0 auto; padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 28px; }
h1, h2, h3 { font-family: var(--rubrik); text-wrap: balance; margin: 0; line-height: 1.2; }
h1 { font-size: 2.4rem; }
h2 { font-size: 1.6rem; }
h3 { font-size: 1.15rem; }
p { margin: 0; }
.ingress { display: grid; gap: 10px; max-width: 40rem; color: var(--svag); }
.ingress strong { color: var(--fg); }
.rad { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }
.raknare { font-variant-numeric: tabular-nums; }
.raknare b { font-size: 1.3rem; color: var(--fg); }
.filter button, .svar button { font: inherit; font-size: .95rem; border: 1px solid var(--linje); background: var(--yta); color: var(--fg); border-radius: 6px; padding: 6px 14px; cursor: pointer; }
.filter button[aria-pressed="true"] { background: var(--fg); color: var(--bg); border-color: var(--fg); }
button:focus-visible, textarea:focus-visible, summary:focus-visible { outline: 2px solid var(--mossa); outline-offset: 2px; }
#status { font-size: .9rem; color: var(--svag); }
section.del { display: grid; gap: 14px; }
.del > header { display: grid; gap: 4px; border-bottom: 2px solid var(--fg); padding-bottom: 6px; }
.del > header p { color: var(--svag); }
.grupp { font-size: .78rem; letter-spacing: .08em; text-transform: uppercase; color: var(--svag); margin-top: 10px; }
article { background: var(--yta); border: 1px solid var(--linje); border-left: 4px solid var(--linje); border-radius: 4px; padding: 16px 18px; display: grid; gap: 12px; min-width: 0; }
article.ja { border-left-color: var(--mossa); }
article.nej { border-left-color: var(--rost); }
.huvud { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; align-items: baseline; }
.fil { font-family: var(--kod); font-size: .78rem; color: var(--svag); overflow-wrap: anywhere; }
.varfor { color: var(--svag); }
.fore-efter { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 640px) { .fore-efter { grid-template-columns: 1fr; } }
.fore-efter > div { border-radius: 4px; padding: 10px 12px; display: grid; gap: 6px; min-width: 0; }
.fore { background: var(--rost-ljus); }
.efter { background: var(--mossa-ljus); }
.etikett { font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; }
.fore .etikett { color: var(--rost); }
.efter .etikett { color: var(--mossa); }
.mening { font-family: var(--rubrik); font-size: 1.05rem; }
code { font-family: var(--kod); font-size: .8rem; overflow-wrap: anywhere; color: var(--svag); }
.siffra { font-family: var(--rubrik); font-size: 1.4rem; font-variant-numeric: tabular-nums; }
.siffra small { font-family: var(--text); font-size: .85rem; color: var(--svag); }
ul.varianter { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
ul.varianter li { font-family: var(--rubrik); padding-left: 14px; position: relative; }
ul.varianter li::before { content: ''; position: absolute; left: 0; top: .65em; width: 6px; height: 6px; border-radius: 50%; background: var(--mossa); }
ul.varianter.gamla li::before { background: var(--linje); }
ul.varianter li.bort { text-decoration: line-through; color: var(--svag); }
.villkor { font-family: var(--text); font-size: .72rem; color: var(--gul); border: 1px solid currentColor; border-radius: 3px; padding: 0 4px; margin-left: 6px; vertical-align: 2px; }
details summary { cursor: pointer; color: var(--svag); font-size: .9rem; }
details[open] summary { margin-bottom: 6px; }
.svar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.svar button[data-svar="ja"][aria-pressed="true"] { background: var(--mossa); border-color: var(--mossa); color: var(--yta); }
.svar button[data-svar="nej"][aria-pressed="true"] { background: var(--rost); border-color: var(--rost); color: var(--yta); }
.svar button:disabled { opacity: .5; cursor: default; }
.sparat { font-size: .85rem; color: var(--svag); }
label.komm { display: grid; gap: 4px; font-size: .85rem; color: var(--svag); }
textarea { font: inherit; font-size: .95rem; color: var(--fg); background: var(--bg); border: 1px solid var(--linje); border-radius: 4px; padding: 6px 8px; resize: vertical; }
@media (prefers-reduced-motion: no-preference) { article { transition: border-color .2s; } }
</style>
<main>
  <header class="ingress">
    <h1>Texterna</h1>
    <p>Förslag till rättad grammatik och fler varianter i texterna som spelet skriver. Inget är inbyggt än: <strong>säg ja eller nej på varje kort</strong>, och skriv gärna vad som ska ändras. Programmeringschatten bygger sedan in det du sagt ja till.</p>
    <p>Exemplen är ifyllda med Ask (han) och Ylva (hon).</p>
  </header>
  <div class="rad">
    <span class="raknare" id="raknare"></span>
    <span class="filter rad" role="group" aria-label="Visa">
      <button type="button" id="visa-alla" data-filter="alla" aria-pressed="true">Alla</button>
      <button type="button" id="visa-obesvarade" data-filter="obesvarade" aria-pressed="false">Obesvarade</button>
    </span>
    <span id="status" aria-live="polite"></span>
  </div>
  <section class="del" id="del-rattelser"><header><h2>Rättelser</h2><p>Fel i dagens texter. Till vänster som spelet skriver nu, till höger hur det blir.</p></header></section>
  <section class="del" id="del-kontroller"><header><h2>Nya kontroller</h2><p>Kontroller i testerna som larmar om felet kommer tillbaka. Antalet är hur ofta de hittade felet i dagens texter (8 byar i 45 dygn, 45 år i spelet).</p></header></section>
  <section class="del" id="del-mallar"><header><h2>Fler varianter</h2><p>Varje mall är en mening som spelet kan skriva på flera sätt. Gröna punkter är nya varianter.</p></header></section>
</main>
<script>
const KORT = ${data};
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const tal = n => n.toLocaleString('sv-SE');
let DB = null, SVAR = {}, FILTER = 'alla';

function innehall(k) {
  if (k.del === 'rattelser') {
    const [fore, efter] = k.exempel;
    return \`<p class="varfor">\${esc(k.varfor)}</p>
      <div class="fore-efter">
        <div class="fore"><span class="etikett">Nu</span>\${fore ? \`<p class="mening">\${esc(fore)}</p>\` : ''}<code>\${esc(k.nu)}</code></div>
        <div class="efter"><span class="etikett">Blir</span>\${efter ? \`<p class="mening">\${esc(efter)}</p>\` : ''}<code>\${esc(k.blir)}</code></div>
      </div>\`;
  }
  if (k.del === 'kontroller') {
    return \`<p class="siffra">\${tal(k.antal)} <small>gånger i dagens texter</small></p>
      \${k.ex.length ? \`<ul class="varianter gamla">\${k.ex.map(e => \`<li>\${esc(e)}</li>\`).join('')}</ul>\` : ''}\`;
  }
  const bort = new Set(k.ta_bort);
  return \`<p class="siffra">\${k.fore} → \${k.efter} <small>varianter\${k.ny ? ', ny mall' : ''}</small></p>
    \${k.varfor ? \`<p class="varfor">\${esc(k.varfor)}</p>\` : ''}
    <ul class="varianter">\${k.nya.map(v => \`<li>\${esc(v.text)}\${v.villkor ? '<span class="villkor" title="Väljs bara när villkoret gäller, till exempel på natten eller när det är kallt">villkor</span>' : ''}</li>\`).join('')}</ul>
    \${k.gamla.length || bort.size ? \`<details><summary>De \${k.gamla.length} som finns i dag\${bort.size ? ' och den som tas bort' : ''}</summary>
      <ul class="varianter gamla">\${k.gamla.map(t => \`<li>\${esc(t)}</li>\`).join('')}\${[...bort].map(t => \`<li class="bort">\${esc(t)}</li>\`).join('')}</ul></details>\` : ''}\`;
}

function rita() {
  let grupp = '';
  for (const k of KORT) {
    const del = $('#del-' + k.del);
    if (k.del === 'rattelser' && k.grupp !== grupp) { grupp = k.grupp; del.insertAdjacentHTML('beforeend', \`<p class="grupp">\${esc(k.grupp)} · \${esc(k.rubrik)}</p>\`); }
    const a = document.createElement('article'); a.id = 'kort-' + k.id;
    const rubrik = k.del === 'mallar' ? k.mall : k.del === 'kontroller' ? k.rubrik : (k.exempel[1] ? '' : k.rubrik);
    a.innerHTML = \`<div class="huvud">\${rubrik ? \`<h3>\${esc(rubrik)}</h3>\` : '<span></span>'}\${k.fil ? \`<span class="fil">\${esc(k.fil)}</span>\` : ''}</div>
      \${innehall(k)}
      <div class="svar" role="group" aria-label="Ditt svar">
        <button type="button" data-svar="ja" data-id="\${k.id}">Ja</button>
        <button type="button" data-svar="nej" data-id="\${k.id}">Nej</button>
        <span class="sparat" aria-live="polite"></span>
      </div>
      <label class="komm">Kommentar
        <textarea id="komm-\${k.id}" data-id="\${k.id}" rows="2" placeholder="Till exempel: ja, men skriv hellre …"></textarea></label>\`;
    del.append(a);
  }
  visa();
}

function visa() {
  let besvarade = 0;
  for (const k of KORT) {
    const a = document.getElementById('kort-' + k.id); const s = SVAR[k.id] || {};
    if (s.svar) besvarade++;
    a.classList.toggle('ja', s.svar === 'ja'); a.classList.toggle('nej', s.svar === 'nej');
    a.querySelectorAll('button[data-svar]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.svar === s.svar)); b.disabled = !DB; });
    const ta = a.querySelector('textarea'); ta.disabled = !DB;
    if (document.activeElement !== ta) ta.value = s.kommentar || '';
    a.querySelector('.sparat').textContent = s.svar ? 'Sparat' + (s.kommentar ? ', med kommentar' : '') : '';
    a.hidden = FILTER === 'obesvarade' && !!s.svar;
  }
  $('#raknare').innerHTML = \`<b>\${besvarade}</b> av \${KORT.length} besvarade\`;
}

async function spara(id, andring) {
  if (!DB) return;
  const nytt = { ...(SVAR[id] || {}), ...andring, nar: new Date().toISOString() };
  SVAR[id] = nytt; visa();
  try { await DB.doc('val/' + id).set(nytt); }
  catch (e) { const s = document.querySelector('#kort-' + id + ' .sparat'); if (s) s.textContent = 'Kunde inte spara. Har du rätt att ändra sidan?'; }
}

document.addEventListener('click', e => {
  const b = e.target.closest('button[data-svar]');
  if (b) { const ta = document.getElementById('komm-' + b.dataset.id); spara(b.dataset.id, { svar: b.dataset.svar, kommentar: ta.value.trim() }); return; }
  const f = e.target.closest('button[data-filter]');
  if (f) { FILTER = f.dataset.filter; document.querySelectorAll('button[data-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === f))); visa(); }
});
document.addEventListener('change', e => { const ta = e.target.closest('textarea[data-id]'); if (ta) spara(ta.dataset.id, { kommentar: ta.value.trim() }); });

rita();
(async () => {
  $('#status').textContent = 'Ansluter till sidans databas …';
  try { DB = await window.claude?.use?.('db'); } catch (e) { DB = null; }
  if (!DB) { $('#status').textContent = 'Svaren kan inte sparas här. Öppna sidan inloggad på claude.ai.'; visa(); return; }
  $('#status').textContent = '';
  DB.collection('val').onSnapshot(snap => {
    SVAR = {};
    for (const doc of snap.docs) SVAR[doc.id] = doc.data();
    visa();
  });
})();
</script>
`;
fs.writeFileSync(path.join(__dirname, 'texterna.html'), html);
console.log(`texter/texterna.html: ${kort.length} kort (${d.rattelser.length} rättelser, ${d.kontroller.length} kontroller, ${d.prov.length} mallar), ${Math.round(html.length / 1024)} KB.`);
