// Texterna (textchatten, texter/README.md): förslagen till grammatik och variation och massor av ifyllda exempel.
// TEXTER kommer från texter/sida.json (node texter/bygg.cjs). Svaren ligger i databasens samling 'texter':
//   f-<kort>            { svar: 'ja' | 'nej', kommentar, nar }           ett förslag (rättelse, kontroll eller mall)
//   e-<hash av texten>  { text, mall, vy, kommentar, nar }               en mening i exemplen
//   m-<vy>-<mall>       { mall, vy, kommentar, nar }                     en hel mall i exemplen
(function () {
  if (typeof TEXTER === 'undefined' || !document.getElementById('texter')) return;
  const q = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const GRUPP = { '1a': 'Rättelse · hen blir han eller hon', '1b': 'Rättelse · ändelser, genus och tal', '1c': 'Rättelse · skälet i binamnen', '1d': 'Rättelse · artikeln i ryktena', '1e': 'Rättelse · binamnen', '1f': 'Rättelse · namnen', ord: 'Rättelse · ord' };
  const VYER = {
    forslag: { namn: 'Förslagen', om: 'Säg ja eller nej till varje förslag.' },
    nya: { namn: 'Nya texter', om: 'Mallarna som får fler varianter, alla varianter ifyllda med olika personer. Gröna punkter är nya varianter.', grupper: TEXTER.exempel.forslag },
    idag: { namn: 'I dag', om: 'Det spelet skrev i 8 byar på 45 dygn (45 år i spelet), för mallarna som förslagen inte ändrar. Rött streck: ett fel som förslagen rättar.', grupper: TEXTER.exempel.idag },
    logg: { namn: 'Loggen', om: 'De vanligaste fasta raderna i loggen i fyra byar på 45 dygn, utom de som blir mallar med förslagen. Talet är hur många gånger raden skrevs.', grupper: [{ id: 'logg', namn: 'Loggens rader', rader: TEXTER.exempel.logg }] },
  };
  let DB = null, SVAR = {}, vy = 'forslag', oppen = null, baraObesvarade = false;
  const raknaRader = v => VYER[v].grupper.reduce((s, g) => s + g.rader.length, 0);
  const kommenterade = v => Object.values(SVAR).filter(d => d.vy === v && d.text && d.kommentar).length;

  function flikar() {
    const besvarade = TEXTER.kort.filter(k => SVAR['f-' + k.id]?.svar).length;
    q('#tx-flikar').innerHTML = Object.entries(VYER).map(([id, v]) => {
      const tal = id === 'forslag' ? `${besvarade}/${TEXTER.kort.length}` : `${raknaRader(id)}${kommenterade(id) ? ' · ' + kommenterade(id) + ' kommenterade' : ''}`;
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

  function rad(r, g) {
    const id = 'e-' + hash(r.t), d = SVAR[id];
    const klass = ['tx-rad', r.ny ? 'ny' : '', r.fel ? 'fel' : '', d?.kommentar ? 'kommenterad' : ''].join(' ');
    const redigera = oppen === id ? `<div class="tx-redigera"><textarea id="tx-ed" rows="2" placeholder="Vad är fel, eller hur skulle du skriva?">${esc(d?.kommentar || '')}</textarea><div class="svar"><button type="button" data-txspara="${id}" data-mall="${esc(g.id)}">Spara</button>${d ? `<button type="button" class="nej" data-txtabort="${id}">Ta bort kommentaren</button>` : ''}<button type="button" data-txstang>Stäng</button></div></div>` : '';
    return `<li class="${klass}"><button type="button" data-txrad="${id}" data-text="${esc(r.t)}"${DB ? '' : ' disabled'}>${r.n ? `<span class="tx-n">${r.n}</span>` : ''}${esc(r.t)}</button>${d?.kommentar && oppen !== id ? `<p class="tx-komm">${esc(d.kommentar)}</p>` : ''}${redigera}</li>`;
  }

  function grupp(g, i) {
    const m = SVAR['m-' + vy + '-' + g.id] || {}, antal = g.rader.filter(r => SVAR['e-' + hash(r.t)]?.kommentar).length;
    return `<details class="tx-grupp"${i === 0 || g.rader.some(r => 'e-' + hash(r.t) === oppen) ? ' open' : ''}><summary><b>${esc(g.namn)}</b> <span class="not">${g.rader.length} texter${antal ? ', ' + antal + ' kommenterade' : ''}${m.kommentar ? ', kommentar om mallen' : ''}</span></summary>
      ${g.om ? `<p class="not">${esc(g.om)}</p>` : ''}<ul class="tx-rader">${g.rader.map(r => rad(r, g)).join('')}</ul>
      ${vy === 'logg' ? '' : `<label class="tx-mall">Om hela ${esc(g.namn)}<textarea data-txmall="${esc(g.id)}" rows="2" placeholder="Till exempel: för många börjar likadant"${DB ? '' : ' disabled'}>${esc(m.kommentar || '')}</textarea></label>`}</details>`;
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
    } else q('#tx-innehall').innerHTML = v.grupper.map(grupp).join('');
    if (oppen) { const t = q('#tx-ed'); if (t) t.focus(); }
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
    const t = e.target.closest('[data-txvy],[data-txsvar],[data-txrad],[data-txspara],[data-txtabort],[data-txstang],#tx-bara');
    if (!t || !t.closest('#texter')) return;
    if (t.id === 'tx-bara') { baraObesvarade = !baraObesvarade; rita(); return; }
    if (t.dataset.txvy) { vy = t.dataset.txvy; oppen = null; rita(); return; }
    if (t.dataset.txsvar) { const k = q('#tx-k-' + t.dataset.id); spara('f-' + t.dataset.id, { svar: t.dataset.txsvar, kommentar: k ? k.value.trim() : '' }).then(rita); rita(); return; }
    if (t.dataset.txrad) { oppen = oppen === t.dataset.txrad ? null : t.dataset.txrad; rita(); return; }
    if (t.dataset.txspara) {
      const text = q(`[data-txrad="${t.dataset.txspara}"]`).dataset.text, komm = q('#tx-ed').value.trim();
      oppen = null;
      if (komm) spara(t.dataset.txspara, { text, mall: t.dataset.mall, vy, kommentar: komm }); else taBort(t.dataset.txspara);
      rita(); return;
    }
    if (t.dataset.txtabort) { oppen = null; taBort(t.dataset.txtabort); rita(); return; }
    if (t.hasAttribute('data-txstang')) { oppen = null; rita(); }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (!t.closest || !t.closest('#texter')) return;
    if (t.dataset.txkomm) spara('f-' + t.dataset.txkomm, { kommentar: t.value.trim() });
    if (t.dataset.txmall) spara('m-' + vy + '-' + t.dataset.txmall, { mall: t.dataset.txmall, vy, kommentar: t.value.trim() });
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
