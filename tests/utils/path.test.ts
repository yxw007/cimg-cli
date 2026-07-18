import { describe, it, expect } from 'vitest';
import path from 'node:path';
import {
  isSupported,
  getExtension,
  isImageFile,
  getSingleOutputPath,
  getFolderOutputPath,
} from '../../src/utils/path.js';

const SEP = path.sep;

describe('isSupported', () => {
  it('should support .png', () => {
    expect(isSupported('.png')).toBe(true);
  });

  it('should support .jpg', () => {
    expect(isSupported('.jpg')).toBe(true);
  });

  it('should support .jpeg', () => {
    expect(isSupported('.jpeg')).toBe(true);
  });

  it('should support .gif', () => {
    expect(isSupported('.gif')).toBe(true);
  });

  it('should support case-insensitive extensions', () => {
    expect(isSupported('.PNG')).toBe(true);
    expect(isSupported('.JPG')).toBe(true);
    expect(isSupported('.GIF')).toBe(true);
  });

  it('should not support unsupported extensions', () => {
    expect(isSupported('.webp')).toBe(false);
    expect(isSupported('.svg')).toBe(false);
    expect(isSupported('.bmp')).toBe(false);
    expect(isSupported('.txt')).toBe(false);
  });
});

describe('getExtension', () => {
  it('should get extension from path', () => {
    expect(getExtension('/path/to/image.png')).toBe('.png');
    expect(getExtension('/path/to/image.JPG')).toBe('.jpg');
    expect(getExtension('image.GIF')).toBe('.gif');
  });

  it('should return empty string for files without extension', () => {
    expect(getExtension('/path/to/file')).toBe('');
  });
});

describe('isImageFile', () => {
  it('should return true for image files', () => {
    expect(isImageFile('photo.png')).toBe(true);
    expect(isImageFile('photo.jpg')).toBe(true);
    expect(isImageFile('photo.jpeg')).toBe(true);
    expect(isImageFile('photo.gif')).toBe(true);
  });

  it('should return false for non-image files', () => {
    expect(isImageFile('document.txt')).toBe(false);
    expect(isImageFile('script.js')).toBe(false);
  });
});

describe('getSingleOutputPath', () => {
  it('should append .min suffix when no output arg', () => {
    const result = getSingleOutputPath('/path/to/image.png');
    expect(result).toContain('image.min.png');
  });

  it('should append .min suffix for jpg', () => {
    const result = getSingleOutputPath('/path/to/image.jpg');
    expect(result).toContain('image.min.jpg');
  });

  it('should append .min suffix for gif', () => {
    const result = getSingleOutputPath('/path/to/image.gif');
    expect(result).toContain('image.min.gif');
  });

  it('should use output arg when provided', () => {
    const result = getSingleOutputPath('/path/to/image.png', '/custom/output.png');
    expect(result).toContain('output.png');
  });

  it('should resolve relative output arg', () => {
    const result = getSingleOutputPath('/path/to/image.png', 'output.png');
    expect(result).toContain('output.png');
    // Should be absolute (resolved)
    expect(path.isAbsolute(result)).toBe(true);
  });
});

describe('getFolderOutputPath', () => {
  const inputBase = '/project/images';

  it('should output to ./output/ with .min suffix when no output arg', () => {
    const result = getFolderOutputPath(inputBase, '/project/images/photo.png');
    expect(result).toContain('output');
    expect(result).toContain('photo.min.png');
  });

  it('should preserve subdirectory structure with .min suffix when no output arg', () => {
    const result = getFolderOutputPath(inputBase, '/project/images/sub/folder/photo.png');
    expect(result).toContain('output');
    expect(result.replace(/\\/g, '/')).toContain('sub/folder');
    expect(result).toContain('photo.min.png');
  });

  it('should use output arg dir and keep original name', () => {
    const result = getFolderOutputPath(
      inputBase,
      '/project/images/photo.png',
      '/build',
    );
    expect(result.replace(/\\/g, '/')).toContain('/build/photo.png');
  });

  it('should preserve subdirectory structure in output dir with original name', () => {
    const result = getFolderOutputPath(
      inputBase,
      '/project/images/sub/folder/photo.png',
      '/build',
    );
    expect(result.replace(/\\/g, '/')).toContain('/build/sub/folder/photo.png');
  });

  it('should resolve relative output arg to absolute', () => {
    const result = getFolderOutputPath(
      inputBase,
      '/project/images/photo.png',
      'build',
    );
    // Result should be absolute
    expect(path.isAbsolute(result)).toBe(true);
    expect(result.replace(/\\/g, '/')).toContain('build/photo.png');
  });
});
