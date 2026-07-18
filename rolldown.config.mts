import { defineConfig } from 'rolldown';

export default defineConfig({
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'esm',
    entryFileNames: 'index.js',
  },
  external: ['sharp', 'commander'],
  platform: 'node',
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.json'],
  },
});
