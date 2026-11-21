# Steg 12.1.192: tolv nya symboler för emojierna i berattelser.ts, resa.ts och rykten.ts, ritade av programmeringschatten
# (API:ts nyckel saknas). Tre versioner av varje: version 1 är platshållaren i spelet (bilder/<id>.json och raden i
# bilder.json), och alla tre blir ett kort i valdelen (fas12-symboler.js). Kör från repots rot: python3 bildstil/fas12-symboler.py
import json, os

PAL = {'k': '#24201d', 'K': '#474138', 'j': '#5e3c24', 'J': '#7d5b40', 'l': '#987e62', 'y': '#d8b25f', 'Y': '#b2921b',
       'r': '#a14808', 'R': '#742a01', 'o': '#bd753e', 'g': '#647025', 'G': '#898b4c', 'd': '#3e5156', 's': '#61767a',
       'S': '#8a9c9e', 'w': '#dad0bb', 'b': '#bdb39b', 'B': '#a0947d', 'e': '#324726', 'E': '#505e3e'}

SYM = [
 ('sym_familj', 'Familj', '👪', 'en familj: namnet efter en släkting och nyheterna om släkten', [
  ('Två vuxna och ett barn mellan dem, sida vid sida.', [
   '................', '..kk........kk..', '.kbbk......kbbk.', '.kbbk......kbbk.', '..kk...kk...kk..', '.kjjk.kbbk.krrk.',
   'kjJJjkkbbkkrorrk', 'kjJJjk.kk.krorrk', 'kjJJjkkrrkkrorrk', 'kjJJjkrorrkrorrk', '.kJJk.kork.krrk..', '.kjjk.kjjk.kjjk.',
   '.kjjk.kjjk.kjjk.', '.kkkk.kkkk.kkkk.', '................', '................']),
  ('Tre huvuden i rad, två stora och ett litet i mitten, som ett familjeporträtt.', [
   '................', '................', '.kkkk......kkkk.', 'kbbbbk....kbbbbk', 'kbkbbk....kbbkbk', 'kbbbbk.kk.kbbbbk',
   'kbBBbkkbbkkbBBbk', '.kbbk.kbbk.kbbk.', 'kjjjjkkbbkkrrrrk', 'kjJJjkkrrkkrorrk', 'kjJJjkrorrkrorrk', 'kjJJjkrorrkrorrk',
   'kkkkkkkkkkkkkkkk', '................', '................', '................']),
  ('Ett tak över två vuxna och ett barn: familjen i sitt hus.', [
   '.......kk.......', '......kJJk......', '.....kJllJk.....', '....kJlJJlJk....', '...kJlJkkJlJk...', '..kJlJk..kJlJk..',
   '.kkkkk....kkkkk.', '..k.kk.kk.kk.k..', '..kkbbkkbbkbbk..', '..k.kbbkbbkbk.k.', '..kkjjkkrrkjjk..', '..kkJJkkookJJk..',
   '..kkJJkkookJJk..', '..kkjjkkjjkjjk..', '..kkkkkkkkkkkk..', '................']),
 ]),
 ('sym_hjul', 'Trasigt hjul', '🛞', 'ett trasigt vagnshjul: en motgång på resan', [
  ('Ett trähjul med nav och ekrar, där en bit av fälgen saknas.', [
   '................', '.....kkkkk......', '...kkJJJJJkk....', '..kJjkkJkkjJk...', '.kJk..kJk..kJk..', '.kJk..kJk...k...',
   'kJk.k.kJk.k.....', 'kJkkJkklkkJkk...', 'kJJJJkllkkJJJJk.', 'kJkkJkklkkJkkJk.', 'kJk.k.kJk.k.kJk.', '.kJk..kJk..kJk..',
   '.kJk..kJk..kJk..', '..kJjkkJkkjJk...', '...kkJJJJJkk....', '.....kkkkk......']),
  ('Hjulet helt men kluvet: en spricka går genom fälgen och navet.', [
   '................', '.....kkkkkk.....', '...kkJJJJJJkk...', '..kJjk.kk.kjJk..', '.kJk..kJk..kkJk.', '.kJk..kJk.k.kJk.',
   'kJk.k.kJkk..kkJk', 'kJkkJkkllkkJkkJk', 'kJJJJkllkkJJJJJk', 'kJkkJkkllkkJkkJk', 'kJk.kk.kJk.k.kJk', '.kJk.k.kJk..kJk.',
   '.kJk..kkJk..kJk.', '..kJjk.kk.kjJk..', '...kkJJJJJJkk...', '.....kkkkkk.....']),
  ('Ett lutande hjul som lossnat, med en lös ekerbit bredvid på marken.', [
   '................', '......kkkk......', '....kkJJJJkk....', '...kJjkkkkjJk...', '..kJk.kJk..kJk..', '..kJk.kJk..kJk..',
   '.kJkkkkllkkkkJk.', '.kJJJkllllkJJJk.', '.kJkkkkllkkkkJk.', '..kJk.kJk..kJk..', '..kJk.kJk..k....', '...kJjkkkk......',
   '....kkJJJk..kkk.', '......kkk..kJJJk', '............kkk.', '................']),
 ]),
 ('sym_vilt', 'Vilt', '🦌', 'vilt på vägen: ett rådjur som sällskapet kan jaga', [
  ('Ett rådjurshuvud framifrån med två grenade horn.', [
   '.k..k....k..k...', 'kJkkJk..kJkkJk..', '.kJJk....kJJk...', '..kJk....kJk....', '...kJkkkkJk.....', '...kjjjjjjk.....',
   '..kjJJjjJJjk....', '..kjkJjjJkjk....', '...kjjjjjjk.....', '....kjjjjk......', '....kjllljk.....', '.....kjllk......',
   '.....kjkjk......', '......kkk.......', '................', '................']),
  ('Ett rådjur från sidan med upplyft huvud och vit spegel bak.', [
   '................', '...k.k..........', '...kJk..........', '...kkJk.........', '..kjjk..........', '.kjjjjk.........',
   'kjkjjjk.........', '.kkjjjjkkkkkkk..', '...kjjjjjjjjjjwk', '...kjjjjjjjjjjwk', '....kjjjjjjjjjk.', '....kjk.kk.kjk..',
   '....kjk..k.kjk..', '....kjk....kjk..', '....kkk....kkk..', '................']),
  ('Bara hornen: ett par grenade rådjurshorn, symmetriska.', [
   '................', '..k...k..k...k..', '.kJk.kJkkJk.kJk.', '.kJkkJk..kJkkJk.', '..kJJk....kJJk..', '..kJk.k..k.kJk..',
   '..kJkkJkkJkkJk..', '...kJJk..kJJk...', '...kJk....kJk...', '....kJk..kJk....', '....kJJkkJJk....', '.....kllllk.....',
   '.....kjjjjk.....', '......kkkk......', '................', '................']),
 ]),
 ('sym_ort', 'Botare', '🌿', 'en ört: ryktet botare, den som botat en sjuk eller skadad', [
  ('En kvist med fem blad längs stjälken.', [
   '...........kk...', '..........kGGk..', '.......kk.kGgk..', '......kGGkkGk...', '......kGgkGk....', '.......kkgGk.kk.',
   '...kk...kgk.kGGk', '..kGGk..kgk.kGgk', '..kGgkk.kgkkGk..', '...kkgGkkgkGk...', '.....kgGkgkk....', '......kkkgk.....',
   '........kgk.....', '........kgk.....', '........kkk.....', '................']),
  ('Örter i en lerskål, där botaren rör ihop sitt läkemedel.', [
   '................', '.....k..kk..k...', '....kGkkGGkkGk..', '....kGgkGgkGgk..', '.....kgkkgkgk...', '......kgkgkgk...',
   '.......kgggk....', '..kkkkkkgkkkkk..', '.kooooooooooook.', '.korrrrrrrrrrok.', '..korrrrrrrrok..', '..kRrrrrrrrrRk..',
   '...kRrrrrrrRk...', '....kkkkkkkk....', '................', '................']),
  ('Ett knippe örter som torkar, bundet med ett band runt stjälkarna.', [
   '...kk..kk..kk...', '..kGGkkGGkkGGk..', '..kGgkkGgkkGgk..', '...kgGkgGkGgk...', '...kGgkGgkgGk...', '....kgkgkgkk....',
   '.....kgkgkk.....', '.....kkkkkk.....', '.....kyyyyk.....', '.....kkkkkk.....', '......kgkk......', '......kgkk......',
   '.....kg.kgk.....', '.....kk..kk.....', '................', '................']),
 ]),
 ('sym_scen', 'Bra på scenen', '🎭', 'en glad mask: ryktet bra på scenen, publiken tog väl emot framträdandet', [
  ('En leende mask av näver med ögonhål och ett band.', [
   '................', '...kkkkkkkkkk...', '..kwwwwwwwwwwk..', '.kwwwwwwwwwwwwk.', 'kkwkkwwwwwkkwwkk', 'r.wkkwwwwwkkww.r',
   '..wwwwwwwwwwww..', '..wwwwwwwwwwww..', '..wkwwwwwwwwkw..', '..wwkwwwwwwkww..', '...wwkkkkkkww...', '...kwwwwwwwwk...',
   '....kwwwwwwk....', '.....kkkkkk.....', '................', '................']),
  ('Två masker, en glad framför en sorgsen: teaterns två ansikten.', [
   '................', '......kkkkkkk...', '.....kBBBBBBBk..', '....kBkkBBBkkBk.', 'kkkkkkBBBBBBBBk.', 'kwwwwwwkBkkkBBk.',
   'kwkkwwkkkBBBkBk.', 'kwkkwwkkBBBBBBk.', 'kwwwwwwwkBBBBk..', 'kwkwwwwkwkkkk...', 'kwwkkkkwwk......', '.kwwwwwwk.......',
   '..kwwwwk........', '...kkkk.........', '................', '................']),
  ('En gestalt med armarna upplyfta på en planka, och publikens jubel som streck.', [
   '.y............y.', '..y....kk....y..', '......kbbk......', '...k..kbbk..k...', '...kk..kk..kk...', '....kkrrrrkk....',
   '......krrk......', '......krrk......', '......kjjk......', '.....kj..jk.....', '.....kj..jk.....', 'kkkkkkkkkkkkkkkk',
   'kJJJJJJJJJJJJJJk', 'kjjjjjjjjjjjjjjk', 'kkkkkkkkkkkkkkkk', '................']),
 ]),
 ('sym_gaspa', 'Dålig på scenen', '🥱', 'ett gäspande ansikte: ryktet dålig på scenen, publiken tog illa emot framträdandet', [
  ('Ett runt ansikte som gäspar med halvslutna ögon och öppen mun.', [
   '................', '.....kkkkkk.....', '...kkbbbbbbkk...', '..kbbbbbbbbbbk..', '.kbbbbbbbbbbbbk.', '.kbkkkbbbbkkkbk.',
   'kbbbbbbbbbbbbbbk', 'kbbbbbbbbbbbbbbk', 'kbbbbbkkkkbbbbbk', 'kbbbbkRRRRkbbbbk', '.kbbbkRrrRkbbbk.', '.kbbbbkkkkbbbbk.',
   '..kbbbbbbbbbbk..', '...kkbbbbbbkk...', '.....kkkkkk.....', '................']),
  ('Ansiktet med slutna ögon och sömnens tecken, publiken somnar.', [
   '..........kkkk..', '.....kkkk...kk..', '...kkbbbbkkkk...', '..kbbbbbbbbk..kk', '.kbbbbbbbbbbk.k.', '.kbkkkbbkkkbbkk.',
   'kbbbbbbbbbbbbbk.', 'kbbbbbbbbbbbbbbk', 'kbbbbbbbbbbbbbbk', 'kbbbbbkkkkbbbbbk', '.kbbbbbbbbbbbbk.', '.kbbbbbbbbbbbbk.',
   '..kbbbbbbbbbbk..', '...kkbbbbbbkk...', '.....kkkkkk.....', '................']),
  ('Ett ansikte som tittar bort med rak mun, uttråkat.', [
   '................', '.....kkkkkk.....', '...kkbbbbbbkk...', '..kbbbbbbbbbbk..', '.kbbbbbbbbbbbbk.', '.kbbbbbbbbbbbbk.',
   'kbbbbbbbbkkbkkbk', 'kbbbbbbbbkkbkkbk', 'kbbbbbbbbbbbbbbk', 'kbbbbbbbbbbbbbbk', '.kbbbbbbkkkkkbk.', '.kbbbbbbbbbbbbk.',
   '..kbbbbbbbbbbk..', '...kkbbbbbbkk...', '.....kkkkkk.....', '................']),
 ]),
 ('sym_ljus', 'From', '🕯️', 'ett tänt ljus: ryktet from, den som ber och offrar mycket', [
  ('Ett talgljus med en låga och en droppe som runnit ner.', [
   '.......kk.......', '......kyyk......', '......kyyk......', '.....kyooyk.....', '.....kyrryk.....', '......kyyk......',
   '.......kk.......', '.....kkkkkk.....', '.....kwwwwk.....', '.....kwwwbkk....', '.....kwwwbwk....', '.....kwwwbkk....',
   '.....kwwwbk.....', '.....kwwwbk.....', '...kkkkkkkkkk...', '...kJJJJJJJJk...']),
  ('Ljuset i en hållare av järn med ett handtag åt sidan.', [
   '.......kk.......', '......kyyk......', '.....kyooyk.....', '.....kyrryk.....', '......kyyk......', '.......kk.......',
   '.....kkkkkk.....', '.....kwwwbk.....', '.....kwwwbk.....', '.....kwwwbk.....', '.....kwwwbk.....', '..kkkkkkkkkkkk..',
   '.ksSSSSSSSSSSdk.', '..kddddddddddkkk', '...kkkkkkkkkksdk', '.............kk.']),
  ('Ett ljus på en sten med ett varmt sken runt lågan.', [
   '.....y....y.....', '...y...kk...y...', '......kyyk......', '..y..kyooyk..y..', '.....kyrryk.....', '...y..kyyk..y...',
   '.......kk.......', '.....kkkkkk.....', '.....kwwwbk.....', '.....kwwwbk.....', '.....kwwwbk.....', '...kkkkkkkkkk...',
   '..kSSSSSsssssk..', '.kSsssssssdddsk.', '.kkkkkkkkkkkkkk.', '................']),
 ]),
 ('sym_kedja', 'Gudlös', '⛓️', 'en kedja: ryktet gudlös, den som vanhelgat det heliga eller stötts ut ur tron', [
  ('Tre länkar i en rad snett över rutan.', [
   '................', '..........kkkk..', '.........kSSssk.', '.........kSkksk.', '.......kkkSkksk.', '......kSSksssk..',
   '......kSkkkkk...', '....kkkSkksk....', '...kSSksssk.....', '...kSkkkkk......', '.kkkSkksk.......', 'kSSksssk........',
   'kSkkkk..........', 'kSkksk..........', '.kssk...........', '..kk............']),
  ('En bruten kedja: två länkar som skilts åt, med ett glapp emellan.', [
   '................', '................', '..kkkk......kkkk', '.kSSssk....kSSsk', 'kSkkksk....kSkkk', 'kSk.kSk...kSk...',
   'kSkkksk...kSk...', '.kSSsskkkkkSsk..', '..kkkSSssk.kk...', '....kSkkksk.....', '....kSk.k.......', '....kSkk.....k..',
   '.....kss...kSk..', '......k.....k...', '................', '................']),
  ('Länkarna liggande i en rad, som en kedja om en fånges fot.', [
   '................', '................', '................', '................', '................', '.kkkk..kkkk..kkk',
   'kSSsskkSSsskkSSk', 'kSkkSkkSkkSkkSkk', 'kSkkSSSSkkSSSSkk', 'kSkkSkkSkkSkkSkk', 'kssssksssskssssk', '.kkkk..kkkk..kkk',
   '................', '................', '................', '................']),
 ]),
 ('sym_ol', 'Suput', '🍺', 'en ölstop: ryktet suput, den som ofta är full', [
  ('En stop av trä med band runt och skum över kanten.', [
   '................', '...kkkkkkkk.....', '..kwwwwwwwwk....', '.kwwbwwwbwwwk...', '..kwwwwwwwwk....', '..kJJJJJJJJkkk..',
   '..kKKKKKKKKkJJk.', '..kJllJJJJJk.kJk', '..kJllJJJJJk.kJk', '..kKKKKKKKKk.kJk', '..kJllJJJJJk.kJk', '..kJllJJJJJkkJk.',
   '..kKKKKKKKKkkk..', '..kJJJJJJJJk....', '...kkkkkkkk.....', '................']),
  ('Ett dryckeshorn med skummande öl, böjt som ett oxhorn.', [
   '................', '..........kkk...', '.........kwwwk..', '........kwwbwwk.', '........kyyyyyk.', '.......kYyyyYk..',
   '.......kYyyYk...', '......kYyyYk....', '.....kYyyYk.....', '....kYyYYk......', '...kYYYk........', '..kYYk..........',
   '.kYk............', 'kk..............', '................', '................']),
  ('En stop som lutar och spiller, med droppar som stänker.', [
   '................', '.......kkkkk....', '......kJJJJJkk..', '.....kJllJJJJJk.', 'w...kJllJJJJJkk.', '.ww.kKKKKKKKkJk.',
   'wbwwkJllJJJJkJk.', '.wwwwkJJJJJkJk..', '..ww.kKKKKkkk...', '.w....kJJk......', '.......kk.......', '..w.............',
   '................', '.y..y...........', '..yyyy..........', '................']),
 ]),
 ('sym_rav', 'Lurendrejare', '🦊', 'en räv: ryktet lurendrejare, den som lurat någon i ett byte', [
  ('Ett rävhuvud framifrån med spetsiga öron och vit nos.', [
   '................', '.kk..........kk.', '.krk........krk.', '.korkkkkkkkkrok.', '.krrrrrrrrrrrrk.', 'krrrrrrrrrrrrrrk',
   'krkkrrrrrrrrkkrk', 'krrrrrrrrrrrrrrk', '.kwrrrrrrrrrrwk.', '..kwwrrrrrrwwk..', '...kwwwrrwwwk...', '....kwwkkwwk....',
   '.....kwwwwk.....', '......kkkk......', '................', '................']),
  ('En räv från sidan som smyger med lång buske.', [
   '................', '................', '..kk............', '.krok...........', 'kwrrk...........', 'kkrrrkkkkkkk....',
   '.kwrrrrrrrrrk.kk', '..krrrrrrrrrkkrk', '..krrrrrrrrrrrrk', '...krrrrrrrkrrwk', '...krk.krk..kwk.', '...krk.krk...k..',
   '...kkk.kkk......', '................', '................', '................']),
  ('Rävhuvudet med smala, sneda ögon och ett snett leende.', [
   '................', '.kk..........kk.', '.krk........krk.', '.korkkkkkkkkrok.', '.krrrrrrrrrrrrk.', 'krrrrrrrrrrrrrrk',
   'krrkkkrrrrkkkrrk', 'krrrrrrrrrrrrrrk', '.kwrrrrrrrrrrwk.', '..kwwrrrrrrwwk..', '...kwwwrrwwwk...', '....kwwwkkkwk...',
   '.....kwwwwk.....', '......kkkk......', '................', '................']),
 ]),
 ('sym_kompass', 'Vittberest', '🧭', 'ett vandringsminne: ryktet vittberest, den som rest långt och varit borta länge', [
  ('En vandringsstav med en packning knuten i toppen.', [
   '................', '.........kkkk...', '........kooook..', '.......kooroook.', '.......kororrok.', '........kkrrkk..',
   '.........kjjk...', '........kjJk....', '.......kjJk.....', '......kjJk......', '.....kjJk.......', '....kjJk........',
   '...kjJk.........', '..kjJk..........', '..kkk...........', '................']),
  ('En solkompass: en skiva med fyra väderstreck och en visare.', [
   '.......kk.......', '.....kkyykk.....', '...kkJJyyJJkk...', '..kJJJJyyJJJJk..', '..kJJJJkkJJJJk..', '.kJJJJkrrkJJJJk.',
   '.kyyJkrrrrkJyyk.', 'kyyyykrrrrkyyyyk', '.kyyJkJJJJkJyyk.', '.kJJJJkJJkJJJJk.', '..kJJJJkkJJJJk..', '..kJJJJyyJJJJk..',
   '...kkJJyyJJkk...', '.....kkyykk.....', '.......kk.......', '................']),
  ('En stig av fotspår som slingrar sig bort mot ett berg.', [
   '..........kk....', '.........kSSk...', '........kSSSdk..', '.......kSSSdddk.', '......kkkkkkkkkk', '................',
   '..........kk....', '.........kjk.kk.', '.............kjk', '......kk.........', '.....kjk.kk.....', '..........kjk...',
   '...kk...........', '..kjk.kk........', '......kjk.......', '................']),
 ]),
 ('sym_las', 'Fängelsekund', '🔒', 'ett lås av järn: ryktet fängelsekund, den som suttit i fängelse', [
  ('Ett hänglås av järn med böjd bygel och nyckelhål.', [
   '................', '.....kkkkkk.....', '....kSSsssdk....', '...kSk....kdk...', '...kSk....kdk...', '...kSk....kdk...',
   '..kkkkkkkkkkkk..', '..kSSSSSSSSsdk..', '..kSSSSkkSssdk..', '..kSSSSkkSssdk..', '..kSSSSSkSssdk..', '..kSSSSkkkssdk..',
   '..kssssssssddk..', '..kddddddddddk..', '..kkkkkkkkkkkk..', '................']),
  ('Ett fönster med järngaller, som i ett fängelse.', [
   '................', 'kkkkkkkkkkkkkkkk', 'kJJJJJJJJJJJJJJk', 'kJkkkkkkkkkkkkJk', 'kJkdkdkkdkkdkkJk', 'kJkSkSkkSkkSkkJk',
   'kJkSkSkkSkkSkkJk', 'kJkSkSkkSkkSkkJk', 'kJkSkSkkSkkSkkJk', 'kJkSkSkkSkkSkkJk', 'kJkSkSkkSkkSkkJk', 'kJkdkdkkdkkdkkJk',
   'kJkkkkkkkkkkkkJk', 'kJJJJJJJJJJJJJJk', 'kkkkkkkkkkkkkkkk', '................']),
  ('En fotboja av järn med en kort kedja.', [
   '................', '................', '....kkkkkk......', '...kSSsssdk.....', '..kSk....kdk....', '..kSk....kdk....',
   '..kSk....kdk....', '..kSSkkkksdk....', '...kSSsssdkkkk..', '....kkkkkkSssk..', '.........kSkkskk', '.........kSkkSSk',
   '..........kssk.k', '...........kk.k.', '..............kk', '................']),
 ]),
]

def fix(r):
    r = [x.ljust(16, '.')[:16] for x in r]
    return r + ['.' * 16] * (16 - len(r))

BS = 'bildstil'
reg = json.load(open(f'{BS}/bilder.json'))
ids = {b['id'] for b in reg['bilder']}
nya = []
for sid, namn, tecken, vad, versioner in SYM:
    rad = fix(versioner[0][1])
    used = sorted({c for line in rad for c in line if c != '.'})
    json.dump({'id': sid, 'ritad': 1, 'av': 'programmeringschatten (platshållare, steg 12.1.192)', 'om': versioner[0][0],
               'w': 16, 'h': 16, 'rader': rad, 'pal': {c: PAL[c] for c in used}}, open(f'{BS}/bilder/{sid}.json', 'w'), ensure_ascii=False, indent=1)
    if sid not in ids:
        nya.append('    ' + json.dumps({'id': sid, 'sort': 'sym-logg', 'namn': namn, 'w': 16, 'h': 16, 'vad': vad, 'tecken': [tecken], 'ritad': 1, 'godkand': True, 'platshallare': True}, ensure_ascii=False))
if nya:  # raderna läggs sist i listan, en rad per bild som resten av filen
    text = open(f'{BS}/bilder.json').read(); i = text.rindex('\n  ]')
    open(f'{BS}/bilder.json', 'w').write(text[:i] + ',\n' + ',\n'.join(nya) + text[i:])

# valdelen: ett kort per symbol med tre versioner, visade på panelens beige bredvid en godkänd symbol
js = ['// fas 12: tolv nya symboler (steg 12.1.192), genererad av bildstil/fas12-symboler.py. Version 1 är platshållaren i spelet.',
      '(() => {', f'  const PAL = {json.dumps(PAL)};',
      '  const PANEL = (B, P) => { for (let y = 0; y < 24; y++) for (let x = 0; x < 48; x++) B.satt(x, y, P.i("ben", 3)); };',
      '  const RITA = (B, P, rader, x0, y0) => rader.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ".") B.satt(x0 + x, y0 + y, P.av(PAL[ch])); }));']
for sid, namn, tecken, vad, versioner in SYM:
    vs = ',\n'.join(f'    {{ text: {json.dumps(t, ensure_ascii=False)}, w: 48, h: 24, rita: (B, P) => {{ PANEL(B, P); RITA(B, P, {json.dumps(fix(r))}, 4, 4); RITA(B, P, {json.dumps(fix(r))}, 28, 4); }} }}' for t, r in versioner)
    js.append(f'  VAL.push({{ id: "f12_{sid}", namn: {json.dumps("Symbolen " + namn.lower(), ensure_ascii=False)}, typ: "tre", slag: ["symbol"], vad: {json.dumps(f"Steg 12.1.192: symbolen för {tecken} i texterna, {vad}. I spelet är den nu version 1 (platshållare). Bilden visar symbolen två gånger på panelens beige, i den storlek den har i en textrad.", ensure_ascii=False)}, versioner: [\n{vs},\n  ] }});')
js.append('})();')
open(f'{BS}/fas12-symboler.js', 'w').write('\n'.join(js) + '\n')
print('klart')
