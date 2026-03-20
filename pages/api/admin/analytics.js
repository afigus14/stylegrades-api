// pages/api/admin/analytics.js

import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), ".data", "analytics.json");
const APPLICATIONS_PATH = path.join(process.cwd(), ".data", "applications.json");

const TIER_PRICING = {
  free: 0,
  pro: 18,
  premium: 29,
};

function readJSON(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function monthLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("default", { month: "short" });
}

export default function handler(req, res) {
  const adminKey = req.headers["x-admin-key"];
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const analytics = readJSON(DATA_PATH) || { events: [] };
  const apps = readJSON(APPLICATIONS_PATH) || { applications: [] };

  const events = analytics.events || [];

  // ==============================
  // FUNNEL TOTALS
  // ==============================

  const totals = {
    views: 0,
    profileClicks: 0,
    contactClicks: 0,
    favorites: 0,
  };

  const byStylist = {};

  events.forEach((e) => {
    totals[e.event] = (totals[e.event] || 0) + 1;

    if (!byStylist[e.stylistId]) {
      byStylist[e.stylistId] = {
        stylistId: e.stylistId,
        counts: {
          views: 0,
          profileClicks: 0,
          contactClicks: 0,
          favorites: 0,
        },
      };
    }

    byStylist[e.stylistId].counts[e.event] =
      (byStylist[e.stylistId].counts[e.event] || 0) + 1;
  });

  const byStylistArray = Object.values(byStylist).map((row) => {
    const v = row.counts.views || 0;
    const p = row.counts.profileClicks || 0;
    const c = row.counts.contactClicks || 0;

    return {
      ...row,
      metrics: {
        profileClickRate: v ? p / v : 0,
        contactRate: v ? c / v : 0,
        contactFromProfileRate: p ? c / p : 0,
      },
    };
  });

  // ==============================
  // RANKINGS
  // ==============================

  const rankings = {
    topByViews: [...byStylistArray]
      .sort((a, b) => b.counts.views - a.counts.views)
      .slice(0, 5),

    topByContacts: [...byStylistArray]
      .sort((a, b) => b.counts.contactClicks - a.counts.contactClicks)
      .slice(0, 5),

    topByContactRate: [...byStylistArray]
      .filter((r) => r.counts.views >= 10)
      .sort((a, b) => b.metrics.contactRate - a.metrics.contactRate)
      .slice(0, 5),
  };

  // ==============================
  // TIER DISTRIBUTION
  // ==============================

  const tierCounts = { free: 0, pro: 0, premium: 0 };

  apps.applications.forEach((a) => {
    if (a.status === "approved") {
      const tier = a.tierRequested || "free";
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    }
  });

  // ==============================
  // MRR CALCULATION
  // ==============================

  const mrr =
    tierCounts.pro * TIER_PRICING.pro +
    tierCounts.premium * TIER_PRICING.premium;

  const forecast3mo = mrr * 3;

  // ==============================
  // MONTHLY TREND
  // ==============================

  const trendMap = {};

  events.forEach((e) => {
    if (!e.timestamp) return;

    const month = monthLabel(e.timestamp);
    if (!trendMap[month]) {
      trendMap[month] = {
        date: month,
        views: 0,
        contactClicks: 0,
      };
    }

    if (e.event === "views") trendMap[month].views++;
    if (e.event === "contactClicks")
      trendMap[month].contactClicks++;
  });

  const trend = Object.values(trendMap);

  // ==============================
  // AD PERFORMANCE
  // ==============================

  const adImpressions =
    events.filter((e) => e.event === "ad_impression").length;

  const adClicks =
    events.filter((e) => e.event === "ad_click").length;

  const adCTR =
    adImpressions > 0 ? adClicks / adImpressions : 0;

  return res.status(200).json({
    ok: true,
    totals,
    overall: {
      profileClickRate:
        totals.views > 0
          ? totals.profileClicks / totals.views
          : 0,
      contactRate:
        totals.views > 0
          ? totals.contactClicks / totals.views
          : 0,
      contactFromProfileRate:
        totals.profileClicks > 0
          ? totals.contactClicks / totals.profileClicks
          : 0,
    },
    rankings,
    byStylist: byStylistArray,
    tierCounts,
    mrr,
    forecast3mo,
    trend,
    ads: {
      impressions: adImpressions,
      clicks: adClicks,
      ctr: adCTR,
    },
  });
}