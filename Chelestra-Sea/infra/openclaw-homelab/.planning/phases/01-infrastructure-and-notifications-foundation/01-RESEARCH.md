# Phase 1: Infrastructure and Notifications Foundation - Research

**Researched:** 2026-02-17
**Domain:** Ubuntu server hardening, OpenClaw bare-metal installation, Tailscale VPN mesh, Discord bot integration, iMessage bridging from Linux
**Confidence:** MEDIUM-HIGH — OpenClaw installation and configuration is HIGH (verified against official docs and GitHub). iMessage Linux architecture is HIGH (verified). SSH/UFW/Tailscale patterns are HIGH (verified). OpenClaw/Lobster IPC is LOW (not documented; flagged for Phase 1 validation).

---

## Summary

Phase 1 provisions three bare-metal Ubuntu 24.04 servers with OpenClaw installed natively (no Docker), hardened SSH over Tailscale, UFW firewall, and two notification channels: Discord (per-server channels) and iMessage (critical alerts). The critical architectural complexity is the iMessage channel: **iMessage requires a macOS machine running Messages.app**. OpenClaw's Linux gateway cannot send iMessages directly. A Mac (or always-on macOS VM) must act as a bridge, reachable by the Linux servers via Tailscale SSH. This is a prerequisite that must be resolved in planning.

The second important clarification: the prior ARCHITECTURE.md in this repo assumed Docker-based deployment based on openclaw-ansible defaults. **The actual requirement is bare-metal, no Docker for OpenClaw.** The openclaw-ansible playbook does support a bare-metal install path using pnpm/npm globally plus a systemd user service, but headless servers require specific workarounds (`loginctl enable-linger`, `XDG_RUNTIME_DIR`) that the standard onboarding wizard does not handle automatically.

The OpenClaw/Lobster/Claw Hub IPC mechanism was flagged as LOW confidence in prior research and remains LOW after this investigation. The openclaw-ansible documentation does not describe the inter-component communication protocol. Phase 1 should treat Lobster and Claw Hub as optional capabilities to be validated after the base OpenClaw gateway is confirmed operational. The gateway itself (port 18789, systemd user service, Discord channel) is HIGH confidence.

**Primary recommendation:** Deploy OpenClaw bare-metal with `npm install -g openclaw@latest` and `openclaw onboard --install-daemon`, fix the headless systemd issue with `loginctl enable-linger`, configure Discord integration via `openclaw.json`, and bridge iMessage through a Mac over Tailscale SSH using an `imsg-ssh` wrapper script. Ansible is the right tool to automate all three servers from Windows.

---

## Standard Stack

### Core (Phase 1 specific)

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Ubuntu Server | 24.04 LTS | Host OS for all 3 servers | Locked decision; 5-year LTS, native systemd, best OpenClaw/Tailscale compatibility |
| Node.js | 22.x LTS (required) | OpenClaw runtime | OpenClaw explicitly requires Node >= 22; install via NodeSource repository |
| OpenClaw | latest (npm) | AI gateway on each server | The whole point; bare-metal systemd user service, port 18789 |
| Tailscale | latest stable | Mesh VPN | Zero-config, WireGuard underneath; stable Tailscale IPs across all nodes |
| UFW | OS default | Firewall | Default deny inbound; restrict SSH and OpenClaw port to tailscale0 interface |
| Ansible | 9.x / core 2.16+ | Provisioning automation from Windows | Agentless SSH; drives all three servers from Windows workstation; handles secrets via Vault |
| Fail2ban | latest | SSH brute-force protection | Used by openclaw-ansible; bans IPs after 5 failed auth attempts |

### Supporting

| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| pnpm | 9.x | Alternative to npm for OpenClaw install | openclaw-ansible uses pnpm; either works; npm is simpler for manual setup |
| imsg CLI | latest (Homebrew) | iMessage bridge binary on Mac | Required on the Mac side; invoked via SSH wrapper from Linux |
| BlueBubbles | latest | iMessage relay (alternative) | If a dedicated always-on Mac mini is available; more robust than imsg SSH wrapper for 24/7 operation |
| unattended-upgrades | OS default | Automatic security patches | Part of openclaw-ansible hardening; keep enabled on all servers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| imsg SSH wrapper (Mac bridge) | BlueBubbles server on Mac | BlueBubbles is more feature-rich and is the officially recommended new path per OpenClaw docs; imsg is "legacy" but simpler to set up |
| npm global install | pnpm global install | Functionally identical; openclaw-ansible defaults to pnpm; either works |
| Manual provisioning | openclaw-ansible playbook | openclaw-ansible handles UFW, Tailscale, Fail2ban, systemd in one run; strongly preferred for a Linux novice |
| Tailscale SSH (built-in) | openssh + Tailscale IP restriction | Tailscale SSH replaces keys with Tailscale identity; adds complexity; stick with openssh restricted to tailscale0 interface |

### Installation

```bash
# On each server: Node.js 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# OpenClaw global install
sudo npm install -g openclaw@latest

# Fix headless systemd (REQUIRED on bare-metal servers without GUI)
sudo loginctl enable-linger $(whoami)
export XDG_RUNTIME_DIR=/run/user/$(id -u)
echo 'export XDG_RUNTIME_DIR=/run/user/$(id -u)' >> ~/.bashrc

# Onboard and install daemon
openclaw onboard --install-daemon
```

---

## Architecture Patterns

### Recommended Project Structure (bare-metal, no Docker)

```
~/.openclaw/                          # OpenClaw home (per-user, per-server)
├── openclaw.json                     # Main config (JSON5 format)
└── workspace/                        # Default workspace root
    ├── SOUL.md                       # Agent personality (server-specific)
    ├── AGENTS.md                     # Agent config snapshot (auto-generated)
    ├── TOOLS.md                      # Available tool manifest (auto-generated)
    ├── IDENTITY.md                   # Identity/persona details (auto-generated)
    ├── USER.md                       # User preferences (auto-generated)
    └── HEARTBEAT.md                  # Health check prompts (auto-generated)

/etc/ssh/sshd_config.d/
└── 99-hardening.conf                 # SSH hardening (separate from system defaults)

Windows workstation: openclaw-ansible/
├── inventory/
│   ├── hosts.yml                     # Tailscale IPs for all 3 servers
│   └── group_vars/
│       ├── all.yml                   # Shared config (Tailscale authkey, UFW)
│       ├── claw_main.yml             # Server .101 vars (Discord channel: crypto)
│       ├── claw_trade.yml            # Server .102 vars (Discord channel: jobs)
│       └── claw_dev.yml              # Server .103 vars (Discord channel: coding)
├── playbooks/
│   ├── site.yml                      # Full provision playbook
│   ├── harden.yml                    # UFW + SSH hardening
│   └── openclaw.yml                  # OpenClaw install + config
├── roles/
│   ├── base/                         # OS packages, users, UFW
│   ├── tailscale/                    # Tailscale install + authkey
│   └── openclaw/                     # Node.js + OpenClaw + systemd service
└── vault/
    └── secrets.yml                   # Ansible Vault — Discord token, API keys
```

### Pattern 1: OpenClaw Configuration per Server

**What:** Each server has a distinct `~/.openclaw/openclaw.json` configured with: the Discord bot token, the server's assigned Discord guild+channel, the iMessage channel pointing to the Mac bridge, and a workspace path that holds the server-specific SOUL.md.

**When to use:** All three servers. The config is the primary differentiation between servers (beyond SOUL.md).

**Example `~/.openclaw/openclaw.json` for claw-main (.101 / crypto channel):**

```json5
// Source: https://docs.openclaw.ai/gateway/configuration-reference
{
  gateway: {
    port: 18789,
    bind: "loopback",  // localhost only; access via Tailscale SSH tunnel if needed
    auth: {
      mode: "token",
      token: "${OPENCLAW_GATEWAY_TOKEN}"  // set via env var
    }
  },
  channels: {
    discord: {
      enabled: true,
      token: "${DISCORD_BOT_TOKEN}",
      guilds: {
        "YOUR_GUILD_ID": {
          slug: "homelab",
          channels: {
            "crypto": {
              allow: true,
              requireMention: true
            }
          }
        }
      }
    },
    imessage: {
      enabled: true,
      cliPath: "/home/openclaw/.openclaw/scripts/imsg-ssh",
      dbPath: "/Users/YOUR_MAC_USER/Library/Messages/chat.db",
      remoteHost: "YOUR_MAC_USER@YOUR_MAC_TAILSCALE_IP",
      dmPolicy: "allowlist",
      allowFrom: ["+1YOURNUMBER"]
    }
  },
  agents: {
    defaults: {
      workspace: "/home/openclaw/.openclaw/workspace"
    }
  },
  logging: {
    level: "info",
    file: "/home/openclaw/.openclaw/logs/openclaw.log"
  }
}
```

### Pattern 2: iMessage Linux-to-Mac Bridge Architecture

**What:** The Linux servers cannot send iMessages directly. A Mac running Messages.app serves as the bridge. OpenClaw on each Linux server invokes an SSH wrapper script that executes the `imsg` CLI on the Mac over Tailscale. SCP is used for attachment fetching.

**Architecture:**

```
Linux Server (claw-main)
  OpenClaw gateway
    └── channels.imessage.cliPath → /home/openclaw/.openclaw/scripts/imsg-ssh

imsg-ssh (bash wrapper script)
  └── ssh -T MAC_USER@MAC_TAILSCALE_IP /usr/local/bin/imsg "$@"

Mac (always-on, Tailscale connected)
  imsg CLI (Homebrew)
  Messages.app (signed in, Full Disk Access granted)
  Remote Login enabled (System Settings > General > Sharing)
```

**Mac prerequisites:**
- Messages.app signed into an Apple ID
- Full Disk Access granted to `imsg` process
- Automation permission for Messages.app
- Remote Login (SSH) enabled in System Preferences
- Tailscale installed and connected

**Imsg-ssh wrapper script on Linux:**

```bash
#!/usr/bin/env bash
# /home/openclaw/.openclaw/scripts/imsg-ssh
exec ssh -T MAC_USER@MAC_TAILSCALE_MAGIC_DNS /usr/local/bin/imsg "$@"
```

**Note from OpenClaw docs:** "The documentation notes that the imsg integration is legacy and recommends BlueBubbles as the preferred path for new iMessage deployments." For Phase 1, imsg is simpler; BlueBubbles is the upgrade path.

### Pattern 3: SSH Hardening — Tailscale Interface Restriction

**What:** SSH is restricted to the tailscale0 network interface only. Password authentication is disabled. Public SSH is blocked at UFW before sshd even sees it.

**When to use:** All three servers on day one, before any keys or credentials are present.

**sshd_config approach (bind to Tailscale IP range):**

```bash
# /etc/ssh/sshd_config.d/99-hardening.conf
PasswordAuthentication no
PermitEmptyPasswords no
PermitRootLogin no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers *@100.64.0.0/10   # Tailscale CGNAT range
```

**UFW rules (interface-based, more robust):**

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
# Allow all traffic on Tailscale interface
sudo ufw allow in on tailscale0
# Allow Tailscale itself
sudo ufw allow 41641/udp
# Enable UFW
sudo ufw enable
# Verify: SSH via public IP should fail; SSH via Tailscale IP should succeed
```

**Critical:** Test connectivity via Tailscale IP BEFORE removing the OpenSSH public rule. Have a rescue console access method ready in case of lockout.

### Pattern 4: OpenClaw Systemd User Service (Headless Server Fix)

**What:** OpenClaw installs as a systemd **user** service (not system service). On headless servers without a login session, user services fail because `XDG_RUNTIME_DIR` and D-Bus are not available. Two commands fix this permanently.

**Commands (run before `openclaw onboard --install-daemon`):**

```bash
# Enable linger: user services persist without an active login session
sudo loginctl enable-linger $(whoami)

# Set XDG_RUNTIME_DIR for the current session
export XDG_RUNTIME_DIR=/run/user/$(id -u)

# Make permanent
echo 'export XDG_RUNTIME_DIR=/run/user/$(id -u)' >> ~/.bashrc
```

**Service file location:** `~/.config/systemd/user/openclaw-gateway.service`

**Verification:**

```bash
systemctl --user status openclaw-gateway
openclaw gateway status
curl http://127.0.0.1:18789/health
```

### Pattern 5: SOUL.md — Per-Server Agent Personality

**What:** Each server has a distinct `SOUL.md` in `~/.openclaw/workspace/SOUL.md`. The file is a Markdown document (50-150 lines recommended) that establishes the agent's identity, communication style, values, and constraints. OpenClaw injects it into every agent session.

**Location:** `~/.openclaw/workspace/SOUL.md` (configurable via `agents.defaults.workspace`)

**Format:**

```markdown
# SOUL.md — [Server Role Name]

You're not a chatbot. You're becoming someone.

## Who You Are
[Server-specific identity — e.g., for claw-main: "You are a disciplined crypto trading assistant..."]

## Core Truths
1. [Principle 1]
2. [Principle 2]
3. [Principle 3]

## Communication Style
[How the agent speaks — direct, concise, data-driven, etc.]

## Values
[What the agent prioritizes — e.g., for crypto server: capital preservation > trade frequency]

## Boundaries
[What the agent won't do without human confirmation]

## Vibe
[Tonal guidance]
```

**Server-specific SOUL.md differentiation:**

| Server | Role Identity | Key Trait |
|--------|--------------|-----------|
| claw-main (.101) | Crypto trading assistant | Disciplined, risk-aware, data-driven |
| claw-trade (.102) | Job hunting and income scout | Opportunistic, analytical, persistent |
| claw-dev (.103) | Coding partner | Pragmatic, thorough, collaborative |

### Anti-Patterns to Avoid

- **Applying UFW rules in wrong order:** Adding `deny port 22` before confirming Tailscale SSH works will lock you out. Always verify Tailscale SSH works first, then remove public SSH rule.
- **Using ListenAddress for SSH restriction on DHCP-assigned Tailscale IPs:** Tailscale IPs are stable (100.x.x.x) but using `AllowUsers *@100.64.0.0/10` is safer than hardcoding a specific ListenAddress.
- **Running OpenClaw as root:** The openclaw-ansible playbook creates a dedicated `openclaw` user; follow this pattern even for manual installs. Never run as root.
- **Skipping `loginctl enable-linger`:** Without this, OpenClaw gateway stops when the SSH session closes. The daemon will not survive server reboots.
- **One Discord bot for all three servers:** OpenClaw's Discord integration is per-gateway. Each server's OpenClaw connects independently to Discord using the same bot token but routes to different channels via guild/channel configuration.
- **Connecting iMessage before Mac bridge is set up:** OpenClaw will fail to start the iMessage channel if `cliPath` does not exist or returns errors. Configure and test the SSH wrapper before enabling iMessage in `openclaw.json`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Server provisioning | Manual bash scripts | Ansible playbooks (openclaw-ansible as reference) | Repeatable, idempotent, handles all 3 servers consistently; critical for a Linux novice |
| SSH key distribution | Manual key copying | Ansible's `authorized_key` module | Handles permissions correctly; avoids `~/.ssh` permission errors |
| VPN networking | WireGuard from scratch | Tailscale | Tailscale wraps WireGuard; zero key management, works from Windows, automatic NAT traversal |
| Firewall rules | iptables directly | UFW | UFW abstracts iptables correctly; far fewer ways to accidentally block everything |
| iMessage sending from Linux | Custom AppleScript/API | imsg CLI + SSH wrapper | imsg is the established OpenClaw-native approach; custom builds miss session management |
| Discord bot boilerplate | discord.js custom bot | OpenClaw's built-in Discord channel integration | OpenClaw's Discord integration handles reconnects, message chunking, pairing flow |
| Systemd service file | Manual .service files | `openclaw onboard --install-daemon` + `loginctl enable-linger` | The installer handles service file creation; only the linger fix is manual |

**Key insight:** The openclaw-ansible repository (https://github.com/openclaw/openclaw-ansible) provides a complete reference implementation for everything in Plan 01-01 (server provisioning and security hardening). Study it before writing any Ansible playbooks — even if adapting to bare-metal rather than Docker.

---

## Common Pitfalls

### Pitfall 1: iMessage Requires a Mac — Planning Blocker
**What goes wrong:** The team plans to send iMessage alerts from the Linux servers without recognizing that a Mac bridge is required. Discovery during Plan 01-03 execution stalls the phase.
**Why it happens:** OpenClaw documentation presents iMessage as a "channel" alongside Discord, implying similar setup complexity. The Mac dependency is not obvious from the channel list.
**How to avoid:** Identify and resolve the Mac bridge question in Phase 1 planning, before Plan 01-03. Options: (a) a Mac mini or existing Mac that can run 24/7 with Tailscale, (b) a macOS VM on the Windows workstation (technically viable but adds complexity), (c) BlueBubbles on a Mac. If no Mac is available, substitute a different critical alert channel (ntfy.sh push notifications are a strong alternative — no Mac needed, self-hosted option exists).
**Warning signs:** Planning proceeds without identifying which Mac device will serve as the iMessage bridge.

### Pitfall 2: Headless Systemd Lockout (`openclaw gateway status` fails)
**What goes wrong:** After installing OpenClaw on a bare-metal server via SSH, running `openclaw onboard --install-daemon` appears to succeed, but the gateway does not start on boot. `openclaw gateway status` returns "Failed to connect to bus: No medium found."
**Why it happens:** User-level systemd services require a D-Bus session and `XDG_RUNTIME_DIR`, which are not available in SSH sessions by default. The openclaw onboarding wizard does not automatically detect and fix this on headless servers.
**How to avoid:** Run `sudo loginctl enable-linger $(whoami)` and set `XDG_RUNTIME_DIR` before running the onboarding wizard. Add to `~/.bashrc` for permanence. Verify with `systemctl --user status openclaw-gateway` after reboot.
**Warning signs:** `openclaw gateway status` output includes "No medium found" or "Failed to connect to bus."

### Pitfall 3: UFW Lockout During SSH Hardening
**What goes wrong:** UFW rules are applied in wrong order or the Tailscale connection is not verified first. Public SSH is blocked before confirming Tailscale SSH works. Server becomes unreachable.
**Why it happens:** New Linux users apply `ufw enable` without verifying the Tailscale-restricted SSH rule is in place and working. Or Tailscale is not yet started when the SSH rule changes.
**How to avoid:** Strict order: (1) Install and connect Tailscale first. (2) Test SSH via Tailscale IP — confirm it works. (3) Apply UFW rules. (4) Test SSH via public IP — confirm it fails. (5) Only then consider the hardening complete. Always have a physical console or hosting provider emergency access method ready.
**Warning signs:** Tailscale not confirmed connected before applying SSH restrictions.

### Pitfall 4: Discord Bot Pairing Not Completed
**What goes wrong:** The Discord bot token is configured in `openclaw.json`, the gateway starts, but the bot does not respond in Discord channels. The pairing/approval step is skipped.
**Why it happens:** OpenClaw's Discord integration requires a pairing step for direct messages (`openclaw pairing approve discord <CODE>`). Without pairing, DMs are rejected by default.
**How to avoid:** After starting the gateway with Discord configured, complete the pairing flow: `openclaw pairing list discord` and `openclaw pairing approve discord <CODE>`. For server channels (not DMs), ensure the bot is invited to the Discord server with Message Content Intent and Server Members Intent enabled in the Discord Developer Portal.
**Warning signs:** Gateway logs show Discord connection established but no responses in channels.

### Pitfall 5: iMessage SSH Wrapper Permission/Path Errors
**What goes wrong:** The `imsg-ssh` wrapper script exists but is not executable, or `imsg` is not installed at the expected path on the Mac, or SSH key authentication is not set up between the Linux server and Mac (password prompt blocks the non-interactive SSH call).
**Why it happens:** The wrapper relies on passwordless SSH (key auth) from the Linux server to the Mac. If the Linux server's SSH public key is not in the Mac's `~/.ssh/authorized_keys`, `imsg` will never execute.
**How to avoid:** (1) Generate SSH key on each Linux server (`ssh-keygen -t ed25519`). (2) Copy public key to Mac (`ssh-copy-id MAC_USER@MAC_TAILSCALE_IP`). (3) Test: `ssh MAC_USER@MAC_TAILSCALE_IP /usr/local/bin/imsg --version`. (4) Chmod the wrapper: `chmod +x imsg-ssh`. (5) Test OpenClaw iMessage channel with a test message.
**Warning signs:** OpenClaw logs show iMessage channel errors on startup; `ssh -T MAC_USER@MAC_TAILSCALE_IP echo test` prompts for a password.

### Pitfall 6: OpenClaw/Lobster IPC — Unknown Integration Protocol
**What goes wrong:** Plans assume Lobster workflows are straightforward to trigger and integrate. The actual IPC mechanism between OpenClaw gateway and Lobster CLI is not documented in any source examined during this research.
**Why it happens:** Prior architecture research noted this as LOW confidence. Official docs describe Lobster as a tool enabled via `tools.alsoAllow: ["lobster"]` in config, but the invocation protocol (HTTP call, subprocess, socket?) is unverified.
**How to avoid:** Phase 1 plans (01-01, 01-02, 01-03) should NOT depend on Lobster being operational. Validate Lobster integration as a separate investigation step in Phase 1 execution: install Lobster, check `openclaw doctor` output, examine what `tools.alsoAllow: ["lobster"]` actually enables. Report findings before Phase 2 plans that depend on Lobster pipelines.
**Warning signs:** Planning assumes Lobster is "just there" without explicit verification step.

---

## Code Examples

Verified patterns from official sources:

### OpenClaw Bare-Metal Install Sequence (per server)

```bash
# Source: https://docs.openclaw.ai/start/getting-started + https://github.com/openclaw/openclaw/issues/11805

# 1. Prerequisites
sudo apt update && sudo apt install -y curl build-essential

# 2. Node.js 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Must show v22.x.x

# 3. OpenClaw install
sudo npm install -g openclaw@latest
openclaw --version

# 4. Fix headless systemd (CRITICAL for bare-metal servers)
sudo loginctl enable-linger $(whoami)
export XDG_RUNTIME_DIR=/run/user/$(id -u)
echo 'export XDG_RUNTIME_DIR=/run/user/$(id -u)' >> ~/.bashrc

# 5. Onboard with daemon
openclaw onboard --install-daemon

# 6. Verify
openclaw gateway status
curl http://127.0.0.1:18789/health
```

### UFW Hardening for Tailscale-Only SSH

```bash
# Source: https://supun.io/tailscale-ssh-restrict (verified pattern, widely used)

# Install and start Tailscale FIRST
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --authkey=YOUR_AUTH_KEY

# Verify Tailscale IP assigned
tailscale ip -4  # Should show 100.x.x.x

# Test SSH via Tailscale IP NOW (before any UFW changes)
# From Windows workstation: ssh user@100.x.x.x

# Apply UFW rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow in on tailscale0  # Allow all Tailscale traffic (SSH + OpenClaw)
sudo ufw allow 41641/udp         # Tailscale control plane
sudo ufw enable

# Verify: SSH via public IP fails, SSH via Tailscale IP works
```

### sshd Hardening Config

```bash
# Source: https://til.simonwillison.net/tailscale/lock-down-sshd + SSH hardening best practices

# Create /etc/ssh/sshd_config.d/99-hardening.conf
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PasswordAuthentication no
PermitEmptyPasswords no
PermitRootLogin no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers *@100.64.0.0/10
EOF

sudo systemctl restart ssh

# Verify password auth is rejected
ssh -o PasswordAuthentication=yes user@100.x.x.x  # Should be rejected
```

### Discord Bot Setup in openclaw.json

```json5
// Source: https://docs.openclaw.ai/channels/discord.md
// ~/.openclaw/openclaw.json
{
  channels: {
    discord: {
      enabled: true,
      token: "YOUR_BOT_TOKEN",  // Or use DISCORD_BOT_TOKEN env var
      guilds: {
        "GUILD_ID": {
          slug: "homelab",
          channels: {
            "crypto": { allow: true, requireMention: true }
            // claw-main uses "crypto"
            // claw-trade uses "jobs"
            // claw-dev uses "coding"
          }
        }
      },
      historyLimit: 20,
      textChunkLimit: 2000
    }
  }
}
```

**Discord Developer Portal steps:**
1. Create application at https://discord.com/developers/applications
2. Navigate to Bot tab, click "Add Bot"
3. Enable "Message Content Intent" and "Server Members Intent" under Privileged Gateway Intents
4. Copy bot token
5. Under OAuth2 > URL Generator: select "bot" scope + "Send Messages", "Read Message History" permissions
6. Use generated URL to invite bot to Discord server

**Post-start pairing:**
```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

### iMessage Bridge Setup

```bash
# Source: https://www.alibabacloud.com/help/en/simple-application-server/use-cases/invoking-imessage-via-openclaw

# ON THE MAC:
# 1. Install imsg via Homebrew
brew install imsg

# 2. Enable Remote Login in System Settings > General > Sharing

# 3. Grant Full Disk Access to Terminal (or sshd)

# ON EACH LINUX SERVER:
# 4. Generate SSH key
ssh-keygen -t ed25519 -f ~/.ssh/id_mac_bridge -N ""

# 5. Copy to Mac
ssh-copy-id -i ~/.ssh/id_mac_bridge.pub MAC_USER@MAC_TAILSCALE_IP

# 6. Test imsg via SSH
ssh -T -i ~/.ssh/id_mac_bridge MAC_USER@MAC_TAILSCALE_IP /usr/local/bin/imsg --version

# 7. Create wrapper script
mkdir -p ~/.openclaw/scripts
cat > ~/.openclaw/scripts/imsg-ssh <<'EOF'
#!/usr/bin/env bash
exec ssh -T -i ~/.ssh/id_mac_bridge MAC_USER@MAC_TAILSCALE_IP /usr/local/bin/imsg "$@"
EOF
chmod +x ~/.openclaw/scripts/imsg-ssh

# 8. Test wrapper
~/.openclaw/scripts/imsg-ssh --version
```

### Solana RPC Configuration (INFRA-07)

```bash
# Helius: Solana-native, validator priority, ~140ms latency
# Developer plan: $49/month, 10M credits, 50 RPS

# QuickNode: Multi-region, 40-70ms latency
# Paid plans from $5/month, 250 RPS on entry tier

# Configure as environment variable (never hardcode)
export SOLANA_RPC_URL="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
# Or QuickNode:
# export SOLANA_RPC_URL="https://YOUR_ENDPOINT.quiknode.pro/YOUR_TOKEN/"

# Add to ~/.openclaw/workspace/.env (not committed to git)
```

**Recommendation:** Helius for claw-main (Solana-native, validator priority improves transaction landing during congestion). QuickNode as backup/alternative.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| imsg (legacy iMessage) | BlueBubbles (recommended) | 2025-2026 | OpenClaw docs now recommend BlueBubbles for new deployments; imsg still works but is "legacy" |
| docker-compose v1 (standalone) | Docker Compose v2 (bundled, `docker compose`) | 2024 (v1 EOL) | Not relevant for this phase (no Docker), but relevant if openclaw-ansible scripts reference old syntax |
| OpenClaw/Clawdbot/Moltbot naming | OpenClaw (current branding) | Early 2025 | Config files may still use "clawdbot" paths in legacy installations; new installs use "openclaw" |
| Node.js 20 LTS (Jod predecessor) | Node.js 22 LTS (Jod, Active LTS) | Oct 2024 | OpenClaw requires 22+; do not use 20 even though it's still LTS |

**Deprecated/outdated:**
- `docker-compose` (hyphen, Python package): EOL. Use `docker compose` (plugin, bundled with Docker Engine)
- `openclaw-ansible` Docker-default path: The ansible repo defaults to Docker containers around OpenClaw. For bare-metal, adapt the Node.js install role but skip the Docker role entirely.
- Password authentication for SSH: Disabled by default recommendation has been standard for years but many guides still show it enabled for convenience.

---

## Open Questions

1. **Which Mac will serve as the iMessage bridge?**
   - What we know: iMessage requires a macOS machine running Messages.app; all three Linux servers need to reach it.
   - What's unclear: Does the owner have a Mac available to run 24/7? Is it the Windows workstation (with WSL/VM)? A Mac mini? An existing MacBook?
   - Recommendation: Resolve before Plan 01-03. If no Mac is available, substitute ntfy.sh for critical alerts (https://ntfy.sh — self-hosted push notifications, no Apple dependency).

2. **Lobster IPC mechanism — what exactly enables Lobster in OpenClaw?**
   - What we know: `tools.alsoAllow: ["lobster"]` in config enables Lobster; Lobster must be installed on the same host as the gateway; the `lobster` binary is invoked by OpenClaw.
   - What's unclear: Is it a subprocess call (OpenClaw forks lobster)? HTTP? Stdio pipe? The protocol is not documented in any source reviewed.
   - Recommendation: Install Lobster alongside OpenClaw in Plan 01-02, check `openclaw doctor` output, and test a simple pipeline. Document the actual mechanism before Phase 2 plan depends on Lobster for trading workflows.

3. **Is the Helius or QuickNode RPC endpoint set up before or after servers are provisioned?**
   - What we know: INFRA-07 is a Phase 1 requirement; the RPC URL is only needed for Plan 01-01 or later when crypto skills are written.
   - What's unclear: Which plan in Phase 1 configures the RPC URL? It is not needed for OpenClaw gateway itself — only for the crypto skills in Phase 2.
   - Recommendation: Acquire and store the RPC URL (Helius recommended) as a secret in Ansible Vault during Phase 1, but don't configure it in any service until Phase 2. This closes INFRA-07 as "provisioned" without blocking Phase 1 completion.

4. **openclaw-ansible: Docker vs bare-metal adaptation**
   - What we know: openclaw-ansible installs OpenClaw in Docker containers by default (confirmed from architecture.md). The Phase 1 requirement is bare-metal.
   - What's unclear: How much of openclaw-ansible's roles can be reused (Tailscale role, UFW role) vs. how much needs to be rewritten for bare-metal Node.js install?
   - Recommendation: Reuse the Tailscale and UFW roles directly. Replace the openclaw role with a bare-metal variant: Node.js 22 via NodeSource, `npm install -g openclaw@latest`, `loginctl enable-linger`, `openclaw onboard --install-daemon`. Skip the Docker role entirely.

---

## Sources

### Primary (HIGH confidence)
- https://docs.openclaw.ai/start/getting-started — Installation steps, port 18789, `--install-daemon` flag, Node.js 22 requirement
- https://docs.openclaw.ai/gateway/configuration-reference — Full `openclaw.json` schema: gateway.port, gateway.bind, channels.discord, channels.imessage, agents.defaults.workspace, logging
- https://docs.openclaw.ai/channels/discord.md — Discord bot setup, token configuration, guild/channel configuration, pairing flow
- https://docs.openclaw.ai/channels/imessage.md — iMessage architecture (macOS required), imsg CLI, SSH wrapper pattern, BlueBubbles recommendation
- https://docs.openclaw.ai/tools/lobster.md — Lobster as "typed workflow runtime," `tools.alsoAllow: ["lobster"]`, run/resume commands
- https://docs.openclaw.ai/reference/templates/SOUL — SOUL.md template structure and philosophy
- https://github.com/openclaw/openclaw/issues/11805 — Headless systemd issue: `loginctl enable-linger`, `XDG_RUNTIME_DIR` fix, service file location
- https://github.com/openclaw/openclaw — Main repo: npm install pattern, pnpm alternative, workspace path, openclaw.json location

### Secondary (MEDIUM confidence)
- https://github.com/openclaw/openclaw-ansible — Architecture reference: UFW+Docker chain, Tailscale install, Fail2ban, `openclaw` user, systemd via docker compose (adapted to bare-metal)
- https://supun.io/tailscale-ssh-restrict — UFW commands for Tailscale SSH restriction (verified pattern, widely cited)
- https://til.simonwillison.net/tailscale/lock-down-sshd — `AllowUsers *@100.64.0.0/10` sshd_config pattern
- https://www.alibabacloud.com/help/en/simple-application-server/use-cases/invoking-imessage-via-openclaw — Linux-to-Mac iMessage bridge via Tailscale + SSH wrapper (confirms the architecture and exact config fields)
- https://www.helius.dev/pricing — Helius plan pricing (Developer: $49/mo, 10M credits, 50 RPS)
- https://chainstack.com/best-solana-rpc-providers-in-2026/ — Helius vs QuickNode 2026 comparison (Helius Solana-native, validator priority; QuickNode lower latency)
- https://tailscale.com/kb/1031/install-linux — Tailscale Linux install (Ubuntu 24.04 supported)

### Tertiary (LOW confidence — flag for validation)
- OpenClaw/Lobster IPC mechanism: No source documents the actual inter-process communication protocol. LOW confidence — must be validated during Phase 1 execution.
- SOUL.md exact loading mechanism: Sources confirm location (`~/.openclaw/workspace/SOUL.md`) but not whether it is loaded on every message or only at session start. Validate during Plan 01-02 SOUL.md testing.

---

## Metadata

**Confidence breakdown:**
- OpenClaw installation (bare-metal, systemd): HIGH — verified against official docs and confirmed GitHub issue with workaround
- OpenClaw Discord integration: HIGH — verified against official channel docs with exact config schema
- iMessage Linux bridge architecture: HIGH — verified against official iMessage channel docs + Alibaba Cloud guide
- SSH/UFW/Tailscale hardening: HIGH — multiple verified sources, established practice
- SOUL.md format and location: MEDIUM — template structure verified, exact loading behavior not confirmed
- Lobster/ClawHub IPC: LOW — confirmed Lobster exists and is enabled via config; protocol unverified
- Solana RPC pricing (Helius/QuickNode): MEDIUM — 2026 pricing pages found but not deeply verified

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days for stable infrastructure tooling; OpenClaw is active development — re-verify if delayed beyond 30 days)
