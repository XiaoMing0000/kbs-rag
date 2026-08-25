import { InputJsonValue } from '@prisma/client/runtime/client';
import { Document, DocumentChunk, Prisma, PrismaClient } from '../generated/prisma/client';
import { prisma } from '../prisma/client';

// 向量计算：https://github.com/pgvector/pgvector
export enum FilterMethod {
	INNER = '<#>', // 内积
	COSINE = '<=>', // 余弦相似度
	L1 = '<+>', // L1距离
	L2 = '<->', // L2距离
	HAMMING = '<~>', // 汉明距离
	JAC_CARR = '<%>', // 杰卡德距离
}

export class DocumentRepository {
	// TODO 生产环境中使用新的连接 prisma 客户端实例
	constructor(private readonly prisma: PrismaClient) {}

	/**
	 * 根据标题和用户ID获取文档信息
	 * @param title 文档标题
	 * @param userId 用户ID
	 * @returns 文档信息
	 */
	async getDocumentByTitleAndUserId(title: string, userId: string) {
		return await this.prisma.document.findUnique({
			where: {
				userId_title: {
					userId: userId,
					title: title,
				},
			},
		});
	}

	/**
	 * 查询用户有哪些知识库文档
	 * @param userId 用户id
	 * @returns
	 */
	async findDocuments(userId: string) {
		return await this.prisma.document.findMany({
			where: {
				userId,
			},
			select: {
				id: true,
				title: true,
				description: true,
				fileInfo: true,
				chunkInfo: true,
			},
		});
	}
	/**
	 * 根据文档ID获取文档分块数量
	 * @param documentId 文档ID
	 * @returns 文档分块数量
	 */
	async getDocumentChunksCountByDocumentId(documentId: number) {
		return await this.prisma.documentChunk.count({
			where: {
				documentId,
			},
		});
	}

	/**
	 *
	 * @param document 文档信息
	 * @param chunks 文档分块
	 * @returns 文档信息和分块数量
	 */
	async upsertDocument(
		document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>,
		chunks: Array<Omit<DocumentChunk & { embedding: number[] }, 'id' | 'documentId' | 'createdAt'>>,
	) {
		return await this.prisma.$transaction(async (tx) => {
			const doc = await tx.document.upsert({
				where: {
					userId_title: {
						userId: document.userId,
						title: document.title,
					},
				},
				update: {
					description: document.description,
					fileInfo: document.fileInfo as InputJsonValue,
					chunkInfo: document.chunkInfo as InputJsonValue,
					sourceHash: document.sourceHash,
				},
				create: {
					userId: document.userId,
					title: document.title,
					description: document.description,
					fileInfo: document.fileInfo as InputJsonValue,
					chunkInfo: document.chunkInfo as InputJsonValue,
					sourceHash: document.sourceHash,
				},
			});
			if (chunks.length === 0) {
				return { document, chunks: 0 };
			}

			// 清楚历史数据
			await tx.documentChunk.deleteMany({
				where: {
					documentId: doc.id,
				},
			});

			const values = chunks.map((chunk) => {
				const vector = `[${chunk.embedding.join(',')}]`;
				return Prisma.sql`(${doc.id}, ${chunk.content}, ${vector}::halfvec)`;
			});

			const chunkCount = await tx.$executeRaw`
			INSERT INTO "document_chunks" ("document_id", "content", "embedding")
			VALUES ${Prisma.join(values)}
		`;

			return { doc, chunkCount };
		});
	}

	async retrieveContext({
		userId,
		documentId,
		embedding,
		documentTitle,
		topK = 10,
		filter = FilterMethod.COSINE,
	}: {
		userId: string;
		embedding: number[];
		documentId?: number;
		documentTitle?: string;
		topK: number;
		filter: FilterMethod;
	}) {
		return await this.prisma.$transaction(async (tx) => {
			const document = await tx.document.findUnique({
				select: {
					id: true,
					title: true,
					description: true,
					fileInfo: true,
					chunkInfo: true,
					sourceHash: true,
					createdAt: true,
				},
				where: documentId
					? {
							id: documentId,
							userId: userId,
						}
					: {
							userId_title: {
								userId: userId,
								title: documentTitle ?? '',
							},
						},
			});
			if (!document) {
				return [];
			}

			const vector = `[${embedding.join(',')}]`;

			if (!Object.values(FilterMethod).includes(filter)) {
				throw new Error('Invalid filter method: ' + filter);
			}

			const chunks = await tx.$queryRawUnsafe<{ content: string; similarity: number }[]>(
				`
				SELECT 
				content, 1 - (embedding <=> $2::halfvec) AS similarity
				FROM "document_chunks"
				WHERE "document_id" = $1
				ORDER BY embedding ${filter} $2::halfvec
				LIMIT $3
			`,
				document.id,
				vector,
				topK,
			);
			return chunks;
		});
	}
}

const documentRepository = new DocumentRepository(prisma);

export default documentRepository;
