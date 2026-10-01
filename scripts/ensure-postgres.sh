#!/usr/bin/env bash
set -euo pipefail

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-password}"
PGDATABASE="${PGDATABASE:-personal-os}"
export PGPASSWORD

psql_tcp() {
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$@"
}

# Prefer Docker Compose when the daemon can pull/run images.
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if docker compose -f packages/db/docker-compose.yml up -d; then
    echo "Postgres via Docker Compose"
    exit 0
  fi
  echo "Docker Compose failed; falling back to system PostgreSQL"
fi

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "No Postgres available. Install Docker or postgresql." >&2
  exit 1
fi

if ! pg_isready -h "$PGHOST" -p "$PGPORT" >/dev/null 2>&1; then
  sudo service postgresql start || true
fi

# Prefer peer auth for local postgres superuser so bootstrap is non-interactive.
if sudo test -f /etc/postgresql/16/main/pg_hba.conf; then
  HBA=/etc/postgresql/16/main/pg_hba.conf
  if ! sudo grep -qE '^local\s+all\s+postgres\s+peer' "$HBA"; then
    sudo sed -i 's/^local\s\+all\s\+postgres\s\+.*/local all postgres peer/' "$HBA" || true
    sudo service postgresql reload || sudo service postgresql restart || true
  fi
  sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${PGPASSWORD}';" >/dev/null
fi

psql_tcp -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='${PGDATABASE}'" | grep -q 1 \
  || psql_tcp -d postgres -c "CREATE DATABASE \"${PGDATABASE}\";"

echo "Postgres via system service"
