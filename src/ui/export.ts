// ============================================================
// 照片出框效果 - 导出组件（Neubrutalism 风格）
// @author system
// ============================================================

import type { ExportFormat } from '../types';

/** 下载图标 */
const DOWNLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

// ── 样式 ──

const RADIO_BASE = `
  display: flex; align-items: center; gap: 6px;
  font-family: var(--font-heading, 'Archivo', sans-serif);
  font-size: 12px; font-weight: 700; cursor: pointer;
  padding: 8px 12px; text-transform: uppercase;
  letter-spacing: 0.04em;
  transition: all var(--transition-fast, 150ms ease);
  user-select: none; flex: 1; justify-content: center;
  border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
`;

const RADIO_STYLE = `${RADIO_BASE}
  background-color: var(--bg-surface, #FFFFFF);
  color: var(--text-primary, #0A0A0A);
  box-shadow: 2px 2px 0 var(--border-brutal, #0A0A0A);
`;

const RADIO_SELECTED = `${RADIO_BASE}
  background-color: var(--accent, #EC4899);
  color: #FFFFFF;
  box-shadow: 3px 3px 0 var(--border-brutal, #0A0A0A);
`;

interface FormatOption {
  value: ExportFormat;
  label: string;
  description: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'png', label: 'PNG', description: 'PNG' },
  { value: 'jpeg', label: 'JPEG', description: 'JPEG' },
  { value: 'webm', label: 'Video', description: '动态视频' },
];

function updateRadioStyles(labels: HTMLLabelElement[], selectedIndex: number): void {
  labels.forEach((label, i) => {
    label.style.cssText = i === selectedIndex ? RADIO_SELECTED : RADIO_STYLE;
  });
}

/**
 * 创建导出界面 - Neubrutalism 风格
 */
export function createExportUI(
  container: HTMLElement,
  onExport: (format: ExportFormat) => void,
): void {
  let selectedFormat: ExportFormat = 'png';

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
  title.textContent = '导出设置';
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

  // 格式选择
  const formatGroup = document.createElement('div');
  formatGroup.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

  const formatLabel = document.createElement('span');
  formatLabel.textContent = '导出格式';
  formatLabel.style.cssText = `
    color: var(--text-primary, #0A0A0A);
    font-family: var(--font-heading, 'Archivo', sans-serif);
    font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.06em;
    user-select: none;
  `;
  formatGroup.appendChild(formatLabel);

  const radioContainer = document.createElement('div');
  radioContainer.style.cssText = 'display: flex; gap: 6px;';

  const labels: HTMLLabelElement[] = [];

  FORMAT_OPTIONS.forEach((option, index) => {
    const label = document.createElement('label');
    label.style.cssText = index === 0 ? RADIO_SELECTED : RADIO_STYLE;

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'export-format';
    radio.value = option.value;
    radio.checked = index === 0;
    radio.style.cssText = 'accent-color: var(--accent, #EC4899); cursor: pointer; width: 14px; height: 14px;';

    const text = document.createElement('span');
    text.textContent = option.description;

    radio.addEventListener('change', () => {
      if (radio.checked) {
        selectedFormat = option.value;
        updateRadioStyles(labels, index);
      }
    });

    label.appendChild(radio);
    label.appendChild(text);
    labels.push(label);
    radioContainer.appendChild(label);
  });

  formatGroup.appendChild(radioContainer);
  wrapper.appendChild(formatGroup);

  // 导出按钮
  const exportBtn = document.createElement('button');
  exportBtn.innerHTML = `${DOWNLOAD_ICON}<span>导出效果图</span>`;
  exportBtn.style.cssText = `
    padding: 12px 28px;
    border: var(--border-width, 3px) solid var(--border-brutal, #0A0A0A);
    background: var(--bg-dark, #0A0A0A);
    color: #FFFFFF;
    font-family: var(--font-heading, 'Archivo', sans-serif);
    font-size: 14px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
    cursor: pointer;
    transition: all var(--transition-fast, 150ms ease);
    align-self: center;
    display: flex; align-items: center; gap: 8px;
    box-shadow: var(--shadow-brutal, 6px 6px 0 #0A0A0A);
  `;

  exportBtn.addEventListener('mouseenter', () => {
    exportBtn.style.backgroundColor = 'var(--accent, #EC4899)';
    exportBtn.style.boxShadow = 'var(--shadow-brutal-hover, 10px 10px 0 #0A0A0A)';
    exportBtn.style.transform = 'translate(-2px, -2px)';
  });
  exportBtn.addEventListener('mouseleave', () => {
    exportBtn.style.backgroundColor = 'var(--bg-dark, #0A0A0A)';
    exportBtn.style.boxShadow = 'var(--shadow-brutal, 6px 6px 0 #0A0A0A)';
    exportBtn.style.transform = 'translate(0, 0)';
  });
  exportBtn.addEventListener('mousedown', () => {
    exportBtn.style.boxShadow = '2px 2px 0 #0A0A0A';
    exportBtn.style.transform = 'translate(2px, 2px)';
  });
  exportBtn.addEventListener('mouseup', () => {
    exportBtn.style.boxShadow = 'var(--shadow-brutal-hover, 10px 10px 0 #0A0A0A)';
    exportBtn.style.transform = 'translate(-2px, -2px)';
  });

  exportBtn.addEventListener('click', () => onExport(selectedFormat));

  wrapper.appendChild(exportBtn);
  container.appendChild(wrapper);
}
