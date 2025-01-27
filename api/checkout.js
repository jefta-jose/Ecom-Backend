const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

//api to checkout 
const handler = async(req, res) => {

    try {
      const { items, email } = req.body;
  
      const extractingItems = items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: item.discountedPrice * 100, // Stripe expects amounts in cents
          product_data: {
            name: item.name,
            description: item.description,
            images: item.images,
          },
        },
      }));
  
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: extractingItems,
        mode: "payment",
        success_url: `https://ecom-frontend-seven-chi.vercel.app/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: "https://ecom-frontend-seven-chi.vercel.app/cancel",
        metadata: { email },
      });
  
      console.log("STRIPE SESSION", session);
  
      // Send both the session ID and URL to the frontend
      res.json({
        message: "Checkout session created successfully",
        success: true,
        id: session.id,
        url: session.url,  // Added session URL
      });
    } catch (error) {
      console.error("Stripe error:", error.message);
      res.status(500).json({ error: error.message });
    }
  };
  
export default allowCors(handler);
