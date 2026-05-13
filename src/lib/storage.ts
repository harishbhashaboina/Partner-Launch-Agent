import { promises as fs } from "fs";
import path from "path";
import type { Partner, Store } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const emptyStore: Store = { partners: {}, order: [] };

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(emptyStore, null, 2), "utf8");
  }
}

let writeLock: Promise<unknown> = Promise.resolve();

export async function readStore(): Promise<Store> {
  await ensureFile();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as Store;
    return {
      partners: parsed.partners ?? {},
      order: parsed.order ?? [],
    };
  } catch {
    return { ...emptyStore };
  }
}

export async function writeStore(store: Store): Promise<void> {
  await ensureFile();
  const run = async () => {
    const tmp = STORE_PATH + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
    await fs.rename(tmp, STORE_PATH);
  };
  writeLock = writeLock.then(run, run);
  await writeLock;
}

export async function listPartners(): Promise<Partner[]> {
  const store = await readStore();
  return store.order.map((id) => store.partners[id]).filter(Boolean);
}

export async function getPartner(id: string): Promise<Partner | null> {
  const store = await readStore();
  return store.partners[id] ?? null;
}

export async function getPartnerByChatToken(
  token: string,
): Promise<Partner | null> {
  const store = await readStore();
  for (const id of store.order) {
    const p = store.partners[id];
    if (p?.partnerChat?.token === token) return p;
  }
  return null;
}

export async function upsertPartner(partner: Partner): Promise<Partner> {
  const store = await readStore();
  const existed = Boolean(store.partners[partner.id]);
  store.partners[partner.id] = {
    ...partner,
    updatedAt: new Date().toISOString(),
  };
  if (!existed) store.order.unshift(partner.id);
  await writeStore(store);
  return store.partners[partner.id];
}

export async function updatePartner(
  id: string,
  patch: (p: Partner) => Partner | Promise<Partner>,
): Promise<Partner> {
  const store = await readStore();
  const current = store.partners[id];
  if (!current) throw new Error(`Partner ${id} not found`);
  const next = await patch(current);
  store.partners[id] = { ...next, updatedAt: new Date().toISOString() };
  await writeStore(store);
  return store.partners[id];
}

export async function deletePartner(id: string): Promise<void> {
  const store = await readStore();
  delete store.partners[id];
  store.order = store.order.filter((x) => x !== id);
  await writeStore(store);
}
