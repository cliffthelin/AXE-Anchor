"""AXE-Anchor Engine — public API."""
from .constants import SUPPORTED, MAX_FILE_BYTES, BUILD_ID, _axe_paths
from .paths import walk_pruned, is_system_file, is_data_dump
from .json_io import load_json, save_json
from .scanner import scan
from .arch_scanner import scan_code_architecture
from .rules_engine import run_rules
from .compiler import run_build
from .server.handler import BuilderHTTPRequestHandler

__all__ = [
    "SUPPORTED", "MAX_FILE_BYTES", "BUILD_ID",
    "_axe_paths", "walk_pruned", "is_system_file", "is_data_dump",
    "load_json", "save_json",
    "scan", "scan_code_architecture", "run_rules",
    "run_build", "BuilderHTTPRequestHandler",
]
