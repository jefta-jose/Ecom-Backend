import { db } from '../../firebase';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';

export default async function handler(req, res) {
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
      const auth = getAuth();
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
