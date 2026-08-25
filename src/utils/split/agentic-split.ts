import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from 'langchain';

export enum SplitType {
  RECURSIVE, // 递归分割
  SPECIFIC, // 特定分割
  SEMANTIC, // 语义分割
}

export async function agenticSplit(
  content: string,
  model: ChatOpenAI,
  { chunkSize = 200, clean = true, splitType = SplitType.RECURSIVE }: { chunkSize?: number; clean?: boolean; splitType?: SplitType },
): Promise<string[]> {
  const systemPrompt = ((splitType: SplitType) => {
    switch (splitType) {
      case SplitType.RECURSIVE:
        return `# 角色与目标
你是一个递归文本分块专家。你的任务是将输入文本按层级从粗到细逐步分割，最终输出长度合规的文本块。

# 处理规则（按优先级执行）
1. **清洗**：${clean ? '移除首尾空格、多余空行，将连续换行符合并为单个换行符。' : '不进行清洗。'}
2. **递归分割策略**（按顺序尝试，直到所有块长度 ≤ ${chunkSize} 字符）：
   - **第1层（段落级）**：优先按换行符（\`\\n\`）分割。
   - **第2层（句子级）**：若某段落仍超长，按句号/问号/感叹号（\`.！？;\`）分割。
   - **第3层（从句级）**：若某句子仍超长，按逗号/分号/连接词（\`，、；但因而\`）分割。
   - **第4层（强制截断）**：若仍超长，在最近空格处截断，并补充连接词（如“且”、“其”）保证通顺。
3. **边界约束**：
   - 禁止在英文单词/数字中间截断。
   - 拆分后的相邻块应保持语义连贯，必要时重复主语或承接词。
4. **长度硬限制**：每个块字符数 ≤ ${chunkSize}（含标点）。

# 输出格式
仅输出合法 JSON 数组：\`["chunk1", "chunk2", ...]\`。若输入为空，返回 \`[]\`。

# 示例
**输入**："递归分割是一种常用策略。它通过多层切分适应不同文本。当文本过长时，它会逐级细化，直至满足长度要求。"
**输出**：["递归分割是一种常用策略。它通过多层切分适应不同文本。", "当文本过长时，它会逐级细化，直至满足长度要求。"]`;
      case SplitType.SPECIFIC:
        return `# 角色与目标
你是一个基于规则（Rule-based）的文本分块工具。你的任务是根据明确的标点和长度硬规则，将文本分割为合规的块。

# 固定分割规则（严格按顺序执行）
1. **清洗**：${clean ? '移除首尾空格、多余空行，将连续换行符合并为单个换行符。' : '不进行清洗。'}
2. **强制断句符（白名单）**：仅在以下符号处允许分割 —— \`。！？；\\n\`。
3. **长度约束**：每个块字符数必须 ≤ ${chunkSize}。
4. **分割逻辑**：
   - 按白名单符号将文本切分为候选片段。
   - 从第一个片段开始向后累加，直到累加长度 > ${chunkSize} 时，**在此前最后一个断句符处切割**。
   - 若单个片段本身 > ${chunkSize}，则在长度 ${chunkSize} 附近最近的**空格**处强制截断（英文模式），或按中文单字截断（无空格时）。
5. **禁止语义判断**：不主动合并或拆分主题，严格遵循标点规则。

# 输出格式
仅输出合法 JSON 数组：\`'["chunk1", "chunk2", ...]\`。若输入为空，返回 \`[]\`。

# 示例
**输入**："规则一：长度上限${chunkSize}。规则二：仅在句号处分割。规则三：超长句子强制在空格处截断。这是一个很长的测试句子用来验证强制截断逻辑。"
**输出**：["规则一：长度上限${chunkSize}。规则二：仅在句号处分割。", "规则三：超长句子强制在空格处截断。", "这是一个很长的测试句子用来验证强制截断逻辑。"]`;
      case SplitType.SEMANTIC:
        return `# 角色与目标
你是一个语义理解型分块专家。你的任务是通过分析文本的主题、逻辑关系和语篇结构，将内容分割为语义自洽的独立块。

# 核心原则（按重要性排序）
1. **语义完整性（最高优先级）**：每个块应围绕一个核心主题、观点或事件，可独立理解。
2. **逻辑边界识别**：
   - 主题切换（如“然而”、“另一方面”、“首先...其次...”）
   - 时间/空间转换（“昨天”、“在北京”）
   - 人物/视角转换（“他说”、“据报告”）
   - 论述层次（“结论是”、“例如”开头的新例证）
3. **长度软约束**：尽量使每个块 ≤ ${chunkSize} 字符；若语义完整块略超（≤10%），允许保留，但优先在语义边界处调整。
4. **连贯性保障**：拆分后若产生指代不清（如仅有“这”、“其”），需在子块开头补全主语或上下文线索词。
5. **清洗**：${clean ? '移除首尾空格、多余空行，将连续换行符合并为单个换行符。' : '不进行清洗。'}

# 输出格式
仅输出合法 JSON 数组：\`'["chunk1", "chunk2", ...]\`。若输入为空，返回 \`[]\`。

# 示例
**输入**："深度学习在图像识别领域取得了巨大成功。它主要依赖于卷积神经网络。然而，这种模型需要大量标注数据。这在医疗影像场景中往往难以获得。"
**输出**：["深度学习在图像识别领域取得了巨大成功。它主要依赖于卷积神经网络。", "然而，这种模型需要大量标注数据。这在医疗影像场景中往往难以获得。"]`;
      default:
        return `
        你是一个可以将文本拆分为多段的助手，请根据以下要求将文本拆分为多段：
        `;
    }
  })(splitType);

  const response = await model.invoke([new SystemMessage(systemPrompt), new HumanMessage(content)]);
  if (typeof response.content === 'string') {
    const content = JSON.parse(response.content) as string[];
    return content;
  } else if (response.content instanceof Array) {
    const content = response.content.map((item) => item.text) as string[];
    return content as string[];
  } else {
    return [];
  }
}
