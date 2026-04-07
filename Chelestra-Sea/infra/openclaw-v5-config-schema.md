# OpenClaw v2026.4.5 Config Schema Reference

Note: The repo is actually at v2026.4.6, not v2026.4.5 as stated. Now I have all the type definitions. Let me compile the complete reference. This is a massive schema, so I will organize it systematically.

Here is the complete OpenClaw v2026.4.6 config schema reference, organized by top-level section. Every key that can appear in `openclaw.json` is listed.

---

## META

```
meta.lastTouchedVersion | string | (none) | Last OpenClaw version that wrote this config
meta.lastTouchedAt | string | (none) | ISO timestamp when config was last written
```

## AUTH

```
auth.profiles.<id>.provider | string | (required) | Provider id for this auth profile
auth.profiles.<id>.mode | "api_key"|"oauth"|"token" | (required) | Credential type
auth.profiles.<id>.email | string | (none) | Email for this profile
auth.profiles.<id>.displayName | string | (none) | Display name for this profile
auth.order.<provider> | string[] | (none) | Profile priority order per provider
auth.cooldowns.billingBackoffHours | number | 5 | Default billing backoff hours
auth.cooldowns.billingBackoffHoursByProvider.<id> | number | (none) | Per-provider billing backoff
auth.cooldowns.billingMaxHours | number | 24 | Billing backoff cap
auth.cooldowns.authPermanentBackoffMinutes | number | 10 | Base backoff for permanent auth failures
auth.cooldowns.authPermanentMaxMinutes | number | 60 | Cap for permanent auth backoff
auth.cooldowns.failureWindowHours | number | 24 | Counter reset window
auth.cooldowns.overloadedProfileRotations | number | 1 | Max same-provider rotations before cross-provider fallback (overloaded)
auth.cooldowns.overloadedBackoffMs | number | 0 | Fixed delay before overloaded rotation retry
auth.cooldowns.rateLimitedProfileRotations | number | 1 | Max same-provider rotations (rate-limited)
```

## ACP (Agent Control Protocol) -- NEW IN v2026.4.x

```
acp.enabled | boolean | (none) | Global ACP runtime gate
acp.dispatch.enabled | boolean | (none) | Master switch for ACP turn dispatch
acp.backend | string | (none) | Backend id (e.g. "acpx")
acp.defaultAgent | string | (none) | Default ACP agent id
acp.allowedAgents | string[] | (none) | Restrict ACP to these agent ids
acp.maxConcurrentSessions | number | (none) | Max concurrent ACP sessions
acp.stream.coalesceIdleMs | number | (none) | Coalescer idle flush window (ms)
acp.stream.maxChunkChars | number | (none) | Max text size per streamed chunk
acp.stream.repeatSuppression | boolean | (none) | Suppress repeated ACP status lines
acp.stream.deliveryMode | "live"|"final_only" | (none) | Live stream or wait for terminal event
acp.stream.hiddenBoundarySeparator | "none"|"space"|"newline"|"paragraph" | (none) | Separator before visible text after hidden tool events
acp.stream.maxOutputChars | number | (none) | Max assistant output chars per turn
acp.stream.maxSessionUpdateChars | number | (none) | Max chars for projected session/update lines
acp.stream.tagVisibility.<tag> | boolean | (none) | Per-sessionUpdate tag visibility overrides
acp.runtime.ttlMinutes | number | (none) | Idle TTL for ACP session workers
acp.runtime.installCommand | string | (none) | Operator install/setup command
```

## ENV

```
env.shellEnv.enabled | boolean | (none) | Import secrets from login shell
env.shellEnv.timeoutMs | number | 15000 | Login shell exec timeout
env.vars.<KEY> | string | (none) | Inline env vars (applied when not already set)
env.<KEY> | string | (none) | Sugar: env vars directly under env
```

## WIZARD

```
wizard.lastRunAt | string | (none) | Last wizard run timestamp
wizard.lastRunVersion | string | (none) | Last wizard run version
wizard.lastRunCommit | string | (none) | Last wizard run commit
wizard.lastRunCommand | string | (none) | Last wizard run command
wizard.lastRunMode | "local"|"remote" | (none) | Last wizard run mode
```

## DIAGNOSTICS

```
diagnostics.enabled | boolean | (none) | Enable diagnostics
diagnostics.flags | string[] | (none) | Ad-hoc diagnostics flags (e.g. "telegram.http")
diagnostics.stuckSessionWarnMs | number | (none) | Threshold before "stuck session" log
diagnostics.otel.enabled | boolean | (none) | Enable OpenTelemetry
diagnostics.otel.endpoint | string | (none) | OTLP endpoint URL
diagnostics.otel.protocol | "http/protobuf"|"grpc" | (none) | OTLP transport
diagnostics.otel.headers.<key> | string | (none) | OTLP headers
diagnostics.otel.serviceName | string | (none) | OTLP service name
diagnostics.otel.traces | boolean | (none) | Enable traces
diagnostics.otel.metrics | boolean | (none) | Enable metrics
diagnostics.otel.logs | boolean | (none) | Enable logs
diagnostics.otel.sampleRate | number (0-1) | (none) | Trace sample rate
diagnostics.otel.flushIntervalMs | number | (none) | Metric export interval
diagnostics.cacheTrace.enabled | boolean | (none) | Enable cache trace
diagnostics.cacheTrace.filePath | string | (none) | Trace file path
diagnostics.cacheTrace.includeMessages | boolean | (none) | Include messages in trace
diagnostics.cacheTrace.includePrompt | boolean | (none) | Include prompt
diagnostics.cacheTrace.includeSystem | boolean | (none) | Include system
```

## LOGGING

```
logging.level | "silent"|"fatal"|"error"|"warn"|"info"|"debug"|"trace" | (none) | Log level
logging.file | string | (none) | Log file path
logging.maxFileBytes | number | 500MB | Max log file size before writes suppressed
logging.consoleLevel | "silent"|"fatal"|"error"|"warn"|"info"|"debug"|"trace" | (none) | Console log level
logging.consoleStyle | "pretty"|"compact"|"json" | (none) | Console style
logging.redactSensitive | "off"|"tools" | "tools" | Redact sensitive tokens
logging.redactPatterns | string[] | (none) | Regex patterns for redaction
```

## CLI

```
cli.banner.taglineMode | "random"|"default"|"off" | "random" | CLI banner tagline behavior
```

## UPDATE

```
update.channel | "stable"|"beta"|"dev" | (none) | Update channel
update.checkOnStart | boolean | (none) | Check for updates on gateway start
update.auto.enabled | boolean | false | Enable background auto-update
update.auto.stableDelayHours | number | 6 | Stable channel delay before auto-apply
update.auto.stableJitterHours | number | 12 | Stable channel jitter window
update.auto.betaCheckIntervalHours | number | 1 | Beta channel check cadence
```

## UI

```
ui.seamColor | string | (none) | Accent color for UI chrome (hex)
ui.assistant.name | string | (none) | Assistant display name
ui.assistant.avatar | string | (none) | Assistant avatar (emoji/URL/data URI)
```

## BROWSER

```
browser.enabled | boolean | (none) | Enable browser tool
browser.evaluateEnabled | boolean | true | Allow browser act:evaluate (arbitrary JS)
browser.cdpUrl | string | (none) | Base URL of CDP endpoint (remote)
browser.remoteCdpTimeoutMs | number | 1500 | Remote CDP HTTP timeout
browser.remoteCdpHandshakeTimeoutMs | number | max(timeout*2, 2000) | Remote CDP WS handshake timeout
browser.color | string | "#FF4500" | Accent color for browser profile
browser.executablePath | string | (none) | Browser executable path override
browser.headless | boolean | false | Start Chrome headless
browser.noSandbox | boolean | false | --no-sandbox flag
browser.attachOnly | boolean | false | Never launch, only attach
browser.cdpPortRangeStart | number | derived from gateway port | Starting CDP port
browser.defaultProfile | string | "chrome" | Default profile name
browser.profiles.<name>.cdpPort | number | (auto) | CDP port for profile
browser.profiles.<name>.cdpUrl | string | (none) | CDP URL for profile (remote)
browser.profiles.<name>.userDataDir | string | (none) | User data directory
browser.profiles.<name>.driver | "openclaw"|"clawd"|"existing-session" | "openclaw" | Profile driver
browser.profiles.<name>.attachOnly | boolean | (none) | Never launch for this profile
browser.profiles.<name>.color | string | (required) | Profile color
browser.snapshotDefaults.mode | "efficient" | (none) | Default snapshot mode
browser.ssrfPolicy.dangerouslyAllowPrivateNetwork | boolean | true | Allow private network navigation
browser.ssrfPolicy.allowedHostnames | string[] | (none) | Exact hostname allowlist
browser.ssrfPolicy.hostnameAllowlist | string[] | (none) | Hostname patterns (*.example.com)
browser.extraArgs | string[] | (none) | Additional Chrome launch args
```

## SECRETS

```
secrets.providers.<id>.source | "env"|"file"|"exec" | (required) | Secret provider type
secrets.providers.<id>.allowlist | string[] | (none) | Env var allowlist (env source)
secrets.providers.<id>.path | string | (required for file) | File path
secrets.providers.<id>.mode | "singleValue"|"json" | (none) | File read mode
secrets.providers.<id>.timeoutMs | number | (none) | Timeout for file/exec
secrets.providers.<id>.maxBytes | number | (none) | Max bytes (file)
secrets.providers.<id>.command | string | (required for exec) | Exec command
secrets.providers.<id>.args | string[] | (none) | Exec args
secrets.providers.<id>.noOutputTimeoutMs | number | (none) | No-output timeout
secrets.providers.<id>.maxOutputBytes | number | (none) | Max output bytes
secrets.providers.<id>.jsonOnly | boolean | (none) | Parse as JSON only
secrets.providers.<id>.env | Record<string,string> | (none) | Env vars for exec
secrets.providers.<id>.passEnv | string[] | (none) | Pass-through env vars
secrets.providers.<id>.trustedDirs | string[] | (none) | Trusted command directories
secrets.providers.<id>.allowInsecurePath | boolean | (none) | Allow insecure PATH
secrets.providers.<id>.allowSymlinkCommand | boolean | (none) | Allow symlinked commands
secrets.defaults.env | string | "default" | Default env provider alias
secrets.defaults.file | string | "default" | Default file provider alias
secrets.defaults.exec | string | "default" | Default exec provider alias
secrets.resolution.maxProviderConcurrency | number | (none) | Max concurrent provider resolutions
secrets.resolution.maxRefsPerProvider | number | (none) | Max refs per provider
secrets.resolution.maxBatchBytes | number | (none) | Max batch bytes
```

## SKILLS -- NEW/EXPANDED in v2026.4.x

```
skills.allowBundled | string[] | (none) | Bundled skill allowlist
skills.load.extraDirs | string[] | (none) | Additional skill folders
skills.load.watch | boolean | (none) | Watch skill folders for changes
skills.load.watchDebounceMs | number | (none) | Watcher debounce
skills.install.preferBrew | boolean | (none) | Prefer Homebrew for installs
skills.install.nodeManager | "npm"|"pnpm"|"yarn"|"bun" | (none) | Node package manager
skills.limits.maxCandidatesPerRoot | number | (none) | Max candidates per root dir
skills.limits.maxSkillsLoadedPerSource | number | (none) | Max skills per source
skills.limits.maxSkillsInPrompt | number | (none) | Max skills in model prompt
skills.limits.maxSkillsPromptChars | number | (none) | Max chars for skills prompt
skills.limits.maxSkillFileBytes | number | (none) | Max SKILL.md size
skills.entries.<id>.enabled | boolean | (none) | Enable/disable individual skill
skills.entries.<id>.apiKey | SecretInput | (none) | Skill API key
skills.entries.<id>.env | Record<string,string> | (none) | Skill env vars
skills.entries.<id>.config | Record<string,unknown> | (none) | Skill config
```

## PLUGINS

```
plugins.enabled | boolean | (none) | Enable plugin loading
plugins.allow | string[] | (none) | Plugin allowlist
plugins.deny | string[] | (none) | Plugin denylist
plugins.load.paths | string[] | (none) | Additional plugin paths
plugins.slots.memory | string | (none) | Memory slot plugin
plugins.slots.contextEngine | string | (none) | Context engine slot plugin
plugins.entries.<id>.enabled | boolean | (none) | Enable/disable plugin
plugins.entries.<id>.hooks.allowPromptInjection | boolean | (none) | Allow prompt mutation
plugins.entries.<id>.subagent.allowModelOverride | boolean | (none) | Allow model override for subagent
plugins.entries.<id>.subagent.allowedModels | string[] | (none) | Allowed model overrides ("*" = any)
plugins.entries.<id>.config | Record<string,unknown> | (none) | Plugin config
plugins.installs.<id>.source | "npm"|"archive"|"path"|"clawhub"|"marketplace" | (none) | Install source
plugins.installs.<id>.* | various | (none) | Install record fields
```

## MODELS

```
models.mode | "merge"|"replace" | (none) | Model catalog merge mode
models.providers.<id>.baseUrl | string | (required) | Provider base URL
models.providers.<id>.apiKey | SecretInput | (none) | Provider API key
models.providers.<id>.auth | "api-key"|"aws-sdk"|"oauth"|"token" | (none) | Auth mode
models.providers.<id>.api | ModelApi | (none) | API type (openai-completions, anthropic-messages, etc.)
models.providers.<id>.injectNumCtxForOpenAICompat | boolean | (none) | Inject num_ctx for OpenAI compat
models.providers.<id>.headers.<key> | SecretInput | (none) | Custom headers
models.providers.<id>.authHeader | boolean | (none) | Use auth header
models.providers.<id>.request.headers | Record<string,SecretInput> | (none) | Request headers
models.providers.<id>.request.auth | ConfiguredProviderRequestAuth | (none) | Request auth config -- NEW
models.providers.<id>.request.proxy | ConfiguredProviderRequestProxy | (none) | Request proxy config -- NEW
models.providers.<id>.request.tls | ConfiguredProviderRequestTls | (none) | Request TLS config -- NEW
models.providers.<id>.models[] | ModelDefinitionConfig[] | (required) | Model definitions
models.providers.<id>.models[].id | string | (required) | Model id
models.providers.<id>.models[].name | string | (required) | Model display name
models.providers.<id>.models[].api | ModelApi | (provider api) | Model-specific API
models.providers.<id>.models[].reasoning | boolean | false | Reasoning model flag
models.providers.<id>.models[].input | ("text"|"image")[] | ["text"] | Input modalities
models.providers.<id>.models[].cost.input | number | 0 | Input cost per token
models.providers.<id>.models[].cost.output | number | 0 | Output cost per token
models.providers.<id>.models[].cost.cacheRead | number | 0 | Cache read cost
models.providers.<id>.models[].cost.cacheWrite | number | 0 | Cache write cost
models.providers.<id>.models[].contextWindow | number | DEFAULT_CONTEXT_TOKENS | Context window size
models.providers.<id>.models[].contextTokens | number | (none) | Runtime effective cap (for budgeting)
models.providers.<id>.models[].maxTokens | number | 8192 | Max output tokens
models.providers.<id>.models[].headers | Record<string,string> | (none) | Model-specific headers
models.providers.<id>.models[].compat.* | various | (none) | Model compatibility overrides
models.bedrockDiscovery.enabled | boolean | (none) | Bedrock auto-discovery (deprecated)
models.copilotDiscovery.enabled | boolean | (none) | Copilot auto-discovery (deprecated)
models.huggingfaceDiscovery.enabled | boolean | (none) | HuggingFace auto-discovery (deprecated)
models.ollamaDiscovery.enabled | boolean | (none) | Ollama auto-discovery (deprecated)
```

### Provider Request Transport (request.auth, request.proxy, request.tls) -- NEW

```
request.auth.mode | "provider-default"|"authorization-bearer"|"header" | (none) | Auth mode
request.auth.token | SecretInput | (none) | Bearer token (authorization-bearer mode)
request.auth.headerName | string | (none) | Header name (header mode)
request.auth.value | SecretInput | (none) | Header value (header mode)
request.auth.prefix | string | (none) | Value prefix (header mode)
request.proxy.mode | "env-proxy"|"explicit-proxy" | (none) | Proxy mode
request.proxy.url | string | (none) | Explicit proxy URL
request.proxy.tls.* | TLS config | (none) | Proxy TLS settings
request.tls.ca | SecretInput | (none) | CA certificate
request.tls.cert | SecretInput | (none) | Client certificate
request.tls.key | SecretInput | (none) | Client key
request.tls.passphrase | SecretInput | (none) | Key passphrase
request.tls.serverName | string | (none) | Expected server name
request.tls.insecureSkipVerify | boolean | (none) | Skip TLS verification
```

## NODE HOST

```
nodeHost.browserProxy.enabled | boolean | true | Enable browser proxy on node host
nodeHost.browserProxy.allowProfiles | string[] | (none) | Profile allowlist
```

## AGENTS

```
agents.defaults.* | (see AGENT DEFAULTS below) | | Global agent defaults
agents.list[] | AgentConfig[] | (none) | Per-agent configurations
agents.list[].id | string | (required) | Agent identifier
agents.list[].default | boolean | (none) | Default agent flag
agents.list[].name | string | (none) | Display name
agents.list[].workspace | string | (none) | Agent workspace path
agents.list[].agentDir | string | (none) | Agent directory override
agents.list[].model | string | {primary,fallbacks} | (none) | Agent model
agents.list[].thinkingDefault | "off"|"minimal"|"low"|"medium"|"high"|"xhigh"|"adaptive" | (none) | Per-agent thinking level
agents.list[].verboseDefault | "off"|"on"|"full" | (none) | Per-agent verbose level
agents.list[].reasoningDefault | "on"|"off"|"stream" | (none) | Per-agent reasoning visibility
agents.list[].fastModeDefault | boolean | (none) | Per-agent fast mode
agents.list[].skills | string[] | (none) | Per-agent skill allowlist
agents.list[].memorySearch | MemorySearchConfig | (none) | Per-agent memory search
agents.list[].humanDelay | HumanDelayConfig | (none) | Per-agent reply delay
agents.list[].heartbeat | (same as defaults.heartbeat) | (none) | Per-agent heartbeat
agents.list[].identity.name | string | (none) | Agent identity name
agents.list[].identity.theme | string | (none) | Agent identity theme
agents.list[].identity.emoji | string | (none) | Agent identity emoji
agents.list[].identity.avatar | string | (none) | Agent avatar (path/URL/data URI)
agents.list[].groupChat.mentionPatterns | string[] | (none) | Custom mention patterns
agents.list[].groupChat.historyLimit | number | (none) | Group history limit
agents.list[].subagents.allowAgents | string[] | (none) | Per-agent subagent routing
agents.list[].subagents.model | AgentModelConfig | (none) | Per-agent subagent model
agents.list[].subagents.requireAgentId | boolean | (none) | Require explicit agentId
agents.list[].sandbox | AgentSandboxConfig | (none) | Per-agent sandbox
agents.list[].params | Record<string,unknown> | (none) | Per-agent stream params
agents.list[].tools.* | AgentToolsConfig | (none) | Per-agent tool overrides
agents.list[].runtime.type | "embedded"|"acp" | (none) | Runtime type
agents.list[].runtime.acp.agent | string | (none) | ACP harness adapter id
agents.list[].runtime.acp.backend | string | (none) | ACP backend override
agents.list[].runtime.acp.mode | "persistent"|"oneshot" | (none) | ACP session mode
agents.list[].runtime.acp.cwd | string | (none) | ACP working directory
```

## AGENT DEFAULTS (agents.defaults.*)

```
agents.defaults.params | Record<string,unknown> | (none) | Global default provider params
agents.defaults.model | string | {primary,fallbacks} | (none) | Primary model + fallbacks
agents.defaults.imageModel | AgentModelConfig | (none) | Image-capable model
agents.defaults.imageGenerationModel | AgentModelConfig | (none) | Image generation model -- NEW
agents.defaults.videoGenerationModel | AgentModelConfig | (none) | Video generation model -- NEW
agents.defaults.musicGenerationModel | AgentModelConfig | (none) | Music generation model -- NEW
agents.defaults.mediaGenerationAutoProviderFallback | boolean | true | Auto cross-provider fallback for media gen -- NEW
agents.defaults.pdfModel | AgentModelConfig | (none) | PDF-capable model
agents.defaults.pdfMaxBytesMb | number | 10 | Max PDF file size (MB)
agents.defaults.pdfMaxPages | number | 20 | Max PDF pages
agents.defaults.models.<provider/model>.alias | string | (none) | Model alias
agents.defaults.models.<provider/model>.params | Record<string,unknown> | (none) | Per-model provider params
agents.defaults.models.<provider/model>.streaming | boolean | true | Per-model streaming toggle
agents.defaults.workspace | string | (none) | Default agent workspace
agents.defaults.skills | string[] | (none) | Default skill allowlist -- NEW/EXPANDED
agents.defaults.repoRoot | string | (none) | Repository root override
agents.defaults.skipBootstrap | boolean | (none) | Skip bootstrap files
agents.defaults.contextInjection | "always"|"continuation-skip" | "always" | Bootstrap context injection mode -- NEW
agents.defaults.bootstrapMaxChars | number | 20000 | Max chars per bootstrap file
agents.defaults.bootstrapTotalMaxChars | number | 150000 | Max total bootstrap chars
agents.defaults.bootstrapPromptTruncationWarning | "off"|"once"|"always" | "once" | Truncation warning mode
agents.defaults.userTimezone | string | (host TZ) | IANA timezone for user
agents.defaults.timeFormat | "auto"|"12"|"24" | "auto" | Time format
agents.defaults.envelopeTimezone | string | "utc" | Envelope timestamp timezone
agents.defaults.envelopeTimestamp | "on"|"off" | "on" | Absolute timestamps in envelopes
agents.defaults.envelopeElapsed | "on"|"off" | "on" | Elapsed time in envelopes
agents.defaults.contextTokens | number | (none) | Context window cap for runtime estimates
agents.defaults.cliBackends.<name>.command | string | (required) | CLI command
agents.defaults.cliBackends.<name>.args | string[] | (none) | Base args
agents.defaults.cliBackends.<name>.output | "json"|"text"|"jsonl" | "json" | Output parsing
agents.defaults.cliBackends.<name>.resumeOutput | "json"|"text"|"jsonl" | (none) | Resume output mode
agents.defaults.cliBackends.<name>.input | "arg"|"stdin" | "arg" | Prompt input mode
agents.defaults.cliBackends.<name>.maxPromptArgChars | number | (none) | Max arg chars before stdin
agents.defaults.cliBackends.<name>.env | Record<string,string> | (none) | Extra env vars
agents.defaults.cliBackends.<name>.clearEnv | string[] | (none) | Env vars to remove
agents.defaults.cliBackends.<name>.modelArg | string | (none) | Flag for model id
agents.defaults.cliBackends.<name>.modelAliases | Record<string,string> | (none) | Model alias mapping
agents.defaults.cliBackends.<name>.sessionArg | string | (none) | Flag for session id
agents.defaults.cliBackends.<name>.sessionArgs | string[] | (none) | Extra resume args
agents.defaults.cliBackends.<name>.resumeArgs | string[] | (none) | Alternate resume args
agents.defaults.cliBackends.<name>.sessionMode | "always"|"existing"|"none" | (none) | When to pass sessions
agents.defaults.cliBackends.<name>.sessionIdFields | string[] | (none) | JSON fields for session id
agents.defaults.cliBackends.<name>.systemPromptArg | string | (none) | Flag for system prompt
agents.defaults.cliBackends.<name>.systemPromptMode | "append"|"replace" | (none) | System prompt behavior
agents.defaults.cliBackends.<name>.systemPromptWhen | "first"|"always"|"never" | (none) | When to send system prompt
agents.defaults.cliBackends.<name>.imageArg | string | (none) | Flag for image paths
agents.defaults.cliBackends.<name>.imageMode | "repeat"|"list" | (none) | Multi-image passing
agents.defaults.cliBackends.<name>.serialize | boolean | (none) | Serialize runs
agents.defaults.cliBackends.<name>.reliability.watchdog.fresh.noOutputTimeoutMs | number | (none) | Watchdog timeout (fresh)
agents.defaults.cliBackends.<name>.reliability.watchdog.fresh.noOutputTimeoutRatio | number | (none) | Watchdog ratio (fresh)
agents.defaults.cliBackends.<name>.reliability.watchdog.fresh.minMs | number | (none) | Watchdog min (fresh)
agents.defaults.cliBackends.<name>.reliability.watchdog.fresh.maxMs | number | (none) | Watchdog max (fresh)
agents.defaults.cliBackends.<name>.reliability.watchdog.resume.* | (same) | (none) | Watchdog tuning (resume)
agents.defaults.contextPruning.mode | "off"|"cache-ttl" | (none) | Context pruning mode
agents.defaults.contextPruning.ttl | string | (none) | Cache TTL (duration string)
agents.defaults.contextPruning.keepLastAssistants | number | (none) | Keep N last assistant turns
agents.defaults.contextPruning.softTrimRatio | number (0-1) | (none) | Soft trim ratio
agents.defaults.contextPruning.hardClearRatio | number (0-1) | (none) | Hard clear ratio
agents.defaults.contextPruning.minPrunableToolChars | number | (none) | Min prunable tool chars
agents.defaults.contextPruning.tools.allow | string[] | (none) | Pruning tool allowlist
agents.defaults.contextPruning.tools.deny | string[] | (none) | Pruning tool denylist
agents.defaults.contextPruning.softTrim.maxChars | number | (none) | Soft trim max chars
agents.defaults.contextPruning.softTrim.headChars | number | (none) | Soft trim head chars
agents.defaults.contextPruning.softTrim.tailChars | number | (none) | Soft trim tail chars
agents.defaults.contextPruning.hardClear.enabled | boolean | (none) | Enable hard clear
agents.defaults.contextPruning.hardClear.placeholder | string | (none) | Hard clear placeholder text
agents.defaults.llm.idleTimeoutSeconds | number | 60 | LLM streaming idle timeout
agents.defaults.compaction.mode | "default"|"safeguard" | "safeguard" | Compaction mode
agents.defaults.compaction.reserveTokens | number | (none) | Pi reserve tokens
agents.defaults.compaction.keepRecentTokens | number | (none) | Recent tokens budget
agents.defaults.compaction.reserveTokensFloor | number | (none) | Min reserve tokens (0 disables)
agents.defaults.compaction.maxHistoryShare | number (0.1-0.9) | 0.5 | Max history share in safeguard
agents.defaults.compaction.customInstructions | string | (none) | Additional compaction instructions
agents.defaults.compaction.recentTurnsPreserve | number (0-12) | (none) | Verbatim recent turns in summary
agents.defaults.compaction.identifierPolicy | "strict"|"off"|"custom" | (none) | Identifier preservation policy
agents.defaults.compaction.identifierInstructions | string | (none) | Custom identifier instructions
agents.defaults.compaction.qualityGuard.enabled | boolean | false | Quality audit retries
agents.defaults.compaction.qualityGuard.maxRetries | number | 1 | Max quality retries
agents.defaults.compaction.postIndexSync | "off"|"async"|"await" | (none) | Post-compaction memory index sync -- NEW
agents.defaults.compaction.postCompactionSections | string[] | ["Session Startup","Red Lines"] | AGENTS.md sections injected post-compaction
agents.defaults.compaction.model | string | (none) | Compaction model override -- NEW (was INVALID before)
agents.defaults.compaction.timeoutSeconds | number | 900 | Max compaction operation time
agents.defaults.compaction.truncateAfterCompaction | boolean | false | Truncate JSONL after compaction -- NEW
agents.defaults.compaction.notifyUser | boolean | false | Send compaction notice -- NEW
agents.defaults.compaction.memoryFlush.enabled | boolean | true | Enable pre-compaction memory flush
agents.defaults.compaction.memoryFlush.softThresholdTokens | number | (none) | Soft threshold for flush
agents.defaults.compaction.memoryFlush.forceFlushTranscriptBytes | number|string | (none) | Force flush threshold
agents.defaults.compaction.memoryFlush.prompt | string | (none) | Memory flush prompt
agents.defaults.compaction.memoryFlush.systemPrompt | string | (none) | Memory flush system prompt
agents.defaults.embeddedPi.projectSettingsPolicy | "trusted"|"sanitize"|"ignore" | "sanitize" | Pi runner project settings trust
agents.defaults.memorySearch | (see MEMORY SEARCH below) | | Vector memory search config
agents.defaults.thinkingDefault | "off"|"minimal"|"low"|"medium"|"high"|"xhigh"|"adaptive" | (none) | Default thinking level
agents.defaults.verboseDefault | "off"|"on"|"full" | (none) | Default verbose level
agents.defaults.elevatedDefault | "off"|"on"|"ask"|"full" | (none) | Default elevated level
agents.defaults.blockStreamingDefault | "off"|"on" | (none) | Default block streaming
agents.defaults.blockStreamingBreak | "text_end"|"message_end" | (none) | Block streaming boundary
agents.defaults.blockStreamingChunk.minChars | number | (none) | Block chunk min chars
agents.defaults.blockStreamingChunk.maxChars | number | (none) | Block chunk max chars
agents.defaults.blockStreamingChunk.breakPreference | "paragraph"|"newline"|"sentence" | (none) | Break preference
agents.defaults.blockStreamingCoalesce.minChars | number | (none) | Coalesce min chars
agents.defaults.blockStreamingCoalesce.maxChars | number | (none) | Coalesce max chars
agents.defaults.blockStreamingCoalesce.idleMs | number | (none) | Coalesce idle flush
agents.defaults.humanDelay.mode | "off"|"natural"|"custom" | (none) | Human-like delay mode
agents.defaults.humanDelay.minMs | number | 800 | Min delay
agents.defaults.humanDelay.maxMs | number | 2500 | Max delay
agents.defaults.timeoutSeconds | number | (none) | Agent timeout
agents.defaults.mediaMaxMb | number | (none) | Max inbound media size
agents.defaults.imageMaxDimensionPx | number | 1200 | Max image dimension for sanitization
agents.defaults.typingIntervalSeconds | number | (none) | Typing indicator interval
agents.defaults.typingMode | "never"|"instant"|"thinking"|"message" | (none) | Typing indicator mode
agents.defaults.heartbeat.every | string | "30m" | Heartbeat interval (duration)
agents.defaults.heartbeat.activeHours.start | string (HH:MM) | (none) | Active hours start
agents.defaults.heartbeat.activeHours.end | string (HH:MM) | (none) | Active hours end
agents.defaults.heartbeat.activeHours.timezone | string | "user" | Active hours TZ
agents.defaults.heartbeat.model | string | (none) | Heartbeat model override
agents.defaults.heartbeat.session | string | (none) | Heartbeat session key
agents.defaults.heartbeat.target | ChannelId | (none) | Delivery target ("last"|"none"|channel id)
agents.defaults.heartbeat.directPolicy | "allow"|"block" | "allow" | DM delivery policy
agents.defaults.heartbeat.to | string | (none) | Delivery override (E.164/chat id)
agents.defaults.heartbeat.accountId | string | (none) | Multi-account channel id
agents.defaults.heartbeat.prompt | string | (built-in) | Heartbeat prompt body
agents.defaults.heartbeat.ackMaxChars | number | 30 | Max chars after HEARTBEAT_OK
agents.defaults.heartbeat.suppressToolErrorWarnings | boolean | (none) | Suppress tool error warnings
agents.defaults.heartbeat.lightContext | boolean | (none) | Lightweight bootstrap (HEARTBEAT.md only)
agents.defaults.heartbeat.isolatedSession | boolean | (none) | Isolated session (no history) -- NEW
agents.defaults.heartbeat.includeReasoning | boolean | false | Deliver reasoning payload -- NEW
agents.defaults.maxConcurrent | number | 4 | Max concurrent agent runs
agents.defaults.subagents.allowAgents | string[] | (none) | Default subagent target allowlist
agents.defaults.subagents.maxConcurrent | number | 8 | Max concurrent subagent runs
agents.defaults.subagents.maxSpawnDepth | number (1-5) | 1 | Max spawn nesting depth -- NEW
agents.defaults.subagents.maxChildrenPerAgent | number (1-20) | 5 | Max active children per agent -- NEW
agents.defaults.subagents.archiveAfterMinutes | number | 60 | Auto-archive subagent sessions
agents.defaults.subagents.model | AgentModelConfig | (none) | Default subagent model
agents.defaults.subagents.thinking | string | (none) | Default subagent thinking level
agents.defaults.subagents.runTimeoutSeconds | number | (none) | Default subagent timeout
agents.defaults.subagents.announceTimeoutMs | number | 90000 | Gateway announce delivery timeout -- NEW
agents.defaults.subagents.requireAgentId | boolean | false | Require explicit agentId -- NEW
agents.defaults.sandbox.mode | "off"|"non-main"|"all" | (none) | Sandbox mode
agents.defaults.sandbox.backend | string | "docker" | Sandbox backend
agents.defaults.sandbox.workspaceAccess | "none"|"ro"|"rw" | (none) | Workspace access
agents.defaults.sandbox.sessionToolsVisibility | "spawned"|"all" | "spawned" | Session tools visibility
agents.defaults.sandbox.scope | "session"|"agent"|"shared" | (none) | Isolation scope
agents.defaults.sandbox.workspaceRoot | string | (none) | Workspace root
agents.defaults.sandbox.docker.* | (see SANDBOX DOCKER) | | Docker settings
agents.defaults.sandbox.ssh.* | (see SANDBOX SSH) | | SSH settings
agents.defaults.sandbox.browser.* | (see SANDBOX BROWSER) | | Sandboxed browser
agents.defaults.sandbox.prune.idleHours | number | (none) | Prune if idle N hours
agents.defaults.sandbox.prune.maxAgeDays | number | (none) | Prune if older than N days
```

## MEMORY SEARCH (agents.defaults.memorySearch / agents.list[].memorySearch)

```
memorySearch.enabled | boolean | true | Enable vector memory search
memorySearch.sources | ("memory"|"sessions")[] | ["memory"] | Sources to index
memorySearch.extraPaths | string[] | (none) | Extra paths to index
memorySearch.qmd.extraCollections | MemoryQmdIndexPath[] | (none) | QMD extra collections
memorySearch.multimodal.enabled | boolean | (none) | Enable multimodal indexing -- NEW
memorySearch.multimodal.modalities | ("image"|"audio"|"all")[] | (none) | File types to index -- NEW
memorySearch.multimodal.maxFileBytes | number | (none) | Max file size per multimodal entry -- NEW
memorySearch.experimental.sessionMemory | boolean | false | Experimental session indexing
memorySearch.provider | string | (none) | Embedding provider adapter
memorySearch.remote.baseUrl | string | (none) | Remote embedding URL
memorySearch.remote.apiKey | SecretInput | (none) | Remote API key
memorySearch.remote.headers | Record<string,string> | (none) | Remote headers
memorySearch.remote.batch.enabled | boolean | true | Batch API for embedding
memorySearch.remote.batch.wait | boolean | true | Wait for batch completion
memorySearch.remote.batch.concurrency | number | 2 | Max concurrent batches
memorySearch.remote.batch.pollIntervalMs | number | 5000 | Poll interval
memorySearch.remote.batch.timeoutMinutes | number | 60 | Batch timeout
memorySearch.fallback | string | (none) | Fallback embedding provider
memorySearch.model | string | (none) | Embedding model
memorySearch.outputDimensionality | number | (none) | Gemini embedding output dims (768/1536/3072)
memorySearch.local.modelPath | string | (none) | Local GGUF model path
memorySearch.local.modelCacheDir | string | (none) | Local model cache dir
memorySearch.store.driver | "sqlite" | (none) | Store driver
memorySearch.store.path | string | (none) | Store path
memorySearch.store.fts.tokenizer | "unicode61"|"trigram" | "unicode61" | FTS tokenizer
memorySearch.store.vector.enabled | boolean | true | sqlite-vec extension
memorySearch.store.vector.extensionPath | string | (none) | Override vec extension path
memorySearch.store.cache.enabled | boolean | true | Enable embedding cache
memorySearch.store.cache.maxEntries | number | (none) | Max cache entries
memorySearch.chunking.tokens | number | (none) | Chunk token size
memorySearch.chunking.overlap | number | (none) | Chunk overlap
memorySearch.sync.onSessionStart | boolean | (none) | Sync on session start
memorySearch.sync.onSearch | boolean | (none) | Sync on search
memorySearch.sync.watch | boolean | (none) | Watch for changes
memorySearch.sync.watchDebounceMs | number | (none) | Watch debounce
memorySearch.sync.intervalMinutes | number | (none) | Periodic sync interval
memorySearch.sync.sessions.deltaBytes | number | (none) | Min bytes before session reindex
memorySearch.sync.sessions.deltaMessages | number | (none) | Min lines before reindex
memorySearch.sync.sessions.postCompactionForce | boolean | true | Force reindex after compaction
memorySearch.query.maxResults | number | (none) | Max search results
memorySearch.query.minScore | number | (none) | Min relevance score
memorySearch.query.hybrid.enabled | boolean | true | Enable hybrid search
memorySearch.query.hybrid.vectorWeight | number | (none) | Vector weight (0-1)
memorySearch.query.hybrid.textWeight | number | (none) | BM25 weight (0-1)
memorySearch.query.hybrid.candidateMultiplier | number | 4 | Candidate pool multiplier
memorySearch.query.hybrid.mmr.enabled | boolean | false | Enable MMR re-ranking -- NEW
memorySearch.query.hybrid.mmr.lambda | number | 0.7 | MMR lambda (0=diversity, 1=relevance) -- NEW
memorySearch.query.hybrid.temporalDecay.enabled | boolean | false | Enable temporal decay -- NEW
memorySearch.query.hybrid.temporalDecay.halfLifeDays | number | 30 | Decay half-life -- NEW
```

## TOOLS

```
tools.profile | "minimal"|"coding"|"messaging"|"full" | (none) | Base tool profile
tools.allow | string[] | (none) | Tool allowlist
tools.alsoAllow | string[] | (none) | Additive allowlist (merged into allow/profile)
tools.deny | string[] | (none) | Tool denylist
tools.byProvider.<provider>.allow | string[] | (none) | Per-provider allow
tools.byProvider.<provider>.alsoAllow | string[] | (none) | Per-provider alsoAllow
tools.byProvider.<provider>.deny | string[] | (none) | Per-provider deny
tools.byProvider.<provider>.profile | ToolProfileId | (none) | Per-provider profile
tools.web.search.enabled | boolean | (none) | Enable web search
tools.web.search.provider | string | (none) | Search provider
tools.web.search.apiKey | SecretInput | (none) | Search API key
tools.web.search.maxResults | number | (none) | Search results count (1-10)
tools.web.search.timeoutSeconds | number | (none) | Search timeout
tools.web.search.cacheTtlMinutes | number | (none) | Search cache TTL
tools.web.search.openaiCodex.enabled | boolean | (none) | Codex native search -- NEW
tools.web.search.openaiCodex.mode | "cached"|"live" | "cached" | Codex search mode -- NEW
tools.web.search.openaiCodex.allowedDomains | string[] | (none) | Domain allowlist -- NEW
tools.web.search.openaiCodex.contextSize | "low"|"medium"|"high" | (none) | Context size hint -- NEW
tools.web.search.openaiCodex.userLocation.* | string | (none) | User location hints -- NEW
tools.web.x_search.enabled | boolean | (none) | X/Twitter search -- NEW
tools.web.x_search.model | string | (none) | xAI model id -- NEW
tools.web.x_search.inlineCitations | boolean | (none) | Keep inline citations -- NEW
tools.web.x_search.maxTurns | number | (none) | Max internal search turns -- NEW
tools.web.x_search.timeoutSeconds | number | (none) | X search timeout -- NEW
tools.web.x_search.cacheTtlMinutes | number | (none) | X search cache TTL -- NEW
tools.web.fetch.enabled | boolean | true | Enable web fetch
tools.web.fetch.provider | string | (none) | Fetch provider
tools.web.fetch.maxChars | number | (none) | Max return chars
tools.web.fetch.maxCharsCap | number | 50000 | Hard cap for maxChars
tools.web.fetch.maxResponseBytes | number | 2000000 | Max download size
tools.web.fetch.timeoutSeconds | number | (none) | Fetch timeout
tools.web.fetch.cacheTtlMinutes | number | (none) | Fetch cache TTL
tools.web.fetch.maxRedirects | number | 3 | Max redirects
tools.web.fetch.userAgent | string | (none) | Custom User-Agent
tools.web.fetch.readability | boolean | true | Use Readability extraction
tools.media.models[] | MediaUnderstandingModelConfig[] | (none) | Shared media models
tools.media.concurrency | number | (none) | Max concurrent media runs
tools.media.asyncCompletion.directSend | boolean | false | Direct send for async media gen -- NEW
tools.media.image.* | MediaUnderstandingConfig | (none) | Image understanding
tools.media.audio.* | MediaUnderstandingConfig | (none) | Audio understanding
tools.media.video.* | MediaUnderstandingConfig | (none) | Video understanding -- NEW
tools.links.enabled | boolean | (none) | Link understanding -- NEW
tools.links.scope | MediaUnderstandingScopeConfig | (none) | Link scope -- NEW
tools.links.maxLinks | number | (none) | Max links per message -- NEW
tools.links.timeoutSeconds | number | (none) | Link timeout -- NEW
tools.links.models[] | LinkModelConfig[] | (none) | Link models -- NEW
tools.message.allowCrossContextSend | boolean | (deprecated) | Cross-context sends
tools.message.crossContext.allowWithinProvider | boolean | true | Same-provider cross-context
tools.message.crossContext.allowAcrossProviders | boolean | false | Cross-provider sends
tools.message.crossContext.marker.enabled | boolean | true | Origin markers
tools.message.crossContext.marker.prefix | string | (none) | Marker prefix template
tools.message.crossContext.marker.suffix | string | (none) | Marker suffix template
tools.message.broadcast.enabled | boolean | true | Broadcast action
tools.agentToAgent.enabled | boolean | false | Agent-to-agent messaging
tools.agentToAgent.allow | string[] | (none) | A2A agent allowlist
tools.sessions.visibility | "self"|"tree"|"agent"|"all" | "tree" | Session tools visibility
tools.elevated.enabled | boolean | true | Elevated exec mode
tools.elevated.allowFrom.<provider> | (string|number)[] | (none) | Per-provider elevated allowlist
tools.exec.host | "auto"|"sandbox"|"gateway"|"node" | "auto" | Exec host routing
tools.exec.security | "deny"|"allowlist"|"full" | "deny" | Exec security mode
tools.exec.ask | "off"|"on-miss"|"always" | "on-miss" | Exec ask mode
tools.exec.node | string | (none) | Default node for exec
tools.exec.pathPrepend | string[] | (none) | PATH prepend dirs
tools.exec.safeBins | string[] | (none) | Safe stdin-only binaries
tools.exec.strictInlineEval | boolean | (none) | Strict inline eval -- NEW
tools.exec.safeBinTrustedDirs | string[] | (none) | Trusted safe-bin dirs
tools.exec.safeBinProfiles | Record<string,SafeBinProfile> | (none) | Safe-bin profiles
tools.exec.backgroundMs | number | (none) | Auto-background threshold
tools.exec.timeoutSec | number | (none) | Exec timeout
tools.exec.approvalRunningNoticeMs | number | 10000 | Running notice for approval exec
tools.exec.cleanupMs | number | (none) | Finished session cleanup
tools.exec.notifyOnExit | boolean | (none) | Notify on backgrounded exec exit
tools.exec.notifyOnExitEmptySuccess | boolean | false | Notify on empty success
tools.exec.applyPatch.enabled | boolean | true | Enable apply_patch
tools.exec.applyPatch.workspaceOnly | boolean | true | Restrict to workspace
tools.exec.applyPatch.allowModels | string[] | (none) | Model allowlist for apply_patch
tools.fs.workspaceOnly | boolean | false | Restrict fs tools to workspace
tools.loopDetection.enabled | boolean | false | Enable loop detection
tools.loopDetection.historySize | number | 30 | Max history entries
tools.loopDetection.warningThreshold | number | 10 | Warning threshold
tools.loopDetection.criticalThreshold | number | 20 | Critical/block threshold
tools.loopDetection.globalCircuitBreakerThreshold | number | 30 | Global breaker threshold
tools.loopDetection.detectors.genericRepeat | boolean | (none) | Generic repeat detector
tools.loopDetection.detectors.knownPollNoProgress | boolean | (none) | Known poll detector
tools.loopDetection.detectors.pingPong | boolean | (none) | Ping-pong detector
tools.subagents.model | string | {primary,fallbacks} | (none) | Subagent model
tools.subagents.tools.allow | string[] | (none) | Subagent tool allow
tools.subagents.tools.alsoAllow | string[] | (none) | Subagent tool alsoAllow
tools.subagents.tools.deny | string[] | (none) | Subagent tool deny
tools.sandbox.tools.allow | string[] | (none) | Sandbox tool allow
tools.sandbox.tools.alsoAllow | string[] | (none) | Sandbox tool alsoAllow
tools.sandbox.tools.deny | string[] | (none) | Sandbox tool deny
tools.experimental.planTool | boolean | (none) | Enable update_plan tool -- NEW
```

## BINDINGS

```
bindings[] | AgentBinding[] | (none) | Agent routing bindings
bindings[].type | "route"|"acp" | "route" | Binding type
bindings[].agentId | string | (required) | Target agent
bindings[].comment | string | (none) | Description
bindings[].match.channel | string | (required) | Channel id
bindings[].match.accountId | string | (none) | Account id
bindings[].match.peer.kind | ChatType | (none) | Peer kind (dm/group)
bindings[].match.peer.id | string | (none) | Peer id
bindings[].match.guildId | string | (none) | Discord guild
bindings[].match.teamId | string | (none) | Slack team
bindings[].match.roles | string[] | (none) | Discord roles
bindings[].acp.mode | "persistent"|"oneshot" | (none) | ACP mode (acp bindings)
bindings[].acp.label | string | (none) | ACP label
bindings[].acp.cwd | string | (none) | ACP cwd
bindings[].acp.backend | string | (none) | ACP backend
```

## BROADCAST

```
broadcast.strategy | "parallel"|"sequential" | (none) | Default processing strategy
broadcast.<peerId> | string[] | (none) | Agent IDs for broadcast peer
```

## AUDIO (deprecated)

```
audio.transcription.command | string[] | (deprecated) | CLI command for transcription
audio.transcription.timeoutSeconds | number | (deprecated) | Transcription timeout
```

## MEDIA

```
media.preserveFilenames | boolean | (none) | Preserve uploaded filenames
media.ttlHours | number | (none) | Inbound media retention window
```

## MESSAGES

```
messages.messagePrefix | string | (deprecated) | Inbound prefix (use whatsapp-specific)
messages.responsePrefix | string | (none) | Outbound reply prefix (supports {model}, {provider}, "auto")
messages.groupChat.mentionPatterns | string[] | (none) | Custom mention patterns
messages.groupChat.historyLimit | number | (none) | Group history context limit
messages.queue.mode | "steer"|"followup"|"collect"|"steer-backlog"|"steer+backlog"|"queue"|"interrupt" | (none) | Queue mode
messages.queue.byChannel.<channel> | QueueMode | (none) | Per-channel queue mode
messages.queue.debounceMs | number | (none) | Queue debounce
messages.queue.debounceMsByChannel.<channel> | number | (none) | Per-channel debounce
messages.queue.cap | number | (none) | Queue cap
messages.queue.drop | "old"|"new"|"summarize" | (none) | Queue drop policy
messages.inbound.debounceMs | number | (none) | Inbound debounce
messages.inbound.byChannel.<channel> | number | (none) | Per-channel inbound debounce
messages.ackReaction | string | (none) | Ack emoji (empty disables)
messages.ackReactionScope | "group-mentions"|"group-all"|"direct"|"all"|"off"|"none" | "group-mentions" | When to send ack reactions
messages.removeAckAfterReply | boolean | false | Remove ack after reply
messages.statusReactions.enabled | boolean | false | Lifecycle status reactions
messages.statusReactions.emojis.thinking | string | (none) | Thinking emoji
messages.statusReactions.emojis.tool | string | (none) | Tool emoji
messages.statusReactions.emojis.coding | string | (none) | Coding emoji
messages.statusReactions.emojis.web | string | (none) | Web emoji
messages.statusReactions.emojis.done | string | (none) | Done emoji
messages.statusReactions.emojis.error | string | (none) | Error emoji
messages.statusReactions.emojis.stallSoft | string | (none) | Soft stall emoji
messages.statusReactions.emojis.stallHard | string | (none) | Hard stall emoji
messages.statusReactions.emojis.compacting | string | (none) | Compacting emoji
messages.statusReactions.timing.debounceMs | number | 700 | Debounce interval
messages.statusReactions.timing.stallSoftMs | number | 25000 | Soft stall timeout
messages.statusReactions.timing.stallHardMs | number | 60000 | Hard stall timeout
messages.statusReactions.timing.doneHoldMs | number | 1500 | Done hold time
messages.statusReactions.timing.errorHoldMs | number | 2500 | Error hold time
messages.suppressToolErrors | boolean | false | Suppress tool error warnings
messages.tts.* | TtsConfig | (none) | Text-to-speech for outbound replies
```

## COMMANDS

```
commands.native | boolean|"auto" | "auto" | Native command registration
commands.nativeSkills | boolean|"auto" | "auto" | Native skill command registration
commands.text | boolean | true | Text command parsing
commands.bash | boolean | false | Bash chat command
commands.bashForegroundMs | number | 2000 | Bash foreground timeout
commands.config | boolean | false | /config command
commands.mcp | boolean | false | /mcp command
commands.plugins | boolean | false | /plugins command
commands.debug | boolean | false | /debug command
commands.restart | boolean | true | Restart commands
commands.useAccessGroups | boolean | true | Enforce access groups
commands.ownerAllowFrom | (string|number)[] | (none) | Owner allowlist
commands.ownerDisplay | "raw"|"hash" | (none) | Owner ID display mode
commands.ownerDisplaySecret | string | (none) | Hash secret
commands.allowFrom.<provider> | (string|number)[] | (none) | Per-provider command allowlist
```

## APPROVALS

```
approvals.exec.enabled | boolean | false | Enable exec approval forwarding
approvals.exec.mode | "session"|"targets"|"both" | "session" | Delivery mode
approvals.exec.agentFilter | string[] | (none) | Agent ID filter
approvals.exec.sessionFilter | string[] | (none) | Session key filter
approvals.exec.targets[].channel | string | (required) | Target channel
approvals.exec.targets[].to | string | (required) | Destination id
approvals.exec.targets[].accountId | string | (none) | Account id
approvals.exec.targets[].threadId | string|number | (none) | Thread id
approvals.plugin.* | (same as exec) | | Plugin approval forwarding
```

## SESSION

```
session.scope | "per-sender"|"global" | (none) | Session scope
session.dmScope | "main"|"per-peer"|"per-channel-peer"|"per-account-channel-peer" | "main" | DM session scope
session.identityLinks.<platform:id> | string[] | (none) | Map platform IDs to canonical peers
session.resetTriggers | string[] | (none) | Reset trigger strings
session.idleMinutes | number | (none) | Session idle timeout
session.reset.mode | "daily"|"idle" | (none) | Reset mode
session.reset.atHour | number (0-23) | (none) | Daily reset hour
session.reset.idleMinutes | number | (none) | Idle window
session.resetByType.direct.* | SessionResetConfig | (none) | DM reset config
session.resetByType.dm.* | SessionResetConfig | (deprecated) | Alias for direct
session.resetByType.group.* | SessionResetConfig | (none) | Group reset config
session.resetByType.thread.* | SessionResetConfig | (none) | Thread reset config
session.resetByChannel.<channel>.* | SessionResetConfig | (none) | Per-channel reset
session.store | string | (none) | Session store path
session.typingIntervalSeconds | number | (none) | Typing interval
session.typingMode | "never"|"instant"|"thinking"|"message" | (none) | Typing mode
session.parentForkMaxTokens | number | (none) | Max parent tokens for fork (0 disables)
session.mainKey | string | "main" | Main session key (always "main")
session.sendPolicy.default | "allow"|"deny" | (none) | Default send policy
session.sendPolicy.rules[] | SessionSendPolicyRule | (none) | Send policy rules
session.agentToAgent.maxPingPongTurns | number (0-5) | 5 | Max A2A ping-pong turns
session.threadBindings.enabled | boolean | (none) | Thread-bound session routing -- NEW
session.threadBindings.idleHours | number | 24 | Thread binding idle window -- NEW
session.threadBindings.maxAgeHours | number | 0 | Thread binding max age -- NEW
session.maintenance.mode | "enforce"|"warn" | "warn" | Maintenance mode
session.maintenance.pruneAfter | string|number | "30d" | Prune old entries
session.maintenance.pruneDays | number | (deprecated) | Use pruneAfter
session.maintenance.maxEntries | number | 500 | Max session entries
session.maintenance.rotateBytes | number|string | "10mb" | Rotate sessions.json size
session.maintenance.resetArchiveRetention | string|number|false | "30d" | Reset archive retention
session.maintenance.maxDiskBytes | number|string | (none) | Per-agent disk budget
session.maintenance.highWaterBytes | number|string | 80% of maxDiskBytes | Target after cleanup
```

## WEB

```
web.enabled | boolean | true | Enable WhatsApp web provider
web.heartbeatSeconds | number | (none) | Heartbeat interval
web.reconnect.initialMs | number | (none) | Initial reconnect delay
web.reconnect.maxMs | number | (none) | Max reconnect delay
web.reconnect.factor | number | (none) | Backoff factor
web.reconnect.jitter | number | (none) | Backoff jitter
web.reconnect.maxAttempts | number | (none) | Max attempts (0=unlimited)
```

## CHANNELS

```
channels.defaults.groupPolicy | "open"|"disabled"|"allowlist" | (none) | Default group policy
channels.defaults.contextVisibility | "all"|"allowlist"|"allowlist_quote" | "all" | Default context visibility -- KEY FOR YOUR FLEET
channels.defaults.heartbeat.showOk | boolean | false | Show HEARTBEAT_OK
channels.defaults.heartbeat.showAlerts | boolean | true | Show heartbeat alerts
channels.defaults.heartbeat.useIndicator | boolean | true | Emit indicator events
channels.modelByChannel.<provider>.<channelId> | string | (none) | Per-channel model override
channels.discord.* | (see DISCORD below) | | Discord config
channels.telegram.* | TelegramConfig | | Telegram config
channels.slack.* | SlackConfig | | Slack config
channels.signal.* | SignalConfig | | Signal config
channels.<plugin-id>.* | ExtensionChannelConfig | | Plugin channel config
```

## DISCORD (channels.discord.*)

```
channels.discord.enabled | boolean | true | Enable Discord
channels.discord.token | SecretInput | (none) | Bot token
channels.discord.proxy | string | (none) | HTTP(S) proxy for gateway WS
channels.discord.name | string | (none) | Account display name
channels.discord.capabilities | string[] | (none) | Provider capability tags
channels.discord.markdown.tables | "off"|"bullets"|"code"|"block" | (none) | Table rendering
channels.discord.commands.native | boolean|"auto" | (none) | Native command registration
channels.discord.commands.nativeSkills | boolean|"auto" | (none) | Native skill commands
channels.discord.configWrites | boolean | true | Allow config writes
channels.discord.allowBots | boolean|"mentions" | false | Allow bot messages
channels.discord.dangerouslyAllowNameMatching | boolean | false | Allow name matching in allowlists
channels.discord.groupPolicy | "open"|"disabled"|"allowlist" | (none) | Guild channel policy
channels.discord.contextVisibility | "all"|"allowlist"|"allowlist_quote" | (none) | Context visibility -- NEW KEY
channels.discord.textChunkLimit | number | 2000 | Outbound chunk size
channels.discord.streaming.mode | "off"|"partial"|"block"|"progress" | (none) | Preview streaming
channels.discord.streaming.chunkMode | "length"|"newline" | (none) | Chunk mode
channels.discord.streaming.preview.chunk.* | BlockStreamingChunkConfig | (none) | Preview chunk config
channels.discord.streaming.block.enabled | boolean | (none) | Block delivery
channels.discord.streaming.block.coalesce.* | BlockStreamingCoalesceConfig | (none) | Block coalesce
channels.discord.maxLinesPerMessage | number | 17 | Soft max lines per message
channels.discord.mediaMaxMb | number | (none) | Max media size
channels.discord.historyLimit | number | (none) | Group history limit
channels.discord.dmHistoryLimit | number | (none) | DM history limit
channels.discord.dms.<userId>.historyLimit | number | (none) | Per-DM history
channels.discord.retry.attempts | number | 3 | Outbound retry attempts
channels.discord.retry.minDelayMs | number | 300-500 | Min retry delay
channels.discord.retry.maxDelayMs | number | 30000 | Max retry delay
channels.discord.retry.jitter | number | 0.1 | Jitter factor
channels.discord.actions.reactions | boolean | true | Reaction actions
channels.discord.actions.stickers | boolean | true | Sticker actions
channels.discord.actions.polls | boolean | true | Poll actions
channels.discord.actions.permissions | boolean | true | Permission actions
channels.discord.actions.messages | boolean | true | Message actions
channels.discord.actions.threads | boolean | true | Thread actions
channels.discord.actions.pins | boolean | true | Pin actions
channels.discord.actions.search | boolean | true | Search actions
channels.discord.actions.memberInfo | boolean | true | Member info
channels.discord.actions.roleInfo | boolean | true | Role info
channels.discord.actions.roles | boolean | true | Role actions
channels.discord.actions.channelInfo | boolean | true | Channel info
channels.discord.actions.voiceStatus | boolean | true | Voice status
channels.discord.actions.events | boolean | true | Events
channels.discord.actions.moderation | boolean | true | Moderation
channels.discord.actions.emojiUploads | boolean | true | Emoji uploads
channels.discord.actions.stickerUploads | boolean | true | Sticker uploads
channels.discord.actions.channels | boolean | true | Channel management
channels.discord.actions.presence | boolean | false | Bot presence changes -- NEW
channels.discord.replyToMode | "off"|"first"|"all"|"batched" | (none) | Reply threading
channels.discord.dmPolicy | DmPolicy | (none) | DM access policy alias
channels.discord.allowFrom | string[] | (none) | DM allowlist alias
channels.discord.defaultTo | string | (none) | Default delivery target
channels.discord.dm.enabled | boolean | true | Enable DMs
channels.discord.dm.policy | "pairing"|"allowlist"|"open"|"disabled" | "pairing" | DM policy
channels.discord.dm.allowFrom | string[] | (none) | DM sender allowlist
channels.discord.dm.groupEnabled | boolean | false | Allow group DMs
channels.discord.dm.groupChannels | string[] | (none) | Group DM allowlist
channels.discord.guilds.<guildId>.slug | string | (none) | Guild slug
channels.discord.guilds.<guildId>.requireMention | boolean | (none) | Require @mention
channels.discord.guilds.<guildId>.ignoreOtherMentions | boolean | false | Drop other-mention msgs
channels.discord.guilds.<guildId>.tools.allow | string[] | (none) | Guild tool allow
channels.discord.guilds.<guildId>.tools.alsoAllow | string[] | (none) | Guild tool alsoAllow
channels.discord.guilds.<guildId>.tools.deny | string[] | (none) | Guild tool deny
channels.discord.guilds.<guildId>.toolsBySender.<key>.* | GroupToolPolicyConfig | (none) | Per-sender tools
channels.discord.guilds.<guildId>.reactionNotifications | "off"|"own"|"all"|"allowlist" | "own" | Reaction notifications
channels.discord.guilds.<guildId>.users | string[] | (none) | Guild user allowlist
channels.discord.guilds.<guildId>.roles | string[] | (none) | Guild role allowlist
channels.discord.guilds.<guildId>.channels.<channelId>.requireMention | boolean | (none) | Per-channel mention
channels.discord.guilds.<guildId>.channels.<channelId>.ignoreOtherMentions | boolean | false | Drop other-mention
channels.discord.guilds.<guildId>.channels.<channelId>.tools.* | GroupToolPolicyConfig | (none) | Channel tools
channels.discord.guilds.<guildId>.channels.<channelId>.toolsBySender.* | ... | (none) | Per-sender
channels.discord.guilds.<guildId>.channels.<channelId>.skills | string[] | (none) | Channel skills
channels.discord.guilds.<guildId>.channels.<channelId>.enabled | boolean | (none) | Enable/disable
channels.discord.guilds.<guildId>.channels.<channelId>.users | string[] | (none) | Channel users
channels.discord.guilds.<guildId>.channels.<channelId>.roles | string[] | (none) | Channel roles
channels.discord.guilds.<guildId>.channels.<channelId>.systemPrompt | string | (none) | Channel system prompt
channels.discord.guilds.<guildId>.channels.<channelId>.includeThreadStarter | boolean | true | Thread starter context
channels.discord.guilds.<guildId>.channels.<channelId>.autoThread | boolean | (none) | Auto-create threads
channels.discord.guilds.<guildId>.channels.<channelId>.autoArchiveDuration | 60|1440|4320|10080 | (none) | Thread archive mins
channels.discord.guilds.<guildId>.channels.<channelId>.autoThreadName | "message"|"generated" | (none) | Thread naming
channels.discord.heartbeat.showOk | boolean | false | Show HEARTBEAT_OK
channels.discord.heartbeat.showAlerts | boolean | true | Show alerts
channels.discord.heartbeat.useIndicator | boolean | true | UI indicator
channels.discord.healthMonitor.enabled | boolean | (none) | Health monitor
channels.discord.execApprovals.enabled | boolean|"auto" | (none) | Exec approval forwarding
channels.discord.execApprovals.approvers | string[] | (none) | Approver user IDs
channels.discord.execApprovals.agentFilter | string[] | (none) | Agent filter
channels.discord.execApprovals.sessionFilter | string[] | (none) | Session filter
channels.discord.execApprovals.cleanupAfterResolve | boolean | false | Delete after resolve
channels.discord.execApprovals.target | "dm"|"channel"|"both" | "dm" | Approval target
channels.discord.agentComponents.enabled | boolean | true | Interactive components -- NEW
channels.discord.ui.components.accentColor | string | (none) | Component accent color -- NEW
channels.discord.slashCommand.ephemeral | boolean | true | Ephemeral slash replies
channels.discord.threadBindings.enabled | boolean | (none) | Thread binding -- NEW
channels.discord.threadBindings.idleHours | number | 24 | Idle hours -- NEW
channels.discord.threadBindings.maxAgeHours | number | 0 | Max age -- NEW
channels.discord.threadBindings.spawnSubagentSessions | boolean | false | Auto-create subagent threads -- NEW
channels.discord.threadBindings.spawnAcpSessions | boolean | false | Auto-create ACP threads -- NEW
channels.discord.intents.presence | boolean | false | Guild Presences intent
channels.discord.intents.guildMembers | boolean | false | Guild Members intent
channels.discord.voice.enabled | boolean | true | Voice conversations
channels.discord.voice.autoJoin[].guildId | string | (required) | Voice auto-join guild
channels.discord.voice.autoJoin[].channelId | string | (required) | Voice auto-join channel
channels.discord.voice.daveEncryption | boolean | true | DAVE E2E encryption
channels.discord.voice.decryptionFailureTolerance | number | 24 | Decrypt failure tolerance
channels.discord.voice.tts.* | TtsConfig | (none) | Voice TTS overrides
channels.discord.pluralkit.enabled | boolean | (none) | PluralKit resolution
channels.discord.pluralkit.token | string | (none) | PluralKit token
channels.discord.responsePrefix | string | (none) | Response prefix
channels.discord.ackReaction | string | (none) | Per-account ack reaction
channels.discord.ackReactionScope | "group-mentions"|...|"none" | (none) | Ack scope
channels.discord.activity | string | (none) | Bot activity text
channels.discord.status | "online"|"dnd"|"idle"|"invisible" | (none) | Bot status
channels.discord.autoPresence.enabled | boolean | false | Auto runtime presence -- NEW
channels.discord.autoPresence.intervalMs | number | 30000 | Poll interval -- NEW
channels.discord.autoPresence.minUpdateIntervalMs | number | 15000 | Min update spacing -- NEW
channels.discord.autoPresence.healthyText | string | (none) | Healthy status text -- NEW
channels.discord.autoPresence.degradedText | string | (none) | Degraded status text -- NEW
channels.discord.autoPresence.exhaustedText | string | (none) | Exhausted status text -- NEW
channels.discord.activityType | 0|1|2|3|4|5 | 4 | Activity type
channels.discord.activityUrl | string | (none) | Streaming URL
channels.discord.inboundWorker.runTimeoutMs | number | 1800000 | Queued run timeout (30 min)
channels.discord.eventQueue.listenerTimeout | number | 120000 | Listener timeout
channels.discord.eventQueue.maxQueueSize | number | 10000 | Max queue size
channels.discord.eventQueue.maxConcurrency | number | 50 | Max concurrent events
channels.discord.accounts.<id>.* | (same as top-level discord) | | Multi-account config
channels.discord.defaultAccount | string | (none) | Default account
```

## CRON

```
cron.enabled | boolean | (none) | Enable cron
cron.store | string | (none) | Cron store path
cron.maxConcurrentRuns | number | (none) | Max concurrent cron runs
cron.retry.maxAttempts | number | 3 | Max retry attempts
cron.retry.backoffMs | number[] | [30000,60000,300000] | Backoff delays
cron.retry.retryOn | CronRetryOn[] | (all transient) | Error types to retry
cron.webhook | string | (deprecated) | Legacy webhook URL
cron.webhookToken | SecretInput | (none) | Webhook bearer token
cron.sessionRetention | string|false | "24h" | Completed session retention
cron.runLog.maxBytes | number|string | 2000000 | Run log max bytes
cron.runLog.keepLines | number | 2000 | Run log keep lines
cron.failureAlert.enabled | boolean | (none) | Failure alerts
cron.failureAlert.after | number | (none) | Alert after N failures
cron.failureAlert.cooldownMs | number | (none) | Alert cooldown
cron.failureAlert.mode | "announce"|"webhook" | (none) | Alert mode
cron.failureAlert.accountId | string | (none) | Alert account
cron.failureDestination.channel | string | (none) | Default failure channel
cron.failureDestination.to | string | (none) | Default failure target
cron.failureDestination.accountId | string | (none) | Default failure account
cron.failureDestination.mode | "announce"|"webhook" | (none) | Default failure mode
```

## HOOKS

```
hooks.enabled | boolean | (none) | Enable hooks
hooks.path | string | (none) | Hooks path
hooks.token | string | (none) | Hook auth token
hooks.defaultSessionKey | string | (none) | Default hook session key
hooks.allowRequestSessionKey | boolean | false | Allow request session keys
hooks.allowedSessionKeyPrefixes | string[] | (none) | Session key prefix allowlist
hooks.allowedAgentIds | string[] | (none) | Agent id routing allowlist
hooks.maxBodyBytes | number | (none) | Max body size
hooks.presets | string[] | (none) | Hook presets
hooks.transformsDir | string | (none) | Transforms directory
hooks.mappings[].id | string | (none) | Mapping id
hooks.mappings[].match.path | string | (none) | Path match
hooks.mappings[].match.source | string | (none) | Source match
hooks.mappings[].action | "wake"|"agent" | (none) | Hook action
hooks.mappings[].wakeMode | "now"|"next-heartbeat" | (none) | Wake mode
hooks.mappings[].name | string | (none) | Mapping name
hooks.mappings[].agentId | string | (none) | Route to agent
hooks.mappings[].sessionKey | string | (none) | Session key
hooks.mappings[].messageTemplate | string | (none) | Message template
hooks.mappings[].textTemplate | string | (none) | Text template
hooks.mappings[].deliver | boolean | (none) | Deliver to channel
hooks.mappings[].allowUnsafeExternalContent | boolean | (none) | DANGEROUS: disable safety wrapping
hooks.mappings[].channel | "last"|string | (none) | Target channel
hooks.mappings[].to | string | (none) | Delivery target
hooks.mappings[].model | string | (none) | Model override
hooks.mappings[].thinking | string | (none) | Thinking level
hooks.mappings[].timeoutSeconds | number | (none) | Timeout
hooks.mappings[].transform.module | string | (none) | Transform module path
hooks.mappings[].transform.export | string | (none) | Transform export name
hooks.gmail.account | string | (none) | Gmail account
hooks.gmail.label | string | (none) | Gmail label filter
hooks.gmail.topic | string | (none) | Pub/Sub topic
hooks.gmail.subscription | string | (none) | Pub/Sub subscription
hooks.gmail.pushToken | string | (none) | Push token
hooks.gmail.hookUrl | string | (none) | Hook URL
hooks.gmail.includeBody | boolean | (none) | Include email body
hooks.gmail.maxBytes | number | (none) | Max body bytes
hooks.gmail.renewEveryMinutes | number | (none) | Watch renewal interval
hooks.gmail.allowUnsafeExternalContent | boolean | (none) | DANGEROUS flag
hooks.gmail.serve.bind | string | (none) | Local listener bind
hooks.gmail.serve.port | number | (none) | Local listener port
hooks.gmail.serve.path | string | (none) | Local listener path
hooks.gmail.tailscale.mode | "off"|"serve"|"funnel" | (none) | Tailscale exposure
hooks.gmail.tailscale.path | string | (none) | Tailscale path
hooks.gmail.tailscale.target | string | (none) | Serve/funnel target
hooks.gmail.model | string | (none) | Model override
hooks.gmail.thinking | "off"|"minimal"|"low"|"medium"|"high" | (none) | Thinking level
hooks.internal.enabled | boolean | (none) | Internal hooks system
hooks.internal.entries.<id>.enabled | boolean | (none) | Per-hook enable
hooks.internal.entries.<id>.env | Record<string,string> | (none) | Per-hook env
hooks.internal.load.extraDirs | string[] | (none) | Extra hook dirs
hooks.internal.installs.<id>.* | HookInstallRecord | (none) | Hook install records
```

## DISCOVERY

```
discovery.wideArea.enabled | boolean | (none) | Wide-area DNS-SD discovery
discovery.wideArea.domain | string | (none) | Unicast DNS-SD domain
discovery.mdns.mode | "off"|"minimal"|"full" | "minimal" | mDNS/Bonjour broadcast
```

## CANVAS HOST

```
canvasHost.enabled | boolean | (none) | Enable canvas host
canvasHost.root | string | "~/.openclaw/workspace/canvas" | Serve directory
canvasHost.port | number | 18793 | HTTP port
canvasHost.liveReload | boolean | true | Live-reload file watching
```

## TALK (Voice/Talk Mode)

```
talk.provider | string | (none) | Active Talk TTS provider
talk.providers.<id>.apiKey | SecretInput | (none) | Provider API key
talk.providers.<id>.* | unknown | (none) | Provider-specific config
talk.interruptOnSpeech | boolean | true | Stop on user speech
talk.silenceTimeoutMs | number | (none) | Silence timeout before send
```

## GATEWAY

```
gateway.port | number | 18789 | Gateway WS+HTTP port
gateway.mode | "local"|"remote" | (none) | Gateway mode
gateway.bind | "auto"|"lan"|"loopback"|"custom"|"tailnet" | "loopback" | Bind address policy
gateway.customBindHost | string | (none) | Custom IP (bind=custom)
gateway.controlUi.enabled | boolean | (none) | Serve Control UI
gateway.controlUi.basePath | string | (none) | UI base path
gateway.controlUi.root | string | (none) | UI asset root
gateway.controlUi.allowedOrigins | string[] | (none) | Allowed WS origins
gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback | boolean | (none) | DANGEROUS: Host header fallback
gateway.controlUi.allowInsecureAuth | boolean | (none) | Insecure auth toggle
gateway.controlUi.dangerouslyDisableDeviceAuth | boolean | (none) | DANGEROUS: Disable device auth
gateway.auth.mode | "none"|"token"|"password"|"trusted-proxy" | "token" | Auth mode
gateway.auth.token | SecretInput | (none) | Token (token mode)
gateway.auth.password | SecretInput | (none) | Password (password mode)
gateway.auth.allowTailscale | boolean | (none) | Allow Tailscale identity
gateway.auth.rateLimit.maxAttempts | number | 10 | Max failed attempts
gateway.auth.rateLimit.windowMs | number | 60000 | Sliding window
gateway.auth.rateLimit.lockoutMs | number | 300000 | Lockout duration
gateway.auth.rateLimit.exemptLoopback | boolean | true | Exempt loopback
gateway.auth.trustedProxy.userHeader | string | (required) | User identity header -- NEW
gateway.auth.trustedProxy.requiredHeaders | string[] | (none) | Required proxy headers -- NEW
gateway.auth.trustedProxy.allowUsers | string[] | (none) | User allowlist -- NEW
gateway.tailscale.mode | "off"|"serve"|"funnel" | (none) | Tailscale exposure
gateway.tailscale.resetOnExit | boolean | (none) | Reset on shutdown
gateway.remote.enabled | boolean | true | Remote gateway enabled
gateway.remote.url | string | (none) | Remote WS URL
gateway.remote.transport | "ssh"|"direct" | (none) | macOS remote transport
gateway.remote.token | SecretInput | (none) | Remote auth token
gateway.remote.password | SecretInput | (none) | Remote auth password
gateway.remote.tlsFingerprint | string | (none) | Expected TLS fingerprint
gateway.remote.sshTarget | string | (none) | SSH tunnel target
gateway.remote.sshIdentity | string | (none) | SSH identity file
gateway.reload.mode | "off"|"restart"|"hot"|"hybrid" | "hybrid" | Config reload strategy -- NEW
gateway.reload.debounceMs | number | 300 | Reload debounce
gateway.reload.deferralTimeoutMs | number | 300000 | Max wait for in-flight ops
gateway.tls.enabled | boolean | (none) | Enable TLS
gateway.tls.autoGenerate | boolean | true | Auto self-signed cert
gateway.tls.certPath | string | (none) | PEM cert path
gateway.tls.keyPath | string | (none) | PEM key path
gateway.tls.caPath | string | (none) | CA bundle path
gateway.http.endpoints.chatCompletions.enabled | boolean | false | POST /v1/chat/completions
gateway.http.endpoints.chatCompletions.maxBodyBytes | number | 20MB | Max body size
gateway.http.endpoints.chatCompletions.maxImageParts | number | 8 | Max image parts
gateway.http.endpoints.chatCompletions.maxTotalImageBytes | number | 20MB | Max total image bytes
gateway.http.endpoints.chatCompletions.images.allowUrl | boolean | false | Allow URL fetches
gateway.http.endpoints.chatCompletions.images.urlAllowlist | string[] | (none) | URL hostname allowlist
gateway.http.endpoints.chatCompletions.images.allowedMimes | string[] | (none) | Allowed MIME types
gateway.http.endpoints.chatCompletions.images.maxBytes | number | 10MB | Max per image
gateway.http.endpoints.chatCompletions.images.maxRedirects | number | 3 | Max redirects
gateway.http.endpoints.chatCompletions.images.timeoutMs | number | 10000 | Fetch timeout
gateway.http.endpoints.responses.enabled | boolean | false | POST /v1/responses (OpenResponses) -- NEW
gateway.http.endpoints.responses.maxBodyBytes | number | 20MB | Max body
gateway.http.endpoints.responses.maxUrlParts | number | 8 | Max URL parts
gateway.http.endpoints.responses.files.allowUrl | boolean | true | Allow file URL fetch
gateway.http.endpoints.responses.files.urlAllowlist | string[] | (none) | File URL allowlist
gateway.http.endpoints.responses.files.allowedMimes | string[] | (none) | Allowed MIME
gateway.http.endpoints.responses.files.maxBytes | number | 5MB | Max per file
gateway.http.endpoints.responses.files.maxChars | number | 200000 | Max decoded chars
gateway.http.endpoints.responses.files.maxRedirects | number | 3 | Max redirects
gateway.http.endpoints.responses.files.timeoutMs | number | 10000 | Fetch timeout
gateway.http.endpoints.responses.files.pdf.maxPages | number | 4 | PDF max pages
gateway.http.endpoints.responses.files.pdf.maxPixels | number | 4000000 | PDF max pixels
gateway.http.endpoints.responses.files.pdf.minTextChars | number | 200 | Min text before rasterize
gateway.http.endpoints.responses.images.allowUrl | boolean | true | Allow image URL
gateway.http.endpoints.responses.images.urlAllowlist | string[] | (none) | Image URL allowlist
gateway.http.endpoints.responses.images.allowedMimes | string[] | (none) | Allowed MIME
gateway.http.endpoints.responses.images.maxBytes | number | 10MB | Max per image
gateway.http.endpoints.responses.images.maxRedirects | number | 3 | Max redirects
gateway.http.endpoints.responses.images.timeoutMs | number | 10000 | Fetch timeout
gateway.http.securityHeaders.strictTransportSecurity | string|false | (none) | HSTS header
gateway.push.apns.relay.baseUrl | string | (none) | iOS APNs relay URL
gateway.push.apns.relay.timeoutMs | number | 10000 | Relay timeout
gateway.nodes.browser.mode | "auto"|"manual"|"off" | "auto" | Browser node routing
gateway.nodes.browser.node | string | (none) | Pin to node
gateway.nodes.allowCommands | string[] | (none) | Extra node.invoke commands
gateway.nodes.denyCommands | string[] | (none) | Deny commands
gateway.trustedProxies | string[] | (none) | Trusted reverse proxy IPs -- NEW
gateway.allowRealIpFallback | boolean | false | x-real-ip fallback -- NEW
gateway.tools.deny | string[] | (none) | HTTP /tools/invoke denylist
gateway.tools.allow | string[] | (none) | HTTP /tools/invoke allowlist
gateway.webchat.chatHistoryMaxChars | number | 12000 | WebChat history max chars
gateway.channelHealthCheckMinutes | number | 5 | Health check interval
gateway.channelStaleEventThresholdMinutes | number | 30 | Stale event threshold
gateway.channelMaxRestartsPerHour | number | 10 | Max restarts per hour
```

## MEMORY

```
memory.backend | "builtin"|"qmd" | (none) | Memory backend
memory.citations | "auto"|"on"|"off" | (none) | Citation mode
memory.qmd.command | string | (none) | QMD binary path
memory.qmd.mcporter.enabled | boolean | (none) | Route via mcporter -- NEW
memory.qmd.mcporter.serverName | string | "qmd" | mcporter server name -- NEW
memory.qmd.mcporter.startDaemon | boolean | true | Auto-start daemon -- NEW
memory.qmd.searchMode | "query"|"search"|"vsearch" | (none) | QMD search mode
memory.qmd.searchTool | string | (none) | QMD search tool name
memory.qmd.includeDefaultMemory | boolean | (none) | Include default memory
memory.qmd.paths[].path | string | (required) | QMD index path
memory.qmd.paths[].name | string | (none) | Index name
memory.qmd.paths[].pattern | string | (none) | File pattern
memory.qmd.sessions.enabled | boolean | (none) | Session export
memory.qmd.sessions.exportDir | string | (none) | Export directory
memory.qmd.sessions.retentionDays | number | (none) | Retention days
memory.qmd.update.interval | string | (none) | Update interval
memory.qmd.update.debounceMs | number | (none) | Update debounce
memory.qmd.update.onBoot | boolean | (none) | Update on boot
memory.qmd.update.waitForBootSync | boolean | (none) | Wait for boot sync
memory.qmd.update.embedInterval | string | (none) | Embed interval
memory.qmd.update.commandTimeoutMs | number | (none) | Command timeout
memory.qmd.update.updateTimeoutMs | number | (none) | Update timeout
memory.qmd.update.embedTimeoutMs | number | (none) | Embed timeout
memory.qmd.limits.maxResults | number | (none) | Max results
memory.qmd.limits.maxSnippetChars | number | (none) | Max snippet chars
memory.qmd.limits.maxInjectedChars | number | (none) | Max injected chars
memory.qmd.limits.timeoutMs | number | (none) | Timeout
memory.qmd.scope | SessionSendPolicyConfig | (none) | Memory scope policy
```

## MCP

```
mcp.servers.<name>.command | string | (none) | Stdio command
mcp.servers.<name>.args | string[] | (none) | Stdio args
mcp.servers.<name>.env | Record<string,string|number|boolean> | (none) | Env vars
mcp.servers.<name>.cwd | string | (none) | Working directory
mcp.servers.<name>.workingDirectory | string | (none) | Alias for cwd
mcp.servers.<name>.url | string | (none) | HTTP transport URL
mcp.servers.<name>.transport | "sse"|"streamable-http" | (none) | HTTP transport type
mcp.servers.<name>.headers | Record<string,string|number|boolean> | (none) | HTTP headers
mcp.servers.<name>.connectionTimeoutMs | number | (none) | Connection timeout
```

---

## NEW/CHANGED Keys vs v2026.4.1 Summary

The following are keys that are either new or newly supported (previously invalid/undocumented) compared to v2026.4.1:

**Media Generation (NEW)**
- `agents.defaults.videoGenerationModel` -- video generation model chain
- `agents.defaults.musicGenerationModel` -- music generation model chain
- `agents.defaults.imageGenerationModel` -- image generation model (was only imageModel before)
- `agents.defaults.mediaGenerationAutoProviderFallback` -- cross-provider fallback for media gen

**Compaction Model (NOW VALID)**
- `agents.defaults.compaction.model` -- compaction model override (was INVALID before v2026.4.x, now fully supported)
- `agents.defaults.compaction.truncateAfterCompaction` -- JSONL truncation post-compaction
- `agents.defaults.compaction.notifyUser` -- user notification on compaction
- `agents.defaults.compaction.postIndexSync` -- post-compaction memory index sync

**Context Injection**
- `agents.defaults.contextInjection` -- "always" or "continuation-skip" for bootstrap injection
- `agents.defaults.bootstrapPromptTruncationWarning` -- truncation warning mode

**Skills/Subagents**
- `agents.defaults.skills` -- default skill allowlist
- `agents.defaults.subagents.maxSpawnDepth` -- nesting depth (1-5)
- `agents.defaults.subagents.maxChildrenPerAgent` -- active children cap
- `agents.defaults.subagents.announceTimeoutMs` -- gateway announce timeout
- `agents.defaults.subagents.requireAgentId` -- require explicit agentId
- `agents.list[].skills` -- per-agent skill list

**Discord contextVisibility (NEW)**
- `channels.discord.contextVisibility` -- "all"|"allowlist"|"allowlist_quote" at account level
- `channels.defaults.contextVisibility` -- global default
- (Also on Telegram, Slack, Signal, and all extension channels)

**Provider Request Transport (NEW)**
- `models.providers.<id>.request.auth` -- request-level auth (bearer, header)
- `models.providers.<id>.request.proxy` -- request-level proxy (env or explicit)
- `models.providers.<id>.request.tls` -- request-level TLS (CA, cert, key, SNI, skip verify)

**Thread Bindings (NEW)**
- `session.threadBindings.enabled/idleHours/maxAgeHours`
- `channels.discord.threadBindings.*` including `spawnSubagentSessions` and `spawnAcpSessions`

**Heartbeat (NEW)**
- `agents.defaults.heartbeat.isolatedSession` -- no-history heartbeat sessions
- `agents.defaults.heartbeat.includeReasoning` -- deliver reasoning payload

**Discord (NEW)**
- `channels.discord.actions.presence` -- bot presence changes
- `channels.discord.agentComponents.enabled` -- interactive components
- `channels.discord.ui.components.accentColor` -- component accent color
- `channels.discord.autoPresence.*` -- runtime/quota-based auto-presence
- `channels.discord.voice.*` -- voice channel conversations

**Gateway (NEW)**
- `gateway.auth.mode: "trusted-proxy"` + `gateway.auth.trustedProxy.*`
- `gateway.reload.mode: "hot"|"hybrid"` with deferralTimeoutMs
- `gateway.trustedProxies` -- reverse proxy IP list
- `gateway.allowRealIpFallback` -- x-real-ip fallback
- `gateway.http.endpoints.responses.*` -- OpenResponses API

**Memory (NEW)**
- `memory.qmd.mcporter.*` -- mcporter integration for QMD
- `memorySearch.multimodal.*` -- multimodal file indexing
- `memorySearch.query.hybrid.mmr.*` -- MMR re-ranking
- `memorySearch.query.hybrid.temporalDecay.*` -- recency boosting

**Tools (NEW)**
- `tools.web.x_search.*` -- X/Twitter search via xAI
- `tools.web.search.openaiCodex.*` -- Codex native web search
- `tools.links.*` -- link understanding
- `tools.media.asyncCompletion.directSend` -- async media gen delivery
- `tools.exec.strictInlineEval` -- interpreter inline-eval gating
- `tools.experimental.planTool` -- update_plan tool

**ACP (NEW section)**
- Entire `acp.*` section for Agent Control Protocol

**Other**
- `agents.list[].reasoningDefault` -- per-agent reasoning visibility
- `agents.list[].fastModeDefault` -- per-agent fast mode
- `agents.defaults.envelopeTimezone/envelopeTimestamp/envelopeElapsed` -- envelope controls

---

**NOTE:** The repo is at version **2026.4.6** (not 2026.4.5 as stated). All keys above are sourced directly from the TypeScript type definitions at `H:\Projects\AI_Tools_And_Information\openclaw\src\config\types.*.ts` and the defaults at `defaults.ts`, `agent-limits.ts`, and `zod-schema.agent-defaults.ts`.