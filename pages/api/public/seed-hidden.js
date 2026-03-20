// pages/api/public/seed-hidden.js
import { allowCors } from "../_lib/auth";
import { getHiddenSeedIds } from "../_lib/hiddenSeedStore";

export default async function handler(req, res) {
  if (allowCors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const hiddenSeedIds = await getHiddenSeedIds();
    return res.status(200).json({ ok: true, hiddenSeedIds });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Server error",
      details: String(e?.message || e),
    });
  }
}
