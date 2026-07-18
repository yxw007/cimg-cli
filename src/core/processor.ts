import fs from 'node:fs/promises';
import path from 'node:path';
import type { CompressOptions, CompressResult, ProcessOptions } from '../types.js';
import { registry } from '../compressors/index.js';
import {
  getExtension,
  getSingleOutputPath,
  getFolderOutputPath,
  isImageFile,
} from '../utils/path.js';
import { ensureDir, scanImages, exists, formatSize } from '../utils/file.js';

/** 处理单文件压缩 */
async function processSingleFile(inputPath: string, options: CompressOptions & { outputArg?: string }): Promise<CompressResult> {
  const ext = getExtension(inputPath);
  const compressor = registry.getCompressor(ext);
  if (!compressor) {
    return {
      inputPath,
      outputPath: '',
      inputSize: 0,
      outputSize: 0,
      success: false,
      error: `Unsupported file format: ${ext}`,
    };
  }

  const outputPath = getSingleOutputPath(inputPath, options.outputArg);

  // 检查输出文件是否已存在
  if (!options.force && (await exists(outputPath))) {
    return {
      inputPath,
      outputPath,
      inputSize: 0,
      outputSize: 0,
      success: false,
      error: `Output file already exists: ${outputPath}. Use --force to overwrite.`,
    };
  }

  await ensureDir(path.dirname(outputPath));
  return compressor.compress(inputPath, outputPath, options);
}

/** 处理文件夹批量压缩 */
async function processFolder(inputPath: string, options: CompressOptions & { outputArg?: string }): Promise<CompressResult[]> {
  const images = await scanImages(inputPath);

  if (images.length === 0) {
    return [];
  }

  const results: CompressResult[] = [];

  for (const imgPath of images) {
    const ext = getExtension(imgPath);
    const compressor = registry.getCompressor(ext);
    if (!compressor) continue;

    const outputPath = getFolderOutputPath(inputPath, imgPath, options.outputArg);

    if (!options.force && (await exists(outputPath))) {
      results.push({
        inputPath: imgPath,
        outputPath,
        inputSize: 0,
        outputSize: 0,
        success: false,
        error: 'Output file already exists',
      });
      continue;
    }

    await ensureDir(path.dirname(outputPath));
    const result = await compressor.compress(imgPath, outputPath, options);
    results.push(result);
  }

  return results;
}

/** 打印单文件结果 */
function printSingleResult(result: CompressResult): void {
  if (result.success) {
    const saved = ((1 - result.outputSize / result.inputSize) * 100).toFixed(1);
    console.log(`  ✅ ${path.basename(result.outputPath)}`);
    console.log(`  📊 ${formatSize(result.inputSize)} → ${formatSize(result.outputSize)} (${saved}% saved)`);
  } else {
    console.log(`  ❌ ${result.error}`);
    process.exit(1);
  }
}

/** 打印文件夹处理结果 */
function printFolderResults(results: CompressResult[]): void {
  const successResults = results.filter((r) => r.success);

  for (const r of results) {
    if (r.success) {
      const saved = ((1 - r.outputSize / r.inputSize) * 100).toFixed(1);
      console.log(`  ✅ ${path.relative(process.cwd(), r.inputPath)} → ${path.relative(process.cwd(), r.outputPath)} (${formatSize(r.inputSize)} → ${formatSize(r.outputSize)}, ${saved}% saved)`);
    } else if (r.error?.includes('already exists')) {
      console.log(`  ⏭  Skip: ${path.relative(process.cwd(), r.outputPath)} (already exists)`);
    } else {
      console.log(`  ❌ ${r.inputPath}: ${r.error}`);
    }
  }

  if (successResults.length > 0) {
    const totalIn = successResults.reduce((s, r) => s + r.inputSize, 0);
    const totalOut = successResults.reduce((s, r) => s + r.outputSize, 0);
    const totalSaved = ((1 - totalOut / totalIn) * 100).toFixed(1);
    console.log(`\n📊 Summary: ${successResults.length} compressed, ${results.length - successResults.length} skipped/failed`);
    console.log(`   Total: ${formatSize(totalIn)} → ${formatSize(totalOut)} (${totalSaved}% saved)`);
  } else {
    console.log(`\n📊 No images were compressed.`);
  }
}

/**
 * 主入口：判断输入路径类型并执行对应的压缩流程
 */
export async function processPath(inputPath: string, options: ProcessOptions): Promise<void> {
  const resolvedPath = path.resolve(inputPath);

  // 检查路径是否存在
  let stat: fs.Stats;
  try {
    stat = await fs.stat(resolvedPath);
  } catch {
    console.error(`❌ Error: Path does not exist: ${inputPath}`);
    process.exit(1);
    return;
  }

  if (stat.isDirectory()) {
    // === 文件夹模式 ===
    console.log(`📁 Processing folder: ${inputPath}`);
    const results = await processFolder(resolvedPath, options);

    if (results.length === 0) {
      console.log('   No supported images found.');
      return;
    }

    printFolderResults(results);

    // Only exit with non-zero for actual errors (not skipped files)
    const realErrors = results.filter((r) => !r.success && !r.error?.includes('already exists'));
    if (realErrors.length > 0) {
      process.exit(1);
    }
  } else if (stat.isFile()) {
    // === 单文件模式 ===
    if (!isImageFile(resolvedPath)) {
      console.error(`❌ Error: Unsupported file format. Supported formats: .png, .jpg, .jpeg, .gif`);
      process.exit(1);
    }

    console.log(`🖼️  Processing file: ${path.basename(resolvedPath)}`);
    const result = await processSingleFile(resolvedPath, options);
    printSingleResult(result);
  } else {
    console.error(`❌ Error: Not a valid file or directory: ${inputPath}`);
    process.exit(1);
  }
}
