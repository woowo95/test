// Knappen Det här är konstigt (steg 12.1.41, Att hitta felen: Rapporten). I rutan för en person, en sak, en station eller ett hus
// står en liten symbol. Ett tryck öppnar en rad att skriva i (den får lämnas tom), och Spara lägger en rapport i spelets
// databas: det spelaren skrev, vad som var valt, personens handling, skäl, fas, plats och börda, hens senaste rader i
// personloggen, förråden mot sina mål, de öppna behoven, de senaste händelserna, versionen och byn som fil (byfil.ts).
// En chatt läser rapporterna med ArtifactData (samlingen `rapporter`, och byn i bitar i `rapportfil`, hämtade som filer med
// out_dir och hopsatta med npm run rapport), undersöker var och en i den sparade byn (npm run by) och tar bort rapporten när felet är rättat eller förklarat. Samlingarna ligger utanför
// data/users/, som är privat också för ägaren, så att chatten kan läsa dem. Filen rör aldrig byn
import { ACTS, Person, STATIONER, State, byId, husById, husVisas, sakNamn, stationById } from '../sim';
import { iconImg } from '../ikoner';
import { bar, behovNu, forradNu } from './bylage';
import { byTillFil } from './byfil';
import { esc } from './hjalp';
import { s, ui } from './lage';

declare const __SPELVERSION__: string | undefined;
export const spelVersion = () => typeof __SPELVERSION__ === 'string' ? __SPELVERSION__ : 'okänd';
// rutorna som har knappen, och vad som är valt i var och en
export const KONSTIG_RUTOR = ['person', 'sak', 'station', 'hus'] as const;
export type KonstigRuta = typeof KONSTIG_RUTOR[number];
export interface Valt { selected?: number; sak?: string; stationId?: number; husId?: number }
export const BIT = 80000; // byn i bitar om högst så här många tecken (ett dokument rymmer 256 KB, som sparningen i spara.ts)

export interface Rapport {
  id: string; t: number; byTid: number; seed: number; version: string; text: string;
  valt: { ruta: KonstigRuta; vad: string };
  person?: { id: number; namn: string; handling: string; act?: string; skal: string; fas?: string; plats: string; mal?: string; bar: string; kropp: string; logg: string[] };
  forrad: string; behov: string; handelser: string[]; filBitar: number;
}
const r1 = (v: number) => Math.round(v * 10) / 10, pr = (v: number) => `${Math.round(v * 100)} %`;
// vad som är valt, i ord
function valtText(s: State, ruta: KonstigRuta, v: Valt) {
  if (ruta === 'person') return byId(s, v.selected ?? -1)?.name ?? 'ingen';
  if (ruta === 'hus') { const h = husById(s, v.husId ?? -1); return h ? `${husVisas(s, h)} (hus ${h.id})` : 'inget hus'; }
  if (ruta === 'station') { const t = stationById(s, v.stationId); return t ? `${(STATIONER as Record<string, { namn?: string }>)[t.k]?.namn ?? t.k} (${t.id}) på ${t.x},${t.y}` : 'ingen station'; }
  const [slag, rest] = (v.sak ?? '').split(':');
  return slag === 't' ? `${sakNamn((s.ting ?? []).find(t => t.id === Number(rest))?.k ?? '?')} (ting ${rest})` : v.sak ?? '';
}
function personDel(s: State, p: Person): Rapport['person'] {
  const t = p.task;
  return {
    id: p.id, namn: p.name, handling: t ? ACTS[t.act]?.namn ?? t.act : 'väljer', act: t?.act, skal: t?.why ?? '', fas: t?.phase,
    plats: `${r1(p.x)},${r1(p.y)}`, mal: t ? `${r1(t.tx)},${r1(t.ty)}` : undefined, bar: bar(s, p),
    kropp: `mätt ${pr(p.hunger)}, törst ${pr(p.torst)}, värme ${pr(p.warm)}, vila ${pr(p.rest)}, hälsa ${pr(p.health)}`,
    logg: (p.hand ?? []).slice(-15).map(([tt, , text]) => `${new Date(tt).toISOString().slice(0, 16)} ${text}`),
  };
}
// rapporten (utan byn som fil, som sparas i bitar bredvid)
export function rapport(s: State, ruta: KonstigRuta, v: Valt, text: string, nu = Date.now()): { r: Rapport; fil: string[] } {
  const fil = byTillFil(s), bitar: string[] = [];
  for (let i = 0; i < fil.length; i += BIT) bitar.push(fil.slice(i, i + BIT));
  const p = byId(s, v.selected ?? -1);
  const r: Rapport = {
    id: `r${nu.toString(36)}`, t: nu, byTid: s.now, seed: s.seed, version: spelVersion(), text: text.trim(),
    valt: { ruta, vad: valtText(s, ruta, v) }, ...(p ? { person: personDel(s, p) } : {}),
    forrad: forradNu(s), behov: behovNu(s), handelser: s.log.slice(-20).map(e => `${new Date(e.t).toISOString().slice(0, 16)} ${e.text}`), filBitar: bitar.length,
  };
  return { r, fil: bitar };
}
// spelets databas (claude.use('db')): rapporten i rapporter/<id>, och byn i rapportfil/<id>-<i>. Bitarna skrivs först, så att en
// rapport bara finns när hela byn finns
export interface Db { doc(path: string): { set(v: unknown): Promise<unknown> } }
export async function sparaRapport(db: Db, r: Rapport, fil: string[]) {
  for (let i = 0; i < fil.length; i++) await db.doc(`rapportfil/${r.id}-${i}`).set({ r: r.id, i, t: fil[i] });
  await db.doc(`rapporter/${r.id}`).set(r);
}

// ---------- i rutan ----------
let oppen: string | undefined, status = '';
const nyckel = (ruta: string, v: Valt) => `${ruta}:${ruta === 'person' ? v.selected : ruta === 'hus' ? v.husId : ruta === 'station' ? v.stationId : v.sak}`;
// symbolen, och raden att skriva i när den är öppen (panel.ts lägger den under bandet i de fyra rutorna)
export function konstigHtml(ruta: string, v: Valt) {
  if (!(KONSTIG_RUTOR as readonly string[]).includes(ruta)) return '';
  const k = nyckel(ruta, v), on = oppen === k, sym = iconImg('konstigt') || '?!';
  const knapp = `<button type="button" class="ghost konstig" data-konstig="${esc(k)}" aria-expanded="${on}" title="Det här är konstigt: spara en rapport om det du ser" aria-label="Det här är konstigt">${sym}</button>`;
  if (!on) return `<div class="konstigrad">${knapp}</div>`;
  return `<div class="konstigrad">${knapp}<input id="konstigText" type="text" maxlength="500" placeholder="Vad är konstigt? (får lämnas tom)" aria-label="Vad är konstigt"><button type="button" class="ghost" data-konstig-spara="${esc(k)}" title="Spara rapporten i spelets databas">Spara</button>${status ? ` <span class="muted">${esc(status)}</span>` : ''}</div>`;
}
// sparningen från rutan: byn som visas, det som är valt och spelets databas. false = det gick inte (ingen databas, inget svar)
async function sparaNu(ruta: KonstigRuta, text: string) {
  try {
    const db = await (window as unknown as { claude?: { use(n: string): Promise<Db | null> } }).claude?.use('db');
    if (!db || !s) return false;
    const { r, fil } = rapport(s, ruta, { selected: ui.selected, sak: ui.sak, stationId: ui.stationId, husId: ui.husId }, text);
    await sparaRapport(db, r, fil);
    return true;
  } catch { return false; }
}
// ett tryck i panelen (panel.ts): true om det gällde knappen
export function konstigKlick(el: HTMLElement, spara: (ruta: KonstigRuta, text: string) => Promise<boolean> = sparaNu) {
  const b = el.closest<HTMLElement>('[data-konstig]');
  if (b) { oppen = oppen === b.dataset.konstig ? undefined : b.dataset.konstig; status = ''; return true; }
  const sp = el.closest<HTMLElement>('[data-konstig-spara]');
  if (!sp) return false;
  const text = (document.getElementById('konstigText') as HTMLInputElement | null)?.value ?? '';
  status = 'Sparar …';
  void spara(sp.dataset.konstigSpara!.split(':')[0] as KonstigRuta, text).then(ok => { status = ok ? 'Sparad. Tack!' : 'Gick inte att spara (spelets databas svarar inte).'; if (ok) setTimeout(() => { oppen = undefined; status = ''; }, 2500); });
  return true;
}
