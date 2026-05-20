import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  console.log("🔥 PORTAL ENDPOINT HIT");
 
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  // ✅ Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { customer_id } = body;

    if (!customer_id) {
      return res.status(400).json({ error: "Missing customer_id" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer_id,
      return_url: "http://localhost:5173/#/dashboard",
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("Portal error:", err);
    res.status(500).json({ error: "Portal error" });
  }
}