# AXE-Anchor - Builder
# ==============================================================================
# Runs a one-shot build. No server, no watch mode.
# Usage: python3 builder.py [--rebuild]
# ==============================================================================

import argparse
import os
import sys

from engine import run_build

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="AXE-Anchor Builder - one-shot build")
    parser.add_argument('--rebuild', action='store_true', help="Force full rebuild, ignoring incremental cache")
    args = parser.parse_args()

    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    print(f"Starting AXE-Anchor build in: {SCRIPT_DIR}")

    report, blocking = run_build(SCRIPT_DIR, force_rebuild=args.rebuild)

    if blocking:
        sys.exit(1)
