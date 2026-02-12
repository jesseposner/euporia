# euporia

AI-powered shopping concierge for Bitcoin. Built at [Presidio Bitcoin Builders Day](https://www.presidiobitcoin.com/).

Instead of browsing product pages, you talk to an AI personal shopper. It searches across merchants, learns your taste, manages your cart, and checks out over Bitcoin. Think conversational commerce meets the Lightning Network.

## Features

- **Chat concierge** -- ask for what you want in natural language and the AI searches, compares, and adds to cart across multiple stores
- **Taste profiles** -- the AI learns your preferences over time and improves recommendations
- **Multi-merchant** -- shop Bitcoin Magazine, Blockstream, Ridge Wallet, Death Wish Coffee, and more from one conversation
- **Product analysis** -- AI-generated scoring and insights on any product
- **Wishlist and cart** -- persistent per-session, with direct checkout links
- **Discover hub** -- trending products and a search gateway for when you just want to browse
- **Bitcoin wallet** -- BDK Wallet on Signet, ready for native Bitcoin checkout

## Stack

| Layer | Tech |
|-------|------|
| Backend | Rust 2024, Axum 0.8, BDK Wallet 1, sqlx (SQLite) |
| Frontend | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui |
| AI | Claude Sonnet 4 via Vercel AI SDK, streaming tool-use |
| Data | SQLite -- taste profiles, conversations, AI insights cache, wishlists |
| Network | Bitcoin Signet |

## Quick start

```sh
# Install dependencies
make setup

# Copy and fill in your keys
cp .env.example .env

# Start backend (port 3010) and frontend (port 3011) in separate terminals
make dev-backend
make dev-frontend
```

The frontend needs an `ANTHROPIC_API_KEY` in `frontend/.env.local` for the chat concierge.

## Commands

Run `make` to see all targets.

| Command | Description |
|---------|-------------|
| `make build` | Build backend + frontend |
| `make dev-backend` | Axum on localhost:3010 |
| `make dev-frontend` | Next.js on localhost:3011 |
| `make test` | Run all tests (Rust + JS) |
| `make lint` | Clippy + Next.js lint |
| `make check` | Lint + test (pre-merge gate) |

## Project structure

```
backend/      Rust API -- Axum routes, BDK wallet, SQLite via sqlx
frontend/     Next.js app -- chat UI, product pages, cart, wishlist
video/        Remotion marketing video (React-rendered)
.references/  Read-only cloned repos (BDK, rust-bitcoin, axum, shadcn/ui)
```

## Environment

```sh
# backend/.env
DATABASE_URL=sqlite:euporia.db
# BDK_DESCRIPTOR=wpkh(...)         # optional: signet wallet
# BDK_CHANGE_DESCRIPTOR=wpkh(...)

# frontend/.env.local
ANTHROPIC_API_KEY=sk-ant-...
# LLM_PROVIDER=local               # optional: use local llama-server
# LLM_LOCAL_URL=http://localhost:8080/v1
```

## Testing

Property-based tests are required for all Bitcoin and financial logic.

- **Rust**: `proptest` -- run with `cargo test` in `backend/`
- **TypeScript**: `fast-check` -- run with `npm test` in `frontend/`

## AI agent development

The repo supports parallel AI agent development via Docker sandboxes on git clones:

```sh
make clone-backend       # Clone repo for backend agent
make clone-frontend      # Clone repo for frontend agent
make sandbox-backend     # Start Docker sandbox on backend clone
make sandbox-frontend    # Start Docker sandbox on frontend clone
```

Project conventions live in `.claude/CLAUDE.md` and are loaded automatically by Claude Code.
