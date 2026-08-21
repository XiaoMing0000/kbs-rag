import { SplitType, agenticSplit } from '../split/agentic-split';
import { Model } from '../utils/models';

const agenticSplitModel = Model.deepseek({
	modelKwargs: {
		thinking: { type: 'disabled' },
	},
});

// const files = loadMd(path.join(__dirname, '../', 'source-md'));
const content = `# RAG
测试标签内的 content.
## 什么是 RAG
Retrieval Augmented Generation 检索 增强 生成：
1. 先从现有的资料库中\`检索\`相关内容；
2. 再基于这些内容\`生成\`答案；

RAG 是目前最常用的 AI 问答方案之一，很多企业内的知识助手、只能客服用的都是这项技术。

# 总体介绍
## 使用场景
- **需求**：制作一个**智能客服**可以回答关于公司产品的任何问题；
- **支持**：需要有**大模型**支撑；

**方案1：**
在给模型发送问题的时候把产品手册丢给大模型，产品手册字体特别多可能是上百或上千页会带来很多问题。

产品手册太长所带来的问题：
- 模型无法读取所有内容，受模型上下文长度限制，会出现知识不全；
- 模型的推理成本高。
- 模型推理速度慢、输出慢。

**方案2：** **RAG**


## 大致流程

RAG 的基本运作流程：
1. 将文档切分为多个片段；
2. 根据用户查询内容然后再所有片段中查找相关内容；
3. 提取相关内容的片段+用户问题 -> 发给大模型；

RAG 的基本流程：
数据准备部分（用户提问前）<- 分片 + 索引
回答部分（提问后）-> 召回 -> 重排 -> 生成


# 逐步拆解
## 分片
分片故名思意就是把文档切分为多个分片。
**分片方式：**
- 按字数
- 按照段落
- 按照章节
- 按照页码

**统一数据清洗:**
  - 统一格式：图片 ocr、pdf 文字提取
  - 脏数据过滤：html 标签、空格、换行、过滤乱码
  - 质量检验：清洗数据的完整性、确保五残留噪声

**批量向量化：**
- 多线程批处理；
- 元数据绑定：文档来源索引、方便溯源和精准检索

## 索引
1. 索引就是通过 **Embedding**将片段文本转换为**向量**
2. 然后再将片段文本和向量存储到**向量数据库**中的过程。
   
向量数据库排行：[https://huggingface.co/mteb/spaces](https://huggingface.co/mteb/spaces)

## 召回
召回就是搜索与用户问题相关片段的过程。
1. 用户的问题发给 Embedding 模型，然后转换为向量。
2. 转换为向量后的问题再发给向量数据库。
3. 向量数据库检索相关问题的片段。

召回检索特点：
- 方法：向量相似度、欧式距离、点积；
- 特点：成本低、耗时低、准备率低；
- 适合场景：初步筛选；

## 重排
重排->重新排序和召回是一样的；
重排就是从召回的多个片段中再挑选 n 个与用户问题最相似的片段作为重排的结果。

重排检索特点：
- 方法：cross-encoder 模型计算每个片段与问题的相似度；
- 特点：成本高、耗时长、准确率高；
- 适合场景：精调细选

## 生成
生成则是生成用户问题的答案。
将用户问题和重排后的片段一起发送给大模型，让他根据片段内容来回答用户问题。

# 全链路回顾
## 提问前链路

建立索引：产品手册 -> 分片列表 -> Embedding 模型 -> 向量数据 -> 向量数据库

## 提问后链路

用户问题 -> Embedding 模型 -> 向量问题 -> 向量数据库 -> 召回片段（一次赛选） -> cross-encoder 模型片段（二次筛选） -> 组合用户问题+片段问题 -> 大模型 -> 最终答案

## 补充 长期运维迭代
- 自动增量更新
  - 每天自动更新文档
  - 定时清理过期内容
  - 知识库始终保持新鲜
- 效果监控
  - 持续监控召回准确率
  - 建立效果评估看板
  - 数据驱动迭代策略
- 策略动态调整
  - 效果下滑时及时调整分片策略或更换 Embedding 模型
  - 保持系统最优状态

**运维闭环：**增量更新 -> 效果监控 -> 策略调整 -> 再监控
`;
// const segments = ChunkingStrategy.fixedSize(content, { chunkSize: 30, overlap: 10 });

// 使用分层结构拆分
// const segments = ChunkingStrategy.hierarchical('', content, { chunkSize: 100, separators: ['#', '##'] });
// console.log(JSON.stringify(segments, null, 4));

// 使用递归字符串拆分
// const segments = ChunkingStrategy.recursive(content, { chunkSize: 100, separators: ['\n\n', '\n', ' '], overlap: 0 });

// 使用递归字符串拆分 markdown 语义
// const segments = ChunkingStrategy.recursive(content, { chunkSize: 100, separators: ['\n# ', '\n## ', '\n### '], overlap: 0 });
// console.log(segments);

// 使用 embedding 模型进行余弦相似度计算进行分块
// const embeddingsModel = Model.qwenEmbeddings({ batchSize: 8 });
// (async () => {
// 	const chunks = await semanticChunking(content, embeddingsModel, { chunkSize: 200, overlap: 0 });
// 	chunks.forEach((chunk, i) => {
// 		console.log(`\n===== chunk ${i + 1} / ${chunks.length}  (${chunk.length} chars) =====\n${chunk}`);
// 	});
// })();

// 使用 agent 进行分块
(async () => {
	const segments = await agenticSplit(content, agenticSplitModel, { chunkSize: 100, clean: true, splitType: SplitType.SEMANTIC });
	console.log(segments);
})();
