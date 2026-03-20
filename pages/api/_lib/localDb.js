// pages/api/_lib/localDb.js
import fs from "fs/promises";
import path from "path";

const DB_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DB_DIR, "stylegrades-db.json");

const DEFAULT_DB = {
  applications: [], // newest first
};

// Ensure folder + file exist
async function ensureDb() {
  await fs.mkdir(DB_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
  }
}

async function readDb() {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, "utf8");
  try {
    const data = JSON.parse(raw);
    return {
      applications: Array.isArray(data.applications) ? data.applications : [],
    };
  } catch {
    // if file got corrupted, reset safely
    await fs.writeFile(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
    return { ...DEFAULT_DB };
  }
}

// Atomic-ish write: write temp then rename
async function writeDb(db) {
  await ensureDb();
  const tmp = DB_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

export async function listApplications() {
  const db = await readDb();
  return db.applications;
}

export async function addApplication(app) {
  const db = await readDb();
  db.applications.unshift(app); // newest first
  await writeDb(db);
  return app;
}

export async function getApplicationById(id) {
  const db = await readDb();
  return db.applications.find((a) => a.id === id) || null;
}

export async function updateApplication(updated) {
  const db = await readDb();
  db.applications = db.applications.map((a) =>
    a.id === updated.id ? updated : a
  );
  await writeDb(db);
  return updated;
}

export async function deleteApplicationById(id) {
  const db = await readDb();
  const before = db.applications.length;
  db.applications = db.applications.filter((a) => a.id !== id);
  await writeDb(db);
  return { deleted: before - db.applications.length };
}

export async function listApprovedStylists() {
  const apps = await listApplications();
  return apps
    .filter((a) => String(a.status || "").toLowerCase() === "approved")
    .map((app) => ({
      id: app.id,
      fullName: app.fullName,
      name: app.fullName,
      email: app.email,
      phone: app.phone || "",
      city: app.city || "",
      state: app.state || "",
      zip: app.zip || "",
      specialties: Array.isArray(app.specialties) ? app.specialties : [],
      instagram: app.instagram || "",
      website: app.website || "",
      photoUrl: app.photoUrl || "",
      gallery: Array.isArray(app.gallery) ? app.gallery : [],
      tierRequested: app.tierRequested || "free",
      createdAt: app.createdAt,
      approvedAt: app.approvedAt,
      featured: !!app.featured,
      verified: app.verified ?? true,
    }));
}
