// pages/api/admin/seed/unhide.js
import { allowCors, requireAdmin } from "../../_lib/auth";
import { unhideSeedId } from "../../_lib/seedHiddenStore";

function cleanString(v) {
  if (v == null) return "";
  return String(v).trim();
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;
  if (!requireAdmin(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const seedId = cleanString(req.body?.seedId);
    if (!seedId) return res.status(400).json({ ok: false, error: "Missing seedId" });

    const hiddenSeedIds = await unhideSeedId(seedId);
    return res.status(200).json({ ok: true, hiddenSeedIds });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Server error",
      details: String(e?.message || e),
    });
  }
}
