// pages/api/admin/stylists/index.js
import { allowCors, requireAdmin } from "../../_lib/auth";
import { listApplications } from "../../_lib/jsonStore";

function normalizeStatus(s) {
  return String(s || "pending").toLowerCase();
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;
  if (!requireAdmin(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const apps = await listApplications();

    // "Managed stylists" are applications that have been approved at least once
    // and are either approved or inactive (still in the directory control panel).
    const stylists = (Array.isArray(apps) ? apps : [])
      .filter((a) => {
        const st = normalizeStatus(a.status);
        return st === "approved" || st === "inactive";
      })
      .map((a) => ({
        ...a,
        status: normalizeStatus(a.status),
        sortOrder:
          Number.isFinite(a.sortOrder) ? a.sortOrder : Number.MAX_SAFE_INTEGER,
        featured: !!a.featured,
      }))
      // Default ordering in admin:
      // featured first, then sortOrder asc, then newest approved first
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;

        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;

        const ad = Date.parse(a.approvedAt || a.createdAt || 0) || 0;
        const bd = Date.parse(b.approvedAt || b.createdAt || 0) || 0;
        return bd - ad;
      });

    return res.status(200).json({ ok: true, source: "json", stylists });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Server error",
      details: String(e?.message || e),
    });
  }
}
