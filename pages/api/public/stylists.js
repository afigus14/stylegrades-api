// pages/api/public/stylists.js
import { allowCors } from "../_lib/auth";
import { getAllApplications } from "../_lib/jsonStore";
import { getAllOverrides } from "../_lib/stylistOverridesStore";

function normalizeStatus(s) {
  return String(s || "pending").toLowerCase();
}

function appToStylist(app, idx) {
  return {
    id: String(app.id),
    fullName: app.fullName,
    name: app.fullName || app.name || "Stylist",

    email: app.email,
    phone: app.phone || "",

    city: app.city || "",
    state: app.state || "",
    zip: app.zip || "",

    specialties: Array.isArray(app.specialties) ? app.specialties : [],
    instagram: app.instagram || "",
    website: app.website || "",

    // images
    photoUrl: app.photoUrl || "",
    gallery: Array.isArray(app.gallery) ? app.gallery : [],

    tierRequested: app.tierRequested || "free",
    createdAt: app.createdAt,
    approvedAt: app.approvedAt,

    featured: !!app.featured,
    status: normalizeStatus(app.status),
    sortOrder: Number.isFinite(app.sortOrder) ? app.sortOrder : 1000 + idx,

    verified: true,
  };
}

function applyOverride(stylist, override) {
  if (!override) return stylist;
  const out = { ...stylist };

  if (typeof override.status === "string") out.status = normalizeStatus(override.status);
  if (typeof override.tierRequested === "string")
    out.tierRequested = String(override.tierRequested).toLowerCase();
  if (typeof override.featured === "boolean") out.featured = override.featured;
  if (typeof override.sortOrder === "number" && Number.isFinite(override.sortOrder))
    out.sortOrder = override.sortOrder;

  return out;
}

function sortStylists(list) {
  return list.sort((a, b) => {
    // featured first
    if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;

    // sortOrder asc
    const sa = Number.isFinite(a.sortOrder) ? a.sortOrder : 999999;
    const sb = Number.isFinite(b.sortOrder) ? b.sortOrder : 999999;
    if (sa !== sb) return sa - sb;

    // newest next
    const ca = a.approvedAt ? Date.parse(a.approvedAt) : 0;
    const cb = b.approvedAt ? Date.parse(b.approvedAt) : 0;
    if (ca !== cb) return cb - ca;

    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const [appsRaw, overrides] = await Promise.all([
      getAllApplications(),
      getAllOverrides(),
    ]);

    const apps = Array.isArray(appsRaw) ? appsRaw : [];
    const approved = apps
      .filter((a) => normalizeStatus(a.status) === "approved")
      .map(appToStylist)
      .map((s) => applyOverride(s, overrides[String(s.id)] || null))
      // hide inactive
      .filter((s) => normalizeStatus(s.status) !== "inactive");

    const sorted = sortStylists(approved);

    return res.status(200).json({
      ok: true,
      source: "json+overrides",
      stylists: sorted,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Server error",
      details: String(e?.message || e),
    });
  }
}
