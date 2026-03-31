// ============================================================
// 照片出框效果 - 文件上传组件（Neubrutalism 风格）
// @author system
// ============================================================

import { validate } from '../core/image-validator';
import type { ValidationError } from '../types';

/** 相机 SVG 图标 */
const CAMERA_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent, #EC4899)"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`;

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

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片加载失败')); };
    img.src = url;
  });
}

async function handleFile(
  file: File,
  elements: { errorEl: HTMLElement; previewEl: HTMLElement; dropZone: HTMLElement },
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
      max-width: 100%; max-height: 300px; object-fit: contain;
      border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
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
 * 创建文件上传界面 - Neubrutalism 风格
 */
export function createUploadUI(
  container: HTMLElement,
  onFileAccepted: (file: File, image: HTMLImageElement) => void,
): void {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px;';

  // 拖拽上传区域 - 硬边框 + 硬阴影
  const dropZone = document.createElement('div');
  dropZone.style.cssText = `
    width: 100%; max-width: 520px; min-height: 240px;
    border: var(--border-width, 3px) dashed var(--border-brutal, #0A0A0A);
    background-color: var(--bg-surface, #FFFFFF);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    cursor: pointer; gap: 16px;
    padding: 40px 32px; box-sizing: border-box;
    box-shadow: var(--shadow-brutal, 6px 6px 0 #0A0A0A);
    transition: box-shadow var(--transition-fast, 150ms ease),
                transform var(--transition-fast, 150ms ease),
                border-color var(--transition-fast, 150ms ease);
  `;

  // 图标
  const iconWrap = document.createElement('div');
  iconWrap.style.cssText = `
    width: 80px; height: 80px;
    background: var(--accent-yellow, #FFEB3B);
    border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
    display: flex; align-items: center; justify-content: center;
  `;
  iconWrap.innerHTML = CAMERA_ICON;

  // 文字
  const label = document.createElement('p');
  label.textContent = '拖拽照片到此处，或点击选择文件';
  label.style.cssText = `
    color: var(--text-primary, #0A0A0A);
    font-family: var(--font-heading, 'Archivo', sans-serif);
    font-size: 15px; font-weight: 700;
    margin: 0; text-align: center;
    text-transform: uppercase; letter-spacing: 0.02em;
  `;

  const hint = document.createElement('p');
  hint.textContent = '支持 JPEG、PNG、WebP 格式，最大 20MB';
  hint.style.cssText = `
    color: var(--text-muted, rgba(131,24,67,0.5));
    font-size: 13px; margin: 0; text-align: center;
  `;

  // 选择文件按钮
  const selectBtn = document.createElement('div');
  selectBtn.textContent = '选择文件';
  selectBtn.style.cssText = `
    padding: 8px 24px;
    background: var(--accent, #EC4899);
    color: #FFFFFF;
    font-family: var(--font-heading, 'Archivo', sans-serif);
    font-size: 13px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
    border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
    box-shadow: var(--shadow-brutal-sm, 4px 4px 0 #0A0A0A);
    cursor: pointer;
  `;

  dropZone.appendChild(iconWrap);
  dropZone.appendChild(label);
  dropZone.appendChild(hint);
  dropZone.appendChild(selectBtn);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/jpeg,image/png,image/webp';
  fileInput.style.display = 'none';
  fileInput.setAttribute('aria-label', '选择图片文件');

  const errorEl = document.createElement('div');
  errorEl.setAttribute('role', 'alert');
  errorEl.style.cssText = `
    display: none;
    color: var(--accent-red, #FF5252);
    background-color: var(--bg-surface, #FFFFFF);
    border: var(--border-width, 3px) solid var(--accent-red, #FF5252);
    box-shadow: 4px 4px 0 var(--accent-red, #FF5252);
    padding: 12px 18px; font-size: 14px; font-weight: 500;
    width: 100%; max-width: 520px;
    box-sizing: border-box; text-align: center;
  `;

  const previewEl = document.createElement('div');
  previewEl.style.cssText = 'display: none; width: 100%; max-width: 520px; text-align: center; padding: 12px 0;';

  const elements = { errorEl, previewEl, dropZone };

  // 交互
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('mouseenter', () => {
    dropZone.style.boxShadow = 'var(--shadow-brutal-hover, 10px 10px 0 #0A0A0A)';
    dropZone.style.transform = 'translate(-2px, -2px)';
    dropZone.style.borderColor = 'var(--accent, #EC4899)';
  });
  dropZone.addEventListener('mouseleave', () => {
    dropZone.style.boxShadow = 'var(--shadow-brutal, 6px 6px 0 #0A0A0A)';
    dropZone.style.transform = 'translate(0, 0)';
    dropZone.style.borderColor = 'var(--border-brutal, #0A0A0A)';
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file, elements, onFileAccepted);
    fileInput.value = '';
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent, #EC4899)';
    dropZone.style.borderStyle = 'solid';
    dropZone.style.boxShadow = 'var(--shadow-accent, 6px 6px 0 #EC4899)';
  });
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-brutal, #0A0A0A)';
    dropZone.style.borderStyle = 'dashed';
    dropZone.style.boxShadow = 'var(--shadow-brutal, 6px 6px 0 #0A0A0A)';
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-brutal, #0A0A0A)';
    dropZone.style.borderStyle = 'dashed';
    dropZone.style.boxShadow = 'var(--shadow-brutal, 6px 6px 0 #0A0A0A)';
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file, elements, onFileAccepted);
  });

  wrapper.appendChild(dropZone);
  wrapper.appendChild(fileInput);
  wrapper.appendChild(errorEl);
  wrapper.appendChild(previewEl);
  container.appendChild(wrapper);
}
