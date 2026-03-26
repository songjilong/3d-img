// ============================================================
// EXIF 解析器单元测试
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { parse, formatForDisplay } from '../../src/core/exif-parser';
import type { ExifData } from '../../src/types';

describe('parse', () => {
  it('解析失败时应返回全 null 的 ExifData', async () => {
    // 创建一个空文件，无法解析 EXIF
    const file = new File([], 'empty.jpg', { type: 'image/jpeg' });
    const result = await parse(file);

    expect(result).toEqual({
      cameraModel: null,
      iso: null,
      aperture: null,
      shutterSpeed: null,
      focalLength: null,
      dateTime: null,
    });
  });

  it('非图片文件应静默返回全 null', async () => {
    const file = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    const result = await parse(file);

    expect(result).toEqual({
      cameraModel: null,
      iso: null,
      aperture: null,
      shutterSpeed: null,
      focalLength: null,
      dateTime: null,
    });
  });
});

describe('formatForDisplay', () => {
  it('全 null 数据应返回空字符串', () => {
    const data: ExifData = {
      cameraModel: null,
      iso: null,
      aperture: null,
      shutterSpeed: null,
      focalLength: null,
      dateTime: null,
    };

    expect(formatForDisplay(data)).toBe('');
  });

  it('应包含所有非 null 字段', () => {
    const data: ExifData = {
      cameraModel: 'Canon EOS R5',
      iso: 400,
      aperture: 2.8,
      shutterSpeed: '1/250',
      focalLength: 50,
      dateTime: '2024:01:15 14:30:00',
    };

    const result = formatForDisplay(data);

    expect(result).toContain('Canon EOS R5');
    expect(result).toContain('50mm');
    expect(result).toContain('f/2.8');
    expect(result).toContain('1/250s');
    expect(result).toContain('ISO 400');
    expect(result).toContain('2024:01:15 14:30:00');
  });

  it('仅包含部分字段时应只输出非 null 字段', () => {
    const data: ExifData = {
      cameraModel: 'iPhone 15 Pro',
      iso: null,
      aperture: 1.8,
      shutterSpeed: null,
      focalLength: null,
      dateTime: null,
    };

    const result = formatForDisplay(data);

    expect(result).toContain('iPhone 15 Pro');
    expect(result).toContain('f/1.8');
    // 不应包含 null 字段的标签
    expect(result).not.toContain('ISO');
    expect(result).not.toContain('mm');
    expect(result).not.toContain('s');
  });

  it('仅有 ISO 时应正确格式化', () => {
    const data: ExifData = {
      cameraModel: null,
      iso: 3200,
      aperture: null,
      shutterSpeed: null,
      focalLength: null,
      dateTime: null,
    };

    expect(formatForDisplay(data)).toBe('ISO 3200');
  });
});
