// ============================================================
// 照片出框效果 - 核心类型定义
// ============================================================

// ------------------------------------------------------------
// 图片验证相关类型
// ------------------------------------------------------------

/** 验证结果 */
export interface ValidationResult {
  valid: boolean;
  error?: ValidationError;
}

/** 验证错误类型（联合类型，精确匹配失败原因） */
export type ValidationError =
  | { type: 'invalid_format'; supportedFormats: string[] }
  | { type: 'file_too_large'; maxSizeMB: number }
  | { type: 'file_empty' };

// ------------------------------------------------------------
// 前景分割相关类型
// ------------------------------------------------------------

/** 分割结果 */
export interface SegmentationResult {
  /** 前景遮罩，与原图同尺寸的灰度 ImageData */
  mask: ImageData;
  /** 是否成功识别到前景主体 */
  hasSubject: boolean;
  /** 主体在原图中的边界框 */
  subjectBounds: BoundingBox;
}

/** 边界框 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ------------------------------------------------------------
// 尺寸与矩形
// ------------------------------------------------------------

/** 尺寸 */
export interface Size {
  width: number;
  height: number;
}

/** 矩形区域 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ------------------------------------------------------------
// 相框相关类型
// ------------------------------------------------------------

/** 相框配置 */
export interface FrameConfig {
  /** 边框宽度（像素），默认 40 */
  borderWidth: number;
  /** 底部额外宽度（用于展示参数），默认 100 */
  bottomPadding: number;
  /** 相框颜色，默认白色 */
  frameColor: string;
}

/** 相框布局（由相框生成器计算得出） */
export interface FrameLayout {
  /** 相框外部总尺寸 */
  outerSize: Size;
  /** 照片在相框内的绘制区域 */
  photoRect: Rect;
  /** 参数文字区域 */
  metadataRect: Rect;
  /** 相框边框路径（用于 Canvas 绘制） */
  framePath: Path2D;
}

// ------------------------------------------------------------
// 图层合成相关类型
// ------------------------------------------------------------

/** 拍摄参数文字位置 */
export type MetadataPosition = 'center' | 'left' | 'right';

/** 合成参数 */
export interface CompositeParams {
  /** 原始照片 */
  photo: HTMLImageElement;
  /** 前景遮罩 */
  mask: ImageData;
  /** 相框布局 */
  frameLayout: FrameLayout;
  /** 背景颜色 */
  backgroundColor: string;
  /** 相框颜色 */
  frameColor: string;
  /** 照片在相框内的偏移量 */
  photoOffset: { x: number; y: number };
  /** 照片缩放比例 */
  photoScale: number;
  /** 拍摄参数文字 */
  metadataText: string;
  /** 拍摄参数文字大小（像素） */
  metadataFontSize: number;
  /** 拍摄参数文字颜色 */
  metadataColor: string;
  /** 拍摄参数文字位置 */
  metadataPosition: MetadataPosition;
}

/** 导出格式 */
export type ExportFormat = 'png' | 'jpeg' | 'webm';

// ------------------------------------------------------------
// EXIF 相关类型
// ------------------------------------------------------------

/** EXIF 拍摄参数数据 */
export interface ExifData {
  /** 设备型号 */
  cameraModel: string | null;
  /** ISO 感光度 */
  iso: number | null;
  /** 光圈值 */
  aperture: number | null;
  /** 快门速度（如 "1/250"） */
  shutterSpeed: string | null;
  /** 焦距（mm） */
  focalLength: number | null;
  /** 拍摄日期 */
  dateTime: string | null;
}

// ------------------------------------------------------------
// 应用状态相关类型
// ------------------------------------------------------------

/** 处理阶段 */
export type ProcessStage =
  | 'upload'       // 等待上传
  | 'validating'   // 验证中
  | 'segmenting'   // 分割中
  | 'preview'      // 分割预览
  | 'composing'    // 合成中
  | 'adjusting'    // 调整中
  | 'exporting';   // 导出中

/** 应用状态 */
export interface AppState {
  /** 当前处理阶段 */
  stage: ProcessStage;
  /** 原始照片文件 */
  originalFile: File | null;
  /** 原始照片 HTMLImageElement */
  originalImage: HTMLImageElement | null;
  /** 分割结果 */
  segmentation: SegmentationResult | null;
  /** 相框配置 */
  frameConfig: FrameConfig;
  /** 相框布局 */
  frameLayout: FrameLayout | null;
  /** EXIF 数据 */
  exifData: ExifData | null;
  /** 用户自定义的参数展示文字 */
  customMetadataText: string | null;
  /** 拍摄参数文字大小 */
  metadataFontSize: number;
  /** 拍摄参数文字颜色 */
  metadataColor: string;
  /** 拍摄参数文字位置 */
  metadataPosition: MetadataPosition;
  /** 照片位置偏移 */
  photoOffset: { x: number; y: number };
  /** 照片缩放比例 */
  photoScale: number;
  /** 背景颜色 */
  backgroundColor: string;
  /** 导出格式 */
  exportFormat: ExportFormat;
  /** 错误信息 */
  error: string | null;
}
