#!/bin/sh
# Anchor 1.2 defaults to SBPF v3, which devnet and LiteSVM do not load yet. Build for v0.
set -e
cd "$(dirname "$0")/.."
ANCHOR_BUILD_SBF_ARCH=v0 anchor build "$@"
