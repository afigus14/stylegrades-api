import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  try {
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({
        error: "Verification token is required.",
      });
    }

    const { data: stylist, error: lookupError } = await supabase
      .from("stylists")
      .select(
        "id, full_name, profile_slug, profile_source, claim_token, claim_token_expires_at, claim_email_verified"
      )
      .eq("claim_token", token)
      .maybeSingle();

    if (lookupError) {
      console.error("Claim verification lookup error:", lookupError);

      return res.status(500).json({
        error: "Unable to verify this profile claim.",
      });
    }

    if (!stylist) {
      return res.status(400).json({
        error: "This verification link is invalid or has already been used.",
      });
    }

    if (stylist.profile_source !== "registry_unclaimed") {
      return res.status(400).json({
        error: "This profile is no longer available to claim.",
      });
    }

    if (
      !stylist.claim_token_expires_at ||
      new Date(stylist.claim_token_expires_at).getTime() < Date.now()
    ) {
      return res.status(400).json({
        error: "This verification link has expired.",
      });
    }

    const { error: updateError } = await supabase
      .from("stylists")
      .update({
        claim_email_verified: true,
        claim_email_verified_at: new Date().toISOString(),

        // Remove the token after successful verification so
        // the verification link cannot be reused.
        claim_token: null,
        claim_token_expires_at: null,
      })
      .eq("id", stylist.id)
      .eq("claim_token", token);

    if (updateError) {
      console.error("Claim email verification update error:", updateError);

      return res.status(500).json({
        error: "Unable to verify this profile claim.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email address verified.",
      profileSlug: stylist.profile_slug,
      fullName: stylist.full_name,
      claimStatus: "pending_admin_review",
    });
  } catch (error) {
    console.error("Claim email verification error:", error);

    return res.status(500).json({
      error: "Unable to verify this profile claim.",
    });
  }
}