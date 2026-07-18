import path from "node:path";

/** 支持的图片扩展名集合 */
const SUPPORTED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif"]);

/** 判断扩展名是否受支持 */
export function isSupported(ext: string): boolean {
  return SUPPORTED_EXTENSIONS.has(ext.toLowerCase());
}

/** 获取文件扩展名（小写） */
export function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/** 判断文件路径是否为受支持的图片格式 */
export function isImageFile(filePath: string): boolean {
  return isSupported(getExtension(filePath));
}

/**
 * 单文件模式：生成输出路径
 * - 未指定 -o：在原目录生成 {name}.min.{ext}
 * - 指定 -o：使用指定的路径
 */
export function getSingleOutputPath(inputPath: string, outputArg?: string): string {
  if (outputArg) {
    return path.resolve(outputArg);
  }
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const name = path.basename(inputPath, ext);
  return path.join(dir, `${name}.min${ext}`);
}

/**
 * 文件夹模式：生成输出路径，保持子目录结构
 * - 未指定 -o：输出到 CWD/output/，文件名加 .min 后缀
 * - 指定 -o：输出到指定目录，保持原名
 */
export function getFolderOutputPath(inputBase: string, filePath: string, outputArg?: string): string {
  const relPath = path.relative(inputBase, filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const fileDir = path.dirname(relPath);

  if (outputArg) {
    // 指定输出目录 → 保持原名和相对路径
    return path.join(path.resolve(outputArg), relPath);
  }

  // 默认 → 输出到 ./output/，加 .min 后缀，保持相对路径
  const outputBase = path.resolve("output");
  const minFileName = `${name}.min${ext}`;
  if (fileDir === ".") {
    return path.join(outputBase, minFileName);
  }
  return path.join(outputBase, fileDir, minFileName);
}
