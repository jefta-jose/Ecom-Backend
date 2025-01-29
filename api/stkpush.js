import { setDoc, doc } from 'firebase/firestore';  // Make sure to import Firebase Firestore methods if you're using Firestore
import { db } from '../../lib/firebase';  // Import Firebase configuration

export default async function handler(req, res) {
  if (req.method === "POST") {
    console.log("STK PUSH CALLBACK");

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = req.body.Body.stkCallback;

    let redirectUrl = "http://localhost:5173/cancel"; // Default to failure

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
        redirectUrl = `http://localhost:5173/mpesasuccess?session_id=${CheckoutRequestID}`;
      } catch (error) {
        console.error("Firestore Error:", error);
      }
    } else {
      console.log("Payment Failed ❌:", ResultDesc);
    }

    // Redirect user to success or cancel page
    res.redirect(redirectUrl);
  } else {
    // Handle any non-POST requests
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
