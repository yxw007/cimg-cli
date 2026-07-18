import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
//#region src/utils/path.ts
/** 支持的图片扩展名集合 */
const SUPPORTED_EXTENSIONS = /* @__PURE__ */ new Set([
	".png",
	".jpg",
	".jpeg",
	".gif"
]);
/** 判断扩展名是否受支持 */
function isSupported(ext) {
	return SUPPORTED_EXTENSIONS.has(ext.toLowerCase());
}
/** 获取文件扩展名（小写） */
function getExtension(filePath) {
	return path.extname(filePath).toLowerCase();
}
/** 判断文件路径是否为受支持的图片格式 */
function isImageFile(filePath) {
	return isSupported(getExtension(filePath));
}
/**
* 单文件模式：生成输出路径
* - 未指定 -o：在原目录生成 {name}.min.{ext}
* - 指定 -o：使用指定的路径
*/
function getSingleOutputPath(inputPath, outputArg) {
	if (outputArg) return path.resolve(outputArg);
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
function getFolderOutputPath(inputBase, filePath, outputArg) {
	const relPath = path.relative(inputBase, filePath);
	const ext = path.extname(filePath);
	const name = path.basename(filePath, ext);
	const fileDir = path.dirname(relPath);
	if (outputArg) return path.join(path.resolve(outputArg), relPath);
	const outputBase = path.resolve("output");
	const minFileName = `${name}.min${ext}`;
	if (fileDir === ".") return path.join(outputBase, minFileName);
	return path.join(outputBase, fileDir, minFileName);
}
//#endregion
//#region src/utils/file.ts
/** 递归确保目录存在 */
async function ensureDir(dirPath) {
	await fs.mkdir(dirPath, { recursive: true });
}
/** 获取文件大小（字节） */
async function getFileSize(filePath) {
	return (await fs.stat(filePath)).size;
}
/** 检查路径是否存在 */
async function exists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}
/** 递归扫描目录中的图片文件 */
async function scanImages(dirPath) {
	const results = [];
	async function walk(dir) {
		const entries = await fs.readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) await walk(fullPath);
			else if (entry.isFile() && isImageFile(fullPath)) results.push(fullPath);
		}
	}
	await walk(dirPath);
	return results.sort();
}
/** 格式化文件大小为可读字符串 */
function formatSize(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
//#endregion
//#region src/compressors/png.compressor.ts
var PngCompressor = class {
	supportedExtensions = [".png"];
	async compress(inputPath, outputPath, options) {
		try {
			const inputSize = await getFileSize(inputPath);
			await sharp(inputPath).png({ quality: options.quality }).toFile(outputPath);
			return {
				inputPath,
				outputPath,
				inputSize,
				outputSize: await getFileSize(outputPath),
				success: true
			};
		} catch (error) {
			return {
				inputPath,
				outputPath,
				inputSize: 0,
				outputSize: 0,
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
};
//#endregion
//#region src/compressors/jpg.compressor.ts
var JpgCompressor = class {
	supportedExtensions = [".jpg", ".jpeg"];
	async compress(inputPath, outputPath, options) {
		try {
			const inputSize = await getFileSize(inputPath);
			await sharp(inputPath).jpeg({
				quality: options.quality,
				mozjpeg: true
			}).toFile(outputPath);
			return {
				inputPath,
				outputPath,
				inputSize,
				outputSize: await getFileSize(outputPath),
				success: true
			};
		} catch (error) {
			return {
				inputPath,
				outputPath,
				inputSize: 0,
				outputSize: 0,
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
};
//#endregion
//#region src/compressors/gif.compressor.ts
var GifCompressor = class {
	supportedExtensions = [".gif"];
	async compress(inputPath, outputPath, options) {
		try {
			const inputSize = await getFileSize(inputPath);
			await sharp(inputPath, { animated: true }).gif().toFile(outputPath);
			return {
				inputPath,
				outputPath,
				inputSize,
				outputSize: await getFileSize(outputPath),
				success: true
			};
		} catch (error) {
			return {
				inputPath,
				outputPath,
				inputSize: 0,
				outputSize: 0,
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
};
//#endregion
//#region src/compressors/index.ts
/**
* 压缩器注册表 — 根据文件扩展名自动寻找对应压缩器
* 新增格式只需注册新的 Compressor 实例即可
*/
var CompressorRegistry = class {
	compressors = /* @__PURE__ */ new Map();
	/** 注册一个压缩器（自动绑定其支持的所有扩展名） */
	register(compressor) {
		for (const ext of compressor.supportedExtensions) this.compressors.set(ext, compressor);
	}
	/** 根据扩展名获取压缩器 */
	getCompressor(ext) {
		return this.compressors.get(ext.toLowerCase());
	}
};
/** 全局单例注册表 */
const registry = new CompressorRegistry();
registry.register(new PngCompressor());
registry.register(new JpgCompressor());
registry.register(new GifCompressor());
//#endregion
//#region src/core/processor.ts
/** 处理单文件压缩 */
async function processSingleFile(inputPath, options) {
	const ext = getExtension(inputPath);
	const compressor = registry.getCompressor(ext);
	if (!compressor) return {
		inputPath,
		outputPath: "",
		inputSize: 0,
		outputSize: 0,
		success: false,
		error: `Unsupported file format: ${ext}`
	};
	const outputPath = getSingleOutputPath(inputPath, options.outputArg);
	if (!options.force && await exists(outputPath)) return {
		inputPath,
		outputPath,
		inputSize: 0,
		outputSize: 0,
		success: false,
		error: `Output file already exists: ${outputPath}. Use --force to overwrite.`
	};
	await ensureDir(path.dirname(outputPath));
	return compressor.compress(inputPath, outputPath, options);
}
/** 处理文件夹批量压缩 */
async function processFolder(inputPath, options) {
	const images = await scanImages(inputPath);
	if (images.length === 0) return [];
	const results = [];
	for (const imgPath of images) {
		const ext = getExtension(imgPath);
		const compressor = registry.getCompressor(ext);
		if (!compressor) continue;
		const outputPath = getFolderOutputPath(inputPath, imgPath, options.outputArg);
		if (!options.force && await exists(outputPath)) {
			results.push({
				inputPath: imgPath,
				outputPath,
				inputSize: 0,
				outputSize: 0,
				success: false,
				error: "Output file already exists"
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
function printSingleResult(result) {
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
function printFolderResults(results) {
	const successResults = results.filter((r) => r.success);
	for (const r of results) if (r.success) {
		const saved = ((1 - r.outputSize / r.inputSize) * 100).toFixed(1);
		console.log(`  ✅ ${path.relative(process.cwd(), r.inputPath)} → ${path.relative(process.cwd(), r.outputPath)} (${formatSize(r.inputSize)} → ${formatSize(r.outputSize)}, ${saved}% saved)`);
	} else if (r.error?.includes("already exists")) console.log(`  ⏭  Skip: ${path.relative(process.cwd(), r.outputPath)} (already exists)`);
	else console.log(`  ❌ ${r.inputPath}: ${r.error}`);
	if (successResults.length > 0) {
		const totalIn = successResults.reduce((s, r) => s + r.inputSize, 0);
		const totalOut = successResults.reduce((s, r) => s + r.outputSize, 0);
		const totalSaved = ((1 - totalOut / totalIn) * 100).toFixed(1);
		console.log(`\n📊 Summary: ${successResults.length} compressed, ${results.length - successResults.length} skipped/failed`);
		console.log(`   Total: ${formatSize(totalIn)} → ${formatSize(totalOut)} (${totalSaved}% saved)`);
	} else console.log(`\n📊 No images were compressed.`);
}
/**
* 主入口：判断输入路径类型并执行对应的压缩流程
*/
async function processPath(inputPath, options) {
	const resolvedPath = path.resolve(inputPath);
	let stat;
	try {
		stat = await fs.stat(resolvedPath);
	} catch {
		console.error(`❌ Error: Path does not exist: ${inputPath}`);
		process.exit(1);
		return;
	}
	if (stat.isDirectory()) {
		console.log(`📁 Processing folder: ${inputPath}`);
		const results = await processFolder(resolvedPath, options);
		if (results.length === 0) {
			console.log("   No supported images found.");
			return;
		}
		printFolderResults(results);
		if (results.filter((r) => !r.success && !r.error?.includes("already exists")).length > 0) process.exit(1);
	} else if (stat.isFile()) {
		if (!isImageFile(resolvedPath)) {
			console.error(`❌ Error: Unsupported file format. Supported formats: .png, .jpg, .jpeg, .gif`);
			process.exit(1);
		}
		console.log(`🖼️  Processing file: ${path.basename(resolvedPath)}`);
		printSingleResult(await processSingleFile(resolvedPath, options));
	} else {
		console.error(`❌ Error: Not a valid file or directory: ${inputPath}`);
		process.exit(1);
	}
}
//#endregion
//#region src/index.ts
const program = new Command();
program.name("cimg").description("Image compression CLI tool — 支持 PNG / JPG / GIF 格式压缩").version("1.0.0").argument("<input>", "Input file or directory path").option("-o, --output <path>", "Output file or directory path").option("-q, --quality <number>", "Compression quality (0-100)", (v) => parseInt(v, 10), 80).option("--force", "Overwrite existing output files without prompting", false).action(async (input, options) => {
	if (options.quality < 0 || options.quality > 100) {
		console.error("❌ Error: Quality must be between 0 and 100");
		process.exit(1);
	}
	await processPath(input, {
		quality: options.quality,
		force: options.force,
		outputArg: options.output
	});
});
program.parse(process.argv);
//#endregion
export {};
