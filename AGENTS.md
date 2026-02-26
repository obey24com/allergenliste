# AGENTS.md

## Cursor Cloud specific instructions

### Overview
GastroHelper (knfood.de) — a German-language Next.js 13.5 web app for restaurant allergen/additive management (EU LMIV compliance). Single-page app with all data stored client-side in localStorage. No database or external services required.

### Running the app
- `npm run dev` starts the dev server on port 3000.
- `npm run build` produces a production build.
- `npm run lint` runs ESLint via `next lint`.

### Non-obvious notes
- The `OPENAI_API_KEY` environment variable is **optional**. Without it, the two AI-powered API routes (`/api/parse-menu` and `/api/suggest-allergens`) return 500 errors, but all core product/allergen management features work normally.
- The project uses `@next/swc-wasm-nodejs` instead of native SWC binaries, so `npm install` works on any architecture without needing platform-specific binary downloads.
- There are no automated test suites in this project (no `test` script in `package.json`). Lint (`npm run lint`) and build (`npm run build`) are the primary CI checks.
- All UI text is in German.
