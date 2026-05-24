"""AXE-Anchor — Git subprocess runner."""
import os, subprocess

# START OF SECTION 03: Git Command Runner Execution Engine
# Description: Executes Git subprocess commands securely, injecting and scrubbing
# GitHub tokens to prevent credential leaks.
# ==============================================================================
import subprocess

def run_git_cmd(args, cwd=None, token=None, timeout=900):
    try:
        env_map = dict(os.environ)
        if token:
            env_map["GITHUB_TOKEN"] = token
            # Use dynamic credential helper to inject the token from GITHUB_TOKEN environment variable
            helper_args = [
                "-c",
                "credential.helper=!f() { echo username=oauth2; echo password=$GITHUB_TOKEN; }; f"
            ]
            if args and args[0] == "git":
                args = ["git"] + helper_args + args[1:]
                
        res = subprocess.run(
            args,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
            env=env_map
        )
        
        stdout_str = res.stdout.strip()
        stderr_str = res.stderr.strip()
        
        # Redact the token from outputs just in case it leaks
        if token:
            stdout_str = stdout_str.replace(token, "[REDACTED]")
            stderr_str = stderr_str.replace(token, "[REDACTED]")
            
        return res.returncode, stdout_str, stderr_str
    except Exception as e:
        err_str = str(e)
        if token:
            err_str = err_str.replace(token, "[REDACTED]")
        return -1, "", err_str
# ==============================================================================
# END OF SECTION 03: Git Command Runner Execution Engine
