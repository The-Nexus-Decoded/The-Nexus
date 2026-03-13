# OpenClaw Memory Optimization Guide

**Compiled:** 2026-03-03  
**Source:** Web research + community best practices  
**Status:** Reference document for fleet optimization

---

## 1. Backend Configuration

### QMD Backend (Recommended)
```json
"memory": {
  "backend": "qmd"
}
```
- Replaces SQLite with QMD: a local-first search sidecar
- Combines BM25 + vector search + reranking
- Markdown remains source of truth; OpenClaw shells out to QMD for retrieval
- **Docs:** https://docs.openclaw.ai/concepts/memory

---

## 2. Embedding Cache Settings

Enable in `openclaw.json`:

```json
"memorySearch": {
  "provider": "local",
  "model": "all-MiniLM-L6-v2",
  "local": {
    "modelPath": "sentence-transformers/all-MiniLM-L6-v2"
  },
  "query": {
    "hybrid": {
      "enabled": true,
      "vectorWeight": 0.7,
      "textWeight": 0.3,
      "candidateMultiplier": 4
    }
  },
  "cache": {
    "enabled": true,
    "maxEntries": 50000
  }
}
```

**Verify cache population:**
```bash
sqlite3 ~/.openclaw/memory/main.sqlite "SELECT COUNT(*) FROM embedding_cache;"
```

**Note:** Cache starts empty; runs after a few search queries.

**Reference:** GitHub Discussion #6038

---

## 3. File Size Management

- Keep individual markdown memory files **<1MB**
- Split large files into multiple smaller ones
- Batch processing with caching for large file embeddings
- Prevents expensive per-chunk embedding operations

**Source:** EastonDev Blog - "OpenClaw Local Memory System"

---

## 4. Token Reduction: Session Reset Strategy

**Most effective optimization:** Regular session resets save **40-60% token usage**

Implementation:
- Periodically reset conversations in the gateway
- Clears accumulated context while preserving long-term memory
- Simple to automate via cron or fleet scheduler

**Source:** EastonDev Blog - "OpenClaw Performance Optimization"

---

## 5. System-Level Memory Limits

### systemd services
```ini
[Service]
MemoryMax=2G
MemoryHigh=1.8G
```

### Docker
```bash
docker run -m 2g --memory-swap 2g ...
```

These prevent runaway memory consumption and enforce garbage collection.

**Source:** OpenClaw Experts - "Fix High Memory Usage"

---

## 6. Production Stack Examples

### $15/month VPS setup (OpenRouter)
- Models: Kimi K2.5 (primary) + MiniMax M2.5 (fallback)
- No OAuth management, no rate limit dancing
- Architecture simplified compared to earlier versions
- Full migration achieved ~6 days ago (as of Feb 2025)

**Source:** Medium - "My OpenClaw Production Stack"

---

## 7. Additional Resources

| Topic | Link |
|-------|------|
| Memory System Deep Dive | https://snowan.gitbook.io/study-notes/ai-blogs/openclaw-memory-system-deep-dive |
| Performance Optimization | https://eastondev.com/blog/en/posts/ai/20260205-openclaw-performance/ |
| Memory Best Practices | https://eastondev.com/blog/en/posts/ai/20260205-openclaw-memory-system/ |
| Troubleshooting High Memory | https://www.openclawexperts.io/guides/troubleshooting/how-to-fix-openclaw-high-memory-usage |
| Fleet Roadmap (Performance) | https://openclawroadmap.com/troubleshooting-performance.php |
| GitHub Discussion #6038 | https://github.com/openclaw/openclaw/discussions/6038 |

---

## 8. Quick Win Checklist

- [ ] Set `memory.backend = "qmd"` (if available in your version)
- [ ] Enable embedding cache with `maxEntries: 50000`
- [ ] Audit memory/ directory; split any files >1MB
- [ ] Configure systemd memory limits on all servers
- [ ] Schedule regular session resets (cron via fleet CLI)
- [ ] Monitor `~/.openclaw/memory/main.sqlite` cache growth

---

**Last Updated:** 2026-03-03  
**Maintainer:** Zifnab (ola-claw-main)  
**Repo:** Nexus-Vaults/docs/OPENCLAW-MEMORY-OPTIMIZATION.md
