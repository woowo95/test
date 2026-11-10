// fas 9, system 9.5: proteserna (steg 9.5.11), tre versioner. Kryckan, träbenet och kroken täljs vid snickarbänken och ögonlappen
// skärs av skinn. Här de fyra bredvid varandra på trägolvet, i 16 punkter per ruta.
(() => {
  const L = { o: 'kol0', a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', k: 'kol1', l: 'kol2', r: 'rost1', R: 'rost2', w: 'ben2', x: 'skugga' };
  const golv = B => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('jord', y % 4 === 3 ? 0 : (Math.floor((x + (Math.floor(y / 4) % 2) * 7) / 14) % 2 ? 2 : 1))); };
  const V = (text, kr, tr, ko, og) => ({ text, w: 66, h: 26, rita: B => { golv(B); ritaSprite(B, kr, L, 2, 2); ritaSprite(B, tr, L, 18, 2); ritaSprite(B, ko, L, 36, 6); ritaSprite(B, og, L, 52, 9); } });
  VAL.push({ id: 'f9_proteser', namn: 'Proteserna', typ: 'tre', vad: 'Steg 9.5.11: kryckan och träbenet ger den som förlorat ett ben ungefär hälften av gångfarten tillbaka, kroken en del av greppet åt den som förlorat en hand, och ögonlappen är bara utseende. Från vänster: kryckan, träbenet, kroken och ögonlappen.', versioner: [
    V('Enkla och raka: en krycka med tvärslå, ett svarvat träben, en krok och en rund lapp.',
      ['oooooooo', 'obccccbo', '.oooboo.', '...ob...', '...ob...', '...ob...', '...ob...', '...ob...', '..oobo..', '..ocbo..', '...ob...', '...ob...', '...ob...', '...oo...'],
      ['..oooo..', '.orRRro.', '.orRRro.', '..obbo..', '..occo..', '...ob...', '...oc...', '...ob...', '...oc...', '...ob...', '..oooo..', '..oaao..'],
      ['..ooo.', '.o.co.', 'o...bo', 'o...bo', '.o.obo', '..oobo', '...ocb', '..occo', '..obbo', '..oooo'],
      ['.ooooo.', 'okklkko', 'okkkkko', '.ooooo.', 'r.....r', '.r...r.']),
    V('Grova och knotiga, av en gren med kvar sittande bark.',
      ['ooooooo.', 'oaccbbo.', '.ooboo..', '..oao...', '..obo...', '...oao..', '...obo..', '..oao...', '..obo...', '..oao...', '...obo..', '...oao..', '...oo...'],
      ['.oooooo.', 'orrRRrro', '.oRRRRo.', '..oaao..', '..obbo..', '...oao..', '...obo..', '..oao...', '..obo...', '..oooo..'],
      ['.ooo..', 'o.aco.', 'o..bo.', '.o.oao', '..oobo', '...oao', '..obbo', '..oooo'],
      ['.oooo.', 'oRRRRo', 'oRRRRo', '.oooo.', 'r....r']),
    V('Vackra, med snidade ränder, en rem av läder och en lapp med söm.',
      ['oooooooo', 'odcdcdco', '.oooboo.', '...ocd..', '...odc..', '...ocd..', '...odc..', '..oocdo.', '..odcco.', '...ocd..', '...odc..', '...ooo..'],
      ['..oooo..', '.orRRro.', '.ooooooo', '.orRRro.', '..odco..', '...ocd..', '...odc..', '...ocd..', '..oooo..', '..oddo..'],
      ['..ooo.', '.o.do.', 'o...co', 'o...do', '.o.oco', '.ooodo', 'orRRRo', '.oooo.'],
      ['.ooooo.', 'okwkwko', 'okkkkko', '.ooooo.', 'R.....R', '.R...R.']),
  ] });
})();
