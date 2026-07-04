#!/usr/bin/env bash
set -euo pipefail

# Publish packages via Changesets.
#
# `changeset publish` is registry-aware: it only publishes versions that are
# not already on npm, skips packages marked `"private": true`, and creates the
# corresponding git tags. This is safer than a raw `bun publish` loop, which
# always attempts to publish the current version and fails on re-runs.

echo "📦 Publishing changed packages with Changesets..."
changeset publish

echo "✅ Done!"
