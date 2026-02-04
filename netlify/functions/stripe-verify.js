/**
 * Stripe Checkout Session Verification
 * Verifies that a Stripe Checkout Session is paid and valid before unlocking
 */

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false })
    };
  }

  try {
    const { session_id } = JSON.parse(event.body || '{}');
    
    if (!session_id || typeof session_id !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false })
      };
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      // Silent failure - no logging of missing key
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false })
      };
    }

    // Verify environment matches (test vs live)
    const isLiveMode = process.env.STRIPE_LIVE_MODE === 'true';
    
    // Call Stripe API to retrieve checkout session
    const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!stripeResponse.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: false })
      };
    }

    const session = await stripeResponse.json();

    // Verify all conditions
    const isPaid = session.payment_status === 'paid';
    const isComplete = session.status === 'complete' || session.payment_status === 'paid';
    const isPaymentMode = session.mode === 'payment';
    const isCorrectAmount = session.amount_total === 999; // £9.99 in pence
    const isCorrectCurrency = session.currency === 'gbp';
    const livemodeMatches = session.livemode === isLiveMode;

    const isValid = isPaid && isComplete && isPaymentMode && isCorrectAmount && isCorrectCurrency && livemodeMatches;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ok: isValid })
    };

  } catch (error) {
    // Silent failure - no error logging
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: false })
    };
  }
};
