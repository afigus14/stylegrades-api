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
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const {
      reviewerName,
      reviewerEmail,
      stylistName,
      verificationUrl,
    } = req.body;

    if (
      !reviewerName ||
      !reviewerEmail ||
      !stylistName ||
      !verificationUrl
    ) {
      return res.status(400).json({
        ok: false,
        error: "Missing required information.",
      });
    }

    const { data, error } = await resend.emails.send({
      from: "Stylegrades <noreply@stylegrades.com>",
      to: reviewerEmail,
      subject: `Verify your review of ${stylistName}`,
      html: `
        <div style="
          max-width:600px;
          margin:0 auto;
          padding:32px 24px;
          font-family:Arial,Helvetica,sans-serif;
          color:#243B53;
          line-height:1.6;
        ">

          <h1 style="
            color:#102A43;
            font-size:26px;
            margin:0 0 18px;
          ">
            Verify your Stylegrades™ review
          </h1>

          <p>
            Hi ${escapeHtml(reviewerName)},
          </p>

          <p>
            Thank you for sharing your experience with
            <strong>${escapeHtml(stylistName)}</strong>.
          </p>

          <p>
            Before your review can be considered for publication,
            please verify the email address you provided by clicking
            the button below.
          </p>

          <div style="margin:30px 0;">
            <a
              href="${verificationUrl}"
              style="
                display:inline-block;
                background:#102A43;
                color:#ffffff;
                text-decoration:none;
                padding:13px 22px;
                border-radius:10px;
                font-weight:bold;
              "
            >
              Verify My Review
            </a>
          </div>

          <p style="
            font-size:14px;
            color:#52606D;
          ">
            Verification helps Stylegrades™ protect the integrity
            and authenticity of reviews on our platform.
          </p>

          <p style="
            font-size:14px;
            color:#52606D;
          ">
            After verification, your review will be evaluated
            according to our review guidelines before it becomes
            eligible for publication.
          </p>

          <hr style="
            border:0;
            border-top:1px solid #D9E2EC;
            margin:28px 0;
          " />

          <p style="
            font-size:12px;
            color:#7B8794;
          ">
            If you did not submit this review, you can ignore this
            email. The review will remain unverified and will not
            be eligible for publication.
          </p>

          <p style="
            font-size:12px;
            color:#7B8794;
          ">
            Stylegrades™<br />
            A trusted marketplace for the beauty industry.
          </p>

        </div>
      `,
    });

    if (error) {
      console.error(
        "Direct review verification email error:",
        error
      );

      return res.status(500).json({
        ok: false,
        error: "Could not send verification email.",
      });
    }

    console.log(
      "Direct review verification email sent:",
      data
    );

    return res.status(200).json({
      ok: true,
    });
  } catch (err) {
    console.error(
      "Direct review verification email error:",
      err
    );

    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}