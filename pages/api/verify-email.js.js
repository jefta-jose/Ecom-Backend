import { db } from '../../firebase';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
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

      // Now update the user's "isVerified" field in the "users" collection
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('email', '==', email));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userDocRef = doc(db, 'users', userDoc.id);
        await updateDoc(userDocRef, { isVerified: true });

        res.status(200).json({ message: `Email ${email} verified successfully!` });
      } else {
        res.status(404).json({ message: 'User not found.' });
      }
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
