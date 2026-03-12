#!/bin/sh
# Manual issue migration from legacy repos to The-Nexus
REPOS="Pryan-Fire Arianus-Sky Chelestra-Sea Abarrach-Stone Nexus-Vaults"
OUT="/tmp/legacy-issues.jsonl"
MAP="/data/openclaw/workspace/.lobster/issue-mapping-manual.txt"
mkdir -p /tmp/issue-migration
rm -f "$OUT"
echo "Collecting issues..."
for r in $REPOS; do
  gh issue list --repo The-Nexus-Decoded/$r --state open --json number,title,body,labels --limit 100 2>/dev/null || true \
    | jq -c --arg repo "$r" '. + {repo: $repo}' >> "$OUT"
done
TOTAL=$(wc -l < "$OUT")
echo "Found $TOTAL issues. Creating in The-Nexus..."
echo "old_repo,old_num,new_num,title" > "$MAP"
count=0
while IFS= read -r line; do
  [ -z "$line" ] && continue
  repo=$(echo "$line" | jq -r '.repo')
  old=$(echo "$line" | jq -r '.number')
  title=$(echo "$line" | jq -r '.title')
  body=$(echo "$line" | jq -r '.body // """)
  labels=$(echo "$line" | jq -r '.labels[].name' | grep -E '^(priority:|type:)' | paste -sd, -)
  case "$repo" in
    Pryan-Fire) area=area:fire ;;
    Arianus-Sky) area=area:sky ;;
    Chelestra-Sea) area=area:sea ;;
    Abarrach-Stone) area=area:stone ;;
    Nexus-Vaults) area=area:vaults ;;
    *) area= ;;
  esac
  [ -n "$labels" ] && labels="$labels,$area" || labels="$area"
  count=$((count+1))
  echo "[$count/$TOTAL] $repo #$old: $title"
  url=$(gh issue create --repo The-Nexus-Decoded/The-Nexus \
    --title "[$repo] $title" \
    --body "$body" \
    $(printf -- '--label %s ' $(echo "$labels" | tr ',' '\n')) \
    2>/dev/null || echo "error")
  new=$(echo "$url" | grep -oE '[0-9]+$' || echo "?")
  echo "$repo,$old,$new,$title" >> "$MAP"
done < "$OUT"
echo "=== Mapping (first 10) ==="
head -10 "$MAP"
echo "Full mapping saved to $MAP"