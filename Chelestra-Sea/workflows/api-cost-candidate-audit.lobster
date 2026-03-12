name: api-cost-candidate-audit
description: "Audit OpenClaw config and recent gateway logs for repeated external model-call patterns that should be collapsed into Lobster workflows."
args:
  config_path:
    description: "Path to the live OpenClaw config file."
    type: string
    default: "/home/openclaw/.openclaw/openclaw.json"
  log_path:
    description: "Path to the OpenClaw gateway log file."
    type: string
    default: "/data/openclaw/logs/openclaw.log"
  log_tail_lines:
    description: "How many recent log lines to inspect."
    type: integer
    default: 5000
steps:
  - id: validate_inputs
    description: "Verify the expected config and log paths exist."
    command: |
      set -e
      test -f "${config_path}"
      test -f "${log_path}"
      echo "config=${config_path}"
      echo "log=${log_path}"

  - id: gateway_health
    description: "Confirm the live OpenClaw gateway is reachable."
    command: |
      set -e
      curl -sf http://127.0.0.1:18789/health

  - id: provider_inventory
    description: "Extract the configured model providers from live config."
    command: |
      jq -r '
        .models.providers
        | to_entries
        | map({
            provider: .key,
            baseUrl: (.value.baseUrl // .value.base_url // .value.host // ""),
            api: (.value.api // ""),
            local:
              (((.value.baseUrl // .value.base_url // .value.host // "") | test("localhost|127\\.0\\.0\\.1"))
              or (.key | test("ollama|vllm"; "i")))
          })
      ' "${config_path}"

  - id: expensive_provider_candidates
    description: "Flag non-local providers as cost-review candidates from config."
    command: |
      jq -r '
        .models.providers
        | to_entries
        | map({
            provider: .key,
            baseUrl: (.value.baseUrl // .value.base_url // .value.host // ""),
            api: (.value.api // ""),
            candidate:
              (
                (((.value.baseUrl // .value.base_url // .value.host // "") | test("localhost|127\\.0\\.0\\.1")) | not)
                or (.key | test("anthropic|openai|openrouter|minimax|google|xai|grok"; "i"))
              )
          })
        | map(select(.candidate))
      ' "${config_path}"

  - id: default_model_candidate
    description: "Inspect the default configured model and determine whether it points at an external provider."
    command: |
      jq -r '
        (.agents.defaults.model.primary // .agents.defaults.model // "") as $primary
        | if ($primary == "") then
            {primary:"", provider:"", external:false}
          else
            ($primary | split("/")[0]) as $provider
            | {
                primary: $primary,
                provider: $provider,
                external: ($provider | test("minimax|anthropic|openai|openrouter|google|xai|grok"; "i"))
              }
          end
      ' "${config_path}"

  - id: recent_log_keywords
    description: "Count recent external-provider keywords in the gateway log."
    command: |
      matches="$(
        tail -n "${log_tail_lines}" "${log_path}" \
          | grep -Eio 'anthropic|claude|openai|gpt-4|gpt-5|minimax|gemini|openrouter|opus|sonnet|grok' \
          | sort \
          | uniq -c \
          | sort -nr || true
      )"
      if [ -n "${matches}" ]; then
        printf '%s\n' "${matches}"
      else
        echo "No matching external-provider keywords found in recent log tail."
      fi

  - id: recommendations
    description: "Generate a human-readable audit report with rebuild candidates."
    command: |
      cat <<EOF
      API Cost Candidate Audit

      Gateway health:
      $gateway_health.stdout

      Configured providers:
      $provider_inventory.stdout

      External provider candidates for cost review:
      $expensive_provider_candidates.stdout

      Default configured model:
      $default_model_candidate.stdout

      Recent external-provider keyword counts:
      $recent_log_keywords.stdout

      Rules:
      - Any repeated operational flow hitting external providers is a Lobster candidate for simplification.
      - Any status report based on stale state instead of live config/logs is not trustworthy.
      - Do not enable timers from this workflow. Use it as a manual audit first.
      EOF
