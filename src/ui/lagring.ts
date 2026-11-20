// ---------- sparningen i webbläsarens databas (steg 11.2.1, Världens kostnad och lagringen i designdokumentet) ----------
// Byn och världen ryms inte tillsammans i webbläsarens enkla minne (localStorage, några MB), så byn sparas i webbläsarens
// databas (IndexedDB): en post per del av byn (serializeParts i steg.ts), och en post för byn som säger vilka delar den har.
// Alla poster för en by skrivs i en och samma transaktion, så en sparning som avbryts lämnar den förra hel. En del som inte
// ändrats sedan förra sparningen skrivs inte om (historikens gamla veckor).
// En by som sparats på det gamla sättet (hela byn som en text i det enkla minnet) läses därifrån och flyttas över första
// gången: den skrivs i databasen och tas sedan bort ur det enkla minnet.
// Filen frågar bara simuleringen, så att scenariot sparbas kan pröva den med en databas i minnet (minnesBas).
import { State, arVacktDel, joinParts, lasVackta, migrate, serializeParts } from '../sim';

// en by i databasen: delarnas texter och det som hör till byn utöver den (en annan bys tid, byar.ts)
export interface Post<E> { delar: Record<string, string>; extra?: E }
export interface Bas {
  las(by: string): Promise<Post<unknown> | undefined>;
  // skriver delarna och tar bort de delar byn hade förut men inte har längre; allt eller inget
  skriv(by: string, delar: Record<string, string>, extra?: unknown): Promise<void>;
  taBort(by: string): Promise<void>;
}

// ur delarna (byn först, sedan resten i namnordning) blir byn som den sparades; undefined om den inte går att tolka
export function tolka(post: Post<unknown> | undefined): State | null {
  if (!post?.delar.byn) return null;
  const namn = Object.keys(post.delar).filter(d => d !== 'byn' && !arVacktDel(d)).sort();
  let s: State | null;
  try { s = tolkaText(joinParts([post.delar.byn, ...namn.map(d => post.delar[d])])); } catch { return null; }
  if (s) try { lasVackta(s, post.delar); } catch { /* en trasig väckt by tappas; huvudbyn läses ändå */ }
  return s; // de väckta byarna i egna delar (steg 11.13.9)
}
export function tolkaText(txt: string | null | undefined): State | null {
  if (!txt) return null;
  try { const o = JSON.parse(txt); return o && typeof o.v === 'number' && Array.isArray(o.people) ? migrate(o) : null; } catch { return null; }
}
export const sparaBy = (bas: Bas, by: string, s: State, extra?: unknown) => bas.skriv(by, serializeParts(s), extra);
export async function lasBy<E>(bas: Bas, by: string): Promise<{ by: State; extra?: E } | undefined> {
  const p = await bas.las(by), st = tolka(p);
  return st ? { by: st, extra: p!.extra as E } : undefined;
}

// Byn ur databasen, och annars den gamla sparningen ur det enkla minnet (gammal), som då flyttas över: den skrivs i databasen
// och tas bort ur det enkla minnet först när skrivningen gått igenom. extra räknas ur den gamla posten
export async function lasEllerFlytta<E>(bas: Bas, by: string, gammal: Gammal, extra?: (txt: string) => { t: string; extra?: E }):
Promise<{ by: State; extra?: E } | undefined> {
  const ny = await lasBy<E>(bas, by);
  if (ny) return ny;
  const txt = gammal.hamta();
  if (txt == null) return undefined;
  const g = extra ? extra(txt) : { t: txt };
  const st = tolkaText(g.t);
  if (!st) return undefined;
  try { await sparaBy(bas, by, st, g.extra); gammal.glom(); } catch { /* ligger kvar i det enkla minnet till nästa gång */ }
  return { by: st, extra: g.extra };
}
// en gammal sparning i det enkla minnet
export interface Gammal { hamta(): string | null; glom(): void }
export const gammalNyckel = (nyckel: string): Gammal => ({
  hamta: () => { try { return localStorage.getItem(nyckel); } catch { return null; } },
  glom: () => { try { localStorage.removeItem(nyckel); } catch { /* ignoreras */ } },
});

// ---------- databasen i webbläsaren: en tabell, nyckeln "by/del" för delarna och "by" för byns post ----------
const DB_NAMN = 'samhallssimulatorn', TABELL = 'delar';
const delNyckel = (by: string, d: string) => `${by}/${d}`;
interface ByPost { delar: string[]; extra?: unknown }
const klar = (tx: IDBTransaction) => new Promise<void>((ok, nej) => { tx.oncomplete = () => ok(); tx.onerror = tx.onabort = () => nej(tx.error ?? new Error('sparningen avbröts')); });
let oppen: Promise<IDBDatabase> | undefined;
function oppna(): Promise<IDBDatabase> {
  if (oppen) return oppen;
  const p: Promise<IDBDatabase> = new Promise((ok, nej) => {
    const r = indexedDB.open(DB_NAMN, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(TABELL)) r.result.createObjectStore(TABELL); };
    r.onsuccess = () => {
      // webbläsaren kan stänga förbindelsen (när fliken legat i bakgrunden, eller en annan flik vill uppgradera databasen):
      // då öppnas den på nytt nästa gång (steg 12.1.23)
      const db = r.result;
      db.onclose = () => { if (oppen === p) oppen = undefined; };
      db.onversionchange = () => { db.close(); if (oppen === p) oppen = undefined; };
      ok(db);
    };
    r.onerror = () => { if (oppen === p) oppen = undefined; nej(r.error); };
  });
  return oppen = p;
}
// försöker en gång till med en ny förbindelse när den första inte gick (steg 12.1.23): förbindelsen kan ha stängts mellan gångerna
async function forsok<T>(f: (db: IDBDatabase) => Promise<T>): Promise<T> {
  try { return await f(await oppna()); } catch { oppen = undefined; return f(await oppna()); }
}
// det som skrivits senast för varje del, så att en oförändrad del inte skrivs om
const skrivet = new Map<string, string>();
export const webbBas: Bas = {
  las: by => forsok(async db => {
    // delarna frågas i samma händelse som byns post kom, så att transaktionen inte hinner stängas emellan
    const tx = db.transaction(TABELL), t = tx.objectStore(TABELL), slut = klar(tx);
    let post: ByPost | undefined;
    const delar: Record<string, string> = {};
    const r = t.get(by);
    r.onsuccess = () => {
      post = r.result as ByPost | undefined;
      for (const d of post?.delar ?? []) {
        const q = t.get(delNyckel(by, d));
        q.onsuccess = () => { if (typeof q.result === 'string') { delar[d] = q.result; skrivet.set(delNyckel(by, d), q.result); } };
      }
    };
    await slut;
    return post ? { delar, extra: post.extra } : undefined;
  }),
  skriv: (by, delar, extra) => forsok(async db => {
    // det som skrivs räknas som skrivet redan när det läggs i transaktionen, så att en sparning som börjar innan den förra
    // är klar (transaktionerna går i den ordning de börjar) jämför med det som då står i databasen
    const tx = db.transaction(TABELL, 'readwrite'), t = tx.objectStore(TABELL), slut = klar(tx);
    // byns förra post läses först i transaktionen: de delar den hade men inte har längre (en ny by har färre veckor) tas bort
    const forut = t.get(by);
    forut.onsuccess = () => {
      for (const d of (forut.result as ByPost | undefined)?.delar ?? []) if (!(d in delar)) { t.delete(delNyckel(by, d)); skrivet.delete(delNyckel(by, d)); }
    };
    for (const [d, txt] of Object.entries(delar)) {
      const k = delNyckel(by, d);
      if (skrivet.get(k) !== txt) { t.put(txt, k); skrivet.set(k, txt); }
    }
    t.put({ delar: Object.keys(delar), extra } satisfies ByPost, by);
    try { await slut; } catch (e) { for (const d in delar) skrivet.delete(delNyckel(by, d)); throw e; }
  }),
  taBort: by => forsok(async db => {
    const tx = db.transaction(TABELL, 'readwrite'), t = tx.objectStore(TABELL), slut = klar(tx);
    const forut = t.get(by);
    forut.onsuccess = () => {
      for (const d of (forut.result as ByPost | undefined)?.delar ?? []) { t.delete(delNyckel(by, d)); skrivet.delete(delNyckel(by, d)); }
      t.delete(by);
    };
    await slut;
  }),
};

// en databas i minnet med samma regler, för scenariot (sparbas)
export function minnesBas(): Bas & { poster: Map<string, unknown> } {
  const poster = new Map<string, unknown>();
  return {
    poster,
    async las(by) {
      const post = poster.get(by) as ByPost | undefined;
      if (!post) return undefined;
      const delar: Record<string, string> = {};
      for (const d of post.delar) { const txt = poster.get(delNyckel(by, d)); if (typeof txt === 'string') delar[d] = txt; }
      return { delar, extra: structuredClone(post.extra) };
    },
    async skriv(by, delar, extra) {
      const forut = poster.get(by) as ByPost | undefined;
      for (const d of forut?.delar ?? []) if (!(d in delar)) poster.delete(delNyckel(by, d));
      for (const [d, txt] of Object.entries(delar)) poster.set(delNyckel(by, d), txt);
      poster.set(by, structuredClone({ delar: Object.keys(delar), extra }));
    },
    async taBort(by) {
      const forut = poster.get(by) as ByPost | undefined;
      for (const d of forut?.delar ?? []) poster.delete(delNyckel(by, d));
      poster.delete(by);
    },
  };
}
