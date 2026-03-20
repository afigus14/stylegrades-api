// pages/api/_lib/stylistOverridesStore.js
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE_PATH = path.join(DATA_DIR, "stylist-overrides.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(FILE_PATH);
  } catch {
    const initial = { overrides: {} };
    await fs.writeFile(FILE_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readStore() {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf8");
  const parsed = JSON.parse(raw || "{}");
  return {
    overrides: parsed && typeof parsed.overrides === "object" ? parsed.overrides : {},
  };
}

async function writeStore(next) {
  await ensureFile();
  const tmp = FILE_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, FILE_PATH);
}

export async function getOverride(id) {
  const store = await readStore();
  return store.overrides[String(id)] || null;
}

export async function setOverride(id, patch) {
  const store = await readStore();
  const key = String(id);
  const existing = store.overrides[key] || {};
  const now = new Date().toISOString();

  const next = {
    ...existing,
    ...patch,
    id: key,
    updatedAt: now,
    createdAt: existing.createdAt || now,
  };

  store.overrides[key] = next;
  await writeStore(store);
  return next;
}

export async function deleteOverride(id) {
  const store = await readStore();
  const key = String(id);
  const existed = !!store.overrides[key];
  if (existed) {
    delete store.overrides[key];
    await writeStore(store);
  }
  return { deleted: existed };
}

export async function getAllOverrides() {
  const store = await readStore();
  return store.overrides || {};
}
