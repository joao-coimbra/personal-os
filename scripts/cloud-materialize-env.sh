#!/usr/bin/env bash
set -euo pipefail

# Materialize gitignored .env files from Cloud Agent secrets / generated defaults.
# Safe to re-run; does not overwrite existing non-empty values in target files.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

upsert_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  if [[ -z "${value}" ]]; then
    return 0
  fi
  mkdir -p "$(dirname "$file")"
  touch "$file"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    local current
    current="$(grep "^${key}=" "$file" | head -1 | cut -d= -f2-)"
    if [[ -n "${current}" ]]; then
      return 0
    fi
    # shellcheck disable=SC2094
    grep -v "^${key}=" "$file" >"${file}.tmp" || true
    mv "${file}.tmp" "$file"
  fi
  printf '%s=%s\n' "$key" "$value" >>"$file"
}

rand_hex() {
  openssl rand -hex 32
}

SERVER_ENV="${ROOT}/apps/server/.env"
WEB_ENV="${ROOT}/apps/web/.env"
WEB_ENV_LOCAL="${ROOT}/apps/web/.env.local"

DEFAULT_DATABASE_URL="${DATABASE_URL:-postgresql://postgres:password@127.0.0.1:5432/personal-os}"
DEFAULT_AUTH_URL="${BETTER_AUTH_URL:-http://localhost:3000}"
DEFAULT_CORS="${CORS_ORIGIN:-http://localhost:3001}"
DEFAULT_WEB_SERVER_URL="${VITE_SERVER_URL:-http://localhost:3000}"

BETTER_AUTH_SECRET_VALUE="${BETTER_AUTH_SECRET:-}"
INTEGRATION_KEY_VALUE="${INTEGRATION_ENCRYPTION_KEY:-}"

if [[ -z "${BETTER_AUTH_SECRET_VALUE}" ]]; then
  if [[ -f "${SERVER_ENV}" ]] && grep -q '^BETTER_AUTH_SECRET=.\+' "${SERVER_ENV}"; then
    BETTER_AUTH_SECRET_VALUE="$(grep '^BETTER_AUTH_SECRET=' "${SERVER_ENV}" | head -1 | cut -d= -f2-)"
  else
    BETTER_AUTH_SECRET_VALUE="$(rand_hex)"
  fi
fi

if [[ -z "${INTEGRATION_KEY_VALUE}" ]]; then
  if [[ -f "${SERVER_ENV}" ]] && grep -q '^INTEGRATION_ENCRYPTION_KEY=.\+' "${SERVER_ENV}"; then
    INTEGRATION_KEY_VALUE="$(grep '^INTEGRATION_ENCRYPTION_KEY=' "${SERVER_ENV}" | head -1 | cut -d= -f2-)"
  else
    INTEGRATION_KEY_VALUE="$(rand_hex)"
  fi
fi

upsert_env "${SERVER_ENV}" "NODE_ENV" "${NODE_ENV:-development}"
upsert_env "${SERVER_ENV}" "BETTER_AUTH_SECRET" "${BETTER_AUTH_SECRET_VALUE}"
upsert_env "${SERVER_ENV}" "INTEGRATION_ENCRYPTION_KEY" "${INTEGRATION_KEY_VALUE}"
upsert_env "${SERVER_ENV}" "DATABASE_URL" "${DEFAULT_DATABASE_URL}"
upsert_env "${SERVER_ENV}" "BETTER_AUTH_URL" "${DEFAULT_AUTH_URL}"
upsert_env "${SERVER_ENV}" "CORS_ORIGIN" "${DEFAULT_CORS}"
upsert_env "${SERVER_ENV}" "GOOGLE_GENERATIVE_AI_API_KEY" "${GOOGLE_GENERATIVE_AI_API_KEY:-}"
upsert_env "${SERVER_ENV}" "GOOGLE_CLIENT_ID" "${GOOGLE_CLIENT_ID:-}"
upsert_env "${SERVER_ENV}" "GOOGLE_CLIENT_SECRET" "${GOOGLE_CLIENT_SECRET:-}"
upsert_env "${SERVER_ENV}" "GITHUB_CLIENT_ID" "${GITHUB_CLIENT_ID:-}"
upsert_env "${SERVER_ENV}" "GITHUB_CLIENT_SECRET" "${GITHUB_CLIENT_SECRET:-}"
upsert_env "${SERVER_ENV}" "NOTION_CLIENT_ID" "${NOTION_CLIENT_ID:-}"
upsert_env "${SERVER_ENV}" "NOTION_CLIENT_SECRET" "${NOTION_CLIENT_SECRET:-}"
upsert_env "${SERVER_ENV}" "TRELLO_API_KEY" "${TRELLO_API_KEY:-}"
upsert_env "${SERVER_ENV}" "TRELLO_API_SECRET" "${TRELLO_API_SECRET:-}"
upsert_env "${SERVER_ENV}" "RESEND_API_KEY" "${RESEND_API_KEY:-}"
upsert_env "${SERVER_ENV}" "RESEND_FROM_EMAIL" "${RESEND_FROM_EMAIL:-}"

upsert_env "${WEB_ENV}" "NODE_ENV" "${NODE_ENV:-development}"
upsert_env "${WEB_ENV}" "VITE_SERVER_URL" "${DEFAULT_WEB_SERVER_URL}"
upsert_env "${WEB_ENV_LOCAL}" "REUI_LICENSE_KEY" "${REUI_LICENSE_KEY:-}"

echo "Materialized Cloud Agent env files"
