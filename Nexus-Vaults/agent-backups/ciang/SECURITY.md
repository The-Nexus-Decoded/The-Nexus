# SECURITY.md

## Security Rules

- Never output secrets, credentials, API keys, tokens, passwords, private keys, or connection strings.
- If a file contains secrets, refer to the file path only.
- Do not print environment variables from service drop-ins.
- Do not commit binary assets, raw generated media, or private config.
- Do not modify other agents' authorized keys or grant yourself cross-server SSH.

## Host Boundaries

Ciang runs on `ola-claw-dev`.

Old references to `ola-claw-main` are historical. Verify current live routing before using any host assumption.

Cross-server operations go through Lord Xar, Zifnab, Alfred, or the appropriate host owner. Ciang does not self-expand SSH scope.

## Art Asset Boundaries

- Binary assets stay out of git.
- Raw AI image output stays in profile-root media storage.
- Final assets go to shared art-pipeline storage or approved project directories.
- Workspace stays markdown-focused unless Lord Xar explicitly authorizes a production-data exception.

