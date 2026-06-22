import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

export default async function handler(
  req,
  res
) {

  // CORS
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({
        error: "Missing customerId",
      });
    }

    const session =
      await stripe.billingPortal.sessions.create({
        customer: customerId,

        return_url:
          "https://www.stylegrades.com/#/admin/advertisers",
      });

    return res.status(200).json({
      url: session.url,
    });

  } catch (err) {

    console.error(
      "Billing Portal Error:",
      err
    );

    return res.status(500).json({
      error: "Server error",
    });
  }
}