// pages/api/admin/applications.js
import { allowCors, requireAdmin } from "../_lib/auth";
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

export default async function handler(req, res) {
  // CORS (must run for ALL methods, including OPTIONS)
  if (allowCors(req, res)) return;

  // Admin auth
  if (!requireAdmin(req, res)) return;

  // Only allow GET for listing
  if (req.method !== "GET") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const dataDir = path.join(process.cwd(), ".data");
    const filePath = path.join(dataDir, "applications.json");
    await ensureDir(dataDir);

    const existing = await readJson(filePath, []);
    const list = Array.isArray(existing) ? existing : [];

    return json(res, 200, { ok: true, source: "json", applications: list });
  } catch (err) {
    console.error("GET /api/admin/applications failed:", err);
    return json(res, 500, { ok: false, error: err?.message || "Server error" });
  }
}
