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

      // ✅ 2. Update ONLY status, but SEND BACK EVERYTHING
      const { error } = await supabase
        .from("stylists")
        .update({
          ...application,       // 🔥 THIS PRESERVES EVERYTHING
          status: "approved",   // 🔥 ONLY CHANGE THIS
        })
        .eq("id", id);

      if (error) {
        console.error("🔥 APPROVE ERROR:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log("✅ APPROVE SUCCESS");

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

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Stylegrades <noreply@stylegrades.com>",
          to: data.email,
          subject: "More information needed",
          html: `<p>Hi ${data.full_name},</p>
                 <p>We need a bit more information:</p>
                 <p>${message}</p>`,
        }),
      });

      return res.json({ ok: true });
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}