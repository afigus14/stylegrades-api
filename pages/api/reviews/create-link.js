// pages/api/admin/reviews/create-link.js
import { createReviewInvite } from "../../../../server/lib/reviews.js";

function isAuthorized(req) {
  const adminKey = process.env.ADMIN_API_KEY || "";
  if (!adminKey) return false;

  const headerKey = String(req.headers["x-admin-key"] || "").trim();
  const queryKey = String(req.query.key || "").trim();

  return headerKey === adminKey || queryKey === adminKey;
}

function getBaseUrl(req) {
  // Prefer explicit env if you set it
  // Example: https://your-api-domain.com
  const envBase = process.env.PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, "");

  // Fallback to request host
  const proto =
    String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() || "http";
  const host =
    String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();

  return `${proto}://${host}`;
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const { stylistId } = req.body || {};
    const sid = String(stylistId || "").trim();
    if (!sid) return res.status(400).json({ ok: false, error: "Missing stylistId" });

    const { token } = createReviewInvite({ stylistId: sid });

    // This should point to your FRONTEND review page route (you’ll add it)
    // Example: https://annefigus.github.io/stylegrades/#/review?stylistId=...&token=...
    // For now we return the token + a link template.
    const frontendBase =
      (process.env.FRONTEND_BASE_URL || "").replace(/\/+$/, "") || "";

    const reviewPath = `/review?stylistId=${encodeURIComponent(sid)}&token=${encodeURIComponent(
      token
    )}`;

    const link = frontendBase ? `${frontendBase}${reviewPath}` : reviewPath;

    return res.status(200).json({
      ok: true,
      stylistId: sid,
      token,
      link,
      // helpful: where submit goes on backend
      submitEndpoint: `${getBaseUrl(req)}/api/reviews/submit`,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
