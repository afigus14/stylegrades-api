import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    const {
      company_name,
      contact_email,
      placement_type,
    } = body;

    const priceMap = {
      local: "price_1TjIk1IvhZOmYR7aiz8PjBz6",
      featured: "price_1TjIkGIvhZOmYR7atkA3vyDd",
    };

    const priceId = priceMap[placement_type];

    if (!priceId) {
      return res.status(400).json({
        error: "Invalid placement type",
      });
    }

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",

        payment_method_types: ["card"],

        customer_email: contact_email,

        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],

        metadata: {
          advertiser: "true",
          company_name,
          contact_email,
          placement_type,
        },

        success_url:
          "https://www.stylegrades.com/#/advertise?success=true",

        cancel_url:
          "https://www.stylegrades.com/#/advertise",
      });

    return res.status(200).json({
      url: session.url,
    });

  } catch (err) {

    console.error(
      "Advertiser checkout error:",
      err
    );

    return res.status(500).json({
      error: "Checkout error",
    });
  }
}