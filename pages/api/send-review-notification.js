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
      reviewerName,
      reviewerEmail,
      stylistName,
      reviewText,
      rating,
      action,
    } = req.body;

    console.log("ACTION:", action);
    console.log("REVIEWER EMAIL:", reviewerEmail);
    console.log("REVIEWER NAME:", reviewerName);

    const adminEmail = process.env.ADMIN_EMAIL;

    if (action === "submitted") {
      await resend.emails.send({
        from: "Stylegrades <noreply@stylegrades.com>",
        to: adminEmail,
        subject: "New Review Submitted",
        html: `
          <h2>New Review Pending Approval</h2>

          <p><strong>Reviewer:</strong> ${reviewerName}</p>
          <p><strong>Email:</strong> ${reviewerEmail}</p>
          <p><strong>Stylist:</strong> ${stylistName}</p>
          <p><strong>Rating:</strong> ${rating}</p>

          <p>${reviewText}</p>
        `,
      });
    }

    if (action === "approved") {
      await resend.emails.send({
        from: "Stylegrades <noreply@stylegrades.com>",
        to: reviewerEmail,
        subject: "Your Stylegrades Review Was Approved",
        html: `
          <h2>Review Approved</h2>

          <p>Hi ${reviewerName},</p>

          <p>Your review for ${stylistName} has been approved and is now visible on Stylegrades.</p>

          <p>Thank you for helping others find great stylists.</p>
        `,
      });
    }

    if (action === "rejected") {
      await resend.emails.send({
        from: "Stylegrades <noreply@stylegrades.com>",
        to: reviewerEmail,
        subject: "Your Stylegrades Review Was Not Approved",
        html: `
          <h2>Review Not Approved</h2>

          <p>Hi ${reviewerName},</p>

          <p>Your review for ${stylistName} was not approved by our moderation team.</p>

          <p>If you believe this was an error, please contact Stylegrades.</p>
        `,
      });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}