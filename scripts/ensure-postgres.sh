#!/usr/bin/env bash
set -euo pipefail

# Prefer Docker Compose when the daemon can pull/run images.
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if docker compose -f packages/db/docker-compose.yml up -d; then
    echo "Postgres via Docker Compose"
    exit 0
  fi
  echo "Docker Compose failed; falling back to system PostgreSQL"
fi

if command -v pg_isready >/dev/null 2>&1; then
  if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    sudo -u postgres /usr/lib/postgresql/*/bin/pg_ctl -D /var/lib/postgresql/*/main -l /tmp/pg.log start || true
    sudo service postgresql start || true
  fi
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='personal-os'" | grep -q 1 \
    || sudo -u postgres psql -c 'CREATE DATABASE "personal-os";'
  echo "Postgres via system service"
  exit 0
fi

echo "No Postgres available. Install Docker or postgresql." >&2
exit 1
