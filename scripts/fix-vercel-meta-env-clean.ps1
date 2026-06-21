# Re-write Meta-related Vercel env vars WITHOUT literal \r\n garbage (Windows CLI quirk).
# Run from repo root. Requires vercel CLI logged in.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $root "apps\api"

function Set-CleanVercelEnv {
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
  # Pipe exact bytes — no trailing newline from echo
  $Value | node -e "process.stdin.on('data',d=>process.stdout.write(String(d).trimEnd()))" | vercel env add $Name $Environment
  Write-Host "  OK $Name"
  Pop-Location
}

Write-Host "Cleaning revenue-os-api production Meta env..."
Set-CleanVercelEnv $apiDir "META_APP_ID" "1694805491426991"
Set-CleanVercelEnv $apiDir "META_EMBEDDED_SIGNUP_CONFIG_ID" "1331710591627115"
Set-CleanVercelEnv $apiDir "WHATSAPP_EMBEDDED_SIGNUP_LIVE" "true"
Set-CleanVercelEnv $apiDir "WHATSAPP_API_VERSION" "v21.0"
Set-CleanVercelEnv $apiDir "WEBHOOK_PUBLIC_URL" "https://api.growvisi.in"
Set-CleanVercelEnv $apiDir "NEXT_PUBLIC_APP_URL" "https://www.growvisi.in"
Set-CleanVercelEnv $apiDir "CORS_ORIGINS" "https://growvisi.in,https://www.growvisi.in"
Set-CleanVercelEnv $apiDir "WHATSAPP_VERIFY_TOKEN" "growvisi-webhook-verify-2026"
Write-Host "Cleaning revenue-os-web production Meta env..."
$webDir = Join-Path $root "apps\web"
Set-CleanVercelEnv $webDir "NEXT_PUBLIC_APP_URL" "https://www.growvisi.in"
Set-CleanVercelEnv $webDir "NEXT_PUBLIC_API_URL" "https://api.growvisi.in/api/v1"
Set-CleanVercelEnv $webDir "NEXT_PUBLIC_WS_URL" "wss://api.growvisi.in"
Set-CleanVercelEnv $webDir "NEXT_PUBLIC_META_APP_ID" "1694805491426991"
Set-CleanVercelEnv $webDir "NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID" "1331710591627115"

Write-Host "Done. Redeploy API + Web."
