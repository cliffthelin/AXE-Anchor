"""AXE-Anchor — Shared constants and layout resolver."""
import os, time

BUILD_ID = int(time.time())

# ==============================================================================
# AXE-Anchor Folder Layout
# builder.py          ← runnable Python entry point
# index.html          ← runnable HTML dashboard (root)
# workspace_*.html    ← runnable per-workspace HTML (root)
# config/             ← settings.json, rules.json
# cache/              ← manifest.json, reviews.json (incremental cache)
# output/             ← validation_report.json, deferred_review.json, schema-origin-map.json
# ==============================================================================
def _axe_paths(script_dir):
    return {
        "config":      os.path.join(script_dir, "config"),
        "cache":       os.path.join(script_dir, "cache"),
        "output":      os.path.join(script_dir, "output"),
        "workspaces":  os.path.join(script_dir, "workspaces"),                 # workspace HTML
        "settings":    os.path.join(script_dir, "config", "settings.json"),
        "rules":       os.path.join(script_dir, "config", "rules.json"),
        "alt_rules":   os.path.join(script_dir, "config", "docvault.rules.json"),
        "manifest":    os.path.join(script_dir, "cache", "manifest.json"),
        "reviews":     os.path.join(script_dir, "cache", "reviews.json"),
        "deferred":    os.path.join(script_dir, "output", "deferred_review.json"),
        "validation":  os.path.join(script_dir, "output", "validation_report.json"),
        "schema_map":  os.path.join(script_dir, "output", "schema-origin-map.json"),
        "index":       os.path.join(script_dir, "index.html"),                 # runnable at root
    }

SUPPORTED = {
    ".md":"markdown", ".csv":"csv", ".json":"json", ".txt":"text", ".log":"text",
    ".py":"code", ".ts":"code", ".ps1":"code", ".cs":"code",
    ".yaml":"text", ".yml":"text", ".xml":"text", ".sql":"code",
    ".png":"image", ".jpg":"image", ".jpeg":"image", ".gif":"image", ".svg":"image",
    ".pdf":"markdown", ".docx":"markdown", ".doc":"markdown",
    ".xlsx":"markdown", ".xls":"markdown"
}

MAX_FILE_BYTES = 5 * 1024 * 1024 

# ==============================================================================
