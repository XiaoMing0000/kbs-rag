import crypto from 'crypto';

export function hashSha256(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * 余弦相似度
 * @param a 向量 a
 * @param b 向量 b
 * @returns 余弦相似度
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions do not match: ${a.length} !== ${b.length}`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;

    dot += x * y;
    normA += x * x;
    normB += y * y;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
