import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
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
      token,
      rating,
      headline,
      reviewText,
      wouldRecommend,
    } = req.body;

    if (!token) {
      return res.status(400).json({
        ok: false,
        error: "Missing review token.",
      });
    }

    const { data: invitations, error: invitationError } =
      await supabase
        .from("review_invitations")
        .select("*")
        .eq("token", token.trim());

    const invitation = invitations?.[0];

    console.log("TOKEN RECEIVED:", token);
    console.log("INVITATIONS FOUND:", invitations);
    console.log("INVITATION:", invitation);
    console.log("INVITATION ERROR:", invitationError);

    const { data: allInvites } = await supabase
      .from("review_invitations")
      .select("token");

    console.log("ALL TOKENS:", allInvites);

    if (invitationError || !invitation) {
      return res.status(400).json({
        ok: false,
        error:
          invitationError?.message ||
          "Invalid review invitation.",
      });
    }

    if (invitation.used) {
      return res.status(400).json({
        ok: false,
        error:
          "This review invitation has already been used.",
      });
    }

    const { error: reviewError } =
      await supabase
        .from("reviews")
        .insert([
          {
            stylist_id: invitation.stylist_id,

            reviewer_name:
              invitation.client_name,

            reviewer_email:
              invitation.client_email,

            rating,

            review_text:
              headline +
              "\n\n" +
              reviewText,

            verified: true,

            verified_client: true,

            status: "pending",

            service_date:
              new Date()
                .toISOString()
                .split("T")[0],
          },
        ]);

    if (reviewError) {
      console.error(reviewError);

      return res.status(500).json({
        ok: false,
        error:
          reviewError.message ||
          "Could not save review.",
      });
    }

    const { error: usedError } =
      await supabase
        .from("review_invitations")
        .update({
          used: true,
        })
        .eq("id", invitation.id);

    if (usedError) {
      console.error(
        "Invitation update error:",
        usedError
      );
    }

    return res.status(200).json({
      ok: true,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
}