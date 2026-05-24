"""Encrypted database credential vault and schema snapshot checks."""
import base64
import hashlib
import importlib.util
import json
import os
import re
import sqlite3
import time
from pathlib import Path

import bcrypt
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from .json_io import load_json, save_json


def _slug(value):
    return re.sub(r'[^a-zA-Z0-9_.-]+', '-', value or '').strip('-') or 'database'


def vault_path(paths):
    return os.path.join(paths["config"], "db_vault.json")


def notifications_path(paths):
    return os.path.join(paths["cache"], "dependency_notifications.json")


def schema_snapshot_dir(paths):
    return os.path.join(paths["output"], "db-schema-snapshots")


def _empty_vault():
    return {
        "version": 1,
        "gate_hash": "",
        "salt": "",
        "connections": {},
        "created_at": time.strftime('%Y-%m-%dT%H:%M:%SZ'),
        "updated_at": "",
    }


def load_vault(paths):
    return load_json(vault_path(paths), _empty_vault())


def vault_status(paths):
    vault = load_vault(paths)
    return {
        "configured": bool(vault.get("gate_hash")),
        "connections": [
            {
                "name": name,
                "driver": item.get("driver", ""),
                "created_at": item.get("created_at", ""),
                "updated_at": item.get("updated_at", ""),
                "last_schema_hash": item.get("last_schema_hash", ""),
                "last_checked_at": item.get("last_checked_at", ""),
            }
            for name, item in sorted(vault.get("connections", {}).items())
        ],
    }


def set_gate(paths, password):
    if not password or len(password) < 12:
        return False, {"message": "Database vault password must be at least 12 characters."}
    vault = load_vault(paths)
    vault["gate_hash"] = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    vault["salt"] = base64.urlsafe_b64encode(os.urandom(16)).decode("ascii")
    vault["updated_at"] = time.strftime('%Y-%m-%dT%H:%M:%SZ')
    save_json(vault_path(paths), vault)
    return True, {"message": "Database vault gate configured."}


def _verify_gate(vault, password):
    gate_hash = vault.get("gate_hash")
    if not gate_hash:
        raise PermissionError("Database vault gate is not configured.")
    if not password or not bcrypt.checkpw(password.encode("utf-8"), gate_hash.encode("utf-8")):
        raise PermissionError("Database vault password is invalid.")


def _fernet(vault, password):
    salt = base64.urlsafe_b64decode(vault["salt"].encode("ascii"))
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=390000)
    return Fernet(base64.urlsafe_b64encode(kdf.derive(password.encode("utf-8"))))


def store_connection(paths, vault_password, connection):
    vault = load_vault(paths)
    _verify_gate(vault, vault_password)
    fernet = _fernet(vault, vault_password)
    name = connection.get("name", "").strip()
    driver = connection.get("driver", "").strip().lower()
    if not name:
        return False, {"message": "Connection name is required."}
    if driver not in {"sqlite", "sqlserver", "postgres", "mysql"}:
        return False, {"message": "Driver must be sqlite, sqlserver, postgres, or mysql."}
    secret = {
        "driver": driver,
        "host": connection.get("host", ""),
        "port": connection.get("port", ""),
        "database": connection.get("database", ""),
        "username": connection.get("username", ""),
        "password": connection.get("password", ""),
        "sqlite_path": connection.get("sqlite_path", ""),
        "options": connection.get("options", {}),
    }
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ')
    existing = vault.get("connections", {}).get(name, {})
    vault.setdefault("connections", {})[name] = {
        "driver": driver,
        "encrypted": fernet.encrypt(json.dumps(secret).encode("utf-8")).decode("ascii"),
        "created_at": existing.get("created_at") or now,
        "updated_at": now,
        "last_schema_hash": existing.get("last_schema_hash", ""),
        "last_checked_at": existing.get("last_checked_at", ""),
    }
    vault["updated_at"] = now
    save_json(vault_path(paths), vault)
    return True, {"message": "Connection stored.", "name": name}


def _decrypt_connection(vault, vault_password, name):
    _verify_gate(vault, vault_password)
    item = vault.get("connections", {}).get(name)
    if not item:
        raise KeyError("Connection not found.")
    try:
        raw = _fernet(vault, vault_password).decrypt(item["encrypted"].encode("ascii"))
    except InvalidToken as exc:
        raise PermissionError("Vault password could not decrypt this connection.") from exc
    return item, json.loads(raw.decode("utf-8"))


def _sqlite_schema(connection):
    db_path = connection.get("sqlite_path") or connection.get("database")
    if not db_path:
        raise ValueError("sqlite_path or database is required for sqlite schema checks.")
    rows = []
    with sqlite3.connect(db_path) as con:
        for obj_type, name, sql in con.execute(
            "SELECT type, name, sql FROM sqlite_master WHERE type IN ('table','view','index','trigger') ORDER BY type, name"
        ):
            columns = []
            if obj_type in ("table", "view"):
                try:
                    columns = [
                        {"name": row[1], "type": row[2], "nullable": not bool(row[3]), "default": row[4], "pk": bool(row[5])}
                        for row in con.execute(f"PRAGMA table_info({json.dumps(name)})")
                    ]
                except sqlite3.DatabaseError:
                    columns = []
            rows.append({"type": obj_type, "name": name, "sql": sql or "", "columns": columns})
    return rows


def _unavailable_driver(connection):
    driver = connection.get("driver")
    driver_modules = {"sqlserver": "pyodbc", "postgres": "psycopg2", "mysql": "pymysql"}
    module = driver_modules.get(driver, driver)
    raise RuntimeError(f"{driver} schema checks require optional Python driver '{module}' to be installed.")


def _plugin_fetch_schema(connection):
    here = Path(__file__).resolve()
    plugin_path = here.parents[1] / "plugins" / "axe-db-drivers" / "axe_db_drivers.py"
    if not plugin_path.exists():
        return None
    spec = importlib.util.spec_from_file_location("axe_db_drivers_plugin", plugin_path)
    if not spec or not spec.loader:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.fetch_schema(connection)


def fetch_schema(connection):
    plugin_result = _plugin_fetch_schema(connection)
    if plugin_result is not None:
        return plugin_result
    driver = connection.get("driver")
    if driver == "sqlite":
        return _sqlite_schema(connection)
    return _unavailable_driver(connection)


def schema_hash(schema):
    payload = json.dumps(schema, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _affected_documents(documents, schema_objects):
    names = {item.get("name", "").lower() for item in schema_objects if item.get("name")}
    affected = []
    for path, doc in documents.items():
        text = (path + "\n" + str(doc.get("content", ""))).lower()
        hits = sorted(name for name in names if name and name in text)
        if hits:
            affected.append({"file": path, "schema_objects": hits})
    return affected


def check_schema(paths, vault_password, connection_name, documents=None):
    vault = load_vault(paths)
    item, connection = _decrypt_connection(vault, vault_password, connection_name)
    schema = fetch_schema(connection)
    current_hash = schema_hash(schema)
    previous_hash = item.get("last_schema_hash", "")
    changed = bool(previous_hash and previous_hash != current_hash)
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ')

    snapshots = Path(schema_snapshot_dir(paths))
    snapshots.mkdir(parents=True, exist_ok=True)
    snapshot = {
        "connection": connection_name,
        "driver": connection.get("driver"),
        "checked_at": now,
        "schema_hash": current_hash,
        "previous_schema_hash": previous_hash,
        "changed": changed,
        "schema": schema,
    }
    snapshot_file = snapshots / f"{_slug(connection_name)}.json"
    snapshot_file.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")

    affected = _affected_documents(documents or {}, schema) if changed else []
    notifications = load_json(notifications_path(paths), [])
    notification = None
    if changed:
        notification = {
            "id": f"dbschema-{_slug(connection_name)}-{int(time.time())}",
            "type": "database_schema_changed",
            "connection": connection_name,
            "created_at": now,
            "schema_hash": current_hash,
            "previous_schema_hash": previous_hash,
            "layers": {
                "schema_objects": [item.get("name") for item in schema if item.get("name")],
                "affected_documents": affected,
                "reports_to_rerun": [item["file"] for item in affected],
            },
            "message": "Database schema changed; dependent reports/documents may be stale.",
        }
        notifications.insert(0, notification)
        save_json(notifications_path(paths), notifications[:200])

    vault["connections"][connection_name]["last_schema_hash"] = current_hash
    vault["connections"][connection_name]["last_checked_at"] = now
    vault["updated_at"] = now
    save_json(vault_path(paths), vault)

    return {
        "connection": connection_name,
        "changed": changed,
        "schema_hash": current_hash,
        "previous_schema_hash": previous_hash,
        "checked_at": now,
        "snapshot_path": str(snapshot_file),
        "notification": notification,
        "affected": affected,
    }
