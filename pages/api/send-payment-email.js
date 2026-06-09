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
          Because you selected the
          <strong>${tier.toUpperCase()}</strong>
          plan, you'll need to activate your subscription
          before your profile becomes visible on Stylegrades.
        </p>

        <p>
          After payment is completed, your profile will
          automatically go live.
        </p>

        <p>
          Log into Stylegrades and click
          <strong>Manage Subscription</strong>
          to activate your account.
        </p>

        <p>
          <a href="https://www.stylegrades.com/#/login">
            Login to Stylegrades
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