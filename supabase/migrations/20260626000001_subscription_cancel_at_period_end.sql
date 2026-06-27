-- Subscription cancel-at-period-end (Razorpay cancel_at_cycle_end)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;
