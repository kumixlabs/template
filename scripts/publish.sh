#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Searching for packages..."

# Get all package.json files except those in node_modules
PACKAGES=$(find packages -name package.json -not -path "*/node_modules/*")

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

    bun publish || true
  )
done

echo "🏷 Creating tag(s) with Changesets..."
changeset tag

echo "✅ Done!"
