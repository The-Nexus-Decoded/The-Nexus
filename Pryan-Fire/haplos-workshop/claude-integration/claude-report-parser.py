import sys
import re
import json
import os

def parse_claude_report(report_text):
    """
    Parses a Claude Code analysis report and extracts key sections.
    """
    sections = {
        "verdict": "",
        "key_findings": [],
        "recommendations": [],
        "code_blocks": []
    }

    # Extract Verdict
    verdict_match = re.search(r"\*\*Verdict:\s*(.*?)\*\*", report_text, re.IGNORECASE)
    if verdict_match:
        sections["verdict"] = verdict_match.group(1).strip()

    # Extract Key Findings
    findings_match = re.search(r"### Key Findings(.*?)(?=###|$)", report_text, re.DOTALL | re.IGNORECASE)
    if findings_match:
        findings = re.findall(r"-\s*(.*?)\n", findings_match.group(1))
        sections["key_findings"] = [f.strip() for f in findings]

    # Extract Recommendations
    recommend_match = re.search(r"### Recommendations(.*?)(?=###|$)", report_text, re.DOTALL | re.IGNORECASE)
    if recommend_match:
        recommends = re.findall(r"-\s*(.*?)\n", recommend_match.group(1))
        sections["recommendations"] = [r.strip() for r in recommends]

    # Extract Code Blocks
    code_blocks = re.findall(r"```(?:\w+)?\n(.*?)\n```", report_text, re.DOTALL)
    sections["code_blocks"] = [cb.strip() for cb in code_blocks]

    return sections

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 claude-report-parser.py <report_file_path>")
        sys.exit(1)

    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        sys.exit(1)

    with open(file_path, 'r') as f:
        report_text = f.read()

    parsed_data = parse_claude_report(report_text)
    print(json.dumps(parsed_data, indent=2))
