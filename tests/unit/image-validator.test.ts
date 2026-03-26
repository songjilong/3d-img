import { describe, it, expect } from 'vitest';
import { validate } from '../../src/core/image-validator';

/**
 * 创建模拟 File 对象的辅助函数
 */
function createMockFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe('ImageValidator - validate', () => {
  // 合法格式通过验证
  it('应接受合法的 JPEG 文件', () => {
    const file = createMockFile('photo.jpg', 1024, 'image/jpeg');
    const result = validate(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('应接受合法的 PNG 文件', () => {
    const file = createMockFile('photo.png', 1024, 'image/png');
    const result = validate(file);
    expect(result.valid).toBe(true);
  });

  it('应接受合法的 WebP 文件', () => {
    const file = createMockFile('photo.webp', 1024, 'image/webp');
    const result = validate(file);
    expect(result.valid).toBe(true);
  });

  // 空文件拒绝
  it('应拒绝空文件并返回 file_empty 错误', () => {
    const file = createMockFile('empty.jpg', 0, 'image/jpeg');
    const result = validate(file);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({ type: 'file_empty' });
  });

  // 非法格式拒绝
  it('应拒绝不支持的格式并返回 invalid_format 错误', () => {
    const file = createMockFile('doc.pdf', 1024, 'application/pdf');
    const result = validate(file);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({
      type: 'invalid_format',
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    });
  });

  it('应拒绝 GIF 格式', () => {
    const file = createMockFile('anim.gif', 1024, 'image/gif');
    const result = validate(file);
    expect(result.valid).toBe(false);
    expect(result.error?.type).toBe('invalid_format');
  });

  // 超大文件拒绝
  it('应拒绝超过 20MB 的文件并返回 file_too_large 错误', () => {
    const overSize = 20 * 1024 * 1024 + 1;
    const file = createMockFile('big.jpg', overSize, 'image/jpeg');
    const result = validate(file);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({
      type: 'file_too_large',
      maxSizeMB: 20,
    });
  });

  // 恰好 20MB 应通过
  it('应接受恰好 20MB 的文件', () => {
    const exactSize = 20 * 1024 * 1024;
    const file = createMockFile('exact.jpg', exactSize, 'image/jpeg');
    const result = validate(file);
    expect(result.valid).toBe(true);
  });

  // 验证优先级：空文件优先于格式检查
  it('空文件优先于格式错误', () => {
    const file = createMockFile('empty.pdf', 0, 'application/pdf');
    const result = validate(file);
    expect(result.valid).toBe(false);
    expect(result.error?.type).toBe('file_empty');
  });

  // 验证优先级：格式检查优先于大小检查
  it('格式错误优先于大小错误', () => {
    const overSize = 20 * 1024 * 1024 + 1;
    const file = createMockFile('big.pdf', overSize, 'application/pdf');
    const result = validate(file);
    expect(result.valid).toBe(false);
    expect(result.error?.type).toBe('invalid_format');
  });
});
