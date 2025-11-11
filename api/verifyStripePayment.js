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
    if (!process.env.FIREBASE_ADMIN_CONFIG) {
        throw new Error("CRITICAL: FIREBASE_ADMIN_CONFIG environment variable is not set.");
    }
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CONFIG);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  db = admin.firestore();
  servicesInitialized = true;
  console.log("Services initialized successfully.");
} catch (error) {
  console.error('CRITICAL: Failed to initialize services:', error.message);
}

async function awardRebatePoints(dbInstance, userId, bill, amountPaid, systemSettings) {
  if (!systemSettings?.isRebateProgramEnabled || !userId) {
    console.log(`[Rebate] Program disabled or no user ID. Skipping points for ${userId}.`);
    return;
  }

  try {
    const pointsPerPeso = parseFloat(systemSettings.pointsPerPeso) || 0;
    if (pointsPerPeso === 0) {
      console.log(`[Rebate] pointsPerPeso is 0. Skipping point award for ${userId}.`);
      return;
    }

    const earlyPaymentDays = parseInt(systemSettings.earlyPaymentDaysThreshold, 10) || 7;
    const earlyPaymentBonus = parseInt(systemSettings.earlyPaymentBonusPoints, 10) || 10;

    let pointsToAward = (amountPaid * pointsPerPeso);

    const dueDate = bill.dueDate?.toDate ? bill.dueDate.toDate() : null;
    
    const paymentDate = bill.paymentDate?.toDate 
        ? bill.paymentDate.toDate() 
        : (bill.paymentDate instanceof Date ? bill.paymentDate : (bill.paymentDate?.seconds ? bill.paymentDate.toDate() : new Date()));

    if (dueDate) {
      const daysEarly = (dueDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysEarly >= earlyPaymentDays) {
        pointsToAward += earlyPaymentBonus;
        console.log(`[Rebate] Awarding ${earlyPaymentBonus} early payment bonus to ${userId}.`);
      }
    }

    const roundedPointsToAward = Math.round(pointsToAward);
    if (roundedPointsToAward <= 0) {
      console.log(`[Rebate] No points to award (rounded to ${roundedPointsToAward}) for ${userId}.`);
      return;
    }

    const userProfileRef = dbInstance.doc(`public/data/profiles/${userId}`);
    const userProfileSnap = await userProfileRef.get();
    if (!userProfileSnap.exists()) {
      console.error(`[Rebate] User profile ${userId} not found. Cannot award points.`);
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
      rebateTier: newTier
    };

    const batch = dbInstance.batch();
    batch.update(userProfileRef, updates);
    batch.update(dbInstance.doc(`users/${userId}/profile/data`), updates); 
    
    await batch.commit();
    console.log(`[Rebate] Awarded ${roundedPointsToAward} points to ${userId}. New total: ${newTotalPoints}`);
  } catch (error) {
    console.error(`[Rebate] Failed to award rebate points to ${userId}:`, error);
  }
}

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

  if (!servicesInitialized || !db || !stripe) {
    console.error("Services not initialized. Check environment variables.");
    return res.status(500).json({ error: 'Server configuration error. Check logs.' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required.' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not successful.' });
    }

    const { billId, userId, amount } = session.metadata;
    const amountPaid = parseFloat(session.amount_total / 100);

    if (!billId || !userId) {
      return res.status(400).json({ error: 'Missing metadata in Stripe session.' });
    }
    
    const billRef = db.doc(`public/data/all_bills/${billId}`);
    const billSnap = await billRef.get();
    if (!billSnap.exists) {
      return res.status(404).json({ error: 'Bill not found.' });
    }
    const billData = billSnap.data();

    if (billData.status === 'Paid') {
      console.log(`[Stripe] Bill ${billId} already paid. Skipping update.`);
      return res.status(200).json({ 
        success: true, 
        message: 'Bill already marked as paid.',
        paymentDetails: {
          billId: billId,
          amountPaid: billData.amountPaid,
          paymentMethod: billData.paymentMethod,
          paymentReference: billData.paymentReference
        }
      });
    }

    const paymentDate = new Date();
    const paymentTimestamp = admin.firestore.Timestamp.fromDate(paymentDate);
    
    const billUpdates = {
      status: 'Paid',
      paymentDate: paymentDate,
      paymentTimestamp: paymentTimestamp,
      amountPaid: amountPaid,
      paymentMethod: 'Stripe',
      paymentReference: session.payment_intent || session.id,
      lastUpdatedAt: admin.firestore.serverTimestamp()
    };
    
    await billRef.update(billUpdates);
    console.log(`[Stripe] Bill ${billId} successfully marked as PAID.`);

    const settingsSnap = await db.doc('public/data/system_config/settings').get();
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};

    const finalBillData = { ...billData, ...billUpdates };
    await awardRebatePoints(db, userId, finalBillData, amountPaid, settings);

    return res.status(200).json({ 
      success: true,
      paymentDetails: {
          billId: billId,
          amountPaid: amountPaid,
          paymentMethod: 'Stripe',
          paymentReference: billUpdates.paymentReference
      }
    });

  } catch (error) {
    console.error('Error verifying Stripe payment:', error);
    return res.status(500).json({ error: 'An internal server error occurred during payment verification.' });
  }
}