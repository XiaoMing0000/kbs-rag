import { Document, DocumentChunk, Prisma, PrismaClient } from '../generated/prisma/client';
import { prisma } from '../prisma/client';

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
					fileType: document.fileType,
					fileName: document.fileType,
					fileSize: document.fileSize,
					source: document.source,
					sourceType: document.sourceType,
				},
				create: {
					userId: document.userId,
					title: document.title,
					description: document.description,
					fileType: document.fileType,
					fileName: document.fileType,
					fileSize: document.fileSize,
					source: document.source,
					sourceType: document.sourceType,
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
			INSERT INTO "DocumentChunk" ("document_id", "content", "embedding")
			VALUES ${Prisma.join(values)}
		`;

			return { doc, chunkCount };
		});
	}

	async retrieveContext(
		documentTitle: string,
		userId: string,
		embedding: number[],
		{ topK = 10, filter = FilterMethod.COSINE }: { topK: number; filter: FilterMethod },
	) {
		await this.prisma.$transaction(async (tx) => {
			const document = await tx.document.findUnique({
				select: {
					id: true,
					title: true,
					description: true,
					fileType: true,
					fileName: true,
					fileSize: true,
					source: true,
					sourceType: true,
					createdAt: true,
				},
				where: {
					userId_title: {
						userId: userId,
						title: documentTitle,
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
				FROM "DocumentChunk"
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
