#!/usr/bin/env bash
set -euo pipefail

PYTHON_BIN="${PYTHON_BIN:-python3}"
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$PYTHON_BIN" -m pip install -r "$PLUGIN_DIR/requirements.txt"

cat <<'MSG'
Python database client packages installed.

For SQL Server, pyodbc also requires an OS-level ODBC driver.
Install Microsoft ODBC Driver 18 or another compatible SQL Server ODBC driver
on the machine that runs AXE-Anchor's builder.py --serve process.
MSG
