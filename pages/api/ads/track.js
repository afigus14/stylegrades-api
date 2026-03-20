// pages/api/ads/track.js
import { allowCors } from "../_lib/auth";
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

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function clampStr(v, max = 200) {
  return String(v || "").trim().slice(0, max);
}

function keyOf({ placement, advertiserId, campaignId, creativeId }) {
  // Stable aggregation key
  return [
    clampStr(placement, 60),
    clampStr(advertiserId, 60),
    clampStr(campaignId, 60),
    clampStr(creativeId, 60),
  ].join("|");
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};

    const event = clampStr(body.event, 32); // "impression" | "click"
    const placement = clampStr(body.placement, 60); // "rail_left" | "rail_right" | "inline_feed"
    const advertiserId = clampStr(body.advertiserId, 80);
    const campaignId = clampStr(body.campaignId, 80);
    const creativeId = clampStr(body.creativeId, 80);

    // Optional context (useful later for revenue reporting)
    const page = clampStr(body.page, 80); // "search" | "profile" | "home"
    const route = clampStr(body.route, 200); // "/search" "/profile/..."
    const stylistId = clampStr(body.stylistId, 80); // optional: relate ad to a stylist page
    const ref = clampStr(body.ref, 200); // optional: free-form (e.g. "directory_top")

    if (!event || !placement || !advertiserId || !campaignId) {
      return json(res, 400, {
        ok: false,
        error:
          "Missing required fields: event, placement, advertiserId, campaignId",
      });
    }

    if (event !== "impression" && event !== "click") {
      return json(res, 400, { ok: false, error: "Invalid event type" });
    }

    // Store in .data/ads.json
    const dataDir = path.join(process.cwd(), ".data");
    const filePath = path.join(dataDir, "ads.json");
    await ensureDir(dataDir);

    const store = await readJson(filePath, {
      totals: { impressions: 0, clicks: 0 },
      byKey: {}, // key -> counts + metadata
      recent: [], // last N events for debugging
    });

    store.totals = store.totals || { impressions: 0, clicks: 0 };
    store.byKey = store.byKey || {};
    store.recent = Array.isArray(store.recent) ? store.recent : [];

    const k = keyOf({ placement, advertiserId, campaignId, creativeId });
    const now = new Date().toISOString();

    const existing = store.byKey[k] || {
      placement,
      advertiserId,
      campaignId,
      creativeId: creativeId || "",
      counts: { impressions: 0, clicks: 0 },
      firstSeenAt: now,
      lastSeenAt: now,
      // Optional breakdown buckets (simple maps)
      byPage: {}, // page -> { impressions, clicks }
    };

    existing.lastSeenAt = now;

    if (!existing.byPage) existing.byPage = {};
    const pageKey = page || "unknown";
    if (!existing.byPage[pageKey]) {
      existing.byPage[pageKey] = { impressions: 0, clicks: 0 };
    }

    if (event === "impression") {
      store.totals.impressions += 1;
      existing.counts.impressions += 1;
      existing.byPage[pageKey].impressions += 1;
    } else {
      store.totals.clicks += 1;
      existing.counts.clicks += 1;
      existing.byPage[pageKey].clicks += 1;
    }

    store.byKey[k] = existing;

    // Save recent event log (cap)
    store.recent.unshift({
      id: `evt_${Date.now()}`,
      at: now,
      event,
      placement,
      advertiserId,
      campaignId,
      creativeId: creativeId || "",
      page: page || "",
      route: route || "",
      stylistId: stylistId || "",
      ref: ref || "",
    });
    store.recent = store.recent.slice(0, 200);

    await writeJson(filePath, store);

    return json(res, 200, { ok: true, at: now });
  } catch (err) {
    console.error("POST /api/ads/track failed:", err);
    return json(res, 500, { ok: false, error: err?.message || "Server error" });
  }
}
