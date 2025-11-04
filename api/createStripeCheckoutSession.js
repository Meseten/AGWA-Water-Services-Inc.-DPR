import Stripe from 'stripe';
import admin from 'firebase-admin';

let stripe;
let adminApp;

try {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log("API: Stripe SDK initialized successfully.");
} catch (e) {
  console.error("API: FATAL ERROR initializing Stripe:", e.message);
}

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_ADMIN_CLIENT_EMAIL.replace('@', '%40')}`
};

if (!admin.apps.length) {
  try {
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error("Firebase admin config is missing project_id, private_key, or client_email. Check .env.local.");
    }
    
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("API: Firebase Admin SDK initialized successfully.");
  } catch (e) {
    console.error("API: FATAL ERROR initializing Firebase Admin:", e.stack);
  }
} else {
  adminApp = admin.app();
}

export default async function handler(request, response) {
  console.log(`API: Received request: ${request.method} /api/createStripeCheckoutSession`);
  
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    console.log("API: Responding to OPTIONS preflight.");
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    console.warn(`API: Blocked ${request.method} request.`);
    response.setHeader('Allow', 'POST');
    return response.status(405).send({ error: 'Method Not Allowed' });
  }

  if (!stripe || !adminApp) {
    console.error("API: SDKs not initialized. Stripe or Firebase Admin failed on load.");
    return response.status(500).send({ error: "Internal Server Error: SDKs failed to initialize. Check server logs." });
  }

  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn("API: Request missing Authorization header.");
      return response.status(401).send({ error: 'Unauthorized: No token provided.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log(`API: Token verified for user: ${decodedToken.email}`);
    } catch (error) {
      console.error('API: Error verifying token:', error);
      return response.status(401).send({ error: 'Unauthorized: Invalid token.' });
    }

    const {
      billId, amount, userEmail, userId, accountNumber, successUrl, cancelUrl
    } = request.body;

    if (!billId || !amount || !userEmail || !userId || !accountNumber || !successUrl || !cancelUrl) {
      console.error('API: Missing required payment fields.', request.body);
      return response.status(400).send({ error: 'Missing required fields.' });
    }
    console.log(`API: Request body validated for bill: ${billId}`);

    if (decodedToken.uid !== userId) {
      console.warn(`API: Forbidden. Token UID (${decodedToken.uid}) does not match request UID (${userId}).`);
      return response.status(403).send({ error: 'Forbidden: Token does not match user ID.' });
    }

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'php',
            product_data: {
              name: `AGWA Water Bill - ${accountNumber}`,
              description: `Payment for Bill ID: ${billId}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        customer_email: userEmail,
        client_reference_id: userId,
        metadata: { billId, userId, accountNumber },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      console.log(`API: Stripe session created: ${session.id}`);
    } catch (error) {
      console.error('API: Stripe Session Creation Error:', error);
      return response.status(500).send({ error: `Stripe Error: ${error.message}` });
    }

    if (!session || !session.id) {
      throw new Error('Failed to create Stripe session.');
    }

    return response.status(200).send({ sessionId: session.id });

  } catch (error) {
    console.error('API: Unknown Handler Error:', error);
    return response.status(500).send({ error: `Internal Server Error: ${error.message}` });
  }
}