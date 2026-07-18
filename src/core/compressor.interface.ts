import type { CompressOptions, CompressResult } from "../types.js";

/** 压缩器接口 — 所有格式的压缩器需实现此接口 */
export interface ICompressor {
  /** 支持的扩展名列表（小写，含点号，如 .png, .jpg） */
  readonly supportedExtensions: string[];

  /**
   * 压缩图片
   * @param inputPath - 输入文件路径
   * @param outputPath - 输出文件路径
   * @param options - 压缩选项
   */
  compress(inputPath: string, outputPath: string, options: CompressOptions): Promise<CompressResult>;
}
