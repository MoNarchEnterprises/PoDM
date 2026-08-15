CREATE TABLE IF NOT EXISTS payment_intents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_intent_id text NOT NULL UNIQUE,
    fan_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    transaction_type text NOT NULL CHECK (transaction_type IN ('Tip', 'PPV Message', 'PPV Post', 'Subscription')),
    related_id text,
    amount_in_cents integer NOT NULL CHECK (amount_in_cents > 0),
    blockchain_tx_hash text UNIQUE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    verified_at timestamptz
);

CREATE INDEX IF NOT EXISTS payment_intents_pending_idx ON payment_intents (status, created_at);
