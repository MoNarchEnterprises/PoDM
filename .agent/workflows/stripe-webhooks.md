---
description: How to test Stripe webhooks locally
---

# Testing Stripe Webhooks Locally

## Prerequisites
- Stripe CLI installed (`stripe --version` to verify)
- Stripe account authenticated (`stripe login`)
- Backend server running on `http://localhost:5000`

## Step 1: Start Your Backend Server

```bash
cd PoDM_project
npm run dev:server
```

Your backend should be running and listening for webhook events at:
- `http://localhost:5000/api/v1/webhooks/stripe`

## Step 2: Start Stripe Webhook Forwarding

In a **new terminal window**, run:

```bash
stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe
```

This command will:
1. Create a webhook endpoint in test mode
2. Forward all Stripe events to your local backend
3. Display a **webhook signing secret** (starts with `whsec_...`)

**Important**: Copy the webhook signing secret that's displayed!

## Step 3: Update Your Environment Variables

Add the webhook signing secret to your `.env` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

Then restart your backend server to pick up the new environment variable.

## Step 4: Test Webhook Events

### Trigger Test Events

You can trigger test events using the Stripe CLI:

```bash
# Test a successful payment
stripe trigger payment_intent.succeeded

# Test a subscription created
stripe trigger customer.subscription.created

# Test a subscription updated
stripe trigger customer.subscription.updated

# Test a subscription deleted
stripe trigger customer.subscription.deleted

# Test a checkout session completed
stripe trigger checkout.session.completed
```

### Monitor Events

The `stripe listen` terminal will show all events being forwarded:
- ✅ Green checkmarks = Successfully processed
- ❌ Red X's = Failed to process

Check your backend logs to see how your webhook handler processes each event.

## Common Webhook Events in PoDM

| Event | Description | Handler Location |
|-------|-------------|------------------|
| `checkout.session.completed` | User completed subscription checkout | `webhookController.ts` |
| `customer.subscription.updated` | Subscription tier changed | `webhookController.ts` |
| `customer.subscription.deleted` | Subscription cancelled | `webhookController.ts` |
| `payment_intent.succeeded` | Payment successful (tips, PPV) | `webhookController.ts` |
| `payment_intent.payment_failed` | Payment failed | `webhookController.ts` |

## Troubleshooting

### "Connection refused" error
- Make sure your backend is running on port 5000
- Check that the webhook endpoint path is correct

### "Webhook signature verification failed"
- Ensure `STRIPE_WEBHOOK_SECRET` is set correctly in `.env`
- Restart your backend after updating `.env`

### Events not appearing
- Check that `stripe listen` is still running
- Verify the forward-to URL matches your backend endpoint

## Production Webhooks

For production, you'll need to:
1. Configure webhooks in the Stripe Dashboard
2. Add your production webhook endpoint URL
3. Use the production webhook signing secret
4. Deploy your backend to a publicly accessible URL

## Useful Commands

```bash
# View recent events
stripe events list

# Get details of a specific event
stripe events retrieve evt_xxxxxxxxxxxxx

# Resend an event to your webhook
stripe events resend evt_xxxxxxxxxxxxx
```
