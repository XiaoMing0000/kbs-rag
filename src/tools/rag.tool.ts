import { DynamicStructuredTool, tool } from 'langchain';
import z from 'zod';
import documentRepository, { FilterMethod } from '../repository/document.repository';
import { Model } from '../utils/models';

const embeddingsModel = Model.qwenEmbeddings({ batchSize: 8 });

/**
 * 查询拥有有哪些知识库文档
 */
export const documentsTool: DynamicStructuredTool = tool(
	async ({ userId }: { userId: string }) => {
		const documents = await documentRepository.findDocuments(userId);
		return documents;
	},
	{
		name: 'documents',
		description: '查询拥有有哪些知识库文档',
		schema: z.object({
			userId: z.string().describe('用户id'),
		}),
	},
);

/**
 * 根据文档 id 和用户查询内容，召回相关文档片段
 */
export const retrieveContextTool: DynamicStructuredTool = tool(
	async ({ userId, documentId, query }: { userId: string; documentId: number; query: string }) => {
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
			// TODO 生产环境 userId 通过 state 获取
			userId: z.string().describe('用户id'),
			documentId: z.number().describe('文档 id'),
			query: z.string().describe('用户查询内容'),
		}),
	},
);
