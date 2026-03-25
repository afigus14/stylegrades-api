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

      // ✅ INSERT INTO SUPABASE
      const { error } = await supabase.from("stylists").insert([
        {
          full_name: data.fullName,
          email: data.email,
          phone: data.phone,
          city: data.city,
          status: "pending",
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