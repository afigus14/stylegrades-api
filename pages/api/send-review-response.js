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
      reviewerName,
      reviewerEmail,
      stylistName,
      reviewText,
      stylistResponse,
    } = req.body;

    console.log(
      "SENDING RESPONSE EMAIL TO:",
      reviewerEmail
    );

    const result = await resend.emails.send({
      from: "Stylegrades <noreply@stylegrades.com>",
      to: reviewerEmail,
      subject:
        "A stylist responded to your Stylegrades review",

      html: `
        <h2>Your review received a response</h2>

        <p>Hi ${reviewerName},</p>

        <p>
          ${stylistName} has responded to your review on Stylegrades.
        </p>

        <h3>Your Review</h3>

        <p>${reviewText}</p>

        <h3>Stylist Response</h3>

        <p>${stylistResponse}</p>

        <br/>

        <a href="https://www.stylegrades.com">
          View on Stylegrades
        </a>
      `,
    });

    console.log("RESPONSE EMAIL RESULT:", result);

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