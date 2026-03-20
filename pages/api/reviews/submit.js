// pages/api/reviews/submit.js
import { addVerifiedReview } from "../../../server/lib/reviews.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { stylistId, rating, comment, token } = req.body || {};

    const sid = String(stylistId || "").trim();
    const tok = String(token || "").trim();
    const cmt = String(comment || "").trim();

    if (!sid) return res.status(400).json({ ok: false, error: "Missing stylistId" });
    if (!tok) return res.status(400).json({ ok: false, error: "Missing token" });
    if (rating == null) return res.status(400).json({ ok: false, error: "Missing rating" });

    const rec = addVerifiedReview({
      stylistId: sid,
      rating,
      comment: cmt,
      token: tok,
    });

    return res.status(200).json({ ok: true, review: rec });
  } catch (err) {
    // Send a friendly message but keep the exact reason useful
    const msg = String(err?.message || "Unable to submit review");
    return res.status(400).json({ ok: false, error: msg });
  }
}
