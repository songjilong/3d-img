// ============================================================
// 应用状态管理 - 单元测试
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getState,
  updateStage,
  updatePhotoOffset,
  updatePhotoScale,
  resetAdjustments,
} from '../../src/state';
import { DEFAULT_CONFIG } from '../../src/config';

describe('应用状态管理', () => {
  // 每个测试前重置状态
  beforeEach(() => {
    resetAdjustments();
    updateStage('upload');
  });

  it('初始状态应使用 DEFAULT_CONFIG 默认值', () => {
    const state = getState();
    expect(state.stage).toBe('upload');
    expect(state.photoOffset).toEqual({ x: 0, y: 0 });
    expect(state.photoScale).toBe(DEFAULT_CONFIG.DEFAULT_SCALE);
    expect(state.backgroundColor).toBe(DEFAULT_CONFIG.DEFAULT_BG_COLOR);
    expect(state.frameConfig.borderWidth).toBe(DEFAULT_CONFIG.DEFAULT_BORDER_WIDTH);
    expect(state.frameConfig.bottomPadding).toBe(DEFAULT_CONFIG.DEFAULT_BOTTOM_PADDING);
    expect(state.frameConfig.frameColor).toBe(DEFAULT_CONFIG.DEFAULT_FRAME_COLOR);
    expect(state.exportFormat).toBe(DEFAULT_CONFIG.DEFAULT_EXPORT_FORMAT);
  });

  it('updateStage 应正确更新处理阶段', () => {
    updateStage('segmenting');
    expect(getState().stage).toBe('segmenting');

    updateStage('adjusting');
    expect(getState().stage).toBe('adjusting');
  });

  it('updatePhotoOffset 应正确更新偏移量', () => {
    updatePhotoOffset({ x: 50, y: -30 });
    expect(getState().photoOffset).toEqual({ x: 50, y: -30 });
  });

  it('updatePhotoScale 应正确更新缩放比例', () => {
    updatePhotoScale(1.5);
    expect(getState().photoScale).toBe(1.5);
  });

  it('resetAdjustments 应将偏移和缩放恢复为默认值', () => {
    // 先修改状态
    updatePhotoOffset({ x: 100, y: -200 });
    updatePhotoScale(2.5);

    // 执行重置
    resetAdjustments();

    const state = getState();
    expect(state.photoOffset).toEqual({ x: 0, y: 0 });
    expect(state.photoScale).toBe(DEFAULT_CONFIG.DEFAULT_SCALE);
  });
});
