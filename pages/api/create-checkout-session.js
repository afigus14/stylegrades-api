import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



export default async function handler(req, res) {

  // ✅ CORS MUST COME FIRST
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle preflight request FIRST
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ Now check for POST
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const { plan } = req.body;

    const priceMap = {
      pro: "price_1TBEjGEj1ct2UatiPu6pwism",
      premium: "price_1TBEk9Ej1ct2Uati8bWpeidQ",
    };

    const priceId = priceMap[plan];

    if (!priceId) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: "http://localhost:5173/success",
      cancel_url: "http://localhost:5173/join",
    });

    res.status(200).json({ url: session.url });
  } 
  
  catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Stripe error" });
  }
}