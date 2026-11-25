
import { createClient } from "@supabase/supabase-js";

const allowedOrigins = [
  "http://localhost:5173",
  "https://www.stylegrades.com",
  "https://stylegrades.com",
];

export default async function handler(req, res) {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Verify the actual signed-in user, not an ID supplied by the browser.
    const accessToken = authHeader.slice(7).trim();

    const { data: authData, error: authError } =
      await supabase.auth.getUser(accessToken);

    const user = authData?.user;

    if (authError || !user || !user.email_confirmed_at) {
      return res.status(401).json({
        error: "Please verify your email address and sign in.",
      });
    }

    const verifiedEmail = String(user.email || "")
      .trim()
      .toLowerCase();

    if (!verifiedEmail) {
      return res.status(400).json({
        error: "Your account does not have an email address.",
      });
    }

    // Do not change accounts that already have a stylist profile.
    const { data: existingProfile, error: existingError } =
      await supabase
        .from("stylists")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingProfile) {
      return res.status(200).json({
        ok: true,
        alreadyLinked: true,
      });
    }

    // Only connect an approved application with a matching email.
    const { data: profiles, error: lookupError } =
      await supabase
        .from("stylists")
        .select("id")
        .ilike("email", verifiedEmail)
        .eq("status", "approved")
        .eq("profile_source", "member")
        .is("user_id", null)
        .limit(2);

    if (lookupError) {
      throw lookupError;
    }

    if (!profiles || profiles.length !== 1) {
      return res.status(409).json({
        error:
          "We could not identify a unique approved stylist profile for this account.",
      });
    }

    // Preserve the existing tier, subscription and profile information.
    const { data: linkedProfile, error: linkError } =
      await supabase
        .from("stylists")
        .update({ user_id: user.id })
        .eq("id", profiles[0].id)
        .eq("status", "approved")
        .eq("profile_source", "member")
        .is("user_id", null)
        .select("id")
        .maybeSingle();

    if (linkError) {
      throw linkError;
    }

    if (!linkedProfile) {
      return res.status(409).json({
        error: "This profile has already been connected to an account.",
      });
    }

    return res.status(200).json({
      ok: true,
      alreadyLinked: false,
    });
  } catch (error) {
    console.error("Approved stylist account linking failed:", error);

    return res.status(500).json({
      error: "Unable to connect your stylist profile. Please try again.",
    });
  }
}
