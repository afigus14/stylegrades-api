import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Invalid verification link.",
      });
    }

    const cleanToken = token.trim();

    // Find the review associated with this verification token.
    const { data: review, error: reviewError } =
      await supabase
        .from("reviews")
        .select(
          "id, stylist_id, reviewer_name, reviewer_email, email_verified, review_source"
        )
        .eq("verification_token", cleanToken)
        .maybeSingle();

    if (reviewError) {
      console.error(
        "Direct review verification lookup error:",
        reviewError
      );

      return res.status(500).json({
        ok: false,
        error: "Could not verify this review.",
      });
    }

    if (!review) {
      return res.status(400).json({
        ok: false,
        error:
          "This verification link is invalid or has already been used.",
      });
    }

    // Extra protection: this endpoint should only verify
    // reviews submitted through the direct-review system.
    if (review.review_source !== "direct") {
      return res.status(400).json({
        ok: false,
        error: "Invalid verification request.",
      });
    }

    // If already verified, return success rather than failing.
    // This makes accidental double-clicks harmless.
    if (review.email_verified) {
      return res.status(200).json({
        ok: true,
        alreadyVerified: true,
      });
    }

    // Mark the review as verified.
    // It remains status="pending" until Stylegrades approves it.
    const { error: updateError } =
      await supabase
        .from("reviews")
        .update({
          email_verified: true,
          email_verified_at: new Date().toISOString(),

          // Keep these compatible with the existing
          // Stylegrades review display/admin system.
          verified: true,
          verified_client: true,

          // Remove the token after successful verification.
          // This makes the verification link one-time-use.
          verification_token: null,
        })
        .eq("id", review.id);

    if (updateError) {
      console.error(
        "Direct review verification update error:",
        updateError
      );

      return res.status(500).json({
        ok: false,
        error: "Could not verify this review.",
      });
    }

    return res.status(200).json({
      ok: true,
      alreadyVerified: false,
    });
  } catch (err) {
    console.error(
      "Direct review verification error:",
      err
    );

    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
}