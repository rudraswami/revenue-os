#!/usr/bin/env bash
# Index pending migration_starter Business Knowledge (no pnpm required).
# Usage:
#   ./scripts/embed-starter-knowledge.sh
#   OPENAI_API_KEY=sk-... DIRECT_URL=postgresql://... ./scripts/embed-starter-knowledge.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

load_env() {
  local file="$1"
  [[ -f "$file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    # Strip Windows CR and leading/trailing whitespace
    line="${line//$'\r'/}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"

    [[ -z "$line" || "$line" == \#* ]] && continue

    # export DATABASE_URL=... or DATABASE_URL=...
    if [[ "$line" =~ ^export[[:space:]]+([^=[:space:]]+)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local val="${BASH_REMATCH[2]}"
    elif [[ "$line" =~ ^([^=[:space:]]+)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local val="${BASH_REMATCH[2]}"
    else
      continue
    fi

    case "$key" in
      DIRECT_URL|DATABASE_URL|OPENAI_API_KEY)
        # Strip optional surrounding quotes
        val="${val%\"}"
        val="${val#\"}"
        val="${val%\'}"
        val="${val#\'}"
        export "$key=$val"
        ;;
    esac
  done <"$file"
}

# Load env files in order; later files override earlier ones.
# Put Supabase DB URLs in supabase.env or .env.supabase.new
ENV_FILES=(
  ".env"
  ".env.supabase"
  ".env.supabase.new"
  "supabase.env"
)

for f in "${ENV_FILES[@]}"; do
  load_env "$f"
done

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "Missing OPENAI_API_KEY. Set it in .env or pass on the command line:"
  echo "  OPENAI_API_KEY=sk-... ./scripts/embed-starter-knowledge.sh"
  exit 1
fi

if [[ -z "${DIRECT_URL:-}" && -z "${DATABASE_URL:-}" ]]; then
  echo "Missing DIRECT_URL or DATABASE_URL."
  echo ""
  echo "Add to one of these files (repo root, no spaces around =):"
  echo "  supabase.env"
  echo "  .env.supabase.new"
  echo "  .env"
  echo ""
  echo "  DIRECT_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"
  echo ""
  echo "Or pass inline:"
  echo "  DIRECT_URL=postgresql://... OPENAI_API_KEY=sk-... ./scripts/embed-starter-knowledge.sh"
  echo ""
  echo "Checked: ${ENV_FILES[*]/#/$ROOT\/}"
  exit 1
fi

NODE=""
for candidate in "$(command -v node 2>/dev/null || true)" \
  "/opt/homebrew/bin/node" \
  "/usr/local/bin/node" \
  "/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node"; do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    NODE="$candidate"
    break
  fi
done

if [[ -z "$NODE" ]]; then
  echo "Node.js not found. Install: brew install node"
  exit 1
fi

echo "Using node: $NODE"
cd apps/api
exec "$NODE" ./node_modules/tsx/dist/cli.mjs scripts/migrate-intelligence-kb-embed.ts
