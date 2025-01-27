import { db } from '../firebase.js';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { auth } from '../firebase.js';  // Import the admin.auth instance
const admin = require('firebase-admin');

const serviceAccount = {
  "type": process.env.SERVICE_ACCOUNT_TYPE,
  "project_id": process.env.PROJECT_ID,
  "private_key_id": process.env.PRIVATE_KEY_ID,
  "private_key": process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  "client_email": process.env.CLIENT_EMAIL,
  "client_id": process.env.CLIENT_ID,
  "auth_uri": process.env.AUTH_URI,
  "token_uri": process.env.TOKEN_URI,
  "auth_provider_x509_cert_url": process.env.AUTH_PROVIDER_X509_CERT_URL,
  "client_x509_cert_url": process.env.CLIENT_X509_CERT_URL,
  "universe_domain": process.env.UNIVERSE_DOMAIN,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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
      const user = await admin.auth().getUserByEmail(email);  // Use admin.auth() here

      if (user) {
        console.log(`Found user: ${email}`);

        // Update the password using Firebase Authentication
        await admin.auth().updateUser(user.uid, { password: newPassword });

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