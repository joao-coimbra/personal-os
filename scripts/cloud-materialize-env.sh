#!/usr/bin/env bash
set -euo pipefail

# Materialize gitignored .env files from Cloud Agent secrets / generated defaults.
# Safe to re-run; does not overwrite existing non-empty values in target files.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Classic Trello /1/authorize requires a 32-character hex Power-Up API key.
# Atlassian OAuth client IDs (mixed alphanumeric) must never be written to .env.
is_trello_powerup_api_key() {
  [[ "$1" =~ ^[0-9a-fA-F]{32}$ ]]
}

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

# Upsert TRELLO_API_KEY only when the candidate is a classic 32-hex Power-Up key.
# If a valid hex secret is provided and .env still has an Atlassian-style key, replace it.
upsert_trello_api_key() {
  local file="$1"
  local value="$2"
  mkdir -p "$(dirname "$file")"
  touch "$file"

  local current=""
  if grep -q "^TRELLO_API_KEY=" "$file" 2>/dev/null; then
    current="$(grep "^TRELLO_API_KEY=" "$file" | head -1 | cut -d= -f2-)"
  fi

  if [[ -n "${value}" ]] && ! is_trello_powerup_api_key "${value}"; then
    echo "warn: skipping TRELLO_API_KEY materialize — value is not a classic 32-hex Power-Up key from https://trello.com/power-ups/admin (got non-hex / Atlassian-style id). Leaving existing .env value unchanged." >&2
    return 0
  fi

  if [[ -n "${current}" ]] && is_trello_powerup_api_key "${current}"; then
    # Keep a valid existing key unless we have a different valid hex to write and current is empty (handled above).
    return 0
  fi

  if [[ -z "${value}" ]]; then
    if [[ -n "${current}" ]] && ! is_trello_powerup_api_key "${current}"; then
      echo "warn: apps/server/.env TRELLO_API_KEY is set but is not a classic 32-hex Power-Up key; Connect Trello will fail until replaced." >&2
    fi
    return 0
  fi

  # Valid hex secret provided: clear invalid/empty existing key and write the new one.
  if grep -q "^TRELLO_API_KEY=" "$file" 2>/dev/null; then
    # shellcheck disable=SC2094
    grep -v "^TRELLO_API_KEY=" "$file" >"${file}.tmp" || true
    mv "${file}.tmp" "$file"
  fi
  printf 'TRELLO_API_KEY=%s\n' "$value" >>"$file"
  if [[ -n "${current}" ]] && ! is_trello_powerup_api_key "${current}"; then
    echo "warn: replaced invalid (non-hex) TRELLO_API_KEY in ${file} with classic Power-Up hex key from secrets." >&2
  fi
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
upsert_trello_api_key "${SERVER_ENV}" "${TRELLO_API_KEY:-}"
upsert_env "${SERVER_ENV}" "TRELLO_API_SECRET" "${TRELLO_API_SECRET:-}"
upsert_env "${SERVER_ENV}" "RESEND_API_KEY" "${RESEND_API_KEY:-}"
upsert_env "${SERVER_ENV}" "RESEND_FROM_EMAIL" "${RESEND_FROM_EMAIL:-}"

upsert_env "${WEB_ENV}" "NODE_ENV" "${NODE_ENV:-development}"
upsert_env "${WEB_ENV}" "VITE_SERVER_URL" "${DEFAULT_WEB_SERVER_URL}"
upsert_env "${WEB_ENV_LOCAL}" "REUI_LICENSE_KEY" "${REUI_LICENSE_KEY:-}"

echo "Materialized Cloud Agent env files"
