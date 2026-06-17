import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const adminKey = req.headers["x-admin-key"];

  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  try {

    const { action, id } = req.body;

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (action === "approve") {

      const { error } = await supabase
        .from("advertisers")
        .update({
          status: "approved",
        })
        .eq("id", id);

      if (error) {
        return res.status(500).json({
          error: error.message,
        });
      }

      return res.json({
        ok: true,
      });
    }

    if (action === "reject") {

      const { error } = await supabase
        .from("advertisers")
        .update({
          status: "rejected",
        })
        .eq("id", id);

      if (error) {
        return res.status(500).json({
          error: error.message,
        });
      }

      return res.json({
        ok: true,
      });
    }

    return res.status(400).json({
      error: "Invalid action",
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: "Server error",
    });
  }
}