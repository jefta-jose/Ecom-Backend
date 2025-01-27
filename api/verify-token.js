import { db } from "../firebase.js";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";

const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://ecom-frontend-seven-chi.vercel.app/');
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
  if (req.method === 'POST') {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required.' });
    }

    // Check if the token exists in the Firestore collection
    const verificationTokensRef = collection(db, 'verificationTokens');
    const q = query(verificationTokensRef, where('token', '==', token));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    res.status(200).json({ message: 'Token verified!' });
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
};

export default allowCors(handler);
