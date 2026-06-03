# Run on YOUR PC after Supabase + .env are configured
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "`n=== GrowthSync: Local setup ===`n" -ForegroundColor Cyan

# Redis (portable)
$redis = ".\.local\redis\redis-server.exe"
if (Test-Path $redis) {
  Get-Process redis-server -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Process (Resolve-Path $redis) -ArgumentList "--port 6379" -WindowStyle Hidden
  Write-Host "Redis started on port 6379" -ForegroundColor Green
} else {
  Write-Host "Redis not found. Add REDIS_URL from Upstash to .env" -ForegroundColor Yellow
  Write-Host "  https://console.upstash.com" -ForegroundColor Yellow
}

# Link Supabase (IPv4 — fixes 'no such host' on some networks)
Write-Host "`nLinking Supabase project..." -ForegroundColor Cyan
pnpm exec supabase link --project-ref qzeiggsgnruvxbvdesfd

Write-Host "`nPushing Supabase migrations (pgvector)..." -ForegroundColor Cyan
pnpm supabase:push

Write-Host "`nPushing Prisma schema..." -ForegroundColor Cyan
pnpm db:push

Write-Host "`nSeeding demo user..." -ForegroundColor Cyan
pnpm db:seed

Write-Host "`n=== Done ===" -ForegroundColor Green
Write-Host "Run: pnpm dev"
Write-Host "Open: http://localhost:3000"
Write-Host "Login: demo@growthsync.in / demo123456  (org slug: demo-company)`n"
