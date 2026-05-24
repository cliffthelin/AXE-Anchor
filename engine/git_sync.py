"""AXE-Anchor — Git clone/pull orchestration."""
import json, os, shutil, time
from .git_runner import run_git_cmd

# START OF SECTION 05: Git Workspace Pull & Sync Orchestration
# Description: Handles cloning and pulling repositories securely from GitHub remote origins.
# ==============================================================================
def sync_git_repo(local_dir, repo, branch, token=None):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    abs_dir = os.path.join(script_dir, local_dir) if not os.path.isabs(local_dir) else local_dir
    
    os.makedirs(os.path.dirname(abs_dir), exist_ok=True)
    
    if not os.path.exists(os.path.join(abs_dir, '.git')):
        clone_url = f"https://github.com/{repo}.git"
        if repo.startswith("https://") or repo.startswith("git@"):
            clone_url = repo
            
        args = ["git", "clone"]
        if branch:
            args += ["-b", branch]
        args += [clone_url, abs_dir]
        
        code, out, err = run_git_cmd(args, token=token)
        if code != 0:
            return False, f"Clone failed: {err}"
        return True, "Cloned successfully."
    else:
        # Clean up pre-existing embedded token in remote origin URL if present
        code, url, err = run_git_cmd(["git", "remote", "get-url", "origin"], cwd=abs_dir, token=token)
        if code == 0 and url.startswith("https://") and "@" in url:
            clean_url = "https://" + url.split("@")[-1]
            run_git_cmd(["git", "remote", "set-url", "origin", clean_url], cwd=abs_dir, token=token)
            
        code, out, err = run_git_cmd(["git", "pull", "origin", branch or "main"], cwd=abs_dir, token=token)
        if code != 0:
            return False, f"Pull failed: {err}"
        return True, "Pulled successfully."

def repo_url_for(repo):
    if repo.startswith("https://") or repo.startswith("git@"):
        return repo
    return f"https://github.com/{repo}.git"

def run_repo_tests(repo_dir):
    checks = []
    if os.path.exists(os.path.join(repo_dir, "pytest.ini")) or os.path.exists(os.path.join(repo_dir, "tests")):
        checks.append(["python3", "-m", "pytest"])
    if os.path.exists(os.path.join(repo_dir, "package.json")):
        checks.append(["npm", "test"])
    if any(name.endswith(".sln") or name.endswith(".csproj") for name in os.listdir(repo_dir)):
        checks.append(["dotnet", "test"])

    if not checks:
        return {"status": "skipped", "message": "No recognized test runner found.", "checks": []}

    results = []
    ok = True
    for cmd in checks:
        code, out, err = run_git_cmd(cmd, cwd=repo_dir)
        results.append({"command": " ".join(cmd), "code": code, "stdout": out[-4000:], "stderr": err[-4000:]})
        if code != 0:
            ok = False
    return {"status": "passed" if ok else "failed", "checks": results}

def stage_git_repo_candidate(local_dir, repo, branch, staging_root, token=None):
    """Fetch a candidate copy into staging_root and test it without mutating local_dir."""
    abs_original = os.path.abspath(local_dir)
    repo_name = os.path.basename(abs_original.rstrip('/\\')) or "repo"
    stamp = time.strftime("%Y%m%d-%H%M%S")
    candidate_dir = os.path.join(staging_root, f"{repo_name}-{stamp}")
    os.makedirs(staging_root, exist_ok=True)

    clone_url = repo_url_for(repo)
    args = ["git", "clone"]
    if branch:
        args += ["-b", branch]
    args += [clone_url, candidate_dir]
    code, out, err = run_git_cmd(args, token=token)
    if code != 0:
        shutil.rmtree(candidate_dir, ignore_errors=True)
        return False, {"status": "clone_failed", "message": err, "candidate_path": candidate_dir}

    test_result = run_repo_tests(candidate_dir)
    passed = test_result["status"] in ("passed", "skipped")
    detail = {
        "status": "ready_for_review" if passed else "tests_failed",
        "message": "Candidate staged. Original repository was not changed.",
        "candidate_path": candidate_dir,
        "original_path": abs_original,
        "repo": repo,
        "branch": branch or "main",
        "tests": test_result,
    }
    with open(os.path.join(candidate_dir, ".axe-sync-candidate.json"), "w", encoding="utf-8") as f:
        json.dump(detail, f, indent=2)
    return passed, detail

def promote_staged_candidate(candidate_path, original_path, backups_root, confirm_promote=False):
    if not confirm_promote:
        return False, {"status": "approval_required", "message": "Promotion requires confirm_promote=true."}
    candidate = os.path.abspath(candidate_path)
    original = os.path.abspath(original_path)
    backups = os.path.abspath(backups_root)
    if not os.path.exists(candidate):
        return False, {"status": "missing_candidate", "message": "Candidate path does not exist."}
    if not candidate.startswith(os.path.abspath(os.path.dirname(backups))):
        return False, {"status": "invalid_candidate", "message": "Candidate is outside AXE-Anchor managed cache."}
    meta_path = os.path.join(candidate, ".axe-sync-candidate.json")
    try:
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)
    except Exception:
        return False, {"status": "missing_candidate_metadata", "message": "Candidate test metadata is missing."}
    if meta.get("status") != "ready_for_review" or meta.get("tests", {}).get("status") not in ("passed", "skipped"):
        return False, {"status": "tests_not_approved", "message": "Candidate tests did not pass or were not marked as legitimately skipped."}

    os.makedirs(backups, exist_ok=True)
    backup_path = None
    if os.path.exists(original):
        backup_path = os.path.join(backups, os.path.basename(original.rstrip('/\\')) + "-" + time.strftime("%Y%m%d-%H%M%S"))
        shutil.move(original, backup_path)
    os.makedirs(os.path.dirname(original), exist_ok=True)
    shutil.move(candidate, original)
    return True, {
        "status": "promoted",
        "message": "Candidate promoted. Previous original was moved to backup.",
        "original_path": original,
        "backup_path": backup_path,
    }
# ==============================================================================
# END OF SECTION 05: Git Workspace Pull & Sync Orchestration
