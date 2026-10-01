#!/usr/bin/env bash
# Apply main branch protection for PersonalOS (public repo).
# Requires admin rights on the repository (run with your user `gh auth`).
# Cloud-agent tokens are typically read-only and cannot apply this.
set -euo pipefail

OWNER="${GITHUB_REPOSITORY_OWNER:-joao-coimbra}"
REPO="${GITHUB_REPOSITORY_NAME:-personal-os}"
BRANCH="${PROTECTED_BRANCH:-main}"
RULESET_NAME="Protect ${BRANCH}"

echo "Applying protection on ${OWNER}/${REPO}@${BRANCH}"
echo "Required status checks: web, server"

EXISTING_ID="$(
  gh api "repos/${OWNER}/${REPO}/rulesets" --jq \
    --arg name "$RULESET_NAME" \
    '.[] | select(.name == $name) | .id' 2>/dev/null | head -n1 || true
)"

PAYLOAD="$(
  cat <<EOF
{
  "name": "${RULESET_NAME}",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/${BRANCH}"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "web" },
          { "context": "server" }
        ]
      }
    },
    { "type": "deletion" },
    { "type": "non_fast_forward" }
  ],
  "bypass_actors": []
}
EOF
)"

if [[ -n "${EXISTING_ID}" ]]; then
  echo "Updating existing ruleset id=${EXISTING_ID}"
  echo "${PAYLOAD}" | gh api --method PUT "repos/${OWNER}/${REPO}/rulesets/${EXISTING_ID}" --input -
  echo "Ruleset updated."
  exit 0
fi

if echo "${PAYLOAD}" | gh api --method POST "repos/${OWNER}/${REPO}/rulesets" --input -; then
  echo "Ruleset created."
  exit 0
fi

echo "Ruleset API failed; trying classic branch protection…"

gh api \
  --method PUT \
  "repos/${OWNER}/${REPO}/branches/${BRANCH}/protection" \
  -H "Accept: application/vnd.github+json" \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["web", "server"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": false
}
EOF

echo "Classic branch protection applied."
