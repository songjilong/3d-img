import { describe, it, expect } from 'vitest';
import { generateFrame } from '../../src/core/frame-generator';
import type { Size, FrameConfig } from '../../src/types';

describe('generateFrame', () => {
  // 默认配置
  const defaultConfig: FrameConfig = {
    borderWidth: 40,
    bottomPadding: 100,
    frameColor: '#FFFFFF',
  };

  it('横向照片：photoRect 保持原始宽高', () => {
    const photoSize: Size = { width: 800, height: 600 };
    const layout = generateFrame(photoSize, defaultConfig);

    expect(layout.photoRect.width).toBe(800);
    expect(layout.photoRect.height).toBe(600);
  });

  it('纵向照片：photoRect 保持原始宽高', () => {
    const photoSize: Size = { width: 600, height: 800 };
    const layout = generateFrame(photoSize, defaultConfig);

    expect(layout.photoRect.width).toBe(600);
    expect(layout.photoRect.height).toBe(800);
  });

  it('outerSize 满足公式：width = photo.width + 2*borderWidth, height = photo.height + borderWidth + bottomPadding', () => {
    const photoSize: Size = { width: 1000, height: 750 };
    const layout = generateFrame(photoSize, defaultConfig);

    expect(layout.outerSize.width).toBe(1000 + 2 * 40);
    expect(layout.outerSize.height).toBe(750 + 40 + 100);
  });

  it('photoRect 位置在 (borderWidth, borderWidth)', () => {
    const photoSize: Size = { width: 500, height: 400 };
    const layout = generateFrame(photoSize, defaultConfig);

    expect(layout.photoRect.x).toBe(40);
    expect(layout.photoRect.y).toBe(40);
  });

  it('metadataRect 位于照片下方，高度为 bottomPadding 减去内边距', () => {
    const photoSize: Size = { width: 500, height: 400 };
    const layout = generateFrame(photoSize, defaultConfig);

    // metadataRect 应在照片区域下方
    expect(layout.metadataRect.y).toBeGreaterThan(layout.photoRect.y + layout.photoRect.height);
    // metadataRect 高度 = bottomPadding - 2 * padding(10)
    expect(layout.metadataRect.height).toBe(100 - 2 * 10);
    expect(layout.metadataRect.width).toBe(layout.photoRect.width);
  });

  it('自定义边框宽度生效', () => {
    const photoSize: Size = { width: 600, height: 400 };
    const customConfig: FrameConfig = {
      borderWidth: 80,
      bottomPadding: 150,
      frameColor: '#000000',
    };
    const layout = generateFrame(photoSize, customConfig);

    expect(layout.outerSize.width).toBe(600 + 2 * 80);
    expect(layout.outerSize.height).toBe(400 + 80 + 150);
    expect(layout.photoRect.x).toBe(80);
    expect(layout.photoRect.y).toBe(80);
  });

  it('framePath 是 Path2D 实例', () => {
    const photoSize: Size = { width: 400, height: 300 };
    const layout = generateFrame(photoSize, defaultConfig);

    expect(layout.framePath).toBeInstanceOf(Path2D);
  });

  it('正方形照片：宽高比保持一致', () => {
    const photoSize: Size = { width: 500, height: 500 };
    const layout = generateFrame(photoSize, defaultConfig);

    const originalRatio = photoSize.width / photoSize.height;
    const resultRatio = layout.photoRect.width / layout.photoRect.height;
    expect(Math.abs(originalRatio - resultRatio)).toBeLessThan(0.01);
  });
});
