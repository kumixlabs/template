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

    # Skip if this version is already on the registry. `npm view` returns
    # non-zero when the package (or version) does not exist yet, so a missing
    # package correctly proceeds to publish. This makes the script idempotent:
    # re-running after a partial publish won't 403 on already-published versions.
    pkg_name=$(node -p "require('./package.json').name")
    local_version=$(node -p "require('./package.json').version")
    published_version=$(npm view "$pkg_name" version 2>/dev/null || echo "")

    if [ -n "$published_version" ] && [ "$local_version" = "$published_version" ]; then
      echo "⏭ Skipping $pkg_name: v$local_version already published"
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
