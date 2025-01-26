import { db } from '../firebase.js';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import {auth} from '../firebase.js'

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
  console.log("Request method:", req.method);  // Log request method

  if (req.method === 'POST') {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    try {
      // Check if the token exists in the Firestore collection
      const verificationTokensRef = collection(db, 'verificationTokens');
      const q = query(verificationTokensRef, where('token', '==', token));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
      }

      const tokenDoc = snapshot.docs[0];
      const email = tokenDoc.data().email;

      // Remove token from Firestore after it's used
      await deleteDoc(doc(db, 'verificationTokens', tokenDoc.id));

      // Verify the user's token with Firebase Authentication (check if it's valid)
      const user = await auth.getUserByEmail(email);

      if (user) {
        // Update the password using Firebase Authentication
        await auth.updateUser(user.uid, { password: newPassword });

        res.status(200).json({ message: 'Password reset successful!' });
      } else {
        res.status(404).json({ message: 'User not found.' });
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}

export default allowCors(handler);