**Objective:** Verify that every file from the old realm repositories has been correctly migrated to The-Nexus monorepo with proper directory structure and complete git history.

**Context:**
This is the final verification for Nexus-Vaults#15. After Haplo pushes the consolidated code to The-Nexus, we must audit that no files were lost or misplaced during migration.

**Migration Mapping (expected structure in The-Nexus):**
- `Pryan-Fire/` = old Pryan-Fire repo (haplos-workshop, hughs-forge, zifnabs-scriptorium)
- `Chelestra-Sea/` = old Chelestra-Sea repo (workflows, fleet, integrations, docs)
- `Arianus-Sky/` = old Arianus-Sky repo (apps, dashboards, shared)
- `Abarrach-Stone/` = old Abarrach-Stone repo (schemas, pipelines, archives)
- `Nexus-Vaults/` = old Nexus-Vaults repo (docs, scripts, workspace snapshots)

**Verification Steps:**

1. **File count comparison:**
   - Count all files (excluding .git) in each old repo
   - Count all files in corresponding directory in The-Nexus
   - Report any mismatches

2. **Directory structure validation:**
   - Ensure every top-level directory from old repos exists in monorepo
   - Verify no stray directories appear in monorepo
   - Check that README.md, LICENSE, .gitignore files are present in each realm

3. **Critical path spot-check:**
   - Verify key files exist at expected paths:
     - Pryan-Fire: `hughs-forge/services/trade-orchestrator/src/core/orchestrator.py`
     - Chelestra-Sea: `workflows/` and `integrations/discord/`
     - Arianus-Sky: `dashboards/` and `apps/`
     - Abarrach-Stone: `schemas/` and `pipelines/`
     - Nexus-Vaults: `ola-claw-main/`, `ola-claw-dev/`, `ola-claw-trade/`

4. **Git history preservation check:**
   - Verify `git log --oneline` shows complete history (no gaps)
   - Confirm that original commit authors are preserved
   - Check that tags from old repos exist in monorepo

5. **Cross-reference with issue links:**
   - Pick 10 random closed issues from each realm
   - Find the corresponding PR merge commits
   - Verify file changes appear in The-Nexus repo at the expected paths

**Commands to run (execute on ola-claw-main):**
```bash
# Clone the monorepo if not already present
if [ ! -d "/data/repos/The-Nexus" ]; then
  gh repo clone The-Nexus-Decoded/The-Nexus /data/repos/The-Nexus
fi

# For each realm
for realm in Pryan-Fire Chelestra-Sea Arianus-Sky Abarrach-Stone Nexus-Vaults; do
  echo "=== $realm ==="
  # Count files in old repo
  old_count=$(find "/data/repos/The-Nexus-Decoded/$realm" -type f ! -path "*/\\.git/*" 2>/dev/null | wc -l)
  # Count files in new monorepo
  new_count=$(find "/data/repos/The-Nexus/$realm" -type f ! -path "*/\\.git/*" 2>/dev/null | wc -l)
  echo "Old: $old_count, New: $new_count, Match: $([ "$old_count" -eq "$new_count" ] && echo YES || echo NO)"
done
```

**Acceptance Criteria:**
- All file counts match (or differences explained by intentional deletions)
- All critical paths verified
- Git history intact with no missing commits
- Spot-check of 50 issues confirms file locations align with ticket references

**Assignee:** Haplo (after migration PR is merged)
**Priority:** P0 (must verify before declaring migration complete)
**Labels:** verification, monorepo, P0

**Dependencies:** This task depends on completion of Nexus-Vaults#15 (migration PR merged). Do not start until The-Nexus repo has the full consolidated codebase.
