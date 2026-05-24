"""AXE-Anchor - SDD spec file scanner and manifest generator."""
import os, json, csv, base64, time, re
from pathlib import Path
from .constants import SUPPORTED, MAX_FILE_BYTES
from .paths import walk_pruned, is_system_file, is_in_repo_paths, is_data_dump, get_code_repo_paths
from .json_io import load_json
from .file_utils import file_hash, extract_structural_lineage
from .parsers.pdf import extract_pdf_text
from .parsers.word import extract_word_text
from .parsers.excel import extract_excel_text

def _slug(value):
    slug = re.sub(r'[^a-zA-Z0-9_.-]+', '-', value or '').strip('-')
    return slug or 'root'

def _schema_map_path(root, config, prefix):
    map_name = config.get("output_schema_origin_map", "schema-origin-map.json")
    output_dir = config.get("_schema_origin_map_dir")
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        if prefix:
            stem, ext = os.path.splitext(map_name)
            return os.path.join(output_dir, f"{stem}-{_slug(prefix)}{ext or '.json'}")
        return os.path.join(output_dir, map_name)
    return os.path.join(root, map_name)

# START OF SECTION 10: SDD Spec Files Scanner & Manifest Generator
# Description: Incremental directory scanner for markdown, JSON, text, and binary doc
# files, tracking lineage relationships, metadata, and compiling the manifest.
# ==============================================================================
def scan(root, config, prior_cache=None, prefix=""):
    root = os.path.abspath(root)
    if prior_cache is None:
        prior_cache = {}
    docs = {}
    deferred_for_review = []
    excluded_files = []  # Track ALL excluded files with reasons
    bt = time.strftime('%Y-%m-%d %H:%M:%S')
    discovered_origins = set()
    code_repo_paths = get_code_repo_paths(config)

    # Read scanner rules from config (with defaults)
    rules = config.get("scanner_rules", {})
    supported_exts = set(rules.get("supported_extensions", list(SUPPORTED.keys())))
    skip_hidden = rules.get("skip_hidden_folders", True)
    skip_ignore_folders = rules.get("skip_folders_containing_ignore", True)
    system_names = set(rules.get("system_file_names", ["settings.json", ".env"]))
    system_patterns = rules.get("system_file_patterns", ["secret", "credential"])
    max_bytes = rules.get("max_file_bytes", MAX_FILE_BYTES)
    code_docs_only = rules.get("code_repo_docs_only", True)

    exclude_list = rules.get("exclude_folders", config.get("exclude", []))

    # First pass: collect ALL files including excluded ones
    for dirpath, dirnames, filenames in os.walk(root, topdown=True):
        # Record files in excluded/pruned directories
        rel_dir = os.path.relpath(dirpath, root).replace('\\', '/')
        if rel_dir == '.':
            rel_dir = ''

        for fname in filenames:
            rel_path = (rel_dir + '/' + fname) if rel_dir else fname
            full_path = os.path.join(dirpath, fname)
            ext = os.path.splitext(fname)[1].lower()

            # Check each exclusion rule
            reason = None
            dir_parts = rel_dir.split('/') if rel_dir else []

            # Excluded folder match
            if any(excl.lower() in part.lower() for part in dir_parts for excl in exclude_list):
                reason = 'Excluded folder'
            # Hidden folder
            elif skip_hidden and any(part.startswith('.') for part in dir_parts):
                reason = 'Hidden folder'
            # Ignore in folder name
            elif skip_ignore_folders and any('ignore' in part.lower() for part in dir_parts):
                reason = 'Folder contains "ignore"'
            # Backup patterns
            elif any(pat in part.lower() for part in dir_parts for pat in rules.get("exclude_folder_patterns", [])):
                reason = 'Backup/temp folder pattern'
            # Unsupported extension
            elif ext and ext not in supported_exts:
                reason = f'Unsupported extension: {ext}'
            # System file
            elif fname.lower() in system_names or any(pat in fname.lower() for pat in system_patterns):
                reason = 'System/sensitive file'
            # File too large
            elif os.path.exists(full_path):
                try:
                    if os.path.getsize(full_path) > max_bytes:
                        reason = f'Exceeds size limit ({max_bytes // 1048576}MB)'
                except OSError:
                    pass

            if reason:
                excluded_files.append({"path": rel_path, "reason": reason})

    # Now do the actual scan (existing logic)
    for p in walk_pruned(root, exclude_list, ext_filter=supported_exts, config=config):
      if is_system_file(p, root, system_names, system_patterns): continue

      ext = p.suffix.lower()
      if ext not in SUPPORTED: continue

      # Ignore subfolders with the name ignore in them
      rel_parts = p.relative_to(root).parts
      if skip_ignore_folders and any('ignore' in part.lower() for part in rel_parts[:-1]):
          continue

      rel = str(p.relative_to(root)).replace('\\', '/')

      # Exclude code repo folders from standard document scan unless it's a PDF/Word/Excel file or inside a Documentation folder
      if code_docs_only and is_in_repo_paths(rel, code_repo_paths):
          if ext not in ('.pdf', '.docx', '.doc', '.xlsx', '.xls') and 'documentation' not in [p_part.lower() for p_part in rel_parts]:
              excluded_files.append({"path": rel, "reason": "Code repo (docs-only mode)"})
              continue
      t = SUPPORTED[ext]
      current_hash = file_hash(p)

      # Incremental rebuild: use cached entry if hash matches
      cache_key = f"{prefix}/{rel}" if prefix else rel
      if cache_key in prior_cache and prior_cache[cache_key].get("hash") == current_hash:
          cached = dict(prior_cache[cache_key])
          cached["_from_cache"] = True
          docs[rel] = cached
          continue

      node = {"type": t, "ext": ext, "hash": current_hash}

      # --- Data-dump guard: add as folder-link artifact, do not parse content ---
      flagged, reason = is_data_dump(p, ext)
      if flagged:
          size_bytes = p.stat().st_size
          docs[rel] = {
              "type": "data_artifact",
              "ext": ext,
              "hash": current_hash,
              "deferred": True,
              "deferred_reason": reason,
              "folder": str(p.parent),
              "size_bytes": size_bytes,
              "content": "",
              "lineage": {"dependencies": [], "schema": []},
              "metrics": {"loc": 0, "chars": 0},
          }
          deferred_for_review.append({
              "path": rel,
              "id": cache_key,
              "folder": os.path.dirname(rel) or ".",
              "ext": ext,
              "size_bytes": size_bytes,
              "reason": reason,
              "workspace_prefix": prefix,
          })
          continue

      if p.stat().st_size > MAX_FILE_BYTES:
        node["content"] = "[FILE EXCEEDS 5MB LIMIT]"
        node["lineage"] = {"dependencies": [], "schema": []}
        node["metrics"] = {"loc": 0, "chars": 0}
        docs[rel] = node
        continue

      try:
        if ext == ".pdf":
          content = extract_pdf_text(p)
          node["content"] = content
          node["lineage"] = extract_structural_lineage(content, ext)
          node["metrics"] = {"loc": len(content.splitlines()), "chars": len(content)}
        elif ext in (".docx", ".doc"):
          content = extract_word_text(p, ext)
          node["content"] = content
          node["lineage"] = extract_structural_lineage(content, ext)
          node["metrics"] = {"loc": len(content.splitlines()), "chars": len(content)}
        elif ext in (".xlsx", ".xls"):
          content = extract_excel_text(p, ext)
          node["content"] = content
          node["lineage"] = extract_structural_lineage(content, ext)
          node["metrics"] = {"loc": len(content.splitlines()), "chars": len(content)}
        elif t in ("markdown", "text", "code"):
          content = p.read_text(encoding='utf-8', errors='ignore')
          node["content"] = content
          node["lineage"] = extract_structural_lineage(content, ext)
          node["metrics"] = {"loc": len(content.splitlines()), "chars": len(content)}
        elif t == "json":
          raw = p.read_text(encoding='utf-8', errors='ignore')
          node["data"] = json.loads(raw)
          node["content"] = raw
          node["lineage"] = extract_structural_lineage(raw, ext)
          node["metrics"] = {"loc": len(raw.splitlines()), "chars": len(raw)}
        elif t == "csv":
          with open(p, encoding='utf-8') as f:
            rows = list(csv.reader(f))
            node["rows"] = rows[:config.get("max_csv_preview_rows", 1000)]
            node["content"] = "\n".join([",".join(r) for r in rows[:100]])
            if rows: node["lineage"] = {"schema": {"headers": rows[0]}, "dependencies": []}
            node["metrics"] = {"loc": len(rows), "chars": len(node["content"])}
        elif t == "image":
          node["base64"] = f"data:image/{ext[1:]};base64,{base64.b64encode(p.read_bytes()).decode()}"
          node["content"] = ""
          node["lineage"] = {"dependencies": [], "schema": []}
          node["metrics"] = {"loc": 0, "chars": len(node["base64"])}
      except Exception as e:
        node["content"] = f"ERROR: {e}"
        node["metrics"] = {"loc": 0, "chars": 0}
      docs[rel] = node

      # --- Discover schema origins dynamically from config ---
      schema_opts = config.get("schema_origins", {})
      discovery_rules = schema_opts.get("discovery_rules", [])
      for rule in discovery_rules:
        suffix = rule.get("file_suffix", "")
        match_type = rule.get("match_type", "")
        if rel.endswith(suffix):
          if match_type == "json_keys" and "data" in node:
            data_list = node["data"] if isinstance(node["data"], list) else [node["data"]]
            key_path = rule.get("key_path", "")
            for entry in data_list:
              if isinstance(entry, dict):
                val = str(entry.get(key_path, "")).strip()
                if val:
                  split_char = rule.get("split_char")
                  if split_char and split_char in val:
                    discovered_origins.add(val.split(split_char)[rule.get("index", 0)])
                  else:
                    discovered_origins.add(rule.get("fallback_origin", val))
          elif match_type == "text_contains" and "content" in node:
            contain_char = rule.get("contain_char", "")
            for line in node["content"].split('\n'):
              if contain_char in line:
                parts = line.strip().split(' ')
                if parts:
                  m = parts[0]
                  if m and m.isidentifier():
                    discovered_origins.add(rule.get("origin", m))
          elif match_type == "exists":
            discovered_origins.add(rule.get("origin", "default"))

    # --- Load and update schema-origin-map.json ---
    map_path = _schema_map_path(root, config, prefix)
    schema_opts = config.get("schema_origins", {})
    def_map = schema_opts.get("default_map", {
      "default": {"color": "#37474f", "label": "Other"}
    })
    existing_map = load_json(map_path, {})
    schema_origin_map = dict(def_map)
    schema_origin_map.update(existing_map)
    schema_origin_map.pop("_meta", None)
    for origin in discovered_origins:
      if origin not in schema_origin_map:
        schema_origin_map[origin] = {"color": "#607d8b", "label": origin}
    existing_meta = existing_map.get("_meta", {}) if isinstance(existing_map, dict) else {}
    previous_origins = set(existing_meta.get("discovered_origins", []))
    schema_origin_map["_meta"] = {
      "generated_at": time.strftime('%Y-%m-%dT%H:%M:%SZ'),
      "workspace_prefix": prefix or "__root__",
      "source_root": os.path.abspath(root),
      "discovered_origins": sorted(discovered_origins),
      "stale": previous_origins != discovered_origins,
      "previous_discovered_origins": sorted(previous_origins),
    }
    with open(map_path, 'w', encoding='utf-8') as f:
      json.dump(schema_origin_map, f, indent=2)

    return {"documents": docs, "meta": {"build_time": bt}, "schema_origin_map": schema_origin_map, "deferred_for_review": deferred_for_review, "excluded_files": excluded_files}

# ==============================================================================
# END OF SECTION 10: SDD Spec Files Scanner & Manifest Generator
