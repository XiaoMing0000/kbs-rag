import { DynamicStructuredTool, tool } from 'langchain';
import z from 'zod';
import documentRepository, { FilterMethod } from '../repository/document.repository';
import { Model } from '../utils/models';
import { ToolRunnableConfig } from '@langchain/core/tools';

const embeddingsModel = Model.qwenEmbeddings({ batchSize: 8 });

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
      topK: 5,
      filter: FilterMethod.COSINE,
      documentId,
    });
    // TODO chunk 召回后，需要对片段进行重排序，并返回给用户
    return context.map((item) => item.content).join('\n');
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
