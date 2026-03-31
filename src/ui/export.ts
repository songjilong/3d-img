// ============================================================
// 照片出框效果 - 导出组件
// @author system
// ============================================================

import type { ExportFormat } from '../types';

// ── SVG 图标 ──

const DOWNLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

// ── 样式常量 ──

const RADIO_LABEL_BASE = `
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; cursor: pointer;
  padding: 8px 12px;
  border-radius: var(--radius-sm, 8px);
  transition: all var(--transition-fast, 150ms ease);
  user-select: none; font-weight: 500;
  flex: 1; justify-content: center;
`;

const RADIO_LABEL_STYLE = `${RADIO_LABEL_BASE}
  border: 1px solid var(--border-default, rgba(255,255,255,0.1));
  background-color: transparent;
  color: var(--text-secondary, #a0a0b8);
`;

const RADIO_LABEL_SELECTED_STYLE = `${RADIO_LABEL_BASE}
  border: 1.5px solid var(--accent, #7c6fff);
  background-color: var(--accent-glow, rgba(124,111,255,0.12));
  color: var(--text-primary, #f0f0f5);
`;

// ── 格式选项 ──

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
    label.style.cssText =
      i === selectedIndex ? RADIO_LABEL_SELECTED_STYLE : RADIO_LABEL_STYLE;
  });
}

/**
 * 创建导出界面
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
  title.textContent = '导出设置';
  title.style.cssText = `
    color: var(--text-primary, #f0f0f5);
    font-size: 15px; margin: 0; font-weight: 600;
    text-align: center; letter-spacing: -0.01em;
  `;
  wrapper.appendChild(title);

  // 格式选择
  const formatGroup = document.createElement('div');
  formatGroup.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

  const formatLabel = document.createElement('span');
  formatLabel.textContent = '导出格式';
  formatLabel.style.cssText = `
    color: var(--text-secondary, #a0a0b8);
    font-size: 12px; font-weight: 500;
    user-select: none; letter-spacing: 0.02em;
  `;
  formatGroup.appendChild(formatLabel);

  const radioContainer = document.createElement('div');
  radioContainer.style.cssText = 'display: flex; gap: 8px;';

  const labels: HTMLLabelElement[] = [];

  FORMAT_OPTIONS.forEach((option, index) => {
    const label = document.createElement('label');
    label.style.cssText =
      index === 0 ? RADIO_LABEL_SELECTED_STYLE : RADIO_LABEL_STYLE;

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'export-format';
    radio.value = option.value;
    radio.checked = index === 0;
    radio.style.cssText = `
      accent-color: var(--accent, #7c6fff); cursor: pointer;
      width: 14px; height: 14px;
    `;

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
    padding: 11px 28px;
    border-radius: var(--radius-sm, 8px);
    border: none;
    background: linear-gradient(135deg, var(--accent, #7c6fff), var(--accent-hover, #6b5ce7));
    color: #fff;
    font-size: 14px; font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast, 150ms ease);
    align-self: center;
    display: flex; align-items: center; gap: 8px;
    box-shadow: 0 2px 10px rgba(124,111,255,0.3);
    font-family: inherit;
  `;

  exportBtn.addEventListener('mouseenter', () => {
    exportBtn.style.transform = 'translateY(-1px)';
    exportBtn.style.boxShadow = '0 4px 16px rgba(124,111,255,0.4)';
  });
  exportBtn.addEventListener('mouseleave', () => {
    exportBtn.style.transform = 'translateY(0)';
    exportBtn.style.boxShadow = '0 2px 10px rgba(124,111,255,0.3)';
  });
  exportBtn.addEventListener('mousedown', () => {
    exportBtn.style.transform = 'translateY(0) scale(0.98)';
  });
  exportBtn.addEventListener('mouseup', () => {
    exportBtn.style.transform = 'translateY(-1px)';
  });

  exportBtn.addEventListener('click', () => onExport(selectedFormat));

  wrapper.appendChild(exportBtn);
  container.appendChild(wrapper);
}
