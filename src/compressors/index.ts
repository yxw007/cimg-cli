import type { ICompressor } from "../core/compressor.interface.js";
import { PngCompressor } from "./png.compressor.js";
import { JpgCompressor } from "./jpg.compressor.js";
import { GifCompressor } from "./gif.compressor.js";

/**
 * 压缩器注册表 — 根据文件扩展名自动寻找对应压缩器
 * 新增格式只需注册新的 Compressor 实例即可
 */
class CompressorRegistry {
  private compressors = new Map<string, ICompressor>();

  /** 注册一个压缩器（自动绑定其支持的所有扩展名） */
  register(compressor: ICompressor): void {
    for (const ext of compressor.supportedExtensions) {
      this.compressors.set(ext, compressor);
    }
  }

  /** 根据扩展名获取压缩器 */
  getCompressor(ext: string): ICompressor | undefined {
    return this.compressors.get(ext.toLowerCase());
  }
}

/** 全局单例注册表 */
export const registry = new CompressorRegistry();

// 注册内置压缩器
registry.register(new PngCompressor());
registry.register(new JpgCompressor());
registry.register(new GifCompressor());
