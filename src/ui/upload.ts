// ============================================================
// 照片出框效果 - 文件上传组件
// ============================================================

import { validate } from '../core/image-validator';
import type { ValidationError } from '../types';

/**
 * 根据验证错误类型返回中文错误提示
 * @param error 验证错误对象
 * @returns 中文错误提示文字
 */
function getErrorMessage(error: ValidationError): string {
  switch (error.type) {
    case 'invalid_format':
      return '不支持的文件格式，请上传 JPEG、PNG 或 WebP 格式的图片';
    case 'file_too_large':
      return '文件大小超过限制（最大 20MB）';
    case 'file_empty':
      return '文件为空，请选择有效的图片文件';
  }
}

/**
 * 将文件加载为 HTMLImageElement
 * @param file 图片文件
 * @returns 加载完成的 HTMLImageElement
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

/**
 * 处理用户选择的文件：验证、加载、预览、回调
 * @param file 用户选择的文件
 * @param elements UI 元素引用
 * @param onFileAccepted 文件验证通过后的回调
 */
async function handleFile(
  file: File,
  elements: {
    errorEl: HTMLElement;
    previewEl: HTMLElement;
    dropZone: HTMLElement;
  },
  onFileAccepted: (file: File, image: HTMLImageElement) => void,
): Promise<void> {
  const { errorEl, previewEl, dropZone } = elements;

  // 清除之前的错误和预览
  errorEl.textContent = '';
  errorEl.style.display = 'none';
  previewEl.innerHTML = '';
  previewEl.style.display = 'none';

  // 验证文件
  const result = validate(file);
  if (!result.valid && result.error) {
    errorEl.textContent = getErrorMessage(result.error);
    errorEl.style.display = 'block';
    return;
  }

  // 加载图片并显示预览
  try {
    const image = await loadImageFromFile(file);

    // 显示预览图片
    const previewImg = document.createElement('img');
    previewImg.src = URL.createObjectURL(file);
    previewImg.alt = '照片预览';
    previewImg.style.cssText = 'max-width: 100%; max-height: 300px; border-radius: 8px; object-fit: contain;';
    previewEl.innerHTML = '';
    previewEl.appendChild(previewImg);
    previewEl.style.display = 'block';

    // 隐藏上传区域
    dropZone.style.display = 'none';

    // 回调通知外部
    onFileAccepted(file, image);
  } catch {
    errorEl.textContent = '图片加载失败，请重试';
    errorEl.style.display = 'block';
  }
}

/**
 * 创建文件上传界面，支持拖拽和点击上传
 * @param container 挂载容器元素
 * @param onFileAccepted 文件验证通过后的回调，接收文件和加载后的图片元素
 */
export function createUploadUI(
  container: HTMLElement,
  onFileAccepted: (file: File, image: HTMLImageElement) => void,
): void {
  // 创建上传区域容器
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px;';

  // 拖拽上传区域
  const dropZone = document.createElement('div');
  dropZone.style.cssText = `
    width: 100%;
    max-width: 480px;
    min-height: 200px;
    border: 2px dashed #555;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-color 0.2s, background-color 0.2s;
    background-color: rgba(255, 255, 255, 0.03);
    padding: 32px;
    box-sizing: border-box;
  `;

  // 上传图标
  const icon = document.createElement('div');
  icon.textContent = '📷';
  icon.style.cssText = 'font-size: 48px; margin-bottom: 12px;';

  // 提示文字
  const label = document.createElement('p');
  label.textContent = '拖拽照片到此处，或点击选择文件';
  label.style.cssText = 'color: #aaa; font-size: 15px; margin: 0 0 4px 0; text-align: center;';

  // 格式提示
  const hint = document.createElement('p');
  hint.textContent = '支持 JPEG、PNG、WebP 格式，最大 20MB';
  hint.style.cssText = 'color: #666; font-size: 13px; margin: 0; text-align: center;';

  dropZone.appendChild(icon);
  dropZone.appendChild(label);
  dropZone.appendChild(hint);

  // 隐藏的文件输入框
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/jpeg,image/png,image/webp';
  fileInput.style.display = 'none';

  // 错误提示区域
  const errorEl = document.createElement('div');
  errorEl.style.cssText = `
    display: none;
    color: #ff6b6b;
    background-color: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.3);
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 14px;
    width: 100%;
    max-width: 480px;
    box-sizing: border-box;
    text-align: center;
  `;

  // 预览区域
  const previewEl = document.createElement('div');
  previewEl.style.cssText = `
    display: none;
    width: 100%;
    max-width: 480px;
    text-align: center;
    padding: 12px 0;
  `;

  const elements = { errorEl, previewEl, dropZone };

  // 点击上传区域触发文件选择
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  // 文件选择变化事件
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
      handleFile(file, elements, onFileAccepted);
    }
    // 重置 input 以允许重复选择同一文件
    fileInput.value = '';
  });

  // 拖拽进入 - 高亮样式
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#7c6fff';
    dropZone.style.backgroundColor = 'rgba(124, 111, 255, 0.08)';
  });

  // 拖拽离开 - 恢复样式
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#555';
    dropZone.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
  });

  // 拖拽放下 - 处理文件
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#555';
    dropZone.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';

    const file = e.dataTransfer?.files[0];
    if (file) {
      handleFile(file, elements, onFileAccepted);
    }
  });

  // 组装 DOM
  wrapper.appendChild(dropZone);
  wrapper.appendChild(fileInput);
  wrapper.appendChild(errorEl);
  wrapper.appendChild(previewEl);
  container.appendChild(wrapper);
}
