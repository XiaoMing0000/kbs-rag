import path from 'path';
import { DynamicStructuredTool, tool } from 'langchain';
import z from 'zod';
import documentRepository, { FilterMethod } from '../repository/document.repository';
import { Model } from '../utils/models';
import { ToolRunnableConfig } from '@langchain/core/tools';
import { AutoModelForSequenceClassification, AutoTokenizer, env } from '@huggingface/transformers';

// 嵌入模型
const embeddingsModel = Model.qwenEmbeddings({ batchSize: 8 });

// 重排序模型
env.localModelPath = path.resolve('models') + path.sep;
env.allowLocalModels = true;
env.allowRemoteModels = false;
const reRankerModel = await AutoModelForSequenceClassification.from_pretrained('Xenova/ms-marco-TinyBERT-L-2-v2');
const tokenizer = await AutoTokenizer.from_pretrained('Xenova/ms-marco-TinyBERT-L-2-v2');

async function resumeRanking(query: string, chunks: string[]) {
  const features = tokenizer(
    chunks.map(() => query),
    {
      text_pair: chunks,
      padding: true,
      truncation: true,
    },
  );

  const { logits } = await reRankerModel(features);
  const scores = Array.from(logits.data as Float32Array);
  return chunks
    .map((text, i) => ({ text, score: scores[i] }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.text);
}

/**
 * 查询拥有有哪些知识库文档
 */
export const documentsTool: DynamicStructuredTool = tool(
  async (_: any, config: ToolRunnableConfig) => {
    const userId: string = config.context?.userId;
    if (!userId || typeof userId !== 'string') {
      throw new Error('userId is required');
    }
    const documents = await documentRepository.findDocuments(userId);
    return documents;
  },
  {
    name: 'documents',
    description: '查询拥有有哪些知识库文档',
    schema: z.object(),
  },
);

/**
 * 根据文档 id 和用户查询内容，召回相关文档片段
 */
export const retrieveContextTool: DynamicStructuredTool = tool(
  async ({ documentId, query }: { documentId: number; query: string }, config: ToolRunnableConfig) => {
    const userId: string = config.context?.userId;
    if (!userId || typeof userId !== 'string') {
      throw new Error('userId is required');
    }
    const embeddings = await embeddingsModel.embedDocuments([query]);
    const context = await documentRepository.retrieveContext({
      userId,
      embedding: embeddings[0],
      topK: 15, // 召回片段数量
      filter: FilterMethod.COSINE,
      documentId,
    });

    // chunks 召回后，需要对片段进行重排序，并返回给用户
    const rankedContexts = await resumeRanking(
      query,
      context.map((item) => item.content),
    );

    // 返回前 10 个重拍后的片段
    return rankedContexts.slice(0, 10).join('\n');
  },
  {
    name: 'retrieveContext',
    description: '根据文档 id 和用户查询内容，召回相关文档片段',
    schema: z.object({
      documentId: z.number().describe('文档 id'),
      query: z.string().describe('用户查询内容'),
    }),
  },
);
