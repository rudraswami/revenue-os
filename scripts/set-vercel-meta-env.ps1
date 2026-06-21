# Set Growvisi Meta / WhatsApp env on Vercel (production).
# Run from repo root. Requires: vercel CLI logged in.
# META_APP_SECRET: set manually in Vercel dashboard (App settings → Show) if not passed.

param(
  [string]$MetaAppSecret = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $root "apps\api"
$webDir = Join-Path $root "apps\web"

function Set-VercelEnv {
  param(
    [string]$ProjectDir,
    [string]$Name,
    [string]$Value,
    [string]$Environment = "production"
  )
  Push-Location $ProjectDir
  try {
    vercel env rm $Name $Environment --yes 2>$null
  } catch { }
  $Value | vercel env add $Name $Environment
  Write-Host "  OK $([IO.Path]::GetFileName($ProjectDir)) $Name"
  Pop-Location
}

Write-Host "Updating revenue-os-api (production)..."
Set-VercelEnv $apiDir "META_APP_ID" "1694805491426991"
Set-VercelEnv $apiDir "META_EMBEDDED_SIGNUP_CONFIG_ID" "1331710591627115"
Set-VercelEnv $apiDir "WHATSAPP_VERIFY_TOKEN" "growvisi-webhook-verify-2026"
Set-VercelEnv $apiDir "WHATSAPP_API_VERSION" "v21.0"
Set-VercelEnv $apiDir "WEBHOOK_PUBLIC_URL" "https://api.growvisi.in"
Set-VercelEnv $apiDir "NEXT_PUBLIC_APP_URL" "https://www.growvisi.in"
Set-VercelEnv $apiDir "CORS_ORIGINS" "https://growvisi.in,https://www.growvisi.in"
Set-VercelEnv $apiDir "WHATSAPP_EMBEDDED_SIGNUP_LIVE" "true"

if ($MetaAppSecret) {
  Set-VercelEnv $apiDir "META_APP_SECRET" $MetaAppSecret
  Set-VercelEnv $apiDir "WHATSAPP_APP_SECRET" $MetaAppSecret
} else {
  Write-Host "  SKIP META_APP_SECRET / WHATSAPP_APP_SECRET - add in Vercel dashboard (Show on Meta Basic)"
}

Write-Host "Updating revenue-os-web (production)..."
Set-VercelEnv $webDir "NEXT_PUBLIC_APP_URL" "https://www.growvisi.in"
Set-VercelEnv $webDir "NEXT_PUBLIC_API_URL" "https://api.growvisi.in/api/v1"
Set-VercelEnv $webDir "NEXT_PUBLIC_WS_URL" "wss://api.growvisi.in"
Set-VercelEnv $webDir "NEXT_PUBLIC_META_APP_ID" "1694805491426991"
Set-VercelEnv $webDir "NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID" "1331710591627115"

Write-Host "Done. Redeploy API + Web for changes to apply."
