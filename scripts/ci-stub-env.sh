#!/usr/bin/env bash
# Generate minimal env stubs so varlock/codegen and builds work in CI
# without real secrets. Values meet schema constraints only.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$ROOT/apps/web" "$ROOT/apps/server"

cat >"$ROOT/apps/web/.env" <<'EOF'
NODE_ENV=production
VITE_SERVER_URL=http://localhost:3000
EOF

cat >"$ROOT/apps/server/.env" <<'EOF'
NODE_ENV=production
BETTER_AUTH_SECRET=ci-better-auth-secret-min-32-chars!!
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
GOOGLE_GENERATIVE_AI_API_KEY=ci-google-generative-ai-key
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/personal-os
INTEGRATION_ENCRYPTION_KEY=ci-integration-encryption-key-32b
EOF

echo "CI stub env written for apps/web and apps/server"
