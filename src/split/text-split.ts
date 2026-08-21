type DocumentStructure = {
	heading: string;
	contents: string[];
	subHeaders?: DocumentStructure[];
	level: number;
};

export type ChunkingStrategyOptions = {
	chunkSize?: number;
	overlap?: number;
	clean?: boolean;
	separators?: string[];
};

/**
 * 数据清洗
 * @remark 清洗数据，去除多余空行和空格
 * @param md 原始数据
 * @returns 清洗后的数据
 */
export function cleanText(md: string) {
	return md.trim().replace(/\n+/g, '\n').replace(/ +/g, ' ');
}

/** 中文句末标点、英文 !?，以及换行。不把 `.` 当切点，避免把 `1.` 编号列表切断 */
const SENTENCE_SPLIT_REGEXP = /(?<=[。！？；>!?])\s*|(?:\n+)/;

/** 按句切分 */
export function splitIntoSentences(text: string): string[] {
	const sentences = text
		.split(SENTENCE_SPLIT_REGEXP)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
	return sentences.length ? sentences : [text];
}

export class ChunkingStrategy {
	/** 固定分块
	 * @remark 固定分块会根据每个片段的长度进行分块，直到每个片段的长度小于 chunkSize
	 * @param content 字符串
	 * @param param2.length 每个片段的长度
	 * @param param2.overlap 每个片段的 overlap 长度
	 * @param param2.clean 是否清洗数据，默认 true
	 * @returns 分段后的字符串数组
	 */
	static fixedSize(content: string, { chunkSize = 200, overlap = 50, clean = true }: ChunkingStrategyOptions) {
		if (clean) {
			content = cleanText(content);
		}
		const segments = [];
		for (let i = 0; i < content.length; i += chunkSize - overlap) {
			segments.push(content.slice(i, i + chunkSize));
		}
		return segments;
	}

	/**
	 * 根据语句长度进行分块
	 * @param content
	 * @param param1
	 * @returns
	 */
	static sentences(content: string, { clean = true, chunkSize = 200 }: { clean?: boolean; chunkSize?: number }) {
		if (clean) {
			content = cleanText(content);
		}
		const chunks: string[] = [''];
		const sentences = splitIntoSentences(content);
		let index = 0;
		for (let i = 0; i < sentences.length; i++) {
			if (chunks[index].length + sentences[i].length > chunkSize) {
				index++;
				chunks[index] = sentences[i];
			} else {
				chunks[index] = [chunks[index], sentences[i]].join('');
			}
		}
		return chunks;
	}

	/**
	 * 递归分块
	 * @remark 递归分块会根据分隔符数组从左到右依次分块，直到每个片段的长度小于 chunkSize，如果分隔符数组为空，则返回原始字符串
	 * @param content 字符串
	 * @param param2.separators 分隔符数组，默认 ['\n', ' ']
	 * @param param2.chunkSize 每个片段的长度，默认 200
	 * @returns 分段后的字符串数组
	 */
	static recursive(
		content: string,
		{ separators = ['\n\n', '\n', ' '], chunkSize = 200, clean = true }: ChunkingStrategyOptions & { separators?: string[] },
	) {
		if (content.length < chunkSize) {
			return [content];
		}
		const segments: string[] = [];
		const separator = separators.shift();
		if (!separator) {
			return clean ? this.sentences(content, { chunkSize, clean }) : [content];
		}
		const splitSegments = content.split(new RegExp(`(?=${separator})`)).filter((segment) => segment.length);

		for (let segment of splitSegments) {
			segment = clean ? cleanText(segment) : segment;
			if (segment.length < chunkSize) {
				const lastIndex = segments.length - 1 < 0 ? 0 : segments.length - 1;
				const lastSegment = segments[lastIndex] || '';
				if (lastSegment.length + segment.length > chunkSize) {
					segments.push(segment);
					continue;
				}
				segments[lastIndex] = [lastSegment, segment].join('');
				continue;
			}
			segments.push(...this.recursive(segment, { separators: [...separators], chunkSize, clean }));
		}
		return segments;
	}

	/**
	 * 文档结构，层次化分块
	 * @remark 层次化分块会根据分隔符数组从左到右依次分块，直到每个片段的长度小于 chunkSize，如果分隔符数组为空，则返回原始字符串
	 * @param content 字符串
	 * @param param2.separators 分隔符数组，默认 ['#', '##']
	 * @param param2.chunkSize 每个片段的长度，默认 200
	 * @param param2.overlap 每个片段的 overlap 长度，默认 50
	 * @returns 分段后的字符串数组
	 */
	static hierarchical(
		heading = '',
		content: string,
		{
			separators = ['#', '##'],
			chunkSize = 200,
			overlap = 50,
			level = 0,
			clean = true,
		}: { separators?: string[]; level?: number } & ChunkingStrategyOptions,
	) {
		const documentStructure: DocumentStructure = {
			heading,
			contents: [],
			subHeaders: [],
			level,
		};

		if (separators.length === 0) {
			documentStructure.contents = this.fixedSize(content, { chunkSize, overlap, clean });
			return documentStructure;
		}

		const separator = separators.shift();

		const lines = content
			.split(`\n${separator} `)
			.filter((segment) => segment.length)
			.map((line) => line.trim());
		if (lines.length && separator && lines[0] && !lines[0].startsWith(separator)) {
			documentStructure.contents = this.fixedSize(lines.shift() || '', { chunkSize, overlap, clean });

			for (let i = 0; i < lines.length; i++) {
				lines[i] = `${separator} ${lines[i]}`;
			}
		} else {
			for (let i = 1; i < lines.length; i++) {
				lines[i] = `${separator} ${lines[i]}`;
			}
		}

		for (const line of lines) {
			// 整个分段小于 chunkSize，则直接添加到 segments
			const reg = new RegExp(`^${separator} .*\n`);
			const subHeading = line.match(reg)?.[0].trim() || '';

			const content = line.replace(reg, '').trim();
			if (content.length < chunkSize) {
				documentStructure.subHeaders?.push({
					heading,
					contents: this.fixedSize(content, { chunkSize, clean, overlap }),
					subHeaders: [],
					level: separators.length + 1,
				});
				continue;
			}
			// 递归分块
			const subSection = this.hierarchical(subHeading, content, { separators: [...separators], clean, chunkSize, overlap, level: level + 1 });
			if (subSection) {
				documentStructure.subHeaders?.push(subSection);
			}
		}
		return documentStructure;
	}
}
