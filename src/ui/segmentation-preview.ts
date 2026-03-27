// ============================================================
// 照片出框效果 - 分割预览组件
// 展示分割结果预览，支持手动画笔编辑遮罩区域
// ============================================================

import type { SegmentationResult } from '../types';

/** 画笔模式 */
type BrushMode = 'add' | 'remove';

/** 画笔状态 */
interface BrushState {
  mode: BrushMode;
  size: number;
  isDrawing: boolean;
}

/**
 * 将遮罩叠加绘制到原图上，生成预览
 * 前景区域正常显示，背景区域半透明变暗
 */
function renderOverlay(
  ctx: CanvasRenderingContext2D,
  originalImage: HTMLImageElement,
  mask: ImageData,
  width: number,
  height: number,
): void {
  // 先绘制原图
  ctx.drawImage(originalImage, 0, 0, width, height);

  // 获取原图像素数据
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const maskPixels = mask.data;

  // 遍历像素：背景区域变暗处理
  for (let i = 0; i < pixels.length; i += 4) {
    const maskAlpha = maskPixels[i + 3];
    if (maskAlpha < 128) {
      pixels[i] = Math.round(pixels[i] * 0.3);
      pixels[i + 1] = Math.round(pixels[i + 1] * 0.3);
      pixels[i + 2] = Math.round(pixels[i + 2] * 0.4);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * 在遮罩上绘制画笔笔触
 * @param mask 遮罩 ImageData（直接修改）
 * @param x 画笔中心 x（原图坐标）
 * @param y 画笔中心 y（原图坐标）
 * @param radius 画笔半径（原图像素）
 * @param mode 添加前景或移除前景
 */
function paintOnMask(
  mask: ImageData,
  x: number,
  y: number,
  radius: number,
  mode: BrushMode,
): void {
  const w = mask.width;
  const h = mask.height;
  const data = mask.data;
  const r2 = radius * radius;

  const minX = Math.max(0, Math.floor(x - radius));
  const maxX = Math.min(w - 1, Math.ceil(x + radius));
  const minY = Math.max(0, Math.floor(y - radius));
  const maxY = Math.min(h - 1, Math.ceil(y + radius));

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const dx = px - x;
      const dy = py - y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= r2) {
        const idx = (py * w + px) * 4;
        // 边缘柔化：距离越远 alpha 越低
        const edgeFactor = 1 - Math.sqrt(dist2) / radius;
        const softAlpha = Math.round(edgeFactor * 255);
        if (mode === 'add') {
          // 添加前景：取较大值
          data[idx + 3] = Math.max(data[idx + 3], softAlpha);
        } else {
          // 移除前景：减小 alpha
          data[idx + 3] = Math.min(data[idx + 3], 255 - softAlpha);
        }
      }
    }
  }
}

/**
 * 将 Canvas 坐标转换为原图坐标
 */
function canvasToImageCoords(
  canvasX: number,
  canvasY: number,
  canvas: HTMLCanvasElement,
  imgWidth: number,
  imgHeight: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = imgWidth / rect.width;
  const scaleY = imgHeight / rect.height;
  return {
    x: (canvasX - rect.left) * scaleX,
    y: (canvasY - rect.top) * scaleY,
  };
}


// 按钮通用样式
const BTN_STYLE = `
  padding: 8px 16px; border-radius: 6px; font-size: 13px;
  cursor: pointer; transition: background-color 0.2s, border-color 0.2s;
`;
const BTN_ACTIVE = `${BTN_STYLE} border: 2px solid #7c6fff; background-color: rgba(124,111,255,0.15); color: #eee;`;
const BTN_INACTIVE = `${BTN_STYLE} border: 1px solid #555; background-color: transparent; color: #ccc;`;

/**
 * 创建分割预览界面（含手动画笔编辑）
 * @param container 挂载容器元素
 * @param originalImage 原始照片
 * @param segResult 分割结果（mask 会被直接修改）
 * @param onConfirm 用户确认分割结果的回调
 * @param onRetry 用户选择重新选择照片的回调
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

  // 画笔状态
  const brush: BrushState = { mode: 'add', size: 20, isDrawing: false };

  // 保存遮罩历史用于撤销
  const maskHistory: Uint8ClampedArray[] = [];
  const saveMaskSnapshot = () => {
    maskHistory.push(new Uint8ClampedArray(segResult.mask.data));
    if (maskHistory.length > 20) maskHistory.shift(); // 最多保留 20 步
  };

  // 外层容器
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px;';

  // 标题
  const title = document.createElement('h3');
  title.textContent = '分割预览';
  title.style.cssText = 'color: #eee; font-size: 18px; margin: 0; font-weight: 600;';
  wrapper.appendChild(title);

  // 无主体警告
  if (!segResult.hasSubject) {
    const warning = document.createElement('div');
    warning.style.cssText = `
      color: #ffb347; background-color: rgba(255,179,71,0.12);
      border: 1px solid rgba(255,179,71,0.35); border-radius: 8px;
      padding: 12px 18px; font-size: 14px; width: 100%; max-width: 480px;
      box-sizing: border-box; text-align: center; line-height: 1.6;
    `;
    warning.textContent = '未能识别照片中的主体，可使用画笔手动选择主体区域';
    wrapper.appendChild(warning);
  }

  // ── 画笔工具栏 ──
  const toolbar = document.createElement('div');
  toolbar.style.cssText = 'display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center;';

  // 添加前景按钮
  const addBtn = document.createElement('button');
  addBtn.textContent = '✏️ 添加主体';
  addBtn.style.cssText = BTN_ACTIVE;

  // 移除前景按钮
  const removeBtn = document.createElement('button');
  removeBtn.textContent = '🧹 移除区域';
  removeBtn.style.cssText = BTN_INACTIVE;

  const updateModeButtons = () => {
    addBtn.style.cssText = brush.mode === 'add' ? BTN_ACTIVE : BTN_INACTIVE;
    removeBtn.style.cssText = brush.mode === 'remove' ? BTN_ACTIVE : BTN_INACTIVE;
  };

  addBtn.addEventListener('click', () => { brush.mode = 'add'; updateModeButtons(); });
  removeBtn.addEventListener('click', () => { brush.mode = 'remove'; updateModeButtons(); });

  // 画笔大小
  const sizeLabel = document.createElement('span');
  sizeLabel.textContent = `画笔: ${brush.size}px`;
  sizeLabel.style.cssText = 'color: #aaa; font-size: 12px; min-width: 70px;';

  const sizeSlider = document.createElement('input');
  sizeSlider.type = 'range';
  sizeSlider.min = '5';
  sizeSlider.max = '80';
  sizeSlider.value = String(brush.size);
  sizeSlider.style.cssText = 'width: 80px; accent-color: #7c6fff;';
  sizeSlider.addEventListener('input', () => {
    brush.size = parseInt(sizeSlider.value);
    sizeLabel.textContent = `画笔: ${brush.size}px`;
  });

  // 撤销按钮
  const undoBtn = document.createElement('button');
  undoBtn.textContent = '↩ 撤销';
  undoBtn.style.cssText = BTN_INACTIVE;

  toolbar.appendChild(addBtn);
  toolbar.appendChild(removeBtn);
  toolbar.appendChild(sizeSlider);
  toolbar.appendChild(sizeLabel);
  toolbar.appendChild(undoBtn);
  wrapper.appendChild(toolbar);

  // ── 预览画布 ──
  const canvasContainer = document.createElement('div');
  canvasContainer.style.cssText = `
    width: 100%; max-width: 480px; text-align: center;
    border-radius: 8px; overflow: hidden; background-color: rgba(255,255,255,0.03);
    position: relative;
  `;

  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = imgW;
  overlayCanvas.height = imgH;
  overlayCanvas.style.cssText = `
    max-width: 100%; max-height: 400px; border-radius: 8px;
    object-fit: contain; display: block; margin: 0 auto;
    cursor: crosshair;
  `;
  const overlayCtx = overlayCanvas.getContext('2d')!;

  // 初始渲染
  renderOverlay(overlayCtx, originalImage, segResult.mask, imgW, imgH);

  // 重新渲染预览
  const refreshPreview = () => {
    renderOverlay(overlayCtx, originalImage, segResult.mask, imgW, imgH);
  };

  // ── 画笔事件处理 ──
  // 记录上一个绘制点，用于两点之间线性插值实现顺滑笔触
  let lastPoint: { x: number; y: number } | null = null;

  /**
   * 在两点之间线性插值绘制，确保笔触连续顺滑
   */
  const paintLine = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // 步长为画笔半径的 1/3，确保密集覆盖
    const step = Math.max(1, brush.size / 3);
    const steps = Math.ceil(dist / step);

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const px = x0 + dx * t;
      const py = y0 + dy * t;
      paintOnMask(segResult.mask, px, py, brush.size, brush.mode);
    }
  };

  const handlePaint = (e: MouseEvent | TouchEvent) => {
    if (!brush.isDrawing) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = canvasToImageCoords(clientX, clientY, overlayCanvas, imgW, imgH);

    if (lastPoint) {
      // 从上一个点到当前点插值绘制
      paintLine(lastPoint.x, lastPoint.y, x, y);
    } else {
      // 第一个点直接绘制
      paintOnMask(segResult.mask, x, y, brush.size, brush.mode);
    }
    lastPoint = { x, y };
    refreshPreview();
  };

  overlayCanvas.addEventListener('mousedown', (e) => {
    saveMaskSnapshot();
    brush.isDrawing = true;
    lastPoint = null;
    handlePaint(e);
  });
  overlayCanvas.addEventListener('mousemove', handlePaint);
  overlayCanvas.addEventListener('mouseup', () => { brush.isDrawing = false; lastPoint = null; });
  overlayCanvas.addEventListener('mouseleave', () => { brush.isDrawing = false; lastPoint = null; });

  // 触摸支持
  overlayCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    saveMaskSnapshot();
    brush.isDrawing = true;
    lastPoint = null;
    handlePaint(e);
  });
  overlayCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); handlePaint(e); });
  overlayCanvas.addEventListener('touchend', () => { brush.isDrawing = false; });

  // 撤销
  undoBtn.addEventListener('click', () => {
    if (maskHistory.length > 0) {
      const prev = maskHistory.pop()!;
      segResult.mask.data.set(prev);
      refreshPreview();
    }
  });

  canvasContainer.appendChild(overlayCanvas);
  wrapper.appendChild(canvasContainer);

  // 提示
  const hint = document.createElement('p');
  hint.textContent = '高亮区域为主体，暗色为背景。可用画笔手动调整';
  hint.style.cssText = 'color: #888; font-size: 13px; margin: 0; text-align: center;';
  wrapper.appendChild(hint);

  // ── 操作按钮 ──
  const buttonGroup = document.createElement('div');
  buttonGroup.style.cssText = 'display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;';

  const retryBtn = document.createElement('button');
  retryBtn.textContent = '重新选择照片';
  retryBtn.style.cssText = `
    padding: 10px 24px; border-radius: 8px; border: 1px solid #555;
    background-color: transparent; color: #ccc; font-size: 14px; cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s;
  `;
  retryBtn.addEventListener('click', onRetry);

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = '确认分割结果';
  confirmBtn.style.cssText = `
    padding: 10px 24px; border-radius: 8px; border: none;
    background-color: #7c6fff; color: #fff; font-size: 14px; cursor: pointer;
    transition: background-color 0.2s;
  `;
  confirmBtn.addEventListener('mouseenter', () => { confirmBtn.style.backgroundColor = '#6a5ce7'; });
  confirmBtn.addEventListener('mouseleave', () => { confirmBtn.style.backgroundColor = '#7c6fff'; });
  confirmBtn.addEventListener('click', () => {
    // 用户手动编辑后，确保 hasSubject 为 true（如果有前景像素）
    const data = segResult.mask.data;
    let hasFg = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 128) { hasFg = true; break; }
    }
    segResult.hasSubject = hasFg;
    onConfirm();
  });

  buttonGroup.appendChild(retryBtn);
  buttonGroup.appendChild(confirmBtn);
  wrapper.appendChild(buttonGroup);

  container.appendChild(wrapper);
}
