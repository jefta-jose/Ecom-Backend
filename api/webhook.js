import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export const config = {
  api: {
    bodyParser: false, // Stripe requires raw body
  },
};

const handler = async (req, res) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // From Stripe Dashboard
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    // Verify the event came from Stripe
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        console.log("Checkout session completed", event.data.object);
        // Fulfill the order, update DB, send email, etc.
        break;
      case "payment_intent.succeeded":
        console.log("Payment intent succeeded", event.data.object);
        break;
      case "payment_intent.payment_failed":
        console.log("Payment failed", event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).send("Event received");
  } catch (err) {
    console.error("Webhook Error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

async function buffer(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default handler;
