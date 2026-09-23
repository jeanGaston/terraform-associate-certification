#!/usr/bin/env bash
# Imperative equivalent: a list of steps with no knowledge of current state.
# Run it twice and notice it just repeats the work (and appends a duplicate line).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p output
echo "Creating file..."
echo "Hello, imperative world!" >> output/imperative.txt
echo "Done. Contents:"
cat output/imperative.txt
