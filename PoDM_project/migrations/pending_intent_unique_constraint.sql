CREATE UNIQUE INDEX IF NOT EXISTS pending_intent_unique_idx ON payment_intents (fan_id, related_id, transaction_type) WHERE status = 'pending';
