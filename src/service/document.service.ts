import documentRepository, { DocumentRepository } from '../repository/document.repository';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChunkingStrategy } from '../utils/split/text-split';

export class DocumentService {
	constructor(private readonly documentRepository: DocumentRepository) {}

	/**
	 * 创建或更新文档
	 * @param embeddingModel 向量模型
	 * @param content 文档内容
	 * @returns 文档信息和分块数量
	 */
	async upsertDocument(embeddingModel: OpenAIEmbeddings<number[]>, content: string) {
		const segments = ChunkingStrategy.recursive(content, { chunkSize: 100, separators: ['\n# ', '\n## ', '\n### '], overlap: 0 });
		const embeddings = await embeddingModel.embedDocuments(segments);

		const chunks = segments.map((segment, index) => {
			return {
				content: segment,
				embedding: embeddings[index],
			};
		});
		return this.documentRepository.upsertDocument(
			{
				userId: 'xiaoming0000',
				title: 'RAG',
				description: 'RAG 测试文档',
				fileType: 'markdown',
				fileName: 'RAG',
				fileSize: content.length,
				source: 'file',
				sourceType: 'md',
			},
			chunks,
		);
	}
}

const documentService = new DocumentService(documentRepository);
export default documentService;
