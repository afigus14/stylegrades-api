import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
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
      const data = req.body;

      console.log("Application received:", data);
      console.log("FULL PAYLOAD RECEIVED:", data);

      // ✅ INSERT INTO SUPABASE
      const { error } = await supabase.from("stylists").insert([
        {
          full_name: data.fullName,
          email: data.email,
          phone: data.phone,

          city: data.city,
          state: data.state ?? null,
          zip: data.zip ?? null,

          lat: data.lat ?? null,
          lng: data.lng ?? null,

          salon_name: data.salonName ?? null,
          years_experience: data.yearsExperience ?? null,

          // ✅ KEEP LICENSE
          license: data.license ?? null,
          license_url: data.licenseUrl ?? null,

          // ✅ ARRAY FIELD (text[])
          specialties: Array.isArray(data.specialties)
            ? data.specialties
            : (data.specialties
                ? data.specialties.split(",").map(s => s.trim())
                : []),

          instagram_url: data.instagram ?? null,
          website: data.website ?? null,

          tier_requested: data.tierRequested ?? "free",
          tier_active: false,

          // ✅ COMBINED PHOTOS (matches your table: photo_urls)
          photo_urls: [
            ...(data.photoUrl ? [data.photoUrl] : []),
            ...(Array.isArray(data.gallery) ? data.gallery : [])
          ],

          status: "pending",
          verified: false,
          featured: false,
        },
      ]);

      if (error) {
        console.error("Supabase error:", error);
        return res.status(500).json({
          ok: false,
          error: error.message,
        });
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