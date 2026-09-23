#!/usr/bin/env bash
# Runs `terraform init -backend=false` and `terraform validate` on every lab,
# plus a formatting check (lab 03 is intentionally unformatted and skipped for fmt).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0

for lab in "$ROOT"/lessons/*/lab; do
  name="${lab#"$ROOT"/}"
  echo "==> $name"

  if [[ "$name" != *"03-core-workflow"* ]]; then
    if ! terraform -chdir="$lab" fmt -check -recursive >/dev/null; then
      echo "   fmt: FAIL (run: terraform -chdir=$name fmt -recursive)"
      FAILED=1
    else
      echo "   fmt: ok"
    fi
  fi

  if terraform -chdir="$lab" init -backend=false -input=false >/dev/null \
     && terraform -chdir="$lab" validate -no-color >/dev/null; then
    echo "   validate: ok"
  else
    echo "   validate: FAIL"
    FAILED=1
  fi
done

exit "$FAILED"
