-- Campaign delivery tracking + optional send account
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS whatsapp_account_id TEXT;

ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS wa_message_id TEXT;

CREATE INDEX IF NOT EXISTS campaign_recipients_wa_message_id_idx
  ON campaign_recipients (wa_message_id)
  WHERE wa_message_id IS NOT NULL;
