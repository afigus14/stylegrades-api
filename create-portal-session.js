import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const { customer_id } = req.body;

    if (!customer_id) {
      return res.status(400).json({ error: "Missing customer_id" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer_id,
      return_url: "https://www.stylegrades.com/dashboard",
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("Portal error:", err);
    res.status(500).json({ error: "Stripe portal error" });
  }
}