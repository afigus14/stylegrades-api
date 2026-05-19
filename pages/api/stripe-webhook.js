import Stripe from "stripe";
import { buffer } from "micro";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
console.log("🔥 WEBHOOK HIT");

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    const buf = await buffer(req);

    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🎯 HANDLE SUCCESSFUL PAYMENT
  if (event.type === "checkout.session.completed") {
  const session = event.data.object;
  const customerId = session.customer;
  
  console.log("CUSTOMER ID:", customerId);

  console.log("✅ Payment received:", session);

  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan;
  const customerId = session.customer;

  if (!userId || !plan) {
    console.error("❌ Missing metadata:", { userId, plan });
    return res.status(400).end();
  }

  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // ✅ THIS IS THE KEY FIX
  const { error } = await supabase
    .from("stylists")
    .update({
      tier: plan,                // ✅ correct column
      stripe_customer_id: customerId,
      subscription_status: "active",
    })
    .eq("user_id", userId);

  if (error) {
    console.error("❌ Supabase update error:", error);
  } else {
    console.log("🎉 User upgraded:", userId, plan);
  }

  res.status(200).json({ received: true });
}