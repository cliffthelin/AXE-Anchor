"""AXE-Anchor — JSON load/save utilities."""
import os, json

# START OF SECTION 02: JSON Config Serialization & Loading Utilities
# Description: File system wrappers to read and write UTF-8 encoded JSON objects.
# ==============================================================================
def load_json(path, default):
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    return default

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
# ==============================================================================
# END OF SECTION 02: JSON Config Serialization & Loading Utilities
