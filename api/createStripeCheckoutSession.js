import Stripe from 'stripe';
import admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_ADMIN_CLIENT_EMAIL.replace('@', '%40')}`
};

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error("Firebase admin initialization error:", e.stack);
  }
}

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).send({ error: 'Method Not Allowed' });
  }

  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.status(401).send({ error: 'Unauthorized: No token provided.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying token:', error);
      return response.status(401).send({ error: 'Unauthorized: Invalid token.' });
    }

    const {
      billId,
      amount,
      userEmail,
      userId,
      accountNumber,
      successUrl,
      cancelUrl,
    } = request.body;

    if (
      !billId ||
      !amount ||
      !userEmail ||
      !userId ||
      !accountNumber ||
      !successUrl ||
      !cancelUrl
    ) {
      console.error('Missing required payment fields.', request.body);
      return response.status(400).send({ error: 'Missing required fields.' });
    }

    if (decodedToken.uid !== userId) {
      return response.status(403).send({ error: 'Forbidden: Token does not match user ID.' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'php',
            product_data: {
              name: `AGWA Water Bill - ${accountNumber}`,
              description: `Payment for Bill ID: ${billId}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      client_reference_id: userId,
      metadata: {
        billId: billId,
        userId: userId,
        accountNumber: accountNumber,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session || !session.url) {
      throw new Error('Failed to create Stripe session or missing session URL.');
    }

    return response.status(200).send({ sessionUrl: session.url });

  } catch (error) {
    console.error('Handler Error:', error);
    return response.status(500).send({ error: `Internal Server Error: ${error.message}` });
  }
}