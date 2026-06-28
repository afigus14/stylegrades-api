import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {

    console.log("AD TRACK HIT");
    console.log("BODY:", req.body);

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const {
      advertiserId,
      event,
    } = req.body;

    if (!advertiserId || !event) {
      return res.status(400).json({
        error: "Missing data",
      });
    }

    const { data: advertiser } =
      await supabase
        .from("advertisers")
        .select("impressions, clicks")
        .eq("id", advertiserId)
        .single();

    console.log("TRACKING ID:", advertiserId);
    console.log("FOUND ADVERTISER:", advertiser);

    if (!advertiser) {
      console.log("SKIPPED TRACKING FOR:", advertiserId);

      return res.status(200).json({
        success: true,
        skipped: true,
      });
    }

    const updates = {};

    if (event === "impression") {
      updates.impressions =
        (advertiser.impressions || 0) + 1;
    }

    if (event === "click") {
      updates.clicks =
        (advertiser.clicks || 0) + 1;
    }

    await supabase
      .from("advertisers")
      .update(updates)
      .eq("id", advertiserId);

    return res.json({
      success: true,
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: "Server error",
    });
  }
}