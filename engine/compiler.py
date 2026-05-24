"""AXE-Anchor - Main build compiler driver."""
import os, json, time, subprocess, base64
from . import constants as constants_module
from .constants import BUILD_ID, _axe_paths
from .paths import get_code_repo_paths
from .json_io import load_json, save_json
from .scanner import scan
from .arch_scanner import scan_code_architecture
from .rules_engine import run_rules

# START OF SECTION 15: Incremental Cache Loader & Main Build Compiler Driver
# Description: Main compilation driver orchestrating directories scanning, building
# manifest, executing rules validation, and outputting compiled index.html file.
# ==============================================================================
def run_build(script_dir, force_rebuild=False):
    paths = _axe_paths(script_dir)
    # Ensure required subdirs exist
    for d in (paths["config"], paths["cache"], paths["output"], paths["workspaces"]):
        os.makedirs(d, exist_ok=True)

    config_path = paths["settings"]
    if not os.path.exists(config_path):
        config_path = os.path.join(script_dir, 'config', 'docvault.config.json')
    if not os.path.exists(config_path):
        config_path = os.path.join(script_dir, 'settings.json')  # legacy fallback
    config = dict(load_json(config_path, {"exclude": [".git", "__pycache__", "node_modules"]}))
    config["_schema_origin_map_dir"] = os.path.join(paths["output"], "schema-origin-maps")

    # Check for web-exported filter settings and override if present
    web_filter_path = os.path.join(script_dir, 'axe_filter_settings.json')
    if os.path.exists(web_filter_path):
        web_filters = load_json(web_filter_path, {})
        if web_filters.get('_export_source') == 'axe-anchor-web-ui':
            web_ignored = web_filters.get('graph_ignored_paths', [])
            if web_ignored:
                config['graph_ignored_paths'] = web_ignored
                print(f"[Build] Imported {len(web_ignored)} ignored paths from axe_filter_settings.json")

    rules_path = paths["rules"]
    if not os.path.exists(rules_path):
        rules_path = paths["alt_rules"]
    rules = load_json(rules_path, {"rules": []})

    # Load previous manifest as cache for incremental rebuild
    manifest_path = paths["manifest"]
    prior_cache = {}
    if not force_rebuild and os.path.exists(manifest_path):
        try:
            prior_manifest = load_json(manifest_path, {})
            prior_cache = prior_manifest.get("documents", {})
            print(f"[Incremental] Loaded {len(prior_cache)} cached entries from cache/manifest.json")
        except Exception as e:
            print(f"[Incremental] Could not load cache: {e}")

    workspaces = config.get("workspaces", [])
    active_workspace_id = config.get("active_workspace_id") or config.get("last_workspace_id")
    if workspaces and not active_workspace_id:
        active_workspace_id = workspaces[0].get("id") or workspaces[0].get("name")
    if not active_workspace_id:
        active_workspace_id = "__root__"
    generated_at = time.strftime('%Y-%m-%dT%H:%M:%SZ')
    data = {
        "documents": {},
        "schema_origin_map": {},
        "schema_origin_maps": {},
        "workspace_placeholders": [],
        "active_workspace_id": active_workspace_id,
        "stale_reports": [],
        "build_meta": {
            "generated_at": generated_at,
            "active_workspace_id": active_workspace_id,
        },
    }
    all_deferred = []
    all_excluded = []  # Track ALL excluded files across all scans
    changed_documents = set()

    def workspace_key(ws):
        return ws.get("id") or ws.get("name")

    def is_active_workspace(ws):
        key = workspace_key(ws)
        return key == active_workspace_id or ws.get("name") == active_workspace_id

    def merge_schema_origin_map(prefix, scan_data):
        schema_map = scan_data.get("schema_origin_map", {})
        if not schema_map:
            return
        scope = prefix or "__root__"
        data["schema_origin_maps"][scope] = schema_map
        data["schema_origin_map"].update(schema_map)

    def add_documents(prefix, docs):
        for k, v in docs.items():
            full_key = f"{prefix}/{k}" if prefix else k
            prior = prior_cache.get(full_key, {}) if isinstance(prior_cache, dict) else {}
            if prior.get("hash") and prior.get("hash") != v.get("hash"):
                changed_documents.add(full_key)
            data["documents"][full_key] = v

    def add_workspace_placeholder(ws):
        data["workspace_placeholders"].append({
            "id": workspace_key(ws),
            "name": ws.get("name") or workspace_key(ws),
            "status": "not_loaded",
            "reason": "Click to load this workspace on demand.",
        })
    
    if not workspaces:
        data = scan(script_dir, config, prior_cache)
        data["schema_origin_maps"] = {"__root__": data.get("schema_origin_map", {})}
        data["workspace_placeholders"] = []
        data["active_workspace_id"] = "__root__"
        data["stale_reports"] = []
        data["build_meta"] = {"generated_at": generated_at, "active_workspace_id": "__root__"}
        all_deferred.extend(data.get("deferred_for_review", []))
        code_docs = scan_code_architecture(script_dir, config, list(data["documents"].keys()), prior_cache)
        data["documents"].update(code_docs)
    else:
        for ws in workspaces:
            if not is_active_workspace(ws):
                add_workspace_placeholder(ws)
                continue
            ws_name = ws.get("name")
            
            # 1. Scan Context Folder
            context = ws.get("context_folder")
            if context:
                ctx_name = context.get("name", "Workspace Context")
                ctx_path = context.get("path")
                if ctx_path:
                    if not os.path.isabs(ctx_path):
                        ctx_path = os.path.abspath(os.path.join(script_dir, ctx_path))
                    if os.path.exists(ctx_path):
                        print(f"[Build] Scanning workspace '{ws_name}' context: {ctx_name} at {ctx_path}")
                        try:
                            prefix = f"{ws_name}/{ctx_name}"
                            ctx_data = scan(ctx_path, config, prior_cache, prefix=prefix)
                            merge_schema_origin_map(prefix, ctx_data)
                            all_deferred.extend(ctx_data.get("deferred_for_review", []))
                            for _exc in ctx_data.get("excluded_files", []):
                                _exc["source"] = prefix
                            all_excluded.extend(ctx_data.get("excluded_files", []))
                            ctx_code = scan_code_architecture(ctx_path, config, list(ctx_data["documents"].keys()), prior_cache, prefix=prefix)
                            ctx_data["documents"].update(ctx_code)
                            add_documents(prefix, ctx_data["documents"])
                        except Exception as e:
                            print(f"[Build] Failed to scan workspace context {ctx_name}: {e}")
                    else:
                        print(f"[Build] Workspace context path does not exist: {ctx_path}")
            
            # 2. Scan Projects
            projects = ws.get("projects", [])
            for proj in projects:
                proj_name = proj.get("name")
                proj_type = proj.get("type", "local_folder")
                proj_path = proj.get("path")
                if not proj_path:
                    continue
                if not os.path.isabs(proj_path):
                    proj_path = os.path.abspath(os.path.join(script_dir, proj_path))
                
                if proj_type == "github_repo":
                    if not os.path.exists(proj_path):
                        print(f"[Build] Git repo not present, skipping until staged/approved sync creates it: {proj_name} ({proj_path})")
                
                if os.path.exists(proj_path):
                    print(f"[Build] Scanning workspace '{ws_name}' project: {proj_name} at {proj_path}")
                    try:
                        prefix = f"{ws_name}/{proj_name}"
                        proj_data = scan(proj_path, config, prior_cache, prefix=prefix)
                        merge_schema_origin_map(prefix, proj_data)
                        all_deferred.extend(proj_data.get("deferred_for_review", []))
                        for _exc in proj_data.get("excluded_files", []):
                            _exc["source"] = prefix
                        all_excluded.extend(proj_data.get("excluded_files", []))
                        proj_code = scan_code_architecture(proj_path, config, list(proj_data["documents"].keys()), prior_cache, prefix=prefix)
                        proj_data["documents"].update(proj_code)
                        add_documents(prefix, proj_data["documents"])
                    except Exception as e:
                        import traceback
                        traceback.print_exc()
                        print(f"[Build] Failed to scan project {proj_name}: {e}")
                else:
                    print(f"[Build] Project path does not exist, skipping: {proj_name} ({proj_path})")
            
            # 3. Scan Supporting Resources
            supp_res = ws.get("supporting_resources")
            if supp_res:
                if isinstance(supp_res, dict):
                    supp_list = [supp_res]
                elif isinstance(supp_res, list):
                    supp_list = supp_res
                else:
                    supp_list = []
                
                for sr in supp_list:
                    if not isinstance(sr, dict):
                        continue
                    supp_name = sr.get("name", "Supporting Resources")
                    supp_path = sr.get("path")
                    if supp_path:
                        if not os.path.isabs(supp_path):
                            supp_path = os.path.abspath(os.path.join(script_dir, supp_path))
                        if os.path.exists(supp_path):
                            print(f"[Build] Scanning workspace '{ws_name}' supporting: {supp_name} at {supp_path}")
                            try:
                                prefix = f"{ws_name}/{supp_name}"
                                supp_data = scan(supp_path, config, prior_cache, prefix=prefix)
                                merge_schema_origin_map(prefix, supp_data)
                                all_deferred.extend(supp_data.get("deferred_for_review", []))
                                for _exc in supp_data.get("excluded_files", []):
                                    _exc["source"] = prefix
                                all_excluded.extend(supp_data.get("excluded_files", []))
                                supp_code = scan_code_architecture(supp_path, config, list(supp_data["documents"].keys()), prior_cache, prefix=prefix)
                                supp_data["documents"].update(supp_code)
                                add_documents(prefix, supp_data["documents"])
                            except Exception as e:
                                print(f"[Build] Failed to scan supporting resources {supp_name}: {e}")
                        else:
                            print(f"[Build] Supporting resources path does not exist: {supp_path}")
    violations = run_rules({k: v for k, v in data['documents'].items() if not v.get('is_code')}, rules)
    blocking = any(v["severity"] == "error" for v in violations)
    report = {"violations": violations, "status": "FAILED" if blocking else "PASS"}

    if changed_documents:
        changed_basenames = {os.path.basename(path).lower() for path in changed_documents}
        for path, doc in data["documents"].items():
            if path in changed_documents:
                continue
            deps = doc.get("lineage", {}).get("dependencies", [])
            dep_hits = [
                dep for dep in deps
                if dep.lower() in changed_documents or os.path.basename(dep).lower() in changed_basenames
            ]
            if dep_hits:
                stale = {
                    "file": path,
                    "reason": "Upstream dependency changed during this build.",
                    "dependencies": dep_hits,
                    "changed_inputs": sorted(changed_documents),
                    "marked_at": generated_at,
                }
                doc["stale"] = stale
                data["stale_reports"].append(stale)

    # Cache statistics
    cached_count = sum(1 for d in data["documents"].values() if d.get("_from_cache"))
    fresh_count = len(data["documents"]) - cached_count
    if prior_cache:
        print(f"[Incremental] {fresh_count} files re-scanned, {cached_count} loaded from cache.")
        # Strip internal cache marker before writing
        for d in data["documents"].values():
            d.pop("_from_cache", None)

    # Write outputs to proper AXE-Anchor subfolders
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    with open(paths["validation"], 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)

    # Write deferred-for-review list
    if all_deferred:
        deferred_path = paths["deferred"]
        existing_deferred = load_json(deferred_path, [])
        existing_ids = {e.get("id") for e in existing_deferred}
        new_entries = [e for e in all_deferred if e.get("id") not in existing_ids]
        if new_entries:
            existing_deferred.extend(new_entries)
            with open(deferred_path, 'w', encoding='utf-8') as f:
                json.dump(existing_deferred, f, indent=2)
            print(f"[Build] {len(new_entries)} files flagged as data dumps → output/deferred_review.json")

    # Write exclusion report
    exclusion_report_path = os.path.join(paths["output"], "exclusion_report.json")
    with open(exclusion_report_path, 'w', encoding='utf-8') as f:
        json.dump(all_excluded, f, indent=2)
    if all_excluded:
        # Summarize by reason
        reasons = {}
        for exc in all_excluded:
            r = exc.get("reason", "Unknown")
            reasons[r] = reasons.get(r, 0) + 1
        print(f"[Build] Exclusion report: {len(all_excluded)} files excluded")
        for r, count in sorted(reasons.items(), key=lambda x: -x[1]):
            print(f"        {count:>5} - {r}")

    # Extract provenance/traceability HTML block if present in any doc
    provenance_html = ''
    for doc in data['documents'].values():
        content = doc.get('content', '')
        if '<!-- TRACEABILITY_PROVENANCE_START -->' in content:
            start = content.find('<!-- TRACEABILITY_PROVENANCE_START -->') + len('<!-- TRACEABILITY_PROVENANCE_START -->')
            end = content.find('<!-- TRACEABILITY_PROVENANCE_END -->', start)
            if end != -1:
                provenance_html = content[start:end].strip()
                break

    # Sanitize config for embedding statically in HTML (exclude secret credentials)
    import platform as _platform
    sanitized_config = {
        "app_root": script_dir,
        "platform": _platform.system().lower(),  # 'linux', 'windows', 'darwin'
        "workspaces": [],
        "projects": config.get("projects", []),
        "orphan_projects": config.get("orphan_projects", []),
        "password_protection_enabled": bool(config.get("password_hash")),
        "github_token_configured": bool(config.get("github_token_encrypted") or config.get("github_token"))
    }
    for ws in config.get("workspaces", []):
        ws_copy = ws.copy()
        # Keep local paths because folder review/setup workflows need to show
        # the actual target before creating folders or staging repo installs.
        sanitized_config["workspaces"].append(ws_copy)
        
    # Load review data to embed statically in HTML
    reviews_data = load_json(paths["reviews"], {})

    # =========================================================================
    # CHUNKED DATA STRATEGY
    # Split document content into ~5MB chunks for fast initial load.
    # The main HTML gets metadata-only (type, ext, lineage, hash, is_code, etc.)
    # and a chunk index. Content is lazy-loaded from chunk files on demand.
    # =========================================================================
    CHUNK_MAX_BYTES = 5 * 1024 * 1024  # 5MB per chunk

    documents_meta = {}  # Metadata only (embedded in HTML)
    chunks = []          # List of {files: {path: content}, size: N}
    current_chunk = {"files": {}, "size": 0}
    chunks.append(current_chunk)
    chunk_index = {}     # path -> chunk_number

    # Load ignore rules early so we can skip ignored files from chunks
    ignored_paths = config.get("graph_ignored_paths", [])
    
    def is_ignored_for_chunks(doc_path):
        for ignored in ignored_paths:
            if doc_path == ignored or doc_path.startswith(ignored + '/'):
                return True
        return False

    for doc_path, doc_data in data.get("documents", {}).items():
        # Build metadata entry (everything except content/base64/rows/data)
        meta = {}
        for key in doc_data:
            if key in ('content', 'base64', 'rows', 'data'):
                continue
            meta[key] = doc_data[key]
        documents_meta[doc_path] = meta

        # Skip ignored files from chunks entirely (metadata-only)
        if is_ignored_for_chunks(doc_path):
            continue

        # Get the content payload for chunking
        content_payload = {}
        if 'content' in doc_data:
            content_payload['content'] = doc_data['content']
        if 'base64' in doc_data:
            content_payload['base64'] = doc_data['base64']
        if 'rows' in doc_data:
            content_payload['rows'] = doc_data['rows']
        if 'data' in doc_data:
            content_payload['data'] = doc_data['data']

        if not content_payload:
            continue

        content_json = json.dumps(content_payload)
        content_size = len(content_json.encode('utf-8'))

        # Start new chunk if current would exceed limit
        if current_chunk["size"] + content_size > CHUNK_MAX_BYTES and current_chunk["files"]:
            current_chunk = {"files": {}, "size": 0}
            chunks.append(current_chunk)

        current_chunk["files"][doc_path] = content_payload
        current_chunk["size"] += content_size
        chunk_index[doc_path] = len(chunks) - 1

    # Write chunk files
    chunks_dir = os.path.join(script_dir, "chunks")
    os.makedirs(chunks_dir, exist_ok=True)
    # Clean old chunks
    for old_file in os.listdir(chunks_dir):
        if old_file.startswith("data_chunk_") and old_file.endswith(".json"):
            os.remove(os.path.join(chunks_dir, old_file))

    chunk_filenames = []
    for i, chunk in enumerate(chunks):
        chunk_filename = f"data_chunk_{i}.json"
        chunk_filenames.append(chunk_filename)
        with open(os.path.join(chunks_dir, chunk_filename), 'w', encoding='utf-8') as f:
            json.dump(chunk["files"], f)

    print(f"[Build] Split {len(data.get('documents', {}))} documents into {len(chunks)} chunks ({chunks_dir})")

    # Build the static payload for file:// mode
    # Ignored files get metadata only (no content), same as server mode
    static_data = dict(data)
    static_documents = {}
    for doc_path, doc_data in data.get("documents", {}).items():
        if is_ignored_for_chunks(doc_path):
            # Metadata only
            meta = {}
            for key in doc_data:
                if key in ('content', 'base64', 'rows', 'data'):
                    continue
                meta[key] = doc_data[key]
            meta['_ignored'] = True
            static_documents[doc_path] = meta
        else:
            static_documents[doc_path] = doc_data
    static_data["documents"] = static_documents

    ui_payload = {
        "DATA": static_data,
        "RULES": rules,
        "REPORT": report,
        "CONFIG": sanitized_config,
        "REVIEWS": reviews_data
    }

    # Also build a slim version for server mode (metadata only + chunk index)
    # Apply ignore rules: ignored paths get metadata-only (no chunk reference)
    slim_data = dict(data)
    slim_documents_meta = {}
    ignored_count = 0
    for doc_path, doc_data in data.get("documents", {}).items():
        meta = {}
        for key in doc_data:
            if key in ('content', 'base64', 'rows', 'data'):
                continue
            meta[key] = doc_data[key]
        if is_ignored_for_chunks(doc_path):
            meta['_ignored'] = True
            ignored_count += 1
        slim_documents_meta[doc_path] = meta
    slim_data["documents"] = slim_documents_meta
    slim_data["_chunk_index"] = chunk_index
    slim_data["_chunk_files"] = chunk_filenames
    slim_data["_chunks_dir"] = "chunks"
    if ignored_count:
        print(f"[Build] {ignored_count} files marked as ignored (metadata-only in index.html)")

    slim_payload = {
        "DATA": slim_data,
        "RULES": rules,
        "REPORT": report,
        "CONFIG": sanitized_config,
        "REVIEWS": reviews_data
    }

    # Bundle Frontend Assets
    frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')
    
    with open(os.path.join(frontend_dir, 'workspace.html'), 'r', encoding='utf-8') as f:
        html_template = f.read()
        
    with open(os.path.join(frontend_dir, 'css', 'main.css'), 'r', encoding='utf-8') as f:
        css_bundle = f.read()
        
    # Concatenate all JS modules in order
    js_modules = sorted([
        f for f in os.listdir(os.path.join(frontend_dir, 'js'))
        if f.endswith('.js') and f != '05_schema_ui.js'
    ])
    js_bundle = ""
    for js_file in js_modules:
        with open(os.path.join(frontend_dir, 'js', js_file), 'r', encoding='utf-8') as f:
            js_bundle += f.read() + "\n"

    title = config.get("title", "AXE-Anchor")
    final_html = html_template.replace('<title>DocVault Enterprise</title>', f'<title>{title}</title>')
    final_html = final_html.replace('<!-- __CSS_BUNDLE__ -->', css_bundle)
    final_html = final_html.replace('<!-- __JS_BUNDLE__ -->', f'<script>\n{js_bundle}\n</script>')
    
    # Base64 keeps large embedded JSON safe inside the script tag even when
    # scanned documents contain control characters or script-like text.
    
    # Server mode: slim HTML (3-4MB) that loads chunks via fetch
    slim_json_str = json.dumps(slim_payload)
    slim_payload_b64 = base64.b64encode(slim_json_str.encode('utf-8')).decode('ascii')
    slim_html = final_html.replace('__DATA_PLACEHOLDER__', slim_payload_b64)
    slim_html = slim_html.replace('<!-- PROVENANCE_PLACEHOLDER -->', provenance_html)

    # Static/file:// mode: full HTML with all content embedded
    full_json_str = json.dumps(ui_payload)
    full_payload_b64 = base64.b64encode(full_json_str.encode('utf-8')).decode('ascii')
    full_html = final_html.replace('__DATA_PLACEHOLDER__', full_payload_b64)
    full_html = full_html.replace('<!-- PROVENANCE_PLACEHOLDER -->', provenance_html)

    import re
    safe_id = re.sub(r'[^A-Za-z0-9_\-]', '_', active_workspace_id)
    ws_filename = f"workspace_{safe_id}.html"
    
    target_dir = paths["workspaces"]
                
    if not os.path.exists(target_dir):
        os.makedirs(target_dir, exist_ok=True)
        
    ws_out_path = os.path.join(target_dir, ws_filename)
    
    # Server mode index.html (slim, fast loading, uses chunks/)
    with open(ws_out_path, 'w', encoding='utf-8') as f:
        f.write(slim_html)
        
    out_path = paths["index"]
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(slim_html)

    # Static/offline full version (for file:// usage)
    static_path = os.path.join(script_dir, "index_static.html")
    with open(static_path, 'w', encoding='utf-8') as f:
        f.write(full_html)
    
    print(f"[Build] Server mode: index.html ({os.path.getsize(out_path) // 1024}KB)")
    print(f"[Build] Static mode: index_static.html ({os.path.getsize(static_path) // (1024*1024)}MB)")

    print(f"\nBuild complete. Status: {report['status']}")
    print(f"Scanned {len(data['documents'])} files.")
    print(f"Output -> {os.path.relpath(ws_out_path, script_dir)} (and {os.path.relpath(out_path, script_dir)})")
    print("-" * 50)

    global BUILD_ID
    BUILD_ID = int(time.time())
    constants_module.BUILD_ID = BUILD_ID
    return report, blocking

# ==============================================================================
# END OF SECTION 15: Incremental Cache Loader & Main Build Compiler Driver
