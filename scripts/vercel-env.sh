#!/usr/bin/env bash
# Pushes the app's environment variables from .env.local to all three Vercel targets.

set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.local"
VARS=(
  NEXT_PUBLIC_SANITY_PROJECT_ID
  NEXT_PUBLIC_SANITY_DATASET
  NEXT_PUBLIC_SANITY_API_VERSION
  SANITY_API_READ_TOKEN
  DATABASE_URL
  NEXT_PUBLIC_SITE_URL
  PAYSTACK_SECRET_KEY
  SANITY_API_WRITE_TOKEN
)
TARGETS=(production preview development)

FORCE=0
[[ "${1:-}" == "--force" ]] && FORCE=1

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No $ENV_FILE. Copy .env.local.example and fill it in first." >&2
  exit 1
fi

vercel() { pnpm exec vercel "$@"; }

for name in "${VARS[@]}"; do
  value="$(grep -E "^${name}=" "$ENV_FILE" | head -1 | cut -d= -f2- || true)"

  if [[ -z "$value" ]]; then
    echo "skip   $name — empty in $ENV_FILE"
    continue
  fi

  for target in "${TARGETS[@]}"; do
    if [[ $FORCE -eq 1 ]]; then
      vercel env rm "$name" "$target" --yes >/dev/null 2>&1 || true
    fi

    if printf '%s' "$value" | vercel env add "$name" "$target" >/dev/null 2>&1; then
      echo "added  $name → $target"
    else
      echo "exists $name → $target (use --force to replace)"
    fi
  done
done

echo
echo "Now on Vercel:"
vercel env ls
