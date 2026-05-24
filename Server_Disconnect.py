# AXE-Anchor - Server Disconnect
# ==============================================================================
# Stops any running AXE-Anchor server by finding and killing the process.
# Usage: python3 Server_Disconnect.py
# ==============================================================================

import os
import sys
import signal
import subprocess


def find_and_kill_server():
    """Find AXE-Anchor server processes and kill them."""
    killed = 0

    if sys.platform == 'win32':
        # Windows: stop only Python processes whose command line names this server.
        try:
            result = subprocess.run(
                [
                    'powershell',
                    '-NoProfile',
                    '-Command',
                    "Get-CimInstance Win32_Process | "
                    "Where-Object { $_.CommandLine -match 'Server_Connect\\.py' } | "
                    "Select-Object -ExpandProperty ProcessId",
                ],
                capture_output=True,
                text=True,
            )
            for pid in result.stdout.strip().splitlines():
                pid = pid.strip()
                if pid:
                    subprocess.run(['taskkill', '/PID', pid, '/F'], capture_output=True)
                    print(f"Stopped server process (PID {pid})")
                    killed += 1
        except Exception as e:
            print(f"Error: {e}")
    else:
        # Linux/Mac: find python processes with Server_Connect in command
        try:
            result = subprocess.run(
                ['pgrep', '-f', 'Server_Connect.py'],
                capture_output=True, text=True
            )
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                pid = pid.strip()
                if pid and pid != str(os.getpid()):
                    try:
                        os.kill(int(pid), signal.SIGTERM)
                        print(f"Stopped server process (PID {pid})")
                        killed += 1
                    except (ProcessLookupError, ValueError):
                        pass
        except Exception:
            pass

    if killed == 0:
        print("No running AXE-Anchor server found.")
    else:
        print(f"\nDone. Stopped {killed} process(es).")


if __name__ == '__main__':
    find_and_kill_server()
