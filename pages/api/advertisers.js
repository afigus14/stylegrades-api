import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // CORS
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from("advertisers")
      .select("*")
      .eq("status", "approved")
      .eq("subscription_status", "active");

    if (error) {
      console.error(error);
      return res.status(500).json({
        error: error.message,
      });
    }

    return res.status(200).json(data || []);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Server error",
    });
  }
}