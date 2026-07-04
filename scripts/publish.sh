#!/usr/bin/env bash
set -e

echo "🔍 Searching for packages..."

# Get all package.json files except those in node_modules
PACKAGES=$(find packages -name package.json -not -path "*/node_modules/*")

FAILED=()

for pkg in $PACKAGES; do
  dir=$(dirname "$pkg")

  # Skip if private: true
  if grep -q '"private": *true' "$pkg"; then
    echo "⏭ Skipping private package: $dir"
    continue
  fi

  echo "📦 Publishing: $dir"

  if ! (cd "$dir" && bun publish); then
    echo "❌ Failed to publish: $dir"
    FAILED+=("$dir")
  fi
done

if [ ${#FAILED[@]} -ne 0 ]; then
  echo "🛑 Publish failed for: ${FAILED[*]}"
  exit 1
fi

echo "🏷 Creating tag(s) with Changesets..."
changeset tag

echo "✅ Done!"
