import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  console.log("🔥 BACKEND FILE LOADED");

  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const adminKey = req.headers["x-admin-key"];

  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { action, id, message } = req.body;

    // ✅ CREATE CLIENT FIRST
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ✅ THEN FETCH APPLICATION
    const { data: application, error: fetchError } = await supabase
      .from("stylists")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (action === "approve") {
      console.log("🔥 APPROVE HIT", id);
      console.log("🔥 APPROVE ACTION STARTED");

      // ✅ 1. Get FULL existing row (including images)
      const { data: application, error: fetchError } = await supabase
        .from("stylists")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !application) {
        return res.status(404).json({ error: "Application not found" });
      }

      console.log("🧠 EXISTING DATA:", application);

      console.log("TIER:", application.tier);
      console.log(
        "SUB STATUS TO SAVE:",
        application.tier === "free"
          ? "active"
          : "pending_payment"
      );

      const profileSlug =
        application.full_name
          ?.toLowerCase()
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "");

      // ✅ 2. Update ONLY status, but SEND BACK EVERYTHING
      const { error } = await supabase
        .from("stylists")
        .update({
          ...application,
          status: "approved",
          profile_slug:
            application.profile_slug || profileSlug,
          subscription_status:
            application.tier === "free"
              ? "active"
              : "pending_payment",
        })
        .eq("id", id);

      if (error) {
        console.error("🔥 APPROVE ERROR:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log("✅ APPROVE SUCCESS");

      console.log("📧 SENDING APPROVAL EMAIL", {
        email: application.email,
        name: application.full_name,
      });

      const emailEndpoint =
        application.tier === "free"
          ? "send-approval-email"
          : "send-payment-email";

      await fetch(
        `https://stylegrades-api.vercel.app/api/${emailEndpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: application.email,
            name: application.full_name,
            tier: application.tier,
          }),
        }
      );

      console.log("📧 APPROVAL EMAIL REQUEST FINISHED");

      return res.status(200).json({ ok: true });
    }

    // 🔥 REJECT
    if (action === "reject") {
      const { data } = await supabase
        .from("stylists")
        .select("email, full_name")
        .eq("id", id)
        .single();

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Stylegrades <noreply@stylegrades.com>",
          to: data.email,
          subject: "Your Stylegrades application",
          html: `<p>Hi ${data.full_name},</p>
                 <p>Unfortunately, we cannot approve your application at this time.</p>
                 <p>${message || ""}</p>`,
        }),
      });

      await supabase
        .from("stylists")
        .update({ status: "rejected" })
        .eq("id", id);

      return res.json({ ok: true });
    }

    // 🔥 REQUEST INFO
    if (action === "request_info") {

      const { data } = await supabase
        .from("stylists")
        .select("email, full_name")
        .eq("id", id)
        .single();

      // First update the application
      const { data: updatedRow, error } = await supabase
        .from("stylists")
        .update({
          status: "needs_information",
        })
        .eq("id", id)
        .select();

      console.log("REQUEST INFO ID:", id);
      console.log("UPDATED ROW:", updatedRow);
      console.log("UPDATE ERROR:", error);

      if (error) {
        console.error(error);
        return res.status(500).json({
          error: error.message,
        });
      }

      // Then send the email
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Stylegrades <noreply@stylegrades.com>",
          to: data.email,
          cc: "administrator@stylegrades.com",
          reply_to: "administrator@stylegrades.com",
          subject:
            "Additional Information Needed for Your Stylegrades Application",
          html: `
            <h2>Additional Information Needed</h2>

            <p>Hi ${data.full_name},</p>

            <p>Before we can approve your Stylegrades profile we need one or more updates.</p>

            <blockquote style="border-left:4px solid #ccc;padding-left:12px;">
              ${message}
            </blockquote>

            <p>
              Please update your application and resubmit it for review.
            </p>

            <p>
              If you have any questions, simply reply to this email.
            </p>

            <p>Thank you!</p>

            <p><strong>Stylegrades Administrator</strong></p>
          `,
        }),
      });

      return res.json({
        ok: true,
      });
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}