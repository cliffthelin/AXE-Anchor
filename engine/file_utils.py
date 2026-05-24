"""AXE-Anchor — File hashing and lineage extraction."""
import hashlib, re, json
from pathlib import Path

# START OF SECTION 06: File Hash Checking & Lineage Abstraction parser
# Description: Helper functions to compute SHA-256 hashes of files and parse
# relational/dependency lineage maps between documents.
# ==============================================================================
def file_hash(p):
    h = hashlib.sha256()
    h.update(p.read_bytes())
    return h.hexdigest()

def extract_structural_lineage(content, ext):
    lineage = {"dependencies": [], "schema": []}
    text_content = str(content)
    
    matches = re.findall(r'[\w\.-]+\.(?:json|csv|md|py|sql)', text_content, re.IGNORECASE)
    lineage["dependencies"] = list(set(matches))
    
    if ext == '.sql':
        tables = re.findall(r'(?:FROM|JOIN|INTO|UPDATE)\s+([a-zA-Z0-9_]+)', text_content, re.IGNORECASE)
        lineage["schema"] = {"tables": list(set(tables)), "columns": []}
    if ext == '.json':
        try:
            parsed = json.loads(text_content)
            if isinstance(parsed, dict): lineage["schema"] = {"fields": list(parsed.keys())}
        except: pass
    return lineage
# ==============================================================================
# END OF SECTION 06: File Hash Checking & Lineage Abstraction parser
