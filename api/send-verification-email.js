import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { db } from '../firebase.js'; // Adjust path as necessary
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  // another common pattern
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  return await fn(req, res)
}


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const handler = async(req, res) => {
  
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

      const verificationLink = `${req.headers.origin}/api/verify-email?token=${token}`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify Your Email",
        html: `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`,
      };

      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: "Verification email sent!" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error sending email." });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}

module.exports = allowCors(handler)