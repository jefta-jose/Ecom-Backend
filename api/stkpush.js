import moment from "moment";

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


const handler = async (req, res) => {
  let { items, phoneNumber } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ msg: "No items provided", status: false });
  }

  if (!phoneNumber) {
    return res.status(400).json({ msg: "Phone number is required", status: false });
  }

  // Convert phone number to international format if needed
  if (phoneNumber.startsWith("0")) {
    phoneNumber = "254" + phoneNumber.slice(1);
  }

  // Calculate total amount
  const totalAmount = items.reduce((total, item) => {
    const price = parseFloat(item.discountedPrice || item.regularPrice || 0);
    return total + price * (item.quantity || 1);
  }, 0);

  const productDetails = items.map(item => ({
    images: item.images
  }));

  const callbackURL = new URL("https://ecom-backend-ten-rose.vercel.app/api/callback");
  callbackURL.searchParams.append("productDetails", JSON.stringify(productDetails));  // Adding product details as query params

  try {
    const accessToken = await getAccessToken();
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString("base64");

    const response = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: "174379",
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        // Amount: totalAmount,
        Amount: 1,
        PartyA: phoneNumber,
        PartyB: "174379",
        PhoneNumber: phoneNumber,
        CallBackURL: callbackURL.toString(),
        AccountReference: "accountNumber",
        TransactionDesc: "Mpesa Daraja API stk push test",
      }),
    });

    res.status(200).json({
      msg: "Request successful! Please enter your Mpesa PIN.",
      status: true,
    });

  } catch (error) {
    console.error("STK Push Error:", error.response ? error.response.data : error.message);
    
    res.status(500).json({
      msg: "STK Push request failed.",
      status: false,
      error: error.response ? error.response.data : error.message,
    });
  }
};

const consumer_key = process.env.MPESA_CONSUMER_KEY;
const consumer_secret = process.env.MPESA_SECRET_KEY;

async function getAccessToken() {
  const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

  const auth =
    "Basic " + Buffer.from(consumer_key + ":" + consumer_secret).toString("base64");

  try {
    const response = await fetch(url, {
      method: "GET", // ✅ Correct method
      headers: { Authorization: auth },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json(); // ✅ Correctly parse JSON

    if (!data.access_token) {
      throw new Error("Access token not found in response.");
    }

    return data.access_token;
  } catch (error) {
    console.error("Error fetching access token:", error.message);
    throw new Error("Failed to fetch access token. Check credentials or network.");
  }
}


export default allowCors(handler); 