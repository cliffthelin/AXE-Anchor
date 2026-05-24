"""AXE-Anchor — PDF text extractor."""
import subprocess

# START OF SECTION 07: Binary PDF Document Parser
# Description: Uses system pdftotext tool or fallback exception reporting to extract
# page-separated text from PDF files.
# ==============================================================================
def extract_pdf_text(p):
    import subprocess
    try:
        res = subprocess.run(["pdftotext", str(p), "-"], capture_output=True, text=True, errors="ignore")
        if res.returncode == 0:
            pages = res.stdout.split('\x0c')
            md_pages = []
            for idx, page in enumerate(pages):
                page_text = page.strip()
                if page_text:
                    md_pages.append(f"## Page {idx + 1}\n\n{page_text}")
            return "\n\n---\n\n".join(md_pages) if md_pages else "(No text content extracted from PDF)"
        else:
            return f"Error extracting PDF: pdftotext returned code {res.returncode}\nStderr: {res.stderr}"
    except Exception as e:
        return f"Error extracting PDF: {e}"
# ==============================================================================
# END OF SECTION 07: Binary PDF Document Parser
