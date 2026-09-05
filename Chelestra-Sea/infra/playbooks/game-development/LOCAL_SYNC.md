# Local Computer + Cloud Synchronization

## Cloud canonical copy

GitHub:

`The-Nexus-Decoded/The-Nexus/Chelestra-Sea/infra/playbooks/game-development/`

## Local canonical copy

After pulling the repository:

`H:\Projects\AI_Tools_And_Information\The-Nexus\Chelestra-Sea\infra\playbooks\game-development\`

Suggested PowerShell:

```powershell
Set-Location 'H:\Projects\AI_Tools_And_Information\The-Nexus'
git fetch origin
git pull --ff-only
```

To inspect the proposal branch before merge without disturbing existing work:

```powershell
git fetch origin infra/game-production-playbooks
git worktree add 'H:\CodexData\.codex\worktrees\game-production-playbooks' origin/infra/game-production-playbooks
```

Do not make a fresh clone. Reuse the canonical checkout and worktree system.

## Portable/offsite backups

The combined local ZIP may also be copied to OneDrive, Google Drive, Dropbox, a NAS, or external storage. GitHub remains the canonical versioned source.
