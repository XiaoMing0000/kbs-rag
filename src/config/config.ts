import 'dotenv/config';

const CONFIG = {
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL,
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
  DEEPSEEK_FLASH_MODEL: process.env.DEEPSEEK_FLASH_MODEL,

  QWEATHER_API_KEY: process.env.QWEATHER_API_KEY ?? '',
  QWEATHER_BASE_URL: process.env.QWEATHER_BASE_URL ?? '',

  // 千问
  QWEN_BASE_URL: process.env.QWEN_BASE_URL ?? '',
  QWEN_API_KEY: process.env.QWEN_API_KEY ?? '',
  QWEN_MODEL: process.env.QWEN_MODEL ?? '',
  QWEN_EMBEDDINGS_MODEL: process.env.QWEN_EMBEDDINGS_MODEL ?? '',

  // postgres 配置
  DATABASE_URL: process.env.DATABASE_URL ?? '',

  LANGSMITH_TRACING: !!process.env.LANGSMITH_TRACING,
} as const;

export default CONFIG;
