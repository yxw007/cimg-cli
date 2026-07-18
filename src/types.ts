/** 压缩选项 */
export interface CompressOptions {
  quality: number;
  force: boolean;
}

/** 处理选项（扩展 CompressOptions 增加输出参数） */
export interface ProcessOptions extends CompressOptions {
  outputArg?: string;
}

/** 单文件压缩结果 */
export interface CompressResult {
  inputPath: string;
  outputPath: string;
  inputSize: number;
  outputSize: number;
  success: boolean;
  error?: string;
}
