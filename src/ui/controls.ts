// ============================================================
// 照片出框效果 - 调整控制面板
// @author system
// ============================================================

import type { AppState } from '../types';

/** 控制面板回调更新接口 */
export interface ControlUpdates {
  photoOffset?: { x: number; y: number };
  photoScale?: number;
  borderWidth?: number;
  backgroundColor?: string;
  frameColor?: string;
  metadataText?: string;
  metadataFontSize?: number;
  reset?: boolean;
}

// ── 样式常量 ──

const LABEL_STYLE = `
  display: flex; justify-content: space-between; align-items: center;
  color: var(--text-secondary, #a0a0b8); font-size: 12px;
  margin-bottom: 6px; user-select: none; font-weight: 500;
  letter-spacing: 0.02em;
`;

const SLIDER_STYLE = `
  width: 100%; accent-color: var(--accent, #7c6fff); cursor: pointer;
  height: 4px; border-radius: 2px;
`;

const TEXT_INPUT_STYLE = `
  width: 100%; padding: 9px 12px;
  border-radius: var(--radius-sm, 8px);
  border: 1px solid var(--border-default, rgba(255,255,255,0.1));
  background-color: var(--bg-surface, rgba(255,255,255,0.035));
  color: var(--text-primary, #f0f0f5);
  font-size: 13px; font-family: inherit;
  outline: none; box-sizing: border-box;
  transition: border-color var(--transition-fast, 150ms ease),
              box-shadow var(--transition-fast, 150ms ease);
`;

const COLOR_INPUT_STYLE = `
  width: 36px; height: 28px;
  border: 1px solid var(--border-default, rgba(255,255,255,0.1));
  border-radius: 6px; background: transparent;
  cursor: pointer; padding: 2px;
`;

// ── 辅助函数 ──

function createControlGroup(labelText: string): {
  group: HTMLDivElement;
  label: HTMLLabelElement;
} {
  const group = document.createElement('div');
  group.style.cssText = 'display: flex; flex-direction: column;';

  const label = document.createElement('label');
  label.textContent = labelText;
  label.style.cssText = LABEL_STYLE;
  group.appendChild(label);

  return { group, label };
}

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

  const decimals = step < 1 ? 1 : 0;
  const valueSpan = document.createElement('span');
  valueSpan.textContent = `${value.toFixed(decimals)}${unit}`;
  valueSpan.style.cssText = `
    color: var(--accent, #7c6fff); font-size: 12px;
    font-variant-numeric: tabular-nums; font-weight: 600;
  `;
  label.appendChild(valueSpan);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(value);
  slider.style.cssText = SLIDER_STYLE;

  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value);
    valueSpan.textContent = `${v.toFixed(decimals)}${unit}`;
    onInput(v);
  });

  group.appendChild(slider);
  return { element: group, slider };
}

// ── 预设颜色 ──

const BG_PRESETS = [
  '#1a1a2e', '#0f0f23', '#2d2d44', '#1e3a5f',
  '#3b1f2b', '#1a3c34', '#000000', '#f5f5f5',
];

const FRAME_PRESETS = [
  '#FFFFFF', '#F5F5DC', '#E8E0D0', '#D4C5A9',
  '#333333', '#1a1a1a', '#FFD700', '#C0C0C0',
];

function createColorPresets(
  presets: string[],
  currentValue: string,
  onSelect: (color: string) => void,
): HTMLDivElement {
  const row = document.createElement('div');
  row.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;';

  const swatches: HTMLDivElement[] = [];

  /** 更新所有色块的选中状态 */
  const updateSwatchStyles = (selectedColor: string) => {
    swatches.forEach((sw, i) => {
      const match = presets[i].toLowerCase() === selectedColor.toLowerCase();
      sw.style.border = `2px solid ${match ? 'var(--accent, #7c6fff)' : 'var(--border-subtle, rgba(255,255,255,0.06))'}`;
      sw.style.boxShadow = match ? '0 0 8px rgba(124,111,255,0.3)' : 'none';
    });
  };

  for (const color of presets) {
    const swatch = document.createElement('div');
    const isSelected = color.toLowerCase() === currentValue.toLowerCase();
    swatch.style.cssText = `
      width: 24px; height: 24px;
      border-radius: 6px;
      background-color: ${color};
      cursor: pointer;
      border: 2px solid ${isSelected ? 'var(--accent, #7c6fff)' : 'var(--border-subtle, rgba(255,255,255,0.06))'};
      transition: border-color var(--transition-fast, 150ms ease),
                  transform var(--transition-fast, 150ms ease);
      box-shadow: ${isSelected ? '0 0 8px rgba(124,111,255,0.3)' : 'none'};
    `;
    swatch.title = color;
    swatch.addEventListener('click', () => {
      updateSwatchStyles(color);
      onSelect(color);
    });
    swatch.addEventListener('mouseenter', () => {
      const active = swatch.style.boxShadow.includes('rgba(124');
      if (!active) {
        swatch.style.borderColor = 'rgba(255,255,255,0.3)';
        swatch.style.transform = 'scale(1.1)';
      }
    });
    swatch.addEventListener('mouseleave', () => {
      const active = swatch.style.boxShadow.includes('rgba(124');
      if (!active) {
        swatch.style.borderColor = 'var(--border-subtle, rgba(255,255,255,0.06))';
      }
      swatch.style.transform = 'scale(1)';
    });
    swatches.push(swatch);
    row.appendChild(swatch);
  }

  // 将更新方法挂到 DOM 元素上，供外部 color picker 同步调用
  (row as any).updateSelection = updateSwatchStyles;

  return row;
}

// ── 重置图标 SVG ──
const RESET_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;

// ── 主函数 ──

/**
 * 创建调整控制面板
 */
export function createControlsPanel(
  container: HTMLElement,
  state: AppState,
  onChange: (updates: Partial<ControlUpdates>) => void,
): void {
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    width: 100%; max-width: 320px;
    display: flex; flex-direction: column; gap: 16px;
    padding: 18px;
    background: var(--bg-glass, rgba(16,16,40,0.7));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: var(--radius-lg, 16px);
    border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
    box-sizing: border-box;
    box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.3));
  `;

  // 标题
  const title = document.createElement('h3');
  title.textContent = '调整参数';
  title.style.cssText = `
    color: var(--text-primary, #f0f0f5);
    font-size: 15px; margin: 0; font-weight: 600;
    text-align: center; letter-spacing: -0.01em;
  `;
  wrapper.appendChild(title);

  // 分隔线
  const divider = () => {
    const hr = document.createElement('div');
    hr.style.cssText = `
      height: 1px; width: 100%;
      background: var(--border-subtle, rgba(255,255,255,0.06));
      margin: 2px 0;
    `;
    return hr;
  };

  // ── 位置与缩放 ──
  const { element: offsetXEl, slider: offsetXSlider } = createSliderControl(
    '水平偏移', -200, 200, 1, state.photoOffset.x, 'px',
    (v) => onChange({ photoOffset: { x: v, y: parseFloat(offsetYSlider.value) } }),
  );
  wrapper.appendChild(offsetXEl);

  const { element: offsetYEl, slider: offsetYSlider } = createSliderControl(
    '垂直偏移', -200, 200, 1, state.photoOffset.y, 'px',
    (v) => onChange({ photoOffset: { x: parseFloat(offsetXSlider.value), y: v } }),
  );
  wrapper.appendChild(offsetYEl);

  const baseScale = state.photoScale;
  const { element: scaleEl } = createSliderControl(
    '照片缩放', 0.5, 2.0, 0.1, 1.0, 'x',
    (v) => onChange({ photoScale: baseScale * v }),
  );
  wrapper.appendChild(scaleEl);

  const { element: borderEl } = createSliderControl(
    '边框宽度', 10, 100, 1, state.frameConfig.borderWidth, 'px',
    (v) => onChange({ borderWidth: v }),
  );
  wrapper.appendChild(borderEl);

  wrapper.appendChild(divider());

  // ── 背景颜色 ──
  const { group: bgGroup } = createControlGroup('背景颜色');
  const colorRow = document.createElement('div');
  colorRow.style.cssText = 'display: flex; align-items: center; gap: 10px;';

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = state.backgroundColor;
  colorInput.style.cssText = COLOR_INPUT_STYLE;

  const colorValue = document.createElement('span');
  colorValue.textContent = state.backgroundColor;
  colorValue.style.cssText = `
    color: var(--text-muted, #6b6b80); font-size: 12px;
    font-family: 'SF Mono', 'Cascadia Code', monospace;
    font-variant-numeric: tabular-nums;
  `;

  colorInput.addEventListener('input', () => {
    colorValue.textContent = colorInput.value;
    onChange({ backgroundColor: colorInput.value });
    (bgPresetsRow as any).updateSelection?.(colorInput.value);
  });

  colorRow.appendChild(colorInput);
  colorRow.appendChild(colorValue);
  bgGroup.appendChild(colorRow);
  const bgPresetsRow = createColorPresets(BG_PRESETS, state.backgroundColor, (color) => {
    colorInput.value = color;
    colorValue.textContent = color;
    onChange({ backgroundColor: color });
  });
  bgGroup.appendChild(bgPresetsRow);
  wrapper.appendChild(bgGroup);

  // ── 相框颜色 ──
  const { group: frameColorGroup } = createControlGroup('相框颜色');
  const frameColorRow = document.createElement('div');
  frameColorRow.style.cssText = 'display: flex; align-items: center; gap: 10px;';

  const frameColorInput = document.createElement('input');
  frameColorInput.type = 'color';
  frameColorInput.value = state.frameConfig.frameColor;
  frameColorInput.style.cssText = COLOR_INPUT_STYLE;

  const frameColorValue = document.createElement('span');
  frameColorValue.textContent = state.frameConfig.frameColor;
  frameColorValue.style.cssText = `
    color: var(--text-muted, #6b6b80); font-size: 12px;
    font-family: 'SF Mono', 'Cascadia Code', monospace;
    font-variant-numeric: tabular-nums;
  `;

  frameColorInput.addEventListener('input', () => {
    frameColorValue.textContent = frameColorInput.value;
    onChange({ frameColor: frameColorInput.value });
    (framePresetsRow as any).updateSelection?.(frameColorInput.value);
  });

  frameColorRow.appendChild(frameColorInput);
  frameColorRow.appendChild(frameColorValue);
  frameColorGroup.appendChild(frameColorRow);
  const framePresetsRow = createColorPresets(FRAME_PRESETS, state.frameConfig.frameColor, (color) => {
    frameColorInput.value = color;
    frameColorValue.textContent = color;
    onChange({ frameColor: color });
  });
  frameColorGroup.appendChild(framePresetsRow);
  wrapper.appendChild(frameColorGroup);

  wrapper.appendChild(divider());

  // ── 拍摄参数文字 ──
  const { group: metaGroup } = createControlGroup('拍摄参数文字');
  const metaInput = document.createElement('input');
  metaInput.type = 'text';
  metaInput.placeholder = '输入自定义拍摄参数文字';
  metaInput.value = state.customMetadataText ?? '';
  metaInput.style.cssText = TEXT_INPUT_STYLE;

  metaInput.addEventListener('focus', () => {
    metaInput.style.borderColor = 'var(--border-focus, rgba(124,111,255,0.5))';
    metaInput.style.boxShadow = '0 0 0 3px rgba(124,111,255,0.1)';
  });
  metaInput.addEventListener('blur', () => {
    metaInput.style.borderColor = 'var(--border-default, rgba(255,255,255,0.1))';
    metaInput.style.boxShadow = 'none';
  });
  metaInput.addEventListener('input', () => {
    onChange({ metadataText: metaInput.value });
  });

  metaGroup.appendChild(metaInput);
  wrapper.appendChild(metaGroup);

  const { element: fontSizeEl } = createSliderControl(
    '文字大小', 12, 48, 1, state.metadataFontSize, 'px',
    (v) => onChange({ metadataFontSize: v }),
  );
  wrapper.appendChild(fontSizeEl);

  wrapper.appendChild(divider());

  // ── 重置按钮 ──
  const resetBtn = document.createElement('button');
  resetBtn.innerHTML = `${RESET_ICON}<span>重置为默认值</span>`;
  resetBtn.style.cssText = `
    padding: 9px 20px;
    border-radius: var(--radius-sm, 8px);
    border: 1px solid var(--border-default, rgba(255,255,255,0.1));
    background-color: transparent;
    color: var(--text-secondary, #a0a0b8);
    font-size: 13px; font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast, 150ms ease);
    align-self: center;
    display: flex; align-items: center; gap: 6px;
    font-family: inherit;
  `;
  resetBtn.addEventListener('mouseenter', () => {
    resetBtn.style.borderColor = 'var(--error, #ff6b6b)';
    resetBtn.style.color = 'var(--error, #ff6b6b)';
    resetBtn.style.backgroundColor = 'rgba(255,107,107,0.06)';
  });
  resetBtn.addEventListener('mouseleave', () => {
    resetBtn.style.borderColor = 'var(--border-default, rgba(255,255,255,0.1))';
    resetBtn.style.color = 'var(--text-secondary, #a0a0b8)';
    resetBtn.style.backgroundColor = 'transparent';
  });
  resetBtn.addEventListener('click', () => onChange({ reset: true }));
  wrapper.appendChild(resetBtn);

  container.appendChild(wrapper);
}
