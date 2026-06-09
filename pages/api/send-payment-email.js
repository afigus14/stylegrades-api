import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const { email, name, tier } = req.body;

    await resend.emails.send({
      from: "Stylegrades <noreply@stylegrades.com>",
      to: email,
      subject: "Your Stylegrades profile has been approved",
      html: `
        <h2>Your profile has been approved 🎉</h2>

        <p>Hi ${name},</p>

        <p>
          Your Stylegrades profile has been approved.
        </p>

        <p>
          Because you selected a paid plan, you'll need to create your account and activate your subscription before your profile becomes visible to clients.
        </p>

        <p>
          After payment is completed, your profile will
          automatically go live.
        </p>

        <p>
          To activate your profile:
        </p>

        <ol>
          <li>Create your Stylegrades account</li>
          <li>Log in to your dashboard</li>
          <li>Click <strong>Manage Subscription</strong></li>
          <li>Complete payment</li>
          <li>Your profile will automatically go live</li>
        </ol>

        <p>
          <a
            href="https://www.stylegrades.com/#/signup"
            style="
              background:#102A43;
              color:white;
              padding:12px 18px;
              text-decoration:none;
              border-radius:6px;
              display:inline-block;
              font-weight:bold;
            "
          >
            Create Your Account
          </a>
        </p>
      `,
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message,
    });
  }
}