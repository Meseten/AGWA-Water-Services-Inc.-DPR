import Stripe from 'stripe';
import admin from 'firebase-admin';

const profilesCollectionPath = () => `public/data/profiles`;
const userProfileDocumentPath = (userId) => `users/${userId}/profile/data`;
const allBillDocumentPath = (billId) => `public/data/all_bills/${billId}`;
const systemSettingsDocumentPath = () => `public/data/system_config/settings`;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY 
        ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n') 
        : undefined,
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.replace('@', '%40')}`
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error("Firebase admin initialization error:", e.stack);
  }
}

const db = admin.firestore();

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

const awardRebatePoints = async (userId, bill, amountPaid, systemSettings) => {
  if (systemSettings?.isRebateProgramEnabled === false) {
    console.log(`Webhook: Rebate program is disabled in settings.`);
    return;
  }
  if (!userId) {
     console.log(`Webhook: No user ID provided.`);
     return;
  }

  try {
    const pointsPerPeso = parseFloat(systemSettings.pointsPerPeso) || 0;
    const earlyPaymentDays = parseInt(systemSettings.earlyPaymentDaysThreshold, 10) || 7;
    const earlyPaymentBonus = parseInt(systemSettings.earlyPaymentBonusPoints, 10) || 10;
    
    let pointsToAward = (amountPaid * pointsPerPeso);

    const dueDate = bill.dueDate?.seconds ? new Date(bill.dueDate.seconds * 1000) : null;
    const paymentDate = new Date();

    if (dueDate) {
      const diffTime = dueDate.getTime() - paymentDate.getTime();
      const daysEarly = diffTime / (1000 * 60 * 60 * 24);
      
      if (daysEarly >= earlyPaymentDays) {
        pointsToAward += earlyPaymentBonus;
        console.log("Webhook: Awarding early payment bonus:", earlyPaymentBonus);
      }
    }

    const roundedPointsToAward = Math.round(pointsToAward);
    if (roundedPointsToAward <= 0) {
      console.log("Webhook: No points to award (rounded to 0).");
      return;
    }

    const userProfileRef = db.doc(profilesCollectionPath() + `/${userId}`);
    const userProfileSnap = await userProfileRef.get();
    
    if (!userProfileSnap.exists) {
        console.error("Webhook: User profile not found. Cannot award points:", userId);
        return;
    }

    const currentPoints = userProfileSnap.data().rebatePoints || 0;
    const newTotalPoints = currentPoints + roundedPointsToAward;

    let newTier = 'Bronze';
    if (newTotalPoints >= 3000) newTier = 'Platinum';
    else if (newTotalPoints >= 1500) newTier = 'Gold';
    else if (newTotalPoints >= 500) newTier = 'Silver';

    const updates = { 
      rebatePoints: newTotalPoints, 
      rebateTier: newTier,
      updatedAt: admin.firestore.Timestamp.now()
    };

    const batch = db.batch();
    batch.update(userProfileRef, updates);
    batch.update(db.doc(userProfileDocumentPath(userId)), updates);
    
    await batch.commit();
    console.log("Webhook: Awarded points. New total:", roundedPointsToAward, userId, newTotalPoints);
  } catch (error) {
    console.error("Webhook: Failed to award rebate points:", userId, error);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: Signature verification failed.`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log("Webhook: Received checkout.session.completed for session", session.id);

    try {
      const metadata = session.metadata;
      const billId = metadata.billId;
      const userId = metadata.userId;
      const amountPaid = session.amount_total / 100;

      if (!billId || !userId) {
        console.error("Webhook: Missing billId or userId in session metadata for session:", session.id);
        throw new Error(`Missing metadata for session`);
      }

      const billRef = db.doc(allBillDocumentPath(billId));
      const billSnap = await billRef.get();
      
      if (!billSnap.exists) {
        console.error("Webhook: Bill document not found:", billId);
        throw new Error(`Bill document not found`);
      }
      
      const billData = billSnap.data();

      await billRef.update({
        status: 'Paid',
        paymentDate: admin.firestore.Timestamp.now(),
        paymentTimestamp: admin.firestore.Timestamp.now(),
        amountPaid: amountPaid,
        paymentMethod: session.payment_method_types[0] || 'Stripe',
        paymentReference: session.id,
        lastUpdatedAt: admin.firestore.Timestamp.now()
      });
      console.log("Webhook: Successfully updated bill to Paid:", billId);

      const settingsSnap = await db.doc(systemSettingsDocumentPath()).get();
      const settings = settingsSnap.exists ? settingsSnap.data() : {}; 
      
      await awardRebatePoints(userId, billData, amountPaid, settings);

    } catch (dbError) {
      console.error("Webhook: Firestore update error:", dbError);
      return res.status(200).json({ error: `Internal Logic Error: ${dbError.message}` });
    }
  }

  res.status(200).send({ received: true });
}