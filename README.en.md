# Zhiwen

English | [简体中文](./README.md)

A RAG assistant for Markdown knowledge bases: load documents, chunk them, index embeddings, then retrieve, rerank, and generate answers.

## Features

- **Multiple chunking strategies** — fixed size, recursive heading splits, semantic splits (Kamradt percentile breakpoints), and LLM agentic splits
- **Vector search** — PostgreSQL + [pgvector](https://github.com/pgvector/pgvector) (`halfvec`) for coarse cosine retrieval
- **Cross-encoder rerank** — local ONNX model `Xenova/ms-marco-TinyBERT-L-2-v2` scores query–chunk pairs
- **LangChain agent** — tools to list knowledge-base documents and retrieve context, then DeepSeek generates the answer
- **Two model backends** — embeddings / chat can use local Qwen (Ollama-compatible API); generation can use DeepSeek

## Pipeline

```
Before a question: Markdown → chunk → embed → PostgreSQL / pgvector
After a question:  query → embed → retrieve (topK=20) → TinyBERT rerank (top 10) → LLM
```

Retrieval and reranking are different algorithms. Do not rerank by embedding again and comparing cosine similarity:

| Stage | Model | Algorithm | Input | Output |
| ----- | ----- | --------- | ----- | ------ |
| Retrieve | `qwen3-embedding:4b` (bi-encoder) | pgvector cosine similarity | query and chunk embedded **separately** | vectors, then distance |
| Rerank | `Xenova/ms-marco-TinyBERT-L-2-v2` (cross-encoder) | sequence-classification logits | `[CLS] query [SEP] chunk [SEP]` as a **pair** | relevance score |

Models like `bge-reranker-v2-m3` are also cross-encoders and must not go through `/embeddings` plus cosine. This project uses local TinyBERT; `QWEN_RE_RANKER_MODEL` in `.env` is not wired up yet.

The agent currently exposes two tools:

| Tool              | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| `documents`       | List knowledge-base documents for the current user           |
| `retrieveContext` | Retrieve chunks by document ID + query, then return reranked context |

## Requirements

| Tool         | Version / notes                                              |
| ------------ | ------------------------------------------------------------ |
| Node.js      | >= 22.13.0                                                   |
| pnpm         | >= 11.23.0                                                   |
| PostgreSQL   | with [pgvector](https://github.com/pgvector/pgvector)        |
| Ollama       | for Qwen embeddings (optional, depending on `.env`)          |

## Quick start

```bash
git clone https://github.com/XiaoMing0000/kbs-rag.git
cd kbs-rag
pnpm install
cp .env.example .env
```

Fill in at least `DATABASE_URL`, DeepSeek, and Qwen settings.

Initialize the database (a superuser must have run `CREATE EXTENSION IF NOT EXISTS vector;`):

```bash
pnpm db:generate
pnpm db:init
```

Download the reranker locally (use a mirror if Hugging Face is slow):

```bash
# Path must match the transformers.js model id
# models/Xenova/ms-marco-TinyBERT-L-2-v2/{config.json,tokenizer.json,onnx/model_quantized.onnx,...}

export HF_ENDPOINT=https://hf-mirror.com
huggingface-cli download Xenova/ms-marco-TinyBERT-L-2-v2 \
  --local-dir ./models/Xenova/ms-marco-TinyBERT-L-2-v2
```

Start:

```bash
pnpm dev
```

The entrypoint is `src/entry/index.ts`. It currently runs `testAgent` for an end-to-end Q&A pass.

## Environment variables

Copy `.env.example` to `.env` and fill in values as needed.

| Variable | Description |
| -------- | ----------- |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` | DeepSeek API |
| `DEEPSEEK_MODEL` / `DEEPSEEK_FLASH_MODEL` | Chat models; the agent uses Flash by default |
| `QWEN_BASE_URL` / `QWEN_API_KEY` | Qwen OpenAI-compatible API (e.g. Ollama `http://localhost:11434/v1`) |
| `QWEN_MODEL` | Qwen chat model |
| `QWEN_EMBEDDINGS_MODEL` | Embedding model, default `qwen3-embedding:4b`; used for indexing and retrieval |
| `QWEN_RE_RANKER_MODEL` | Reserved and unused; rerank uses local TinyBERT, not this variable |
| `DATABASE_URL` | PostgreSQL connection string |
| `LANGSMITH_*` | LangSmith tracing (optional) |

`dotenv` is marked external at build time and must be loaded from `node_modules` at runtime.

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm dev` | Dev mode; nodemon watches `src/` and restarts |
| `pnpm dev:unwatch` | Run the entry once with tsx |
| `pnpm db:generate` | Generate Prisma Client |
| `pnpm db:init` | Run Prisma migrate |
| `pnpm build` | Bundle with esbuild into `dist/` |
| `pnpm start` | Run the built output |
| `pnpm lint` / `pnpm lint:check` | oxlint; check also runs `tsc --noEmit` |
| `pnpm fmt` / `pnpm fmt:check` | Format / check with oxfmt |

Inspect the database:

```bash
npx prisma studio --config ./prisma.config.ts
```

## Project structure

```
kbs-rag/
├── src/
│   ├── entry/index.ts              # App entry
│   ├── agents/rag.agent.ts         # LangChain RAG agent
│   ├── tools/rag.tool.ts           # Document listing / retrieve + rerank
│   ├── service/document.service.ts # Document upsert and retrieve
│   ├── repository/                 # Prisma + pgvector search
│   ├── prisma/schema.prisma        # Document / DocumentChunk
│   ├── utils/
│   │   ├── models.ts               # DeepSeek / Qwen / embeddings
│   │   ├── utils.ts                # SHA-256 and cosine similarity
│   │   ├── load-md.ts              # Load Markdown files
│   │   └── split/                  # Fixed, recursive, semantic, agentic chunking
│   └── config/config.ts            # Env config
├── models/                         # Local ONNX reranker (gitignored)
├── examples/split-content.ts       # Chunking examples
├── config/esbuild.config.mts
└── prisma.config.ts
```

## Data model

- `documents`: unique on `userId + title`; stores source hash, chunk metadata, and file info
- `document_chunks`: chunk text + `halfvec` embedding for similarity search

Unchanged content (`sourceHash` match) skips a rewrite.

## Development & build

`pnpm dev` watches `src/` and `.env` with nodemon and runs via tsx—no manual compile step.

```bash
pnpm build
pnpm start
```

`pnpm build` bundles the entry into `dist/index.js`.

## Code quality

| Hook | Action |
| ---- | ------ |
| `pre-commit` | lint-staged: oxfmt + oxlint --fix |
| `commit-msg` | Changelog check |
| `pre-push` | `fmt:check` + `lint:check` |

Hooks are installed by `simple-git-hooks` after `pnpm install`. If they are missing:

```bash
pnpm exec simple-git-hooks
```

## Tech stack

| Category | Dependencies |
| -------- | ------------ |
| Runtime | Node.js >= 22.13 |
| Language | TypeScript 6 |
| Agent / LLM | LangChain, DeepSeek, Qwen (OpenAI-compatible) |
| Vectors & rerank | pgvector, `@huggingface/transformers` |
| ORM | Prisma 7 |
| Bundler | esbuild |
| Lint / format | oxlint, oxfmt |

## License

[MIT](./LICENSE)

## Author

[xiaoming0000](https://github.com/XiaoMing0000)
