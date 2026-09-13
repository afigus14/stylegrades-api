import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const allowedOrigins = [
  "http://localhost:5173",
  "https://www.stylegrades.com",
  "https://stylegrades.com",
];

export default async function handler(req, res) {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Admin-Key"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  const adminKey = req.headers["x-admin-key"];

  if (
    !process.env.ADMIN_API_KEY ||
    adminKey !== process.env.ADMIN_API_KEY
  ) {
    return res.status(401).json({
      error: "Unauthorized.",
    });
  }

  const { action, id } = req.body || {};

  if (!action || !id) {
    return res.status(400).json({
      error: "Action and profile ID are required.",
    });
  }

  if (action !== "approve") {
    return res.status(400).json({
      error: "Invalid action.",
    });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Load the existing registry profile.
    const { data: stylist, error: fetchError } = await supabase
      .from("stylists")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !stylist) {
      return res.status(404).json({
        error: "Profile claim not found.",
      });
    }

    // Only a verified, still-unclaimed registry claim may proceed.
    if (
      stylist.profile_source !== "registry_unclaimed" ||
      stylist.claim_email_verified !== true ||
      !stylist.claim_email ||
      stylist.claimed_at ||
      stylist.user_id
    ) {
      return res.status(409).json({
        error:
          "This profile is not eligible for claim approval.",
      });
    }

    const normalizedClaimEmail = String(
      stylist.claim_email
    )
      .trim()
      .toLowerCase();

    const existingActivationIsValid =
        stylist.claim_admin_approved === true &&
        stylist.claim_activation_token &&
        stylist.claim_activation_expires_at &&
        new Date(stylist.claim_activation_expires_at) > new Date();

    const activationToken = existingActivationIsValid
        ? stylist.claim_activation_token
        : crypto.randomBytes(32).toString("hex");

    const activationExpiresAt = existingActivationIsValid
        ? stylist.claim_activation_expires_at
        : new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString();  

    // Make sure this email is not already attached to another
    // stylist profile.
    const { data: existingProfiles, error: existingError } =
      await supabase
        .from("stylists")
        .select("id, full_name, user_id")
        .ilike("email", normalizedClaimEmail)
        .neq("id", stylist.id);

    if (existingError) {
      console.error(
        "Error checking existing stylist email:",
        existingError
      );

      return res.status(500).json({
        error:
          "Unable to verify whether this email is already in use.",
      });
    }

    if (existingProfiles?.length) {
      return res.status(409).json({
        error:
          "This email is already associated with another Stylegrades stylist profile. Review it before approving this claim.",
      });
    }

    /*
      Admin approval prepares the EXISTING registry row for
      account activation.

      IMPORTANT:
      We intentionally do NOT set:
        profile_source = registry_claimed
        claimed_at
        user_id

      Those should happen only after the claimant successfully
      creates/authenticates the Stylegrades account.
    */

    const { data: updatedStylist, error: updateError } =
      await supabase
        .from("stylists")
        .update({
            email: normalizedClaimEmail,
            status: "approved",
            tier: "free",
            tier_active: "free",
            subscription_status: "active",
            claim_admin_approved: true,
            claim_admin_approved_at:
              stylist.claim_admin_approved_at || new Date().toISOString(),
            claim_activation_token: activationToken,
            claim_activation_expires_at: activationExpiresAt,
        })
        .eq("id", stylist.id)
        .eq("profile_source", "registry_unclaimed")
        .eq("claim_email_verified", true)
        .eq("claim_email", stylist.claim_email)
        .is("claimed_at", null)
        .is("user_id", null)
        .select(
            "id, full_name, email, profile_slug, profile_source, claim_email_verified, claim_admin_approved, claim_admin_approved_at, claimed_at, user_id, tier, tier_active, subscription_status"
        )
        .single();

    if (updateError || !updatedStylist) {
      console.error(
        "Profile claim approval update failed:",
        updateError
      );

      return res.status(500).json({
        error: "Unable to approve this profile claim.",
      });
    }

    const emailResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "https://stylegrades-api.vercel.app"}/api/send-claim-activation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-claim-internal-secret":
                process.env.CLAIM_INTERNAL_SECRET,
          },
          body: JSON.stringify({
            email: normalizedClaimEmail,
            fullName: stylist.full_name,
            activationToken,
          }),
        }
    );

    if (!emailResponse.ok) {
        const emailError = await emailResponse
            .json()
            .catch(() => ({}));

        console.error(
            "Claim activation email failed:",
            emailError
        );

        return res.status(500).json({
            error:
                "The claim was approved, but the activation email could not be sent.",
        });
    }

    return res.status(200).json({
      ok: true,
      message:
        "Profile claim approved for account activation.",
      profile: updatedStylist,
    });
  } catch (error) {
    console.error("Profile claim approval error:", error);

    return res.status(500).json({
      error: "Server error.",
    });
  }
}