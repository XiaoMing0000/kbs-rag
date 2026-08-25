import documentRepository, { DocumentRepository, FilterMethod } from '../repository/document.repository';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChunkingStrategy } from '../utils/split/text-split';
import { hashSha256 } from '../utils/utils';

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

    const document = await this.documentRepository.getDocumentByTitleAndUserId('RAG', 'xiaoming0000');
    // 这里只校验了文档 hash, 生产可根绝分片类型、分片数量、文件类型、文件大小等进行更全面的校验
    // 生产环境可考虑使用数据库唯一索引校验
    if (document && document.sourceHash === hashSha256(content)) {
      return {
        document,
        chunks: await this.documentRepository.getDocumentChunksCountByDocumentId(document.id),
      };
    }
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
        fileInfo: {
          type: 'markdown',
          name: 'RAG',
          size: content.length,
          ext: 'md',
          path: 'RAG',
          url: 'RAG',
        },
        chunkInfo: {
          type: 'recursive',
          size: content.length,
          separators: ['\n# ', '\n## ', '\n### '],
          embeddingModel: 'qwen3-embedding:4b',
        },
        sourceHash: hashSha256(content),
      },
      chunks,
    );
  }

  async retrieveContext(embedding: number[], topK: number) {
    return await this.documentRepository.retrieveContext({
      userId: 'xiaoming0000',
      embedding: embedding,
      documentTitle: 'RAG',
      topK,
      filter: FilterMethod.COSINE,
    });
  }
}

const documentService = new DocumentService(documentRepository);
export default documentService;
