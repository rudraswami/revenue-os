-- Won reason on leads (mirror lostReason for revenue reporting)
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "wonReason" TEXT;
