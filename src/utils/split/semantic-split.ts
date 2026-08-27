/**
 * 数据清洗
 * 数据分段
 * 数据向量化
 * 数据存储
 * 数据查询
 * 数据删除
 * 数据更新
 * 数据备份
 * 数据恢复
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { ChunkingStrategy, ChunkingStrategyOptions, cleanText } from './text-split';
import { cosineSimilarity } from '../utils';

type SemanticChunkingOptions = ChunkingStrategyOptions & {
  /** 相邻句余弦距离超过该百分位则视为主题切换并切分，默认 95 */
  breakpointPercentile?: number;
  /** 嵌入时向前/后各取几句作为上下文窗口，默认 1（Kamradt 方法） */
  bufferSize?: number;
};

/** 中文句末标点、英文 !?，以及换行。不把 `.` 当切点，避免把 `1.` 编号列表切断 */
const SENTENCE_SPLIT_REGEXP = /(?<=[。！？；>!?])\s*|(?:\n+)/;

/** 线性插值百分位，与 numpy.percentile(interpolation='linear') 一致 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return sorted[0] ?? 0;
  }
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const loVal = sorted[lo] ?? 0;
  const hiVal = sorted[hi] ?? loVal;
  if (lo === hi) {
    return loVal;
  }
  return loVal + (hiVal - loVal) * (rank - lo);
}

/** 按句切分 */
function splitIntoSentences(text: string): string[] {
  const sentences = text
    .split(SENTENCE_SPLIT_REGEXP)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return sentences.length ? sentences : [text];
}

/** 把第 i 句与前后 bufferSize 句拼成窗口，给 embedding 更多上下文 */
function combineWithBuffer(sentences: string[], bufferSize: number): string[] {
  return sentences.map((_, i) => {
    const start = Math.max(0, i - bufferSize);
    const end = Math.min(sentences.length, i + bufferSize + 1);
    return sentences.slice(start, end).join(' ');
  });
}

/**
 * 语义分块（Greg Kamradt / LangChain SemanticChunker）
 *
 * 步骤：
 * 1. 清洗文本，再按句末标点 / 换行切成句子（最小语义单元）
 * 2. 为每句构造「前后各 bufferSize 句」的上下文窗口，避免单句过短导致向量不稳
 * 3. 用 embedding 模型把每个窗口编码成向量
 * 4. 计算相邻窗口的余弦距离 distance = 1 - cosine_similarity
 * 5. 取距离的 breakpointPercentile 百分位作为阈值；超过阈值说明主题切换，在此切开
 * 6. 将同一主题内的句子拼成一块；若仍超过 chunkSize，回退到 recursive 再切
 *
 * overlap 只在第 6 步超长回退时生效，主题边界本身不再做字符重叠，避免把不同主题拼在一起。
 */
export async function semanticChunking(
  content: string,
  embeddingsModel: OpenAIEmbeddings,
  { chunkSize = 500, overlap = 50, clean = true, breakpointPercentile = 95, bufferSize = 1, separators = ['\n', ' '] }: SemanticChunkingOptions = {},
): Promise<string[]> {
  if (clean) {
    content = cleanText(content);
  }
  if (!content) {
    return [];
  }

  // 1. 按句切分
  const sentences = splitIntoSentences(content);
  if (sentences.length <= 1) {
    const only = sentences[0] ?? content;
    return only.length > chunkSize ? ChunkingStrategy.recursive(only, { separators, chunkSize, overlap, clean: false }) : [only];
  }

  // 2. 上下文窗口
  const windows = combineWithBuffer(sentences, bufferSize);

  // 3. 批量嵌入
  const embeddings = await embeddingsModel.embedDocuments(windows);

  // 4. 相邻余弦距离
  const distances: number[] = [];
  for (let i = 0; i < embeddings.length - 1; i++) {
    const current = embeddings[i];
    const next = embeddings[i + 1];
    if (!current || !next) {
      distances.push(0);
      continue;
    }
    distances.push(1 - cosineSimilarity(current, next));
  }

  // 5. 百分位阈值：只在「相对最不像」的位置切开
  const threshold = percentile(distances, breakpointPercentile);

  // 6. 按主题断裂点分组，超长块再递归切
  const groups: string[][] = [[]];
  for (let i = 0; i < sentences.length; i++) {
    groups[groups.length - 1]?.push(sentences[i] ?? '');
    if (i < distances.length && (distances[i] ?? 0) > threshold) {
      groups.push([]);
    }
  }

  const chunks: string[] = [];
  for (const group of groups) {
    const text = group.filter(Boolean).join('\n');
    if (!text) {
      continue;
    }
    if (text.length <= chunkSize) {
      chunks.push(text);
      continue;
    }
    chunks.push(...ChunkingStrategy.recursive(text, { separators, chunkSize, overlap, clean: false }));
  }
  return chunks.map((item) => cleanText(item));
}
