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
# Auto-build template if missing (survives Docker Desktop restarts)
ensure-template:
	@docker image inspect $(TEMPLATE) >/dev/null 2>&1 \
		|| (echo "Template not found, building..." && docker build -t $(TEMPLATE) -f Dockerfile.sandbox .)

sandbox: ensure-template ## Start or resume the Claude sandbox on this repo
	@docker sandbox ls 2>/dev/null | grep -q euporia-sandbox \
		&& docker sandbox run euporia-sandbox \
		|| docker sandbox run --load-local-template -t $(TEMPLATE) --name euporia-sandbox claude $(CURDIR)

sandbox-backend: ensure-template ## Start or resume sandbox on backend worktree
	@docker sandbox ls 2>/dev/null | grep -q backend-agent \
		&& docker sandbox run backend-agent \
		|| docker sandbox run --load-local-template -t $(TEMPLATE) --name backend-agent claude $(CURDIR)/../euporia-backend

sandbox-frontend: ensure-template ## Start or resume sandbox on frontend worktree
	@docker sandbox ls 2>/dev/null | grep -q frontend-agent \
		&& docker sandbox run frontend-agent \
		|| docker sandbox run --load-local-template -t $(TEMPLATE) --name frontend-agent claude $(CURDIR)/../euporia-frontend

sandbox-build: ## Rebuild the sandbox template image
	docker build -t $(TEMPLATE) -f Dockerfile.sandbox .

sandbox-ls: ## List running sandboxes
	docker sandbox ls

sandbox-fix-auth: ## Fix OAuth in a sandbox (usage: make sandbox-fix-auth NAME=euporia-sandbox)
	docker sandbox exec -it $(NAME) bash -c 'sed -i "/"apiKeyHelper"/d" ~/.claude/settings.json && echo "Auth fixed"'

# ── Worktrees ──────────────────────────────────────────
worktree-backend: ## Create backend worktree (or reset if exists)
	@if [ -d ../euporia-backend ]; then \
		echo "Worktree already exists at ../euporia-backend"; \
	else \
		git worktree add -b feature/backend ../euporia-backend 2>/dev/null \
		|| git worktree add ../euporia-backend feature/backend; \
	fi

worktree-frontend: ## Create frontend worktree (or reset if exists)
	@if [ -d ../euporia-frontend ]; then \
		echo "Worktree already exists at ../euporia-frontend"; \
	else \
		git worktree add -b feature/frontend ../euporia-frontend 2>/dev/null \
		|| git worktree add ../euporia-frontend feature/frontend; \
	fi

worktree-clean: ## Remove all worktrees
	-git worktree remove ../euporia-backend
	-git worktree remove ../euporia-frontend

# ── Review ─────────────────────────────────────────────
review: ## Review current branch diff with Codex (usage: make review BRANCH=feature/backend)
	git diff main...$(BRANCH) | codex review --effort xhigh

# ── Sandbox Setup ─────────────────────────────────────
sandbox-setup: ## Install skills + plugins in a sandbox (usage: make sandbox-setup NAME=euporia-sandbox)
	@docker sandbox ls 2>/dev/null | grep -q $(NAME) \
		|| (echo "Error: sandbox '$(NAME)' not found. Create it first." && exit 1)
	docker sandbox exec $(NAME) bash -c 'for d in $$(ls -d /Users/jesse/src/euporia*/sandbox-setup.sh 2>/dev/null); do bash "$$d"; break; done'

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
        ensure-template sandbox sandbox-backend sandbox-frontend sandbox-build sandbox-setup sandbox-ls sandbox-fix-auth \
        worktree-backend worktree-frontend worktree-clean review setup help
