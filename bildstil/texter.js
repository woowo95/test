// Texterna (textchatten, texter/README.md): hela texter så som de syns i spelet, och förslagen till grammatik och variation.
// TEXTER kommer från texter/sida.json (node texter/bygg.cjs). Svaren ligger i databasens samling 'texter':
//   h-<text>            { plats, vem, text, kommentar, nar }             en hel text (texter/hela.ts)
//   p-<plats>           { plats, kommentar, nar }                        alla texter på ett ställe i spelet
//   f-<kort>            { svar: 'ja' | 'nej', kommentar, nar }           ett förslag (rättelse, kontroll eller mall)
// (e- och m- är kommentarer till enstaka meningar från bildstil v143; vyn finns inte längre)
(function () {
  if (typeof TEXTER === 'undefined' || !document.getElementById('texter')) return;
  const q = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const GRUPP = { '1a': 'Rättelse · hen blir han eller hon', '1b': 'Rättelse · ändelser, genus och tal', '1c': 'Rättelse · skälet i binamnen', '1d': 'Rättelse · artikeln i ryktena', '1e': 'Rättelse · binamnen', '1f': 'Rättelse · namnen', ord: 'Rättelse · ord', m: 'Mönster ur genomgången (Björn och Claude)' };
  const VYER = {
    hela: { namn: 'Hela texter', om: 'Texterna som spelet skriver i dag, hela och så som de syns, från varje ställe i spelet. Tre byar i 45 dygn (45 år i spelet, drygt sex veckor i verkligheten). Under varje text står vad Claude tycker, och länkar till mönstret i Förslagen. Skriv vad du själv tycker i rutan; det sparas när du går ur den.' },
    forslag: { namn: 'Förslagen', om: 'Säg ja eller nej till varje förslag.' },
  };
  let DB = null, SVAR = {}, vy = 'hela', baraObesvarade = false;
  const HELA = TEXTER.hela, antalHela = HELA.reduce((s, p) => s + p.texter.length, 0);
  const kommenterade = () => Object.keys(SVAR).filter(k => k.startsWith('h-') && SVAR[k].kommentar).length;

  function flikar() {
    const besvarade = TEXTER.kort.filter(k => SVAR['f-' + k.id]?.svar).length;
    q('#tx-flikar').innerHTML = Object.entries(VYER).map(([id, v]) => {
      const tal = id === 'forslag' ? `${besvarade}/${TEXTER.kort.length}` : `${kommenterade()}/${antalHela}`;
      return `<button type="button" data-txvy="${id}" aria-pressed="${id === vy}">${v.namn} <b>${tal}</b></button>`;
    }).join('');
  }

  function forslagKort(k) {
    const s = SVAR['f-' + k.id] || {};
    let typ, rubrik, kropp;
    if (k.del === 'rattelser') {
      typ = GRUPP[k.grupp] || 'Rättelse'; rubrik = k.exempel[1] || k.blir;
      kropp = `<p class="not">${esc(k.varfor)} <span class="tx-fil">${esc(k.fil)}</span></p>
        <div class="alternativ"><figure class="alt idag"><figcaption><b>Nu</b>${esc(k.exempel[0] || '')}</figcaption><code>${esc(k.nu)}</code></figure>
        <figure class="alt"><figcaption><b>Blir</b>${esc(k.exempel[1] || '')}</figcaption><code>${esc(k.blir)}</code></figure></div>`;
    } else if (k.del === 'kontroller') {
      typ = 'Ny kontroll i testerna'; rubrik = k.rubrik;
      kropp = `<p>Hittade felet <b>${k.antal.toLocaleString('sv-SE')}</b> gånger i dagens texter.</p>${k.ex.length ? `<ul class="tx-lista">${k.ex.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}`;
    } else {
      typ = k.ny ? 'Ny mall' : 'Fler varianter'; rubrik = `${k.mall}: ${k.fore} → ${k.efter} varianter`;
      kropp = `${k.varfor ? `<p class="not">${esc(k.varfor)}</p>` : ''}<ul class="tx-lista ny">${k.nya.map(v => `<li>${esc(v.text)}${v.villkor ? ' <span class="tx-villkor" title="Väljs bara när villkoret gäller, till exempel på natten eller när det är kallt">villkor</span>' : ''}</li>`).join('')}</ul>
        ${k.gamla.length || k.ta_bort.length ? `<details class="mer"><summary>De ${k.gamla.length} som finns i dag${k.ta_bort.length ? ' och den som tas bort' : ''}</summary><ul class="tx-lista">${k.gamla.map(t => `<li>${esc(t)}</li>`).join('')}${k.ta_bort.map(t => `<li class="bort">${esc(t)}</li>`).join('')}</ul></details>` : ''}`;
    }
    return `<article class="valkort${s.svar ? ' svarat' : ''}" id="tx-f-${k.id}"><header><span class="typ">${esc(typ)}</span><h3>${esc(rubrik)}</h3></header>${kropp}
      <div class="svar" role="group" aria-label="Ditt svar"><button type="button" data-txsvar="ja" data-id="${k.id}" aria-pressed="${s.svar === 'ja'}"${DB ? '' : ' disabled'}>Ja</button><button type="button" class="nej" data-txsvar="nej" data-id="${k.id}" aria-pressed="${s.svar === 'nej'}"${DB ? '' : ' disabled'}>Nej</button></div>
      <label>Kommentar: vad ska ändras?<textarea id="tx-k-${k.id}" data-txkomm="${k.id}" rows="2" placeholder="Till exempel: ja, men skriv hellre …"${DB ? '' : ' disabled'}>${esc(s.kommentar || '')}</textarea></label>
      <div class="sparat" aria-live="polite">${s.svar ? 'Sparat: ' + s.svar + (s.kommentar ? ', med kommentar' : '') + '.' : ''}</div></article>`;
  }

  // ett ställe i spelet: var det syns, texterna med en ruta var, och en ruta för det som gäller alla
  function plats(p, i) {
    const pk = SVAR['p-' + p.id] || {}, antal = p.texter.filter(t => SVAR['h-' + t.id]?.kommentar).length;
    return `<details class="tx-grupp"${i === 0 ? ' open' : ''} id="tx-p-${p.id}"><summary><b>${esc(p.rubrik)}</b> <span class="not">${p.texter.length} texter${antal ? ', ' + antal + ' kommenterade' : ''}${pk.kommentar ? ', kommentar om alla' : ''}</span></summary>
      <p class="not">${esc(p.var)}</p>
      ${p.texter.map(t => { const d = SVAR['h-' + t.id] || {}; return `<article class="tx-hel${d.kommentar ? ' kommenterad' : ''}">
        <p class="tx-meta">${esc(t.vem)} · by ${t.by} · ${esc(t.nar)}</p><div class="tx-text">${esc(t.text)}</div>
        ${t.claude ? `<div class="tx-claude"><b>Claudes kommentar</b> ${esc(t.claude)}${t.monster?.length ? ` <span class="tx-monster">${t.monster.map(m => `<a href="#tx-f-r-${m}" data-txmonster="${m}">${esc(m.slice(2))}</a>`).join(' ')}</span>` : ''}</div>` : ''}
        <label>Vad är fel?<textarea data-txhel="${esc(t.id)}" data-plats="${esc(p.id)}" rows="2" placeholder="Till exempel: för upprepande, fel ord, konstig ordning, något saknas"${DB ? '' : ' disabled'}>${esc(d.kommentar || '')}</textarea></label></article>`; }).join('')}
      <label class="tx-mall">Om alla texter i ${esc(p.rubrik.toLowerCase())}<textarea data-txplats="${esc(p.id)}" rows="2" placeholder="Till exempel: alla börjar likadant"${DB ? '' : ' disabled'}>${esc(pk.kommentar || '')}</textarea></label></details>`;
  }

  function rita() {
    flikar();
    const v = VYER[vy];
    q('#tx-om').textContent = v.om;
    q('#tx-bara').hidden = vy !== 'forslag';
    q('#tx-bara').setAttribute('aria-pressed', String(baraObesvarade));
    if (vy === 'forslag') {
      const kort = TEXTER.kort.filter(k => !baraObesvarade || !SVAR['f-' + k.id]?.svar);
      q('#tx-innehall').innerHTML = kort.length ? `<div class="vallista">${kort.map(forslagKort).join('')}</div>` : '<p class="not">Alla förslag är besvarade.</p>';
    } else q('#tx-innehall').innerHTML = HELA.map(plats).join('');
  }

  async function spara(id, data) {
    if (!DB) return;
    const nytt = { ...(SVAR[id] || {}), ...data, nar: new Date().toISOString() };
    SVAR[id] = nytt;
    try { await DB.doc('texter/' + id).set(nytt); }
    catch (e) { q('#tx-status').textContent = 'Kunde inte spara. Har du rätt att ändra sidan?'; }
  }
  async function taBort(id) {
    if (!DB) return;
    delete SVAR[id];
    try { await DB.doc('texter/' + id).delete(); } catch (e) { q('#tx-status').textContent = 'Kunde inte ta bort kommentaren.'; }
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-txvy],[data-txsvar],[data-txmonster],#tx-bara');
    if (!t || !t.closest('#texter')) return;
    if (t.id === 'tx-bara') { baraObesvarade = !baraObesvarade; rita(); return; }
    if (t.dataset.txvy) { vy = t.dataset.txvy; rita(); return; }
    if (t.dataset.txmonster) { e.preventDefault(); vy = 'forslag'; baraObesvarade = false; rita(); q('#tx-f-r-' + t.dataset.txmonster)?.scrollIntoView({ block: 'start' }); return; }
    if (t.dataset.txsvar) { const k = q('#tx-k-' + t.dataset.id); spara('f-' + t.dataset.id, { svar: t.dataset.txsvar, kommentar: k ? k.value.trim() : '' }).then(rita); rita(); return; }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (!t.closest || !t.closest('#texter')) return;
    if (t.dataset.txkomm) spara('f-' + t.dataset.txkomm, { kommentar: t.value.trim() });
    if (t.dataset.txhel) {
      const p = HELA.find(x => x.id === t.dataset.plats), h = p.texter.find(x => x.id === t.dataset.txhel), k = t.value.trim();
      (k ? spara('h-' + h.id, { plats: p.rubrik, vem: h.vem, text: h.text, kommentar: k }) : taBort('h-' + h.id)).then(flikar);
      t.closest('.tx-hel').classList.toggle('kommenterad', !!k);
    }
    if (t.dataset.txplats) spara('p-' + t.dataset.txplats, { plats: t.dataset.txplats, kommentar: t.value.trim() });
  });

  rita();
  (async () => {
    q('#tx-status').textContent = 'Ansluter till sidans databas …';
    try { DB = await window.claude?.use?.('db'); } catch (e) { DB = null; }
    if (!DB) { q('#tx-status').textContent = 'Svaren går bara att spara när sidan är öppen i Claude och du är inloggad.'; return; }
    q('#tx-status').textContent = 'Ditt svar sparas direkt.';
    rita();
    DB.collection('texter').onSnapshot(snap => {
      SVAR = {};
      snap.docs.forEach(d => { if (d.exists) SVAR[d.id] = d.data(); });
      // skriver Björn i en ruta just nu, ritas inget om, så att texten inte försvinner
      const a = document.activeElement;
      if (a && a.tagName === 'TEXTAREA' && a.closest('#texter')) { flikar(); return; }
      rita();
    }, () => { q('#tx-status').textContent = 'Kontakten med databasen bröts. Ladda om sidan.'; });
  })();
})();
