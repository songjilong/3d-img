// ============================================================
// 照片出框效果 - 导出组件
// 提供格式选择（PNG/JPEG）和导出按钮，触发浏览器下载
// ============================================================

import type { ExportFormat } from '../types';

// ------------------------------------------------------------
// 样式常量
// ------------------------------------------------------------

/** 单选按钮标签样式 */
const RADIO_LABEL_STYLE = `
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ccc;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #555;
  background-color: rgba(255, 255, 255, 0.04);
  transition: border-color 0.2s, background-color 0.2s;
  user-select: none;
`;

/** 选中状态的单选按钮标签样式 */
const RADIO_LABEL_SELECTED_STYLE = `
  display: flex;
  align-items: center;
  gap: 8px;
  color: #eee;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #7c6fff;
  background-color: rgba(124, 111, 255, 0.1);
  transition: border-color 0.2s, background-color 0.2s;
  user-select: none;
`;

/** 导出按钮样式 */
const EXPORT_BTN_STYLE = `
  padding: 12px 32px;
  border-radius: 8px;
  border: none;
  background-color: #7c6fff;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  align-self: center;
`;

// ------------------------------------------------------------
// 格式选项配置
// ------------------------------------------------------------

/** 格式选项定义 */
interface FormatOption {
  value: ExportFormat;
  label: string;
  description: string;
}

/** 可选的导出格式列表 */
const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'png', label: 'PNG', description: 'PNG（保留透明度）' },
  { value: 'jpeg', label: 'JPEG', description: 'JPEG（文件更小）' },
];

// ------------------------------------------------------------
// 辅助函数
// ------------------------------------------------------------

/**
 * 更新单选按钮组的选中样式
 * @param labels 所有单选按钮标签元素
 * @param selectedIndex 当前选中的索引
 */
function updateRadioStyles(labels: HTMLLabelElement[], selectedIndex: number): void {
  labels.forEach((label, i) => {
    label.style.cssText =
      i === selectedIndex ? RADIO_LABEL_SELECTED_STYLE : RADIO_LABEL_STYLE;
  });
}

// ------------------------------------------------------------
// 主函数
// ------------------------------------------------------------

/**
 * 创建导出界面，提供格式选择和导出按钮
 * @param container 挂载容器元素
 * @param onExport 导出回调，接收用户选择的导出格式
 */
export function createExportUI(
  container: HTMLElement,
  onExport: (format: ExportFormat) => void,
): void {
  // 当前选中的格式，默认 PNG
  let selectedFormat: ExportFormat = 'png';

  // 外层包裹容器
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    width: 100%;
    max-width: 320px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    background-color: rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-sizing: border-box;
  `;

  // 标题
  const title = document.createElement('h3');
  title.textContent = '导出设置';
  title.style.cssText =
    'color: #eee; font-size: 16px; margin: 0; font-weight: 600; text-align: center;';
  wrapper.appendChild(title);

  // 格式选择区域
  const formatGroup = document.createElement('div');
  formatGroup.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

  const formatLabel = document.createElement('span');
  formatLabel.textContent = '导出格式';
  formatLabel.style.cssText =
    'color: #ccc; font-size: 13px; margin-bottom: 4px; user-select: none;';
  formatGroup.appendChild(formatLabel);

  // 单选按钮容器
  const radioContainer = document.createElement('div');
  radioContainer.style.cssText = 'display: flex; gap: 10px;';

  const labels: HTMLLabelElement[] = [];

  FORMAT_OPTIONS.forEach((option, index) => {
    const label = document.createElement('label');
    label.style.cssText =
      index === 0 ? RADIO_LABEL_SELECTED_STYLE : RADIO_LABEL_STYLE;

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'export-format';
    radio.value = option.value;
    radio.checked = index === 0; // 默认选中 PNG
    radio.style.cssText = 'accent-color: #7c6fff; cursor: pointer;';

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
  exportBtn.textContent = '导出效果图';
  exportBtn.style.cssText = EXPORT_BTN_STYLE;

  // 悬停效果
  exportBtn.addEventListener('mouseenter', () => {
    exportBtn.style.backgroundColor = '#6b5ce7';
    exportBtn.style.transform = 'translateY(-1px)';
  });
  exportBtn.addEventListener('mouseleave', () => {
    exportBtn.style.backgroundColor = '#7c6fff';
    exportBtn.style.transform = 'translateY(0)';
  });
  // 按下效果
  exportBtn.addEventListener('mousedown', () => {
    exportBtn.style.transform = 'translateY(0)';
  });

  // 点击导出
  exportBtn.addEventListener('click', () => {
    onExport(selectedFormat);
  });

  wrapper.appendChild(exportBtn);
  container.appendChild(wrapper);
}
