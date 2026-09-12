import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "*"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Load analytics events
    const { data: events, error } = await supabase
      .from("ad_events")
      .select("*");

    if (error) throw error;

    // Load approved stylist subscriptions
    const { data: stylists, error: stylistError } =
      await supabase
        .from("stylists")
        .select("tier_active, status");

    if (stylistError) throw stylistError;

    const approvedStylists = (stylists || []).filter(
      (s) => s.status === "approved"
    );

    const freeCount = approvedStylists.filter(
      (s) => (s.tier_active || "free") === "free"
    ).length;

    const proCount = approvedStylists.filter(
      (s) => s.tier_active === "pro"
    ).length;

    const premiumCount = approvedStylists.filter(
      (s) => s.tier_active === "premium"
    ).length;

    // Monthly Recurring Revenue
    const mrr =
      (proCount * 19) +
      (premiumCount * 39);

    const forecast3mo = mrr * 3;

    // Analytics event counts
    const profileViews = (events || []).filter(
      (e) => e.event_type === "profile_view"
    ).length;

    const profileClicks = (events || []).filter(
      (e) => e.event_type === "profile_click"
    ).length;

    const contactClicks = (events || []).filter(
      (e) => e.event_type === "contact_click"
    ).length;

    const adImpressions = (events || []).filter(
      (e) => e.event_type === "impression"
    ).length;

    const adClicks = (events || []).filter(
      (e) => e.event_type === "click"
    ).length;

    const ctr =
      adImpressions > 0
        ? (adClicks / adImpressions) * 100
        : 0;

    return res.status(200).json({
      ok: true,

      // Existing analytics
      profileViews,
      profileClicks,
      contactClicks,
      favorites: 0,

      // Dashboard compatibility
      mrr,
      forecast3mo,

      tierCounts: {
        free: freeCount,
        pro: proCount,
        premium: premiumCount,
      },

      ads: {
        impressions: adImpressions,
        clicks: adClicks,
        ctr,
      },

      totals: {
        views: profileViews,
        profileClicks,
        contactClicks,
        favorites: 0,
      },

      overall: {
        profileClickRate:
          profileViews > 0
            ? profileClicks / profileViews
            : 0,

        contactRate:
          profileViews > 0
            ? contactClicks / profileViews
            : 0,

        contactFromProfileRate:
          profileClicks > 0
            ? contactClicks / profileClicks
            : 0,
      },

      trend: [],

      rankings: {
        topByViews: [],
        topByContacts: [],
        topByContactRate: [],
      },

      byStylist: [],
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}