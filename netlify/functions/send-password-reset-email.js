import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { db } from '../firebase.js'; // Adjust path as necessary
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

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
        subject: "Password Reset Request",
        html: `<p>Your password reset token is: ${token}</p>`,
      };

      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: "Password reset email sent!" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error sending email." });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
