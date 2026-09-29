#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is not installed. The environment base image must provide Bun 1.3.14." >&2
  exit 1
fi

write_if_missing() {
  local path="$1"
  local contents="$2"
  if [[ -f "$path" ]]; then
    return 0
  fi
  umask 077
  printf '%s\n' "$contents" >"$path"
}

auth_secret="$(openssl rand -base64 32 | tr -d '\n')"
google_key="${GOOGLE_GENERATIVE_AI_API_KEY:-local-dev-placeholder}"

write_if_missing "$ROOT/apps/server/.env" "NODE_ENV=development
BETTER_AUTH_SECRET=${auth_secret}
BETTER_AUTH_URL=http://localhost:3000/api/auth
CORS_ORIGIN=http://localhost:3001
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/personal-os
GOOGLE_GENERATIVE_AI_API_KEY=${google_key}"

write_if_missing "$ROOT/apps/web/.env" "NODE_ENV=development
VITE_SERVER_URL=http://localhost:3000/api"

bun install
