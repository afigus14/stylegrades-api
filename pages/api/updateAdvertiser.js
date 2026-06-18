import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {

    const adminKey =
      req.headers["x-admin-key"];

    if (
      adminKey !== process.env.ADMIN_API_KEY
    ) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const {
      id,
      headline,
      cta,
    } = req.body;

    const { error } = await supabase
      .from("advertisers")
      .update({
        headline,
        cta,
      })
      .eq("id", id);

    if (error) {
      console.error(error);

      return res.status(500).json({
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: "Server error",
    });
  }
}