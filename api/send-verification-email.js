import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { db } from '../firebase.js'; // Adjust path as necessary
import { collection, addDoc, Timestamp, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const handler = async (req, res) => {
  if (req.method === 'POST') {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    // Generate a verification token
    const token = crypto.randomBytes(32).toString("hex");

    // Save token to Firestore
    try {
      const verificationTokensRef = collection(db, 'verificationTokens');
      await addDoc(verificationTokensRef, {
        createdAt: Timestamp.now(),
        email,
        token,
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify Your Email",
        html: `<p>Click <a href="https://ecom-backend-ten-rose.vercel.app/api/verify-email?token=${token}">here</a> to verify your email.</p>`,
      };
      

      await transporter.sendMail(mailOptions);

      // Update verification status
      await updateVerificationStatus(email);

      res.status(200).json({ message: "Verification email sent!" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error sending email." });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
};

const updateVerificationStatus = async (email) => {
  try {
    // Use collection and query to get user by email
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      const userDocRef = doc(db, "users", docId);

      // Update the isVerified field
      await updateDoc(userDocRef, { isVerifying: true });
    } else {
      console.error("User not found.");
    }
  } catch (error) {
    console.error("Error updating isVerifying:", error);
  }
};

export default allowCors(handler);
