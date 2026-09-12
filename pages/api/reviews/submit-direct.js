import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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
    const {
      stylistId,
      reviewerName,
      reviewerEmail,
      serviceDate,
      rating,
      headline,
      reviewText,
    } = req.body;

    // ---------------------------
    // Validate required fields
    // ---------------------------
    if (
      !stylistId ||
      !reviewerName?.trim() ||
      !reviewerEmail?.trim() ||
      !serviceDate ||
      !rating ||
      !headline?.trim() ||
      !reviewText?.trim()
    ) {
      return res.status(400).json({
        ok: false,
        error: "Please complete all required fields.",
      });
    }

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        ok: false,
        error: "Rating must be between 1 and 5.",
      });
    }

    const normalizedEmail = reviewerEmail
      .trim()
      .toLowerCase();

    // ---------------------------
    // Confirm stylist exists
    // ---------------------------
    const { data: stylist, error: stylistError } =
      await supabase
        .from("stylists")
        .select("id, full_name, profile_slug")
        .eq("id", stylistId)
        .maybeSingle();

    if (stylistError || !stylist) {
      console.error("Stylist lookup error:", stylistError);

      return res.status(404).json({
        ok: false,
        error: "Beauty professional not found.",
      });
    }

    // ---------------------------
    // Generate secure one-time token
    // ---------------------------
    const verificationToken =
      crypto.randomBytes(32).toString("hex");

    // ---------------------------
    // Match existing Stylegrades
    // review format:
    // headline + blank line + review
    // ---------------------------
    const combinedReviewText =
      `${headline.trim()}\n\n${reviewText.trim()}`;

    // ---------------------------
    // Save UNVERIFIED review
    // ---------------------------
    const { data: review, error: reviewError } =
      await supabase
        .from("reviews")
        .insert([
          {
            stylist_id: stylist.id,

            reviewer_name: reviewerName.trim(),
            reviewer_email: normalizedEmail,

            rating: numericRating,

            review_text: combinedReviewText,

            service_date: serviceDate,

            status: "pending",

            // A direct review is NOT verified
            // simply because it was submitted.
            verified: false,
            verified_client: false,

            email_verified: false,
            email_verified_at: null,

            verification_token: verificationToken,

            review_source: "direct",
          },
        ])
        .select("id")
        .single();

    if (reviewError || !review) {
      console.error(
        "Direct review insert error:",
        reviewError
      );

      return res.status(500).json({
        ok: false,
        error:
          reviewError?.message ||
          "Could not save review.",
      });
    }

    // ---------------------------
    // Send verification email
    // ---------------------------
    const verificationUrl =
      `https://www.stylegrades.com/#/review/verify/${verificationToken}`;

    const emailResponse = await fetch(
      "https://stylegrades-api.vercel.app/api/send-direct-review-verification",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewerName: reviewerName.trim(),
          reviewerEmail: normalizedEmail,
          stylistName: stylist.full_name,
          verificationUrl,
        }),
      }
    );

    if (!emailResponse.ok) {
      const emailText = await emailResponse.text();

      console.error(
        "Verification email failed:",
        emailResponse.status,
        emailText
      );

      // If the verification email cannot be sent,
      // remove the review because the reviewer would
      // have no way to complete verification.
      await supabase
        .from("reviews")
        .delete()
        .eq("id", review.id);

      return res.status(500).json({
        ok: false,
        error:
          "We couldn't send your verification email. Please try again.",
      });
    }

    return res.status(200).json({
      ok: true,
      requiresVerification: true,
    });
  } catch (err) {
    console.error(
      "Direct review submission error:",
      err
    );

    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
}