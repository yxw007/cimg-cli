import sharp from 'sharp';
import type { ICompressor } from '../core/compressor.interface.js';
import type { CompressOptions, CompressResult } from '../types.js';
import { getFileSize } from '../utils/file.js';

export class JpgCompressor implements ICompressor {
  readonly supportedExtensions = ['.jpg', '.jpeg'];

  async compress(inputPath: string, outputPath: string, options: CompressOptions): Promise<CompressResult> {
    try {
      const inputSize = await getFileSize(inputPath);
      await sharp(inputPath)
        .jpeg({ quality: options.quality, mozjpeg: true })
        .toFile(outputPath);
      const outputSize = await getFileSize(outputPath);
      return { inputPath, outputPath, inputSize, outputSize, success: true };
    } catch (error) {
      return {
        inputPath,
        outputPath,
        inputSize: 0,
        outputSize: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
