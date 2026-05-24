"""AXE-Anchor database schema adapter plugin."""
import json
import sqlite3


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


def _sqlserver_schema(connection):
    try:
        import pyodbc
    except ImportError as exc:
        raise RuntimeError("SQL Server schema checks require pyodbc and an installed SQL Server ODBC driver.") from exc

    driver = connection.get("options", {}).get("odbc_driver") or "ODBC Driver 18 for SQL Server"
    host = connection.get("host", "")
    port = connection.get("port", "")
    server = f"{host},{port}" if port else host
    encrypt = connection.get("options", {}).get("encrypt", "yes")
    trust = connection.get("options", {}).get("trust_server_certificate", "yes")
    conn_str = (
        f"DRIVER={{{driver}}};SERVER={server};DATABASE={connection.get('database','')};"
        f"UID={connection.get('username','')};PWD={connection.get('password','')};"
        f"Encrypt={encrypt};TrustServerCertificate={trust};"
    )
    query = """
    SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, ORDINAL_POSITION
    FROM INFORMATION_SCHEMA.COLUMNS
    ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    """
    return _rows_to_schema(pyodbc.connect(conn_str, timeout=15), query, "sqlserver")


def _postgres_schema(connection):
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError("Postgres schema checks require psycopg.") from exc

    conn = psycopg.connect(
        host=connection.get("host"),
        port=connection.get("port") or 5432,
        dbname=connection.get("database"),
        user=connection.get("username"),
        password=connection.get("password"),
        connect_timeout=15,
    )
    query = """
    SELECT table_schema, table_name, column_name, data_type, is_nullable, ordinal_position
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name, ordinal_position
    """
    return _rows_to_schema(conn, query, "postgres")


def _mysql_schema(connection):
    try:
        import pymysql
    except ImportError as exc:
        raise RuntimeError("MySQL schema checks require pymysql.") from exc

    conn = pymysql.connect(
        host=connection.get("host"),
        port=int(connection.get("port") or 3306),
        database=connection.get("database"),
        user=connection.get("username"),
        password=connection.get("password"),
        connect_timeout=15,
        read_timeout=30,
    )
    query = """
    SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, ORDINAL_POSITION
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    """
    return _rows_to_schema(conn, query, "mysql")


def _rows_to_schema(conn, query, driver):
    grouped = {}
    try:
        cur = conn.cursor()
        cur.execute(query)
        for row in cur.fetchall():
            schema_name, table_name, column_name, data_type, is_nullable, ordinal = row[:6]
            key = f"{schema_name}.{table_name}"
            grouped.setdefault(key, {
                "type": "table",
                "name": key,
                "schema": schema_name,
                "table": table_name,
                "driver": driver,
                "columns": [],
            })
            grouped[key]["columns"].append({
                "name": column_name,
                "type": data_type,
                "nullable": str(is_nullable).upper() in ("YES", "TRUE", "1"),
                "ordinal": int(ordinal or 0),
            })
    finally:
        try:
            conn.close()
        except Exception:
            pass
    return list(grouped.values())


def fetch_schema(connection):
    driver = (connection.get("driver") or "").lower()
    if driver == "sqlite":
        return _sqlite_schema(connection)
    if driver == "sqlserver":
        return _sqlserver_schema(connection)
    if driver == "postgres":
        return _postgres_schema(connection)
    if driver == "mysql":
        return _mysql_schema(connection)
    raise ValueError(f"Unsupported database driver: {driver}")
