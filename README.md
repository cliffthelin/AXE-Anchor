# AXE-Anchor

A platform-agnostic documentation visualization engine that scans multi-project workspaces and generates interactive dashboards with lineage graphs, schema exploration, and full-text search.

## Quick Start

```bash
# 1. Copy the template config
cp config.template.json config/settings.json

# 2. Edit config/settings.json to add your workspaces and projects

# 3. Build the dashboard
python3 builder.py

# 4. Start the server
python3 Server_Connect.py

# 5. Open http://127.0.0.1:8000 in your browser
```

## Architecture

```
AXE-Anchor/
├── builder.py              # One-shot build (no server)
├── Server_Connect.py       # Start the local server (with file watching)
├── Server_Disconnect.py    # Stop the server
├── config.template.json    # Starter configuration (copy to config/settings.json)
├── engine/
│   ├── compiler.py         # Builds HTML from scanned data
│   ├── scanner.py          # Scans project files and extracts metadata
│   ├── arch_scanner.py     # Code architecture analysis (inheritance, namespaces)
│   ├── constants.py        # Supported file types, paths layout
│   ├── paths.py            # Directory walker with configurable exclusion rules
│   ├── server/handler.py   # HTTP API (workspaces, git sync, DB vault, file ops)
│   ├── frontend/
│   │   ├── workspace.html  # HTML template
│   │   ├── css/main.css    # Styles
│   │   └── js/             # Modular JavaScript (state, renderers, UI, graph)
│   └── parsers/            # PDF, Word, Excel content extraction
├── plugins/                # Optional plugins (database drivers)
├── scripts/                # Utility scripts
└── tests/                  # Unit tests
```

## Features

### Multi-Project Workspace Management
- Configure multiple workspaces with projects, context folders, and supporting resources
- GitHub repo integration with clone/sync/pull
- Platform > Workspace > Project hierarchy

### Interactive Lineage Graph
- Force-directed layout with N-body physics
- Namespace clustering rings for code/schema modes
- ETL/API/DB classification with color coding
- Keyword search with heatmap visualization
- Shift+click path tracing between nodes
- PNG/SVG export

### Folder and File Filters
- Per-folder visibility toggles (recursive)
- File type include/exclude
- Custom extension exclusion
- "Ignore for anchoring" persists to build (excluded from chunks)
- Full exclusion report with reasons for every skipped file

### Chunked Data Loading
- Index HTML is ~3MB (metadata only) for instant page load
- Content split into ~5MB JSON chunks loaded via fetch
- Search and file viewing available as chunks load in background

### Configurable Scanner Rules
All exclusion rules are in `config/settings.json` under `scanner_rules`:
- `exclude_folders` — folder names to skip
- `exclude_folder_patterns` — patterns like backup, temp
- `skip_hidden_folders` — toggle `.` prefix folders
- `supported_extensions` — whitelist of file types to scan
- `max_file_bytes` — size limit per file
- `data_dump_keywords` / `data_dump_size_thresholds` — auto-detect data dumps

### Schema Graph
- Parses ERD markdown, SQL DDL, schema mappings, data dictionaries
- FK relationship visualization
- Column-level search
- Schema origin color coding

### Security
- Optional bcrypt password protection
- GitHub PAT stored encrypted in settings (never exposed to UI)
- Database credential vault with gate password

## Requirements

- Python 3.10+
- No external Python dependencies for core functionality
- Optional: `pdftotext` for PDF parsing, `bcrypt` for password protection

## Two Output Modes

| File | Size | Use Case |
|------|------|----------|
| `index.html` | ~3MB | Server mode — fast load, chunks via fetch |
| `index_static.html` | Varies | Offline — everything embedded, works on file:// |

Size depends entirely on how many files and projects are configured in your workspaces.

## License

MIT
