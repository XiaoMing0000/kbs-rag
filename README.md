# 知问

[English](./README.en.md) | 简体中文

面向 Markdown 知识库的 RAG 助手：加载文档、语义分块、向量检索，再生成答案。

## 特性

- **TypeScript 6** — 严格模式，面向 Node.js 运行时
- **esbuild** — 快速打包，输出 CommonJS 产物至 `dist/`
- **nodemon + ts-node** — 开发时自动重启
- **ESLint + typescript-eslint** — 代码规范检查
- **Prettier** — 统一代码格式
- **simple-git-hooks** — 提交前自动 lint，推送前自动格式化
- **dotenv** — 环境变量支持

## 环境要求

| 工具    | 版本       |
| ------- | ---------- |
| Node.js | >= 22.13.0 |
| pnpm    | >= 9.15.0  |

## 快速开始

```bash
# 克隆项目
git clone https://github.com/XiaoMing0000/kbs-rag.git
cd kbs-rag

# 安装依赖
pnpm install

# 配置环境变量（可选）
cp .env.example .env

# 启动开发服务
pnpm dev
```

## 常用命令

| 命令          | 说明                               |
| ------------- | ---------------------------------- |
| `pnpm dev`    | 开发模式，监听文件变更并自动重启   |
| `pnpm build`  | 使用 esbuild 打包至 `dist/`        |
| `pnpm start`  | 运行打包后的产物                   |
| `pnpm lint`   | 执行 ESLint 与 TypeScript 类型检查 |
| `pnpm format` | 使用 Prettier 格式化代码           |

## 项目结构

```
kbs-rag/
├── config/
│   └── esbuild.config.mts   # esbuild 构建配置（ESM）
├── src/
│   └── index.ts             # 应用入口
├── dist/                      # 构建输出目录
├── eslint.config.ts           # ESLint 配置
├── nodemon.json               # nodemon 配置
├── tsconfig.json              # TypeScript 配置
├── .env.example               # 环境变量示例
└── package.json
```

## 环境变量

复制 `.env.example` 为 `.env`，按需填写变量。构建时 `dotenv` 会被标记为 external，需在运行时通过 `node_modules` 加载。

```bash
cp .env.example .env
```

在代码中使用：

```ts
import 'dotenv/config';

console.log(process.env.MY_VAR);
```

## 开发与构建

### 开发

`pnpm dev` 通过 nodemon 监听 `src/` 下的 TypeScript 文件，使用 ts-node 直接运行，无需手动编译。

### 构建

`pnpm build` 调用 `config/esbuild.config.mts`，将 `src/index.ts` 打包为 `dist/index.js`（CommonJS，已压缩）。

生产环境启动：

```bash
pnpm build
pnpm start
```

## 代码质量

### Lint

`pnpm lint` 依次执行：

1. **ESLint** — 语法与风格检查（`typescript-eslint` recommended 规则）
2. **tsc --noEmit** — TypeScript 类型检查（如未定义变量、类型错误等）

> ESLint 的 `recommended` 配置不包含类型感知规则，未定义的标识符由 `tsc` 负责检出。

### 格式化

`pnpm format` 使用 Prettier 格式化项目文件。

### Git 钩子

通过 `simple-git-hooks` 配置：

| 钩子         | 行为                  |
| ------------ | --------------------- |
| `pre-commit` | 运行 `npm run lint`   |
| `pre-push`   | 运行 `npm run format` |

首次安装依赖后，钩子会自动生效。若未生效，可手动执行：

```bash
npx simple-git-hooks
```

## 技术栈

| 类别     | 依赖                      |
| -------- | ------------------------- |
| 运行时   | Node.js                   |
| 语言     | TypeScript 6              |
| 打包     | esbuild                   |
| 开发     | nodemon, ts-node, tsx     |
| 代码检查 | ESLint, typescript-eslint |
| 格式化   | Prettier                  |
| 环境变量 | dotenv                    |

## 许可证

[MIT](./LICENSE)

## 作者

[xiaoming0000](https://github.com/XiaoMing0000)
