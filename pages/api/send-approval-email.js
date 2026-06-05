import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  console.log("🔥 SEND-APPROVAL-EMAIL HANDLER HIT");

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
    const { email, name, message } = req.body;

    const result = await resend.emails.send({
      from: "Stylegrades <noreply@stylegrades.com>",
      to: email,
      subject: "You're approved on Stylegrades 🎉",
      html: `
        <h2>Congratulations! Your Stylegrades profile has been approved 🎉</h2>

        <p>Hi ${name || "there"},</p>

        <p>
          Your stylist profile has been reviewed and approved by the Stylegrades team.
        </p>

        <p>
          To activate your account and manage your profile, please create your login using the link below:
        </p>

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

        <p>
          After creating your account, you can:
        </p>

        <ul>
          <li>Update your profile</li>
          <li>Upload portfolio photos</li>
          <li>Invite clients to leave reviews</li>
          <li>Manage your subscription</li>
        </ul>

        ${
          message
            ? `
            <br/>
            <h3>Message from Stylegrades</h3>
            <p>${message}</p>
          `
            : ""
        }

        <br/>

        <p>
          Thank you for being part of Stylegrades!
        </p>

        <p>
          <a href="https://www.stylegrades.com">
            Visit Stylegrades
          </a>
        </p>
      `,
    });

    console.log("RESEND RESULT:", result);

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}