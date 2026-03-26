// ============================================================
// 照片出框效果 - 分割预览组件
// 展示分割结果预览，允许用户确认或重新选择照片
// ============================================================

import type { SegmentationResult } from '../types';

/**
 * 将遮罩叠加绘制到原图上，生成预览 Canvas
 * 前景区域正常显示，背景区域半透明变暗，便于用户直观确认分割效果
 * @param originalImage 原始照片
 * @param mask 分割遮罩 ImageData
 * @returns 叠加后的 Canvas 元素
 */
function createMaskOverlayCanvas(
  originalImage: HTMLImageElement,
  mask: ImageData,
): HTMLCanvasElement {
  const width = originalImage.naturalWidth;
  const height = originalImage.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 先绘制原图
  ctx.drawImage(originalImage, 0, 0, width, height);

  // 获取原图像素数据
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const maskPixels = mask.data;

  // 遍历像素：背景区域（遮罩 alpha 低）变暗处理
  for (let i = 0; i < pixels.length; i += 4) {
    const maskAlpha = maskPixels[i + 3]; // 遮罩的 alpha 通道表示前景置信度
    if (maskAlpha < 128) {
      // 背景区域：降低亮度并叠加半透明蓝色调，突出前景
      pixels[i] = Math.round(pixels[i] * 0.3);       // R
      pixels[i + 1] = Math.round(pixels[i + 1] * 0.3); // G
      pixels[i + 2] = Math.round(pixels[i + 2] * 0.4); // B（保留少许蓝色调）
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * 创建分割预览界面
 * 展示原图与遮罩叠加的预览效果，允许用户确认分割结果或重新选择照片
 * @param container 挂载容器元素
 * @param originalImage 原始照片
 * @param segResult 分割结果
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
  // 清空容器
  container.innerHTML = '';

  // 外层包裹容器
  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    'width: 100%; display: flex; flex-direction: column; align-items: center; gap: 16px;';

  // 标题
  const title = document.createElement('h3');
  title.textContent = '分割预览';
  title.style.cssText = 'color: #eee; font-size: 18px; margin: 0; font-weight: 600;';
  wrapper.appendChild(title);

  // 无主体警告提示
  if (!segResult.hasSubject) {
    const warning = document.createElement('div');
    warning.style.cssText = `
      color: #ffb347;
      background-color: rgba(255, 179, 71, 0.12);
      border: 1px solid rgba(255, 179, 71, 0.35);
      border-radius: 8px;
      padding: 12px 18px;
      font-size: 14px;
      width: 100%;
      max-width: 480px;
      box-sizing: border-box;
      text-align: center;
      line-height: 1.6;
    `;
    warning.textContent =
      '未能识别照片中的主体，该照片可能不适合进行出框效果处理';
    wrapper.appendChild(warning);
  }

  // 预览画布容器
  const canvasContainer = document.createElement('div');
  canvasContainer.style.cssText = `
    width: 100%;
    max-width: 480px;
    text-align: center;
    border-radius: 8px;
    overflow: hidden;
    background-color: rgba(255, 255, 255, 0.03);
  `;

  // 使用 Canvas 叠加遮罩生成预览
  const overlayCanvas = createMaskOverlayCanvas(originalImage, segResult.mask);
  overlayCanvas.style.cssText =
    'max-width: 100%; max-height: 400px; border-radius: 8px; object-fit: contain; display: block; margin: 0 auto;';
  canvasContainer.appendChild(overlayCanvas);
  wrapper.appendChild(canvasContainer);

  // 提示说明
  const hint = document.createElement('p');
  hint.textContent = '高亮区域为识别到的主体，暗色区域为背景';
  hint.style.cssText = 'color: #888; font-size: 13px; margin: 0; text-align: center;';
  wrapper.appendChild(hint);

  // 按钮容器
  const buttonGroup = document.createElement('div');
  buttonGroup.style.cssText =
    'display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;';

  // 重新选择照片按钮
  const retryBtn = document.createElement('button');
  retryBtn.textContent = '重新选择照片';
  retryBtn.style.cssText = `
    padding: 10px 24px;
    border-radius: 8px;
    border: 1px solid #555;
    background-color: transparent;
    color: #ccc;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s;
  `;
  retryBtn.addEventListener('mouseenter', () => {
    retryBtn.style.borderColor = '#888';
    retryBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
  });
  retryBtn.addEventListener('mouseleave', () => {
    retryBtn.style.borderColor = '#555';
    retryBtn.style.backgroundColor = 'transparent';
  });
  retryBtn.addEventListener('click', onRetry);

  // 确认分割结果按钮
  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = '确认分割结果';
  confirmBtn.style.cssText = `
    padding: 10px 24px;
    border-radius: 8px;
    border: none;
    background-color: #7c6fff;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  `;
  confirmBtn.addEventListener('mouseenter', () => {
    confirmBtn.style.backgroundColor = '#6a5ce7';
  });
  confirmBtn.addEventListener('mouseleave', () => {
    confirmBtn.style.backgroundColor = '#7c6fff';
  });
  confirmBtn.addEventListener('click', onConfirm);

  buttonGroup.appendChild(retryBtn);
  buttonGroup.appendChild(confirmBtn);
  wrapper.appendChild(buttonGroup);

  container.appendChild(wrapper);
}
