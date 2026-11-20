// ---------- byns krönika bakåt (steg 11.13.17, Flera samhällen: Den väckta byn i tal) ----------
// Den väckta byns krönika fylls bakåt när byn byggs, så att den ser ut som en by som levt: världens krönika om byn (grundandet,
// delningen, svälten, farsoten, krigen och freden, ledarna, räderna och utposterna) och byns historik ur folkets liv (vacktliv.ts):
// de som föddes i byn, paren som gifte sig och de döda som ligger på gravplatsen. Raderna står vid sin tid och har sitt slag, så
// att de hamnar i krönikans kategorier (KRONIKA_KAT i historik.ts). Allt kommer ur raden, världen och liven, utan slump
import { byId } from './folk';
import { kronikaVid } from './historik';
import type { VarldRad } from './radtal';
import { DAY, type State } from './typer';
import { relKey } from './folk';
import { giftNar } from './vacktliv';
import { varldHandelseText, type VarldHandelseId } from './varldkronika';

// slaget i byns krönika för en rad ur världens krönika (kategorin i KRONIKA_KAT); de andra blir nyheter
const SLAG: Partial<Record<VarldHandelseId, string>> = {
  nyLedare: 'ledare', svalt: 'motgang', delad: 'utbrytning', rad: 'rovare', lager: 'rovare',
  krig: 'sandebud', fred: 'sandebud', handelslager: 'handel', utpost: 'bygge', platsbygge: 'bygge',
};
export function byggKronika(b: State, r: VarldRad) {
  const vl = b.varld, rader: [number, string, string][] = [];
  for (const h of vl?.kronika ?? []) if ((h.by === r.nr || h.mot === r.nr) && h.t <= b.now) rader.push([h.t, varldHandelseText(vl!, h) + '.', SLAG[h.k] ?? 'nyhet']);
  const doda = new Set<string>();
  for (const p of b.people) {
    const mor = byId(b, p.mother)?.name ?? p.forr?.familj.find(f => f.roll === 'mor')?.namn, far = byId(b, p.father)?.name ?? p.forr?.familj.find(f => f.roll === 'far')?.namn;
    if (p.born >= r.grundad && p.born <= b.now) rader.push([p.born, `${p.name} föddes, ${p.sex === 'k' ? 'dotter' : 'son'} till ${[mor, far].filter(Boolean).join(' och ') || 'okända föräldrar'}.`, 'k_fodd']);
    const pa = byId(b, p.partner);
    if (pa && p.id < pa.id && b.rels[relKey(p.id, pa.id)]?.gift !== undefined) { const t = giftNar(b, p, pa); if (t >= r.grundad) rader.push([t, `${p.name} och ${pa.name} gifte sig.`, 'k_gift']); }
    for (const f of p.forr?.familj ?? []) {
      const t = p.born + (f.dog ?? 0) * DAY;
      if (f.dog === undefined || t < r.grundad || t > b.now || doda.has(f.namn)) continue;
      doda.add(f.namn);
      rader.push([t, `${f.namn} dog och begravdes i ${r.namn}.`, 'k_dog']);
    }
  }
  rader.sort((a, c) => a[0] - c[0]);
  for (const [t, text, slag] of rader) kronikaVid(b, t, text, slag);
}
