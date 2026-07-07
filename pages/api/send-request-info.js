import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const {
      email,
      name,
      message,
    } = req.body;

    const result = await resend.emails.send({
      from: "Stylegrades <noreply@stylegrades.com>",

      to: email,

      cc: "administrator@stylegrades.com",

      replyTo: "administrator@stylegrades.com",

      subject:
        "Additional Information Needed for Your Stylegrades Application",
      html: `
        <h2>Additional Information Needed</h2>

        <p>Hi ${name || "there"},</p>

        <p>Thank you for applying to Stylegrades.</p>

        <p>Before we can approve your profile, we need a little more information.</p>

        <p><strong>Message from Stylegrades:</strong></p>

        <blockquote style="border-left:4px solid #ccc;padding-left:12px;">
          ${message || "Please contact us regarding your application."}
        </blockquote>

        <p>
          Please update your application with the requested information and
          resubmit it for review.
        </p>

        <p>
          If you have any questions, simply reply to this email and a
          Stylegrades administrator will assist you.
        </p>

        <p>Thank you!</p>

        <p>— Stylegrades</p>
      `,
    });

    return res.status(200).json({
      success: true,
      result,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
}