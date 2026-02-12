# Development commands for euporia
# Run `make` to see available targets

.DEFAULT_GOAL := help

# ── Build ──────────────────────────────────────────────
build: build-backend build-frontend ## Build everything

build-backend: ## Build Rust backend
	cd backend && cargo build

build-frontend: ## Build Next.js frontend
	cd frontend && npm run build

# ── Dev ────────────────────────────────────────────────
dev: ## Start backend + frontend (two processes)
	@echo "Run in separate tmux panes:"
	@echo "  make dev-backend"
	@echo "  make dev-frontend"

dev-backend: ## Start Axum server (port 3010)
	cd backend && cargo run

dev-frontend: ## Start Next.js dev server with Turbopack (port 3011)
	cd frontend && npm run dev

# ── Test ───────────────────────────────────────────────
test: test-backend test-frontend ## Run all tests

test-backend: ## Run Rust tests (unit + property)
	cd backend && cargo test

test-frontend: ## Run frontend tests
	cd frontend && npm test

# ── Lint ───────────────────────────────────────────────
lint: lint-backend lint-frontend ## Lint everything

lint-backend: ## Run clippy
	cd backend && cargo clippy -- -D warnings

lint-frontend: ## Run Next.js lint
	cd frontend && npm run lint

# ── Check ──────────────────────────────────────────────
check: lint test ## Lint + test (pre-merge gate)

TEMPLATE := euporia-sandbox-template:v1

# ── Docker Sandbox ─────────────────────────────────────
sandbox: ## Start or resume the Claude sandbox on this repo
	@docker sandbox ls 2>/dev/null | grep -q euporia-sandbox \
		&& docker sandbox run euporia-sandbox \
		|| docker sandbox run --load-local-template -t $(TEMPLATE) --name euporia-sandbox claude $(CURDIR)

sandbox-backend: ## Start or resume sandbox on backend worktree
	@docker sandbox ls 2>/dev/null | grep -q backend-agent \
		&& docker sandbox run backend-agent \
		|| docker sandbox run --load-local-template -t $(TEMPLATE) --name backend-agent claude $(CURDIR)/../euporia-backend

sandbox-frontend: ## Start or resume sandbox on frontend worktree
	@docker sandbox ls 2>/dev/null | grep -q frontend-agent \
		&& docker sandbox run frontend-agent \
		|| docker sandbox run --load-local-template -t $(TEMPLATE) --name frontend-agent claude $(CURDIR)/../euporia-frontend

sandbox-build: ## Build the sandbox template image
	docker build -t $(TEMPLATE) -f Dockerfile.sandbox .

sandbox-ls: ## List running sandboxes
	docker sandbox ls

sandbox-fix-auth: ## Fix OAuth in a sandbox (usage: make sandbox-fix-auth NAME=euporia-sandbox)
	docker sandbox exec -it $(NAME) bash -c 'sed -i "/"apiKeyHelper"/d" ~/.claude/settings.json && echo "Auth fixed"'

# ── Worktrees ──────────────────────────────────────────
worktree-backend: ## Create backend worktree
	git worktree add -b feature/backend ../euporia-backend

worktree-frontend: ## Create frontend worktree
	git worktree add -b feature/frontend ../euporia-frontend

worktree-clean: ## Remove all worktrees
	-git worktree remove ../euporia-backend
	-git worktree remove ../euporia-frontend

# ── Review ─────────────────────────────────────────────
review: ## Review current branch diff with Codex (usage: make review BRANCH=feature/backend)
	git diff main...$(BRANCH) | codex review --effort xhigh

# ── Plugins ────────────────────────────────────────────
plugins: ## Install all Claude plugins in a sandbox (usage: make plugins NAME=euporia-sandbox)
	-docker sandbox exec $(NAME) claude plugin marketplace add anthropics/claude-plugins-official
	-docker sandbox exec $(NAME) claude plugin marketplace add https://github.com/EveryInc/compound-engineering-plugin.git
	-docker sandbox exec $(NAME) claude plugin marketplace add https://github.com/trailofbits/skills.git
	-docker sandbox exec $(NAME) claude plugin install compound-engineering@every-marketplace
	-docker sandbox exec $(NAME) claude plugin install property-based-testing@trailofbits
	-docker sandbox exec $(NAME) claude plugin install figma@claude-plugins-official
	-docker sandbox exec $(NAME) claude plugin install superpowers@claude-plugins-official
	-docker sandbox exec $(NAME) claude plugin install feature-dev@claude-plugins-official
	-docker sandbox exec $(NAME) claude plugin install code-simplifier@claude-plugins-official
	-docker sandbox exec $(NAME) claude plugin install rust-analyzer-lsp@claude-plugins-official
	-docker sandbox exec $(NAME) claude plugin install frontend-design@claude-plugins-official
	@echo "Plugins installed. Restart Claude in the sandbox for changes to take effect."

# ── Skills ─────────────────────────────────────────────
SKILLS_CMDS = \
	npx skills add trailofbits/skills -s property-based-testing -g -y && \
	npx skills add trailofbits/skills -s ask-questions-if-underspecified -g -y && \
	npx skills add trailofbits/skills -s modern-python -g -y && \
	npx skills add sickn33/antigravity-awesome-skills -s docker-expert -g -y && \
	npx skills add wshobson/agents -s rust-async-patterns -g -y && \
	npx skills add wshobson/agents -s langchain-architecture -g -y && \
	npx skills add nextlevelbuilder/ui-ux-pro-max-skill -g -y && \
	npx skills add vercel/streamdown -g -y && \
	npx skills add vercel/ai-elements -g -y && \
	npx skills add vercel/ai -g -y && \
	npx skills add vercel-labs/agent-browser -g -y && \
	npx skills add vercel-labs/agent-skills -s vercel-react-best-practices -g -y && \
	npx skills add vercel-labs/agent-skills -s web-design-guidelines -g -y && \
	npx skills add figma/mcp-server-guide -s implement-design -g -y && \
	npx skills add remotion-dev/skills -s remotion-best-practices -g -y

skills: ## Install skills locally
	$(SKILLS_CMDS)
	@echo "Skills installed. Run 'npx skills ls -g' to verify."

skills-sandbox: ## Install skills in a sandbox (usage: make skills-sandbox NAME=euporia-sandbox)
	docker sandbox exec $(NAME) bash -c '$(SKILLS_CMDS)'
	@echo "Skills installed in $(NAME)."

# ── Setup ──────────────────────────────────────────────
setup: ## First-time setup (install deps, build, verify)
	cd backend && cargo build
	cd frontend && npm install
	@echo "Setup complete. Run 'make dev-backend' and 'make dev-frontend' in separate panes."

# ── Help ───────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: build build-backend build-frontend dev dev-backend dev-frontend \
        test test-backend test-frontend lint lint-backend lint-frontend check \
        sandbox sandbox-backend sandbox-frontend sandbox-build sandbox-ls sandbox-fix-auth \
        worktree-backend worktree-frontend worktree-clean review plugins skills skills-sandbox setup help
