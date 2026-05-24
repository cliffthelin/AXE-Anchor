"""AXE-Anchor - HTTP request handler (auth, GET router, POST router)."""
import os, json, base64, time
import subprocess, sys
from http.server import SimpleHTTPRequestHandler
from pathlib import Path
from .. import constants as constants_module
from ..json_io import load_json, save_json
from ..compiler import run_build
from ..db_vault import check_schema, notifications_path, set_gate, store_connection, vault_status
from ..git_sync import promote_staged_candidate, stage_git_repo_candidate, sync_git_repo
from ..git_status import get_git_status
from ..constants import _axe_paths

SCRIPT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def axe_paths():
    return _axe_paths(SCRIPT_DIR)

def config_path():
    return axe_paths()["settings"]

def reviews_path():
    return axe_paths()["reviews"]

def resolve_configured_path(raw_path):
    path = Path(raw_path)
    if not path.is_absolute():
        path = Path(SCRIPT_DIR) / path
    return path.resolve()

def is_within(path, root):
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False

def workspace_resource_folders(workspace):
    folders = []
    context = workspace.get("context_folder")
    if isinstance(context, dict):
        folders.append((context, "Workspace Context"))

    supporting = workspace.get("supporting_resources")
    if isinstance(supporting, dict):
        folders.append((supporting, "Supporting Resources"))
    elif isinstance(supporting, list):
        folders.extend([(item, "Supporting Resources") for item in supporting if isinstance(item, dict)])

    projects = workspace.get("projects", [])
    if isinstance(projects, list):
        folders.extend([(item, None) for item in projects if isinstance(item, dict)])
    return folders

def configured_file_roots(config):
    roots = [Path(SCRIPT_DIR).resolve()]
    for ws in config.get("workspaces", []):
        for folder, _default_name in workspace_resource_folders(ws):
            if folder.get("path"):
                roots.append(resolve_configured_path(folder["path"]))
    return list(dict.fromkeys(roots))

def resolve_workspace_file_path(config, file_to_edit):
    parts = file_to_edit.split('/', 2)
    if len(parts) != 3:
        return (Path(SCRIPT_DIR) / file_to_edit).resolve()

    ws_name, folder_name, rel_path = parts
    for ws in config.get("workspaces", []):
        if ws.get("name") != ws_name:
            continue
        for folder, default_name in workspace_resource_folders(ws):
            if (folder.get("name", default_name) == folder_name) and folder.get("path"):
                return (resolve_configured_path(folder["path"]) / rel_path).resolve()
    return (Path(SCRIPT_DIR) / file_to_edit).resolve()

def allowed_folder_target(config, raw_path):
    if not raw_path:
        return None
    target = resolve_configured_path(raw_path)
    roots = configured_file_roots(config)
    if any(is_within(target, root) for root in roots):
        return target
    return None

class BuilderHTTPRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Allow builder.py to inject CLI args on the class before handling requests
        self.args = getattr(self.__class__, 'args', type('Args', (), {'watch': False, 'rebuild': False})())
        super().__init__(*args, **kwargs)

    def end_headers(self):
        origin = self.headers.get('Origin')
        allowed_origins = {
            f"http://127.0.0.1:{self.server.server_port}",
            f"http://localhost:{self.server.server_port}",
            "null",
        }
        if origin in allowed_origins:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    # --------------------------------------------------------------------------
    # CORS & HTTP Method Handlers (Subsection of Section 18)
    # --------------------------------------------------------------------------

    # ==========================================================================
    # START OF SECTION 19: HTTP Authentication Guard & Basic Auth Handlers
    # Description: Basic authorization header validation using bcrypt passwords,
    # and issuing 401 unauthorized responses.
    # ==========================================================================
    def check_authentication(self):
        try:
            config = load_json(config_path(), {})
            password_hash = config.get("password_hash")
            if not password_hash:
                return True

            auth_header = self.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Basic '):
                self.send_unauthorized()
                return False

            try:
                encoded_credentials = auth_header.split(' ', 1)[1]
                decoded_credentials = base64.b64decode(encoded_credentials).decode('utf-8')
                username, password = decoded_credentials.split(':', 1)
            except Exception:
                self.send_unauthorized()
                return False

            import bcrypt
            if bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
                return True
            else:
                self.send_unauthorized()
                return False
        except Exception as e:
            print(f"[Auth Error] {e}")
            self.send_unauthorized()
            return False

    def send_unauthorized(self):
        self.send_response(401)
        self.send_header('WWW-Authenticate', 'Basic realm="Reversa SDD Explorer"')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "error", "message": "Unauthorized"}).encode())
    # ==========================================================================
    # END OF SECTION 19: HTTP Authentication Guard & Basic Auth Handlers
    # ==========================================================================

    # ==========================================================================
    # START OF SECTION 20: HTTP GET Requests Router
    # Description: Handler for HTTP GET requests, serving explorer workspaces data,
    # git status, and watch status.
    # ==========================================================================
    def do_GET(self):
        if not self.check_authentication():
            return
        if self.path == '/watch-id':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"build_id": constants_module.BUILD_ID, "watch": getattr(self.args, 'watch', False)}).encode())
        elif self.path == '/api/workspaces':
            try:
                config = load_json(config_path(), {})
                workspaces = config.get("workspaces", [])
                token = config.get("github_token")

                for ws in workspaces:
                    git_statuses = {}
                    for proj in ws.get("projects", []):
                        if proj.get("type") == "github_repo":
                            local_dir = proj.get("path")
                            repo = proj.get("github_repo")
                            branch = proj.get("github_branch", "main")
                            if local_dir and repo:
                                if not os.path.isabs(local_dir):
                                    local_dir = os.path.abspath(os.path.join(SCRIPT_DIR, local_dir))
                                git_statuses[proj.get("name")] = get_git_status(local_dir, repo, branch, token)
                    ws["git_statuses"] = git_statuses

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "workspaces": workspaces,
                    "github_token_configured": bool(token),
                    "password_protection_enabled": bool(config.get("password_hash"))
                }).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode())
        elif self.path == '/api/reviews':
            try:
                reviews_data = load_json(reviews_path(), {})
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(reviews_data).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode())
        elif self.path == '/api/governance/projects':
            try:
                config = load_json(config_path(), {})
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "projects": config.get("projects", []),
                    "active_project_id": config.get("active_project_id", ""),
                    "orphan_projects": config.get("orphan_projects", [])
                }).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode())
        elif self.path == '/api/db-vault/status':
            try:
                config = load_json(config_path(), {})
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                status = vault_status(axe_paths())
                status["app_gate_configured"] = bool(config.get("password_hash"))
                status["db_actions_enabled"] = bool(config.get("password_hash"))
                self.wfile.write(json.dumps(status).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode())
        elif self.path == '/api/dependency-hub/notifications':
            try:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "notifications": load_json(notifications_path(axe_paths()), [])
                }).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode())
        elif self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
        else:
            super().do_GET()
    # ==========================================================================
    # END OF SECTION 20: HTTP GET Requests Router
    # ==========================================================================

    # ==========================================================================
    # START OF SECTION 21: HTTP POST Requests API Router
    # Description: Handler for HTTP POST requests, implementing workspace saves,
    # deletions, GitHub token authentication config, and Git pull/clone syncs.
    # ==========================================================================
    def do_POST(self):
        if not self.check_authentication():
            return
        if self.path == '/run-builder':
            try:
                print("\n[Server] Triggering build...")
                r, b = run_build(SCRIPT_DIR, force_rebuild=getattr(self.args, 'rebuild', False))
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "report_status": r["status"]}).encode())
            except Exception as e:
                print(f"[Server] Build failed: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode())
        elif self.path in ('/api/workspaces/save', '/api/workspaces/delete', '/api/workspaces/remove-project', '/api/workspaces/sync', '/api/workspaces/promote-sync', '/api/workspace/activate', '/api/github/auth', '/api/security/set-password', '/api/security/disable-password', '/api/reviews/update', '/api/file/edit', '/api/folder/create', '/api/folder/stats', '/api/folder/list', '/api/governance/projects', '/api/governance/project/switch', '/api/db-vault/set-gate', '/api/db-vault/store-connection', '/api/db-vault/check-schema', '/api/db-vault/install-drivers', '/api/settings/ignored-paths', '/api/orphan-projects/adopt'):
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                req_data = json.loads(post_data.decode('utf-8'))

                cfg_path = config_path()
                config = load_json(cfg_path, {})
                workspaces = config.get("workspaces", [])
                token = config.get("github_token")

                resp_data = {"status": "success"}
                should_rebuild = False

                if self.path.startswith('/api/db-vault/') and not config.get("password_hash"):
                    resp_data = {
                        "status": "error",
                        "message": "Configure the main application password before enabling database credential storage or direct schema checks.",
                    }

                if resp_data.get("status") == "error":
                    pass
                elif self.path == '/api/governance/projects':
                    name = req_data.get("name")
                    sources = req_data.get("sources", [])
                    desc = req_data.get("description", "")
                    if not name:
                        resp_data = {"status": "error", "message": "Project Name is required."}
                    else:
                        project_id = name.lower().replace(" ", "-")
                        target_path = ""
                        if sources:
                            target_path = sources[0].get("target", "")
                        new_project = {
                            "id": project_id,
                            "name": name,
                            "sources": sources,
                            "description": desc,
                            "reversa_target": target_path,
                            "created_at": time.strftime('%Y-%m-%dT%H:%M:%SZ')
                        }
                        projects = config.get("projects", [])
                        found = False
                        for i, p in enumerate(projects):
                            if p.get("id") == project_id:
                                projects[i] = new_project
                                found = True
                                break
                        if not found:
                            projects.append(new_project)
                        config["projects"] = projects
                        save_json(cfg_path, config)
                        should_rebuild = True
                        resp_data = {"status": "success", "project": new_project}

                elif self.path == '/api/governance/project/switch':
                    proj_id = req_data.get("project_id")
                    config["active_project_id"] = proj_id or ""
                    save_json(cfg_path, config)
                    resp_data = {"status": "success", "active_project_id": proj_id or ""}

                elif self.path == '/api/workspace/activate':
                    workspace_id = req_data.get("workspace_id") or req_data.get("id") or req_data.get("name")
                    target = next((w for w in workspaces if w.get("id") == workspace_id or w.get("name") == workspace_id), None)
                    if not target:
                        resp_data = {"status": "error", "message": "Workspace not found."}
                    else:
                        import re
                        safe_id = re.sub(r'[^A-Za-z0-9_\-]', '_', target.get("id") or target.get("name"))
                        filename = f"workspace_{safe_id}.html"
                        config["active_workspace_id"] = target.get("id") or target.get("name")
                        config["last_workspace_id"] = config["active_workspace_id"]
                        save_json(cfg_path, config)
                        should_rebuild = True
                        resp_data = {"status": "success", "active_workspace_id": config["active_workspace_id"], "filename": filename}

                elif self.path == '/api/workspaces/save':
                    ws_name = req_data.get("name")
                    found = False
                    for i, ws in enumerate(workspaces):
                        if ws.get("name") == ws_name:
                            workspaces[i] = req_data
                            found = True
                            break
                    if not found:
                        workspaces.append(req_data)
                    config["workspaces"] = workspaces
                    save_json(cfg_path, config)
                    should_rebuild = True

                elif self.path == '/api/workspaces/delete':
                    ws_name = req_data.get("name")
                    config["workspaces"] = [ws for ws in workspaces if ws.get("name") != ws_name]
                    save_json(cfg_path, config)
                    should_rebuild = True

                elif self.path == '/api/workspaces/remove-project':
                    ws_name = req_data.get("workspace_name")
                    proj_name = req_data.get("project_name")
                    if not ws_name or not proj_name:
                        resp_data = {"status": "error", "message": "workspace_name and project_name are required."}
                    else:
                        ws = next((w for w in workspaces if w.get("name") == ws_name), None)
                        if not ws:
                            resp_data = {"status": "error", "message": "Workspace not found."}
                        else:
                            removed = None
                            original_projects = ws.get("projects", [])
                            new_projects = []
                            for p in original_projects:
                                if p.get("name") == proj_name:
                                    removed = p
                                else:
                                    new_projects.append(p)
                            if not removed:
                                resp_data = {"status": "error", "message": "Project not found in workspace."}
                            else:
                                ws["projects"] = new_projects
                                # Track as orphan project for later re-assignment
                                orphans = config.get("orphan_projects", [])
                                orphan_entry = {
                                    "name": removed.get("name"),
                                    "path": removed.get("path"),
                                    "type": removed.get("type", "local_folder"),
                                    "removed_from": ws_name,
                                    "removed_at": time.strftime('%Y-%m-%dT%H:%M:%SZ')
                                }
                                if removed.get("github_repo"):
                                    orphan_entry["github_repo"] = removed["github_repo"]
                                    orphan_entry["github_branch"] = removed.get("github_branch", "main")
                                # Avoid duplicates
                                if not any(o.get("name") == orphan_entry["name"] and o.get("path") == orphan_entry["path"] for o in orphans):
                                    orphans.append(orphan_entry)
                                config["orphan_projects"] = orphans
                                config["workspaces"] = workspaces
                                save_json(cfg_path, config)
                                should_rebuild = True
                                resp_data = {"status": "success", "message": f"Removed '{proj_name}' from '{ws_name}'. Project files are untouched."}

                elif self.path == '/api/settings/ignored-paths':
                    action = req_data.get("action", "get")
                    ignored = config.get("graph_ignored_paths", [])
                    if action == "set":
                        config["graph_ignored_paths"] = req_data.get("paths", [])
                        save_json(cfg_path, config)
                        resp_data = {"status": "success", "paths": config["graph_ignored_paths"]}
                    elif action == "add":
                        path_to_add = req_data.get("path", "")
                        if path_to_add and path_to_add not in ignored:
                            ignored.append(path_to_add)
                            config["graph_ignored_paths"] = ignored
                            save_json(cfg_path, config)
                        resp_data = {"status": "success", "paths": ignored}
                    elif action == "remove":
                        path_to_remove = req_data.get("path", "")
                        ignored = [p for p in ignored if p != path_to_remove]
                        config["graph_ignored_paths"] = ignored
                        save_json(cfg_path, config)
                        resp_data = {"status": "success", "paths": ignored}
                    else:
                        resp_data = {"status": "success", "paths": ignored}

                elif self.path == '/api/orphan-projects/adopt':
                    proj_name = req_data.get("project_name")
                    target_workspace = req_data.get("workspace_name")
                    if not proj_name or not target_workspace:
                        resp_data = {"status": "error", "message": "project_name and workspace_name are required."}
                    else:
                        orphans = config.get("orphan_projects", [])
                        orphan = next((o for o in orphans if o.get("name") == proj_name), None)
                        ws = next((w for w in workspaces if w.get("name") == target_workspace), None)
                        if not orphan:
                            resp_data = {"status": "error", "message": "Orphan project not found."}
                        elif not ws:
                            resp_data = {"status": "error", "message": "Target workspace not found."}
                        else:
                            new_proj = {
                                "name": orphan["name"],
                                "type": orphan.get("type", "local_folder"),
                                "path": orphan.get("path", ""),
                                "enabled": True
                            }
                            if orphan.get("github_repo"):
                                new_proj["github_repo"] = orphan["github_repo"]
                                new_proj["github_branch"] = orphan.get("github_branch", "main")
                            ws.setdefault("projects", []).append(new_proj)
                            config["orphan_projects"] = [o for o in orphans if o.get("name") != proj_name]
                            config["workspaces"] = workspaces
                            save_json(cfg_path, config)
                            should_rebuild = True
                            resp_data = {"status": "success", "message": f"'{proj_name}' added to '{target_workspace}'."}


                elif self.path == '/api/github/auth':
                    if not config.get("password_hash") and req_data.get("github_token"):
                        resp_data = {"status": "error", "message": "Access password must be configured under Security before storing GitHub credentials."}
                    else:
                        config["github_token"] = req_data.get("github_token")
                        save_json(cfg_path, config)

                elif self.path == '/api/security/set-password':
                    new_password = req_data.get("password")
                    if not new_password:
                        resp_data = {"status": "error", "message": "Password cannot be empty."}
                    else:
                        import bcrypt
                        hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                        config["password_hash"] = hashed
                        save_json(cfg_path, config)
                        resp_data = {"status": "success", "message": "Password updated successfully."}

                elif self.path == '/api/security/disable-password':
                    if "password_hash" in config:
                        del config["password_hash"]
                        save_json(cfg_path, config)
                    resp_data = {"status": "success", "message": "Password protection disabled."}

                elif self.path == '/api/workspaces/sync':
                    sync_all = req_data.get("sync_all", False)
                    if sync_all:
                        msgs = []
                        staged = []
                        for ws in workspaces:
                            for proj in ws.get("projects", []):
                                if proj.get("type") == "github_repo":
                                    local_dir = proj.get("path")
                                    repo = proj.get("github_repo") or proj.get("url")
                                    branch = proj.get("github_branch", "main")
                                    if local_dir and repo:
                                        if not os.path.isabs(local_dir):
                                            local_dir = os.path.abspath(os.path.join(SCRIPT_DIR, local_dir))
                                        success, detail = stage_git_repo_candidate(local_dir, repo, branch, os.path.join(axe_paths()["cache"], "git-sync-candidates"), token)
                                        staged.append(detail)
                                        msgs.append(f"{ws.get('name')} - {proj.get('name')}: {detail.get('status')}")
                        if msgs:
                            resp_data["message"] = "; ".join(msgs)
                            resp_data["staged_candidates"] = staged
                        else:
                            resp_data = {"status": "error", "message": "No GitHub repositories configured to sync."}
                    else:
                        ws_name = req_data.get("name")
                        ws = next((w for w in workspaces if w.get("name") == ws_name), None)
                        if ws:
                            msgs = []
                            staged = []
                            for proj in ws.get("projects", []):
                                if proj.get("type") == "github_repo":
                                    local_dir = proj.get("path")
                                    repo = proj.get("github_repo") or proj.get("url")
                                    branch = proj.get("github_branch", "main")
                                    if local_dir and repo:
                                        if not os.path.isabs(local_dir):
                                            local_dir = os.path.abspath(os.path.join(SCRIPT_DIR, local_dir))
                                        success, detail = stage_git_repo_candidate(local_dir, repo, branch, os.path.join(axe_paths()["cache"], "git-sync-candidates"), token)
                                        staged.append(detail)
                                        msgs.append(f"{proj.get('name')}: {detail.get('status')}")
                            if msgs:
                                resp_data["message"] = "; ".join(msgs)
                                resp_data["staged_candidates"] = staged
                            else:
                                resp_data = {"status": "error", "message": "No GitHub repositories configured for this workspace."}
                        else:
                            resp_data = {"status": "error", "message": "Workspace not found."}

                elif self.path == '/api/workspaces/promote-sync':
                    ok, detail = promote_staged_candidate(
                        req_data.get("candidate_path", ""),
                        req_data.get("original_path", ""),
                        os.path.join(axe_paths()["cache"], "git-sync-backups"),
                        confirm_promote=bool(req_data.get("confirm_promote")),
                    )
                    resp_data = {"status": "success" if ok else "error", **detail}
                    should_rebuild = ok

                elif self.path == '/api/reviews/update':
                    rev_path = reviews_path()
                    reviews_data = load_json(rev_path, {})
                    file_path = req_data.get("filePath")
                    if file_path:
                        reviews_data[file_path] = {
                            "status": req_data.get("status"),
                            "confidence": req_data.get("confidence"),
                            "comments": req_data.get("comments", [])
                        }
                        save_json(rev_path, reviews_data)
                    resp_data = {"status": "success", "reviews": reviews_data}

                elif self.path == '/api/db-vault/set-gate':
                    ok, detail = set_gate(axe_paths(), req_data.get("password", ""))
                    resp_data = {"status": "success" if ok else "error", **detail}

                elif self.path == '/api/db-vault/store-connection':
                    ok, detail = store_connection(
                        axe_paths(),
                        req_data.get("vault_password", ""),
                        req_data.get("connection", {}),
                    )
                    resp_data = {"status": "success" if ok else "error", **detail}

                elif self.path == '/api/db-vault/check-schema':
                    manifest = load_json(axe_paths()["manifest"], {})
                    result = check_schema(
                        axe_paths(),
                        req_data.get("vault_password", ""),
                        req_data.get("connection_name", ""),
                        documents=manifest.get("documents", {}),
                    )
                    resp_data = {"status": "success", **result}

                elif self.path == '/api/db-vault/install-drivers':
                    script_path = os.path.join(
                        SCRIPT_DIR,
                        "plugins",
                        "axe-db-drivers",
                        "scripts",
                        "install_python_drivers.sh",
                    )
                    if not os.path.exists(script_path):
                        resp_data = {
                            "status": "error",
                            "message": "Database driver installer script was not found.",
                            "script": script_path,
                        }
                    else:
                        env = os.environ.copy()
                        env["PYTHON_BIN"] = sys.executable
                        try:
                            result = subprocess.run(
                                [script_path],
                                cwd=SCRIPT_DIR,
                                env=env,
                                capture_output=True,
                                text=True,
                                timeout=900,
                            )
                            resp_data = {
                                "status": "success" if result.returncode == 0 else "error",
                                "message": "Python database driver packages installed." if result.returncode == 0 else "Database driver installation failed.",
                                "code": result.returncode,
                                "script": script_path,
                                "python": sys.executable,
                                "stdout": result.stdout[-8000:],
                                "stderr": result.stderr[-8000:],
                            }
                        except subprocess.TimeoutExpired as exc:
                            resp_data = {
                                "status": "error",
                                "message": "Database driver installation timed out after 15 minutes.",
                                "script": script_path,
                                "python": sys.executable,
                                "stdout": (exc.stdout or "")[-8000:],
                                "stderr": (exc.stderr or "")[-8000:],
                            }

                elif self.path == '/api/file/edit':
                    file_to_edit = req_data.get("filePath")
                    new_content = req_data.get("content")
                    if not file_to_edit or new_content is None:
                        resp_data = {"status": "error", "message": "filePath and content are required."}
                    else:
                        abs_path = resolve_workspace_file_path(config, file_to_edit)
                        allowed = any(is_within(abs_path, root) for root in configured_file_roots(config))

                        if allowed and abs_path.exists():
                            with abs_path.open('w', encoding='utf-8') as f:
                                f.write(new_content)
                            resp_data = {"status": "success"}
                            should_rebuild = True
                        else:
                            resp_data = {"status": "error", "message": "Access denied or file does not exist."}

                elif self.path == '/api/folder/create':
                    folder_path = req_data.get("path", "")
                    target = allowed_folder_target(config, folder_path)
                    if not target:
                        resp_data = {"status": "error", "message": "Folder path is outside configured workspace/project roots."}
                    elif target.exists() and not target.is_dir():
                        resp_data = {"status": "error", "message": "Target exists but is not a folder."}
                    else:
                        target.mkdir(parents=True, exist_ok=True)
                        resp_data = {"status": "success", "path": str(target), "message": "Folder is ready."}

                elif self.path == '/api/folder/stats':
                    folder_path = req_data.get("path", "")
                    target = allowed_folder_target(config, folder_path)
                    if not target:
                        resp_data = {"status": "error", "message": "Folder path is outside configured workspace/project roots."}
                    elif not target.exists() or not target.is_dir():
                        resp_data = {"status": "error", "message": "Folder does not exist."}
                    else:
                        excluded = set(config.get("exclude", []))

                        def is_excluded(path):
                            return any(part in excluded for part in path.parts)

                        direct_files = 0
                        total_files = 0
                        total_folders = 0
                        for child in target.iterdir():
                            if is_excluded(child.relative_to(target)):
                                continue
                            if child.is_file():
                                direct_files += 1

                        for item in target.rglob("*"):
                            rel = item.relative_to(target)
                            if is_excluded(rel):
                                continue
                            if item.is_file():
                                total_files += 1
                            elif item.is_dir():
                                total_folders += 1

                        resp_data = {
                            "status": "success",
                            "path": str(target),
                            "direct_files": direct_files,
                            "total_files": total_files,
                            "total_folders": total_folders,
                        }

                elif self.path == '/api/folder/list':
                    folder_path = req_data.get("path", "")
                    if not folder_path:
                        target = Path(SCRIPT_DIR).parent.resolve()
                    else:
                        target = Path(folder_path).resolve()

                    if not target.exists() or not target.is_dir():
                        alt_target = (Path(SCRIPT_DIR) / folder_path).resolve()
                        if alt_target.exists() and alt_target.is_dir():
                            target = alt_target
                        else:
                            target = Path(SCRIPT_DIR).parent.resolve()

                    subdirs = []
                    try:
                        for child in target.iterdir():
                            if child.is_dir() and not child.name.startswith('.'):
                                subdirs.append(child.name)
                        subdirs.sort(key=str.lower)
                        resp_data = {
                            "status": "success",
                            "current_path": str(target),
                            "parent_path": str(target.parent) if target.parent != target else None,
                            "subdirs": subdirs
                        }
                    except Exception as e:
                        resp_data = {"status": "error", "message": f"Access error: {str(e)}"}


                if should_rebuild and resp_data.get("status") != "error":
                    run_build(SCRIPT_DIR, force_rebuild=False)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(resp_data).encode())

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode())
        else:
            self.send_error(404)

    # ==========================================================================
    # END OF SECTION 21: HTTP POST Requests API Router
    # ==========================================================================
