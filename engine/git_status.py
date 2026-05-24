"""AXE-Anchor — Git sync status analyzer."""
import os
from .git_runner import run_git_cmd

# START OF SECTION 04: Git Workspace Sync Status Analyzer
# Description: Checks the local clone status, URL formatting, and commit status
# relative to origin to report out-of-sync or diverged states.
# ==============================================================================
def get_git_status(local_dir, repo, branch, token=None):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    abs_dir = os.path.join(script_dir, local_dir) if not os.path.isabs(local_dir) else local_dir
    
    if not os.path.exists(os.path.join(abs_dir, '.git')):
        return {"status": "not_cloned", "message": "Repository not cloned locally."}
        
    code, url, err = run_git_cmd(["git", "remote", "get-url", "origin"], cwd=abs_dir, token=token)
    if code != 0:
        return {"status": "error", "message": f"Failed to get remote URL: {err}"}
        
    # Clean up pre-existing embedded token in remote origin URL if present
    if url.startswith("https://") and "@" in url:
        clean_url = "https://" + url.split("@")[-1]
        run_git_cmd(["git", "remote", "set-url", "origin", clean_url], cwd=abs_dir, token=token)
        url = clean_url
        
    code, out, err = run_git_cmd(["git", "fetch", "origin"], cwd=abs_dir, token=token)
    if code != 0:
        return {"status": "auth_required", "message": f"Git fetch failed (auth or network issue): {err}"}
        
    code, local_head, err = run_git_cmd(["git", "rev-parse", "HEAD"], cwd=abs_dir, token=token)
    if code != 0:
        return {"status": "error", "message": f"Failed to parse local HEAD: {err}"}
        
    remote_ref = f"origin/{branch}" if branch else "origin/main"
    code, remote_head, err = run_git_cmd(["git", "rev-parse", remote_ref], cwd=abs_dir, token=token)
    if code != 0:
        return {"status": "error", "message": f"Failed to parse remote {remote_ref}: {err}"}
        
    if local_head == remote_head:
        return {"status": "up_to_date", "message": "Up to date."}
        
    code, out, err = run_git_cmd(["git", "merge-base", "--is-ancestor", "HEAD", remote_ref], cwd=abs_dir, token=token)
    if code == 0:
        code_cnt, count, err_cnt = run_git_cmd(["git", "rev-list", "--count", "HEAD.."+remote_ref], cwd=abs_dir, token=token)
        behind_msg = f"{count} commits behind remote." if code_cnt == 0 else "Behind remote."
        return {"status": "out_of_sync", "message": behind_msg}
        
    return {"status": "diverged", "message": "Diverged from remote."}
# ==============================================================================
# END OF SECTION 04: Git Workspace Sync Status Analyzer
