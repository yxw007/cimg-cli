import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { GifCompressor } from '../../src/compressors/gif.compressor.js';

// Disable sharp cache to avoid EBUSY on Windows during cleanup
sharp.cache(false);

const compressor = new GifCompressor();
let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cimg-test-'));
});

afterEach(async () => {
  // Retry cleanup to handle Windows file locks
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

async function createTestGif(): Promise<string> {
  const filePath = path.join(tmpDir, 'test.gif');
  const buffer = await sharp({
    create: {
      width: 50,
      height: 50,
      channels: 4,
      background: { r: 0, g: 255, b: 0, alpha: 1 },
    },
  })
    .gif()
    .toBuffer();
  await fs.writeFile(filePath, buffer);
  return filePath;
}

describe('GifCompressor', () => {
  it('should have .gif extension', () => {
    expect(compressor.supportedExtensions).toEqual(['.gif']);
  });

  it('should compress a GIF file', async () => {
    const inputPath = await createTestGif();
    const outputPath = path.join(tmpDir, 'output.gif');

    const result = await compressor.compress(inputPath, outputPath, { quality: 80, force: false });

    expect(result.success).toBe(true);
    expect(result.inputSize).toBeGreaterThan(0);
    expect(result.outputSize).toBeGreaterThan(0);

    const exists = await fs.stat(outputPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });
});
