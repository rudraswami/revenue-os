-- Backfill intelligence.automationPreset and seed starter Business Knowledge for empty workspaces.

-- 1) Persist default automation preset where intelligence settings exist but preset was never saved.
UPDATE organizations
SET
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{intelligence}',
    COALESCE(settings->'intelligence', '{}'::jsonb)
      || jsonb_build_object('automationPreset', 'balanced'),
    true
  ),
  "updatedAt" = NOW()
WHERE settings->'intelligence' IS NOT NULL
  AND (
    settings->'intelligence'->>'automationPreset' IS NULL
    OR btrim(settings->'intelligence'->>'automationPreset') = ''
  );

-- 2) Ensure intelligence block exists with defaults for orgs that enabled auto_guarded via partial PATCH.
UPDATE organizations
SET
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{intelligence}',
    jsonb_build_object(
      'replyAutonomy', COALESCE(settings->'intelligence'->>'replyAutonomy', 'assist'),
      'automationPreset', 'balanced'
    ),
    true
  ),
  "updatedAt" = NOW()
WHERE settings->'intelligence'->>'replyAutonomy' = 'auto_guarded'
  AND (
    settings->'intelligence'->>'automationPreset' IS NULL
    OR btrim(settings->'intelligence'->>'automationPreset') = ''
  );

-- 3) Starter pricing knowledge for workspaces with no documents (enables grounded auto-reply).
INSERT INTO knowledge_documents (
  id,
  "organizationId",
  title,
  category,
  "sourceType",
  "rawContent",
  status,
  "createdAt",
  "updatedAt"
)
SELECT
  'kd_mig_' || substr(md5(o.id || ':growvisi-pricing'), 1, 20),
  o.id,
  'Growvisi Pricing & Plans',
  'pricing',
  'migration_starter',
  E'Growvisi — WhatsApp revenue OS for Indian SMBs (1–20 people).\n\n'
    || E'14-day free trial: ₹0, 1 WhatsApp number, 2 team members, up to 500 leads. No credit card.\n\n'
    || E'Starter — ₹999/month: 1 WhatsApp number, 2 team members, up to 3,000 leads/month.\n\n'
    || E'Growth — ₹2,999/month: 3 WhatsApp numbers, 5 team members, AI scoring, guarded auto-replies on WhatsApp.\n\n'
    || E'Pro — ₹5,999/month: up to 50 WhatsApp numbers, 50 team members, agency hub, API access.\n\n'
    || E'Billing: INR via Razorpay. Upgrade or cancel anytime from Dashboard → Settings → Billing.\n\n'
    || E'Product: Growvisi classifies WhatsApp conversations, updates pipeline, drafts or sends grounded replies from your Business Knowledge. Your team always sends sensitive messages; Growvisi never auto-replies on complaints or ungrounded pricing.\n\n'
    || E'Setup: Connect Meta WhatsApp Business API from Dashboard → Connection. Most teams see first classified inbound within 15 minutes.\n\n'
    || E'Support: it@growvisi.com (Mon–Sat IST).',
  'pending',
  NOW(),
  NOW()
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1
  FROM knowledge_documents kd
  WHERE kd."organizationId" = o.id
)
ON CONFLICT (id) DO NOTHING;
