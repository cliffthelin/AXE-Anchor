"""AXE-Anchor — Path utilities, exclusion checks, directory walker."""
import os
from pathlib import Path
from .constants import SUPPORTED

# START OF SECTION 01: System Exclusion Checks & Workspace Path Resolution Utilities
# Description: Checks files against exclusions (like settings.json, .env, secrets)
# and resolves directories and paths for multiple repository workspaces.
# ==============================================================================
def is_system_file(p, script_dir, system_names=None, system_patterns=None):
    try:
        name = p.name.lower()
        names = system_names or {'settings.json', '.env'}
        patterns = system_patterns or ['secret', 'credential']
        if name in names or any(pat in name for pat in patterns):
            return True
        if p.parent == Path(script_dir):
            if name.startswith('index') and name.endswith('.html'): return True
            if name.startswith('manifest') and name.endswith('.json'): return True
            if name.startswith('validation_report') and name.endswith('.json'): return True
            if name.startswith('audit_history') and name.endswith('.json'): return True
            if name.startswith('builder') and name.endswith('.py'): return True
            if name.startswith('docvault.') and name.endswith('.json'): return True
    except: pass
    return False

def get_code_repo_paths(config):
    workspaces = config.get("workspaces", [])
    if workspaces:
        paths = []
        for ws in workspaces:
            if ws.get("context_folder") and isinstance(ws["context_folder"], dict) and ws["context_folder"].get("path"):
                paths.append(ws["context_folder"]["path"])
            
            projects = ws.get("projects", [])
            if isinstance(projects, list):
                for p in projects:
                    if isinstance(p, dict) and p.get("path"):
                        paths.append(p["path"])
            
            supp_res = ws.get("supporting_resources")
            if supp_res:
                if isinstance(supp_res, list):
                    for r in supp_res:
                        if isinstance(r, dict) and r.get("path"):
                            paths.append(r["path"])
                elif isinstance(supp_res, dict) and supp_res.get("path"):
                    paths.append(supp_res["path"])
        return list(set(paths))
    code_repo_paths = config.get("code_repo_path", "REPO")
    if isinstance(code_repo_paths, str):
        code_repo_paths = [code_repo_paths]
    return code_repo_paths

def is_in_repo_paths(rel_path_str, code_repo_paths):
    for rp in code_repo_paths:
        rp_norm = rp.replace('\\', '/').rstrip('/')
        rel_norm = rel_path_str.replace('\\', '/')
        if rel_norm.startswith(rp_norm + '/') or rel_norm == rp_norm:
            return True
# Data-dump detection — keywords that strongly suggest DB export / output files
_DATA_DUMP_KEYWORDS = {
    "export", "dump", "output", "extract", "dataset",
    "report", "snapshot", "backup", "archive"
}
# Size thresholds above which a data-capable file is treated as a likely dump (bytes)
_DATA_DUMP_THRESHOLDS = {
    ".csv":  200 * 1024,   # 200 KB
    ".json": 512 * 1024,   # 512 KB
    ".xlsx": 512 * 1024,
    ".xls":  512 * 1024,
}

def is_data_dump(p, ext):
    """Return (True, reason_str) if the file looks like a database output/data dump."""
    threshold = _DATA_DUMP_THRESHOLDS.get(ext)
    if threshold is None:
        return False, ""
    try:
        size = p.stat().st_size
    except OSError:
        return False, ""
    stem_lower = p.stem.lower()
    keyword_hit = next((kw for kw in _DATA_DUMP_KEYWORDS if kw in stem_lower), None)
    if size > threshold and keyword_hit:
        return True, f"size={size//1024}KB, keyword='{keyword_hit}'"
    # Even without a keyword, very large data files are deferred
    hard_limit = threshold * 10
    if size > hard_limit:
        return True, f"size={size//1024}KB exceeds hard limit"
    return False, ""

def walk_pruned(root_path, exclude_list, ext_filter=None, config=None):
    abs_root = os.path.abspath(root_path)
    excl = [x.lower() for x in exclude_list]
    
    # Read backup patterns from config or use defaults
    rules = (config or {}).get("scanner_rules", {})
    backup_patterns = set(rules.get("exclude_folder_patterns", ["backup", "backups", "restore", "temp", "tmp"]))
    skip_hidden = rules.get("skip_hidden_folders", True)
    
    for root, dirs, files in os.walk(abs_root, topdown=True):
        abs_root_walk = os.path.abspath(root)
        
        # Robust path boundary check: prevent traversing outside the designated root
        try:
            # relative_to will raise ValueError if abs_root_walk is not a subpath of abs_root
            Path(abs_root_walk).relative_to(Path(abs_root))
        except ValueError:
            # We have escaped the root directory boundary (e.g. via parent/symlink)
            dirs[:] = []
            continue
            
        pruned_dirs = []
        for d in dirs:
            d_lower = d.lower()
            
            # Prune excluded patterns from settings.json
            if any(x in d_lower for x in excl):
                continue
                
            # Prune known recursive deep backup/temp structures
            if any(x in d_lower for x in backup_patterns):
                continue
                
            # Boundary checks: do not descend into hidden folders, parent folders or invalid characters
            if skip_hidden and d.startswith('.'):
                continue
            if '..' in d or '/' in d or '\\' in d:
                continue
                
            # Guard against "File name too long" and excessively deep directory paths
            full_sub_path = os.path.join(abs_root_walk, d)
            if len(full_sub_path) > 240 or len(d) > 100:
                continue
                
            pruned_dirs.append(d)
            
        dirs[:] = pruned_dirs
        
        for f in files:
            # Boundary/Safety check for file names
            if f.startswith('.') or '..' in f or '/' in f or '\\' in f:
                continue
                
            full_file_path = os.path.join(abs_root_walk, f)
            
            # Guard against file names or paths that are too long
            if len(full_file_path) > 250 or len(f) > 150:
                continue
                
            if ext_filter is not None:
                ext = os.path.splitext(f)[1].lower()
                if ext not in ext_filter:
                    continue
                    
            yield Path(full_file_path)
# ==============================================================================
# END OF SECTION 01: System Exclusion Checks & Workspace Path Resolution Utilities
