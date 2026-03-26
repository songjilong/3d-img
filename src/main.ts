// ============================================================
// 照片出框效果应用 - 主入口
// 串联完整流程：上传 → 验证 → 分割 → 预览 → 调整 → 合成 → 导出
// ============================================================

import { createUploadUI } from './ui/upload';
import { createSegmentationPreview } from './ui/segmentation-preview';
import { createControlsPanel, type ControlUpdates } from './ui/controls';
import { createExportUI } from './ui/export';
import { parse as parseExif, formatForDisplay } from './core/exif-parser';
import { initialize as initSegmenter, segment } from './core/foreground-segmenter';
import { generateFrame } from './core/frame-generator';
import { compose, exportImage } from './core/compositor';
import { getState, updateStage, updatePhotoOffset, updatePhotoScale, resetAdjustments } from './state';
import type { ProcessStage, ExportFormat } from './types';

// ------------------------------------------------------------
// DOM 元素引用
// ------------------------------------------------------------

const stageUpload = document.getElementById('stage-upload')!;
const stagePreview = document.getElementById('stage-segmentation-preview')!;
const stageAdjusting = document.getElementById('stage-adjusting')!;
const loadingIndicator = document.getElementById('loading-indicator')!;
const loadingText = document.getElementById('loading-text')!;
const errorBanner = document.getElementById('error-banner')!;
const canvasPreview = document.getElementById('canvas-preview')!;
const controlsContainer = document.getElementById('controls-container')!;
const exportContainer = document.getElementById('export-container')!;

/** 所有阶段对应的 DOM 区域映射 */
const stageSections: Record<string, HTMLElement> = {
  upload: stageUpload,
  preview: stagePreview,
  adjusting: stageAdjusting,
};

// ------------------------------------------------------------
// 辅助函数
// ------------------------------------------------------------

/**
 * 切换阶段显示：隐藏所有区域，仅显示目标阶段
 * @param stage 目标处理阶段
 */
function showStage(stage: ProcessStage): void {
  updateStage(stage);

  // 隐藏所有阶段区域
  Object.values(stageSections).forEach((el) => {
    el.classList.remove('active');
  });

  // 隐藏加载指示器
  loadingIndicator.classList.remove('active');

  // 隐藏错误提示
  errorBanner.classList.remove('active');

  // 显示目标阶段
  const target = stageSections[stage];
  if (target) {
    target.classList.add('active');
  }
}

/**
 * 显示加载指示器
 * @param text 加载提示文字
 */
function showLoading(text: string): void {
  // 隐藏所有阶段区域
  Object.values(stageSections).forEach((el) => {
    el.classList.remove('active');
  });
  errorBanner.classList.remove('active');
  loadingText.textContent = text;
  loadingIndicator.classList.add('active');
}

/**
 * 显示全局错误提示
 * @param message 中文错误信息
 */
function showError(message: string): void {
  loadingIndicator.classList.remove('active');
  errorBanner.textContent = message;
  errorBanner.classList.add('active');
}

/**
 * 获取当前合成所需的元数据文字
 * 优先使用用户自定义文字，否则使用 EXIF 格式化文字
 */
function getMetadataText(): string {
  const state = getState();
  if (state.customMetadataText != null && state.customMetadataText !== '') {
    return state.customMetadataText;
  }
  if (state.exifData) {
    return formatForDisplay(state.exifData);
  }
  return '';
}

/**
 * 执行合成并更新预览画布
 */
function recompose(): void {
  const state = getState();
  if (!state.originalImage || !state.segmentation || !state.frameLayout) {
    return;
  }

  const canvas = compose({
    photo: state.originalImage,
    mask: state.segmentation.mask,
    frameLayout: state.frameLayout,
    backgroundColor: state.backgroundColor,
    frameColor: state.frameConfig.frameColor,
    photoOffset: state.photoOffset,
    photoScale: state.photoScale,
    metadataText: getMetadataText(),
  });

  // 更新预览区域
  canvasPreview.innerHTML = '';
  canvasPreview.appendChild(canvas);
}

/**
 * 处理控制面板参数变化
 * 更新状态并重新合成预览
 */
function handleControlChange(updates: Partial<ControlUpdates>): void {
  const state = getState();

  // 重置操作
  if (updates.reset) {
    resetAdjustments();
    // 重置边框宽度时需要重新生成相框布局
    if (state.originalImage) {
      state.frameConfig.borderWidth = 40; // 恢复默认边框宽度
      state.frameLayout = generateFrame(
        { width: state.originalImage.naturalWidth, height: state.originalImage.naturalHeight },
        state.frameConfig,
      );
    }
    state.customMetadataText = null;
    state.backgroundColor = '#1a1a2e';
    state.frameConfig.frameColor = '#FFFFFF';
    // 重新计算默认出框参数
    const defaults = computeDefaultParams();
    updatePhotoOffset(defaults.offset);
    updatePhotoScale(defaults.scale);
    // 重新渲染控制面板以更新滑块位置
    createControlsPanel(controlsContainer, getState(), handleControlChange);
    recompose();
    return;
  }

  // 更新照片偏移
  if (updates.photoOffset) {
    updatePhotoOffset(updates.photoOffset);
  }

  // 更新照片缩放
  if (updates.photoScale != null) {
    updatePhotoScale(updates.photoScale);
  }

  // 更新边框宽度（需要重新生成相框布局）
  if (updates.borderWidth != null && state.originalImage) {
    state.frameConfig.borderWidth = updates.borderWidth;
    state.frameLayout = generateFrame(
      { width: state.originalImage.naturalWidth, height: state.originalImage.naturalHeight },
      state.frameConfig,
    );
  }

  // 更新背景颜色
  if (updates.backgroundColor != null) {
    state.backgroundColor = updates.backgroundColor;
  }

  // 更新相框颜色
  if (updates.frameColor != null) {
    state.frameConfig.frameColor = updates.frameColor;
  }

  // 更新拍摄参数文字
  if (updates.metadataText != null) {
    state.customMetadataText = updates.metadataText;
  }

  recompose();
}

/**
 * 触发浏览器下载
 * @param blob 图片数据
 * @param format 导出格式
 */
function triggerDownload(blob: Blob, format: ExportFormat): void {
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const filename = `出框效果_${Date.now()}.${ext}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // 清理临时 URL
  URL.revokeObjectURL(url);
}

/**
 * 处理导出操作
 * @param format 用户选择的导出格式
 */
async function handleExport(format: ExportFormat): Promise<void> {
  const state = getState();
  if (!state.originalImage || !state.segmentation || !state.frameLayout) {
    return;
  }

  try {
    showLoading('正在导出效果图...');
    updateStage('exporting');

    // 合成最终效果图
    const canvas = compose({
      photo: state.originalImage,
      mask: state.segmentation.mask,
      frameLayout: state.frameLayout,
      backgroundColor: state.backgroundColor,
      frameColor: state.frameConfig.frameColor,
      photoOffset: state.photoOffset,
      photoScale: state.photoScale,
      metadataText: getMetadataText(),
    });

    // 导出为 Blob
    const blob = await exportImage(canvas, format);

    // 触发下载
    triggerDownload(blob, format);

    // 返回调整阶段
    showStage('adjusting');
  } catch (err) {
    console.error('导出失败：', err);
    showError('导出失败，请重试');
    // 显示调整阶段以便用户重试
    stageAdjusting.classList.add('active');
  }
}

// ------------------------------------------------------------
// 阶段处理函数
// ------------------------------------------------------------

/**
 * 处理文件上传成功：解析 EXIF → 初始化分割模型 → 执行分割 → 显示预览
 * @param file 用户上传的文件
 * @param image 加载后的图片元素
 */
async function handleFileAccepted(file: File, image: HTMLImageElement): Promise<void> {
  const state = getState();

  // 保存原始文件和图片到状态
  state.originalFile = file;
  state.originalImage = image;

  // 解析 EXIF 数据（非关键步骤，失败不阻塞）
  try {
    state.exifData = await parseExif(file);
  } catch {
    state.exifData = null;
  }

  // 开始分割流程
  try {
    showLoading('正在分析照片...');
    updateStage('segmenting');

    // 初始化分割模型
    await initSegmenter();

    // 执行前景分割
    const segResult = await segment(image);
    state.segmentation = segResult;

    // 显示分割预览
    showStage('preview');
    createSegmentationPreview(
      stagePreview,
      image,
      segResult,
      () => handleSegmentationConfirm(),
      () => handleRetry(),
    );
  } catch (err) {
    console.error('分割失败：', err);
    showError('照片分析失败，请检查网络连接后重试');
    // 显示上传区域以便用户重试
    stageUpload.classList.add('active');
  }
}

/**
 * 根据分割结果自动计算默认缩放和偏移
 * 放大照片使主体超出相框上边界，产生出框 3D 效果
 * 照片居中于相框
 */
function computeDefaultParams(): { offset: { x: number; y: number }; scale: number } {
  const state = getState();
  if (!state.segmentation || !state.segmentation.hasSubject || !state.frameLayout || !state.originalImage) {
    return { offset: { x: 0, y: 0 }, scale: 1.0 };
  }

  const { subjectBounds } = state.segmentation;
  const { photoRect } = state.frameLayout;
  const imgW = state.originalImage.naturalWidth;
  const imgH = state.originalImage.naturalHeight;
  const borderWidth = state.frameConfig.borderWidth;

  // 目标：放大照片使主体顶部超出相框外边框（y=0）约 20% 的主体高度
  // 照片居中时，照片顶部 y = photoRect.y + (photoRect.height - imgH * scale) / 2
  // 主体顶部 y = 照片顶部 y + subjectBounds.y * scale
  // 要让主体顶部 y < -popOutTarget（超出相框外边框）
  //
  // borderWidth + (imgH - imgH * S) / 2 + subjectBounds.y * S = -popOutTarget
  // borderWidth + imgH/2 - imgH*S/2 + subjectBounds.y * S = -popOutTarget
  // S * (subjectBounds.y - imgH/2) = -popOutTarget - borderWidth - imgH/2
  // S = (popOutTarget + borderWidth + imgH/2) / (imgH/2 - subjectBounds.y)

  const popOutTarget = subjectBounds.height * 0.15;
  const denominator = imgH / 2 - subjectBounds.y;

  // 如果主体在照片中间偏下，分母可能很小或为负，此时不适合出框
  if (denominator <= 10) {
    return { offset: { x: 0, y: 0 }, scale: 1.0 };
  }

  const targetScale = (popOutTarget + borderWidth + imgH / 2) / denominator;
  const scale = Math.max(1.05, Math.min(1.8, targetScale));

  // 居中偏移：让放大后的照片中心对齐相框内部中心
  const scaledW = imgW * scale;
  const scaledH = imgH * scale;
  const offsetX = Math.round((photoRect.width - scaledW) / 2);
  const offsetY = Math.round((photoRect.height - scaledH) / 2);

  return { offset: { x: offsetX, y: offsetY }, scale };
}

/**
 * 用户确认分割结果：生成相框 → 合成初始效果 → 进入调整阶段
 */
function handleSegmentationConfirm(): void {
  const state = getState();
  if (!state.originalImage || !state.segmentation) {
    return;
  }

  // 生成相框布局
  const photoSize = {
    width: state.originalImage.naturalWidth,
    height: state.originalImage.naturalHeight,
  };
  state.frameLayout = generateFrame(photoSize, state.frameConfig);

  // 自动计算默认缩放和偏移，让照片居中且主体出框
  const defaults = computeDefaultParams();
  updatePhotoOffset(defaults.offset);
  updatePhotoScale(defaults.scale);

  // 进入调整阶段
  showStage('adjusting');

  // 合成初始效果预览
  recompose();

  // 创建控制面板
  createControlsPanel(controlsContainer, getState(), handleControlChange);

  // 创建导出面板
  exportContainer.innerHTML = '';
  createExportUI(exportContainer, handleExport);
}

/**
 * 用户选择重新上传：重置状态，回到上传阶段
 */
function handleRetry(): void {
  const state = getState();

  // 清除已有数据
  state.originalFile = null;
  state.originalImage = null;
  state.segmentation = null;
  state.frameLayout = null;
  state.exifData = null;
  state.customMetadataText = null;
  resetAdjustments();

  // 回到上传阶段，重新创建上传 UI
  showStage('upload');
  stageUpload.innerHTML = '';
  createUploadUI(stageUpload, handleFileAccepted);
}

// ------------------------------------------------------------
// 应用初始化
// ------------------------------------------------------------

/** 初始化应用 */
function init(): void {
  // 创建上传界面
  createUploadUI(stageUpload, handleFileAccepted);
}

// 启动应用
init();
