// pages/api/admin/approve-stylist.js
import { allowCors, requireAdmin } from "./_lib/auth"; // <-- WRONG if this file is in pages/api/admin/
// If this file is in pages/api/admin/approve-stylist.js use:
import { allowCors, requireAdmin as requireAdmin2 } from "../_lib/auth";
import { promises as fs } from "fs";
import path from "path";

function json(res, status, body) {
  return res.status(status).json(body);
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
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;
  if (!requireAdmin2(req, res)) return;

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const id = String(body.id || "").trim();
    if (!id) return json(res, 400, { ok: false, error: "Missing id" });

    const dataDir = path.join(process.cwd(), ".data");
    const appsPath = path.join(dataDir, "applications.json");
    const stylistsPath = path.join(dataDir, "stylists.json");
    await ensureDir(dataDir);

    const apps = await readJson(appsPath, []);
    const list = Array.isArray(apps) ? apps : [];

    const idx = list.findIndex((a) => String(a.id || "").trim() === id);
    if (idx === -1) {
      return json(res, 404, { ok: false, error: "Application not found" });
    }

    const app = list[idx];

    // mark application approved
    const now = new Date().toISOString();
    list[idx] = {
      ...app,
      status: "approved",
      approvedAt: app.approvedAt || now,
    };
    await writeJson(appsPath, list);

    // upsert into managed stylists store
    const stylists = await readJson(stylistsPath, []);
    const sList = Array.isArray(stylists) ? stylists : [];

    const stylistId = `app_${String(app.id || "").trim().replace(/^app_/, "")}`; // stable
    const stylist = {
      id: stylistId,
      stylistId,
      status: "approved",
      createdAt: app.createdAt || now,
      approvedAt: list[idx].approvedAt,
      fullName: app.fullName || app.name || "",
      name: app.fullName || app.name || "",
      email: app.email || "",
      phone: app.phone || "",
      city: app.city || "",
      state: app.state || "",
      zip: app.zip || "",
      specialties: Array.isArray(app.specialties) ? app.specialties : [],
      specialty: app.specialty || (Array.isArray(app.specialties) ? app.specialties[0] : "") || "Stylist",
      instagram: app.instagram || "",
      website: app.website || "",
      tierRequested: app.tierRequested || "free",
      notes: app.notes || "",

      // photos
      photoUrl: app.photoUrl || "",
      gallery: Array.isArray(app.gallery) ? app.gallery : [],
      photoLinks: Array.isArray(app.photoLinks) ? app.photoLinks : [],

      // admin controls defaults
      featured: false,
      sortOrder: null,
      verified: true,
    };

    const existingIdx = sList.findIndex((s) => String(s.id || "").trim() === stylistId);
    if (existingIdx === -1) sList.unshift(stylist);
    else sList[existingIdx] = { ...sList[existingIdx], ...stylist };

    await writeJson(stylistsPath, sList);

    return json(res, 200, { ok: true, application: list[idx], stylist });
  } catch (err) {
    console.error("POST /api/admin/approve-stylist failed:", err);
    return json(res, 500, { ok: false, error: err?.message || "Server error" });
  }
}
