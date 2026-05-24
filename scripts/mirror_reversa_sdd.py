import os
import shutil
import markdown
import json
from pathlib import Path

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))

SRC = os.path.join(PROJECT_ROOT, '_reversa_sdd')
DST = os.path.join(PROJECT_ROOT, 'AXE-Anchor', 'output', 'mirror_html')

# File types to convert
MARKDOWN_EXT = ['.md']
CODE_EXT = ['.ps1', '.json', '.csv', '.xml', '.xsd', '.txt']

# Build tree data for index.html

def build_tree(src_dir, rel_path=''):
    items = []
    for entry in sorted(os.listdir(os.path.join(src_dir, rel_path))):
        full_path = os.path.join(src_dir, rel_path, entry)
        rel_entry = os.path.join(rel_path, entry)
        if os.path.isdir(full_path):
            items.append({
                'type': 'folder',
                'name': entry,
                'children': build_tree(src_dir, rel_entry)
            })
        else:
            ext = Path(entry).suffix.lower()
            if ext in MARKDOWN_EXT:
                html_name = entry + '.html'
            elif ext in CODE_EXT:
                html_name = entry + '.html'
            else:
                html_name = entry  # unsupported, just link raw
            items.append({
                'type': 'file',
                'name': entry,
                'path': rel_entry.replace('\\', '/') + ('.html' if ext in MARKDOWN_EXT + CODE_EXT else '')
            })
    return items

def convert_files(src_dir, dst_dir, rel_path=''):
    os.makedirs(os.path.join(dst_dir, rel_path), exist_ok=True)
    for entry in os.listdir(os.path.join(src_dir, rel_path)):
        full_src = os.path.join(src_dir, rel_path, entry)
        full_dst = os.path.join(dst_dir, rel_path, entry)
        ext = Path(entry).suffix.lower()
        if os.path.isdir(full_src):
            convert_files(src_dir, dst_dir, os.path.join(rel_path, entry))
        else:
            if ext in MARKDOWN_EXT:
                with open(full_src, encoding='utf-8') as f:
                    html = markdown.markdown(f.read(), extensions=['tables','fenced_code'])
                with open(full_dst + '.html', 'w', encoding='utf-8') as out:
                    out.write(html)
            elif ext in CODE_EXT:
                with open(full_src, encoding='utf-8') as f:
                    code = f.read()
                with open(full_dst + '.html', 'w', encoding='utf-8') as out:
                    out.write(code)
            else:
                shutil.copy2(full_src, full_dst)

def main():
    tree = build_tree(SRC)
    # Patch index.html with treeData
    index_path = os.path.join(DST, 'index.html')
    with open(index_path, encoding='utf-8') as f:
        html = f.read()
    html = html.replace('const treeData = /*__TREE_DATA__*/;',
        'const treeData = ' + json.dumps(tree, indent=2) + ';')
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(html)
    # Convert files
    convert_files(SRC, DST)

if __name__ == '__main__':
    main()
