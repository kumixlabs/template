#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Searching for packages..."

# Get all package.json files except those in node_modules
PACKAGES=$(find packages -name package.json -not -path "*/node_modules/*")

# Track packages that fail to publish so we can surface a non-zero exit at the
# end without aborting the loop early (other packages should still get a chance).
failed=()

for pkg in $PACKAGES; do
  dir=$(dirname "$pkg")

  echo "📦 Publishing: $dir"

  (
    cd "$dir"

    # Skip if private: true
    if grep -q '"private": *true' package.json; then
      echo "⏭ Skipping private package: $dir"
      exit 0
    fi

    bun publish
  ) || failed+=("$dir")
done

echo "🏷 Creating tag(s) with Changesets..."
changeset tag

if [ ${#failed[@]} -gt 0 ]; then
  echo "❌ Publishing failed for:" >&2
  printf '  - %s\n' "${failed[@]}" >&2
  exit 1
fi

echo "✅ Done!"
