"""
Mirror script: converts workspace context/project files to static HTML.
Reads source and destination paths from config/settings.json.

Configure in settings.json:
  "mirror": {
    "source": "../_reversa_sdd",
    "destination": "output/mirror_html"
  }
"""
import os
import sys
import shutil
import json
from pathlib import Path

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AXE_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))

sys.path.insert(0, AXE_ROOT)
from engine.json_io import load_json

# Load config
config_path = os.path.join(AXE_ROOT, 'config', 'settings.json')
config = load_json(config_path, {})

mirror_config = config.get("mirror", {})
SRC = mirror_config.get("source", "")
DST = mirror_config.get("destination", os.path.join("output", "mirror_html"))

if not SRC:
    print("Error: No mirror source configured in settings.json.")
    print("Add to config/settings.json:")
    print('  "mirror": { "source": "../path/to/docs", "destination": "output/mirror_html" }')
    sys.exit(1)

# Resolve relative paths from AXE-Anchor root
if not os.path.isabs(SRC):
    SRC = os.path.abspath(os.path.join(AXE_ROOT, SRC))
if not os.path.isabs(DST):
    DST = os.path.abspath(os.path.join(AXE_ROOT, DST))

if not os.path.exists(SRC):
    print(f"Error: Source path does not exist: {SRC}")
    sys.exit(1)

# File types to convert
MARKDOWN_EXT = ['.md']
CODE_EXT = ['.ps1', '.json', '.csv', '.xml', '.xsd', '.txt']


def build_tree(src_dir, rel_path=''):
    items = []
    target = os.path.join(src_dir, rel_path) if rel_path else src_dir
    if not os.path.exists(target):
        return items
    for entry in sorted(os.listdir(target)):
        full_path = os.path.join(target, entry)
        rel_entry = os.path.join(rel_path, entry) if rel_path else entry
        if os.path.isdir(full_path):
            items.append({
                'type': 'folder',
                'name': entry,
                'children': build_tree(src_dir, rel_entry)
            })
        else:
            ext = Path(entry).suffix.lower()
            items.append({
                'type': 'file',
                'name': entry,
                'path': rel_entry.replace('\\', '/') + ('.html' if ext in MARKDOWN_EXT + CODE_EXT else '')
            })
    return items


def convert_files(src_dir, dst_dir, rel_path=''):
    target_src = os.path.join(src_dir, rel_path) if rel_path else src_dir
    target_dst = os.path.join(dst_dir, rel_path) if rel_path else dst_dir
    os.makedirs(target_dst, exist_ok=True)
    for entry in os.listdir(target_src):
        full_src = os.path.join(target_src, entry)
        full_dst = os.path.join(target_dst, entry)
        ext = Path(entry).suffix.lower()
        if os.path.isdir(full_src):
            convert_files(src_dir, dst_dir, os.path.join(rel_path, entry) if rel_path else entry)
        else:
            if ext in MARKDOWN_EXT:
                try:
                    import markdown
                    with open(full_src, encoding='utf-8') as f:
                        html = markdown.markdown(f.read(), extensions=['tables', 'fenced_code'])
                    with open(full_dst + '.html', 'w', encoding='utf-8') as out:
                        out.write(html)
                except ImportError:
                    # No markdown module — just copy raw
                    shutil.copy2(full_src, full_dst)
            elif ext in CODE_EXT:
                with open(full_src, encoding='utf-8') as f:
                    code = f.read()
                with open(full_dst + '.html', 'w', encoding='utf-8') as out:
                    out.write(f'<pre>{code}</pre>')
            else:
                shutil.copy2(full_src, full_dst)


def main():
    print(f"Mirror: {SRC} -> {DST}")
    os.makedirs(DST, exist_ok=True)
    tree = build_tree(SRC)
    convert_files(SRC, DST)

    # Write tree index if template exists
    index_path = os.path.join(DST, 'index.html')
    if os.path.exists(index_path):
        with open(index_path, encoding='utf-8') as f:
            html = f.read()
        html = html.replace('const treeData = /*__TREE_DATA__*/;',
            'const treeData = ' + json.dumps(tree, indent=2) + ';')
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(html)

    print(f"Done. {len(tree)} top-level items mirrored.")


if __name__ == '__main__':
    main()
