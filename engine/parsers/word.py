"""AXE-Anchor — Word/DOCX text extractor."""
import os, re, subprocess
from pathlib import Path

# START OF SECTION 08: Binary Word Docx Document Parser
# Description: Extracts XML document nodes, heading levels, and tables from DOCX,
# falling back to antiword/catdoc or ASCII extraction for DOC format.
# ==============================================================================
def extract_word_text(p, ext):
    if ext == '.docx':
        import zipfile
        import xml.etree.ElementTree as ET
        try:
            with zipfile.ZipFile(p) as zf:
                doc_xml = zf.read("word/document.xml")
                root = ET.fromstring(doc_xml)
                ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                
                def get_text(node):
                    return "".join(t.text for t in node.findall('.//w:t', ns) if t.text)

                body = root.find('w:body', ns)
                if body is not None:
                    md_lines = []
                    for child in list(body):
                        tag = child.tag.split('}')[-1]
                        if tag == 'p':
                            pPr = child.find('w:pPr', ns)
                            prefix = ""
                            if pPr is not None:
                                pStyle = pPr.find('w:pStyle', ns)
                                if pStyle is not None:
                                    style_val = pStyle.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') or pStyle.get('w:val')
                                    if style_val and style_val.lower().startswith('heading'):
                                        try:
                                            level = int(''.join(filter(str.isdigit, style_val)))
                                            prefix = "#" * level + " "
                                        except:
                                            prefix = "## "
                            txt = get_text(child).strip()
                            if txt:
                                md_lines.append(prefix + txt)
                        elif tag == 'tbl':
                            md_lines.append("")
                            rows_xml = child.findall('.//w:tr', ns)
                            table_rows = []
                            max_cols = 0
                            for row_xml in rows_xml:
                                cells_xml = row_xml.findall('.//w:tc', ns)
                                row_cells = [get_text(cell).strip().replace("\n", " ").replace("|", "\\|") for cell in cells_xml]
                                table_rows.append(row_cells)
                                max_cols = max(max_cols, len(row_cells))
                            
                            if table_rows:
                                headers = table_rows[0]
                                if len(headers) < max_cols:
                                    headers += [""] * (max_cols - len(headers))
                                md_lines.append("| " + " | ".join(headers) + " |")
                                md_lines.append("| " + " | ".join(["---"] * max_cols) + " |")
                                for row in table_rows[1:]:
                                    if len(row) < max_cols:
                                        row += [""] * (max_cols - len(row))
                                    md_lines.append("| " + " | ".join(row) + " |")
                            md_lines.append("")
                    return "\n".join(md_lines)
                return "(Empty Word Document)"
        except Exception as e:
            return f"Error extracting DOCX: {e}"
    else:
        import subprocess
        for cmd in ["antiword", "catdoc"]:
            try:
                res = subprocess.run([cmd, str(p)], capture_output=True, text=True, errors="ignore")
                if res.returncode == 0:
                    return res.stdout
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
                        if not any(x in decoded for x in ["Content-Type", "Microsoft Word", "Word.Document"]):
                            text_lines.append(decoded)
                except:
                    pass
            return "\n\n".join(text_lines) if text_lines else "(No readable text extracted from DOC)"
        except Exception as e:
            return f"Error reading binary DOC: {e}"
# ==============================================================================
# END OF SECTION 08: Binary Word Docx Document Parser
