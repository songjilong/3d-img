import type { Size, FrameConfig, FrameLayout } from '../types';

// 元数据区域内边距（上下各留出的空间）
const METADATA_PADDING = 10;

/**
 * 根据照片尺寸和相框配置生成宝丽来风格的相框布局
 * @param photoSize 照片的宽高
 * @param config 相框配置（边框宽度、底部留白、颜色）
 * @returns 相框布局参数，包含外部尺寸、照片区域、元数据区域和边框路径
 */
export function generateFrame(photoSize: Size, config: FrameConfig): FrameLayout {
  const { borderWidth, bottomPadding } = config;

  // 照片区域：保持原始照片的宽高，位于相框内部
  const photoRect = {
    x: borderWidth,
    y: borderWidth,
    width: photoSize.width,
    height: photoSize.height,
  };

  // 相框外部总尺寸
  const outerSize: Size = {
    width: photoRect.width + 2 * borderWidth,
    height: photoRect.height + borderWidth + bottomPadding,
  };

  // 元数据文字区域：位于照片下方，底部留白区域内（减去内边距）
  const metadataRect = {
    x: borderWidth,
    y: photoRect.y + photoRect.height + METADATA_PADDING,
    width: photoRect.width,
    height: bottomPadding - 2 * METADATA_PADDING,
  };

  // 构建相框边框路径（外部矩形减去内部照片区域）
  const framePath = buildFramePath(outerSize, photoRect);

  return {
    outerSize,
    photoRect,
    metadataRect,
    framePath,
  };
}

/**
 * 构建相框边框的 Path2D 路径
 * 使用外部矩形顺时针 + 内部矩形逆时针的方式，形成镂空效果
 * @param outerSize 相框外部尺寸
 * @param photoRect 照片区域（内部镂空区域）
 * @returns 相框边框的 Path2D 路径
 */
function buildFramePath(
  outerSize: Size,
  photoRect: { x: number; y: number; width: number; height: number },
): Path2D {
  const path = new Path2D();

  // 外部矩形（顺时针）
  path.rect(0, 0, outerSize.width, outerSize.height);

  // 内部照片区域（逆时针，形成镂空）
  // Path2D.rect 默认顺时针，需要手动逆时针绘制以实现减法效果
  const { x, y, width, height } = photoRect;
  path.moveTo(x, y);
  path.lineTo(x, y + height);
  path.lineTo(x + width, y + height);
  path.lineTo(x + width, y);
  path.closePath();

  return path;
}
