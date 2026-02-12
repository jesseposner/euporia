#!/bin/bash
# One-time sandbox setup — run on first boot of a new sandbox
# Usage: docker sandbox exec <name> bash <workspace>/sandbox-setup.sh
# Idempotent: skips if already completed. Delete marker to re-run.

MARKER="$HOME/.claude/.sandbox-setup-done"
if [ -f "$MARKER" ]; then
    echo "Sandbox already set up. Delete $MARKER to re-run."
    exit 0
fi

echo "==> Installing skills..."
npx skills add trailofbits/skills -s property-based-testing -g -y || true
npx skills add trailofbits/skills -s ask-questions-if-underspecified -g -y || true
npx skills add trailofbits/skills -s modern-python -g -y || true
npx skills add sickn33/antigravity-awesome-skills -s docker-expert -g -y || true
npx skills add wshobson/agents -s rust-async-patterns -g -y || true
npx skills add wshobson/agents -s langchain-architecture -g -y || true
npx skills add nextlevelbuilder/ui-ux-pro-max-skill -g -y || true
npx skills add vercel/streamdown -g -y || true
npx skills add vercel/ai-elements -g -y || true
npx skills add vercel/ai -g -y || true
npx skills add vercel-labs/agent-browser -g -y || true
npx skills add vercel-labs/agent-skills -s vercel-react-best-practices -g -y || true
npx skills add vercel-labs/agent-skills -s web-design-guidelines -g -y || true
npx skills add figma/mcp-server-guide -s implement-design -g -y || true
npx skills add remotion-dev/skills -s remotion-best-practices -g -y || true

echo "==> Installing plugins..."
claude plugin marketplace add anthropics/claude-plugins-official || true
claude plugin marketplace add https://github.com/EveryInc/compound-engineering-plugin.git || true
claude plugin marketplace add https://github.com/trailofbits/skills.git || true
claude plugin install compound-engineering@every-marketplace || true
claude plugin install property-based-testing@trailofbits || true
claude plugin install figma@claude-plugins-official || true
claude plugin install superpowers@claude-plugins-official || true
claude plugin install feature-dev@claude-plugins-official || true
claude plugin install code-simplifier@claude-plugins-official || true
claude plugin install rust-analyzer-lsp@claude-plugins-official || true
claude plugin install frontend-design@claude-plugins-official || true

touch "$MARKER"
echo "==> Setup complete. Restart Claude for plugins to take effect."
