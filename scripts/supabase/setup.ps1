# Revenue OS — Supabase + Upstash setup (Windows)
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")

Set-Location $Root
Write-Host "`n=== Revenue OS: Supabase setup ===`n" -ForegroundColor Cyan

# 1. Ensure .env exists
$envFile = Join-Path $Root ".env"
$envExample = Join-Path $Root ".env.example"
if (-not (Test-Path $envFile)) {
  Copy-Item $envExample $envFile
  Write-Host "Created .env from .env.example" -ForegroundColor Green
} else {
  Write-Host ".env already exists" -ForegroundColor Yellow
}

# 2. Supabase CLI via pnpm
Write-Host "`nChecking Supabase CLI..." -ForegroundColor Cyan
pnpm exec supabase --version

# 3. Login (browser)
Write-Host "`nStep 1: Log in to Supabase (browser will open)" -ForegroundColor Cyan
Write-Host "  Run: pnpm supabase:login`n"
$login = Read-Host "Press Enter to run login now, or type 'skip' to skip"
if ($login -ne "skip") {
  pnpm supabase:login
}

# 4. Link project
Write-Host "`nStep 2: Link your Supabase project" -ForegroundColor Cyan
Write-Host "  Create a project at https://supabase.com/dashboard if needed"
Write-Host "  Run: pnpm supabase:link`n"
$link = Read-Host "Press Enter to link now, or type 'skip' to skip"
if ($link -ne "skip") {
  pnpm supabase:link
}

# 5. Push Supabase migrations (pgvector)
Write-Host "`nStep 3: Push Supabase SQL migrations (pgvector extension)" -ForegroundColor Cyan
$push = Read-Host "Press Enter to run 'pnpm supabase:push', or type 'skip'"
if ($push -ne "skip") {
  pnpm supabase:push
}

# 6. Prisma schema
Write-Host "`nStep 4: Apply Prisma schema to Supabase" -ForegroundColor Cyan
Write-Host "  Ensure .env has DATABASE_URL (pooler) and DIRECT_URL (direct) from:"
Write-Host "  Supabase Dashboard → Project Settings → Database → Connection string`n"
$hasDirect = Select-String -Path $envFile -Pattern "^DIRECT_URL=.+[^[\]]" -Quiet
if (-not $hasDirect) {
  Write-Host "WARNING: DIRECT_URL not set in .env — edit .env before continuing" -ForegroundColor Red
  Read-Host "Press Enter after updating .env"
}

pnpm db:push

# 7. Seed
Write-Host "`nStep 5: Seed demo user" -ForegroundColor Cyan
$seed = Read-Host "Run seed? (Y/n)"
if ($seed -ne "n" -and $seed -ne "N") {
  pnpm db:seed
}

Write-Host "`n=== Setup complete ===" -ForegroundColor Green
Write-Host "  1. Add REDIS_URL from Upstash (https://console.upstash.com) to .env"
Write-Host "  2. pnpm dev"
Write-Host "  3. Open http://localhost:3000"
Write-Host "  4. Login with demo@revenue-os.local / demo123456 (if seeded)`n"
