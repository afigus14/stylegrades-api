// pages/api/apply.js
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { allowCors } from "./_lib/auth";

const DATA_DIR = path.join(process.cwd(), ".data");
const APPLICATIONS_FILE = path.join(DATA_DIR, "applications.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(APPLICATIONS_FILE)) {
    fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify({ applications: [] }, null, 2));
  }
}

function readApplications() {
  ensureDataFile();
  const raw = fs.readFileSync(APPLICATIONS_FILE, "utf8");
  const parsed = JSON.parse(raw || "{}");
  return Array.isArray(parsed.applications) ? parsed.applications : [];
}

function writeApplications(applications) {
  ensureDataFile();
  fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify({ applications }, null, 2));
}

function cleanString(v) {
  if (v == null) return "";
  return String(v).trim();
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function normalizePriceTier(v) {
  const s = cleanString(v);
  if (!s) return "";
  if (/^\${1,4}$/.test(s)) return s;
  if (["1", "2", "3", "4"].includes(s)) return "$".repeat(Number(s));
  return "";
}

function normalizePayments(v) {
  const raw = safeArray(v)
    .map((x) => cleanString(x).toLowerCase())
    .filter(Boolean);

  const allowed = new Set(["credit_cards", "applepay", "cash_only"]);

  const normalized = raw
    .map((p) => {
      if (p.includes("apple")) return "applepay";
      if (p.includes("card") || p.includes("credit")) return "credit_cards";
      if (p.includes("cash")) return "cash_only";
      return p.replace(/\s+/g, "_");
    })
    .filter((p) => allowed.has(p));

  // Prevent impossible combos: cash_only should be alone
  if (normalized.includes("cash_only")) return ["cash_only"];

  // Deduplicate
  return Array.from(new Set(normalized));
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};

    const fullName = cleanString(body.fullName || body.name);
    const email = cleanString(body.email).toLowerCase();
    const city = cleanString(body.city);

    const specialties = safeArray(body.specialties).map(cleanString).filter(Boolean);

    // NEW fields
    const priceTier = normalizePriceTier(body.priceTier);
    const payments = normalizePayments(body.payments);

    if (!fullName) return res.status(400).json({ ok: false, error: "Full name is required" });
    if (!email) return res.status(400).json({ ok: false, error: "Email is required" });

    const applications = readApplications();

    const now = new Date().toISOString();
    const id = `app_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

    const application = {
      id,
      fullName,
      email,
      phone: cleanString(body.phone),
      city,
      specialties,

      instagram: cleanString(body.instagram),
      website: cleanString(body.website),

      // image fields (if your form uploads to cloudinary first)
      photoUrl: cleanString(body.photoUrl),
      gallery: safeArray(body.gallery).map(cleanString).filter(Boolean),

      // tier
      tierRequested: cleanString(body.tierRequested || "free").toLowerCase(),

      // NEW fields stored on the application
      priceTier: priceTier || "",
      payments, // array like ["credit_cards","applepay"] or ["cash_only"]

      notes: cleanString(body.notes),

      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    applications.unshift(application);
    writeApplications(applications);

    return res.status(200).json({ ok: true, applicationId: id });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Server error",
      details: String(e?.message || e),
    });
  }
}
