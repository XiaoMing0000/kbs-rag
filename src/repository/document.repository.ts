import { Document, DocumentChunk, Prisma, PrismaClient } from '../generated/prisma/client';
import { prisma } from '../prisma/client';

export class DocumentRepository {
	constructor(private readonly prisma: PrismaClient) {
		this.prisma = prisma;
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
}

const documentRepository = new DocumentRepository(prisma);

export default documentRepository;
