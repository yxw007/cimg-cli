import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { PngCompressor } from '../../src/compressors/png.compressor.js';

// Disable sharp cache to avoid EBUSY on Windows
sharp.cache(false);

const compressor = new PngCompressor();
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

async function createTestPng(): Promise<string> {
  const filePath = path.join(tmpDir, 'test.png');
  const buffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  await fs.writeFile(filePath, buffer);
  return filePath;
}

describe('PngCompressor', () => {
  it('should have .png extension', () => {
    expect(compressor.supportedExtensions).toEqual(['.png']);
  });

  it('should compress a PNG file', async () => {
    const inputPath = await createTestPng();
    const outputPath = path.join(tmpDir, 'output.png');

    const result = await compressor.compress(inputPath, outputPath, { quality: 80, force: false });

    expect(result.success).toBe(true);
    expect(result.inputPath).toBe(inputPath);
    expect(result.outputPath).toBe(outputPath);
    expect(result.inputSize).toBeGreaterThan(0);
    expect(result.outputSize).toBeGreaterThan(0);

    // Output file should exist
    const exists = await fs.stat(outputPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('should compress with different quality settings', async () => {
    const inputPath = await createTestPng();

    const highQualityPath = path.join(tmpDir, 'high.png');
    const lowQualityPath = path.join(tmpDir, 'low.png');

    const highResult = await compressor.compress(inputPath, highQualityPath, { quality: 90, force: false });
    const lowResult = await compressor.compress(inputPath, lowQualityPath, { quality: 10, force: false });

    expect(highResult.success).toBe(true);
    expect(lowResult.success).toBe(true);
    // Lower quality should generally produce smaller file
    expect(lowResult.outputSize).toBeLessThanOrEqual(highResult.outputSize);
  });

  it('should return error for non-existent input', async () => {
    const result = await compressor.compress(
      path.join(tmpDir, 'nonexistent.png'),
      path.join(tmpDir, 'out.png'),
      { quality: 80, force: false },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
