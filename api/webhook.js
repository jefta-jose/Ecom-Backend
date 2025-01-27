import { buffer } from 'micro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false, // Vercel functions do not parse the body automatically
  },
};

const webhookHandler = async (req, res) => {
  if (req.method === 'POST') {
    const sig = req.headers['stripe-signature'];
    const reqBuffer = await buffer(req); // Capture the raw body for verification

    try {
      const event = stripe.webhooks.constructEvent(
        reqBuffer.toString(),
        sig,
        endpointSecret
      );

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          // Handle the checkout session
          console.log(`Payment successful for session: ${session.id}`);
          break;
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          console.log(`PaymentIntent was successful: ${paymentIntent.id}`);
          break;
        // Add other events as needed
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.status(200).send('Event received');
    } catch (err) {
      console.log('Error verifying webhook: ', err.message);
      res.status(400).send(`Webhook error: ${err.message}`);
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default webhookHandler;
