# cimg-cli

一款轻量、高效的**图片压缩 CLI 工具**，支持 PNG、JPG/JPEG、GIF 格式的批量压缩与单文件压缩。

## 特性

- 🖼️ 支持 **PNG / JPG / JPEG / GIF** 四种常见图片格式
- 📁 **文件夹批量压缩** — 自动递归扫描目录下所有支持的图片
- 📄 **单文件压缩** — 指定单个图片文件即可压缩
- 🎚️ **可调压缩质量** — 通过 `-q` / `--quality` 参数控制（0–100）
- 📂 **自定义输出路径** — 通过 `-o` / `--output` 指定输出目录或文件名
- 🔄 **保持目录结构** — 文件夹模式下保持原始子目录结构
- ⏭️ **防覆盖保护** — 默认跳过已存在的输出文件，`--force` 可强制覆盖
- 📊 **压缩统计** — 显示压缩前后大小对比与节省比例
- ⚡ **基于 sharp** — 使用高性能 `sharp` 库进行图片处理
- 🧩 **可扩展架构** — 基于接口设计，易于扩展支持更多图片格式

## 安装

```bash
npm install -g cimg-cli
```

或者使用 npx：

```bash
npx cimg-cli <input> [options]
```

## 快速开始

### 压缩单张图片

```bash
# 使用默认质量（80），输出为 .min.{ext}
cimg ./images/photo.png

# 指定压缩质量为 30
cimg ./images/photo.png -q 30

# 指定输出文件路径
cimg ./images/photo.png -o ./compressed/photo.png
```

### 压缩文件夹

```bash
# 压缩文件夹下所有图片，默认输出到 ./output/ 目录
cimg ./images

# 指定输出目录
cimg ./images -o ./build

# 指定压缩质量
cimg ./images -q 30 -o ./build
```

## 使用指南

### 命令行参数

| 参数          | 全称                 | 描述                 | 默认值     |
| ------------- | -------------------- | -------------------- | ---------- |
| `<input>`     | —                    | 输入文件或文件夹路径 | **必填**   |
| `-o <path>`   | `--output <path>`    | 输出文件或目录路径   | 见下方说明 |
| `-q <number>` | `--quality <number>` | 压缩质量 (0–100)     | `80`       |
| `--force`     | —                    | 覆盖已存在的输出文件 | `false`    |
| `-V`          | `--version`          | 查看版本号           | —          |
| `-h`          | `--help`             | 查看帮助信息         | —          |

### 输出路径规则

#### 单文件模式

- **未指定 `-o`**：在原目录生成 `{文件名}.min.{扩展名}`
  - 例：`cimg /path/to/photo.png` → `/path/to/photo.min.png`
- **指定 `-o`**：使用指定的完整路径作为输出
  - 例：`cimg /path/to/photo.png -o /path/to/compressed.png` → `/path/to/compressed.png`

#### 文件夹模式

- **未指定 `-o`**：输出到当前工作目录下的 `output/` 目录，文件加 `.min` 后缀，保持原始相对路径

  ```
  输入目录：
  /d/xx/a.png
  /d/xx/yy/b.jpg

  压缩后：
  ./output/a.min.png
  ./output/yy/b.min.jpg
  ```

- **指定 `-o`**：输出到指定目录，保持原名和相对路径

  ```
  cimg /d/xx -o ./build

  压缩后：
  ./build/a.png
  ./build/yy/b.jpg
  ```

### 示例

```bash
# 压缩单文件并指定质量
cimg ./images/banner.png -q 50

# 文件夹压缩到指定目录
cimg ./images -o ./build -q 30

# 强制覆盖已存在的输出文件
cimg ./images -o ./build --force

# 查看帮助
cimg --help
```

## 输出示例

### 单文件压缩

```
🖼️  Processing file: photo.png
  ✅ photo.min.png
  📊 1.2 MB → 0.4 MB (66.7% saved)
```

### 文件夹压缩

```
📁 Processing folder: ./images
  ✅ images/banner.png → output/banner.min.png (2.1 MB → 0.3 MB, 85.7% saved)
  ✅ images/photo.jpg → output/photo.min.jpg (1.5 MB → 0.6 MB, 60.0% saved)
  ✅ images/sub/icon.gif → output/sub/icon.min.gif (0.8 MB → 0.5 MB, 37.5% saved)

📊 Summary: 3 compressed, 0 skipped/failed
   Total: 4.4 MB → 1.4 MB (68.2% saved)
```

## 支持的格式

| 格式       | 扩展名          | 压缩方式                      |
| ---------- | --------------- | ----------------------------- |
| PNG        | `.png`          | sharp png (quality)           |
| JPG / JPEG | `.jpg`, `.jpeg` | sharp jpeg (quality, mozjpeg) |
| GIF        | `.gif`          | sharp gif (animated)          |

## 开发

### 技术栈

- **TypeScript** — 类型安全
- **sharp** — 高性能图片处理
- **commander** — CLI 框架
- **Rolldown** — 打包构建
- **Vitest** — 单元测试

### 克隆与开发

```bash
# 克隆仓库
git clone https://github.com/yxw007/cimg-cli.git
cd cimg-cli

# 安装依赖
npm install

# 开发模式（监听文件变化自动构建）
npm run dev

# 构建
npm run build

# 运行测试
npm test

# 本地测试 CLI
node bin/cimg.js ./test.png -q 80
```

### 项目结构

```
cimg-cli/
├── bin/
│   └── cimg.js            # CLI 入口
├── src/
│   ├── index.ts            # 主入口（commander 配置）
│   ├── types.ts            # 类型定义
│   ├── core/
│   │   ├── compressor.interface.ts  # 压缩器接口
│   │   └── processor.ts             # 压缩处理逻辑
│   ├── compressors/
│   │   ├── index.ts                 # 压缩器注册表
│   │   ├── png.compressor.ts        # PNG 压缩器
│   │   ├── jpg.compressor.ts        # JPG 压缩器
│   │   └── gif.compressor.ts        # GIF 压缩器
│   └── utils/
│       ├── path.ts         # 路径工具函数
│       └── file.ts         # 文件工具函数
├── tests/                  # 单元测试
├── rolldown.config.mts     # Rolldown 构建配置
├── tsconfig.json           # TypeScript 配置
├── vitest.config.ts        # Vitest 测试配置
└── package.json
```

### 扩展新图片格式

`cimg-cli` 采用接口化设计，新增图片格式只需实现 `ICompressor` 接口并注册即可：

```typescript
import type { ICompressor } from "../core/compressor.interface.js";
import type { CompressOptions, CompressResult } from "../types.js";

export class WebpCompressor implements ICompressor {
  readonly supportedExtensions = [".webp"];

  async compress(inputPath: string, outputPath: string, options: CompressOptions): Promise<CompressResult> {
    // 实现压缩逻辑
  }
}
```

然后在 `src/compressors/index.ts` 中注册：

```typescript
registry.register(new WebpCompressor());
```

## 许可证

[MIT](./LICENSE) © yxw007
