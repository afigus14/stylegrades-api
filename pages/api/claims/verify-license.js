import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizeLicenseNumber(value) {
  return String(value || "")
    .trim()
    .replace(/[\s-]/g, "")
    .toUpperCase();
}

export default async function handler(req, res) {
  const allowedOrigins = [
    "http://localhost:5173",
    "https://www.stylegrades.com",
    "https://stylegrades.com",
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { profileSlug, licenseNumber, email } = req.body || {};

    if (!profileSlug || !licenseNumber || !email) {
      return res.status(400).json({
        error: "License number and email address are required.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: stylist, error: stylistError } = await supabase
      .from("stylists")
      .select(
        "id, full_name, profile_source, license_number, license_state"
      )
      .eq("profile_slug", profileSlug)
      .maybeSingle();

    if (stylistError) {
      console.error("Claim lookup error:", stylistError);
      return res.status(500).json({
        error: "Unable to verify this profile right now.",
      });
    }

    if (!stylist || stylist.profile_source !== "registry_unclaimed") {
      return res.status(400).json({
        error: "This profile is not available to claim.",
      });
    }

    const submittedLicense = normalizeLicenseNumber(licenseNumber);
    const storedLicense = normalizeLicenseNumber(stylist.license_number);

    if (!submittedLicense || submittedLicense !== storedLicense) {
      return res.status(400).json({
        error:
          "The license number entered does not match the license information for this profile.",
      });
    }

    const claimToken = crypto.randomBytes(32).toString("hex");

    const claimTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString();

    const { error: updateError } = await supabase
      .from("stylists")
      .update({
        claim_email: normalizedEmail,
        claim_token: claimToken,
        claim_token_expires_at: claimTokenExpiresAt,
        claim_requested_at: new Date().toISOString(),
        claim_email_verified: false,
        claim_email_verified_at: null,
      })
      .eq("id", stylist.id)
      .eq("profile_source", "registry_unclaimed");

    if (updateError) {
      console.error("Claim request update error:", updateError);

      return res.status(500).json({
        error: "Unable to start the profile verification process.",
      });
    }

    const emailResponse = await fetch(
      "https://stylegrades-api.vercel.app/api/send-claim-verification",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-claim-internal-secret": process.env.CLAIM_INTERNAL_SECRET,
        },
        body: JSON.stringify({
          email: normalizedEmail,
          fullName: stylist.full_name,
          token: claimToken,
        }),
      }
    );

    if (!emailResponse.ok) {
      const emailResult = await emailResponse.json().catch(() => ({}));

      console.error(
        "Claim verification email failed:",
        emailResult
      );

      return res.status(500).json({
        error:
          "Your license information matched, but we could not send the verification email. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "License information matched. Check your email to continue verifying your profile.",
    });
  } catch (error) {
    console.error("Claim verification error:", error);

    return res.status(500).json({
      error: "Unable to verify this profile right now.",
    });
  }
}