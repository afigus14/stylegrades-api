import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {

   console.log("🔥 USING SUPABASE:", process.env.SUPABASE_URL);

   console.log("🔥 SUBMIT APPLICATION ROUTE HIT");

   console.log("🔥 APPLICATION API HIT");
  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({ message: "API is working" });
  }

  if (req.method === "POST") {
    try {
      const data =
        typeof req.body === "string"
          ? JSON.parse(req.body)
          : req.body;

      const email = (data.email || "").trim().toLowerCase();
      console.log("EMAIL RECEIVED:", email);
      
      const tierMap = {
        starter: "free",
        signature: "pro",
        elite: "premium",
        free: "free",
        pro: "pro",
        premium: "premium"
      };

      const resolvedTier = tierMap[data.tierRequested] || "free";

      console.log("Incoming tier:", data.tierRequested);
      console.log("Resolved tier:", resolvedTier);

      console.log("Application received:", data);
      console.log("FULL PAYLOAD RECEIVED:", data);

      // redeploy trigger
      // 🔍 Check if stylist already exists
      const { data: existing } = await supabase
        .from("stylists")
        .select("id")
        .eq("email", email);

      if (existing && existing.length > 0) {
        return res.status(400).json({
          ok: false,
          error: "User already exists. Please login to continue.",
        });
      }
      
      // ✅ INSERT INTO SUPABASE
      const { error } = await supabase.from("stylists").insert([
        {
          full_name: data.fullName,
          email: email,
          phone: data.phone,

           bio: data.bio ?? null,

          city: data.city,
          state: data.state ?? null,
          zip: data.zip ?? null,

          lat: data.lat ?? null,
          lng: data.lng ?? null,

          salon_name: data.salonName ?? null,
          years_experience: data.yearsExperience ?? null,

          license: data.license ?? null,
          license_url: data.licenseUrl ?? null,

          specialties: Array.isArray(data.specialties)
            ? data.specialties
            : [],

          instagram: data.instagram ?? null,
          website: data.website ?? null,

          tier_requested: resolvedTier,
          tier: resolvedTier,

          photo_url: data.photo_url ?? null,
          gallery: Array.isArray(data.gallery) ? data.gallery : [],

          status: "pending",
          verified: false,
          featured: false,
        },
      ]);

      if (error) {
        console.error("Supabase error:", error);

        if (error.code === "23505") {
          return res.status(200).json({
            ok: false,
            error: "You already have a profile. Please log in or contact support.",
          });
        }

        return res.status(500).json({
          ok: false,
          error: "Something went wrong. Please try again.",
        });
      }

      // ✅ SEND EMAIL HERE (inside handler, after insert)
      try {
        const emailResult = await resend.emails.send({
          from: "onboarding@resend.dev",
          to: "afigus14@yahoo.com",
          subject: "New Stylist Application",
          html: `
            <h2>New Stylist Application</h2>

            <p><strong>Name:</strong> ${data.fullName}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>City:</strong> ${data.city}</p>
            <p><strong>Tier Requested:</strong> ${resolvedTier}</p>

            <br/>

            <a href="https://www.stylegrades.com/#/admin/review"
              style="display:inline-block;padding:12px 20px;background:#2F3C4F;color:white;text-decoration:none;border-radius:6px;">
              🔍 Review Application
            </a>
          `,
        });

  console.log("EMAIL SENT:", emailResult);

} catch (emailError) {
  console.error("EMAIL ERROR:", emailError);
}

      return res.status(200).json({
        ok: true,
        message: "Application saved successfully",
      });

    } catch (error) {
      console.error("Server error:", error);
      return res.status(500).json({
        ok: false,
        error: "Server error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
