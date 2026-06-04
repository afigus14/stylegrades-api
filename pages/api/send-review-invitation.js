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
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const {
      clientName,
      clientEmail,
      stylistName,
      token,
    } = req.body;

    const reviewUrl =
      `https://www.stylegrades.com/#/review/invite/${token}`;

    console.log(
      "SENDING REVIEW INVITATION TO:",
      clientEmail
    );

    const result = await resend.emails.send({
      from: "Stylegrades <noreply@stylegrades.com>",
      to: clientEmail,
      subject: `How was your experience with ${stylistName}?`,
      html: `
        <h2>We'd love your feedback</h2>

        <p>Hi ${clientName},</p>

        <p>
          ${stylistName} invited you to leave a review on Stylegrades.
        </p>

        <p>
          Your feedback helps other clients find a stylist they'll love.
        </p>

        <p>
          <a href="${reviewUrl}">
            Leave Your Review
          </a>
        </p>

        <p>
          This invitation can only be used once.
        </p>
      `,
    });

    console.log(
      "INVITATION EMAIL RESULT:",
      result
    );

    return res.status(200).json({
      success: true,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
}