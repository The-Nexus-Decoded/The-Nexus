---
phase: 01-infrastructure-and-notifications-foundation
plan: 01
subsystem: infra
tags: [ansible, tailscale, ufw, fail2ban, ssh-hardening, ubuntu, inventory, vault]

# Dependency graph
requires: []
provides:
  - Ansible inventory with 3 server groups (claw_main, claw_trade, claw_dev) and placeholder LAN IPs
  - ansible.cfg configured for openclaw remote_user and vault password file
  - group_vars with shared (ufw_allowed_ports, fail2ban settings) and per-server (server_role, discord_channel, ufw_extra_ports) variables
  - vault/secrets.yml placeholder structure for tailscale_auth_key, discord_bot_token, solana_rpc_url
  - roles/tailscale: install Tailscale, connect with auth key, wait for 100.x.x.x IP, display for user
  - roles/base: SSH hardening (PasswordAuth=no, Tailscale CGNAT restriction), UFW (default deny + tailscale0 + 41641/udp), Fail2ban, unattended-upgrades, openclaw user
  - playbooks/site.yml: master provisioning playbook (tailscale FIRST, then base)
  - playbooks/harden.yml: standalone re-hardening playbook
  - Anti-lockout safeguard: checks tailscale0 exists before enabling UFW
affects:
  - 01-02: needs openclaw user and servers reachable via Tailscale
  - 01-03: needs discord_channel var from group_vars
  - all subsequent phases: depends on server connectivity via Tailscale mesh

# Tech tracking
tech-stack:
  added:
    - Ansible (agentless SSH provisioning from Windows)
    - Tailscale (WireGuard VPN mesh)
    - UFW (firewall, interface-based rules)
    - Fail2ban (SSH brute-force protection)
    - ansible-vault (encrypted secrets management)
    - unattended-upgrades (automatic security patches)
  patterns:
    - "Role order enforced: tailscale before base (UFW needs tailscale0 interface)"
    - "Anti-lockout: check tailscale0 exists before enabling UFW, warn and skip if absent"
    - "Two-step inventory: LAN IPs for bootstrap, Tailscale 100.x.x.x IPs for all subsequent runs"
    - "Per-server group_vars with ufw_extra_ports for future service port additions"
    - "Defense in depth: UFW blocks at interface level AND sshd restricts to Tailscale CGNAT range"

key-files:
  created:
    - ansible.cfg
    - inventory/hosts.yml
    - inventory/group_vars/all.yml
    - inventory/group_vars/claw_main.yml
    - inventory/group_vars/claw_trade.yml
    - inventory/group_vars/claw_dev.yml
    - vault/secrets.yml
    - .gitignore
    - roles/tailscale/tasks/main.yml
    - roles/tailscale/handlers/main.yml
    - roles/base/tasks/main.yml
    - roles/base/handlers/main.yml
    - roles/base/templates/99-hardening.conf.j2
    - roles/base/templates/jail.local.j2
    - playbooks/site.yml
    - playbooks/harden.yml
  modified: []

key-decisions:
  - "Anti-lockout safeguard added: base role checks tailscale0 exists before enabling UFW (Rule 2 - missing critical safety)"
  - "vault/secrets.yml created unencrypted as placeholder; user must run ansible-vault encrypt before first ansible-playbook run"
  - "ansible-vault not available on Windows workstation; YAML validation done via Python yaml module instead"
  - "openclaw user created with NOPASSWD sudo (required for Ansible automation on headless servers)"
  - "SSH authorized_key task uses ignore_errors=true (key file may not exist at plan creation time; user adds key before first run)"

patterns-established:
  - "Pattern 1: Role order — tailscale always before base in any playbook that applies UFW rules"
  - "Pattern 2: Per-server port overrides via ufw_extra_ports (empty by default, populated when services deploy)"
  - "Pattern 3: vault/secrets.yml tracked in git encrypted; .vault_pass gitignored"
  - "Pattern 4: server_role var (crypto/jobs/coding) used by all subsequent plans for per-server customization"

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 1 Plan 01: Server Provisioning and SSH Hardening Summary

**Ansible roles and playbooks for provisioning 3 Ubuntu 24.04 servers with Tailscale VPN, key-only SSH hardened to Tailscale CGNAT range, UFW firewall with anti-lockout safeguard, and Fail2ban**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-18T04:14:46Z
- **Completed:** 2026-02-18T04:18:45Z
- **Tasks:** 2 of 3 complete (Task 3 is human-verify checkpoint — awaiting)
- **Files created:** 16

## Accomplishments
- Complete Ansible project structure with 3-server inventory, shared/per-server group_vars, and vault placeholder
- Two roles: `tailscale` (install + connect VPN) and `base` (SSH hardening, UFW, Fail2ban, user setup)
- Master playbook (`site.yml`) with correct role order (tailscale first) and OS assertion pre-task
- Anti-lockout safeguard in base role: checks `tailscale0` interface exists before enabling UFW
- SSH hardened to Tailscale CGNAT range only (`AllowUsers *@100.64.0.0/10`) plus key-only auth

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Ansible project structure with inventory and vault** - `6a17d64` (feat)
2. **Task 2: Create base role for OS hardening (SSH, UFW, Fail2ban, user setup)** - `231dfcd` (feat)
3. **Task 3: Verify server provisioning** - PENDING (checkpoint:human-verify)

## Files Created

- `ansible.cfg` - Ansible config: inventory path, vault_password_file, remote_user=openclaw
- `inventory/hosts.yml` - 3 server groups with placeholder LAN IPs and two-step bootstrap instructions
- `inventory/group_vars/all.yml` - Shared vars: server_user, ssh_port, ufw_allowed_ports, fail2ban settings
- `inventory/group_vars/claw_main.yml` - server_role=crypto, discord_channel=crypto, ufw_extra_ports=[]
- `inventory/group_vars/claw_trade.yml` - server_role=jobs, discord_channel=jobs, ufw_extra_ports=[]
- `inventory/group_vars/claw_dev.yml` - server_role=coding, discord_channel=coding, ufw_extra_ports=[]
- `vault/secrets.yml` - Placeholder for tailscale_auth_key, discord_bot_token, solana_rpc_url
- `.gitignore` - Excludes .vault_pass, *.retry, SSH keys, env files
- `roles/tailscale/tasks/main.yml` - Tailscale install, auth key connect (no_log), IP wait + display
- `roles/tailscale/handlers/main.yml` - restart tailscaled
- `roles/base/tasks/main.yml` - apt packages, openclaw user, authorized_key, SSH hardening, UFW, Fail2ban, unattended-upgrades
- `roles/base/handlers/main.yml` - restart ssh, restart fail2ban, reload ufw
- `roles/base/templates/99-hardening.conf.j2` - SSH hardening: PasswordAuthentication no, AllowUsers *@100.64.0.0/10
- `roles/base/templates/jail.local.j2` - Fail2ban SSH jail with group_vars settings
- `playbooks/site.yml` - Master playbook: tailscale + base roles, OS assertion, summary post-task
- `playbooks/harden.yml` - Standalone hardening playbook (base role only)

## Decisions Made

- **Anti-lockout safeguard:** Added as deviation Rule 2 (missing critical safety). The plan specified UFW rules but did not include a check that `tailscale0` exists before enabling `ufw enable`. Without this, running the base role independently could lock out SSH. The base role now checks `ip link show tailscale0` and skips/warns if not found.
- **vault/secrets.yml unencrypted placeholder:** `ansible-vault` is not available on this Windows workstation without WSL. Created as plaintext YAML with clear instructions for the user to encrypt before first run. The file is tracked in git (standard Ansible Vault pattern — encrypted files are safe to commit).
- **ignore_errors on authorized_key task:** The SSH public key file (`~/.ssh/id_ed25519.pub`) may not exist at plan creation time. The task uses `ignore_errors: true` so the playbook doesn't abort if the key is missing — user adds their key before first run.
- **NOPASSWD sudo for openclaw user:** Required for Ansible to run privileged tasks without interactive password prompts on headless servers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added anti-lockout safeguard to base role**
- **Found during:** Task 2 (base role creation)
- **Issue:** Plan called for UFW rules including `ufw enable` but did not specify what to do if `tailscale0` interface doesn't exist yet. Enabling UFW without `tailscale0` present (e.g., if base role runs independently, or if Tailscale failed) would block all SSH and lock out the server.
- **Fix:** Added `ip link show tailscale0` check as first task in base role. UFW enable is conditional on `tailscale0` existing. If absent, playbook warns and skips UFW enable with a clear message.
- **Files modified:** `roles/base/tasks/main.yml`
- **Verification:** Logic verified via YAML parse and conditional `when: tailscale0_check.rc == 0`
- **Committed in:** 231dfcd (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix prevents catastrophic server lockout during provisioning. No scope creep.

## Issues Encountered

- `ansible-vault` not available on Windows workstation (no WSL). Validated YAML files using Python `yaml` module instead. User must encrypt `vault/secrets.yml` before first `ansible-playbook` run.
- `ansible-inventory --list` verification (specified in plan's `<verify>` section) cannot run without Ansible. YAML structure validated programmatically; functional verification deferred to the human-verify checkpoint (Task 3).

## User Setup Required

Before running the playbook for the first time, the user must:

1. **Create `.vault_pass`** in repo root:
   ```
   echo "your-strong-passphrase" > .vault_pass
   ```

2. **Encrypt vault/secrets.yml**:
   ```
   ansible-vault encrypt vault/secrets.yml
   ```

3. **Edit vault to fill in real secrets**:
   ```
   ansible-vault edit vault/secrets.yml
   ```
   Fill in: `tailscale_auth_key` (from Tailscale admin console), `discord_bot_token`, `solana_rpc_url`

4. **Update `inventory/hosts.yml`** with actual LAN IPs (replace 192.168.1.X/Y/Z)

5. **Add SSH public key** to `~/.ssh/id_ed25519.pub` (or update the `authorized_key` task path)

6. **Run the playbook**: `ansible-playbook playbooks/site.yml`

## Next Phase Readiness

- Playbooks ready to run; pending user hardware setup (Ubuntu 24.04 on 3 servers), Tailscale auth key, and vault encryption
- After Task 3 human-verify confirms servers are provisioned and reachable via Tailscale, Phase 1 Plan 02 (OpenClaw install) can proceed
- Per-server vars (`server_role`, `discord_channel`, `ufw_extra_ports`) are in place for Plans 02 and 03

## Self-Check: PASSED

All 16 created files verified present on disk. Both task commits (6a17d64, 231dfcd) verified in git log.

---
*Phase: 01-infrastructure-and-notifications-foundation*
*Completed: 2026-02-18 (Tasks 1-2; Task 3 pending human-verify)*
