// ============================================================
// 照片出框效果 - 调整控制面板
// 提供照片位置、缩放、边框宽度、背景颜色、拍摄参数文字编辑和重置功能
// ============================================================

import type { AppState } from '../types';

/** 控制面板回调更新接口 */
export interface ControlUpdates {
  /** 照片偏移量 */
  photoOffset?: { x: number; y: number };
  /** 照片缩放比例 */
  photoScale?: number;
  /** 相框边框宽度 */
  borderWidth?: number;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 相框颜色 */
  frameColor?: string;
  /** 拍摄参数文字 */
  metadataText?: string;
  /** 是否重置 */
  reset?: boolean;
}

// ------------------------------------------------------------
// 样式常量
// ------------------------------------------------------------

/** 控件标签样式 */
const LABEL_STYLE =
  'display: block; color: #ccc; font-size: 13px; margin-bottom: 6px; user-select: none;';

/** 滑块输入框样式 */
const SLIDER_STYLE = `
  width: 100%;
  accent-color: #7c6fff;
  cursor: pointer;
`;

/** 文本输入框样式 */
const TEXT_INPUT_STYLE = `
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #555;
  background-color: rgba(255, 255, 255, 0.06);
  color: #eee;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
`;

/** 颜色选择器样式 */
const COLOR_INPUT_STYLE = `
  width: 48px;
  height: 32px;
  border: 1px solid #555;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  padding: 2px;
`;

// ------------------------------------------------------------
// 辅助函数
// ------------------------------------------------------------

/**
 * 创建一个控件分组容器
 * @param labelText 标签文字
 * @returns 包含 group 容器和 label 元素的对象
 */
function createControlGroup(labelText: string): {
  group: HTMLDivElement;
  label: HTMLLabelElement;
} {
  const group = document.createElement('div');
  group.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

  const label = document.createElement('label');
  label.textContent = labelText;
  label.style.cssText = LABEL_STYLE;
  group.appendChild(label);

  return { group, label };
}

/**
 * 创建带数值显示的滑块控件
 * @param labelText 标签文字
 * @param min 最小值
 * @param max 最大值
 * @param step 步长
 * @param value 初始值
 * @param unit 单位后缀
 * @param onInput 值变化回调
 * @returns 控件分组 DOM 元素
 */
function createSliderControl(
  labelText: string,
  min: number,
  max: number,
  step: number,
  value: number,
  unit: string,
  onInput: (value: number) => void,
): { element: HTMLDivElement; slider: HTMLInputElement } {
  const { group, label } = createControlGroup(labelText);

  // 数值显示
  const valueSpan = document.createElement('span');
  valueSpan.textContent = ` ${value}${unit}`;
  valueSpan.style.cssText = 'color: #7c6fff; font-size: 12px;';
  label.appendChild(valueSpan);

  // 滑块
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(value);
  slider.style.cssText = SLIDER_STYLE;

  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value);
    valueSpan.textContent = ` ${v}${unit}`;
    onInput(v);
  });

  group.appendChild(slider);
  return { element: group, slider };
}

// ------------------------------------------------------------
// 预设颜色
// ------------------------------------------------------------

/** 背景常用颜色 */
const BG_PRESETS = [
  '#1a1a2e', '#0f0f23', '#2d2d44', '#1e3a5f',
  '#3b1f2b', '#1a3c34', '#000000', '#f5f5f5',
];

/** 相框常用颜色 */
const FRAME_PRESETS = [
  '#FFFFFF', '#F5F5DC', '#E8E0D0', '#D4C5A9',
  '#333333', '#1a1a1a', '#FFD700', '#C0C0C0',
];

/**
 * 创建预设颜色色块行
 * @param presets 预设颜色数组
 * @param currentValue 当前选中的颜色值
 * @param onSelect 选中颜色的回调
 * @returns 色块行 DOM 元素
 */
function createColorPresets(
  presets: string[],
  currentValue: string,
  onSelect: (color: string) => void,
): HTMLDivElement {
  const row = document.createElement('div');
  row.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;';

  for (const color of presets) {
    const swatch = document.createElement('div');
    const isSelected = color.toLowerCase() === currentValue.toLowerCase();
    swatch.style.cssText = `
      width: 24px; height: 24px;
      border-radius: 4px;
      background-color: ${color};
      cursor: pointer;
      border: 2px solid ${isSelected ? '#7c6fff' : 'rgba(255,255,255,0.15)'};
      transition: border-color 0.15s;
    `;
    swatch.title = color;
    swatch.addEventListener('click', () => onSelect(color));
    swatch.addEventListener('mouseenter', () => {
      if (!isSelected) swatch.style.borderColor = 'rgba(255,255,255,0.4)';
    });
    swatch.addEventListener('mouseleave', () => {
      if (!isSelected) swatch.style.borderColor = 'rgba(255,255,255,0.15)';
    });
    row.appendChild(swatch);
  }

  return row;
}

// ------------------------------------------------------------
// 主函数
// ------------------------------------------------------------

/**
 * 创建调整控制面板
 * 包含照片位置、缩放、边框宽度、背景颜色、拍摄参数文字编辑和重置功能
 * @param container 挂载容器元素
 * @param state 当前应用状态
 * @param onChange 控件值变化回调，用于实时更新合成预览
 */
export function createControlsPanel(
  container: HTMLElement,
  state: AppState,
  onChange: (updates: Partial<ControlUpdates>) => void,
): void {
  // 清空容器
  container.innerHTML = '';

  // 外层包裹容器
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    width: 100%;
    max-width: 320px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 16px;
    background-color: rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-sizing: border-box;
  `;

  // 标题
  const title = document.createElement('h3');
  title.textContent = '调整参数';
  title.style.cssText =
    'color: #eee; font-size: 16px; margin: 0; font-weight: 600; text-align: center;';
  wrapper.appendChild(title);

  // ---- 1. 照片位置 X 偏移 ----
  const { element: offsetXEl, slider: offsetXSlider } = createSliderControl(
    '水平偏移',
    -200,
    200,
    1,
    state.photoOffset.x,
    'px',
    (v) => onChange({ photoOffset: { x: v, y: parseFloat(offsetYSlider.value) } }),
  );
  wrapper.appendChild(offsetXEl);

  // ---- 2. 照片位置 Y 偏移 ----
  const { element: offsetYEl, slider: offsetYSlider } = createSliderControl(
    '垂直偏移',
    -200,
    200,
    1,
    state.photoOffset.y,
    'px',
    (v) => onChange({ photoOffset: { x: parseFloat(offsetXSlider.value), y: v } }),
  );
  wrapper.appendChild(offsetYEl);

  // ---- 3. 照片缩放 ----
  const { element: scaleEl } = createSliderControl(
    '照片缩放',
    0.5,
    3.0,
    0.1,
    state.photoScale,
    'x',
    (v) => onChange({ photoScale: v }),
  );
  wrapper.appendChild(scaleEl);

  // ---- 4. 边框宽度 ----
  const { element: borderEl } = createSliderControl(
    '边框宽度',
    10,
    100,
    1,
    state.frameConfig.borderWidth,
    'px',
    (v) => onChange({ borderWidth: v }),
  );
  wrapper.appendChild(borderEl);

  // ---- 5. 背景颜色 ----
  const { group: bgGroup } = createControlGroup('背景颜色');
  const colorRow = document.createElement('div');
  colorRow.style.cssText = 'display: flex; align-items: center; gap: 8px;';

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = state.backgroundColor;
  colorInput.style.cssText = COLOR_INPUT_STYLE;

  // 颜色值文字显示
  const colorValue = document.createElement('span');
  colorValue.textContent = state.backgroundColor;
  colorValue.style.cssText = 'color: #aaa; font-size: 12px; font-family: monospace;';

  colorInput.addEventListener('input', () => {
    colorValue.textContent = colorInput.value;
    onChange({ backgroundColor: colorInput.value });
  });

  colorRow.appendChild(colorInput);
  colorRow.appendChild(colorValue);
  bgGroup.appendChild(colorRow);

  // 背景预设色块
  const bgPresets = createColorPresets(BG_PRESETS, state.backgroundColor, (color) => {
    colorInput.value = color;
    colorValue.textContent = color;
    onChange({ backgroundColor: color });
  });
  bgGroup.appendChild(bgPresets);

  wrapper.appendChild(bgGroup);

  // ---- 5b. 相框颜色 ----
  const { group: frameColorGroup } = createControlGroup('相框颜色');
  const frameColorRow = document.createElement('div');
  frameColorRow.style.cssText = 'display: flex; align-items: center; gap: 8px;';

  const frameColorInput = document.createElement('input');
  frameColorInput.type = 'color';
  frameColorInput.value = state.frameConfig.frameColor;
  frameColorInput.style.cssText = COLOR_INPUT_STYLE;

  const frameColorValue = document.createElement('span');
  frameColorValue.textContent = state.frameConfig.frameColor;
  frameColorValue.style.cssText = 'color: #aaa; font-size: 12px; font-family: monospace;';

  frameColorInput.addEventListener('input', () => {
    frameColorValue.textContent = frameColorInput.value;
    onChange({ frameColor: frameColorInput.value });
  });

  frameColorRow.appendChild(frameColorInput);
  frameColorRow.appendChild(frameColorValue);
  frameColorGroup.appendChild(frameColorRow);

  // 相框预设色块
  const framePresets = createColorPresets(FRAME_PRESETS, state.frameConfig.frameColor, (color) => {
    frameColorInput.value = color;
    frameColorValue.textContent = color;
    onChange({ frameColor: color });
  });
  frameColorGroup.appendChild(framePresets);

  wrapper.appendChild(frameColorGroup);

  // ---- 6. 拍摄参数文字 ----
  const { group: metaGroup } = createControlGroup('拍摄参数文字');
  const metaInput = document.createElement('input');
  metaInput.type = 'text';
  metaInput.placeholder = '输入自定义拍摄参数文字';
  metaInput.value = state.customMetadataText ?? '';
  metaInput.style.cssText = TEXT_INPUT_STYLE;

  // 聚焦时高亮边框
  metaInput.addEventListener('focus', () => {
    metaInput.style.borderColor = '#7c6fff';
  });
  metaInput.addEventListener('blur', () => {
    metaInput.style.borderColor = '#555';
  });
  metaInput.addEventListener('input', () => {
    onChange({ metadataText: metaInput.value });
  });

  metaGroup.appendChild(metaInput);
  wrapper.appendChild(metaGroup);

  // ---- 7. 重置按钮 ----
  const resetBtn = document.createElement('button');
  resetBtn.textContent = '重置为默认值';
  resetBtn.style.cssText = `
    padding: 10px 24px;
    border-radius: 8px;
    border: 1px solid #555;
    background-color: transparent;
    color: #ccc;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s;
    align-self: center;
    margin-top: 4px;
  `;
  resetBtn.addEventListener('mouseenter', () => {
    resetBtn.style.borderColor = '#888';
    resetBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
  });
  resetBtn.addEventListener('mouseleave', () => {
    resetBtn.style.borderColor = '#555';
    resetBtn.style.backgroundColor = 'transparent';
  });
  resetBtn.addEventListener('click', () => {
    onChange({ reset: true });
  });
  wrapper.appendChild(resetBtn);

  container.appendChild(wrapper);
}
