#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Gitignored env files are created by install. Recreate them if a checkout omitted them.
if [[ ! -f "$ROOT/apps/server/.env" || ! -f "$ROOT/apps/web/.env" ]]; then
  bash "$ROOT/.cursor/install.sh"
fi

if ! sudo service docker start; then
  sudo service docker status
fi

ready=0
for _ in $(seq 1 30); do
  if sudo docker info >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "$ready" -ne 1 ]]; then
  echo "Docker daemon did not become ready" >&2
  exit 1
fi

sudo docker compose -f "$ROOT/packages/db/docker-compose.yml" up -d

healthy=0
for _ in $(seq 1 60); do
  status="$(sudo docker inspect --format '{{.State.Health.Status}}' personal-os-postgres 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    healthy=1
    break
  fi
  sleep 2
done

if [[ "$healthy" -ne 1 ]]; then
  echo "Postgres did not become healthy" >&2
  sudo docker compose -f "$ROOT/packages/db/docker-compose.yml" ps
  exit 1
fi

cd "$ROOT/packages/db"
bunx drizzle-kit push --force
