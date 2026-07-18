import { Command } from "commander";
import { processPath } from "./core/processor.js";

const program = new Command();

program
  .name("cimg")
  .description("Image compression CLI tool — 支持 PNG / JPG / GIF 格式压缩")
  .version("1.0.0")
  .argument("<input>", "Input file or directory path")
  .option("-o, --output <path>", "Output file or directory path")
  .option("-q, --quality <number>", "Compression quality (0-100)", (v) => parseInt(v, 10), 80)
  .option("--force", "Overwrite existing output files without prompting", false)
  .action(async (input, options) => {
    if (options.quality < 0 || options.quality > 100) {
      console.error("❌ Error: Quality must be between 0 and 100");
      process.exit(1);
    }

    await processPath(input, {
      quality: options.quality,
      force: options.force,
      outputArg: options.output,
    });
  });

program.parse(process.argv);
