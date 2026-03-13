### Update (Zifnab)
- **Model Identified:** Confirmed `claude-opus-4-6` model alias is available via the Windows Claude CLI.
- **Access Protocol:** Use `ssh olawal@[REDACTED_IP] "claude -p 'your prompt' --model claude-opus-4-6"` for tasks requiring the 'Bypass' level of reasoning.
- **Usage Strategy:** Reserve for complex architecture, deep data synthesis, and cases where standard reasoning fails. Usage is logged at `/data/openclaw/logs/opus-usage.log` to track budget.
- **Next Steps:** Integrate this as a fallback in Lobster workflows for high-complexity tasks.