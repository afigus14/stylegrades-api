import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      stylistName,
      stylistEmail,
      profileSlug,
      city,
      state,
      licenseNumber,
      licenseType,
    } = req.body;

    const adminEmail = "afigus14@yahoo.com";

    await resend.emails.send({
      from: "Stylegrades <noreply@stylegrades.com>",
      to: adminEmail,
      subject: "New Stylegrades Profile Claim Ready for Review",
      html: `
        <h2>Profile Claim Ready for Review</h2>

        <p>A stylist has verified their email address and their profile claim is ready for your review.</p>

        <p><strong>Stylist:</strong> ${stylistName || ""}</p>
        <p><strong>Email:</strong> ${stylistEmail || ""}</p>
        <p><strong>Location:</strong> ${city || ""}${city && state ? ", " : ""}${state || ""}</p>
        <p><strong>License Type:</strong> ${licenseType || ""}</p>
        <p><strong>License Number:</strong> ${licenseNumber || ""}</p>
        <p><strong>Profile Slug:</strong> ${profileSlug || ""}</p>

        <p>Please sign in to the Stylegrades Admin Dashboard to review the profile claim.</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Claim notification email error:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}