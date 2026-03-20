import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const { stylistId, tier } = req.body;

    let priceId;

    if (tier === "pro") {
      priceId = process.env.STRIPE_PRICE_PRO;
    }

    if (tier === "premium") {
      priceId = process.env.STRIPE_PRICE_PREMIUM;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],

      metadata: {
        stylistId,
        tier
      },

      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/upgrade-success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`
    });

    res.json({ url: session.url });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Stripe error" });
  }
}