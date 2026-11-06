#!/usr/bin/env bash
# Lints, type-checks and tests the Edge Functions (Deno). Usage: npm run test:functions
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
command -v deno >/dev/null || { echo "SKIP: deno not installed (brew install deno)"; exit 0; }
cd "$ROOT/supabase/functions"
export NO_COLOR=1
deno lint
deno check ./*/index.ts
deno task test
