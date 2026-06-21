import Stripe from "stripe";
import { buffer } from "micro";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // ADVERTISER CHECKOUT

    if (session.metadata?.advertiser === "true") {

      const { createClient } = await import(
        "@supabase/supabase-js"
      );

      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const customerId = session.customer;

      const companyName =
        session.metadata.company_name;

      const contactEmail =
        session.metadata.contact_email;

      const website =
        session.metadata.website;
      
        const placementType =
        session.metadata.placement_type;

      const subscriptionId =
        session.subscription;

      console.log(
        "ADVERTISER CHECKOUT:",
        {
          customerId,
          subscriptionId,
          companyName,
        }
      );  

      const { error } = await supabase
        .from("advertisers")
        .insert([
          {
            company_name: companyName,
            contact_email: contactEmail,
            website: website,

            placement_type: placementType,

            status: "pending",

            stripe_customer_id: customerId,

            stripe_subscription_id:
              subscriptionId,

            subscription_status: "active",

            targeting_type: "national",

            impressions: 0,
            clicks: 0,
          },
        ]);

      if (error) {
        console.error(
          "Advertiser insert error:",
          error
        );
      } else {
        console.log(
          "Advertiser created:",
          companyName
        );
      }

      return res.status(200).json({
        received: true,
      });
    }
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;

    if (!userId || !plan) {
      console.error("❌ Missing metadata:", { userId, plan });
      return res.status(400).end();
    }

    const { createClient } = await import("@supabase/supabase-js");

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase
      .from("stylists")
      .update({
        tier: plan,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: "active",
      })
      .eq("user_id", userId);

    if (error) {
      console.error("❌ Supabase update error:", error);
    } else {
      console.log("🎉 User upgraded:", userId, plan);
    }
  }

  if (event.type === "customer.subscription.updated") {

    const subscription = event.data.object;

    const customerId = subscription.customer;

    const priceId =
      subscription.items.data[0]?.price?.id;

    let tier = "free";

    if (
      priceId === "price_1Tigc8IvhZOmYR7a5DIIIQMb"
    ) {
      tier = "pro";
    }

    if (
      priceId === "price_1Tigc8IvhZOmYR7aQGQlQ4qF"
    ) {
      tier = "premium";
    }

    const { createClient } = await import(
      "@supabase/supabase-js"
    );

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: advertiser } =
      await supabase
        .from("advertisers")
        .select("*")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

    if (advertiser) {

      const { error } = await supabase
        .from("advertisers")
        .update({
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
        })
        .eq("stripe_customer_id", customerId);

      if (error) {
        console.error(
          "Advertiser update error:",
          error
        );
      }

      return res.status(200).json({
        received: true,
      });
    }

        const { data: stylist } =
          await supabase
            .from("stylists")
            .select("*")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

        if (!stylist) {
          console.log(
            "No stylist or advertiser found for customer:",
            customerId
          );

          return res.status(200).json({
            received: true,
          });
        }

        // ENFORCE GALLERY LIMITS

        let gallery = stylist.gallery || [];

        let maxPhotos = 3;

        if (tier === "pro") {
          maxPhotos = 12;
        }

        if (tier === "premium") {
          maxPhotos = 20;
        }

        if (gallery.length > maxPhotos) {
          gallery = gallery.slice(0, maxPhotos);
        }

    // UPDATE STYLIST

    const { error } = await supabase
      .from("stylists")
      .update({
        tier: tier,
        subscription_status: subscription.status,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        gallery: gallery,
      })
      .eq("stripe_customer_id", customerId);

    if (error) {
      console.error(
        "❌ Subscription update error:",
        error
      );
    } else {
      console.log(
        "✅ Subscription updated:",
        customerId,
        tier
      );
    }
  }

  if (event.type === "customer.subscription.deleted") {

    const subscription = event.data.object;

    const customerId = subscription.customer;

    const { createClient } = await import(
      "@supabase/supabase-js"
    );

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log(
      "DELETE EVENT CUSTOMER ID:",
      customerId
    );

    const { data: advertiser } =
      await supabase
        .from("advertisers")
        .select("*")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

    console.log(
      "ADVERTISER FOUND:",
      advertiser
    );

    if (advertiser) {

      const { error } = await supabase
        .from("advertisers")
        .update({
          subscription_status: "canceled",
          stripe_subscription_id: subscription.id,
        })
        .eq("stripe_customer_id", customerId);

      if (error) {
        console.error(
          "Advertiser cancellation error:",
          error
        );
      }

      return res.status(200).json({
        received: true,
      });
    }

    const { data: stylist, error: fetchError } =
      await supabase
        .from("stylists")
        .select("*")
        .eq("stripe_customer_id", customerId)
        .single();

    if (fetchError || !stylist) {
      console.error(
        "❌ Could not find stylist:",
        fetchError
      );
      return res.status(400).end();
    }

    const trimmedGallery = (
      stylist.gallery || []
    ).slice(0, 3);

    const { error } = await supabase
      .from("stylists")
      .update({
        tier: "free",
        subscription_status: "canceled",
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        gallery: trimmedGallery,
      })
      .eq("stripe_customer_id", customerId);

    if (error) {
      console.error(
        "❌ Cancellation update error:",
        error
      );
    } else {
      console.log(
        "✅ Subscription canceled:",
        customerId
      );
    }
  }

  res.status(200).json({ received: true });
}