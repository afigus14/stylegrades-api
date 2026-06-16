import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {

  // ✅ CORS MUST COME FIRST
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  // ✅ Handle preflight request FIRST
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ Now check for POST
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { plan, user_id, email } = body;

    console.log("BODY RECEIVED:", body);

    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id" });
    }

    const priceMap = {
      pro: "price_1Tigc8IvhZOmYR7a5DIIIQM",
      premium: "price_1Tigc8IvhZOmYR7aQGQlQ4qF",
    };

    const priceId = priceMap[plan];
    
    if (!priceId) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const BASE_URL =
      process.env.NODE_ENV === "production"
        ? "https://www.stylegrades.com"
        : "http://localhost:5173";

    console.log("✅ USING NEW SUCCESS URL:", `${BASE_URL}/#/dashboard`);    

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      metadata: {
        user_id: user_id,
        plan: plan,
      },

      success_url: `${BASE_URL}/#/dashboard`,
      cancel_url: `${BASE_URL}/#/dashboard`,
    });

    res.status(200).json({ url: session.url });
  } 
  
  catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Stripe error" });
  }
}