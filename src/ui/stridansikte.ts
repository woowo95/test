// ---------- ansiktet i striden (steg 10.2.95) ----------
// Den som slåss, håller vakt, står emot med vapen eller går mot byn för att anfalla har ett argt eller allvarligt ansikte, aldrig
// glatt eller ledset, och behåller det en stund efter striden (STRIDANSIKTE.minne) innan ansiktet följer humöret igen. Den som
// flyr eller gömmer sig är rädd. Samma regel för byborna (utseende.ts) och rövarna (manniskor.ts, var och ens egen handling)
import { ACTS, MIN, type Person, type State } from '../sim';
import { ROVARHANDLINGAR } from '../sim/rovare';
import { kartKampe } from './stridbild';

export const STRIDANSIKTE = {
  minne: 3 * MIN, // så länge (spelets klocka) ansiktet är kvar efter striden
};
// ansiktet handlingen ger (fältet ansikte i ACTS och ROVARHANDLINGAR): arg i striden och när man står emot eller anfaller,
// allvarlig (lugn) på vakten och när man går mot byn, rädd på flykten och när man gömmer sig. En rövares gor är hens egen handling
function ansiktet(gor: string): 'arg' | 'lugn' | 'radd' | undefined {
  return (ROVARHANDLINGAR as Record<string, { ansikte?: 'arg' | 'lugn' | 'radd' }>)[gor]?.ansikte ?? (ACTS as Record<string, { ansikte?: 'arg' | 'lugn' | 'radd' }>)[gor]?.ansikte;
}
// när var och en senast slogs (bara för bilden), per by: varje by numrerar sina personer från 1
const senastIByn = new WeakMap<State, Map<number, number>>();
// ansiktet striden ger p just nu, eller undefined när humöret får bestämma. gor = handlingen (rövarens egen för en rövare)
export function stridAnsikte(s: State, p: Person, gor?: string): 'arg' | 'lugn' | 'radd' | undefined {
  const an = gor ? ansiktet(gor) : undefined;
  if (an === 'radd') return 'radd';
  let senast = senastIByn.get(s); if (!senast) senastIByn.set(s, senast = new Map());
  const kk = kartKampe(s, p);
  if (kk || an === 'arg') { senast.set(p.id, s.now); return 'arg'; }
  if (an === 'lugn') return 'lugn';
  const t = senast.get(p.id);
  if (t !== undefined && s.now >= t && s.now - t < STRIDANSIKTE.minne) return 'arg';
  if (t !== undefined) senast.delete(p.id);
  return undefined;
}
