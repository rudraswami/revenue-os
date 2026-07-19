-- Campaign reply attribution (Phase B revenue loop)
ALTER TABLE "campaigns" ADD COLUMN "replyCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "campaign_recipients" ADD COLUMN "repliedAt" TIMESTAMP(3);
ALTER TABLE "campaign_recipients" ADD COLUMN "conversationId" TEXT;
ALTER TABLE "campaign_recipients" ADD COLUMN "replyMessageId" TEXT;

CREATE INDEX "campaign_recipients_campaignId_phone_idx" ON "campaign_recipients"("campaignId", "phone");
CREATE INDEX "campaign_recipients_conversationId_idx" ON "campaign_recipients"("conversationId");
