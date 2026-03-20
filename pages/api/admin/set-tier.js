import { allowCors, requireAdmin } from "../_lib/auth";

export default async function handler(req, res) {
  if (allowCors(req, res)) return;

  const auth = requireAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { stylistId, tier } = req.body || {};
  const allowed = ["free", "plus", "pro"];

  if (!stylistId || !tier) {
    return res.status(400).json({ error: "Missing stylistId or tier" });
  }
  if (!allowed.includes(tier)) {
    return res.status(400).json({ error: `Invalid tier. Use: ${allowed.join(", ")}` });
  }

  // TODO: Replace with KV/DB update
  return res.status(200).json({ ok: true, stylistId, tier });
}
