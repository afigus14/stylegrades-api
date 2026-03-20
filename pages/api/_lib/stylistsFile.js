// pages/api/_lib/stylistsFile.js
import fs from "fs/promises";
import path from "path";

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function addApprovedStylistToFile({ application }) {
  const filePath = process.env.STYLISTS_JSON_PATH;

  if (!filePath) {
    return {
      ok: false,
      wrote: false,
      reason: "STYLISTS_JSON_PATH is not set",
    };
  }

  // Normalize Windows path safely
  const resolved = path.resolve(filePath);

  // Read file
  const raw = await fs.readFile(resolved, "utf8");
  const parsed = safeJsonParse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(
      `STYLISTS_JSON_PATH does not contain a JSON array: ${resolved}`
    );
  }

  // Avoid duplicates by email (and also by app id)
  const email = (application.email || "").trim().toLowerCase();
  const already = parsed.find(
    (s) =>
      (s.email || "").trim().toLowerCase() === email ||
      s.applicationId === application.id
  );

  if (already) {
    return { ok: true, wrote: false, reason: "Already exists", stylist: already };
  }

  // Create a stylist record that matches your data style
  // (coords may not exist yet; we’ll keep them null for now)
  const safeName = (application.fullName || "Approved Stylist").trim();
  const slug = safeName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);

  const stylist = {
    id: `sty_${Date.now()}`,
    profileSlug: slug,
    name: safeName,
    verified: true,

    // keep your existing fields flexible:
    specialties: Array.isArray(application.specialties) ? application.specialties : [],
    training: application.training || "",
    awards: application.awards || "",
    cost: application.cost ?? "",

    instagram: application.instagram || "",
    website: application.website || "",

    // These are the "coords" keys your directory dataset often has:
    lat: application.lat ?? null,
    lng: application.lng ?? null,

    // Metadata
    verified: true,
    tier: application.tierRequested || "free",
    applicationId: application.id,
    createdAt: new Date().toISOString(),
  };

  // Prepend so newest appears first
  const next = [stylist, ...parsed];

  // Write back
  await fs.writeFile(resolved, JSON.stringify(next, null, 2), "utf8");

  return { ok: true, wrote: true, stylist };
}
