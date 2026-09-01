import { rm } from 'fs/promises';
import * as esbuild from 'esbuild';

await rm('./dist', { recursive: true, force: true });

await esbuild.build({
  entryPoints: { index: 'src/entry/index.ts' },
  outdir: './dist/',
  entryNames: '[name]',
  assetNames: '[name]',
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  sourcemap: false,
  minify: true,
});
