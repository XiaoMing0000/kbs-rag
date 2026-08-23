import { rm } from 'fs/promises';
import * as esbuild from 'esbuild';

rm('./dist', { recursive: true, force: true });

esbuild.build({
	entryPoints: { index: 'src/index.ts' },
	outdir: './dist/',
	entryNames: '[name]',
	assetNames: '[name]',
	bundle: true,
	platform: 'node',
	format: 'cjs',
	sourcemap: false,
	minify: true,
	external: ['dotenv'],
});
