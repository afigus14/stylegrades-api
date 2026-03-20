// pages/api/public/submit-application.js
import { allowCors } from "../_lib/auth";
import { upsertApplicationByEmail } from "../_lib/jsonStore";

function cleanString(v) {
  if (v == null) return "";
  return String(v).trim();
}

function cleanArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => cleanString(x))
    .filter(Boolean)
    .slice(0, 50);
}

const ALLOWED_PRICE = new Set(["$", "$$", "$$$", "$$$$"]);
const ALLOWED_PAYMENTS = new Set(["credit_cards", "applepay", "cash_only"]);

function cleanPriceTier(v) {
  const t = cleanString(v);
  if (!t) return "";
  return ALLOWED_PRICE.has(t) ? t : "";
}

function cleanPayments(arr) {
  const raw = cleanArray(arr)
    .map((x) => x.toLowerCase())
    .filter((x) => ALLOWED_PAYMENTS.has(x));

  // If cash_only is selected, ignore other payment types
  if (raw.includes("cash_only")) return ["cash_only"];

  // De-dupe
  return Array.from(new Set(raw)).slice(0, 10);
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};

    const fullName = cleanString(body.fullName);
    const email = cleanString(body.email);
    const phone = cleanString(body.phone);
    const city = cleanString(body.city);

    const specialties = cleanArray(body.specialties);
    const instagram = cleanString(body.instagram);
    const website = cleanString(body.website);

    const photoUrl = cleanString(body.photoUrl);
    const gallery = cleanArray(body.gallery); // image URLs

    const tierRequested = cleanString(body.tierRequested || body.tier || "free");
    const notes = cleanString(body.notes);

    // ✅ NEW
    const priceTier = cleanPriceTier(body.priceTier);
    const payments = cleanPayments(body.payments);

    if (!fullName || !email || !city) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields: fullName, email, city",
      });
    }

    const input = {
      fullName,
      email,
      phone,
      city,
      specialties,
      instagram,
      website,
      photoUrl,
      gallery,
      tierRequested,
      notes,

      // ✅ store new fields
      priceTier,
      payments,
    };

    // ✅ Upsert by email (prevents duplicates)
    const result = await upsertApplicationByEmail(input);

    return res.status(200).json({
      ok: true,
      mode: result.mode, // "created" or "updated"
      application: result.application,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Server error",
      details: String(e?.message || e),
    });
  }
}
