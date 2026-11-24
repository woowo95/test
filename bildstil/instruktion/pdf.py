# gör INSTRUKTION.md och bilderna till en PDF (instruktion.html skrivs först): python3 pdf.py && node pdf.cjs
import re, base64, html, os
D = os.path.dirname(os.path.abspath(__file__))
md = open(os.path.join(D, 'INSTRUKTION.md'), encoding='utf8').read().split('\n')
def inl(s):
    s = html.escape(s, quote=False)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    return re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', s)
ut, i, lista = [], 0, []
def stang(n=0):
    while len(lista) > n: ut.append('</li></ol>' if lista.pop()[1] == 'ol' else '</li></ul>')
while i < len(md):
    r = md[i]
    if r.startswith('```'):
        stang(); j = i + 1; kod = []
        while not md[j].startswith('```'): kod.append(md[j]); j += 1
        ut.append('<pre>' + html.escape('\n'.join(kod)) + '</pre>'); i = j + 1; continue
    m = re.match(r'!\[(.*)\]\((.*)\)', r)
    if m:
        stang(); b = base64.b64encode(open(os.path.join(D, m[2]), 'rb').read()).decode()
        ut.append(f'<figure><img src="data:image/png;base64,{b}" alt="{html.escape(m[1])}"><figcaption>{html.escape(m[1])}</figcaption></figure>'); i += 1; continue
    if r.startswith('|'):
        stang(); rader = []
        while i < len(md) and md[i].startswith('|'): rader.append([c.strip() for c in md[i].strip('|').split('|')]); i += 1
        h = ''.join(f'<th>{inl(c)}</th>' for c in rader[0])
        b = ''.join('<tr>' + ''.join(f'<td>{inl(c)}</td>' for c in x) + '</tr>' for x in rader[2:])
        ut.append(f'<table><tr>{h}</tr>{b}</table>'); continue
    m = re.match(r'^(#+) (.*)', r)
    if m: stang(); ut.append(f'<h{len(m[1])}>{inl(m[2])}</h{len(m[1])}>'); i += 1; continue
    m = re.match(r'^( *)(-|\d+\.) (.*)', r)
    if m:
        ind = len(m[1]) // 2 if m[2] == '-' else len(m[1]) // 4; typ = 'ul' if m[2] == '-' else 'ol'
        if len(lista) > ind + 1: stang(ind + 1)
        if len(lista) == ind + 1: ut.append('</li><li>')
        else: lista.append((ind, typ)); ut.append(f'<{typ}><li>')
        ut.append(inl(m[3])); i += 1; continue
    if r.strip() == '---': stang(); ut.append('<hr>'); i += 1; continue
    if r.strip() == '':
        # en tom rad inne i en lista avslutar den bara om nästa rad inte fortsätter listan
        nx = md[i + 1] if i + 1 < len(md) else ''
        if lista and (nx.startswith('  ') or re.match(r'^(-|\d+\.) ', nx)): i += 1; continue
        stang(); i += 1; continue
    if lista and r.startswith('  '): ut.append('<p>' + inl(r.strip()) + '</p>'); i += 1; continue
    stang(); ut.append('<p>' + inl(r) + '</p>'); i += 1
stang()
css = '''body{font-family:Georgia,serif;font-size:11pt;line-height:1.45;color:#222;max-width:46em;margin:auto}
h1{font-size:20pt}h2{font-size:14pt;margin-top:1.4em;border-bottom:1px solid #bbb}code,pre{font-family:monospace;font-size:9.5pt;background:#f1ede4}
pre{padding:8px;white-space:pre-wrap}table{border-collapse:collapse;margin:8px 0}td,th{border:1px solid #bbb;padding:3px 7px;text-align:left;font-size:10pt}
figure{margin:10px 0;break-inside:avoid}img{max-width:100%;image-rendering:pixelated}figcaption{font-size:9pt;color:#555}li{margin:2px 0}'''
open(os.path.join(D, 'instruktion.html'), 'w', encoding='utf8').write(f'<!doctype html><meta charset="utf-8"><title>Så ritas bilderna</title><style>{css}</style>' + '\n'.join(ut))
