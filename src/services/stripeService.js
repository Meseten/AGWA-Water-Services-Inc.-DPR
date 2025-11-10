import { loadStripe } from '@stripe/stripe-js';
import { getAuth } from 'firebase/auth';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export const getStripe = () => stripePromise;

export const createCheckoutSession = async (
  billId,
  amount,
  userEmail,
  userId,
  accountNumber
) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated.');
    }

    const token = await user.getIdToken();
    const amountInCents = Math.round(amount * 100);

    const successUrl = `${window.location.origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${window.location.origin}/?payment=cancel`;

    const response = await fetch('/api/createStripeCheckoutSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        billId: billId,
        amount: amountInCents,
        userEmail: userEmail,
        userId: userId,
        accountNumber: accountNumber,
        successUrl: successUrl,
        cancelUrl: cancelUrl,
      }),
    });

    if (!response.ok) {
      let errorText = `API Error: ${response.statusText}`;
      try {
        const errorBody = await response.json();
        errorText = errorBody.error || 'Failed to create session from API';
      } catch (e) {
        errorText = `API route returned an invalid or empty response. Status: ${response.status}.`;
      }
      throw new Error(errorText);
    }

    const data = await response.json();

    if (!data || !data.sessionUrl) {
      throw new Error('Invalid response from checkout session API. Missing sessionUrl.');
    }

    return data.sessionUrl;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new Error(error.message || 'Could not connect to payment service.');
  }
};