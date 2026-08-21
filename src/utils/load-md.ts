import fsp from 'fs/promises';
import path from 'path';

const fileExt = '.md';

type MdFile = {
	path: string;
	relativePath: string;
	fileName: string;
	content?: string;
};

/**
 *
 * @param dirPath 目录路径
 * @param baseDir 基础目录路径
 * @param recursion 是否递归
 * @returns Promise<MdFile[]>
 */
export async function loadMdFiles(
	dirPath: string,
	baseDir: string = '',
	options: { recursion?: boolean; content?: boolean } = { recursion: false, content: false },
): Promise<MdFile[]> {
	baseDir = baseDir || dirPath;

	const files: MdFile[] = [];
	const dir = await fsp.readdir(dirPath);
	dir.forEach(async (file) => {
		const filePath = path.join(dirPath, file);
		const isDirectory = (await fsp.stat(filePath)).isDirectory();
		if (isDirectory) {
			files.push(...(await loadMdFiles(filePath, baseDir, options)));
		} else {
			if (file.endsWith(fileExt)) {
				files.push({
					path: filePath,
					relativePath: path.relative(baseDir, filePath),
					fileName: file,
					content: options.content ? await fsp.readFile(filePath, 'utf-8') : undefined,
				});
			}
		}
	});
	return files;
}

/**
 *
 * @param filePath 文件路径
 * @returns Promise<string>
 */
export async function loadMdContentAsync(filePath: string): Promise<string> {
	return await fsp.readFile(filePath, 'utf-8');
}
