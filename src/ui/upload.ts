// ============================================================
// 照片出框效果 - 文件上传组件
// @author system
// ============================================================

import { validate } from '../core/image-validator';
import type { ValidationError } from '../types';

/** 相机 SVG 图标（Lucide 风格） */
const CAMERA_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent, #7c6fff)"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`;

/** 上传箭头 SVG 图标 */
const UPLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted, #6b6b80)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;

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

  errorEl.textContent = '';
  errorEl.style.display = 'none';
  previewEl.innerHTML = '';
  previewEl.style.display = 'none';

  const result = validate(file);
  if (!result.valid && result.error) {
    errorEl.textContent = getErrorMessage(result.error);
    errorEl.style.display = 'block';
    return;
  }

  try {
    const image = await loadImageFromFile(file);

    const previewImg = document.createElement('img');
    previewImg.src = URL.createObjectURL(file);
    previewImg.alt = '照片预览';
    previewImg.style.cssText = `
      max-width: 100%; max-height: 300px;
      border-radius: var(--radius-md, 12px);
      object-fit: contain;
      box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.3));
    `;
    previewEl.innerHTML = '';
    previewEl.appendChild(previewImg);
    previewEl.style.display = 'block';

    dropZone.style.display = 'none';

    onFileAccepted(file, image);
  } catch {
    errorEl.textContent = '图片加载失败，请重试';
    errorEl.style.display = 'block';
  }
}

/**
 * 创建文件上传界面，支持拖拽和点击上传
 * @param container 挂载容器元素
 * @param onFileAccepted 文件验证通过后的回调
 */
export function createUploadUI(
  container: HTMLElement,
  onFileAccepted: (file: File, image: HTMLImageElement) => void,
): void {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px;';

  // 拖拽上传区域
  const dropZone = document.createElement('div');
  dropZone.style.cssText = `
    width: 100%;
    max-width: 520px;
    min-height: 220px;
    border: 1.5px dashed var(--border-default, rgba(255,255,255,0.1));
    border-radius: var(--radius-xl, 20px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-color var(--transition-normal, 200ms ease),
                background-color var(--transition-normal, 200ms ease),
                box-shadow var(--transition-normal, 200ms ease);
    background-color: var(--bg-surface, rgba(255,255,255,0.035));
    padding: 40px 32px;
    box-sizing: border-box;
    gap: 16px;
  `;

  // 图标容器（带微妙背景）
  const iconWrap = document.createElement('div');
  iconWrap.style.cssText = `
    width: 72px; height: 72px;
    border-radius: 50%;
    background: var(--accent-glow, rgba(124,111,255,0.12));
    display: flex; align-items: center; justify-content: center;
    transition: transform var(--transition-normal, 200ms ease),
                background-color var(--transition-normal, 200ms ease);
  `;
  iconWrap.innerHTML = CAMERA_ICON;

  // 文字区域
  const textWrap = document.createElement('div');
  textWrap.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px;';

  const label = document.createElement('p');
  label.style.cssText = `
    color: var(--text-secondary, #a0a0b8);
    font-size: 15px; font-weight: 500;
    margin: 0; text-align: center;
    display: flex; align-items: center; gap: 6px;
  `;
  label.innerHTML = `拖拽照片到此处，或点击选择`;

  const hint = document.createElement('p');
  hint.textContent = '支持 JPEG、PNG、WebP 格式，最大 20MB';
  hint.style.cssText = `
    color: var(--text-muted, #6b6b80);
    font-size: 13px; margin: 0; text-align: center;
  `;

  // 上传按钮样式的提示
  const uploadHint = document.createElement('div');
  uploadHint.style.cssText = `
    display: flex; align-items: center; gap: 6px;
    padding: 8px 20px;
    border-radius: var(--radius-sm, 8px);
    background: var(--accent-glow, rgba(124,111,255,0.12));
    color: var(--accent, #7c6fff);
    font-size: 13px; font-weight: 500;
    transition: background-color var(--transition-fast, 150ms ease);
  `;
  uploadHint.innerHTML = `${UPLOAD_ICON}<span>选择文件</span>`;

  textWrap.appendChild(label);
  textWrap.appendChild(hint);

  dropZone.appendChild(iconWrap);
  dropZone.appendChild(textWrap);
  dropZone.appendChild(uploadHint);

  // 隐藏的文件输入框
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/jpeg,image/png,image/webp';
  fileInput.style.display = 'none';
  fileInput.setAttribute('aria-label', '选择图片文件');

  // 错误提示区域
  const errorEl = document.createElement('div');
  errorEl.setAttribute('role', 'alert');
  errorEl.style.cssText = `
    display: none;
    color: var(--error, #ff6b6b);
    background-color: var(--error-bg, rgba(255,107,107,0.08));
    border: 1px solid var(--error-border, rgba(255,107,107,0.2));
    border-radius: var(--radius-md, 12px);
    padding: 12px 18px;
    font-size: 14px;
    width: 100%; max-width: 520px;
    box-sizing: border-box;
    text-align: center;
    backdrop-filter: blur(8px);
  `;

  // 预览区域
  const previewEl = document.createElement('div');
  previewEl.style.cssText = `
    display: none;
    width: 100%; max-width: 520px;
    text-align: center;
    padding: 12px 0;
  `;

  const elements = { errorEl, previewEl, dropZone };

  // 交互事件
  dropZone.addEventListener('click', () => fileInput.click());

  // 悬停效果
  dropZone.addEventListener('mouseenter', () => {
    dropZone.style.borderColor = 'var(--accent, #7c6fff)';
    dropZone.style.backgroundColor = 'var(--bg-surface-hover, rgba(255,255,255,0.065))';
    dropZone.style.boxShadow = 'var(--shadow-glow, 0 0 20px rgba(124,111,255,0.15))';
    iconWrap.style.transform = 'scale(1.05)';
    iconWrap.style.backgroundColor = 'var(--accent-glow-strong, rgba(124,111,255,0.25))';
  });
  dropZone.addEventListener('mouseleave', () => {
    dropZone.style.borderColor = 'var(--border-default, rgba(255,255,255,0.1))';
    dropZone.style.backgroundColor = 'var(--bg-surface, rgba(255,255,255,0.035))';
    dropZone.style.boxShadow = 'none';
    iconWrap.style.transform = 'scale(1)';
    iconWrap.style.backgroundColor = 'var(--accent-glow, rgba(124,111,255,0.12))';
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file, elements, onFileAccepted);
    fileInput.value = '';
  });

  // 拖拽事件
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent, #7c6fff)';
    dropZone.style.backgroundColor = 'var(--accent-glow, rgba(124,111,255,0.12))';
    dropZone.style.boxShadow = 'var(--shadow-glow, 0 0 20px rgba(124,111,255,0.15))';
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-default, rgba(255,255,255,0.1))';
    dropZone.style.backgroundColor = 'var(--bg-surface, rgba(255,255,255,0.035))';
    dropZone.style.boxShadow = 'none';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-default, rgba(255,255,255,0.1))';
    dropZone.style.backgroundColor = 'var(--bg-surface, rgba(255,255,255,0.035))';
    dropZone.style.boxShadow = 'none';
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file, elements, onFileAccepted);
  });

  wrapper.appendChild(dropZone);
  wrapper.appendChild(fileInput);
  wrapper.appendChild(errorEl);
  wrapper.appendChild(previewEl);
  container.appendChild(wrapper);
}
