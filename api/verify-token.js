let verificationTokens = {};

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { token } = req.body;

    if (!token || !verificationTokens[token]) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    res.status(200).json({ message: 'Token verified!' });
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
