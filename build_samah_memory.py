#!/usr/bin/env python3
import json, re, os
from datetime import datetime

INPUT_FILE = "/tmp/games_vr_full.json"
OUTPUT_PATHS = [
    "/data/openclaw/workspace-samah/MEMORY.md",
    "/home/openclaw/.openclaw/workspace-samah/MEMORY.md",
]
TOPIC_KEYWORDS = [
    "soul drifter", "souldrifter", "realm physics",
    "three.js", "threejs", "webxr", "web xr",
    "gesture spec", "haptic spec", "haptics",
    "class system", "ambient-skin", "ambient skin",
    "xrpc", "spatial", "hand tracking", "handtracking",
    "physics engine", "vr spec", "issue #196", "#196",
    "xr-runtime", "xr runtime", "locomotion", "soul-drift", "drift mechanic",
]

def load_messages(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list): return data
    if isinstance(data, dict):
        for k in ("messages", "data", "channel"):
            if k in data and isinstance(data[k], list): return data[k]
    return []

def get_author(msg):
    a = msg.get("author", {})
    if isinstance(a, dict): return a.get("username", "") or a.get("name", "") or ""
    return str(a) if a else ""

def get_timestamp(msg):
    return msg.get("timestamp") or msg.get("created_at") or msg.get("date") or ""

def get_content(msg):
    return msg.get("content", "") or msg.get("text", "") or ""

def has_topic(text):
    low = text.lower()
    return any(k in low for k in TOPIC_KEYWORDS)

def extract_code_blocks(text):
    bt = chr(96) * 3
    return re.findall(bt + r"[\s\S]*?" + bt, text)

def extract_file_paths(text):
    p = re.findall(r"/(?:data|home|tmp|etc|var|opt|usr)[^\s]+", text)
    return list(set(p))

def extract_spec_names(text):
    s = re.findall(r"[\w\-]+\.(?:md|spec\.md|spec|yaml|yml|json)", text, re.IGNORECASE)
    return list(set(s))

def fmt_ts(ts):
    if not ts: return "unknown"
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M UTC")
    except Exception:
        return ts[:19] if len(ts) >= 19 else ts

def main():
    print("Loading " + INPUT_FILE + "...")
    messages = load_messages(INPUT_FILE)
    print("Total messages: " + str(len(messages)))
    samah_msgs, topic_msgs = [], []
    for msg in messages:
        author = get_author(msg)
        content = get_content(msg)
        is_samah = author.lower() == "samah"
        if is_samah: samah_msgs.append(msg)
        elif has_topic(content): topic_msgs.append(msg)
    print("Samah messages: " + str(len(samah_msgs)))
    print("Topic msgs from others: " + str(len(topic_msgs)))
    samah_msgs.sort(key=lambda m: get_timestamp(m))
    topic_msgs.sort(key=lambda m: get_timestamp(m))
    code_blocks, file_paths, spec_names, key_msgs, agreements, decisions = [], [], [], [], [], []
    for msg in samah_msgs:
        c = get_content(msg)
        ts = fmt_ts(get_timestamp(msg))
        cb = extract_code_blocks(c)
        fp = extract_file_paths(c)
        sp = extract_spec_names(c)
        for b in cb: code_blocks.append({"ts": ts, "code": b})
        file_paths.extend(fp); spec_names.extend(sp)
        if len(c) > 80 or cb or sp or has_topic(c): key_msgs.append({"ts": ts, "content": c})
        lower = c.lower()
        if any(w in lower for w in ["agreed", "we will", "decided", "going with", "finalized", "confirmed"]):
            agreements.append({"ts": ts, "content": c})
        if any(w in lower for w in ["architecture", "design", "structure", "approach", "implement", "spec", "phase"]):
            decisions.append({"ts": ts, "content": c})
    unique_paths = sorted(set(file_paths))
    unique_specs = sorted(set(spec_names))
    soul_msgs = [m for m in samah_msgs if has_topic(get_content(m))]
    print("Key messages: " + str(len(key_msgs)))
    print("Code blocks: " + str(len(code_blocks)))
    print("File paths: " + str(len(unique_paths)))
    print("Spec names: " + str(len(unique_specs)))
    print("Soul Drifter msgs: " + str(len(soul_msgs)))
    print("Agreements: " + str(len(agreements)))
    print("Decisions: " + str(len(decisions)))
    sep_line = "=== SAMPLE KEY MESSAGES (first 5) ==="
    print(sep_line)
    for m in key_msgs[:5]:
        ts_v = m["ts"]; cnt = m["content"]
        print("[" + ts_v + "] " + cnt[:300])
        print("---")
    n_total = str(len(messages)); n_samah = str(len(samah_msgs))
    L = ["# Samah -- Agent Memory", "",
         "*Built from games-vr channel: " + n_total + " total msgs, " + n_samah + " from Samah*",
         "", "## Identity", "",
         "- **Name**: Samah",
         "- **Server**: ola-claw-trade (Hugh server)",
         "- **Role**: Lead VR/games developer -- Soul Drifter project",
         "- **Co-located with**: Hugh (crypto trader) -- this is normal and intentional",
         "- **Workspace**: `/data/openclaw/workspace-samah/`",
         "- **Repo**: `/data/repos/The-Nexus/`",
         "", "## Soul Drifter Project", "",
         "- **Lead project**: Soul Drifter -- immersive WebXR/VR experience",
         "- **GitHub Issue**: #196",
         "- **Tech stack**: Three.js, WebXR, hand tracking, gesture recognition, haptic feedback",
         ""]
    if soul_msgs:
        L += ["### Soul Drifter Messages by Samah (chronological)", ""]
        for msg in soul_msgs[:30]:
            ts = fmt_ts(get_timestamp(msg)); content = get_content(msg)
            L += ["**[" + ts + "]**", content.strip(), ""]
    L += ["## Technical Work Done", "", "### All Key Messages from Samah (chronological)", ""]
    for msg in key_msgs:
        ts_v = msg["ts"]; L += ["**[" + ts_v + "]**", msg["content"].strip(), ""]
    if code_blocks:
        L += ["### Code Blocks Shared by Samah", ""]
        for entry in code_blocks:
            ets = entry["ts"]; L += ["*[" + ets + "]*", entry["code"], ""]
    L += ["## Active Specs", ""]
    if unique_specs:
        L += ["Spec files mentioned by Samah:", ""]
        for s in unique_specs: L.append("- `" + s + "`")
    else: L.append("*No explicit spec filenames detected -- see key messages above.*")
    L.append("")
    L += ["## File Paths Mentioned", ""]
    if unique_paths:
        for p in unique_paths: L.append("- `" + p + "`")
    else: L.append("*No explicit file paths detected.*")
    L.append("")
    L += ["## Agreements & Decisions", ""]
    if agreements:
        L += ["### Agreements", ""]
        for a in agreements:
            ats = a["ts"]; acnt = a["content"].strip()
            L += ["**[" + ats + "]** " + acnt, ""]
    if decisions:
        L += ["### Technical Decisions", ""]
        for d in decisions:
            dts = d["ts"]; dcnt = d["content"].strip()
            L += ["**[" + dts + "]** " + dcnt, ""]
    L += ["## Context from Other Agents", "",
          "*Messages mentioning Soul Drifter / VR topics from other agents:*", ""]
    for msg in topic_msgs[:40]:
        author = get_author(msg); ts = fmt_ts(get_timestamp(msg)); content = get_content(msg)
        L += ["**[" + ts + "] " + author + "**: " + content.strip(), ""]
    L += ["## Team & Protocols", "",
          "- **Alfred** (ola-claw-dev): Memory keeper, CI supervisor",
          "- **Haplo** (ola-claw-dev): Main dev agent",
          "- **Zifnab** (ola-claw-main): Coordinator, creates project folders/tickets",
          "- **Hugh** (ola-claw-trade): Crypto trader, co-server with Samah",
          "- **Samah** (ola-claw-trade): VR/games lead",
          "", "### Key Protocols",
          "- Branch naming: feat/<desc>, fix/<desc>, hotfix/<desc>",
          "- All code: PR -> phantom-gauntlet CI -> merge to main -> auto-deploy",
          "- Project creation: Senior devs write specs -> #coding -> Zifnab creates folders/tickets",
          "- Storage protocol (PR #198): deployed to all 10 agents",
          "", "## Server & Workspace Paths", "",
          "| Path | Purpose |", "|------|---------||",
          "| `/data/openclaw/workspace-samah/` | Samah primary workspace |",
          "| `/home/openclaw/.openclaw/workspace-samah/` | Alternate workspace |",
          "| `/data/repos/The-Nexus/` | Monorepo (git ops) |",
          "| `/data/openclaw/workspace/The-Nexus/` | Monorepo (edits) |",
          "| `/data/openclaw/workspace/The-Nexus/Arianus-Sky/` | UI/Dashboards |",
          "| `/data/openclaw/workspace/The-Nexus/Pryan-Fire/` | Python/Node services |",
          "| `/data/openclaw/workspace/The-Nexus/Abarrach-Stone/` | Data/Schemas |",
          "| `/data/openclaw/workspace/The-Nexus/Chelestra-Sea/` | Infrastructure |",
          "| `/data/openclaw/workspace/workflows/` | Lobster workflows |",
          "", "## Stats", "",
          "- Total messages analyzed: " + n_total,
          "- Samah messages: " + n_samah,
          "- Key/substantive messages: " + str(len(key_msgs)),
          "- Code blocks: " + str(len(code_blocks)),
          "- Topic msgs from others: " + str(len(topic_msgs)),
          "- Agreements: " + str(len(agreements)),
          "- Decisions: " + str(len(decisions)),
          ""]
    memory = chr(10).join(L)
    for out_path in OUTPUT_PATHS:
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f: f.write(memory)
        print("Written: " + out_path)
    print("MEMORY.md size: " + str(len(memory)) + " bytes")
    print("Done.")

if __name__ == "__main__":
    main()
