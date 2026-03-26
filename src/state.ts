// ============================================================
// 照片出框效果 - 应用状态管理
// ============================================================

import type { AppState, ProcessStage } from './types';
import { DEFAULT_CONFIG } from './config';

// 初始应用状态，使用 DEFAULT_CONFIG 中的默认值
const state: AppState = {
  stage: 'upload',
  originalFile: null,
  originalImage: null,
  segmentation: null,
  frameConfig: {
    borderWidth: DEFAULT_CONFIG.DEFAULT_BORDER_WIDTH,
    bottomPadding: DEFAULT_CONFIG.DEFAULT_BOTTOM_PADDING,
    frameColor: DEFAULT_CONFIG.DEFAULT_FRAME_COLOR,
  },
  frameLayout: null,
  exifData: null,
  customMetadataText: null,
  photoOffset: { x: 0, y: 0 },
  photoScale: DEFAULT_CONFIG.DEFAULT_SCALE,
  backgroundColor: DEFAULT_CONFIG.DEFAULT_BG_COLOR,
  exportFormat: DEFAULT_CONFIG.DEFAULT_EXPORT_FORMAT,
  error: null,
};

/**
 * 获取当前应用状态
 */
export function getState(): AppState {
  return state;
}

/**
 * 更新处理阶段
 * @param stage 新的处理阶段
 */
export function updateStage(stage: ProcessStage): void {
  state.stage = stage;
}

/**
 * 更新照片偏移量
 * @param offset 新的偏移量
 */
export function updatePhotoOffset(offset: { x: number; y: number }): void {
  state.photoOffset = offset;
}

/**
 * 更新照片缩放比例
 * @param scale 新的缩放比例
 */
export function updatePhotoScale(scale: number): void {
  state.photoScale = scale;
}

/**
 * 重置调整参数为默认值
 * 将 photoOffset 恢复为 { x: 0, y: 0 }，photoScale 恢复为 DEFAULT_SCALE
 */
export function resetAdjustments(): void {
  state.photoOffset = { x: 0, y: 0 };
  state.photoScale = DEFAULT_CONFIG.DEFAULT_SCALE;
}
