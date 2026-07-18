import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { ensureDir, exists, formatSize, scanImages } from "../../src/utils/file.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cimg-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("ensureDir", () => {
  it("should create a directory", async () => {
    const dirPath = path.join(tmpDir, "nested/deep/dir");
    await ensureDir(dirPath);
    const stat = await fs.stat(dirPath);
    expect(stat.isDirectory()).toBe(true);
  });

  it("should not throw if directory already exists", async () => {
    const dirPath = path.join(tmpDir, "existing");
    await fs.mkdir(dirPath, { recursive: true });
    await expect(ensureDir(dirPath)).resolves.not.toThrow();
  });
});

describe("exists", () => {
  it("should return true for existing path", async () => {
    const filePath = path.join(tmpDir, "test.txt");
    await fs.writeFile(filePath, "hello");
    expect(await exists(filePath)).toBe(true);
  });

  it("should return false for non-existing path", async () => {
    expect(await exists(path.join(tmpDir, "nonexistent.txt"))).toBe(false);
  });
});

describe("formatSize", () => {
  it("should format bytes", () => {
    expect(formatSize(500)).toBe("500 B");
  });

  it("should format kilobytes", () => {
    expect(formatSize(1500)).toBe("1.5 KB");
  });

  it("should format megabytes", () => {
    expect(formatSize(2_000_000)).toBe("1.91 MB");
  });
});

describe("scanImages", () => {
  beforeEach(async () => {
    // Create test files
    await fs.writeFile(path.join(tmpDir, "photo1.png"), "fake-png");
    await fs.writeFile(path.join(tmpDir, "photo2.jpg"), "fake-jpg");
    await fs.writeFile(path.join(tmpDir, "photo3.gif"), "fake-gif");
    await fs.writeFile(path.join(tmpDir, "document.txt"), "text");

    // Create subdirectory with images
    await fs.mkdir(path.join(tmpDir, "subfolder"));
    await fs.writeFile(path.join(tmpDir, "subfolder", "nested.png"), "fake-png");
    await fs.writeFile(path.join(tmpDir, "subfolder", "note.md"), "markdown");
  });

  it("should find all images recursively", async () => {
    const images = await scanImages(tmpDir);
    const relativePaths = images.map((p) => path.relative(tmpDir, p).replace(/\\/g, "/"));

    expect(relativePaths).toContain("photo1.png");
    expect(relativePaths).toContain("photo2.jpg");
    expect(relativePaths).toContain("photo3.gif");
    expect(relativePaths).toContain("subfolder/nested.png");
  });

  it("should not include non-image files", async () => {
    const images = await scanImages(tmpDir);
    const relativePaths = images.map((p) => path.relative(tmpDir, p).replace(/\\/g, "/"));

    expect(relativePaths).not.toContain("document.txt");
    expect(relativePaths).not.toContain("subfolder/note.md");
  });

  it("should return empty array for empty directory", async () => {
    const emptyDir = path.join(tmpDir, "empty");
    await fs.mkdir(emptyDir);
    const images = await scanImages(emptyDir);
    expect(images).toHaveLength(0);
  });
});
