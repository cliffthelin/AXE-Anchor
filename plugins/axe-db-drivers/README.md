# AXE DB Drivers Plugin

This plugin contains AXE-Anchor schema inspection adapters for databases hosted on separate managed servers.

The database servers do not run inside AXE-Anchor. The machine running `builder.py --serve` only needs the matching client libraries:

- SQL Server: `pyodbc` and an OS ODBC driver such as Microsoft ODBC Driver 18.
- Postgres: `psycopg`.
- MySQL/MariaDB: `pymysql`.
- SQLite: Python standard library.

AXE-Anchor stores database credentials through its encrypted DB vault. This plugin only supplies schema query adapters.
