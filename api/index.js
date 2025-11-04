const functions = require("firebase-functions");
const stripe = require("stripe")(functions.config().stripe.secret_key);
const cors = require("cors")({ origin: true });

exports.createStripeCheckoutSession = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { billId, amount, userEmail, userId, accountNumber, successUrl, cancelUrl } = req.body.data;

    if (!amount || !successUrl || !cancelUrl || !billId || !userId) {
        console.error("Missing required payment data.");
        return res.status(400).send({ data: { error: "Missing required data." } });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "php",
              product_data: {
                name: `AGWA Bill Payment (${accountNumber || "N/A"})`,
                description: `Bill ID: ${billId}`,
              },
              unit_amount: amount, 
            },
            quantity: 1,
          },
        ],
        customer_email: userEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          billId: billId,
          userId: userId,
          accountNumber: accountNumber,
        },
      });

      return res.status(200).send({ data: { sessionId: session.id } });

    } catch (error) {
      console.error("Stripe session creation error:", error);
      return res.status(500).send({ data: { error: error.message } });
    }
  });
});