// 创建数据库：pnpm dlx create-db@latest
// 应用迁移：pnpm run db:init（migrate deploy，不走影子库）
// migrate dev 需要超级用户在影子库/template1 上执行：CREATE EXTENSION IF NOT EXISTS vector;
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
	schema: './src/prisma/schema.prisma',
	migrations: {
		path: './src/prisma/migrations',
	},
	datasource: {
		url: process.env['DATABASE_URL'],
	},
});
