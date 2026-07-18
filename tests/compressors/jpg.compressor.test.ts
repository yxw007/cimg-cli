import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { JpgCompressor } from '../../src/compressors/jpg.compressor.js';

// Disable sharp cache to avoid EBUSY on Windows
sharp.cache(false);

const compressor = new JpgCompressor();
let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cimg-test-'));
});

afterEach(async () => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

async function createTestJpg(): Promise<string> {
  const filePath = path.join(tmpDir, 'test.jpg');
  const buffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();
  await fs.writeFile(filePath, buffer);
  return filePath;
}

describe('JpgCompressor', () => {
  it('should have .jpg and .jpeg extensions', () => {
    expect(compressor.supportedExtensions).toEqual(['.jpg', '.jpeg']);
  });

  it('should compress a JPG file', async () => {
    const inputPath = await createTestJpg();
    const outputPath = path.join(tmpDir, 'output.jpg');

    const result = await compressor.compress(inputPath, outputPath, { quality: 80, force: false });

    expect(result.success).toBe(true);
    expect(result.inputSize).toBeGreaterThan(0);
    expect(result.outputSize).toBeGreaterThan(0);

    const exists = await fs.stat(outputPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('should produce smaller files with lower quality', async () => {
    const inputPath = await createTestJpg();

    const highQualityPath = path.join(tmpDir, 'high.jpg');
    const lowQualityPath = path.join(tmpDir, 'low.jpg');

    const highResult = await compressor.compress(inputPath, highQualityPath, { quality: 90, force: false });
    const lowResult = await compressor.compress(inputPath, lowQualityPath, { quality: 10, force: false });

    expect(highResult.success).toBe(true);
    expect(lowResult.success).toBe(true);
    expect(lowResult.outputSize).toBeLessThanOrEqual(highResult.outputSize);
  });
});
