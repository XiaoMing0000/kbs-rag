# Zhiwen

English | [简体中文](./README.md)

A RAG assistant for Markdown knowledge bases: load documents, chunk semantically, retrieve, then generate answers.

## Features

- **TypeScript 6** — Strict mode, targeting the Node.js runtime
- **esbuild** — Fast bundling, outputs CommonJS artifacts to `dist/`
- **nodemon + ts-node** — Auto-restart during development
- **ESLint + typescript-eslint** — Code quality checks
- **Prettier** — Consistent code formatting
- **simple-git-hooks** — Lint on commit, format on push
- **dotenv** — Environment variable support

## Requirements

| Tool    | Version    |
| ------- | ---------- |
| Node.js | >= 22.13.0 |
| pnpm    | >= 9.15.0  |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/XiaoMing0000/kbs-rag.git
cd kbs-rag

# Install dependencies
pnpm install

# Set up environment variables (optional)
cp .env.example .env

# Start development server
pnpm dev
```

## Scripts

| Command       | Description                                  |
| ------------- | -------------------------------------------- |
| `pnpm dev`    | Dev mode with file watching and auto-restart |
| `pnpm build`  | Bundle with esbuild into `dist/`             |
| `pnpm start`  | Run the built output                         |
| `pnpm lint`   | Run ESLint and TypeScript type checking      |
| `pnpm format` | Format code with Prettier                    |

## Project Structure

```
kbs-rag/
├── config/
│   └── esbuild.config.mts   # esbuild build config (ESM)
├── src/
│   └── index.ts             # Application entry
├── dist/                      # Build output
├── eslint.config.ts           # ESLint config
├── nodemon.json               # nodemon config
├── tsconfig.json              # TypeScript config
├── .env.example               # Environment variable template
└── package.json
```

## Environment Variables

Copy `.env.example` to `.env` and fill in values as needed. `dotenv` is marked as external during the build and must be loaded at runtime from `node_modules`.

```bash
cp .env.example .env
```

Usage in code:

```ts
import 'dotenv/config';

console.log(process.env.MY_VAR);
```

## Development & Build

### Development

`pnpm dev` uses nodemon to watch TypeScript files under `src/` and runs them directly via ts-node—no manual compilation required.

### Build

`pnpm build` runs `config/esbuild.config.mts`, bundling `src/index.ts` into `dist/index.js` (CommonJS, minified).

Production startup:

```bash
pnpm build
pnpm start
```

## Code Quality

### Lint

`pnpm lint` runs:

1. **ESLint** — Syntax and style checks (`typescript-eslint` recommended rules)
2. **tsc --noEmit** — TypeScript type checking (undefined variables, type errors, etc.)

> ESLint `recommended` does not include type-aware rules. Undefined identifiers are caught by `tsc`.

### Formatting

`pnpm format` formats project files with Prettier.

### Git Hooks

Configured via `simple-git-hooks`:

| Hook         | Action                |
| ------------ | --------------------- |
| `pre-commit` | Runs `npm run lint`   |
| `pre-push`   | Runs `npm run format` |

Hooks are installed automatically after `pnpm install`. If they are missing, run:

```bash
npx simple-git-hooks
```

## Tech Stack

| Category   | Dependencies              |
| ---------- | ------------------------- |
| Runtime    | Node.js                   |
| Language   | TypeScript 6              |
| Bundler    | esbuild                   |
| Dev        | nodemon, ts-node, tsx     |
| Linting    | ESLint, typescript-eslint |
| Formatting | Prettier                  |
| Env vars   | dotenv                    |

## License

[MIT](./LICENSE)

## Author

[xiaoming0000](https://github.com/XiaoMing0000)
