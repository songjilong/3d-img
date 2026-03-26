import type { CompositeParams, ExportFormat } from '../types';

// 元数据文字颜色
const METADATA_TEXT_COLOR = '#666666';
// 元数据文字字体
const METADATA_FONT = '14px sans-serif';
// 相框在背景中的占比（相框宽度占背景宽度的比例）
const FRAME_RATIO = 0.75;

/**
 * 合成所有图层，生成最终出框效果图
 *
 * 三个独立图层（从底到顶）：
 *   1. 背景层 — 固定比例画布，纯色填充
 *   2. 相框层 — 宝丽来边框，居中于背景
 *   3. 照片层 — 照片 clip 到相框内 + 出框主体绘制在相框之上
 *
 * @param params 合成参数
 * @returns 合成后的 HTMLCanvasElement
 */
export function compose(params: CompositeParams): HTMLCanvasElement {
  const {
    photo,
    mask,
    frameLayout,
    backgroundColor,
    frameColor,
    photoOffset,
    photoScale,
    metadataText,
  } = params;

  const { outerSize, photoRect, metadataRect } = frameLayout;

  // 照片实际绘制尺寸（应用缩放）
  const drawWidth = photo.width * photoScale;
  const drawHeight = photo.height * photoScale;

  // 照片在相框坐标系中的绘制起点
  const photoDrawX = photoRect.x + photoOffset.x;
  const photoDrawY = photoRect.y + photoOffset.y;

  // 计算出框主体超出相框顶部的高度
  const popOutAboveFrame = Math.max(0, -photoDrawY);
  const topPadding = popOutAboveFrame > 0 ? 10 : 0;
  const extraTopForPopOut = Math.ceil(popOutAboveFrame) + topPadding;

  // 相框总高度（含出框区域）
  const frameTotalHeight = outerSize.height + extraTopForPopOut;

  // 背景画布尺寸：让相框占背景宽度的 FRAME_RATIO
  const canvasWidth = Math.ceil(outerSize.width / FRAME_RATIO);
  // 背景高度：保持相框上下有对称边距，同时容纳出框区域
  const verticalMargin = (canvasWidth - outerSize.width) / 2; // 与水平边距相同，保持对称
  const canvasHeight = Math.ceil(frameTotalHeight + verticalMargin * 2);

  // 相框在画布中的位置（水平居中，垂直居中但考虑出框区域）
  const frameOffsetX = Math.round((canvasWidth - outerSize.width) / 2);
  const frameOffsetY = Math.round((canvasHeight - frameTotalHeight) / 2) + extraTopForPopOut;

  // 创建主画布
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // ── 第 1 层：背景层 ──
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 将坐标系平移到相框位置
  ctx.save();
  ctx.translate(frameOffsetX, frameOffsetY);

  // ── 第 2 层：相框层 ──
  // 先用相框颜色填满整个相框区域（包括内部），避免镂空露出背景色
  ctx.fillStyle = frameColor;
  ctx.fillRect(0, 0, outerSize.width, outerSize.height);

  // ── 第 3 层：照片层（裁剪到相框内部 photoRect）──
  drawPhotoLayer(ctx, photo, photoRect, photoDrawX, photoDrawY, drawWidth, drawHeight);

  // ── 第 4 层：出框主体层（遮罩裁剪，不设 clip）──
  drawPopOutLayer(ctx, photo, mask, photoRect, photoDrawX, photoDrawY, drawWidth, drawHeight, photoScale);

  // ── 绘制元数据文字 ──
  drawMetadata(ctx, metadataText, metadataRect);

  // 恢复坐标系
  ctx.restore();

  return canvas;
}


/**
 * 第 3 层：绘制照片层
 * 使用 clip() 将照片裁剪到 photoRect 区域内，支持偏移和缩放
 */
function drawPhotoLayer(
  ctx: CanvasRenderingContext2D,
  photo: HTMLImageElement,
  photoRect: { x: number; y: number; width: number; height: number },
  drawX: number,
  drawY: number,
  drawWidth: number,
  drawHeight: number,
): void {
  ctx.save();

  // 创建裁剪区域，限制绘制范围为照片区域
  ctx.beginPath();
  ctx.rect(photoRect.x, photoRect.y, photoRect.width, photoRect.height);
  ctx.clip();

  // 绘制照片（应用偏移和缩放）
  ctx.drawImage(photo, drawX, drawY, drawWidth, drawHeight);

  ctx.restore();
}

/**
 * 第 4 层：绘制出框主体层
 * 使用遮罩提取主体，完整绘制在相框之上（不设 clip）
 * 这样主体会覆盖相框边框，产生"跃出"的 3D 效果
 */
function drawPopOutLayer(
  ctx: CanvasRenderingContext2D,
  photo: HTMLImageElement,
  mask: ImageData,
  _photoRect: { x: number; y: number; width: number; height: number },
  drawX: number,
  drawY: number,
  drawWidth: number,
  drawHeight: number,
  _photoScale: number,
): void {
  // ── 步骤 1：创建遮罩源画布（将 ImageData 放到画布上）──
  const maskSourceCanvas = document.createElement('canvas');
  maskSourceCanvas.width = mask.width;
  maskSourceCanvas.height = mask.height;
  const maskSourceCtx = maskSourceCanvas.getContext('2d')!;
  maskSourceCtx.putImageData(mask, 0, 0);

  // ── 步骤 2：创建缩放后的遮罩画布 ──
  const scaledMaskCanvas = document.createElement('canvas');
  scaledMaskCanvas.width = drawWidth;
  scaledMaskCanvas.height = drawHeight;
  const scaledMaskCtx = scaledMaskCanvas.getContext('2d')!;
  scaledMaskCtx.drawImage(maskSourceCanvas, 0, 0, drawWidth, drawHeight);

  // ── 步骤 3：创建临时画布，绘制照片并应用遮罩 ──
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = drawWidth;
  tempCanvas.height = drawHeight;
  const tempCtx = tempCanvas.getContext('2d')!;

  // 先绘制照片
  tempCtx.drawImage(photo, 0, 0, drawWidth, drawHeight);

  // 使用 destination-in 混合模式应用遮罩
  // 保留遮罩 alpha 通道，实现边缘抗锯齿和自然过渡
  tempCtx.globalCompositeOperation = 'destination-in';
  tempCtx.drawImage(scaledMaskCanvas, 0, 0);
  tempCtx.globalCompositeOperation = 'source-over';

  // ── 步骤 4：将完整的遮罩主体绘制到主画布 ──
  // 不设 clip，主体会覆盖相框边框，产生出框效果
  ctx.drawImage(tempCanvas, drawX, drawY, drawWidth, drawHeight);
}

/**
 * 绘制元数据文字（拍摄参数信息）
 * 在相框底部的 metadataRect 区域居中显示
 */
function drawMetadata(
  ctx: CanvasRenderingContext2D,
  text: string,
  metadataRect: { x: number; y: number; width: number; height: number },
): void {
  if (!text) {
    return;
  }

  ctx.fillStyle = METADATA_TEXT_COLOR;
  ctx.font = METADATA_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    text,
    metadataRect.x + metadataRect.width / 2,
    metadataRect.y + metadataRect.height / 2,
  );
}

// 默认 JPEG 导出质量
const DEFAULT_JPEG_QUALITY = 0.92;

/**
 * 导出合成结果为图片 Blob
 *
 * 将 Canvas 内容转换为指定格式的 Blob 对象，
 * 支持 PNG（保留透明度）和 JPEG 格式。
 *
 * @param canvas 合成后的 Canvas 元素
 * @param format 导出格式：'png' 或 'jpeg'
 * @param quality JPEG 质量参数（0-1），仅在 JPEG 格式下生效，默认 0.92
 * @returns 包含图片数据的 Blob
 */
export function exportImage(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  quality: number = DEFAULT_JPEG_QUALITY,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // 根据格式确定 MIME 类型
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

    // 使用 canvas.toBlob 异步生成图片数据
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('导出失败：无法生成图片 Blob'));
        }
      },
      mimeType,
      // quality 参数仅对 JPEG 格式生效，PNG 会忽略此参数
      format === 'jpeg' ? quality : undefined,
    );
  });
}
