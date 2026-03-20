// pages/api/admin/seed/hide.js
import { allowCors, requireAdmin } from "../../_lib/auth";
import { hideSeedId, unhideSeedId } from "../../_lib/hiddenSeedStore";

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
    const { id, hidden } = req.body || {};
    const sid = cleanString(id);

    if (!sid) {
      return res.status(400).json({ ok: false, error: "Missing id" });
    }

    // If hidden === true -> hide; hidden === false -> unhide
    // If hidden is missing, default to "hide"
    let next;
    if (hidden === false) next = await unhideSeedId(sid);
    else next = await hideSeedId(sid);

    return res.status(200).json({
      ok: true,
      id: sid,
      hidden: hidden === false ? false : true,
      hiddenSeedIds: next,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Server error",
      details: String(e?.message || e),
    });
  }
}
