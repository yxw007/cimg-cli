import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { processPath } from "../../src/core/processor.js";

// Disable sharp cache to avoid EBUSY on Windows
sharp.cache(false);

let tmpDir: string;
let originalCwd: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cimg-test-"));
  originalCwd = process.cwd();
  process.chdir(tmpDir);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  process.chdir(originalCwd);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  vi.restoreAllMocks();
});

async function createTestPng(name: string): Promise<string> {
  const filePath = path.join(tmpDir, name);
  const buffer = await sharp({
    create: { width: 50, height: 50, channels: 4, background: { r: 128, g: 128, b: 128, alpha: 1 } },
  })
    .png()
    .toBuffer();
  await fs.writeFile(filePath, buffer);
  return filePath;
}

async function createTestJpg(name: string): Promise<string> {
  const filePath = path.join(tmpDir, name);
  const buffer = await sharp({
    create: { width: 50, height: 50, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .jpeg()
    .toBuffer();
  await fs.writeFile(filePath, buffer);
  return filePath;
}

async function createTestGif(name: string): Promise<string> {
  const filePath = path.join(tmpDir, name);
  const buffer = await sharp({
    create: { width: 50, height: 50, channels: 4, background: { r: 128, g: 128, b: 128, alpha: 1 } },
  })
    .gif()
    .toBuffer();
  await fs.writeFile(filePath, buffer);
  return filePath;
}

describe("processPath - single file mode", () => {
  it("should compress a single PNG file with default output", async () => {
    const inputPath = await createTestPng("photo.png");

    await processPath(inputPath, { quality: 80, force: false });

    const outputPath = path.join(path.dirname(inputPath), "photo.min.png");
    const exists = await fs
      .stat(outputPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  it("should compress to custom output path", async () => {
    const inputPath = await createTestPng("photo.png");
    const outputPath = path.join(tmpDir, "custom.png");

    await processPath(inputPath, { quality: 80, force: false, outputArg: outputPath });

    const exists = await fs
      .stat(outputPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  it("should exit with error for unsupported format", async () => {
    const filePath = path.join(tmpDir, "document.txt");
    await fs.writeFile(filePath, "text");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await processPath(filePath, { quality: 80, force: false });

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Unsupported"));
  });

  it("should exit with error for non-existent path", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await processPath("/nonexistent/path.png", { quality: 80, force: false });

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("not exist"));
  });
});

describe("processPath - folder mode", () => {
  beforeEach(async () => {
    await createTestPng("a.png");
    await createTestJpg("b.jpg");
    await createTestGif("c.gif");
    await fs.writeFile(path.join(tmpDir, "readme.txt"), "text");
    // Subdirectory
    await fs.mkdir(path.join(tmpDir, "sub"));
    await createTestPng("sub/nested.png");
  });

  it("should compress all images in folder to default output", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    await processPath(tmpDir, { quality: 80, force: false });

    const outputDir = path.join(tmpDir, "output");
    expect(
      await fs
        .stat(path.join(outputDir, "a.png"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(
      await fs
        .stat(path.join(outputDir, "b.jpg"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(
      await fs
        .stat(path.join(outputDir, "c.gif"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(
      await fs
        .stat(path.join(outputDir, "sub", "nested.png"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("should not include non-image files", async () => {
    await processPath(tmpDir, { quality: 80, force: false });

    const outputDir = path.join(tmpDir, "output");
    expect(
      await fs
        .stat(path.join(outputDir, "readme.txt"))
        .then(() => true)
        .catch(() => false),
    ).toBe(false);
  });

  it("should output to custom directory with original names", async () => {
    const buildDir = path.join(tmpDir, "build");

    await processPath(tmpDir, { quality: 80, force: false, outputArg: buildDir });

    expect(
      await fs
        .stat(path.join(buildDir, "a.png"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(
      await fs
        .stat(path.join(buildDir, "b.jpg"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(
      await fs
        .stat(path.join(buildDir, "c.gif"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(
      await fs
        .stat(path.join(buildDir, "sub", "nested.png"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
  });

  it("should skip existing files without --force", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    // First pass
    await processPath(tmpDir, { quality: 80, force: false });

    // Second pass - should skip
    await processPath(tmpDir, { quality: 80, force: false });

    // Output should still exist
    const outputDir = path.join(tmpDir, "output");
    expect(
      await fs
        .stat(path.join(outputDir, "a.png"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("should overwrite with --force", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // First pass
    await processPath(tmpDir, { quality: 80, force: true });

    // Second pass with --force
    await processPath(tmpDir, { quality: 80, force: true });

    const outputDir = path.join(tmpDir, "output");
    expect(
      await fs
        .stat(path.join(outputDir, "a.png"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
