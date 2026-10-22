import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizeEvent(event) {
  const e = String(event || "").toLowerCase().trim();

  if (e === "view" || e === "profile_view") return "profile_view";
  if (e === "profile_click") return "profile_click";
  if (e === "contact_click") return "contact_click";
  if (e === "favorite") return "favorite";

  return "";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const stylistId = String(req.body?.stylistId || "").trim();
    const eventType = normalizeEvent(req.body?.event);

    if (!stylistId) {
      return res.status(400).json({
        ok: false,
        error: "Missing stylistId",
      });
    }

    if (!eventType) {
      return res.status(400).json({
        ok: false,
        error: "Invalid event",
      });
    }

    const { error } = await supabase
      .from("ad_events")
      .insert({
        stylist_id: stylistId,
        event_type: eventType,
      });

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      stylistId,
      event: eventType,
    });
  } catch (err) {
    console.error("POST /api/analytics/track failed:", err);

    return res.status(500).json({
      ok: false,
      error: err?.message || "Server error",
    });
  }
}