import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed.",
    });
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

  const { email, fullName, activationToken } = req.body || {};

  if (!email || !fullName || !activationToken) {
    return res.status(400).json({
      error: "Missing required activation information.",
    });
  }

  const activationUrl =
    `https://www.stylegrades.com/#/claim-profile/activate/${activationToken}`;

  try {
    const { data, error } = await resend.emails.send({
      from: "Stylegrades <noreply@stylegrades.com>",
      to: email,
      subject: "Your Stylegrades™ Profile Claim Has Been Approved",
      html: `
        <div style="font-family: Arial, sans-serif; color: #102A43; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #102A43;">
            Your Stylegrades™ profile claim has been approved
          </h2>

          <p>Hi ${escapeHtml(fullName)},</p>

          <p>
            Your request to claim your professional profile on Stylegrades™
            has been approved.
          </p>

          <p>
            The final step is to activate your account and create your
            password. This will securely connect your login to your existing
            professional profile.
          </p>

          <p style="margin: 28px 0;">
            <a
              href="${activationUrl}"
              style="
                display: inline-block;
                background: #102A43;
                color: #ffffff;
                text-decoration: none;
                padding: 12px 22px;
                border-radius: 8px;
                font-weight: 700;
              "
            >
              Activate My Stylegrades™ Account
            </a>
          </p>

          <p>
            This activation link expires in 24 hours and can only be used
            to activate the professional profile you claimed.
          </p>

          <p>
            After activation, you'll be able to sign in to Stylegrades™
            and manage your profile from the same stylist dashboard used
            by other Stylegrades™ professionals.
          </p>

          <p>
            If you did not request this profile claim, you can ignore this
            email.
          </p>

          <p style="margin-top: 30px;">
            Stylegrades™<br />
            A trusted marketplace for the beauty industry.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Claim activation email error:", error);

      return res.status(500).json({
        error: "Unable to send account activation email.",
      });
    }

    return res.status(200).json({
      ok: true,
      id: data?.id || null,
    });
  } catch (error) {
    console.error("Claim activation email exception:", error);

    return res.status(500).json({
      error: "Unable to send account activation email.",
    });
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}