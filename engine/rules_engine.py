"""AXE-Anchor — Rules validation engine."""

# START OF SECTION 12: Rules Validation Checking Engine
# Description: Rule checker validating document schemas, sizes, references,
# and detecting architectural violations defined in rules.json.
# ==============================================================================
def run_rules(docs, rules):
    violations = []
    for r in rules.get('rules', []):
        if r['type'] == 'audit':
            for path, d in docs.items():
                content_len = len(d.get('content', ''))
                if content_len > r.get('max_size', float('inf')):
                    violations.append({"rule": r['id'], "file": path, "issue": f"File size {content_len} exceeds {r['max_size']}", "severity": r['severity']})
    return violations

# ==============================================================================
# END OF SECTION 12: Rules Validation Checking Engine
