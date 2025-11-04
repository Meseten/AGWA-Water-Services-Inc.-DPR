import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const firebaseConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export const config = {
  api: {
    bodyParser: false,
  },
};

const awardRebatePoints = async (
  userId,
  bill,
  amountPaid,
  systemSettings
) => {
  if (!systemSettings?.isRebateProgramEnabled || !userId) return;
  try {
    const pointsPerPeso = parseFloat(systemSettings.pointsPerPeso) || 0;
    const earlyPaymentDays =
      parseInt(systemSettings.earlyPaymentDaysThreshold, 10) || 7;
    const earlyPaymentBonus =
      parseInt(systemSettings.earlyPaymentBonusPoints, 10) || 10;

    let pointsToAward = amountPaid * pointsPerPeso;
    const dueDate = bill.dueDate?.toDate ? bill.dueDate.toDate() : null;
    const paymentDate = new Date();
    if (dueDate) {
      const daysEarly =
        (dueDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysEarly >= earlyPaymentDays) {
        pointsToAward += earlyPaymentBonus;
      }
    }
    const roundedPointsToAward = Math.round(pointsToAward);
    if (roundedPointsToAward <= 0) return;

    const userProfileRef = db
      .collection('public')
      .doc('data')
      .collection('profiles')
      .doc(userId);
    const userProfileSnap = await userProfileRef.get();
    if (!userProfileSnap.exists) return;

    const currentPoints = userProfileSnap.data().rebatePoints || 0;
    const newTotalPoints = currentPoints + roundedPointsToAward;
    let newTier = 'Bronze';
    if (newTotalPoints >= 3000) newTier = 'Platinum';
    else if (newTotalPoints >= 1500) newTier = 'Gold';
    else if (newTotalPoints >= 500) newTier = 'Silver';
    const updates = { rebatePoints: newTotalPoints, rebateTier: newTier };
    const batch = db.batch();
    batch.update(userProfileRef, updates);
    batch.update(
      db.collection('users').doc(userId).collection('profile').doc('data'),
      updates
    );
    await batch.commit();
  } catch (error) {
    console.error(`Failed to award rebate points for ${userId}:`, error);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { billId, userId, accountNumber } = session.metadata;
    const amountPaidInPHP = session.amount_total / 100;

    try {
      const billRef = db
        .collection('public')
        .doc('data')
        .collection('all_bills')
        .doc(billId);
      const billSnap = await billRef.get();
      if (!billSnap.exists) {
        throw new Error(`Bill ${billId} not found.`);
      }
      const bill = billSnap.data();

      await billRef.update({
        status: 'Paid',
        paymentDate: Timestamp.now(),
        paymentTimestamp: Timestamp.now(),
        amountPaid: amountPaidInPHP,
        paymentMethod: session.payment_method_types[0] || 'Stripe',
        paymentReference: session.payment_intent,
      });

      const settingsSnap = await db
        .collection('public')
        .doc('data')
        .collection('system_config')
        .doc('settings')
        .get();
      const settings = settingsSnap.exists() ? settingsSnap.data() : {};
      await awardRebatePoints(userId, bill, amountPaidInPHP, settings);
    } catch (error) {
      console.error('Webhook bill update error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }

  return res.status(200).json({ received: true });
}