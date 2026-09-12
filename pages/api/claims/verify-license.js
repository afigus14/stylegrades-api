import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizeLicenseNumber(value) {
  return String(value || "")
    .trim()
    .replace(/[\s-]/g, "")
    .toUpperCase();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { profileSlug, licenseNumber, email } = req.body || {};

    if (!profileSlug || !licenseNumber || !email) {
      return res.status(400).json({
        error: "License number and email address are required.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: stylist, error: stylistError } = await supabase
      .from("stylists")
      .select(
        "id, full_name, profile_source, license_number, license_state"
      )
      .eq("profile_slug", profileSlug)
      .maybeSingle();

    if (stylistError) {
      console.error("Claim lookup error:", stylistError);
      return res.status(500).json({
        error: "Unable to verify this profile right now.",
      });
    }

    if (!stylist || stylist.profile_source !== "registry_unclaimed") {
      return res.status(400).json({
        error: "This profile is not available to claim.",
      });
    }

    const submittedLicense = normalizeLicenseNumber(licenseNumber);
    const storedLicense = normalizeLicenseNumber(stylist.license_number);

    if (!submittedLicense || submittedLicense !== storedLicense) {
      return res.status(400).json({
        error:
          "The license number entered does not match the license information for this profile.",
      });
    }

    /*
      IMPORTANT:
      At this stage we are ONLY confirming the license number.

      We are NOT:
      - claiming the profile
      - changing profile_source
      - creating a user account
      - setting claimed_at
      - sending a verification email

      Those steps come after we have tested this safely.
    */

    return res.status(200).json({
      success: true,
      message: "License information matched.",
      claimEmail: normalizedEmail,
    });
  } catch (error) {
    console.error("Claim verification error:", error);

    return res.status(500).json({
      error: "Unable to verify this profile right now.",
    });
  }
}