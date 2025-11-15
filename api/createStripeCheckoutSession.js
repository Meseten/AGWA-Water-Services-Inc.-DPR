const admin = require('firebase-admin');
const Stripe = require('stripe');

let db;
let stripe;
let servicesInitialized = false;

try {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("CRITICAL: STRIPE_SECRET_KEY environment variable is not set.");
  }
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  if (admin.apps.length === 0) {
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

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  db = admin.firestore();
  servicesInitialized = true;
  console.log("createStripeCheckoutSession API: Services initialized successfully.");
} catch (error) {
  console.error('CRITICAL: Failed to initialize services:', error.message, error.stack);
}

const verifyFirebaseToken = async (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No token provided.');
  }
  const token = authorizationHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Error verifying Firebase token:", error);
    throw new Error('Unauthorized: Invalid token.');
  }
};

export default async function handler(req, res) {
  const allowedOrigins = [
    'https://agwa-wsinc.verce.app', 
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!servicesInitialized || !db || !stripe) {
    console.error("createStripeCheckoutSession API: Services not initialized.");
    return res.status(500).json({ error: 'Server configuration error. Check logs.' });
  }

  try {
    const user = await verifyFirebaseToken(req.headers.authorization);
    
    const { 
      billId, 
      amount, 
      userEmail, 
      userId, 
      accountNumber, 
      successUrl, 
      cancelUrl 
    } = req.body;

    if (!billId || !amount || !userEmail || !userId || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing required payment details.' });
    }
    
    if (user.uid !== userId) {
        return res.status(403).json({ error: 'Forbidden: Token does not match user ID.' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'php',
            product_data: {
              name: `AGWA Water Bill (${accountNumber || 'N/A'})`,
              description: `Payment for Bill ID: ${billId}`,
            },
            unit_amount: amount, 
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: userEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        billId: billId,
        userId: userId,
        accountNumber: accountNumber || 'N/A',
      },
    });

    return res.status(200).json({ sessionUrl: session.url });

  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    return res.status(500).json({ error: error.message || 'An internal server error occurred.' });
  }
}