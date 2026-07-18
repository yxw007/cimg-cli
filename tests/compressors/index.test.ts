import { describe, it, expect } from "vitest";
import { registry } from "../../src/compressors/index.js";
import { PngCompressor } from "../../src/compressors/png.compressor.js";
import { JpgCompressor } from "../../src/compressors/jpg.compressor.js";
import { GifCompressor } from "../../src/compressors/gif.compressor.js";

describe("CompressorRegistry", () => {
  it("should find PNG compressor", () => {
    const compressor = registry.getCompressor(".png");
    expect(compressor).toBeInstanceOf(PngCompressor);
  });

  it("should find JPG compressor", () => {
    const compressor = registry.getCompressor(".jpg");
    expect(compressor).toBeInstanceOf(JpgCompressor);
  });

  it("should find JPEG compressor", () => {
    const compressor = registry.getCompressor(".jpeg");
    expect(compressor).toBeInstanceOf(JpgCompressor);
  });

  it("should find GIF compressor", () => {
    const compressor = registry.getCompressor(".gif");
    expect(compressor).toBeInstanceOf(GifCompressor);
  });

  it("should be case insensitive", () => {
    const compressor = registry.getCompressor(".PNG");
    expect(compressor).toBeInstanceOf(PngCompressor);
  });

  it("should return undefined for unsupported format", () => {
    const compressor = registry.getCompressor(".webp");
    expect(compressor).toBeUndefined();
  });
});
