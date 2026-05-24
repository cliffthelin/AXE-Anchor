# AXE-Anchor - Server
# ==============================================================================
# Starts the local web server. Optionally watches for file changes.
# Usage: python3 server.py [--port 8000] [--watch] [--no-open] [--rebuild]
# ==============================================================================

import argparse
import os
import sys
import time
import threading
import webbrowser
from http.server import HTTPServer
from pathlib import Path

from engine import run_build, BuilderHTTPRequestHandler, _axe_paths, load_json
from engine.constants import SUPPORTED
from engine.paths import get_code_repo_paths, is_system_file, walk_pruned


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="AXE-Anchor Server")
    parser.add_argument('--port', type=int, default=8000, help="Port to run the server on (auto-increments if taken)")
    parser.add_argument('--rebuild', action='store_true', help="Force full rebuild before serving")
    parser.add_argument('--no-watch', action='store_true', help="Disable file watching (watch is on by default)")
    parser.add_argument('--no-open', action='store_true', help="Do not open browser automatically")
    args = parser.parse_args()
    args.watch = not args.no_watch

    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    print(f"Starting AXE-Anchor in: {SCRIPT_DIR}")

    paths = _axe_paths(SCRIPT_DIR)
    config_path = paths["settings"]
    if not os.path.exists(config_path):
        config_path = os.path.join(SCRIPT_DIR, 'settings.json')
    config = load_json(config_path, {})

    # Watch mode
    if args.watch:
        watch_files = {}

        def check_all_files():
            paths_to_watch = []
            code_repo_paths = get_code_repo_paths(config)
            excluded_outputs = {
                config.get("output_index", "index.html").lower(),
                config.get("output_manifest", "manifest.json").lower(),
                config.get("output_validation_report", "validation_report.json").lower(),
                config.get("output_schema_origin_map", "schema-origin-map.json").lower(),
            }

            for cfg in ['settings.json', 'docvault.config.json', 'rules.json', 'docvault.rules.json']:
                p = os.path.join(SCRIPT_DIR, cfg)
                if os.path.exists(p):
                    paths_to_watch.append(p)

            exclude_list = config.get("exclude", [])
            for p in walk_pruned(SCRIPT_DIR, exclude_list):
                if is_system_file(p, SCRIPT_DIR):
                    continue
                name = p.name.lower()
                if name in excluded_outputs or name.endswith('.provenance.json') or name.endswith('.provenance.md'):
                    continue
                if p.suffix.lower() in SUPPORTED:
                    paths_to_watch.append(str(p))

            for repo_path in code_repo_paths:
                repo_dir = Path(SCRIPT_DIR) / repo_path if not os.path.isabs(repo_path) else Path(repo_path)
                if repo_dir.exists():
                    for p in walk_pruned(repo_dir, exclude_list):
                        name = p.name.lower()
                        if name in excluded_outputs or name.endswith('.provenance.json') or name.endswith('.provenance.md'):
                            continue
                        ext = p.suffix.lower()
                        if ext in SUPPORTED or ext in {'.cs', '.sql', '.ts', '.py'}:
                            paths_to_watch.append(str(p))
            return list(set(paths_to_watch))

        for f_path in check_all_files():
            try:
                watch_files[f_path] = os.path.getmtime(f_path)
            except OSError:
                pass

        def watch_thread_func():
            print("[Watch] Started file polling thread...")
            while True:
                time.sleep(1.0)
                try:
                    current_files = check_all_files()
                    changed = False
                    for f_path in current_files:
                        try:
                            mtime = os.path.getmtime(f_path)
                            if f_path not in watch_files or watch_files[f_path] != mtime:
                                print(f"[Watch] File changed: {f_path}")
                                watch_files[f_path] = mtime
                                changed = True
                        except OSError:
                            pass

                    deleted_files = [f for f in watch_files if f not in current_files]
                    if deleted_files:
                        for f in deleted_files:
                            print(f"[Watch] File deleted: {f}")
                            del watch_files[f]
                        changed = True

                    if changed:
                        print("[Watch] Rebuilding...")
                        try:
                            run_build(SCRIPT_DIR, force_rebuild=False)
                        except Exception as e:
                            print(f"[Watch] Build error: {e}")
                except Exception as e:
                    print(f"[Watch] Polling error: {e}")

        t = threading.Thread(target=watch_thread_func, daemon=True)
        t.start()

    # Build first
    report, blocking = run_build(SCRIPT_DIR, force_rebuild=args.rebuild)
    BuilderHTTPRequestHandler.args = args

    os.chdir(SCRIPT_DIR)

    # Find available port
    port = args.port
    server = None
    for attempt in range(20):
        try:
            server = HTTPServer(('127.0.0.1', port), BuilderHTTPRequestHandler)
            break
        except OSError:
            port += 1

    if not server:
        print(f"ERROR: Could not find an available port (tried {args.port}-{args.port + 19})")
        sys.exit(1)

    url = f"http://127.0.0.1:{port}/"
    print(f"\nServer running at {url}")
    print(f"Build status: {report['status']}")
    print("Press Ctrl+C to stop.")

    if not args.no_open:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
        sys.exit(0)
