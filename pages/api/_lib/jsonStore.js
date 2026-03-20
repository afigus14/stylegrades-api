// pages/api/_lib/jsonStore.js
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");

function nowIso() {
  return new Date().toISOString();
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Applications store
 * Supports BOTH:
 *  - { applications: [...] }   (preferred)
 *  - [...]                    (legacy)
 */
const APPLICATIONS_PATH = path.join(DATA_DIR, "applications.json");

export async function getAllApplications() {
  const data = await readJson(APPLICATIONS_PATH, { applications: [] });

  if (Array.isArray(data)) return data; // legacy shape
  if (data && Array.isArray(data.applications)) return data.applications;

  return [];
}

export async function saveAllApplications(list) {
  // Always write in preferred wrapped shape
  await writeJson(APPLICATIONS_PATH, { applications: Array.isArray(list) ? list : [] });
  return true;
}

export async function createApplication(fields) {
  const list = await getAllApplications();

  const app = {
    id: `app_${Date.now()}`,
    status: "pending",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    sortOrder: 0,
    ...fields,
  };

  list.unshift(app);
  await saveAllApplications(list);
  return app;
}

export async function getApplicationById(id) {
  const list = await getAllApplications();
  return list.find((a) => String(a.id) === String(id)) || null;
}

export async function updateApplicationById(id, patch) {
  const list = await getAllApplications();
  const idx = list.findIndex((a) => String(a.id) === String(id));
  if (idx < 0) return null;

  const updated = {
    ...list[idx],
    ...patch,
    id: list[idx].id,
    updatedAt: nowIso(),
  };

  list[idx] = updated;
  await saveAllApplications(list);
  return updated;
}

export async function deleteApplicationById(id) {
  const list = await getAllApplications();
  const before = list.length;
  const next = list.filter((a) => String(a.id) !== String(id));
  await saveAllApplications(next);
  return { deleted: next.length !== before };
}

/**
 * Stylists store for approved stylists (managed list)
 */
const STYLISTS_PATH = path.join(DATA_DIR, "stylists.json");

export async function getAllStylists() {
  const data = await readJson(STYLISTS_PATH, { stylists: [] });

  if (Array.isArray(data)) return data; // legacy
  if (data && Array.isArray(data.stylists)) return data.stylists;

  return [];
}

export async function saveAllStylists(list) {
  await writeJson(STYLISTS_PATH, { stylists: Array.isArray(list) ? list : [] });
  return true;
}

export async function upsertStylist(stylist) {
  const list = await getAllStylists();
  const id = String(stylist.id);

  const idx = list.findIndex((s) => String(s.id) === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...stylist, id };
  } else {
    list.unshift({ ...stylist, id });
  }

  await saveAllStylists(list);
  return list.find((s) => String(s.id) === id) || null;
}
