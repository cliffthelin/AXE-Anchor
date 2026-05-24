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
        # Windows: find python processes running Server_Connect.py
        try:
            result = subprocess.run(
                ['tasklist', '/FI', 'IMAGENAME eq python.exe', '/FO', 'CSV'],
                capture_output=True, text=True
            )
            # Use netstat to find what's on common ports
            for port in range(8000, 8020):
                result = subprocess.run(
                    ['netstat', '-ano'],
                    capture_output=True, text=True
                )
                for line in result.stdout.split('\n'):
                    if f'127.0.0.1:{port}' in line and 'LISTENING' in line:
                        parts = line.split()
                        pid = parts[-1]
                        try:
                            subprocess.run(['taskkill', '/PID', pid, '/F'], capture_output=True)
                            print(f"Killed server process (PID {pid}) on port {port}")
                            killed += 1
                        except Exception:
                            pass
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

        # Also check for any python process holding ports 8000-8019
        if killed == 0:
            try:
                result = subprocess.run(
                    ['lsof', '-ti', 'tcp:8000-8019'],
                    capture_output=True, text=True
                )
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    pid = pid.strip()
                    if pid and pid != str(os.getpid()):
                        try:
                            os.kill(int(pid), signal.SIGTERM)
                            print(f"Stopped process (PID {pid}) holding AXE-Anchor port")
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
