import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  const allowedOrigins = [
    "http://localhost:5173",
    "https://www.stylegrades.com",
    "https://stylegrades.com",
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
    }

    const internalSecret = req.headers["x-claim-internal-secret"];

    if (
    !process.env.CLAIM_INTERNAL_SECRET ||
    internalSecret !== process.env.CLAIM_INTERNAL_SECRET
    ) {
    return res.status(401).json({
        error: "Unauthorized.",
    });
    }

    try {
    const { email, fullName, token } = req.body || {};

    if (!email || !fullName || !token) {
      return res.status(400).json({
        error: "Missing required verification information.",
      });
    }

    const verificationUrl =
      `https://www.stylegrades.com/#/claim-profile/verify/${token}`;

    const { data, error } = await resend.emails.send({
      from: "Stylegrades <noreply@stylegrades.com>",
      to: email,
      subject: "Verify your Stylegrades™ profile claim",
      html: `
        <div style="font-family: Arial, sans-serif; color: #243B53; line-height: 1.6;">
          <h2 style="color: #102A43;">
            Verify your Stylegrades™ profile claim
          </h2>

          <p>Hello ${fullName},</p>

          <p>
            We received a request to claim your professional profile
            on Stylegrades™.
          </p>

          <p>
            Please verify that you control this email address by
            clicking the button below.
          </p>

          <p style="margin: 28px 0;">
            <a
              href="${verificationUrl}"
              style="
                display: inline-block;
                background: #102A43;
                color: #ffffff;
                text-decoration: none;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: 600;
              "
            >
              Verify My Email
            </a>
          </p>

          <p>
            After your email is verified, your profile claim will
            continue through the Stylegrades™ verification process.
          </p>

          <p style="font-size: 13px; color: #7B8794;">
            If you did not request this profile claim, you can ignore
            this email. No changes will be made to the professional
            profile.
          </p>

          <p style="font-size: 13px; color: #7B8794;">
            This verification link expires in 24 hours.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Claim verification email error:", error);

      return res.status(500).json({
        error: "Unable to send the verification email.",
      });
    }

    return res.status(200).json({
      success: true,
      emailId: data?.id || null,
    });
  } catch (error) {
    console.error("Claim verification email error:", error);

    return res.status(500).json({
      error: "Unable to send the verification email.",
    });
  }
}