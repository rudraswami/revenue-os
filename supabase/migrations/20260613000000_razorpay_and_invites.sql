-- Razorpay billing fields + team invites

ALTER TABLE "subscriptions" RENAME COLUMN "stripeCustomerId" TO "razorpayCustomerId";
ALTER TABLE "subscriptions" RENAME COLUMN "stripeSubId" TO "razorpaySubscriptionId";
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "razorpayPlanId" TEXT;

CREATE TABLE IF NOT EXISTS "organization_invites" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'AGENT',
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_invites_tokenHash_key" ON "organization_invites"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "organization_invites_organizationId_email_key" ON "organization_invites"("organizationId", "email");
CREATE INDEX IF NOT EXISTS "organization_invites_organizationId_idx" ON "organization_invites"("organizationId");

ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
