import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
    throw new Error("Stripe Secret Key must be provided in the environment variables.");
}

/**
 * The Stripe client instance.
 * This is the primary object you will use to interact with the Stripe API
 * for creating charges, managing subscriptions, and handling payouts.
 */
const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-07-30.basil', // Always use a specific API version
    typescript: true,
});

export default stripe;