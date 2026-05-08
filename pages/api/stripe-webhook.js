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

  if (!userId) {
    console.error("❌ No user_id in metadata");
    return res.status(400).end();
  }

  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let tier = "free";

  if (plan === "pro") tier = "pro";
  if (plan === "premium") tier = "premium";

  const { error } = await supabase
    .from("stylists")
    .update({
      tier: tier,
      subscription_status: "active",
      stripe_customer_id: customerId,
    })
    .eq("user_id", userId);

  if (error) {
    console.error("❌ Supabase update error:", error);
  } else {
    console.log("✅ Tier updated:", tier, "for user:", userId);
  }
}

  res.status(200).json({ received: true });
}