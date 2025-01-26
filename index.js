const express = require("express");
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { db } = require("./firebase.js");
const { collection, doc, getDocs, query, updateDoc, where } = require("firebase/firestore");

const admin = require('firebase-admin');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());
dotenv.config();

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

// Store verification tokens
const verificationTokens = {};

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// API to send verification email
app.post("/send-verification-email", (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).send("Email is required.");

    // Generate a verification token
    const token = crypto.randomBytes(32).toString("hex");
    verificationTokens[token] = email;

    const verificationLink = `${req.protocol}://${req.get("host")}/verify-email?token=${token}`;

    // Email options
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify Your Email",
        html: `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).send("Error sending email.");
        }
        res.send("Verification email sent!");
    });

    updateVerificationStatus(email)
});

// API to verify email
app.get("/verify-email", async (req, res) => {
    const { token } = req.query;

    if (!token || !verificationTokens[token]) {
        return res.status(400).send("Invalid or expired token.");
    }

    const email = verificationTokens[token];
    delete verificationTokens[token];

    try {
        // Use collection and query to get user by email
        const usersRef = collection(db, "users"); // Reference the "users" collection
        const q = query(usersRef, where("email", "==", email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const docId = snapshot.docs[0].id; // Get the first document ID
            const userDocRef = doc(db, "users", docId); // Reference the document

            // Update the isVerified field
            await updateDoc(userDocRef, { isVerified: true });

            res.send(`Email ${email} verified successfully!`);
        } else {
            res.status(404).send("User not found.");
        }
    } catch (error) {
        console.error("Error updating isVerified:", error);
        res.status(500).send("Internal server error.");
    }
});

const updateVerificationStatus = async(email , req,res)=>{
    try {
        // Use collection and query to get user by email
        const usersRef = collection(db, "users"); // Reference the "users" collection
        const q = query(usersRef, where("email", "==", email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const docId = snapshot.docs[0].id; // Get the first document ID
            const userDocRef = doc(db, "users", docId); // Reference the document

            // Update the isVerified field
            await updateDoc(userDocRef, { isVerifying: true });

        } else {
            res.status(404).send("User not found.");
        }
    } catch (error) {
        console.error("Error updating isVerifying:", error);
    }
}

// API to send password reset email
app.post("/send-password-reset-email", (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).send("Email is required.");

    // Generate a password reset token
    const token = crypto.randomBytes(32).toString("hex");
    verificationTokens[token] = email;

    // Email options
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset Request",
        html: `${token}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).send("Error sending email.");
        }
        res.send("Password reset email sent!");
    });
});

// API to handle password reset request
app.post("/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).send("Token and new password are required.");
    }

    if (!verificationTokens[token]) {
        return res.status(400).send("Invalid or expired token.");
    }

    const email = verificationTokens[token].toLowerCase(); // Normalize email to lowercase
    delete verificationTokens[token];

    try {
        console.log(`Resetting password for email: ${email}`);

        // Verify the user's token with Firebase Authentication (check if it's valid)
        const user = await admin.auth().getUserByEmail(email);

        if (user) {
            console.log(`Found user: ${email}`);
            
            // Update the password using Firebase Authentication
            await admin.auth().updateUser(user.uid, { password: newPassword });

            res.send("Password reset successful!");
        } else {
            res.status(404).send("User not found.");
        }
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).send("Internal server error.");
    }
});



// API to verify the token
app.post("/verify-token", (req, res) => {
    const { token } = req.body;

    if (!token || !verificationTokens[token]) {
        return res.status(400).send("Invalid or expired token.");
    }

    // If the token is valid, return success
    res.send("Token verified!");
});



app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});