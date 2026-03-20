// pages/api/admin/applications/[id].js
import { allowCors, requireAdmin } from "../../_lib/auth";
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

  const id = String(req.query.id || "").trim();
  if (!id) return json(res, 400, { ok: false, error: "Missing id" });

  try {
    const dataDir = path.join(process.cwd(), ".data");
    const appsPath = path.join(dataDir, "applications.json");
    await ensureDir(dataDir);

    const apps = await readJson(appsPath, []);
    const list = Array.isArray(apps) ? apps : [];
    const idx = list.findIndex((a) => String(a.id) === id);

    if (idx === -1) return json(res, 404, { ok: false, error: "Not found" });

    // GET single (optional)
    if (req.method === "GET") {
      return json(res, 200, { ok: true, application: list[idx] });
    }

    // DELETE application
    if (req.method === "DELETE") {
      const next = list.filter((a) => String(a.id) !== id);
      await writeJson(appsPath, next);
      return json(res, 200, { ok: true, deletedId: id });
    }

    // PATCH status or fields (optional)
    if (req.method === "PATCH") {
      const body = req.body || {};
      list[idx] = { ...list[idx], ...body, updatedAt: new Date().toISOString() };
      await writeJson(appsPath, list);
      return json(res, 200, { ok: true, application: list[idx] });
    }

    return json(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("admin applications [id] failed:", err);
    return json(res, 500, { ok: false, error: err?.message || "Server error" });
  }
}
