import { ChatOpenAI, ChatOpenAIFields, OpenAIEmbeddings, OpenAIEmbeddingsParams } from '@langchain/openai';
import CONFIG from '../config/config';

export class Model {
  static deepseek(fields?: Partial<ChatOpenAIFields>): ChatOpenAI {
    return new ChatOpenAI({
      model: CONFIG.DEEPSEEK_FLASH_MODEL,
      apiKey: CONFIG.DEEPSEEK_API_KEY,
      configuration: {
        baseURL: CONFIG.DEEPSEEK_BASE_URL,
      },
      ...fields,
    });
  }

  static qwen(fields?: Partial<ChatOpenAIFields>): ChatOpenAI {
    return new ChatOpenAI({
      model: CONFIG.QWEN_MODEL,
      apiKey: CONFIG.QWEN_API_KEY,
      temperature: 0,
      configuration: {
        baseURL: CONFIG.QWEN_BASE_URL,
      },
      ...fields,
    });
  }
  static qwenEmbeddings(fields?: Partial<OpenAIEmbeddingsParams>): OpenAIEmbeddings {
    return new OpenAIEmbeddings({
      model: CONFIG.QWEN_EMBEDDINGS_MODEL,
      apiKey: CONFIG.QWEN_API_KEY,
      configuration: {
        baseURL: CONFIG.QWEN_BASE_URL,
      },
      ...fields,
    });
  }
}
