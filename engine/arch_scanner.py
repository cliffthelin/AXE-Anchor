"""AXE-Anchor — Static code architecture and inheritance tracker."""
import os, re
from pathlib import Path
from .constants import SUPPORTED, MAX_FILE_BYTES
from .paths import walk_pruned, is_system_file, get_code_repo_paths
from .file_utils import file_hash

# START OF SECTION 11: Code Base Static Architecture & Inheritance Tracker
# Description: Static scanner parsing classes, methods, imports, and dependencies
# from source code repositories (supports C#, SQL, TS, Python).
# ==============================================================================
def scan_code_architecture(root, config, doc_paths=None, prior_cache=None, prefix=""):
    root = os.path.abspath(root)
    if doc_paths is None:
        doc_paths = []
    if prior_cache is None:
        prior_cache = {}
        
    code_repo_paths = get_code_repo_paths(config)
    relevant_repo_paths = []
    root_path_obj = Path(os.path.abspath(root))
    for rp in code_repo_paths:
        if os.path.isabs(rp):
            try:
                Path(os.path.abspath(rp)).relative_to(root_path_obj)
                relevant_repo_paths.append(rp)
            except ValueError:
                pass
        else:
            full_path = os.path.abspath(os.path.join(root, rp))
            try:
                Path(full_path).relative_to(root_path_obj)
                if os.path.exists(full_path):
                    relevant_repo_paths.append(rp)
            except ValueError:
                pass
                
    if not relevant_repo_paths:
        if os.path.exists(root):
            relevant_repo_paths = ["."]

    code_docs = {}
    supported_code_exts = {'.cs', '.sql', '.py', '.ts'}
    
    # First pass: read files and extract namespace + defined classes/interfaces/structs/enums + inheritance
    temp_files = []
    class_to_file = {}

    for repo_path in relevant_repo_paths:
        repo_dir = Path(root) / repo_path if not os.path.isabs(repo_path) else Path(repo_path)
        repo_dir = Path(os.path.abspath(repo_dir))
        
        # Double check path boundary to make sure it doesn't escape project root
        try:
            repo_dir.relative_to(root_path_obj)
        except ValueError:
            continue
            
        if not repo_dir.exists():
            continue
            
        exclude_list = config.get("exclude", [])
        for p in walk_pruned(repo_dir, exclude_list, ext_filter=supported_code_exts):
            rel_parts = p.relative_to(repo_dir).parts
            if any('ignore' in part.lower() for part in rel_parts[:-1]):
                continue
                
            ext = p.suffix.lower()
            if ext not in supported_code_exts:
                continue
                
            if p.stat().st_size > MAX_FILE_BYTES:
                continue
                
            try:
                content = p.read_text(encoding='utf-8', errors='ignore')
                rel_val = str(p.relative_to(repo_dir)).replace('\\', '/')
                repo_id = os.path.basename(repo_path.rstrip('/\\')) if repo_path != '.' else os.path.basename(str(root).rstrip('/\\'))
                if not repo_id:
                    repo_id = "root"
                rel = f"{repo_id}/{rel_val}"
                current_hash = file_hash(p)

                # Incremental rebuild: use cached code entry if hash matches
                cache_key = f"{prefix}/{rel}" if prefix else rel
                if cache_key in prior_cache and prior_cache[cache_key].get("hash") == current_hash:
                    cached = dict(prior_cache[cache_key])
                    cached["_from_cache"] = True
                    temp_files.append({
                        "path": rel,
                        "content": cached.get("content", ""),
                        "ext": ext,
                        "namespace": cached.get("code_meta", {}).get("namespace", ""),
                        "definitions": cached.get("code_meta", {}).get("definitions", []),
                        "inherits": cached.get("code_meta", {}).get("inherits", []),
                        "hash": current_hash,
                        "_cached_node": cached
                    })
                    for d in cached.get("code_meta", {}).get("definitions", []):
                        class_to_file[d] = rel
                    continue

                # Extract namespace
                namespace = 'Other'
                if ext == '.cs':
                    ns_match = re.search(r'\bnamespace\s+([\w\.]+)', content)
                    namespace = ns_match.group(1) if ns_match else 'Other'
                elif ext == '.ts':
                    ns_match = re.search(r'\b(?:namespace|module)\s+([a-zA-Z0-9_]+)', content)
                    if ns_match:
                        namespace = ns_match.group(1)
                    else:
                        namespace = os.path.dirname(rel).replace('\\', '/').split('/')[-1] or 'Other'
                elif ext == '.py':
                    namespace = os.path.dirname(rel).replace('\\', '/').split('/')[-1] or 'Other'

                # Extract definitions & inherits
                defs = []
                inherits = []
                if ext == '.cs':
                    class_matches = re.findall(r'\b(?:class|interface|struct|enum)\s+([a-zA-Z0-9_]+)', content)
                    defs = [d.split('<')[0].strip() for d in class_matches]
                    inheritance_matches = re.findall(r'\b(?:class|interface|struct)\s+[a-zA-Z0-9_]+\s*:\s*([a-zA-Z0-9_,\s<>]+)', content)
                    for bases_str in inheritance_matches:
                        bases = [b.split('<')[0].strip() for b in bases_str.split(',')]
                        inherits.extend([b for b in bases if b.isidentifier()])
                elif ext == '.ts':
                    defs = re.findall(r'\b(?:class|interface|enum)\s+([a-zA-Z0-9_]+)', content)
                    ts_inheritance_matches = re.findall(r'\b(?:class|interface)\s+[a-zA-Z0-9_]+\s+(?:extends|implements)\s+([a-zA-Z0-9_,\s<>]+)', content)
                    for bases_str in ts_inheritance_matches:
                        cleaned = re.sub(r'<[^>]+>', '', bases_str)
                        bases = [b.strip() for b in cleaned.split(',')]
                        inherits.extend([b for b in bases if b.isidentifier()])
                elif ext == '.py':
                    defs = re.findall(r'\bclass\s+([a-zA-Z0-9_]+)', content)
                    py_class_matches = re.findall(r'\bclass\s+[a-zA-Z0-9_]+\s*\(([^)]+)\)', content)
                    for bases_str in py_class_matches:
                        bases = [b.strip() for b in bases_str.split(',')]
                        inherits.extend([b for b in bases if b.isidentifier()])

                temp_files.append({
                    "path": rel,
                    "content": content,
                    "ext": ext,
                    "namespace": namespace,
                    "definitions": list(set(defs)),
                    "inherits": list(set(inherits)),
                    "hash": file_hash(p)
                })
                
                for d in defs:
                    class_to_file[d] = rel
            except Exception as e:
                print(f"[Code Scan Error] {p}: {e}")

    doc_ref_lookup = {}
    for doc_path in doc_paths:
        doc_base = os.path.basename(doc_path.lower())
        doc_name_no_ext = os.path.splitext(doc_base)[0]
        if doc_base:
            doc_ref_lookup.setdefault(doc_base, set()).add(doc_path)
        if len(doc_name_no_ext) > 3:
            doc_ref_lookup.setdefault(doc_name_no_ext, set()).add(doc_path)

    path_suffix_lookup = {}
    basename_lookup = {}
    for file_info in temp_files:
        other_path = file_info["path"]
        other_no_ext = os.path.splitext(other_path)[0].replace('\\', '/')
        other_base = os.path.splitext(os.path.basename(other_path))[0]
        basename_lookup.setdefault(other_base, set()).add(other_path)
        parts = other_no_ext.split('/')
        for i in range(len(parts)):
            suffix = '/'.join(parts[i:])
            if suffix:
                path_suffix_lookup.setdefault(suffix, set()).add(other_path)

    # Second pass: compute dependencies based on class/interface usage, imports, and comments
    for file_info in temp_files:
        rel = file_info["path"]
        content = file_info["content"]
        ext = file_info["ext"]

        # Use pre-cached node directly if available
        if "_cached_node" in file_info:
            cached_node = dict(file_info["_cached_node"])
            cached_node["_from_cache"] = True
            code_docs[rel] = cached_node
            continue

        deps = set()
        inheritance_deps = []
        
        # Standard class usage scan. Tokenizing once per file avoids recompiling
        # one regex per known class per source file on larger workspaces.
        referenced_names = set(re.findall(r'\b[A-Za-z_][A-Za-z0-9_]*\b', content))
        for class_name in referenced_names.intersection(class_to_file):
            target_file = class_to_file[class_name]
            if target_file != rel:
                deps.add(target_file)

        # Import specific scans
        if ext == '.cs':
            usings = re.findall(r'\busing\s+([\w\.]+);', content)
            for other_file in temp_files:
                if other_file["path"] == rel:
                    continue
                if other_file["namespace"] and other_file["namespace"] in usings:
                    deps.add(other_file["path"])
        elif ext == '.py':
            imports = []
            for m in re.finditer(r'\bimport\s+([\w\.,\s]+)', content):
                for imp in m.group(1).split(','):
                    imports.append(imp.strip().split(' ')[0])
            for m in re.finditer(r'\bfrom\s+([\w\.]+)\s+import\b', content):
                imports.append(m.group(1).strip())
            
            for imp in imports:
                imp_slash = imp.replace('.', '/')
                deps.update(p for p in path_suffix_lookup.get(imp_slash, set()) if p != rel)
                deps.update(p for p in basename_lookup.get(imp_slash, set()) if p != rel)
        elif ext == '.ts':
            ts_imports = re.findall(r'\bimport\s+.*?from\s+[\'"]([^\'"]+)[\'"]', content)
            ts_imports.extend(re.findall(r'\brequire\(\s*[\'"]([^\'"]+)[\'"]\s*\)', content))
            
            for imp in ts_imports:
                if imp.startswith('.'):
                    curr_dir = os.path.dirname(rel)
                    resolved_path = os.path.normpath(os.path.join(curr_dir, imp)).replace('\\', '/')
                    deps.update(p for p in path_suffix_lookup.get(resolved_path, set()) if p != rel)
                else:
                    deps.update(p for p in basename_lookup.get(imp, set()) if p != rel)

        # Track inheritance dependencies
        for base in file_info["inherits"]:
            if base in class_to_file:
                target_file = class_to_file[base]
                if target_file != rel:
                    inheritance_deps.append(target_file)
                    deps.add(target_file)

        # Check references to standard documents in comments
        comments = re.findall(r'//.*|/\*[\s\S]*?\*/|--.*|#.*', content)
        comments_text = '\n'.join(comments).lower()
        comment_tokens = set(re.findall(r'[a-z0-9_.-]+', comments_text))
        for token in comment_tokens.intersection(doc_ref_lookup):
            deps.update(doc_ref_lookup[token])

        # Harvest TODO/FIXME/HACK/NOTE/BUG annotations
        todos = []
        todo_pattern = re.compile(r'(?://|--|#)\s*(TODO|FIXME|HACK|NOTE|BUG)[:\s]+(.*)', re.IGNORECASE)
        for lineno, line in enumerate(file_info["content"].splitlines(), 1):
            m = todo_pattern.search(line)
            if m:
                todos.append({"tag": m.group(1).upper(), "line": lineno, "text": m.group(2).strip()})

        code_docs[rel] = {
            "type": "code",
            "ext": file_info["ext"],
            "hash": file_info["hash"],
            "content": file_info["content"],
            "lineage": {
                "dependencies": list(deps),
                "schema": []
            },
            "code_meta": {
                "namespace": file_info["namespace"],
                "definitions": file_info["definitions"],
                "inherits": file_info["inherits"],
                "inheritance_deps": list(set(inheritance_deps))
            },
            "metrics": {
                "loc": len(file_info["content"].splitlines()),
                "chars": len(file_info["content"])
            },
            "todos": todos,
            "is_code": True
        }
    return code_docs

# ==============================================================================
# END OF SECTION 11: Code Base Static Architecture & Inheritance Tracker
