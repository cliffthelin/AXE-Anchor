"""AXE-Anchor — Excel/XLSX text extractor."""
import os, re, csv, subprocess
from pathlib import Path

# START OF SECTION 09: Binary Excel Spreadsheet Parser
# Description: Parses worksheet structures, cells, shared strings in XLSX, falling back
# to xls2csv or ASCII string extraction for XLS format.
# ==============================================================================
def col_to_idx(col_str):
    idx = 0
    for char in col_str:
        if 'A' <= char <= 'Z':
            idx = idx * 26 + (ord(char) - ord('A') + 1)
    return idx - 1

def extract_excel_text(p, ext):
    if ext == '.xlsx':
        import zipfile
        import xml.etree.ElementTree as ET
        try:
            with zipfile.ZipFile(p) as zf:
                shared_strings = []
                try:
                    ss_data = zf.read("xl/sharedStrings.xml")
                    ss_root = ET.fromstring(ss_data)
                    for si in ss_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
                        shared_strings.append(si.text or '')
                    if not shared_strings:
                        for si in ss_root.findall('.//{*}t'):
                            shared_strings.append(si.text or '')
                except:
                    pass
                
                sheet_names = {}
                try:
                    wb_data = zf.read("xl/workbook.xml")
                    wb_root = ET.fromstring(wb_data)
                    for s in wb_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
                        name = s.get('name')
                        r_id = s.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                        if name and r_id:
                            sheet_names[r_id] = name
                    if not sheet_names:
                        for s in wb_root.findall('.//{*}sheet'):
                            name = s.get('name')
                            r_id = s.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id') or s.get('id')
                            if name and r_id:
                                sheet_names[r_id] = name
                except:
                    pass

                sheets_extracted = []
                for fname in sorted(zf.namelist()):
                    if fname.startswith("xl/worksheets/sheet") and fname.endswith(".xml"):
                        sheet_label = fname.split('/')[-1].replace('.xml', '').capitalize()
                        try:
                            ws_data = zf.read(fname)
                            ws_root = ET.fromstring(ws_data)
                            
                            grid = {}
                            max_row = 0
                            max_col = 0
                            
                            for row_node in ws_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                                for cell_node in row_node.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                                    ref = cell_node.get('r')
                                    if ref:
                                        m = re.match(r'([A-Z]+)([0-9]+)', ref)
                                        if m:
                                            col_let, row_str = m.groups()
                                            r_idx = int(row_str) - 1
                                            c_idx = col_to_idx(col_let)
                                            max_row = max(max_row, r_idx)
                                            max_col = max(max_col, c_idx)
                                            
                                            val_node = cell_node.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                                            t_attr = cell_node.get('t')
                                            val = ""
                                            if val_node is not None:
                                                v_text = val_node.text or ""
                                                if t_attr == 's':
                                                    try:
                                                        s_idx = int(v_text)
                                                        if 0 <= s_idx < len(shared_strings):
                                                            val = shared_strings[s_idx]
                                                    except:
                                                        val = v_text
                                                else:
                                                    val = v_text
                                            grid[(r_idx, c_idx)] = val
                            
                            if not grid:
                                for row_node in ws_root.findall('.//{*}row'):
                                    for cell_node in row_node.findall('{*}c'):
                                        ref = cell_node.get('r')
                                        if ref:
                                            m = re.match(r'([A-Z]+)([0-9]+)', ref)
                                            if m:
                                                col_let, row_str = m.groups()
                                                r_idx = int(row_str) - 1
                                                c_idx = col_to_idx(col_let)
                                                max_row = max(max_row, r_idx)
                                                max_col = max(max_col, c_idx)
                                                
                                                val_node = cell_node.find('{*}v')
                                                t_attr = cell_node.get('t')
                                                val = ""
                                                if val_node is not None:
                                                    v_text = val_node.text or ""
                                                    if t_attr == 's':
                                                        try:
                                                            s_idx = int(v_text)
                                                            if 0 <= s_idx < len(shared_strings):
                                                                val = shared_strings[s_idx]
                                                        except:
                                                            val = v_text
                                                    else:
                                                        val = v_text
                                                grid[(r_idx, c_idx)] = val

                            if grid:
                                md_table = []
                                md_table.append(f"## {sheet_label}\n")
                                headers = [grid.get((0, c), f"Col {c+1}") for c in range(max_col + 1)]
                                md_table.append("| " + " | ".join(headers) + " |")
                                md_table.append("| " + " | ".join(["---"] * (max_col + 1)) + " |")
                                for r in range(1, max_row + 1):
                                    row_vals = [grid.get((r, c), "") for c in range(max_col + 1)]
                                    md_table.append("| " + " | ".join(row_vals) + " |")
                                sheets_extracted.append("\n".join(md_table))
                        except Exception as e:
                            sheets_extracted.append(f"## {sheet_label}\n\nError reading worksheet: {e}")
                
                return "\n\n---\n\n".join(sheets_extracted) if sheets_extracted else "(No sheets found in Excel)"
        except Exception as e:
            return f"Error extracting XLSX: {e}"
    else:
        import subprocess
        try:
            res = subprocess.run(["xls2csv", str(p)], capture_output=True, text=True, errors="ignore")
            if res.returncode == 0:
                import csv
                from io import StringIO
                reader = csv.reader(StringIO(res.stdout))
                rows = list(reader)
                if rows:
                    max_cols = max(len(r) for r in rows)
                    md_lines = []
                    headers = rows[0]
                    if len(headers) < max_cols:
                        headers += [""] * (max_cols - len(headers))
                    md_lines.append("| " + " | ".join(headers) + " |")
                    md_lines.append("| " + " | ".join(["---"] * max_cols) + " |")
                    for row in rows[1:]:
                        if len(row) < max_cols:
                            row += [""] * (max_cols - len(row))
                        md_lines.append("| " + " | ".join(row) + " |")
                    return "\n".join(md_lines)
        except:
            pass
        try:
            data = p.read_bytes()
            ascii_strings = re.findall(rb'[\x20-\x7E\s]{4,}', data)
            text_lines = []
            for s in ascii_strings:
                try:
                    decoded = s.decode('ascii', errors='ignore').strip()
                    if decoded and len(decoded) > 4:
                        text_lines.append(decoded)
                except:
                    pass
            return "\n\n".join(text_lines) if text_lines else "(No readable text extracted from binary XLS)"
        except Exception as e:
            return f"Error reading binary XLS: {e}"
# ==============================================================================
# END OF SECTION 09: Binary Excel Spreadsheet Parser
