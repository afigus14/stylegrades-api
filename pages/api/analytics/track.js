// pages/api/analytics/track.js
import { allowCors } from "../_lib/auth";
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

function normalizeEvent(ev) {
  const e = String(ev || "").toLowerCase().trim();
  if (e === "view") return "view";
  if (e === "profile_click") return "profile_click";
  if (e === "contact_click") return "contact_click";
  if (e === "favorite") return "favorite";
  return "";
}

export default async function handler(req, res) {
  // CORS first (must run for OPTIONS too)
  if (allowCors(req, res)) return;

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const stylistId = String(body.stylistId || "").trim();
    const event = normalizeEvent(body.event);

    if (!stylistId) {
      return json(res, 400, { ok: false, error: "Missing stylistId" });
    }
    if (!event) {
      return json(res, 400, { ok: false, error: "Invalid event" });
    }

    const dataDir = path.join(process.cwd(), ".data");
    const filePath = path.join(dataDir, "analytics.json");
    await ensureDir(dataDir);

    // analytics.json structure:
    // {
    //   "stylistId": { views, profileClicks, contactClicks, favorites, lastEventAt }
    // }
    const existing = await readJson(filePath, {});
    const store = existing && typeof existing === "object" ? existing : {};

    const prev = store[stylistId] || {
      views: 0,
      profileClicks: 0,
      contactClicks: 0,
      favorites: 0,
      lastEventAt: null,
    };

    const next = { ...prev, lastEventAt: new Date().toISOString() };

    if (event === "view") next.views = (next.views || 0) + 1;
    if (event === "profile_click") next.profileClicks = (next.profileClicks || 0) + 1;
    if (event === "contact_click") next.contactClicks = (next.contactClicks || 0) + 1;
    if (event === "favorite") next.favorites = (next.favorites || 0) + 1;

    store[stylistId] = next;
    await writeJson(filePath, store);

    return json(res, 200, { ok: true, stylistId, event, counts: next });
  } catch (err) {
    console.error("POST /api/analytics/track failed:", err);
    return json(res, 500, { ok: false, error: err?.message || "Server error" });
  }
}
