// pages/api/admin/delete-application.js
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

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;
  if (!requireAdmin(req, res)) return;

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const id = String(req.body?.id || "").trim();
    if (!id) return json(res, 400, { ok: false, error: "Missing id" });

    const dataDir = path.join(process.cwd(), ".data");
    const appsPath = path.join(dataDir, "applications.json");
    await ensureDir(dataDir);

    const apps = await readJson(appsPath, []);
    const list = Array.isArray(apps) ? apps : [];

    const next = list.filter((a) => String(a.id || "").trim() !== id);
    const removed = next.length !== list.length;

    if (!removed) {
      return json(res, 404, { ok: false, error: "Application not found" });
    }

    await writeJson(appsPath, next);
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error("POST /api/admin/delete-application failed:", err);
    return json(res, 500, { ok: false, error: err?.message || "Server error" });
  }
}
