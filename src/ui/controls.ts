// ============================================================
// 照片出框效果 - 调整控制面板（Neubrutalism 风格）
// @author system
// ============================================================

import type { AppState, MetadataPosition } from '../types';

/** 控制面板回调更新接口 */
export interface ControlUpdates {
  photoOffset?: { x: number; y: number };
  photoScale?: number;
  borderWidth?: number;
  backgroundColor?: string;
  frameColor?: string;
  metadataText?: string;
  metadataFontSize?: number;
  metadataColor?: string;
  metadataPosition?: MetadataPosition;
  reset?: boolean;
}

// ── 样式常量 ──

const LABEL_STYLE = `
  display: flex; justify-content: space-between; align-items: center;
  color: var(--text-primary, #0A0A0A);
  font-family: var(--font-heading, 'Archivo', sans-serif);
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
  margin-bottom: 6px; user-select: none;
`;

const SLIDER_STYLE = `
  width: 100%; accent-color: var(--accent, #EC4899);
  cursor: pointer; height: 4px;
`;

const TEXT_INPUT_STYLE = `
  width: 100%; padding: 9px 12px;
  border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
  background-color: var(--bg-surface, #FFFFFF);
  color: var(--text-primary, #0A0A0A);
  font-size: 13px; font-family: var(--font-body, 'Space Grotesk', sans-serif);
  outline: none; box-sizing: border-box;
  transition: box-shadow var(--transition-fast, 150ms ease);
`;

const COLOR_INPUT_STYLE = `
  width: 36px; height: 28px;
  border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
  background: transparent; cursor: pointer; padding: 1px;
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
  labelText: string, min: number, max: number, step: number,
  value: number, unit: string,
  onInput: (value: number) => void,
): { element: HTMLDivElement; slider: HTMLInputElement } {
  const { group, label } = createControlGroup(labelText);
  const decimals = step < 1 ? 1 : 0;

  const valueSpan = document.createElement('span');
  valueSpan.textContent = `${value.toFixed(decimals)}${unit}`;
  valueSpan.style.cssText = `
    color: var(--accent, #EC4899); font-size: 11px;
    font-variant-numeric: tabular-nums; font-weight: 900;
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
  presets: string[], currentValue: string,
  onSelect: (color: string) => void,
): HTMLDivElement {
  const row = document.createElement('div');
  row.style.cssText = 'display: flex; gap: 5px; flex-wrap: wrap; margin-top: 6px;';

  const swatches: HTMLDivElement[] = [];

  const updateSwatchStyles = (selectedColor: string) => {
    swatches.forEach((sw, i) => {
      const match = presets[i].toLowerCase() === selectedColor.toLowerCase();
      sw.style.border = `var(--border-width, 3px) solid ${match ? 'var(--accent, #EC4899)' : 'var(--border-brutal, #0A0A0A)'}`;
      sw.style.boxShadow = match ? '3px 3px 0 var(--accent, #EC4899)' : '2px 2px 0 var(--border-brutal, #0A0A0A)';
    });
  };

  for (const color of presets) {
    const swatch = document.createElement('div');
    const isSelected = color.toLowerCase() === currentValue.toLowerCase();
    swatch.style.cssText = `
      width: 26px; height: 26px;
      background-color: ${color};
      cursor: pointer;
      border: var(--border-width, 3px) solid ${isSelected ? 'var(--accent, #EC4899)' : 'var(--border-brutal, #0A0A0A)'};
      box-shadow: ${isSelected ? '3px 3px 0 var(--accent, #EC4899)' : '2px 2px 0 var(--border-brutal, #0A0A0A)'};
      transition: transform var(--transition-fast, 150ms ease);
    `;
    swatch.title = color;
    swatch.addEventListener('click', () => {
      updateSwatchStyles(color);
      onSelect(color);
    });
    swatch.addEventListener('mouseenter', () => {
      swatch.style.transform = 'translate(-1px, -1px)';
    });
    swatch.addEventListener('mouseleave', () => {
      swatch.style.transform = 'translate(0, 0)';
    });
    swatches.push(swatch);
    row.appendChild(swatch);
  }

  (row as any).updateSelection = updateSwatchStyles;
  return row;
}

// ── 重置图标 ──
const RESET_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;

// ── 主函数 ──

export function createControlsPanel(
  container: HTMLElement,
  state: AppState,
  onChange: (updates: Partial<ControlUpdates>) => void,
): void {
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    width: 100%; max-width: 320px;
    display: flex; flex-direction: column; gap: 14px;
    padding: 18px;
    background: var(--bg-surface, #FFFFFF);
    border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
    box-shadow: var(--shadow-brutal, 6px 6px 0 #0A0A0A);
    box-sizing: border-box;
  `;

  // 标题
  const title = document.createElement('h3');
  title.textContent = '调整参数';
  title.style.cssText = `
    color: var(--text-primary, #0A0A0A);
    font-family: var(--font-heading, 'Archivo', sans-serif);
    font-size: 16px; margin: 0; font-weight: 900;
    text-align: center; text-transform: uppercase;
    letter-spacing: 0.03em;
    padding-bottom: 10px;
    border-bottom: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
  `;
  wrapper.appendChild(title);

  // 分隔线
  const divider = () => {
    const hr = document.createElement('div');
    hr.style.cssText = `
      height: 0; width: 100%;
      border-top: 2px dashed var(--border-brutal, #0A0A0A);
      opacity: 0.2; margin: 2px 0;
    `;
    return hr;
  };

  // ── 滑块控件 ──
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
    color: var(--text-muted, rgba(131,24,67,0.5)); font-size: 12px;
    font-family: monospace; font-variant-numeric: tabular-nums;
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
    color: var(--text-muted, rgba(131,24,67,0.5)); font-size: 12px;
    font-family: monospace; font-variant-numeric: tabular-nums;
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
    metaInput.style.boxShadow = '4px 4px 0 var(--accent, #EC4899)';
    metaInput.style.borderColor = 'var(--accent, #EC4899)';
  });
  metaInput.addEventListener('blur', () => {
    metaInput.style.boxShadow = 'none';
    metaInput.style.borderColor = 'var(--border-brutal, #0A0A0A)';
  });
  metaInput.addEventListener('input', () => onChange({ metadataText: metaInput.value }));

  metaGroup.appendChild(metaInput);
  wrapper.appendChild(metaGroup);

  const { element: fontSizeEl } = createSliderControl(
    '文字大小', 12, 48, 1, state.metadataFontSize, 'px',
    (v) => onChange({ metadataFontSize: v }),
  );
  wrapper.appendChild(fontSizeEl);

  // ── 文字颜色 ──
  const { group: metaColorGroup } = createControlGroup('文字颜色');
  const metaColorRow = document.createElement('div');
  metaColorRow.style.cssText = 'display: flex; align-items: center; gap: 10px;';

  const metaColorInput = document.createElement('input');
  metaColorInput.type = 'color';
  metaColorInput.value = state.metadataColor;
  metaColorInput.style.cssText = COLOR_INPUT_STYLE;

  const metaColorValue = document.createElement('span');
  metaColorValue.textContent = state.metadataColor;
  metaColorValue.style.cssText = `
    color: var(--text-muted, rgba(131,24,67,0.5)); font-size: 12px;
    font-family: monospace; font-variant-numeric: tabular-nums;
  `;

  metaColorInput.addEventListener('input', () => {
    metaColorValue.textContent = metaColorInput.value;
    onChange({ metadataColor: metaColorInput.value });
  });

  metaColorRow.appendChild(metaColorInput);
  metaColorRow.appendChild(metaColorValue);
  metaColorGroup.appendChild(metaColorRow);

  // 文字颜色预设
  const META_COLOR_PRESETS = ['#666666', '#333333', '#000000', '#FFFFFF', '#EC4899', '#06B6D4', '#999999', '#A0522D'];
  const metaColorPresets = createColorPresets(META_COLOR_PRESETS, state.metadataColor, (color) => {
    metaColorInput.value = color;
    metaColorValue.textContent = color;
    onChange({ metadataColor: color });
  });
  metaColorGroup.appendChild(metaColorPresets);
  wrapper.appendChild(metaColorGroup);

  // ── 文字位置 ──
  const { group: posGroup } = createControlGroup('文字位置');
  const posRow = document.createElement('div');
  posRow.style.cssText = 'display: flex; gap: 6px;';

  const positions: { value: 'left' | 'center' | 'right'; label: string; icon: string }[] = [
    {
      value: 'left', label: '左对齐',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>`,
    },
    {
      value: 'center', label: '居中',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`,
    },
    {
      value: 'right', label: '右对齐',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>`,
    },
  ];

  const posBtns: HTMLButtonElement[] = [];

  const updatePosBtns = (selected: string) => {
    posBtns.forEach((btn, i) => {
      const isActive = positions[i].value === selected;
      btn.style.backgroundColor = isActive ? 'var(--accent, #EC4899)' : 'var(--bg-surface, #FFFFFF)';
      btn.style.color = isActive ? '#FFFFFF' : 'var(--text-primary, #0A0A0A)';
      btn.style.boxShadow = isActive ? '3px 3px 0 var(--border-brutal, #0A0A0A)' : '2px 2px 0 var(--border-brutal, #0A0A0A)';
    });
  };

  positions.forEach((pos) => {
    const btn = document.createElement('button');
    const isActive = pos.value === state.metadataPosition;
    btn.innerHTML = pos.icon;
    btn.title = pos.label;
    btn.style.cssText = `
      flex: 1; padding: 8px;
      border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
      background-color: ${isActive ? 'var(--accent, #EC4899)' : 'var(--bg-surface, #FFFFFF)'};
      color: ${isActive ? '#FFFFFF' : 'var(--text-primary, #0A0A0A)'};
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all var(--transition-fast, 150ms ease);
      box-shadow: ${isActive ? '3px 3px 0 var(--border-brutal, #0A0A0A)' : '2px 2px 0 var(--border-brutal, #0A0A0A)'};
    `;
    btn.addEventListener('click', () => {
      updatePosBtns(pos.value);
      onChange({ metadataPosition: pos.value });
    });
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translate(-1px, -1px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
    posBtns.push(btn);
    posRow.appendChild(btn);
  });

  posGroup.appendChild(posRow);
  wrapper.appendChild(posGroup);

  wrapper.appendChild(divider());

  // ── 重置按钮 ──
  const resetBtn = document.createElement('button');
  resetBtn.innerHTML = `${RESET_ICON}<span>重置为默认值</span>`;
  resetBtn.style.cssText = `
    padding: 9px 20px;
    border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
    background-color: var(--bg-surface, #FFFFFF);
    color: var(--text-primary, #0A0A0A);
    font-family: var(--font-heading, 'Archivo', sans-serif);
    font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
    cursor: pointer;
    transition: all var(--transition-fast, 150ms ease);
    align-self: center;
    display: flex; align-items: center; gap: 6px;
    box-shadow: var(--shadow-brutal-sm, 4px 4px 0 #0A0A0A);
  `;
  resetBtn.addEventListener('mouseenter', () => {
    resetBtn.style.backgroundColor = 'var(--accent-red, #FF5252)';
    resetBtn.style.color = '#FFFFFF';
    resetBtn.style.boxShadow = '6px 6px 0 var(--border-brutal, #0A0A0A)';
    resetBtn.style.transform = 'translate(-1px, -1px)';
  });
  resetBtn.addEventListener('mouseleave', () => {
    resetBtn.style.backgroundColor = 'var(--bg-surface, #FFFFFF)';
    resetBtn.style.color = 'var(--text-primary, #0A0A0A)';
    resetBtn.style.boxShadow = 'var(--shadow-brutal-sm, 4px 4px 0 #0A0A0A)';
    resetBtn.style.transform = 'translate(0, 0)';
  });
  resetBtn.addEventListener('click', () => onChange({ reset: true }));
  wrapper.appendChild(resetBtn);

  container.appendChild(wrapper);
}
