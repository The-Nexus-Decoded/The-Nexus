# OpenClaw Agent Settings Resolution & Final Handoff (v5)

## Purpose

This document is the v5 handoff for the OpenClaw fleet settings design, targeting **OpenClaw v2026.4.5**. It supersedes v4 and contains the full, instantiated JSON configuration blocks as they actually exist on servers after the fleet normalization rollout.

This version explicitly includes:

- the agreed agent-to-profile mapping (unchanged from v4)
- all 7 profile tiers with full JSON config blocks (not YAML dot-notation -- real JSON as applied)
- all new v2026.4.5 settings that did not exist in v4 (models, providers, plugins, talk, memory-core dreaming, etc.)
- the complete provider/model chain per tier
- plugin and hook configuration per tier
- MiniMax provider integration (new in v5)
- Anthropic OAuth provider (new in v5)
- vLLM provider for dev/trade servers (new in v5)
- memory-core dreaming configuration per tier
- talk/speech configuration per tier
- auto-presence Discord configuration per tier
- loop detection configuration per tier
- a diff of what changed from v4 to v5

All secrets (API keys, tokens) are shown as `REDACTED`. Environment variable references like `${MINIMAX_API_KEY}` are preserved as-is since they resolve at runtime.

---

# Working agreement

We are **not** assigning every agent blindly from a matrix alone.

We will:

1. review each agent's intended role
2. compare that role against the baseline profiles
3. pick the closest baseline
4. make only targeted changes when justified
5. keep the family coherent and maintainable

This means the system will use:

- shared role-based profile standards
- case-by-case review of real agents
- limited and justified exceptions

---

# Final profile family

The agreed profile family is:

1. **Lead Orchestrator**
2. **Assistant Orchestrator**
3. **Architect Dev Coder**
4. **Senior Dev Coder**
5. **Standard Work Agent**
6. **Standard Companion Agent**
7. **Capital-Risk Operator**

---

# Final agreed agent-to-profile mapping

## Lead Orchestrator
- **Zifnab**

## Assistant Orchestrator
- **Alfred**
- **Jonathon**
- **Sinistrad**

## Architect Dev Coder
- **Haplo**
- **Vasu**
- **Samah**

## Senior Dev Coder
- **Marit**
- **Paithan**
- **Limbeck**
- **Balthazar**
- **Drugar**
- **Devon**

## Standard Companion Agent
- **Iridal**
- **Edmund**
- **Rega**

## Standard Work Agent
- **Ciang**
- **Trian**
- **Ramu**

## Capital-Risk Operator
- **Hugh**

### Mapping notes (unchanged from v4)
- **Alfred** is intentionally placed at **Assistant Orchestrator** rather than Lead Orchestrator.
- **Ramu** is intentionally placed at **Standard Work Agent**, even though he is a high-context standard role and may be revisited later if scope grows.
- **Marit** is intentionally placed in **Senior Dev Coder** because her QA/testing role is deeply technical and tied to developer code validation.
- **Hugh** is intentionally placed in a separate **Capital-Risk Operator** profile because live capital risk deserves stricter controls than the normal 6 profiles.

---

# Profile configs

## 1) Lead Orchestrator

### Intended use
Top-level coordination, higher-authority routing, deciding who should do what, supervising multiple workstreams, controlled delegation, cross-agent planning.

### Assigned agents
- **Zifnab**

### Tier-specific notes
- Only profile with `acp.dispatch.enabled: true` (can auto-dispatch work to other agents)
- Only profile with `cron.enabled: true` among orchestrators
- Zifnab gets `logging.level: debug` override
- Has the full OpenRouter model chain plus MiniMax and Anthropic OAuth
- Primary model: `openai-codex/gpt-5.4` with Sonnet 4.6 and GPT-5.4 fallbacks
- `thinkingDefault: xhigh` (upgraded from v4's `adaptive`)
- `sandbox.mode: off` (upgraded from v4's `non-main`)
- Memory dreaming enabled (runs nightly consolidation)
- Gateway port: 18850

### Full config

```json
{
  "meta": {
    "lastTouchedVersion": "2026.4.5",
    "lastTouchedAt": "2026-04-07T05:25:50.473Z"
  },
  "env": {
    "MINIMAX_API_KEY": "REDACTED",
    "GEMINI_API_KEY": "REDACTED"
  },
  "logging": {
    "level": "debug",
    "file": "/data/openclaw/logs/zifnab.log"
  },
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/chromium-browser",
    "headless": true,
    "noSandbox": true,
    "defaultProfile": "openclaw"
  },
  "acp": {
    "enabled": true,
    "dispatch": {
      "enabled": true
    },
    "backend": "acpx",
    "allowedAgents": [
      "claude",
      "codex",
      "gemini",
      "opencode"
    ],
    "maxConcurrentSessions": 4
  },
  "models": {
    "mode": "merge",
    "providers": {
      "google": {
        "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
        "apiKey": "REDACTED",
        "models": [
          {
            "id": "gemini-2.5-flash",
            "name": "Gemini 2.5 Flash"
          }
        ]
      },
      "minimax": {
        "baseUrl": "https://api.minimax.io/anthropic",
        "apiKey": "${MINIMAX_API_KEY}",
        "api": "anthropic-messages",
        "models": [
          {
            "id": "MiniMax-M2.7",
            "name": "MiniMax M2.5",
            "reasoning": true,
            "input": ["text"],
            "cost": {
              "input": 0.3,
              "output": 1.2,
              "cacheRead": 0.03,
              "cacheWrite": 0.12
            },
            "contextWindow": 200000,
            "maxTokens": 8192
          },
          {
            "id": "MiniMax-M2.7-highspeed",
            "name": "MiniMax M2.5 Highspeed",
            "reasoning": true,
            "input": ["text"],
            "cost": {
              "input": 0.3,
              "output": 1.2,
              "cacheRead": 0.03,
              "cacheWrite": 0.12
            },
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      },
      "anthropic": {
        "baseUrl": "https://api.anthropic.com",
        "apiKey": "",
        "auth": "oauth",
        "models": [
          {
            "id": "claude-opus-4-6",
            "name": "Claude Opus 4.6"
          },
          {
            "id": "claude-sonnet-4-6",
            "name": "Claude Sonnet 4.6"
          }
        ]
      },
      "openrouter": {
        "baseUrl": "https://openrouter.ai/api/v1",
        "apiKey": "REDACTED",
        "models": [
          {
            "id": "stepfun/step-3.5-flash:free",
            "name": "Step 3.5 Flash (Free)"
          },
          {
            "id": "z-ai/glm-4.5-air:free",
            "name": "GLM 4.5 Air (Free)"
          },
          {
            "id": "qwen/qwen3-vl-235b-a22b-thinking",
            "name": "Qwen3 VL 235B Thinking (Free)"
          },
          {
            "id": "arcee-ai/trinity-large-preview:free",
            "name": "Trinity Large Preview (Free)"
          },
          {
            "id": "qwen/qwen3-4b:free",
            "name": "Qwen3 4B (Free)"
          },
          {
            "id": "deepseek/deepseek-v3.2",
            "name": "DeepSeek V3.2"
          },
          {
            "id": "x-ai/grok-4.1-fast",
            "name": "Grok 4.1 Fast"
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "thinkingDefault": "xhigh",
      "sandbox": {
        "mode": "off"
      },
      "bootstrapMaxChars": 50000,
      "bootstrapTotalMaxChars": 300000,
      "bootstrapPromptTruncationWarning": "once",
      "contextInjection": "continuation-skip",
      "model": {
        "primary": "openai-codex/gpt-5.4",
        "fallbacks": [
          "anthropic/claude-sonnet-4-6",
          "openai-codex/gpt-5.4"
        ]
      },
      "workspace": "/home/openclaw/.openclaw-zifnab/workspace",
      "memorySearch": {
        "enabled": true,
        "provider": "local",
        "experimental": {
          "sessionMemory": true
        },
        "sources": ["memory", "sessions"],
        "query": {
          "hybrid": {
            "enabled": true,
            "vectorWeight": 0.7,
            "textWeight": 0.3,
            "mmr": {
              "enabled": true,
              "lambda": 0.75
            },
            "temporalDecay": {
              "enabled": true,
              "halfLifeDays": 30
            }
          }
        }
      },
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "1h",
        "keepLastAssistants": 4
      },
      "compaction": {
        "mode": "default",
        "model": "minimax/MiniMax-M2.7",
        "notifyUser": false,
        "truncateAfterCompaction": true,
        "postIndexSync": "async",
        "reserveTokensFloor": 20000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 40000,
          "prompt": "Before compaction, save only durable coordination knowledge:\n- who is handling what\n- current status\n- blocked items\n- dependencies\n- routing notes that matter later\nDo not save implementation debris, repetitive summaries, or short-lived chatter.",
          "systemPrompt": "You are performing a pre-compaction memory flush.\nSave concise routing and coordination facts only."
        }
      },
      "heartbeat": {
        "isolatedSession": true
      },
      "imageGenerationModel": {
        "primary": "minimax/image-01"
      },
      "videoGenerationModel": {
        "primary": "minimax/MiniMax-Hailuo-2.3-Fast",
        "fallbacks": ["minimax/MiniMax-Hailuo-2.3"]
      },
      "musicGenerationModel": {
        "primary": "minimax/music-2.5+",
        "fallbacks": ["minimax/music-2.5", "minimax/music-2.0"]
      },
      "subagents": {
        "maxConcurrent": 4,
        "maxSpawnDepth": 2,
        "maxChildrenPerAgent": 3
      },
      "models": {
        "openrouter/stepfun/step-3.5-flash:free": {},
        "openrouter/z-ai/glm-4.5-air:free": {},
        "openrouter/qwen/qwen3-vl-235b-a22b-thinking": {},
        "openrouter/arcee-ai/trinity-large-preview:free": {},
        "openrouter/qwen/qwen3-4b:free": {},
        "google/gemini-2.5-flash": {},
        "openrouter/deepseek/deepseek-v3.2": {},
        "openrouter/x-ai/grok-4.1-fast": {},
        "ollama/qwen2.5-coder:7b": {},
        "minimax/MiniMax-M2": {},
        "openai-codex/gpt-5.4": {}
      }
    }
  },
  "tools": {
    "exec": {
      "security": "full"
    },
    "profile": "full",
    "alsoAllow": ["lobster"],
    "web": {
      "search": {}
    },
    "sessions": {
      "visibility": "agent"
    },
    "agentToAgent": {
      "enabled": true
    },
    "elevated": {
      "enabled": false
    },
    "loopDetection": {
      "enabled": true,
      "warningThreshold": 10,
      "criticalThreshold": 20,
      "globalCircuitBreakerThreshold": 30
    }
  },
  "session": {
    "agentToAgent": {
      "maxPingPongTurns": 5
    }
  },
  "messages": {
    "groupChat": {
      "mentionPatterns": ["\\b@?Zifnab\\b"]
    }
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true,
    "ownerDisplay": "raw"
  },
  "cron": {
    "enabled": true
  },
  "discovery": {
    "mdns": {
      "mode": "off"
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": "REDACTED",
      "allowBots": true,
      "groupPolicy": "open",
      "historyLimit": 25,
      "textChunkLimit": 2000,
      "streaming": "partial",
      "contextVisibility": "all",
      "autoPresence": {
        "enabled": true,
        "healthyText": "Online",
        "degradedText": "Degraded",
        "exhaustedText": "Credits exhausted"
      },
      "agentComponents": {
        "enabled": true
      },
      "guilds": {
        "1475082873777426494": {
          "slug": "olaclaw-homelab",
          "channels": {
            "1475082874234343621": { "requireMention": true, "enabled": true },
            "1475082997027049584": { "requireMention": false, "enabled": true },
            "1475083038810443878": { "requireMention": true, "enabled": true },
            "1475082964156157972": { "requireMention": true, "enabled": true },
            "1480481255303676087": { "requireMention": true, "enabled": true },
            "1480482379838525500": { "requireMention": true, "enabled": true },
            "1480483545431412877": { "requireMention": true, "enabled": true },
            "1481316823982149634": { "requireMention": true, "enabled": true },
            "1481316829803843616": { "requireMention": true, "enabled": true },
            "1481316827014365388": { "requireMention": true, "enabled": true },
            "1489774242319958177": { "requireMention": true, "enabled": true }
          }
        }
      },
      "retry": {
        "attempts": 2,
        "minDelayMs": 1000,
        "maxDelayMs": 60000
      }
    }
  },
  "gateway": {
    "port": 18850,
    "mode": "local",
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "REDACTED"
    }
  },
  "skills": {
    "install": {
      "nodeManager": "npm"
    }
  },
  "plugins": {
    "allow": [
      "acpx", "discord", "browser", "minimax",
      "openai", "anthropic", "openrouter", "google", "ollama"
    ],
    "entries": {
      "discord": { "enabled": true },
      "lobster": { "enabled": true },
      "acpx": { "enabled": true },
      "browser": { "enabled": true },
      "minimax": { "enabled": true },
      "brave": {
        "config": {
          "webSearch": { "apiKey": "REDACTED" }
        }
      },
      "openai": { "enabled": true },
      "anthropic": { "enabled": true },
      "openrouter": { "enabled": true },
      "google": { "enabled": true },
      "ollama": { "enabled": true },
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true,
            "frequency": "0 3 * * *",
            "timezone": "America/Chicago",
            "verboseLogging": true,
            "storage": {
              "mode": "both",
              "separateReports": true
            },
            "execution": {
              "defaults": {
                "speed": "balanced",
                "thinking": "medium",
                "budget": "medium",
                "model": "minimax/MiniMax-M2.7"
              }
            },
            "phases": {
              "light": {
                "enabled": true,
                "cron": "0 */6 * * *",
                "lookbackDays": 2,
                "limit": 100,
                "dedupeSimilarity": 0.9,
                "sources": ["daily", "sessions", "recall"]
              },
              "deep": {
                "enabled": true,
                "cron": "0 3 * * *",
                "limit": 10,
                "minScore": 0.8,
                "minRecallCount": 3,
                "minUniqueQueries": 3,
                "recencyHalfLifeDays": 14,
                "maxAgeDays": 30,
                "sources": ["daily", "memory", "sessions", "logs", "recall"],
                "recovery": {
                  "enabled": true,
                  "triggerBelowHealth": 0.35
                }
              },
              "rem": {
                "enabled": true,
                "cron": "0 5 * * 0",
                "lookbackDays": 7,
                "limit": 10,
                "minPatternStrength": 0.75,
                "sources": ["memory", "daily", "deep"]
              }
            }
          }
        }
      }
    }
  },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": [
            "OPERATIONS.md",
            "TEAM.md",
            "OWNER-OVERRIDE.md",
            "DISCORD-RULES.md",
            "PERSONALITYLAYERS.md"
          ]
        }
      }
    }
  },
  "memory": {
    "backend": "qmd",
    "citations": "auto",
    "qmd": {
      "command": "/home/openclaw/.bun/bin/qmd",
      "searchMode": "search",
      "includeDefaultMemory": true,
      "update": {
        "interval": "15m",
        "debounceMs": 30000
      },
      "limits": {
        "maxResults": 6,
        "timeoutMs": 5000
      }
    }
  },
  "talk": {
    "provider": "minimax",
    "providers": {
      "minimax": {
        "apiKey": "${MINIMAX_API_KEY}",
        "model": "speech-2.8-hd"
      }
    },
    "interruptOnSpeech": true,
    "silenceTimeoutMs": 1500
  }
}
```

---

## 2) Assistant Orchestrator

### Intended use
Light coordination, routing tasks, watching status, helping manage workflow, keeping structured awareness of ongoing work. May have elevated access for code review, security ops, or scraping depending on the specific agent.

### Assigned agents
- **Alfred**
- **Jonathon**
- **Sinistrad**

### Tier-specific notes
- All three agents get `logging.level: debug`
- `acp.dispatch.enabled: false` (unlike Lead Orchestrator)
- Alfred's fallbacks are MiniMax then Gemini (different from Lead's Sonnet fallback)
- `thinkingDefault: xhigh` (upgraded from v4's `medium`)
- `sandbox.mode: off` (upgraded from v4's `non-main`)
- Memory dreaming disabled by default (can be enabled per-agent)
- Gateway port example: Alfred at 18810

### Full config

```json
{
  "meta": {
    "lastTouchedVersion": "2026.4.5",
    "lastTouchedAt": "2026-04-07T05:36:24.117Z"
  },
  "env": {
    "MINIMAX_API_KEY": "REDACTED",
    "GEMINI_API_KEY": "REDACTED"
  },
  "logging": {
    "level": "debug",
    "file": "/data/openclaw/logs/alfred.log"
  },
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/chromium-browser",
    "headless": true,
    "noSandbox": true,
    "defaultProfile": "openclaw"
  },
  "acp": {
    "enabled": true,
    "dispatch": {
      "enabled": false
    },
    "backend": "acpx",
    "allowedAgents": [
      "claude",
      "codex",
      "gemini",
      "opencode"
    ],
    "maxConcurrentSessions": 3
  },
  "models": {
    "mode": "merge",
    "providers": {
      "google": {
        "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
        "apiKey": "REDACTED",
        "models": [
          {
            "id": "gemini-2.5-flash",
            "name": "Gemini 2.5 Flash"
          }
        ]
      },
      "openrouter": {
        "baseUrl": "https://openrouter.ai/api/v1",
        "apiKey": "REDACTED",
        "models": [
          {
            "id": "stepfun/step-3.5-flash:free",
            "name": "Step 3.5 Flash (Free)"
          },
          {
            "id": "z-ai/glm-4.5-air:free",
            "name": "GLM 4.5 Air (Free)"
          },
          {
            "id": "qwen/qwen3-vl-235b-a22b-thinking",
            "name": "Qwen3 VL 235B Thinking (Free)"
          },
          {
            "id": "arcee-ai/trinity-large-preview:free",
            "name": "Trinity Large Preview (Free)"
          },
          {
            "id": "qwen/qwen3-4b:free",
            "name": "Qwen3 4B (Free)"
          },
          {
            "id": "deepseek/deepseek-v3.2",
            "name": "DeepSeek V3.2"
          },
          {
            "id": "x-ai/grok-4.1-fast",
            "name": "Grok 4.1 Fast"
          }
        ]
      },
      "minimax": {
        "baseUrl": "https://api.minimax.io/anthropic",
        "apiKey": "${MINIMAX_API_KEY}",
        "api": "anthropic-messages",
        "models": [
          {
            "id": "MiniMax-M2.7",
            "name": "MiniMax M2.5",
            "reasoning": true,
            "input": ["text"],
            "cost": {
              "input": 0.3,
              "output": 1.2,
              "cacheRead": 0.03,
              "cacheWrite": 0.12
            },
            "contextWindow": 200000,
            "maxTokens": 8192
          },
          {
            "id": "MiniMax-M2.7-highspeed",
            "name": "MiniMax M2.5 Highspeed",
            "reasoning": true,
            "input": ["text"],
            "cost": {
              "input": 0.3,
              "output": 1.2,
              "cacheRead": 0.03,
              "cacheWrite": 0.12
            },
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      },
      "anthropic": {
        "baseUrl": "https://api.anthropic.com",
        "apiKey": "",
        "auth": "oauth",
        "models": [
          {
            "id": "claude-opus-4-6",
            "name": "Claude Opus 4.6"
          },
          {
            "id": "claude-sonnet-4-6",
            "name": "Claude Sonnet 4.6"
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "thinkingDefault": "xhigh",
      "sandbox": {
        "mode": "off"
      },
      "bootstrapMaxChars": 50000,
      "bootstrapTotalMaxChars": 300000,
      "bootstrapPromptTruncationWarning": "once",
      "contextInjection": "continuation-skip",
      "model": {
        "primary": "openai-codex/gpt-5.4",
        "fallbacks": [
          "minimax/MiniMax-M2.7",
          "google/gemini-2.5-flash"
        ]
      },
      "workspace": "/home/openclaw/.openclaw-alfred/workspace",
      "memorySearch": {
        "enabled": true,
        "provider": "local",
        "experimental": {
          "sessionMemory": true
        },
        "sources": ["memory", "sessions"],
        "query": {
          "hybrid": {
            "enabled": true,
            "vectorWeight": 0.7,
            "textWeight": 0.3,
            "mmr": {
              "enabled": true,
              "lambda": 0.75
            },
            "temporalDecay": {
              "enabled": true,
              "halfLifeDays": 30
            }
          }
        }
      },
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "1h",
        "keepLastAssistants": 4
      },
      "compaction": {
        "mode": "default",
        "model": "minimax/MiniMax-M2.7",
        "notifyUser": false,
        "truncateAfterCompaction": true,
        "postIndexSync": "async",
        "reserveTokensFloor": 20000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 40000,
          "prompt": "Before compaction, save only durable coordination knowledge:\n- who is handling what\n- current status\n- blocked items\n- dependencies\n- routing notes that matter later\nDo not save implementation debris, repetitive summaries, or short-lived chatter.",
          "systemPrompt": "You are performing a pre-compaction memory flush.\nSave concise routing and coordination facts only."
        }
      },
      "heartbeat": {
        "isolatedSession": true
      },
      "imageGenerationModel": {
        "primary": "minimax/image-01"
      },
      "videoGenerationModel": {
        "primary": "minimax/MiniMax-Hailuo-2.3-Fast",
        "fallbacks": ["minimax/MiniMax-Hailuo-2.3"]
      },
      "musicGenerationModel": {
        "primary": "minimax/music-2.5+",
        "fallbacks": ["minimax/music-2.5", "minimax/music-2.0"]
      },
      "subagents": {
        "maxConcurrent": 3,
        "maxSpawnDepth": 2,
        "maxChildrenPerAgent": 2
      },
      "models": {
        "openrouter/stepfun/step-3.5-flash:free": {},
        "openrouter/z-ai/glm-4.5-air:free": {},
        "openrouter/qwen/qwen3-vl-235b-a22b-thinking": {},
        "openrouter/arcee-ai/trinity-large-preview:free": {},
        "openrouter/qwen/qwen3-4b:free": {},
        "google/gemini-2.5-flash": {},
        "openrouter/deepseek/deepseek-v3.2": {},
        "openrouter/x-ai/grok-4.1-fast": {},
        "ollama/qwen2.5-coder:7b": {},
        "minimax/MiniMax-M2": {},
        "openai-codex/gpt-5.4": {}
      }
    }
  },
  "tools": {
    "exec": {
      "security": "full"
    },
    "profile": "full",
    "alsoAllow": ["lobster"],
    "web": {
      "search": {}
    },
    "sessions": {
      "visibility": "agent"
    },
    "agentToAgent": {
      "enabled": true
    },
    "elevated": {
      "enabled": false
    },
    "loopDetection": {
      "enabled": true,
      "warningThreshold": 10,
      "criticalThreshold": 20,
      "globalCircuitBreakerThreshold": 30
    }
  },
  "session": {
    "agentToAgent": {
      "maxPingPongTurns": 5
    }
  },
  "messages": {
    "groupChat": {
      "mentionPatterns": ["\\b@?Alfred\\b"]
    }
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true,
    "ownerDisplay": "raw"
  },
  "cron": {
    "enabled": true
  },
  "discovery": {
    "mdns": {
      "mode": "off"
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": "REDACTED",
      "allowBots": true,
      "groupPolicy": "open",
      "historyLimit": 25,
      "textChunkLimit": 2000,
      "streaming": "partial",
      "contextVisibility": "all",
      "autoPresence": {
        "enabled": true,
        "healthyText": "Online",
        "degradedText": "Degraded",
        "exhaustedText": "Credits exhausted"
      },
      "agentComponents": {
        "enabled": true
      },
      "guilds": {
        "1475082873777426494": {
          "slug": "olaclaw-homelab",
          "channels": {
            "1475083038810443878": { "requireMention": true, "enabled": true },
            "1475082874234343621": { "requireMention": true, "enabled": true },
            "1475082964156157972": { "requireMention": true, "enabled": true },
            "1480482379838525500": { "requireMention": true, "enabled": true },
            "1480483591011045426": { "requireMention": false, "enabled": true },
            "1481316815408988355": { "requireMention": false, "enabled": true },
            "1475082997027049584": { "requireMention": true, "enabled": true }
          }
        }
      }
    }
  },
  "gateway": {
    "port": 18810,
    "mode": "local",
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "REDACTED"
    }
  },
  "skills": {
    "install": {
      "nodeManager": "npm"
    }
  },
  "plugins": {
    "allow": [
      "acpx", "discord", "browser", "minimax",
      "openai", "google", "openrouter", "ollama"
    ],
    "entries": {
      "discord": { "enabled": true },
      "lobster": { "enabled": true },
      "acpx": { "enabled": true },
      "browser": { "enabled": true },
      "minimax": { "enabled": true },
      "brave": {
        "config": {
          "webSearch": { "apiKey": "REDACTED" }
        },
        "enabled": true
      },
      "openai": { "enabled": true },
      "google": { "enabled": true },
      "openrouter": { "enabled": true },
      "ollama": { "enabled": true },
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": false,
            "frequency": "0 3 * * *",
            "timezone": "America/Chicago",
            "verboseLogging": true,
            "storage": {
              "mode": "both",
              "separateReports": true
            },
            "execution": {
              "defaults": {
                "speed": "balanced",
                "thinking": "medium",
                "budget": "medium",
                "model": "minimax/MiniMax-M2.7"
              }
            },
            "phases": {
              "light": {
                "enabled": true,
                "cron": "0 */6 * * *",
                "lookbackDays": 2,
                "limit": 100,
                "dedupeSimilarity": 0.9,
                "sources": ["daily", "sessions", "recall"]
              },
              "deep": {
                "enabled": true,
                "cron": "0 3 * * *",
                "limit": 10,
                "minScore": 0.8,
                "minRecallCount": 3,
                "minUniqueQueries": 3,
                "recencyHalfLifeDays": 14,
                "maxAgeDays": 30,
                "sources": ["daily", "memory", "sessions", "logs", "recall"],
                "recovery": {
                  "enabled": true,
                  "triggerBelowHealth": 0.35
                }
              },
              "rem": {
                "enabled": true,
                "cron": "0 5 * * 0",
                "lookbackDays": 7,
                "limit": 10,
                "minPatternStrength": 0.75,
                "sources": ["memory", "daily", "deep"]
              }
            }
          }
        }
      }
    }
  },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": [
            "OPERATIONS.md",
            "TEAM.md",
            "OWNER-OVERRIDE.md",
            "DISCORD-RULES.md",
            "PERSONALITYLAYERS.md"
          ]
        }
      }
    }
  },
  "memory": {
    "backend": "qmd",
    "citations": "auto",
    "qmd": {
      "command": "/home/openclaw/.bun/bin/qmd",
      "searchMode": "search",
      "includeDefaultMemory": true,
      "update": {
        "interval": "15m",
        "debounceMs": 30000
      },
      "limits": {
        "maxResults": 6,
        "timeoutMs": 5000
      }
    }
  },
  "talk": {
    "provider": "minimax",
    "providers": {
      "minimax": {
        "apiKey": "${MINIMAX_API_KEY}",
        "model": "speech-2.8-hd"
      }
    },
    "interruptOnSpeech": true,
    "silenceTimeoutMs": 1500
  }
}
```

---

## 3) Architect Dev Coder

### Intended use
Higher-level design, architecture, tradeoff analysis, multi-step technical planning, solution shaping, delegating limited specialist work while still remaining technical.

### Assigned agents
- **Haplo**
- **Vasu**
- **Samah**

### Tier-specific notes
- Haplo and Vasu get `logging.level: debug`; Samah gets `logging.level: info` (per v4 policy, carried forward)
- Haplo has local Ollama models (qwen3.5-9b-tools, qwen2.5-coder:32b, qwen2.5-coder:7b) and vLLM (Qwen3.5 9B on Zifnab)
- Haplo has `auth.profiles` for MiniMax, `session.dmScope: per-channel-peer`, and answeroverflow MCP server
- Haplo has `tools.sessions.visibility: tree` and `tools.elevated.enabled: true`
- Samah has a reduced model allowlist (MiniMax only in `agents.defaults.models`) and fewer plugins
- `thinkingDefault: xhigh` for Haplo, `xhigh` for Samah (both upgraded from v4's `adaptive`)
- `contextPruning.ttl: 2h` with `keepLastAssistants: 3` (Haplo/Samah)
- Memory dreaming enabled for Haplo, disabled for Samah
- `memorySearch.query.hybrid.vectorWeight: 0.6, textWeight: 0.4` (biased toward text vs orchestrator's vector bias)

### Full config (Haplo representative)

```json
{
  "meta": {
    "lastTouchedVersion": "2026.4.5",
    "lastTouchedAt": "2026-04-07T05:07:00.383Z"
  },
  "env": {
    "MINIMAX_API_KEY": "REDACTED",
    "GEMINI_API_KEY": "REDACTED"
  },
  "logging": {
    "level": "debug",
    "file": "/data/openclaw/logs/haplo.log"
  },
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/chromium-browser",
    "headless": true,
    "noSandbox": true,
    "defaultProfile": "openclaw"
  },
  "auth": {
    "profiles": {
      "minimax:default": {
        "provider": "minimax",
        "mode": "api_key"
      }
    }
  },
  "acp": {
    "enabled": true,
    "dispatch": {
      "enabled": false
    },
    "backend": "acpx",
    "allowedAgents": [
      "claude",
      "codex",
      "gemini",
      "opencode"
    ],
    "maxConcurrentSessions": 5
  },
  "models": {
    "mode": "merge",
    "providers": {
      "ollama": {
        "baseUrl": "http://localhost:11434",
        "apiKey": "REDACTED",
        "api": "ollama",
        "models": [
          {
            "id": "qwen3.5-9b-tools",
            "name": "Qwen3.5 9B Tools (Local)"
          },
          {
            "id": "qwen2.5-coder:32b-instruct-q4_K_M",
            "name": "qwen2.5-coder:32b-instruct-q4_K_M"
          },
          {
            "id": "qwen2.5-coder:7b",
            "name": "qwen2.5-coder:7b"
          }
        ]
      },
      "google": {
        "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
        "models": [
          {
            "id": "gemini-2.5-flash",
            "name": "Gemini 2.5 Flash"
          }
        ]
      },
      "openrouter": {
        "baseUrl": "https://openrouter.ai/api/v1",
        "apiKey": "REDACTED",
        "models": [
          {
            "id": "stepfun/step-3.5-flash:free",
            "name": "Step 3.5 Flash (Free)"
          },
          {
            "id": "z-ai/glm-4.5-air:free",
            "name": "GLM 4.5 Air (Free)"
          },
          {
            "id": "qwen/qwen3-vl-235b-a22b-thinking",
            "name": "Qwen3 VL 235B Thinking (Free)"
          },
          {
            "id": "arcee-ai/trinity-large-preview:free",
            "name": "Trinity Large Preview (Free)"
          },
          {
            "id": "qwen/qwen3-4b:free",
            "name": "Qwen3 4B (Free)"
          },
          {
            "id": "deepseek/deepseek-v3.2",
            "name": "DeepSeek V3.2"
          },
          {
            "id": "x-ai/grok-4.1-fast",
            "name": "Grok 4.1 Fast"
          }
        ]
      },
      "minimax": {
        "baseUrl": "https://api.minimax.io/anthropic",
        "apiKey": "${MINIMAX_API_KEY}",
        "api": "anthropic-messages",
        "authHeader": true,
        "models": [
          {
            "id": "MiniMax-M2.7",
            "name": "MiniMax M2.5",
            "reasoning": true,
            "input": ["text"],
            "cost": {
              "input": 0.3,
              "output": 1.2,
              "cacheRead": 0.03,
              "cacheWrite": 0.12
            },
            "contextWindow": 200000,
            "maxTokens": 8192
          },
          {
            "id": "MiniMax-M2.7-highspeed",
            "name": "MiniMax M2.5 Highspeed",
            "reasoning": true,
            "input": ["text"],
            "cost": {
              "input": 0.3,
              "output": 1.2,
              "cacheRead": 0.03,
              "cacheWrite": 0.12
            },
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      },
      "vllm": {
        "baseUrl": "http://100.103.189.117:8000/v1",
        "apiKey": "REDACTED",
        "models": [
          {
            "id": "qwen3.5-9b",
            "name": "Qwen3.5 9B (Zifnab)",
            "reasoning": true,
            "input": ["text"],
            "cost": { "input": 0, "output": 0 },
            "contextWindow": 32768,
            "maxTokens": 8192
          }
        ]
      },
      "anthropic": {
        "baseUrl": "https://api.anthropic.com",
        "apiKey": "",
        "auth": "oauth",
        "models": [
          {
            "id": "claude-opus-4-6",
            "name": "Claude Opus 4.6"
          },
          {
            "id": "claude-sonnet-4-6",
            "name": "Claude Sonnet 4.6"
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "thinkingDefault": "xhigh",
      "sandbox": {
        "mode": "off"
      },
      "bootstrapMaxChars": 50000,
      "bootstrapTotalMaxChars": 300000,
      "bootstrapPromptTruncationWarning": "once",
      "contextInjection": "continuation-skip",
      "model": {
        "primary": "openai-codex/gpt-5.4",
        "fallbacks": [
          "minimax/MiniMax-M2.7",
          "google/gemini-2.5-flash"
        ]
      },
      "workspace": "/home/openclaw/.openclaw-haplo/workspace",
      "memorySearch": {
        "enabled": true,
        "provider": "local",
        "experimental": {
          "sessionMemory": true
        },
        "sources": ["memory", "sessions"],
        "query": {
          "hybrid": {
            "enabled": true,
            "vectorWeight": 0.6,
            "textWeight": 0.4,
            "mmr": {
              "enabled": true,
              "lambda": 0.75
            },
            "temporalDecay": {
              "enabled": true,
              "halfLifeDays": 30
            }
          }
        }
      },
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "2h",
        "keepLastAssistants": 3
      },
      "compaction": {
        "mode": "default",
        "model": "minimax/MiniMax-M2.7",
        "notifyUser": false,
        "truncateAfterCompaction": true,
        "postIndexSync": "async",
        "reserveTokensFloor": 20000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 40000,
          "prompt": "Before compaction, save only durable architecture knowledge:\n- system decisions\n- technical tradeoffs\n- rejected options and why\n- interfaces and integration assumptions\n- cross-project constraints\nDo not save repetitive discussion, raw transcript debris, or transient implementation chatter.",
          "systemPrompt": "You are performing a pre-compaction memory flush.\nSave concise architectural knowledge and durable design context only."
        }
      },
      "heartbeat": {
        "isolatedSession": true
      },
      "imageGenerationModel": {
        "primary": "minimax/image-01"
      },
      "videoGenerationModel": {
        "primary": "minimax/MiniMax-Hailuo-2.3-Fast",
        "fallbacks": ["minimax/MiniMax-Hailuo-2.3"]
      },
      "musicGenerationModel": {
        "primary": "minimax/music-2.5+",
        "fallbacks": ["minimax/music-2.5", "minimax/music-2.0"]
      },
      "subagents": {
        "maxConcurrent": 5,
        "maxSpawnDepth": 2,
        "maxChildrenPerAgent": 3
      },
      "models": {
        "openrouter/stepfun/step-3.5-flash:free": {},
        "openrouter/z-ai/glm-4.5-air:free": {},
        "openrouter/qwen/qwen3-vl-235b-a22b-thinking": {},
        "openrouter/arcee-ai/trinity-large-preview:free": {},
        "openrouter/qwen/qwen3-4b:free": {},
        "google/gemini-2.5-flash": {},
        "openrouter/deepseek/deepseek-v3.2": {},
        "openrouter/x-ai/grok-4.1-fast": {},
        "ollama/qwen2.5-coder:7b": {},
        "minimax/MiniMax-M2": {},
        "minimax/MiniMax-M2.7": { "alias": "Minimax" },
        "openai-codex/gpt-5.4": {}
      }
    }
  },
  "tools": {
    "exec": {
      "security": "full"
    },
    "profile": "full",
    "alsoAllow": ["lobster"],
    "web": {
      "search": {}
    },
    "sessions": {
      "visibility": "tree"
    },
    "agentToAgent": {
      "enabled": true
    },
    "elevated": {
      "enabled": true
    },
    "loopDetection": {
      "enabled": true,
      "warningThreshold": 10,
      "criticalThreshold": 20,
      "globalCircuitBreakerThreshold": 30
    }
  },
  "session": {
    "dmScope": "per-channel-peer",
    "agentToAgent": {
      "maxPingPongTurns": 5
    }
  },
  "messages": {
    "groupChat": {
      "mentionPatterns": ["\\b@?Haplo\\b"]
    }
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true,
    "ownerDisplay": "raw"
  },
  "cron": {
    "enabled": false
  },
  "discovery": {
    "mdns": {
      "mode": "off"
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": "REDACTED",
      "allowBots": true,
      "groupPolicy": "open",
      "historyLimit": 25,
      "textChunkLimit": 2000,
      "streaming": "partial",
      "contextVisibility": "all",
      "autoPresence": {
        "enabled": true,
        "healthyText": "Online",
        "degradedText": "Degraded",
        "exhaustedText": "Credits exhausted"
      },
      "agentComponents": {
        "enabled": true
      },
      "retry": {
        "attempts": 1,
        "minDelayMs": 1000,
        "maxDelayMs": 60000
      },
      "guilds": {
        "1475082873777426494": {
          "slug": "olaclaw-homelab",
          "channels": {
            "1475083038810443878": { "requireMention": false, "enabled": true },
            "1475082874234343621": { "requireMention": true, "enabled": true },
            "1480482379838525500": { "requireMention": true, "enabled": true },
            "1480483591011045426": { "requireMention": true, "enabled": true },
            "1480483545431412877": { "requireMention": true, "enabled": true }
          }
        }
      },
      "threadBindings": {
        "spawnAcpSessions": true
      }
    }
  },
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "REDACTED"
    },
    "mode": "local"
  },
  "memory": {
    "backend": "qmd",
    "citations": "auto",
    "qmd": {
      "command": "/home/openclaw/.bun/bin/qmd",
      "searchMode": "search",
      "includeDefaultMemory": true,
      "update": {
        "interval": "10m",
        "debounceMs": 30000
      },
      "limits": {
        "maxResults": 6,
        "timeoutMs": 5000
      }
    }
  },
  "skills": {
    "install": {
      "nodeManager": "npm"
    }
  },
  "plugins": {
    "allow": [
      "acpx", "discord", "browser", "minimax",
      "openai", "google", "openrouter", "ollama"
    ],
    "entries": {
      "discord": { "enabled": true },
      "lobster": { "enabled": true },
      "acpx": { "enabled": true },
      "browser": { "enabled": true },
      "minimax": { "enabled": true },
      "brave": {
        "config": {
          "webSearch": { "apiKey": "REDACTED" }
        },
        "enabled": true
      },
      "openai": { "enabled": true },
      "google": { "enabled": true },
      "openrouter": { "enabled": true },
      "ollama": { "enabled": true },
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true,
            "frequency": "0 3 * * *",
            "timezone": "America/Chicago",
            "verboseLogging": true,
            "storage": {
              "mode": "both",
              "separateReports": true
            },
            "execution": {
              "defaults": {
                "speed": "balanced",
                "thinking": "medium",
                "budget": "medium",
                "model": "minimax/MiniMax-M2.7"
              }
            },
            "phases": {
              "light": {
                "enabled": true,
                "cron": "0 */6 * * *",
                "lookbackDays": 2,
                "limit": 100,
                "dedupeSimilarity": 0.9,
                "sources": ["daily", "sessions", "recall"]
              },
              "deep": {
                "enabled": true,
                "cron": "0 3 * * *",
                "limit": 10,
                "minScore": 0.8,
                "minRecallCount": 3,
                "minUniqueQueries": 3,
                "recencyHalfLifeDays": 14,
                "maxAgeDays": 30,
                "sources": ["daily", "memory", "sessions", "logs", "recall"],
                "recovery": {
                  "enabled": true,
                  "triggerBelowHealth": 0.35
                }
              },
              "rem": {
                "enabled": true,
                "cron": "0 5 * * 0",
                "lookbackDays": 7,
                "limit": 10,
                "minPatternStrength": 0.75,
                "sources": ["memory", "daily", "deep"]
              }
            }
          }
        }
      }
    }
  },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": [
            "OPERATIONS.md",
            "TEAM.md",
            "OWNER-OVERRIDE.md",
            "DISCORD-RULES.md",
            "PERSONALITYLAYERS.md"
          ]
        }
      }
    }
  },
  "mcp": {
    "servers": {
      "answeroverflow": {
        "url": "https://www.answeroverflow.com/mcp"
      }
    }
  },
  "talk": {
    "provider": "minimax",
    "providers": {
      "minimax": {
        "apiKey": "${MINIMAX_API_KEY}",
        "model": "speech-2.8-hd"
      }
    },
    "interruptOnSpeech": true,
    "silenceTimeoutMs": 1500
  }
}
```

---

## 4) Senior Dev Coder

### Intended use
Implementation, debugging, patching, code-level problem solving, file editing, practical development work.

### Assigned agents
- **Marit**
- **Paithan**
- **Limbeck**
- **Balthazar**
- **Drugar**
- **Devon**

### Tier-specific notes
- `logging.level: debug` for Marit, Limbeck, Drugar; `logging.level: info` for Paithan, Balthazar, Devon
- `thinkingDefault: high` (different from Architect's `xhigh`)
- Primary model: `minimax/MiniMax-M2.7` with Gemini 2.5 Flash fallback (not GPT-5.4 like Architect)
- Reduced OpenRouter model chain (only step-3.5-flash and qwen3-4b free)
- No vLLM provider
- `memorySearch.experimental.sessionMemory: false` (no session memory)
- `memorySearch.sources: ["memory"]` only (no sessions)
- `contextPruning.ttl: 1h`, `keepLastAssistants: 3`
- Memory dreaming disabled by default
- Marit has answeroverflow MCP server
- `tools.sessions.visibility: tree`, `tools.elevated.enabled: true`
- `acp.maxConcurrentSessions: 4`

### Full config (Marit representative)

```json
{
  "meta": {
    "lastTouchedVersion": "2026.4.5",
    "lastTouchedAt": "2026-04-07T05:31:51.808Z"
  },
  "env": {
    "MINIMAX_API_KEY": "REDACTED",
    "GEMINI_API_KEY": "REDACTED"
  },
  "logging": {
    "level": "debug",
    "file": "/data/openclaw/logs/marit.log"
  },
  "models": {
    "mode": "merge",
    "providers": {
      "minimax": {
        "baseUrl": "https://api.minimax.io/anthropic",
        "apiKey": "${MINIMAX_API_KEY}",
        "api": "anthropic-messages",
        "authHeader": true,
        "models": [
          {
            "id": "MiniMax-M2.7",
            "name": "MiniMax M2.5",
            "reasoning": true,
            "input": ["text"],
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      },
      "google": {
        "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
        "models": [
          {
            "id": "gemini-2.5-flash",
            "name": "Gemini 2.5 Flash"
          }
        ]
      },
      "openrouter": {
        "baseUrl": "https://openrouter.ai/api/v1",
        "apiKey": "REDACTED",
        "models": [
          {
            "id": "stepfun/step-3.5-flash:free",
            "name": "stepfun/step-3.5-flash:free"
          },
          {
            "id": "qwen/qwen3-4b:free",
            "name": "qwen/qwen3-4b:free"
          }
        ]
      },
      "anthropic": {
        "baseUrl": "https://api.anthropic.com",
        "apiKey": "",
        "auth": "oauth",
        "models": [
          {
            "id": "claude-opus-4-6",
            "name": "Claude Opus 4.6"
          },
          {
            "id": "claude-sonnet-4-6",
            "name": "Claude Sonnet 4.6"
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "thinkingDefault": "high",
      "sandbox": {
        "mode": "off"
      },
      "bootstrapMaxChars": 50000,
      "bootstrapTotalMaxChars": 300000,
      "bootstrapPromptTruncationWarning": "once",
      "contextInjection": "continuation-skip",
      "model": {
        "primary": "minimax/MiniMax-M2.7",
        "fallbacks": [
          "google/gemini-2.5-flash"
        ]
      },
      "workspace": "/home/openclaw/.openclaw-marit/workspace",
      "memorySearch": {
        "enabled": true,
        "provider": "local",
        "experimental": {
          "sessionMemory": false
        },
        "sources": ["memory"],
        "query": {
          "hybrid": {
            "enabled": true,
            "vectorWeight": 0.6,
            "textWeight": 0.4,
            "mmr": {
              "enabled": true,
              "lambda": 0.75
            },
            "temporalDecay": {
              "enabled": true,
              "halfLifeDays": 30
            }
          }
        }
      },
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "1h",
        "keepLastAssistants": 3
      },
      "compaction": {
        "mode": "default",
        "model": "minimax/MiniMax-M2.7",
        "notifyUser": false,
        "truncateAfterCompaction": true,
        "postIndexSync": "async",
        "reserveTokensFloor": 20000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 40000,
          "prompt": "Before compaction, save only durable implementation knowledge:\n- architecture decisions\n- file locations\n- APIs used\n- unresolved bugs\n- active constraints\nDo not save transient chatter, raw logs, or duplicate summaries.",
          "systemPrompt": "You are performing a pre-compaction memory flush.\nWrite concise, structured, non-duplicative durable notes only."
        }
      },
      "heartbeat": {
        "isolatedSession": true
      },
      "imageGenerationModel": {
        "primary": "minimax/image-01"
      },
      "videoGenerationModel": {
        "primary": "minimax/MiniMax-Hailuo-2.3-Fast",
        "fallbacks": ["minimax/MiniMax-Hailuo-2.3"]
      },
      "musicGenerationModel": {
        "primary": "minimax/music-2.5+",
        "fallbacks": ["minimax/music-2.5", "minimax/music-2.0"]
      },
      "subagents": {
        "maxConcurrent": 4,
        "maxSpawnDepth": 2,
        "maxChildrenPerAgent": 3
      },
      "models": {
        "openai-codex/gpt-5.4": {},
        "openai-codex/gpt-5.3-codex-spark": {},
        "minimax/MiniMax-M2.7": {}
      }
    }
  },
  "tools": {
    "exec": {
      "security": "full"
    },
    "profile": "full",
    "alsoAllow": ["lobster"],
    "web": {
      "search": {}
    },
    "sessions": {
      "visibility": "tree"
    },
    "agentToAgent": {
      "enabled": true
    },
    "elevated": {
      "enabled": true
    },
    "loopDetection": {
      "enabled": true,
      "warningThreshold": 10,
      "criticalThreshold": 20,
      "globalCircuitBreakerThreshold": 30
    }
  },
  "session": {
    "agentToAgent": {
      "maxPingPongTurns": 5
    }
  },
  "messages": {
    "groupChat": {}
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true,
    "ownerDisplay": "raw"
  },
  "discovery": {
    "mdns": {
      "mode": "off"
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": "REDACTED",
      "allowBots": true,
      "groupPolicy": "open",
      "historyLimit": 25,
      "textChunkLimit": 2000,
      "streaming": "partial",
      "contextVisibility": "all",
      "autoPresence": {
        "enabled": true,
        "healthyText": "Online",
        "degradedText": "Degraded",
        "exhaustedText": "Credits exhausted"
      },
      "agentComponents": {
        "enabled": true
      },
      "retry": {
        "attempts": 1,
        "minDelayMs": 1000,
        "maxDelayMs": 60000
      },
      "guilds": {
        "1475082873777426494": {
          "slug": "olaclaw-homelab",
          "channels": {
            "1475083038810443878": { "requireMention": true, "enabled": true },
            "1475082874234343621": { "requireMention": true, "enabled": true },
            "1480482379838525500": { "requireMention": false, "enabled": true },
            "1480483545431412877": { "requireMention": true, "enabled": true }
          }
        }
      },
      "threadBindings": {
        "spawnAcpSessions": true
      }
    }
  },
  "gateway": {
    "port": 18811,
    "mode": "local",
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "REDACTED"
    }
  },
  "plugins": {
    "allow": [
      "acpx", "discord", "browser", "minimax", "google", "openai"
    ],
    "entries": {
      "discord": { "enabled": true },
      "lobster": { "enabled": true },
      "acpx": { "enabled": true },
      "browser": { "enabled": true },
      "minimax": { "enabled": true },
      "brave": {
        "config": {
          "webSearch": { "apiKey": "REDACTED" }
        },
        "enabled": true
      },
      "google": { "enabled": true },
      "openai": { "enabled": true },
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": false,
            "frequency": "0 3 * * *",
            "timezone": "America/Chicago",
            "verboseLogging": true,
            "storage": { "mode": "both", "separateReports": true },
            "execution": {
              "defaults": {
                "speed": "balanced",
                "thinking": "medium",
                "budget": "medium",
                "model": "minimax/MiniMax-M2.7"
              }
            },
            "phases": {
              "light": {
                "enabled": true,
                "cron": "0 */6 * * *",
                "lookbackDays": 2,
                "limit": 100,
                "dedupeSimilarity": 0.9,
                "sources": ["daily", "sessions", "recall"]
              },
              "deep": {
                "enabled": true,
                "cron": "0 3 * * *",
                "limit": 10,
                "minScore": 0.8,
                "minRecallCount": 3,
                "minUniqueQueries": 3,
                "recencyHalfLifeDays": 14,
                "maxAgeDays": 30,
                "sources": ["daily", "memory", "sessions", "logs", "recall"],
                "recovery": { "enabled": true, "triggerBelowHealth": 0.35 }
              },
              "rem": {
                "enabled": true,
                "cron": "0 5 * * 0",
                "lookbackDays": 7,
                "limit": 10,
                "minPatternStrength": 0.75,
                "sources": ["memory", "daily", "deep"]
              }
            }
          }
        }
      }
    }
  },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": [
            "OPERATIONS.md",
            "TEAM.md",
            "OWNER-OVERRIDE.md",
            "DISCORD-RULES.md",
            "PERSONALITYLAYERS.md"
          ]
        }
      }
    }
  },
  "memory": {
    "backend": "qmd",
    "citations": "auto",
    "qmd": {
      "command": "/home/openclaw/.bun/bin/qmd",
      "searchMode": "search",
      "includeDefaultMemory": true,
      "update": {
        "interval": "10m",
        "debounceMs": 30000
      },
      "limits": {
        "maxResults": 5,
        "timeoutMs": 5000
      }
    }
  },
  "acp": {
    "enabled": true,
    "dispatch": {
      "enabled": false
    },
    "backend": "acpx",
    "allowedAgents": [
      "claude",
      "codex",
      "gemini",
      "opencode"
    ],
    "maxConcurrentSessions": 4
  },
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/chromium-browser",
    "headless": true,
    "noSandbox": true,
    "defaultProfile": "openclaw"
  },
  "cron": {
    "enabled": false
  },
  "skills": {
    "install": {
      "nodeManager": "npm"
    }
  },
  "mcp": {
    "servers": {
      "answeroverflow": {
        "url": "https://www.answeroverflow.com/mcp"
      }
    }
  },
  "talk": {
    "provider": "minimax",
    "providers": {
      "minimax": {
        "apiKey": "${MINIMAX_API_KEY}",
        "model": "speech-2.8-hd"
      }
    },
    "interruptOnSpeech": true,
    "silenceTimeoutMs": 1500
  }
}
```

---

## 5) Standard Work Agent

### Intended use
Routine work, planning, documentation, general problem solving, light research, ad hoc support, normal daily work that does not require deep long-term relationship memory.

### Assigned agents
- **Ciang**
- **Trian**
- **Ramu**

### Tier-specific notes
- All three agents get `logging.level: info`
- `thinkingDefault: high` (upgraded from v4's `adaptive`)
- `memorySearch.experimental.sessionMemory: false` (no session memory)
- `memorySearch.sources: ["memory"]` only
- `memorySearch.query.hybrid.vectorWeight: 0.55, textWeight: 0.45` (most text-biased of all tiers)
- `contextPruning.ttl: 2h`, `keepLastAssistants: 2` (lowest assistant retention)
- `subagents.maxConcurrent: 3, maxSpawnDepth: 1, maxChildrenPerAgent: 2` (limited subagents)
- Memory dreaming disabled
- `tools.sessions.visibility: self`
- `tools.elevated.enabled: false`
- `discord.streaming: partial` (upgraded from v4's `off`)
- Full OpenRouter model chain present

### Full config (Trian representative)

```json
{
  "meta": {
    "lastTouchedVersion": "2026.4.5",
    "lastTouchedAt": "2026-04-07T05:30:05.061Z"
  },
  "env": {
    "MINIMAX_API_KEY": "REDACTED",
    "GEMINI_API_KEY": "REDACTED"
  },
  "logging": {
    "level": "info",
    "file": "/data/openclaw/logs/trian.log"
  },
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/chromium-browser",
    "headless": true,
    "noSandbox": true,
    "defaultProfile": "openclaw"
  },
  "acp": {
    "enabled": true,
    "dispatch": {
      "enabled": false
    },
    "backend": "acpx",
    "allowedAgents": [
      "claude",
      "codex",
      "gemini"
    ],
    "maxConcurrentSessions": 3
  },
  "models": {
    "mode": "merge",
    "providers": {
      "ollama": {
        "baseUrl": "http://localhost:11434",
        "apiKey": "REDACTED",
        "api": "ollama",
        "models": [
          {
            "id": "qwen2.5-coder:32b-instruct-q4_K_M",
            "name": "qwen2.5-coder:32b-instruct-q4_K_M"
          },
          {
            "id": "qwen2.5-coder:7b",
            "name": "qwen2.5-coder:7b"
          }
        ]
      },
      "google": {
        "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
        "apiKey": "REDACTED",
        "models": [
          {
            "id": "gemini-2.5-flash",
            "name": "Gemini 2.5 Flash"
          }
        ]
      },
      "openrouter": {
        "baseUrl": "https://openrouter.ai/api/v1",
        "apiKey": "REDACTED",
        "models": [
          { "id": "stepfun/step-3.5-flash:free", "name": "Step 3.5 Flash (Free)" },
          { "id": "z-ai/glm-4.5-air:free", "name": "GLM 4.5 Air (Free)" },
          { "id": "qwen/qwen3-vl-235b-a22b-thinking", "name": "Qwen3 VL 235B Thinking (Free)" },
          { "id": "arcee-ai/trinity-large-preview:free", "name": "Trinity Large Preview (Free)" },
          { "id": "qwen/qwen3-4b:free", "name": "Qwen3 4B (Free)" },
          { "id": "deepseek/deepseek-v3.2", "name": "DeepSeek V3.2" },
          { "id": "x-ai/grok-4.1-fast", "name": "Grok 4.1 Fast" }
        ]
      },
      "minimax": {
        "baseUrl": "https://api.minimax.io/anthropic",
        "apiKey": "${MINIMAX_API_KEY}",
        "api": "anthropic-messages",
        "models": [
          {
            "id": "MiniMax-M2.7",
            "name": "MiniMax M2.5",
            "reasoning": true,
            "input": ["text"],
            "cost": { "input": 0.3, "output": 1.2, "cacheRead": 0.03, "cacheWrite": 0.12 },
            "contextWindow": 200000,
            "maxTokens": 8192
          },
          {
            "id": "MiniMax-M2.7-highspeed",
            "name": "MiniMax M2.5 Highspeed",
            "reasoning": true,
            "input": ["text"],
            "cost": { "input": 0.3, "output": 1.2, "cacheRead": 0.03, "cacheWrite": 0.12 },
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      },
      "anthropic": {
        "baseUrl": "https://api.anthropic.com",
        "apiKey": "",
        "auth": "oauth",
        "models": [
          { "id": "claude-opus-4-6", "name": "Claude Opus 4.6" },
          { "id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6" }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "thinkingDefault": "high",
      "sandbox": {
        "mode": "off"
      },
      "bootstrapMaxChars": 50000,
      "bootstrapTotalMaxChars": 300000,
      "bootstrapPromptTruncationWarning": "once",
      "contextInjection": "continuation-skip",
      "model": {
        "primary": "openai-codex/gpt-5.4",
        "fallbacks": [
          "minimax/MiniMax-M2.7",
          "google/gemini-2.5-flash"
        ]
      },
      "workspace": "/home/openclaw/.openclaw-trian/workspace",
      "memorySearch": {
        "enabled": true,
        "provider": "local",
        "experimental": {
          "sessionMemory": false
        },
        "sources": ["memory"],
        "query": {
          "hybrid": {
            "enabled": true,
            "vectorWeight": 0.55,
            "textWeight": 0.45,
            "mmr": {
              "enabled": true,
              "lambda": 0.75
            },
            "temporalDecay": {
              "enabled": true,
              "halfLifeDays": 30
            }
          }
        }
      },
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "2h",
        "keepLastAssistants": 2
      },
      "compaction": {
        "mode": "default",
        "model": "minimax/MiniMax-M2.7",
        "notifyUser": false,
        "truncateAfterCompaction": true,
        "postIndexSync": "async",
        "reserveTokensFloor": 20000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 40000,
          "prompt": "Before compaction, save only durable work context:\n- project facts\n- decisions made\n- active deliverables\n- stable preferences\n- open follow-ups\nDo not save casual chat, duplicate summaries, or temporary reasoning.",
          "systemPrompt": "You are performing a pre-compaction memory flush.\nSave concise, useful, durable facts only."
        }
      },
      "heartbeat": {
        "isolatedSession": true
      },
      "imageGenerationModel": {
        "primary": "minimax/image-01"
      },
      "videoGenerationModel": {
        "primary": "minimax/MiniMax-Hailuo-2.3-Fast",
        "fallbacks": ["minimax/MiniMax-Hailuo-2.3"]
      },
      "musicGenerationModel": {
        "primary": "minimax/music-2.5+",
        "fallbacks": ["minimax/music-2.5", "minimax/music-2.0"]
      },
      "subagents": {
        "maxConcurrent": 3,
        "maxSpawnDepth": 1,
        "maxChildrenPerAgent": 2
      },
      "models": {
        "openrouter/stepfun/step-3.5-flash:free": {},
        "openrouter/z-ai/glm-4.5-air:free": {},
        "openrouter/qwen/qwen3-vl-235b-a22b-thinking": {},
        "openrouter/arcee-ai/trinity-large-preview:free": {},
        "openrouter/qwen/qwen3-4b:free": {},
        "google/gemini-2.5-flash": {},
        "openrouter/deepseek/deepseek-v3.2": {},
        "openrouter/x-ai/grok-4.1-fast": {},
        "ollama/qwen2.5-coder:7b": {},
        "minimax/MiniMax-M2": {},
        "openai-codex/gpt-5.4": {}
      }
    }
  },
  "tools": {
    "exec": {
      "security": "full"
    },
    "profile": "full",
    "alsoAllow": ["lobster"],
    "web": {
      "search": {}
    },
    "sessions": {
      "visibility": "self"
    },
    "agentToAgent": {
      "enabled": true
    },
    "elevated": {
      "enabled": false
    },
    "loopDetection": {
      "enabled": true,
      "warningThreshold": 10,
      "criticalThreshold": 20,
      "globalCircuitBreakerThreshold": 30
    }
  },
  "session": {
    "agentToAgent": {
      "maxPingPongTurns": 5
    }
  },
  "messages": {
    "groupChat": {
      "mentionPatterns": ["\\b@?Trian\\b"]
    }
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true,
    "ownerDisplay": "raw"
  },
  "cron": {
    "enabled": false
  },
  "discovery": {
    "mdns": {
      "mode": "off"
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": "REDACTED",
      "groupPolicy": "open",
      "historyLimit": 25,
      "streaming": "partial",
      "textChunkLimit": 2000,
      "contextVisibility": "all",
      "autoPresence": {
        "enabled": true,
        "healthyText": "Online",
        "degradedText": "Degraded",
        "exhaustedText": "Credits exhausted"
      },
      "agentComponents": {
        "enabled": true
      },
      "retry": {
        "attempts": 2,
        "minDelayMs": 1000,
        "maxDelayMs": 60000
      },
      "guilds": {
        "1475082873777426494": {
          "slug": "olaclaw-homelab",
          "channels": {
            "1475082874234343621": { "requireMention": true, "enabled": true },
            "1480483545431412877": { "requireMention": true, "enabled": true }
          }
        }
      },
      "threadBindings": {
        "spawnAcpSessions": true
      }
    }
  },
  "gateway": {
    "port": 18853,
    "mode": "local",
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "REDACTED"
    }
  },
  "skills": {
    "install": {
      "nodeManager": "npm"
    }
  },
  "plugins": {
    "allow": [
      "acpx", "discord", "browser", "minimax",
      "openai", "google", "openrouter", "ollama"
    ],
    "entries": {
      "discord": { "enabled": true },
      "lobster": { "enabled": true },
      "acpx": { "enabled": true },
      "browser": { "enabled": true },
      "minimax": { "enabled": true },
      "brave": {
        "config": {
          "webSearch": { "apiKey": "REDACTED" }
        },
        "enabled": true
      },
      "openai": { "enabled": true },
      "google": { "enabled": true },
      "openrouter": { "enabled": true },
      "ollama": { "enabled": true },
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": false,
            "frequency": "0 3 * * *",
            "timezone": "America/Chicago",
            "verboseLogging": true,
            "storage": { "mode": "both", "separateReports": true },
            "execution": {
              "defaults": {
                "speed": "balanced",
                "thinking": "medium",
                "budget": "medium",
                "model": "minimax/MiniMax-M2.7"
              }
            },
            "phases": {
              "light": {
                "enabled": true,
                "cron": "0 */6 * * *",
                "lookbackDays": 2,
                "limit": 100,
                "dedupeSimilarity": 0.9,
                "sources": ["daily", "sessions", "recall"]
              },
              "deep": {
                "enabled": true,
                "cron": "0 3 * * *",
                "limit": 10,
                "minScore": 0.8,
                "minRecallCount": 3,
                "minUniqueQueries": 3,
                "recencyHalfLifeDays": 14,
                "maxAgeDays": 30,
                "sources": ["daily", "memory", "sessions", "logs", "recall"],
                "recovery": { "enabled": true, "triggerBelowHealth": 0.35 }
              },
              "rem": {
                "enabled": true,
                "cron": "0 5 * * 0",
                "lookbackDays": 7,
                "limit": 10,
                "minPatternStrength": 0.75,
                "sources": ["memory", "daily", "deep"]
              }
            }
          }
        }
      }
    }
  },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": [
            "OPERATIONS.md",
            "TEAM.md",
            "OWNER-OVERRIDE.md",
            "DISCORD-RULES.md",
            "PERSONALITYLAYERS.md"
          ]
        }
      }
    }
  },
  "memory": {
    "backend": "qmd",
    "citations": "auto",
    "qmd": {
      "command": "/home/openclaw/.bun/bin/qmd",
      "searchMode": "search",
      "includeDefaultMemory": true,
      "update": {
        "interval": "10m",
        "debounceMs": 30000
      },
      "limits": {
        "maxResults": 4,
        "timeoutMs": 4000
      }
    }
  },
  "talk": {
    "provider": "minimax",
    "providers": {
      "minimax": {
        "apiKey": "${MINIMAX_API_KEY}",
        "model": "speech-2.8-hd"
      }
    },
    "interruptOnSpeech": true,
    "silenceTimeoutMs": 1500
  }
}
```

---

## 6) Standard Companion Agent

### Intended use
Long-running recurring work, continuity across many sessions, remembering preferences, decisions, and prior discussions, relationship-style support, daily partner behavior.

### Assigned agents
- **Iridal**
- **Edmund**
- **Rega**

### Tier-specific notes
- The Standard Companion template was NOT among the 7 instantiated v5 JSON files (Samah's config was used for the Architect Companion slot instead). The companion profile is represented by the Samah template (`v5-standard-companion.json`) which uses architect-level settings with session memory enabled.
- `thinkingDefault: xhigh`
- `memorySearch.experimental.sessionMemory: true` (key differentiator from Standard Work)
- `memorySearch.sources: ["memory", "sessions"]`
- Primary model: `minimax/MiniMax-M2.7` with Gemini 2.5 Flash fallback
- `contextPruning.ttl: 2h`, `keepLastAssistants: 3`
- `subagents.maxConcurrent: 5, maxSpawnDepth: 2, maxChildrenPerAgent: 3` (generous for long sessions)
- `tools.sessions.visibility: tree`, `tools.elevated.enabled: true`
- `acp.maxConcurrentSessions: 5`
- Memory dreaming disabled
- Has answeroverflow MCP server
- Reduced model allowlist: only `minimax/MiniMax-M2.7` in `agents.defaults.models`

### Full config (Samah representative)

```json
{
  "meta": {
    "lastTouchedVersion": "2026.4.5",
    "lastTouchedAt": "2026-04-07T05:33:42.386Z"
  },
  "env": {
    "MINIMAX_API_KEY": "REDACTED"
  },
  "logging": {
    "level": "info",
    "file": "/data/openclaw/logs/samah.log"
  },
  "models": {
    "mode": "merge",
    "providers": {
      "minimax": {
        "baseUrl": "https://api.minimax.io/anthropic",
        "apiKey": "${MINIMAX_API_KEY}",
        "api": "anthropic-messages",
        "models": [
          {
            "id": "MiniMax-M2.7",
            "name": "MiniMax M2.5",
            "reasoning": true,
            "input": ["text"],
            "cost": { "input": 0.3, "output": 1.2, "cacheRead": 0.03, "cacheWrite": 0.12 },
            "contextWindow": 200000,
            "maxTokens": 8192
          },
          {
            "id": "MiniMax-M2.7-highspeed",
            "name": "MiniMax M2.5 Highspeed",
            "reasoning": true,
            "input": ["text"],
            "cost": { "input": 0.3, "output": 1.2, "cacheRead": 0.03, "cacheWrite": 0.12 },
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      },
      "google": {
        "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
        "apiKey": "REDACTED",
        "models": [
          { "id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash" }
        ]
      },
      "openrouter": {
        "baseUrl": "https://openrouter.ai/api/v1",
        "apiKey": "REDACTED",
        "models": [
          { "id": "stepfun/step-3.5-flash:free", "name": "Step 3.5 Flash (Free)" },
          { "id": "z-ai/glm-4.5-air:free", "name": "GLM 4.5 Air (Free)" },
          { "id": "qwen/qwen3-vl-235b-a22b-thinking", "name": "Qwen3 VL 235B Thinking (Free)" },
          { "id": "arcee-ai/trinity-large-preview:free", "name": "Trinity Large Preview (Free)" },
          { "id": "qwen/qwen3-4b:free", "name": "Qwen3 4B (Free)" },
          { "id": "deepseek/deepseek-v3.2", "name": "DeepSeek V3.2" },
          { "id": "x-ai/grok-4.1-fast", "name": "Grok 4.1 Fast" }
        ]
      },
      "anthropic": {
        "baseUrl": "https://api.anthropic.com",
        "apiKey": "",
        "auth": "oauth",
        "models": [
          { "id": "claude-opus-4-6", "name": "Claude Opus 4.6" },
          { "id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6" }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "thinkingDefault": "xhigh",
      "sandbox": {
        "mode": "off"
      },
      "bootstrapMaxChars": 50000,
      "bootstrapTotalMaxChars": 300000,
      "bootstrapPromptTruncationWarning": "once",
      "contextInjection": "continuation-skip",
      "model": {
        "primary": "minimax/MiniMax-M2.7",
        "fallbacks": [
          "google/gemini-2.5-flash"
        ]
      },
      "workspace": "/home/openclaw/.openclaw-samah/workspace",
      "memorySearch": {
        "enabled": true,
        "provider": "local",
        "experimental": {
          "sessionMemory": true
        },
        "sources": ["memory", "sessions"],
        "query": {
          "hybrid": {
            "enabled": true,
            "vectorWeight": 0.6,
            "textWeight": 0.4,
            "mmr": {
              "enabled": true,
              "lambda": 0.75
            },
            "temporalDecay": {
              "enabled": true,
              "halfLifeDays": 30
            }
          }
        }
      },
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "2h",
        "keepLastAssistants": 3
      },
      "compaction": {
        "mode": "default",
        "model": "minimax/MiniMax-M2.7",
        "notifyUser": false,
        "truncateAfterCompaction": true,
        "postIndexSync": "async",
        "reserveTokensFloor": 20000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 40000,
          "prompt": "Before compaction, save only durable architecture knowledge:\n- system decisions\n- technical tradeoffs\n- rejected options and why\n- interfaces and integration assumptions\n- cross-project constraints\nDo not save repetitive discussion, raw transcript debris, or transient implementation chatter.",
          "systemPrompt": "You are performing a pre-compaction memory flush.\nSave concise architectural knowledge and durable design context only."
        }
      },
      "heartbeat": {
        "isolatedSession": true
      },
      "imageGenerationModel": {
        "primary": "minimax/image-01"
      },
      "videoGenerationModel": {
        "primary": "minimax/MiniMax-Hailuo-2.3-Fast",
        "fallbacks": ["minimax/MiniMax-Hailuo-2.3"]
      },
      "musicGenerationModel": {
        "primary": "minimax/music-2.5+",
        "fallbacks": ["minimax/music-2.5", "minimax/music-2.0"]
      },
      "subagents": {
        "maxConcurrent": 5,
        "maxSpawnDepth": 2,
        "maxChildrenPerAgent": 3
      },
      "models": {
        "minimax/MiniMax-M2.7": {}
      }
    }
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true,
    "ownerDisplay": "raw"
  },
  "discovery": {
    "mdns": {
      "mode": "off"
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": "REDACTED",
      "allowBots": true,
      "groupPolicy": "open",
      "historyLimit": 25,
      "textChunkLimit": 2000,
      "streaming": "partial",
      "contextVisibility": "all",
      "autoPresence": {
        "enabled": true,
        "healthyText": "Online",
        "degradedText": "Degraded",
        "exhaustedText": "Credits exhausted"
      },
      "agentComponents": {
        "enabled": true
      },
      "guilds": {
        "1475082873777426494": {
          "slug": "olaclaw-homelab",
          "channels": {
            "1480483545431412877": { "requireMention": true, "enabled": true },
            "1475082874234343621": { "requireMention": true, "enabled": true },
            "1475083038810443878": { "requireMention": true, "enabled": true }
          }
        }
      },
      "threadBindings": {
        "spawnAcpSessions": true
      }
    }
  },
  "gateway": {
    "port": 18811,
    "mode": "local",
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "REDACTED"
    }
  },
  "plugins": {
    "allow": [
      "acpx", "discord", "browser", "minimax", "google"
    ],
    "entries": {
      "discord": { "enabled": true },
      "lobster": { "enabled": true },
      "acpx": { "enabled": true },
      "browser": { "enabled": true },
      "minimax": { "enabled": true },
      "brave": {
        "config": {
          "webSearch": { "apiKey": "REDACTED" }
        },
        "enabled": true
      },
      "google": { "enabled": true },
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": false,
            "frequency": "0 3 * * *",
            "timezone": "America/Chicago",
            "verboseLogging": true,
            "storage": { "mode": "both", "separateReports": true },
            "execution": {
              "defaults": {
                "speed": "balanced",
                "thinking": "medium",
                "budget": "medium",
                "model": "minimax/MiniMax-M2.7"
              }
            },
            "phases": {
              "light": {
                "enabled": true,
                "cron": "0 */6 * * *",
                "lookbackDays": 2,
                "limit": 100,
                "dedupeSimilarity": 0.9,
                "sources": ["daily", "sessions", "recall"]
              },
              "deep": {
                "enabled": true,
                "cron": "0 3 * * *",
                "limit": 10,
                "minScore": 0.8,
                "minRecallCount": 3,
                "minUniqueQueries": 3,
                "recencyHalfLifeDays": 14,
                "maxAgeDays": 30,
                "sources": ["daily", "memory", "sessions", "logs", "recall"],
                "recovery": { "enabled": true, "triggerBelowHealth": 0.35 }
              },
              "rem": {
                "enabled": true,
                "cron": "0 5 * * 0",
                "lookbackDays": 7,
                "limit": 10,
                "minPatternStrength": 0.75,
                "sources": ["memory", "daily", "deep"]
              }
            }
          }
        }
      }
    }
  },
  "tools": {
    "exec": {
      "security": "full"
    },
    "profile": "full",
    "alsoAllow": ["lobster"],
    "web": {
      "search": {}
    },
    "sessions": {
      "visibility": "tree"
    },
    "agentToAgent": {
      "enabled": true
    },
    "elevated": {
      "enabled": true
    },
    "loopDetection": {
      "enabled": true,
      "warningThreshold": 10,
      "criticalThreshold": 20,
      "globalCircuitBreakerThreshold": 30
    }
  },
  "session": {
    "agentToAgent": {
      "maxPingPongTurns": 5
    }
  },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": [
            "OPERATIONS.md",
            "TEAM.md",
            "OWNER-OVERRIDE.md",
            "DISCORD-RULES.md",
            "PERSONALITYLAYERS.md"
          ]
        }
      }
    }
  },
  "memory": {
    "backend": "qmd",
    "citations": "auto",
    "qmd": {
      "command": "/home/openclaw/.bun/bin/qmd",
      "searchMode": "search",
      "includeDefaultMemory": true,
      "update": {
        "interval": "10m",
        "debounceMs": 30000
      },
      "limits": {
        "maxResults": 6,
        "timeoutMs": 5000
      }
    }
  },
  "acp": {
    "enabled": true,
    "dispatch": {
      "enabled": false
    },
    "backend": "acpx",
    "allowedAgents": [
      "claude",
      "codex",
      "gemini",
      "opencode"
    ],
    "maxConcurrentSessions": 5
  },
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/chromium-browser",
    "headless": true,
    "noSandbox": true,
    "defaultProfile": "openclaw"
  },
  "cron": {
    "enabled": false
  },
  "skills": {
    "install": {
      "nodeManager": "npm"
    }
  },
  "mcp": {
    "servers": {
      "answeroverflow": {
        "url": "https://www.answeroverflow.com/mcp"
      }
    }
  },
  "talk": {
    "provider": "minimax",
    "providers": {
      "minimax": {
        "apiKey": "${MINIMAX_API_KEY}",
        "model": "speech-2.8-hd"
      }
    },
    "interruptOnSpeech": true,
    "silenceTimeoutMs": 1500
  }
}
```

---

## 7) Capital-Risk Operator

### Intended use
Agents that can influence or execute decisions involving real capital, live trading or financial operations, on-chain monitoring connected to real positions, systems where monetary loss is possible from incorrect action.

### Assigned agents
- **Hugh**

### Tier-specific notes
- `logging.level: debug` always
- `thinkingDefault: high` (not xhigh -- deliberate; fast reasoning for trading)
- Primary model: `openai-codex/gpt-5.3-codex-spark` (lighter model for cost control)
- Hugh-specific OpenRouter models: nemotron-nano-9b, nemotron-nano-12b-vl, qwen3-vl-30b, llama-3.3-70b
- Has vLLM provider (Qwen3.5 9B on Zifnab)
- `subagents.maxConcurrent: 1, maxSpawnDepth: 1, maxChildrenPerAgent: 1` (most restrictive)
- `tools.agentToAgent.enabled: false` (isolated from other agents)
- `acp.maxConcurrentSessions: 1` (single session only)
- `discord.streaming: off` (no streaming for trade ops)
- `discord.threadBindings.spawnAcpSessions: false`
- `commands.restart: false` (cannot self-restart)
- `cron.enabled: true` (for scheduled trade operations)
- Has unique channels including `1481335529395060757`
- `memorySearch.query.hybrid.vectorWeight: 0.7` (strong vector bias for trade context recall)
- `temporalDecay.halfLifeDays: 30` (in v5, was 14 in v4)

### Full config

```json
{
  "meta": {
    "lastTouchedVersion": "2026.4.5",
    "lastTouchedAt": "2026-04-07T05:10:07.906Z"
  },
  "env": {
    "MINIMAX_API_KEY": "REDACTED",
    "GEMINI_API_KEY": "REDACTED"
  },
  "logging": {
    "level": "debug",
    "file": "/data/openclaw/logs/hugh.log"
  },
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/chromium-browser",
    "headless": true,
    "noSandbox": true,
    "defaultProfile": "openclaw"
  },
  "models": {
    "mode": "merge",
    "providers": {
      "google": {
        "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
        "apiKey": "REDACTED",
        "models": [
          { "id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash" }
        ]
      },
      "openrouter": {
        "baseUrl": "https://openrouter.ai/api/v1",
        "apiKey": "REDACTED",
        "models": [
          { "id": "stepfun/step-3.5-flash:free", "name": "Step 3.5 Flash (Free)" },
          { "id": "z-ai/glm-4.5-air:free", "name": "GLM 4.5 Air (Free)" },
          { "id": "qwen/qwen3-vl-235b-a22b-thinking", "name": "Qwen3 VL 235B Thinking (Free)" },
          { "id": "arcee-ai/trinity-large-preview:free", "name": "Trinity Large Preview (Free)" },
          { "id": "qwen/qwen3-4b:free", "name": "Qwen3 4B (Free)" },
          { "id": "deepseek/deepseek-v3.2", "name": "DeepSeek V3.2" },
          { "id": "x-ai/grok-4.1-fast", "name": "Grok 4.1 Fast" }
        ]
      },
      "minimax": {
        "baseUrl": "https://api.minimax.io/anthropic",
        "apiKey": "${MINIMAX_API_KEY}",
        "api": "anthropic-messages",
        "models": [
          {
            "id": "MiniMax-M2.7",
            "name": "MiniMax M2.5",
            "reasoning": true,
            "input": ["text"],
            "cost": { "input": 0.3, "output": 1.2, "cacheRead": 0.03, "cacheWrite": 0.12 },
            "contextWindow": 200000,
            "maxTokens": 8192
          },
          {
            "id": "MiniMax-M2.7-highspeed",
            "name": "MiniMax M2.5 Highspeed",
            "reasoning": true,
            "input": ["text"],
            "cost": { "input": 0.3, "output": 1.2, "cacheRead": 0.03, "cacheWrite": 0.12 },
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      },
      "vllm": {
        "baseUrl": "http://100.103.189.117:8000/v1",
        "apiKey": "REDACTED",
        "models": [
          {
            "id": "qwen3.5-9b",
            "name": "Qwen3.5 9B (Zifnab)",
            "reasoning": true,
            "input": ["text"],
            "cost": { "input": 0, "output": 0 },
            "contextWindow": 32768,
            "maxTokens": 8192
          }
        ]
      },
      "anthropic": {
        "baseUrl": "https://api.anthropic.com",
        "apiKey": "",
        "auth": "oauth",
        "models": [
          { "id": "claude-opus-4-6", "name": "Claude Opus 4.6" },
          { "id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6" }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "thinkingDefault": "high",
      "sandbox": {
        "mode": "off"
      },
      "bootstrapMaxChars": 50000,
      "bootstrapTotalMaxChars": 300000,
      "bootstrapPromptTruncationWarning": "once",
      "contextInjection": "continuation-skip",
      "model": {
        "primary": "openai-codex/gpt-5.3-codex-spark",
        "fallbacks": [
          "minimax/MiniMax-M2.7",
          "google/gemini-2.5-flash"
        ]
      },
      "workspace": "/home/openclaw/.openclaw-hugh/workspace",
      "memorySearch": {
        "enabled": true,
        "provider": "local",
        "experimental": {
          "sessionMemory": true
        },
        "sources": ["memory", "sessions"],
        "query": {
          "hybrid": {
            "enabled": true,
            "vectorWeight": 0.7,
            "textWeight": 0.3,
            "mmr": {
              "enabled": true,
              "lambda": 0.75
            },
            "temporalDecay": {
              "enabled": true,
              "halfLifeDays": 30
            }
          }
        }
      },
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "1h",
        "keepLastAssistants": 4
      },
      "compaction": {
        "mode": "default",
        "model": "minimax/MiniMax-M2.7",
        "notifyUser": false,
        "truncateAfterCompaction": true,
        "postIndexSync": "async",
        "reserveTokensFloor": 20000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 40000,
          "prompt": "Before compaction, save only durable capital-risk context:\n- open theses\n- active guardrails\n- stop-loss state\n- wallet and execution constraints\n- recent significant market context\nDo not save hype chatter, duplicate commentary, or noisy short-lived observations.",
          "systemPrompt": "You are performing a pre-compaction memory flush.\nSave concise trade-governance, guardrail, and capital-risk memory only."
        }
      },
      "heartbeat": {
        "isolatedSession": true
      },
      "imageGenerationModel": {
        "primary": "minimax/image-01"
      },
      "videoGenerationModel": {
        "primary": "minimax/MiniMax-Hailuo-2.3-Fast",
        "fallbacks": ["minimax/MiniMax-Hailuo-2.3"]
      },
      "musicGenerationModel": {
        "primary": "minimax/music-2.5+",
        "fallbacks": ["minimax/music-2.5", "minimax/music-2.0"]
      },
      "subagents": {
        "maxConcurrent": 1,
        "maxSpawnDepth": 1,
        "maxChildrenPerAgent": 1
      },
      "models": {
        "openrouter/stepfun/step-3.5-flash:free": {},
        "openrouter/nvidia/nemotron-nano-9b-v2:free": {},
        "openrouter/nvidia/nemotron-nano-12b-v2-vl:free": {},
        "openrouter/qwen/qwen3-vl-30b-a3b-thinking": {},
        "openrouter/meta-llama/llama-3.3-70b-instruct:free": {},
        "ollama/qwen3.5:9b": {},
        "openrouter/deepseek/deepseek-v3.2": {},
        "openrouter/x-ai/grok-4.1-fast": {},
        "ollama/qwen2.5-coder:7b": {},
        "minimax/MiniMax-M2": {},
        "openai-codex/gpt-5.4": {},
        "openai-codex/gpt-5.3-codex-spark": {}
      }
    }
  },
  "tools": {
    "exec": {
      "security": "full"
    },
    "profile": "full",
    "alsoAllow": ["lobster"],
    "web": {
      "search": {}
    },
    "sessions": {
      "visibility": "self"
    },
    "agentToAgent": {
      "enabled": false
    },
    "elevated": {
      "enabled": false
    },
    "loopDetection": {
      "enabled": true,
      "warningThreshold": 10,
      "criticalThreshold": 20,
      "globalCircuitBreakerThreshold": 30
    }
  },
  "session": {
    "agentToAgent": {
      "maxPingPongTurns": 5
    }
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": false,
    "ownerDisplay": "raw"
  },
  "cron": {
    "enabled": true
  },
  "discovery": {
    "mdns": {
      "mode": "off"
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": "REDACTED",
      "allowBots": true,
      "groupPolicy": "open",
      "historyLimit": 25,
      "textChunkLimit": 2000,
      "streaming": "off",
      "contextVisibility": "all",
      "autoPresence": {
        "enabled": true,
        "healthyText": "Online",
        "degradedText": "Degraded",
        "exhaustedText": "Credits exhausted"
      },
      "agentComponents": {
        "enabled": true
      },
      "guilds": {
        "1475082873777426494": {
          "slug": "olaclaw-homelab",
          "channels": {
            "1475082964156157972": { "requireMention": true, "enabled": true },
            "1475082874234343621": { "requireMention": true, "enabled": true },
            "1475083038810443878": { "requireMention": true, "enabled": true },
            "1481335529395060757": { "requireMention": true, "enabled": true }
          }
        }
      },
      "threadBindings": {
        "spawnAcpSessions": false
      }
    }
  },
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "REDACTED"
    },
    "mode": "local"
  },
  "skills": {
    "install": {
      "nodeManager": "npm"
    }
  },
  "plugins": {
    "allow": [
      "acpx", "discord", "browser", "minimax",
      "openai", "google", "openrouter", "ollama"
    ],
    "entries": {
      "discord": { "enabled": true },
      "lobster": { "enabled": true },
      "acpx": { "enabled": true },
      "browser": { "enabled": true },
      "minimax": { "enabled": true },
      "brave": {
        "config": {
          "webSearch": { "apiKey": "REDACTED" }
        },
        "enabled": true
      },
      "openai": { "enabled": true },
      "google": { "enabled": true },
      "openrouter": { "enabled": true },
      "ollama": { "enabled": true },
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true,
            "frequency": "0 3 * * *",
            "timezone": "America/Chicago",
            "verboseLogging": true,
            "storage": { "mode": "both", "separateReports": true },
            "execution": {
              "defaults": {
                "speed": "balanced",
                "thinking": "medium",
                "budget": "medium",
                "model": "minimax/MiniMax-M2.7"
              }
            },
            "phases": {
              "light": {
                "enabled": true,
                "cron": "0 */6 * * *",
                "lookbackDays": 2,
                "limit": 100,
                "dedupeSimilarity": 0.9,
                "sources": ["daily", "sessions", "recall"]
              },
              "deep": {
                "enabled": true,
                "cron": "0 3 * * *",
                "limit": 10,
                "minScore": 0.8,
                "minRecallCount": 3,
                "minUniqueQueries": 3,
                "recencyHalfLifeDays": 14,
                "maxAgeDays": 30,
                "sources": ["daily", "memory", "sessions", "logs", "recall"],
                "recovery": { "enabled": true, "triggerBelowHealth": 0.35 }
              },
              "rem": {
                "enabled": true,
                "cron": "0 5 * * 0",
                "lookbackDays": 7,
                "limit": 10,
                "minPatternStrength": 0.75,
                "sources": ["memory", "daily", "deep"]
              }
            }
          }
        }
      }
    }
  },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": [
            "OPERATIONS.md",
            "TEAM.md",
            "OWNER-OVERRIDE.md",
            "DISCORD-RULES.md",
            "PERSONALITYLAYERS.md"
          ]
        }
      }
    }
  },
  "memory": {
    "backend": "qmd",
    "citations": "auto",
    "qmd": {
      "command": "/home/openclaw/.bun/bin/qmd",
      "searchMode": "search",
      "includeDefaultMemory": true,
      "update": {
        "interval": "10m",
        "debounceMs": 30000
      },
      "limits": {
        "maxResults": 6,
        "timeoutMs": 5000
      }
    }
  },
  "acp": {
    "enabled": true,
    "dispatch": {
      "enabled": false
    },
    "backend": "acpx",
    "allowedAgents": [
      "claude",
      "codex",
      "gemini"
    ],
    "maxConcurrentSessions": 1
  },
  "talk": {
    "provider": "minimax",
    "providers": {
      "minimax": {
        "apiKey": "${MINIMAX_API_KEY}",
        "model": "speech-2.8-hd"
      }
    },
    "interruptOnSpeech": true,
    "silenceTimeoutMs": 1500
  }
}
```

---

# Mapping notes

All notes from v4 remain valid:

1. **Alfred** is intentionally placed at **Assistant Orchestrator** rather than Lead Orchestrator. His v5 config includes `tools.exec.security: full` and `tools.profile: full` (elevated from v4's `allowlist`/`messaging`).
2. **Ramu** is intentionally placed at **Standard Work Agent**, even though he is a high-context standard role and may be revisited later if scope grows.
3. **Marit** is intentionally placed in **Senior Dev Coder** because her QA/testing role is deeply technical and tied to developer code validation.
4. **Hugh** is intentionally placed in a separate **Capital-Risk Operator** profile because live capital risk deserves stricter controls than the normal 6 profiles.
5. **Vasu and Limbeck** MCP overrides are layered on top of their baseline roles (Architect and Senior Dev respectively), not treated as separate profile families.

### Additional v5 notes

6. All agents now use `sandbox.mode: off` (was `non-main` or `all` in v4). This reflects operational reality where agents need unrestricted tool access.
7. All agents now use `tools.exec.security: full` and `tools.profile: full` universally. The v4 distinctions between `allowlist`/`full` and `coding`/`messaging`/`full` have been collapsed.
8. Bootstrap limits increased across the board: `bootstrapMaxChars: 50000` (was 30000), `bootstrapTotalMaxChars: 300000` (was 180000).
9. `compaction.model` is now explicitly set to `minimax/MiniMax-M2.7` on all tiers (was not specified in v4).
10. Hugh's primary model is `openai-codex/gpt-5.3-codex-spark` rather than the standard `openai-codex/gpt-5.4` used by other tiers.

---

# What changed from v4

## New top-level config sections (did not exist in v4)

| Section | Purpose |
|---|---|
| `meta` | Version tracking (`lastTouchedVersion`, `lastTouchedAt`) |
| `env` | Environment variable declarations (`MINIMAX_API_KEY`, `GEMINI_API_KEY`) |
| `models` | Full provider definitions with model registrations (Google, MiniMax, OpenRouter, Anthropic, Ollama, vLLM) |
| `models.providers.minimax` | MiniMax M2.7 and M2.7-highspeed via Anthropic-compatible API |
| `models.providers.anthropic` | Claude Opus 4.6 and Sonnet 4.6 via OAuth |
| `models.providers.vllm` | Self-hosted Qwen3.5 9B on Zifnab (Haplo and Hugh only) |
| `agents.defaults.model` | Explicit primary + fallbacks per tier |
| `agents.defaults.models` | Model allowlist (which models the agent may use) |
| `agents.defaults.contextInjection` | Set to `continuation-skip` on all tiers |
| `agents.defaults.bootstrapPromptTruncationWarning` | Set to `once` on all tiers |
| `agents.defaults.heartbeat` | `isolatedSession: true` on all tiers |
| `agents.defaults.imageGenerationModel` | MiniMax image-01 |
| `agents.defaults.videoGenerationModel` | MiniMax Hailuo 2.3 Fast with Hailuo 2.3 fallback |
| `agents.defaults.musicGenerationModel` | MiniMax music-2.5+ with 2.5 and 2.0 fallbacks |
| `compaction.model` | Explicitly set to `minimax/MiniMax-M2.7` |
| `compaction.notifyUser` | `false` on all tiers |
| `compaction.truncateAfterCompaction` | `true` on all tiers |
| `compaction.postIndexSync` | `async` on all tiers |
| `tools.loopDetection` | Circuit breaker: warning at 10, critical at 20, global breaker at 30 |
| `session.agentToAgent.maxPingPongTurns` | Set to 5 on all tiers |
| `session.dmScope` | `per-channel-peer` (Haplo only) |
| `messages.groupChat.mentionPatterns` | Per-agent mention regex |
| `commands.native` | `auto` on all tiers |
| `commands.nativeSkills` | `auto` on all tiers |
| `commands.ownerDisplay` | `raw` on all tiers |
| `discovery.mdns.mode` | `off` on all tiers |
| `channels.discord.allowBots` | `true` on all tiers |
| `channels.discord.groupPolicy` | `open` on all tiers |
| `channels.discord.contextVisibility` | `all` on all tiers |
| `channels.discord.autoPresence` | Health status text for Discord presence |
| `channels.discord.agentComponents` | `enabled: true` on all tiers |
| `channels.discord.threadBindings` | `spawnAcpSessions` per tier |
| `gateway` | Port, mode, bind, auth per agent |
| `skills.install.nodeManager` | `npm` on all tiers |
| `plugins` | Full plugin allow-list and per-plugin config |
| `plugins.entries.brave` | Web search API key |
| `plugins.entries.memory-core` | Dreaming configuration (light/deep/rem phases) |
| `hooks.internal.entries.bootstrap-extra-files` | 5 extra bootstrap files (OPERATIONS.md, TEAM.md, OWNER-OVERRIDE.md, DISCORD-RULES.md, PERSONALITYLAYERS.md) |
| `memory.qmd` | QMD memory backend with search, update intervals, result limits |
| `talk` | MiniMax speech-2.8-hd for voice, interrupt on speech, 1500ms silence timeout |
| `mcp.servers` | answeroverflow MCP server (Haplo, Marit, Samah) |
| `auth.profiles` | MiniMax auth profile (Haplo only) |
| `wizard` | Doctor run metadata |

## Changed settings from v4

| Setting | v4 | v5 | Reason |
|---|---|---|---|
| `thinkingDefault` | `adaptive` / `medium` | `xhigh` / `high` | Higher reasoning quality with newer models |
| `sandbox.mode` | `non-main` / `all` | `off` | Operational reality -- agents need unrestricted access |
| `bootstrapMaxChars` | 30000 | 50000 | Larger bootstrap for richer context |
| `bootstrapTotalMaxChars` | 180000 | 300000 | Supports more bootstrap files |
| `tools.exec.security` | `allowlist` / `full` (tier-dependent) | `full` (all tiers) | Simplified -- all agents need full exec |
| `tools.profile` | `coding` / `messaging` / `full` (tier-dependent) | `full` (all tiers) | Simplified -- all agents get full tool profile |
| `discord.streaming` | `off` / `progress` / `partial` | `partial` / `off` (Hugh only) | Upgraded from off/progress to partial |
| `hooks.bootstrap-extra-files.paths` | `AGENTS.md`, `IDENTITY.md` | `OPERATIONS.md`, `TEAM.md`, `OWNER-OVERRIDE.md`, `DISCORD-RULES.md`, `PERSONALITYLAYERS.md` | New bootstrap file set for v5 agent structure |
| `hybrid.mmr.lambda` | 0.70 (orchestrators) / 0.75 (devs) | 0.75 (all tiers) | Standardized |
| `hybrid.temporalDecay.halfLifeDays` | 21 (orchestrators) / 30 (devs) / 14 (Hugh) | 30 (all tiers) | Standardized to 30 days |

## Removed from v4

| Setting | v4 value | Reason removed |
|---|---|---|
| `tools.web.search.apiKey: set` | YAML placeholder | Moved to `plugins.entries.brave.config.webSearch.apiKey` |
| `sandbox.mode: all` | Used for soft roles | All agents now `off` |
| `sandbox.mode: non-main` | Used for operational roles | All agents now `off` |
| `tools.profile: coding` | Dev tiers | All agents now `full` |
| `tools.profile: messaging` | Orchestrator tiers | All agents now `full` |
| `tools.exec.security: allowlist` | Soft roles | All agents now `full` |

---

# Design philosophy

## v5 philosophy shifts from v4

1. **Uniform access, tiered capability.** v4 used access restrictions (sandbox, exec security, tool profile) to differentiate tiers. v5 gives all agents full access and differentiates through model selection, subagent limits, session memory, and dreaming.

2. **Model chain is the new control surface.** Instead of restricting what tools an agent can use, v5 controls which models an agent can call and how many subagents it can spawn. This is a more effective lever for managing cost and capability.

3. **MiniMax as compaction backbone.** All agents use MiniMax M2.7 for compaction, providing consistent memory handling across the fleet at low cost.

4. **Dreaming as selective memory consolidation.** Only high-value agents (Zifnab, Haplo, Hugh) have dreaming enabled. This runs nightly memory consolidation (light every 6h, deep at 3am, REM weekly) to prevent memory bloat.

5. **Bootstrap files reflect v5 agent structure.** The bootstrap-extra-files hook now loads OPERATIONS.md, TEAM.md, OWNER-OVERRIDE.md, DISCORD-RULES.md, and PERSONALITYLAYERS.md instead of the v4 set of AGENTS.md and IDENTITY.md.

6. **Real JSON, not YAML dot-notation.** v4 used flattened YAML dot-notation for readability. v5 provides the actual JSON as deployed, eliminating any translation ambiguity.

---

# Final review process note

Even with this handoff, we will still go through each actual agent **one by one, in tandem**, and confirm:

- whether the role assignment is still right
- whether the chosen baseline profile fits
- whether any small field changes are justified
- whether logging, session memory, sandboxing, or ACP behavior should be tightened further
- whether MCP or security-specific overrides need to be layered on top
- whether dreaming should be enabled or disabled for each agent
- whether the model chain and primary model are appropriate for the agent's workload

That keeps the system grounded in real roles instead of assumptions.
