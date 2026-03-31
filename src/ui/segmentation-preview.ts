// ============================================================
// 照片出框效果 - 分割预览组件（Neubrutalism 风格）
// @author system
// ============================================================

import type { SegmentationResult } from '../types';

type BrushMode = 'add' | 'remove';

interface BrushState {
  mode: BrushMode;
  size: number;
  isDrawing: boolean;
}

// ── SVG 图标 ──

const BRUSH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>`;

const ERASER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`;

const UNDO_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`;

// ── 按钮样式 ──

const BTN_BASE = `
  padding: 7px 14px; font-size: 12px;
  cursor: pointer; transition: all var(--transition-fast, 150ms ease);
  display: flex; align-items: center; gap: 6px;
  font-family: var(--font-heading, 'Archivo', sans-serif);
  font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
`;

const BTN_ACTIVE = `${BTN_BASE}
  background-color: var(--accent, #EC4899); color: #FFFFFF;
  box-shadow: 3px 3px 0 var(--border-brutal, #0A0A0A);
`;

const BTN_INACTIVE = `${BTN_BASE}
  background-color: var(--bg-surface, #FFFFFF);
  color: var(--text-primary, #0A0A0A);
  box-shadow: 2px 2px 0 var(--border-brutal, #0A0A0A);
`;

function renderOverlay(
  ctx: CanvasRenderingContext2D,
  originalImage: HTMLImageElement,
  mask: ImageData,
  width: number,
  height: number,
): void {
  ctx.drawImage(originalImage, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const maskPixels = mask.data;
  for (let i = 0; i < pixels.length; i += 4) {
    if (maskPixels[i + 3] < 128) {
      pixels[i] = Math.round(pixels[i] * 0.3);
      pixels[i + 1] = Math.round(pixels[i + 1] * 0.3);
      pixels[i + 2] = Math.round(pixels[i + 2] * 0.4);
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function paintOnMask(
  mask: ImageData, x: number, y: number, radius: number, mode: BrushMode,
): void {
  const w = mask.width, h = mask.height, data = mask.data, r2 = radius * radius;
  const minX = Math.max(0, Math.floor(x - radius));
  const maxX = Math.min(w - 1, Math.ceil(x + radius));
  const minY = Math.max(0, Math.floor(y - radius));
  const maxY = Math.min(h - 1, Math.ceil(y + radius));
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const dx = px - x, dy = py - y, dist2 = dx * dx + dy * dy;
      if (dist2 <= r2) {
        const idx = (py * w + px) * 4;
        const edgeFactor = 1 - Math.sqrt(dist2) / radius;
        const softAlpha = Math.round(edgeFactor * 255);
        if (mode === 'add') data[idx + 3] = Math.max(data[idx + 3], softAlpha);
        else data[idx + 3] = Math.min(data[idx + 3], 255 - softAlpha);
      }
    }
  }
}

function canvasToImageCoords(
  canvasX: number, canvasY: number, canvas: HTMLCanvasElement,
  imgWidth: number, imgHeight: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (canvasX - rect.left) * (imgWidth / rect.width),
    y: (canvasY - rect.top) * (imgHeight / rect.height),
  };
}

/**
 * 创建分割预览界面 - Neubrutalism 风格
 */
export function createSegmentationPreview(
  container: HTMLElement,
  originalImage: HTMLImageElement,
  segResult: SegmentationResult,
  onConfirm: () => void,
  onRetry: () => void,
): void {
  container.innerHTML = '';
  const imgW = originalImage.naturalWidth;
  const imgH = originalImage.naturalHeight;
  const brush: BrushState = { mode: 'add', size: 20, isDrawing: false };

  const maskHistory: Uint8ClampedArray[] = [];
  const saveMaskSnapshot = () => {
    maskHistory.push(new Uint8ClampedArray(segResult.mask.data));
    if (maskHistory.length > 20) maskHistory.shift();
  };

  // 外层容器 - Brutalist 卡片
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    width: 100%; max-width: 540px;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    padding: 20px;
    background: var(--bg-surface, #FFFFFF);
    border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
    box-shadow: var(--shadow-brutal, 6px 6px 0 #0A0A0A);
  `;

  // 标题
  const title = document.createElement('h3');
  title.textContent = '分割预览';
  title.style.cssText = `
    color: var(--text-primary, #0A0A0A);
    font-family: var(--font-heading, 'Archivo', sans-serif);
    font-size: 17px; margin: 0; font-weight: 900;
    text-transform: uppercase; letter-spacing: 0.03em;
  `;
  wrapper.appendChild(title);

  // 无主体警告
  if (!segResult.hasSubject) {
    const warning = document.createElement('div');
    warning.setAttribute('role', 'alert');
    warning.style.cssText = `
      color: var(--text-primary, #0A0A0A);
      background-color: var(--accent-yellow, #FFEB3B);
      border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
      box-shadow: 3px 3px 0 var(--border-brutal, #0A0A0A);
      padding: 10px 16px; font-size: 13px; font-weight: 500;
      width: 100%; box-sizing: border-box;
      text-align: center; line-height: 1.6;
    `;
    warning.textContent = '未能识别照片中的主体，可使用画笔手动选择主体区域';
    wrapper.appendChild(warning);
  }

  // ── 工具栏 ──
  const toolbar = document.createElement('div');
  toolbar.style.cssText = `
    display: flex; gap: 6px; align-items: center; flex-wrap: wrap;
    justify-content: center; width: 100%; padding: 6px 0;
  `;

  const addBtn = document.createElement('button');
  addBtn.innerHTML = `${BRUSH_ICON}<span>添加</span>`;
  addBtn.style.cssText = BTN_ACTIVE;

  const removeBtn = document.createElement('button');
  removeBtn.innerHTML = `${ERASER_ICON}<span>移除</span>`;
  removeBtn.style.cssText = BTN_INACTIVE;

  const updateModeButtons = () => {
    addBtn.style.cssText = brush.mode === 'add' ? BTN_ACTIVE : BTN_INACTIVE;
    removeBtn.style.cssText = brush.mode === 'remove' ? BTN_ACTIVE : BTN_INACTIVE;
  };

  addBtn.addEventListener('click', () => { brush.mode = 'add'; updateModeButtons(); });
  removeBtn.addEventListener('click', () => { brush.mode = 'remove'; updateModeButtons(); });

  const sizeLabel = document.createElement('span');
  sizeLabel.textContent = `${brush.size}px`;
  sizeLabel.style.cssText = `
    color: var(--text-muted, rgba(131,24,67,0.5));
    font-size: 11px; min-width: 36px; text-align: center;
    font-variant-numeric: tabular-nums; font-weight: 700;
  `;

  const sizeSlider = document.createElement('input');
  sizeSlider.type = 'range'; sizeSlider.min = '5'; sizeSlider.max = '80';
  sizeSlider.value = String(brush.size);
  sizeSlider.setAttribute('aria-label', '画笔大小');
  sizeSlider.style.cssText = 'width: 80px; accent-color: var(--accent, #EC4899); cursor: pointer;';
  sizeSlider.addEventListener('input', () => {
    brush.size = parseInt(sizeSlider.value);
    sizeLabel.textContent = `${brush.size}px`;
  });

  const undoBtn = document.createElement('button');
  undoBtn.innerHTML = `${UNDO_ICON}<span>撤销</span>`;
  undoBtn.style.cssText = BTN_INACTIVE;

  toolbar.appendChild(addBtn);
  toolbar.appendChild(removeBtn);
  toolbar.appendChild(sizeSlider);
  toolbar.appendChild(sizeLabel);
  toolbar.appendChild(undoBtn);
  wrapper.appendChild(toolbar);

  // ── 画布 ──
  const canvasContainer = document.createElement('div');
  canvasContainer.style.cssText = `
    width: 100%; text-align: center; overflow: hidden;
    background-color: var(--bg-dark, #0A0A0A);
    border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
    position: relative;
  `;

  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = imgW;
  overlayCanvas.height = imgH;
  overlayCanvas.style.cssText = `
    max-width: 100%; max-height: 400px;
    object-fit: contain; display: block; margin: 0 auto;
    cursor: crosshair;
  `;
  const overlayCtx = overlayCanvas.getContext('2d')!;
  renderOverlay(overlayCtx, originalImage, segResult.mask, imgW, imgH);

  const refreshPreview = () => renderOverlay(overlayCtx, originalImage, segResult.mask, imgW, imgH);

  let lastPoint: { x: number; y: number } | null = null;

  const paintLine = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = x1 - x0, dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = Math.max(1, brush.size / 3);
    const steps = Math.ceil(dist / step);
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      paintOnMask(segResult.mask, x0 + dx * t, y0 + dy * t, brush.size, brush.mode);
    }
  };

  const handlePaint = (e: MouseEvent | TouchEvent) => {
    if (!brush.isDrawing) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = canvasToImageCoords(clientX, clientY, overlayCanvas, imgW, imgH);
    if (lastPoint) paintLine(lastPoint.x, lastPoint.y, x, y);
    else paintOnMask(segResult.mask, x, y, brush.size, brush.mode);
    lastPoint = { x, y };
    refreshPreview();
  };

  overlayCanvas.addEventListener('mousedown', (e) => { saveMaskSnapshot(); brush.isDrawing = true; lastPoint = null; handlePaint(e); });
  overlayCanvas.addEventListener('mousemove', handlePaint);
  overlayCanvas.addEventListener('mouseup', () => { brush.isDrawing = false; lastPoint = null; });
  overlayCanvas.addEventListener('mouseleave', () => { brush.isDrawing = false; lastPoint = null; });
  overlayCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); saveMaskSnapshot(); brush.isDrawing = true; lastPoint = null; handlePaint(e); });
  overlayCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); handlePaint(e); });
  overlayCanvas.addEventListener('touchend', () => { brush.isDrawing = false; });

  undoBtn.addEventListener('click', () => {
    if (maskHistory.length > 0) { segResult.mask.data.set(maskHistory.pop()!); refreshPreview(); }
  });

  canvasContainer.appendChild(overlayCanvas);
  wrapper.appendChild(canvasContainer);

  const hint = document.createElement('p');
  hint.textContent = '高亮区域为主体，暗色为背景。可用画笔手动调整';
  hint.style.cssText = 'color: var(--text-muted, rgba(131,24,67,0.5)); font-size: 12px; margin: 0; text-align: center;';
  wrapper.appendChild(hint);

  // ── 操作按钮 ──
  const buttonGroup = document.createElement('div');
  buttonGroup.style.cssText = 'display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; width: 100%;';

  const retryBtn = document.createElement('button');
  retryBtn.textContent = '重新选择照片';
  retryBtn.style.cssText = `
    padding: 10px 24px;
    border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
    background-color: var(--bg-surface, #FFFFFF);
    color: var(--text-primary, #0A0A0A);
    font-family: var(--font-heading, 'Archivo', sans-serif);
    font-size: 13px; font-weight: 700; cursor: pointer;
    text-transform: uppercase; letter-spacing: 0.04em;
    transition: all var(--transition-fast, 150ms ease);
    box-shadow: var(--shadow-brutal-sm, 4px 4px 0 #0A0A0A);
  `;
  retryBtn.addEventListener('mouseenter', () => {
    retryBtn.style.transform = 'translate(-1px, -1px)';
    retryBtn.style.boxShadow = 'var(--shadow-brutal, 6px 6px 0 #0A0A0A)';
  });
  retryBtn.addEventListener('mouseleave', () => {
    retryBtn.style.transform = 'translate(0, 0)';
    retryBtn.style.boxShadow = 'var(--shadow-brutal-sm, 4px 4px 0 #0A0A0A)';
  });
  retryBtn.addEventListener('click', onRetry);

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = '确认分割结果';
  confirmBtn.style.cssText = `
    padding: 10px 24px;
    border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
    background: var(--bg-dark, #0A0A0A);
    color: #FFFFFF;
    font-family: var(--font-heading, 'Archivo', sans-serif);
    font-size: 13px; font-weight: 700; cursor: pointer;
    text-transform: uppercase; letter-spacing: 0.04em;
    transition: all var(--transition-fast, 150ms ease);
    box-shadow: var(--shadow-brutal, 6px 6px 0 #0A0A0A);
  `;
  confirmBtn.addEventListener('mouseenter', () => {
    confirmBtn.style.backgroundColor = 'var(--accent, #EC4899)';
    confirmBtn.style.transform = 'translate(-2px, -2px)';
    confirmBtn.style.boxShadow = 'var(--shadow-brutal-hover, 10px 10px 0 #0A0A0A)';
  });
  confirmBtn.addEventListener('mouseleave', () => {
    confirmBtn.style.backgroundColor = 'var(--bg-dark, #0A0A0A)';
    confirmBtn.style.transform = 'translate(0, 0)';
    confirmBtn.style.boxShadow = 'var(--shadow-brutal, 6px 6px 0 #0A0A0A)';
  });
  confirmBtn.addEventListener('click', () => {
    const data = segResult.mask.data;
    let hasFg = false;
    for (let i = 3; i < data.length; i += 4) { if (data[i] > 128) { hasFg = true; break; } }
    segResult.hasSubject = hasFg;
    onConfirm();
  });

  buttonGroup.appendChild(retryBtn);
  buttonGroup.appendChild(confirmBtn);
  wrapper.appendChild(buttonGroup);
  container.appendChild(wrapper);
}
