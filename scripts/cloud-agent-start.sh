#!/usr/bin/env bash
# Cloud Agent start: Postgres + env + schema + monorepo dev servers.
# Must work on main even when optional scripts/ helpers are absent.
set -euo pipefail

export PATH="$HOME/.bun/bin:$PATH"

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-password}"
PGDATABASE="${PGDATABASE:-personal-os}"
export PGPASSWORD

if [[ -f scripts/ensure-postgres.sh ]]; then
  bash scripts/ensure-postgres.sh
else
  sudo service postgresql start || true
  if sudo test -f /etc/postgresql/16/main/pg_hba.conf; then
    HBA=/etc/postgresql/16/main/pg_hba.conf
    if ! sudo grep -qE '^local[[:space:]]+all[[:space:]]+postgres[[:space:]]+peer' "$HBA"; then
      sudo sed -i 's/^local[[:space:]]\+all[[:space:]]\+postgres[[:space:]]\+.*/local all postgres peer/' "$HBA" || true
      sudo service postgresql reload || sudo service postgresql restart || true
    fi
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${PGPASSWORD}';" >/dev/null || true
  fi
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if pg_isready -h "$PGHOST" -p "$PGPORT" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='${PGDATABASE}'" | grep -q 1 \
    || psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "CREATE DATABASE \"${PGDATABASE}\";"
fi

if [[ -f scripts/cloud-materialize-env.sh ]]; then
  bash scripts/cloud-materialize-env.sh
else
  SERVER_ENV=apps/server/.env
  WEB_ENV=apps/web/.env
  mkdir -p apps/server apps/web
  touch "$SERVER_ENV" "$WEB_ENV"
  upsert() {
    local file="$1" key="$2" value="$3"
    [[ -z "$value" ]] && return 0
    if grep -q "^${key}=" "$file" 2>/dev/null; then
      local current
      current="$(grep "^${key}=" "$file" | head -1 | cut -d= -f2-)"
      [[ -n "$current" ]] && return 0
      grep -v "^${key}=" "$file" >"${file}.tmp" || true
      mv "${file}.tmp" "$file"
    fi
    printf '%s=%s\n' "$key" "$value" >>"$file"
  }
  AUTH_SECRET="${BETTER_AUTH_SECRET:-$(openssl rand -hex 32)}"
  INTEGRATION_KEY="${INTEGRATION_ENCRYPTION_KEY:-$(openssl rand -hex 32)}"
  upsert "$SERVER_ENV" NODE_ENV "${NODE_ENV:-development}"
  upsert "$SERVER_ENV" BETTER_AUTH_SECRET "$AUTH_SECRET"
  upsert "$SERVER_ENV" INTEGRATION_ENCRYPTION_KEY "$INTEGRATION_KEY"
  upsert "$SERVER_ENV" DATABASE_URL "${DATABASE_URL:-postgresql://postgres:password@127.0.0.1:5432/personal-os}"
  upsert "$SERVER_ENV" BETTER_AUTH_URL "${BETTER_AUTH_URL:-http://localhost:3000}"
  upsert "$SERVER_ENV" CORS_ORIGIN "${CORS_ORIGIN:-http://localhost:3001}"
  upsert "$SERVER_ENV" GOOGLE_GENERATIVE_AI_API_KEY "${GOOGLE_GENERATIVE_AI_API_KEY:-}"
  upsert "$SERVER_ENV" GOOGLE_CLIENT_ID "${GOOGLE_CLIENT_ID:-}"
  upsert "$SERVER_ENV" GOOGLE_CLIENT_SECRET "${GOOGLE_CLIENT_SECRET:-}"
  upsert "$SERVER_ENV" GITHUB_CLIENT_ID "${GITHUB_CLIENT_ID:-}"
  upsert "$SERVER_ENV" GITHUB_CLIENT_SECRET "${GITHUB_CLIENT_SECRET:-}"
  upsert "$SERVER_ENV" NOTION_CLIENT_ID "${NOTION_CLIENT_ID:-}"
  upsert "$SERVER_ENV" NOTION_CLIENT_SECRET "${NOTION_CLIENT_SECRET:-}"
  upsert "$SERVER_ENV" TRELLO_API_KEY "${TRELLO_API_KEY:-}"
  upsert "$SERVER_ENV" TRELLO_API_SECRET "${TRELLO_API_SECRET:-}"
  upsert "$SERVER_ENV" RESEND_API_KEY "${RESEND_API_KEY:-}"
  upsert "$SERVER_ENV" RESEND_FROM_EMAIL "${RESEND_FROM_EMAIL:-}"
  upsert "$WEB_ENV" NODE_ENV "${NODE_ENV:-development}"
  upsert "$WEB_ENV" VITE_SERVER_URL "${VITE_SERVER_URL:-http://localhost:3000}"
  if [[ -n "${REUI_LICENSE_KEY:-}" ]]; then
    printf 'REUI_LICENSE_KEY=%s\n' "$REUI_LICENSE_KEY" >apps/web/.env.local
  fi
fi

(
  cd packages/db
  DATABASE_URL="${DATABASE_URL:-postgresql://postgres:password@127.0.0.1:5432/personal-os}" \
    bun x drizzle-kit push --force
)

exec bun run dev
