import { setDoc, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

export default async function handler(req, res) {
  if (req.method === "POST") {

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = req.body.Body.stkCallback;

    if (ResultCode === 0) {
      const amount = CallbackMetadata.Item.find(item => item.Name === "Amount")?.Value;
      const mpesaReceiptNumber = CallbackMetadata.Item.find(item => item.Name === "MpesaReceiptNumber")?.Value;
      const transactionDate = CallbackMetadata.Item.find(item => item.Name === "TransactionDate")?.Value;
      const phoneNumber = CallbackMetadata.Item.find(item => item.Name === "PhoneNumber")?.Value;

      // Extract product details from query parameters
      const productDetails = req.query.productDetails ? JSON.parse(req.query.productDetails) : [];

      // Save to Firestore
      try {
        const orderRef = doc(db, "mpesaOrders", phoneNumber);
        const docSnap = await getDoc(orderRef);

        if(docSnap.exists()){
          await updateDoc(orderRef,{
            orders: arrayUnion({
              phoneNumber,
              mpesaReceiptNumber,
              amount,
              transactionDate,
              checkoutRequestID: CheckoutRequestID,
              merchantRequestID: MerchantRequestID,
              createdAt: new Date(),
              paymentMethod: "Mpesa",
              products: productDetails,
            })
          })
        }else{
          await setDoc(orderRef, {
            orders: [{
              phoneNumber,
              mpesaReceiptNumber,
              amount,
              transactionDate,
              checkoutRequestID: CheckoutRequestID,
              merchantRequestID: MerchantRequestID,
              createdAt: new Date(),
              paymentMethod: "Mpesa",
              products: productDetails,
            }]
          })
        }

        console.log("Payment saved to Firestore ✅");

      } catch (error) {
        console.error("Firestore Error:", error);
      }
    } else {
      console.log("Payment Failed ❌:", ResultDesc);
    }

  } else {
    // Handle any non-POST requests
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}