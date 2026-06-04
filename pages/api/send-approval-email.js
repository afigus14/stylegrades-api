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
    const { email, name } = req.body;

    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "You're approved on Stylegrades 🎉",
      html: `
        <h2>You're approved!</h2>
        <p>Hi ${name || "there"},</p>
        <p>Your profile is now live on Stylegrades.</p>
        <p>Clients can now find and contact you.</p>

        <br/>

        <a href="https://www.stylegrades.com">
          View your listing
        </a>
      `,
    });

    console.log("RESEND RESULT:", result);

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}