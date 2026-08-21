// 创建数据库：pnpm dlx create-db@latest
// 初始化数据库表：pnpm dlx prisma migrate dev
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
