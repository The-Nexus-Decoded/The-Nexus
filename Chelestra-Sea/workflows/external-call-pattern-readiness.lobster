name: external-call-pattern-readiness
description: "Audit whether a host is structurally exposed to repeated external model calls and whether enough live telemetry exists to convert those paths into Lobster workflows."
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
    description: "Verify the config exists and note whether the gateway log is readable."
    command: |
      set -e
      test -f "${config_path}"
      if [ -f "${log_path}" ]; then
        echo "log_present=true"
      else
        echo "log_present=false"
      fi

  - id: default_model_exposure
    description: "Inspect the default primary model and classify it as local or external."
    command: |
      jq -r '
        (.agents.defaults.model.primary // .agents.defaults.model // "") as $primary
        | if ($primary == "") then
            {
              primary: "",
              provider: "",
              external: false,
              configured_cost_input: 0,
              configured_cost_output: 0
            }
          else
            ($primary | split("/")[0]) as $provider
            | (.models.providers[$provider].models // []) as $models
            | ($primary | split("/")[1]) as $model_id
            | ($models[] | select(.id == $model_id)) as $model
            | {
                primary: $primary,
                provider: $provider,
                external: ($provider | test("minimax|anthropic|openai|openrouter|google|xai|grok"; "i")),
                configured_cost_input: ($model.cost.input // 0),
                configured_cost_output: ($model.cost.output // 0)
              }
          end
      ' "${config_path}"

  - id: local_alternatives
    description: "List zero-cost local provider models available on the host."
    command: |
      jq -r '
        .models.providers
        | to_entries
        | map(
            . as $provider
            | ($provider.value.models // [])
            | map({
                provider: $provider.key,
                id: .id,
                local:
                  (((($provider.value.baseUrl // $provider.value.base_url // $provider.value.host // "") | test("localhost|127\\.0\\.0\\.1"))
                  or ($provider.key | test("ollama|vllm"; "i")))),
                zero_cost: ((.cost.input // 0) == 0 and (.cost.output // 0) == 0)
              })
          )
        | flatten
        | map(select(.local and .zero_cost))
      ' "${config_path}"

  - id: recent_external_signal
    description: "Inspect recent gateway log tail for external-provider keywords if logs exist."
    command: |
      if [ ! -f "${log_path}" ]; then
        echo "telemetry_unavailable: log file missing"
        exit 0
      fi
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
        echo "telemetry_available: no recent external-provider keywords found"
      fi

  - id: readiness_report
    description: "Summarize whether the host is ready for a repeated external-call Lobster conversion."
    command: |
      cat <<EOF
      External Call Pattern Readiness

      Default model exposure:
      $default_model_exposure.stdout

      Local zero-cost alternatives:
      $local_alternatives.stdout

      Recent external signal:
      $recent_external_signal.stdout

      Interpretation:
      - External default model with nonzero configured cost means this host is exposed to external-call spend by default.
      - Local zero-cost alternatives identify where deterministic Lobster workflows may reduce paid orchestration.
      - Missing or weak log signal means telemetry must be improved before claiming repeated-call evidence.
      EOF
