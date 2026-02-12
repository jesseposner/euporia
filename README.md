# euporia

Bitcoin application built at Presidio Bitcoin Builders Day. Rust backend (Axum + BDK) + Next.js 16 frontend (Tailwind + shadcn/ui).

## Setup

```sh
make setup
```

## Development

Start backend and frontend in separate tmux panes:

```sh
# Pane 1
make dev-backend    # Axum on localhost:3010

# Pane 2
make dev-frontend   # Next.js on localhost:3011
```

## Commands

Run `make` to see all available targets. Key ones:

| Command | What it does |
|---------|-------------|
| `make build` | Build backend + frontend |
| `make test` | Run all tests (Rust + JS) |
| `make lint` | Clippy + Next.js lint |
| `make check` | Lint + test (pre-merge gate) |
| `make sandbox` | Start a Docker sandbox for AI agent dev |

## Architecture

```
backend/     Rust — Axum 0.8, BDK Wallet, sqlx (SQLite), proptest
frontend/    TypeScript — Next.js 16, Tailwind, shadcn/ui, fast-check
.references/ Read-only cloned repos for AI agent context
.claude/     Project conventions (CLAUDE.md) + agent config
```

## AI Agent Workflow

Parallel development using Docker Sandboxes on git worktrees:

```sh
make worktree-backend    # Create backend worktree
make worktree-frontend   # Create frontend worktree
make sandbox-backend     # Start sandbox on backend worktree
make sandbox-frontend    # Start sandbox on frontend worktree
# ... agents work ...
make review BRANCH=feature/backend   # Codex review
git merge --no-ff feature/backend    # Merge back
make worktree-clean                  # Cleanup
```

## Testing

Property-based tests required for all Bitcoin/financial logic:

- **Rust**: `proptest` — `cargo test` in backend/
- **TypeScript**: `fast-check` — `npm test` in frontend/
