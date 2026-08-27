# 知问

[English](./README.en.md) | 简体中文

面向 Markdown 知识库的 RAG 助手：加载文档、分块、向量索引，再经召回、重排后生成答案。

## 特性

- **多种分块策略** — 固定长度、递归标题切分、语义切分（Kamradt 百分位阈值）、大模型 Agent 分块
- **向量检索** — PostgreSQL + [pgvector](https://github.com/pgvector/pgvector)（`halfvec`），按余弦相似度粗召回
- **Cross-Encoder 重排** — 本地 ONNX 模型 `Xenova/ms-marco-TinyBERT-L-2-v2` 对 query–chunk 成对打分后精排
- **LangChain Agent** — 工具查询知识库文档、按文档召回上下文，再用 DeepSeek 生成答案
- **双模型后端** — Embedding / 对话可走本地千问（Ollama 兼容接口），生成可走 DeepSeek

## 工作流程

```
提问前：Markdown → 分块 → Embedding → PostgreSQL / pgvector
提问后：用户问题 → Embedding → 向量召回（topK=20）→ TinyBERT 重排（取前 10）→ 大模型生成
```

召回和重排不是同一套算法，不要用 Embedding + 余弦去「再排一次」：

| 阶段 | 模型 | 算法 | 输入 | 输出 |
| ---- | ---- | ---- | ---- | ---- |
| 召回 | `qwen3-embedding:4b`（Bi-Encoder） | pgvector 余弦相似度 | query、chunk **各自** embed | 向量，比距离 |
| 重排 | `Xenova/ms-marco-TinyBERT-L-2-v2`（Cross-Encoder） | 序列分类 logits | `[CLS] query [SEP] chunk [SEP]` **成对**输入 | 相关性分数 |

`bge-reranker-v2-m3` 一类模型同样是 Cross-Encoder，不能走 `/embeddings` 再算余弦。当前实现用的是本地 TinyBERT；`.env` 里的 `QWEN_RE_RANKER_MODEL` 尚未接入。

Agent 当前提供两个工具：

| 工具              | 作用                                       |
| ----------------- | ------------------------------------------ |
| `documents`       | 列出当前用户的知识库文档                   |
| `retrieveContext` | 按文档 ID + 问题召回片段，重排后返回上下文 |

## 环境要求

| 工具       | 版本 / 说明                          |
| ---------- | ------------------------------------ |
| Node.js    | >= 22.13.0                           |
| pnpm       | >= 11.23.0                           |
| PostgreSQL | 已安装 [pgvector](https://github.com/pgvector/pgvector) |
| Ollama     | 用于千问 Embedding（可选，按 `.env` 配置） |

## 快速开始

```bash
git clone https://github.com/XiaoMing0000/kbs-rag.git
cd kbs-rag
pnpm install
cp .env.example .env
```

编辑 `.env`，至少填写 `DATABASE_URL`、DeepSeek 与千问相关配置。

初始化数据库（需超级用户在库中执行过 `CREATE EXTENSION IF NOT EXISTS vector;`）：

```bash
pnpm db:generate
pnpm db:init
```

下载重排模型到本地（国内建议走镜像）：

```bash
# 目录需与 transformers.js 的模型 ID 对应
# models/Xenova/ms-marco-TinyBERT-L-2-v2/{config.json,tokenizer.json,onnx/model_quantized.onnx,...}

export HF_ENDPOINT=https://hf-mirror.com
huggingface-cli download Xenova/ms-marco-TinyBERT-L-2-v2 \
  --local-dir ./models/Xenova/ms-marco-TinyBERT-L-2-v2
```

启动：

```bash
pnpm dev
```

入口为 `src/entry/index.ts`，当前会调用 `testAgent` 走一遍知识库问答。

## 环境变量

复制 `.env.example` 为 `.env` 后按需填写。

| 变量 | 说明 |
| ---- | ---- |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` | DeepSeek API |
| `DEEPSEEK_MODEL` / `DEEPSEEK_FLASH_MODEL` | 对话模型；Agent 默认使用 Flash |
| `QWEN_BASE_URL` / `QWEN_API_KEY` | 千问 OpenAI 兼容接口（如 Ollama `http://localhost:11434/v1`） |
| `QWEN_MODEL` | 千问对话模型 |
| `QWEN_EMBEDDINGS_MODEL` | Embedding 模型，默认 `qwen3-embedding:4b`，用于索引与召回 |
| `QWEN_RE_RANKER_MODEL` | 预留，当前未使用；重排走本地 TinyBERT，不是该变量 |
| `DATABASE_URL` | PostgreSQL 连接串 |
| `LANGSMITH_*` | LangSmith 追踪（可选） |

构建产物会把 `dotenv` 标为 external，运行时从 `node_modules` 加载。

## 常用命令

| 命令 | 说明 |
| ---- | ---- |
| `pnpm dev` | 开发模式，nodemon 监听 `src/` 并自动重启 |
| `pnpm dev:unwatch` | 单次用 tsx 运行入口，不监听 |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:init` | 执行 Prisma migrate |
| `pnpm build` | esbuild 打包到 `dist/` |
| `pnpm start` | 运行打包产物 |
| `pnpm lint` / `pnpm lint:check` | oxlint；check 时额外做 `tsc --noEmit` |
| `pnpm fmt` / `pnpm fmt:check` | oxfmt 格式化 / 检查 |

本地可视化数据库：

```bash
npx prisma studio --config ./prisma.config.ts
```

## 项目结构

```
kbs-rag/
├── src/
│   ├── entry/index.ts              # 应用入口
│   ├── agents/rag.agent.ts         # LangChain RAG Agent
│   ├── tools/rag.tool.ts           # 文档查询 / 召回 + 重排
│   ├── service/document.service.ts # 文档写入与召回
│   ├── repository/                 # Prisma + pgvector 检索
│   ├── prisma/schema.prisma        # Document / DocumentChunk
│   ├── utils/
│   │   ├── models.ts               # DeepSeek / 千问 / Embedding
│   │   ├── utils.ts                # SHA-256、余弦相似度
│   │   ├── load-md.ts              # 加载 Markdown
│   │   └── split/                  # 固定、递归、语义、Agent 分块
│   └── config/config.ts            # 环境变量
├── models/                         # 本地 ONNX 重排模型（git 忽略）
├── examples/split-content.ts       # 分块示例
├── config/esbuild.config.mts
└── prisma.config.ts
```

## 数据模型

- `documents`：按 `userId + title` 唯一，记录来源哈希、分块元数据、文件信息
- `document_chunks`：分块文本 + `halfvec` 向量，供相似度检索

内容未变化时（`sourceHash` 相同）会跳过重复写入。

## 开发与构建

`pnpm dev` 通过 nodemon 监听 `src/` 与 `.env`，用 tsx 直接运行，无需先编译。

```bash
pnpm build
pnpm start
```

`pnpm build` 将入口打包为 `dist/index.js`。

## 代码质量

| 钩子 | 行为 |
| ---- | ---- |
| `pre-commit` | lint-staged：oxfmt + oxlint --fix |
| `commit-msg` | 检查 changelog |
| `pre-push` | `fmt:check` + `lint:check` |

钩子在 `pnpm install` 后由 `simple-git-hooks` 安装。若未生效：

```bash
pnpm exec simple-git-hooks
```

## 技术栈

| 类别 | 依赖 |
| ---- | ---- |
| 运行时 | Node.js >= 22.13 |
| 语言 | TypeScript 6 |
| Agent / LLM | LangChain、DeepSeek、千问（OpenAI 兼容） |
| 向量与重排 | pgvector、`@huggingface/transformers` |
| ORM | Prisma 7 |
| 打包 | esbuild |
| 检查 / 格式 | oxlint、oxfmt |

## 许可证

[MIT](./LICENSE)

## 作者

[xiaoming0000](https://github.com/XiaoMing0000)
