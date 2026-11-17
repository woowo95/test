// De sparade byarna som jamfor och balansen delar (testkedjan efter v530): en by med samma kod, samma balanstal och samma antal
// dygn körs aldrig två gånger. Koden räknas som innehållet i det som avgör byarna: en.ts och allt den importerar, fil för fil,
// och tsconfig.json och node-versionen. En ändring i scenarierna eller gränssnittet kör alltså inte om något.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROT = fileURLToPath(new URL('../..', import.meta.url));
const CACHE = join(ROT, 'node_modules', '.cache', 'jamfor');

// koden nu, som en hash (filen för en äldre version heter efter sin commit i jamfor)
export function kodHash(): string {
  const filer = new Set<string>(), ko = [join(ROT, 'src/test/en.ts')];
  const hitta = (dir: string, s: string) => {
    const p = resolve(dir, s);
    for (const f of [p, p + '.ts', join(p, 'index.ts')]) if (existsSync(f) && statSync(f).isFile()) return f;
    throw new Error(`hittar inte '${s}', som importeras i ${relative(ROT, dir)}.`);
  };
  while (ko.length) {
    const f = ko.pop()!;
    if (filer.has(f)) continue;
    filer.add(f);
    for (const [, s] of readFileSync(f, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"](\.\.?\/[^'"]+)['"]/g)) ko.push(hitta(dirname(f), s));
  }
  const h = createHash('sha1').update(process.version);
  for (const f of [...filer, join(ROT, 'tsconfig.json')].sort()) h.update(relative(ROT, f)).update(readFileSync(f));
  return 'nu-' + h.digest('hex');
}
// filen med byarna (frö → en.ts:s svar) för en kod, balanstalen (som text för BALANS, i bokstavsordning) och antal dygn
export function byCacheFil(kod: string, balans: string, dagar: number): string {
  mkdirSync(CACHE, { recursive: true });
  let b = balans.replace(/[^\w.=,-]/g, '_');
  if (b.length > 100) b = createHash('sha1').update(balans).digest('hex');
  return join(CACHE, `${kod}${balans ? '-med-' + b : ''}-${dagar}.json`);
}
export const lasByCache = <T>(fil: string): Record<number, T> => existsSync(fil) ? JSON.parse(readFileSync(fil, 'utf8')) : {};
