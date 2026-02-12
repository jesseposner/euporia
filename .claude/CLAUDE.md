# euporia

Bitcoin hackathon prototype — Presidio Bitcoin Builders Day.

## Stack

- Backend: Rust 2024 edition, Axum 0.8, BDK Wallet 1, sqlx 0.8 (SQLite)
- Frontend: Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, App Router
- Database: SQLite via sqlx (compile-time checked queries). DB at `backend/euporia.db`
- Network: Bitcoin Signet
- Secrets: `.env` file via `dotenvy` (gitignored). Never hardcode keys.

## Commands

- `make build` — build backend + frontend
- `make dev-backend` — Axum on localhost:3010
- `make dev-frontend` — Next.js on localhost:3011
- `make test` — run all tests
- `make lint` — clippy + next lint
- `make check` — lint + test (pre-merge gate)

## Rust Conventions

- Cargo workspace: deps and lints defined in root `Cargo.toml`, inherited in members
- Inline variables in format strings: `format!("{name}")` not `format!("{}", name)`
- `anyhow::Result` for error handling in application code
- Property-based tests with `proptest` for all Bitcoin/financial logic
- Use `sqlx::query!` macros for compile-time checked SQL
- Wrap shared state (e.g., BDK Wallet) in `Arc<Mutex<T>>` for Axum handlers

## TypeScript Conventions

- App Router only (not Pages Router)
- shadcn/ui components — use `npx shadcn@latest add <component>`
- `Promise.all()` for independent async operations
- Direct imports only — no barrel files or index.ts re-exports
- `next/dynamic` for heavy components

## Testing

Property tests required for: BTC amount calculations, address validation,
transaction building, fee estimation, any serialization/deserialization.

- Backend: `cargo test` (unit + property with proptest)
- Frontend: `npm test` (fast-check for financial logic)

## API Contract

- REST + JSON between frontend (localhost:3011) and backend (localhost:3010)
- CORS enabled on backend for localhost:3011
- Error format: `{ "error": "message", "code": "ERROR_CODE" }`

## Sandbox

If running in a Docker Sandbox, run `cd frontend && npm install` before building
the frontend. Native bindings (SWC, lightningcss) are platform-specific and the
mounted `node_modules` may contain host (macOS) binaries.

## References

`.references/` contains read-only cloned repos (BDK, rust-bitcoin, axum, shadcn/ui, etc.).
Use for examples and API patterns. Never modify them.

## Do Not

- Include Claude references in commit messages
- Hardcode BDK wallet keys or Bitcoin addresses
- Use emojis as UI icons (use Lucide SVG icons)
- Skip property tests for Bitcoin/financial logic
