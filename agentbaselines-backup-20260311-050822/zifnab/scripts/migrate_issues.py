#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path

REPOS = ["Pryan-Fire", "Arianus-Sky", "Chelestra-Sea", "Abarrach-Stone", "Nexus-Vaults"]
out_path = Path("/tmp/legacy-issues.jsonl")
map_path = Path("/data/openclaw/workspace/.lobster/issue-mapping.txt")

# Step 1: Collect issues
print("Collecting issues from legacy repos...")
out_path.parent.mkdir(parents=True, exist_ok=True)
with out_path.open("w") as out_f:
    for repo in REPOS:
        print(f"Fetching {repo}...")
        try:
            result = subprocess.run(
                ["gh", "issue", "list", "--repo", f"The-Nexus-Decoded/{repo}", "--state", "open",
                 "--json", "number,title,body,labels", "--limit", "100"],
                capture_output=True, text=True, check=False
            )
            if result.returncode != 0:
                print(f"  Warning: gh failed for {repo}, skipping")
                continue
            issues = json.loads(result.stdout)
            for issue in issues:
                issue["repo"] = repo
                out_f.write(json.dumps(issue) + "\n")
        except Exception as e:
            print(f"  Error processing {repo}: {e}")
            continue

lines = out_path.read_text().splitlines()
total = len(lines)
print(f"Collected {total} issues.")

if total == 0:
    print("No issues to migrate.")
    sys.exit(0)

# Mapping header
map_path.parent.mkdir(parents=True, exist_ok=True)
with map_path.open("w") as map_f:
    map_f.write("old_repo,old_num,new_num,title\n")

    for idx, line in enumerate(lines, 1):
        try:
            issue = json.loads(line)
        except json.JSONDecodeError:
            print(f"[{idx}/{total}] Skipping invalid JSON line")
            continue

        repo = issue["repo"]
        old_num = issue["number"]
        title = issue["title"].replace('"', "'").replace("\n", " ").replace("\r", "")
        body = issue.get("body") or ""

        # Build labels: priority:/type: plus area:
        labels = []
        for lab in issue.get("labels", []):
            name = lab["name"]
            if name.startswith("priority:") or name.startswith("type:"):
                labels.append(name)
        area_map = {
            "Pryan-Fire": "area:fire",
            "Arianus-Sky": "area:sky",
            "Chelestra-Sea": "area:sea",
            "Abarrach-Stone": "area:stone",
            "Nexus-Vaults": "area:vaults",
        }
        area = area_map.get(repo, "")
        if area:
            labels.append(area)

        # Create issue
        print(f"[{idx}/{total}] {repo}#{old_num}: {title}")
        gh_cmd = [
            "gh", "issue", "create", "--repo", "The-Nexus-Decoded/The-Nexus",
            "--title", f"[{repo}] {title}",
            "--body", body
        ]
        for lbl in labels:
            gh_cmd.extend(["--label", lbl])

        try:
            result = subprocess.run(gh_cmd, capture_output=True, text=True, check=False)
            if result.returncode == 0:
                # Extract issue number from URL (last digits)
                new_num = result.stdout.strip().split("/")[-1]
                map_f.write(f"{repo},{old_num},{new_num},{title.replace(',', ' ')}\n")
            else:
                print(f"  Error creating issue: {result.stderr.strip()}")
                map_f.write(f"{repo},{old_num},?,{title.replace(',', ' ')}\n")
        except Exception as e:
            print(f"  Exception: {e}")
            map_f.write(f"{repo},{old_num},?,{title.replace(',', ' ')}\n")

print("=== Migration complete ===")
print(f"Mapping saved to: {map_path}")
# Print first 10 mapping rows
with map_path.open() as f:
    lines = f.readlines()
    for line in lines[:11]:
        print(line, end="")