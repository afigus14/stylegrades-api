// pages/api/public/reviews-aggregate.js
import { getVerifiedAggregate } from "../../../server/lib/reviews.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const stylistId = String(req.query.stylistId || "").trim();
  if (!stylistId) {
    return res.status(400).json({ ok: false, error: "Missing stylistId" });
  }

  try {
    const agg = getVerifiedAggregate(stylistId);
    return res.status(200).json({ ok: true, ...agg });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
