// pages/api/admin/ads.js
import { allowCors, requireAdmin } from "../_lib/auth";
import { promises as fs } from "fs";
import path from "path";

function json(res, status, body) {
  return res.status(status).json(body);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function num(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function rate(clicks, impressions) {
  const i = num(impressions);
  if (i <= 0) return 0;
  return num(clicks) / i;
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;
  if (!requireAdmin(req, res)) return;

  if (req.method !== "GET") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const dataDir = path.join(process.cwd(), ".data");
    const filePath = path.join(dataDir, "ads.json");
    await ensureDir(dataDir);

    const store = await readJson(filePath, {
      totals: { impressions: 0, clicks: 0 },
      byKey: {},
      recent: [],
    });

    const byKey = store?.byKey && typeof store.byKey === "object" ? store.byKey : {};

    const rows = Object.values(byKey).map((r) => {
      const impressions = num(r?.counts?.impressions);
      const clicks = num(r?.counts?.clicks);
      return {
        placement: r.placement || "unknown",
        advertiserId: r.advertiserId || "unknown",
        campaignId: r.campaignId || "unknown",
        creativeId: r.creativeId || "",
        counts: { impressions, clicks },
        ctr: rate(clicks, impressions),
        firstSeenAt: r.firstSeenAt || null,
        lastSeenAt: r.lastSeenAt || null,
        byPage: r.byPage || {},
      };
    });

    const totals = {
      impressions: num(store?.totals?.impressions),
      clicks: num(store?.totals?.clicks),
      ctr: rate(num(store?.totals?.clicks), num(store?.totals?.impressions)),
    };

    // Rollups by placement / advertiser / campaign
    const rollup = (getKey) => {
      const m = new Map();
      for (const r of rows) {
        const k = getKey(r);
        const prev = m.get(k) || { impressions: 0, clicks: 0 };
        prev.impressions += num(r.counts.impressions);
        prev.clicks += num(r.counts.clicks);
        m.set(k, prev);
      }
      return Array.from(m.entries()).map(([k, v]) => ({
        key: k,
        impressions: v.impressions,
        clicks: v.clicks,
        ctr: rate(v.clicks, v.impressions),
      }));
    };

    const byPlacement = rollup((r) => r.placement).sort((a, b) => b.impressions - a.impressions);
    const byAdvertiser = rollup((r) => r.advertiserId).sort((a, b) => b.impressions - a.impressions);
    const byCampaign = rollup((r) => `${r.advertiserId} / ${r.campaignId}`).sort(
      (a, b) => b.impressions - a.impressions
    );

    const topCampaignsByClicks = [...byCampaign].sort((a, b) => b.clicks - a.clicks).slice(0, 10);

    // Recent events (debug)
    const recent = Array.isArray(store?.recent) ? store.recent.slice(0, 50) : [];

    return json(res, 200, {
      ok: true,
      generatedAt: new Date().toISOString(),
      totals,
      rows,
      rollups: {
        byPlacement,
        byAdvertiser,
        byCampaign,
        topCampaignsByClicks,
      },
      recent,
    });
  } catch (err) {
    console.error("GET /api/admin/ads failed:", err);
    return json(res, 500, { ok: false, error: err?.message || "Server error" });
  }
}
