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

    console.log("STK PUSH CALLBACK");
  
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = req.body.Body.stkCallback;
  
    let redirectUrl = "https://ecom-frontend-seven-chi.vercel.app/cancel"; // Default to failure
  
    if (ResultCode === 0) {
      const amount = CallbackMetadata.Item.find(item => item.Name === "Amount")?.Value;
      const mpesaReceiptNumber = CallbackMetadata.Item.find(item => item.Name === "MpesaReceiptNumber")?.Value;
      const transactionDate = CallbackMetadata.Item.find(item => item.Name === "TransactionDate")?.Value;
      const phoneNumber = CallbackMetadata.Item.find(item => item.Name === "PhoneNumber")?.Value;
  
      console.log("Payment Success ✅");
      console.log("Amount:", amount);
      console.log("MpesaReceiptNumber:", mpesaReceiptNumber);
      console.log("TransactionDate:", transactionDate);
      console.log("PhoneNumber:", phoneNumber);
  
      // Save to Firestore
      try {
        const orderRef = doc(db, "mpesaOrders", phoneNumber);
        await setDoc(orderRef, {
          phoneNumber,
          mpesaReceiptNumber,
          amount,
          transactionDate,
          checkoutRequestID: CheckoutRequestID,
          merchantRequestID: MerchantRequestID,
        }, { merge: true });
  
        console.log("Payment saved to Firestore ✅");
  
        // Redirect to success page with session ID
        redirectUrl = `https://ecom-frontend-seven-chi.vercel.app/mpesasuccess?session_id=${CheckoutRequestID}`;
      } catch (error) {
        console.error("Firestore Error:", error);
      }
    } else {
      console.log("Payment Failed ❌:", ResultDesc);
    }
  
    // Redirect user to success or cancel page
    res.redirect(redirectUrl);
  };

export default allowCors(handler);