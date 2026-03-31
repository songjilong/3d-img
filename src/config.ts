import type { ExportFormat, MetadataPosition } from './types';

// ============================================================
// 照片出框效果 - 默认配置常量
// ============================================================

export const DEFAULT_CONFIG = {
  /** 支持的文件格式 */
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'] as const,
  /** 最大文件大小（字节），20MB */
  MAX_FILE_SIZE: 20 * 1024 * 1024,
  /** 默认边框宽度 */
  DEFAULT_BORDER_WIDTH: 40,
  /** 默认底部留白 */
  DEFAULT_BOTTOM_PADDING: 100,
  /** 默认相框颜色 */
  DEFAULT_FRAME_COLOR: '#FFFFFF',
  /** 默认背景颜色 */
  DEFAULT_BG_COLOR: '#1a1a2e',
  /** 默认缩放比例 */
  DEFAULT_SCALE: 1.0,
  /** 默认导出格式 */
  DEFAULT_EXPORT_FORMAT: 'png' as ExportFormat,
  /** 默认拍摄参数文字大小 */
  DEFAULT_METADATA_FONT_SIZE: 24,
  /** 默认拍摄参数文字颜色 */
  DEFAULT_METADATA_COLOR: '#666666',
  /** 默认拍摄参数文字位置 */
  DEFAULT_METADATA_POSITION: 'center' as MetadataPosition,
} as const;
