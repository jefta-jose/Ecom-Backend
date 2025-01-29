const moment = require("moment");
const axios = require("axios");

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

const consumer_key = process.env.MPESA_CONSUMER_KEY; // Environment variable
const consumer_secret = process.env.MPESA_SECRET_KEY; // Environment variable

async function getAccessToken() {
  const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

  const auth =
    "Basic " +
        Buffer.from(consumer_key + ":" + consumer_secret).toString("base64");
            console.log("Authorization Header:", auth);


  try {
    const response = await axios.get(url, {
      headers: { Authorization: auth },
    });
    console.log("Access Token:", response.data.access_token);
    return response.data.access_token;
  } catch (error) {
    console.error("Error fetching access token:", error.message);
    throw new Error("Failed to fetch access token. Check credentials or network.");
  }
};

const handler = async (req, res) => {
  let { items, phoneNumber } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ msg: "No items provided", status: false });
  }

  if (!phoneNumber) {
    return res.status(400).json({ msg: "Phone number is required", status: false });
  }

  console.log("Items:", items);
  console.log("Phone Number:", phoneNumber);

  // Convert phone number to international format if needed
  if (phoneNumber.startsWith("0")) {
    phoneNumber = "254" + phoneNumber.slice(1);
  }

  // Calculate total amount
  const totalAmount = items.reduce((total, item) => {
    const price = parseFloat(item.discountedPrice || item.regularPrice || 0);
    return total + price * (item.quantity || 1);
  }, 0);

  console.log("Total Amount:", totalAmount);

  try {
    const accessToken = await getAccessToken();
    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString("base64");

    const response = await axios.post(
      url,
      {
        BusinessShortCode: "174379",
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: totalAmount, // Updated to send total amount
        PartyA: phoneNumber,
        PartyB: "174379",
        PhoneNumber: phoneNumber,
        CallBackURL: "https://ecom-backend-ten-rose.vercel.app/api/callback",
        AccountReference: "accountNumber",
        TransactionDesc: "Mpesa Daraja API stk push test",
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

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

export default allowCors(handler); 