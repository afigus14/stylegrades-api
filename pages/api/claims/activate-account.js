import { createClient } from "@supabase/supabase-js";

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
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  const {
    activationToken,
    password,
  } = req.body || {};

  if (!activationToken) {
    return res.status(400).json({
      error: "Activation token is required.",
    });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({
      error: "Please choose a password with at least 8 characters.",
    });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    /*
      Locate the exact profile authorized by the one-time
      activation token.
    */
    const { data: stylist, error: stylistError } =
      await supabaseAdmin
        .from("stylists")
        .select("*")
        .eq("claim_activation_token", activationToken)
        .maybeSingle();

    if (stylistError) {
      console.error(
        "Claim activation profile lookup failed:",
        stylistError
      );

      return res.status(500).json({
        error: "Unable to verify this profile activation.",
      });
    }

    if (!stylist) {
      return res.status(400).json({
        error: "This activation link is invalid or has already been used.",
      });
    }

    if (
      stylist.profile_source !== "registry_unclaimed" ||
      stylist.claim_email_verified !== true ||
      stylist.claim_admin_approved !== true ||
      stylist.claimed_at ||
      stylist.user_id
    ) {
      return res.status(409).json({
        error: "This profile is not eligible for account activation.",
      });
    }

    if (
      !stylist.claim_activation_expires_at ||
      new Date(stylist.claim_activation_expires_at) <= new Date()
    ) {
      return res.status(410).json({
        error: "This activation link has expired.",
      });
    }

    const claimEmail = String(
      stylist.claim_email || ""
    )
      .trim()
      .toLowerCase();

    /*
      The account email comes only from the email address that
      successfully completed the Stylegrades claim-verification
      process. The browser cannot substitute a different email.
    */
    if (!claimEmail) {
      return res.status(400).json({
        error: "This profile claim does not have a verified email address.",
      });
    }

    /*
      Create the Supabase Auth account only after the claim has
      passed license verification, email verification, admin
      approval, and activation-token validation.

      email_confirm: true is appropriate here because Stylegrades
      already verified control of this exact email address during
      the claim process.
    */
    const {
      data: authData,
      error: createUserError,
    } = await supabaseAdmin.auth.admin.createUser({
      email: claimEmail,
      password,
      email_confirm: true,
    });

    if (createUserError || !authData?.user) {
      console.error(
        "Claim Auth account creation failed:",
        createUserError
      );

      return res.status(409).json({
        error:
          "Stylegrades could not create this account. If you already have a Stylegrades login using this email, please contact Stylegrades.",
      });
    }

    const user = authData.user;

    /*
      Final ownership transition.

      Only NOW does the registry profile become claimed.
    */
    const { data: claimedProfile, error: claimError } =
      await supabaseAdmin
        .from("stylists")
        .update({
          user_id: user.id,
          email: claimEmail,
          profile_source: "registry_claimed",
          claimed_at: new Date().toISOString(),
          status: "approved",
          tier: "free",
          tier_active: "free",
          subscription_status: "active",
          claim_activation_token: null,
          claim_activation_expires_at: null,
        })
        .eq("id", stylist.id)
        .eq("profile_source", "registry_unclaimed")
        .eq("claim_admin_approved", true)
        .eq("claim_email_verified", true)
        .eq("claim_email", stylist.claim_email)
        .is("claimed_at", null)
        .is("user_id", null)
        .select(
          "id, full_name, profile_slug, profile_source, claimed_at, user_id, tier_active"
        )
        .single();

    if (claimError || !claimedProfile) {
      console.error(
        "Final profile claim failed:",
        claimError
      );

      /*
        The Auth account was created during this request, but the
        professional profile was not successfully linked.

        Remove that newly created Auth account so the claimant can
        safely try the activation again without being left with an
        orphaned Stylegrades login.
      */
      const { error: cleanupError } =
        await supabaseAdmin.auth.admin.deleteUser(user.id);

      if (cleanupError) {
        console.error(
          "Failed to clean up incomplete claim Auth account:",
          cleanupError
        );
      }

      return res.status(409).json({
        error:
          "The profile could not be activated. Please try again. If the problem continues, please contact Stylegrades.",
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Your Stylegrades profile has been activated.",
      profile: claimedProfile,
    });
  } catch (error) {
    console.error("Claim account activation error:", error);

    return res.status(500).json({
      error: "Server error.",
    });
  }
}