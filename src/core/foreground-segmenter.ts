// ============================================================
// 前景分割器 - 双模型策略
// 同时使用 selfie_segmenter（擅长人形轮廓，含动漫）和 deeplab_v3（擅长真实物体）
// 取两者遮罩的最大值（并集），提升对各类图片的泛化能力
// ============================================================

import {
  ImageSegmenter,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import type { SegmentationResult, BoundingBox } from '../types';

// MediaPipe WASM 文件 CDN 基础路径
const WASM_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';

// 模型 1：Selfie Segmenter（人形轮廓分割，对动漫人物也有一定效果）
const SELFIE_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

// 模型 2：DeepLab V3（21 类物体分割：人、动物、植物、车辆等）
const DEEPLAB_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/latest/deeplab_v3.tflite';

// 前景像素占比最低阈值（低于此值认为无明确主体）
const MIN_FOREGROUND_RATIO = 0.01;

// DeepLab V3 背景类别 ID
const DEEPLAB_BG_CATEGORY = 0;

/** 双模型实例 */
let selfieSegmenter: ImageSegmenter | null = null;
let deeplabSegmenter: ImageSegmenter | null = null;
let visionInstance: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | null = null;

/**
 * 初始化双分割模型
 * 并行加载 selfie_segmenter 和 deeplab_v3
 */
export async function initialize(): Promise<void> {
  // 如果已初始化则跳过
  if (selfieSegmenter && deeplabSegmenter) return;

  // 加载 WASM 运行时（只需加载一次）
  if (!visionInstance) {
    visionInstance = await FilesetResolver.forVisionTasks(WASM_CDN_BASE);
  }

  // 并行创建两个分割器实例
  const [selfie, deeplab] = await Promise.all([
    // Selfie Segmenter：输出置信度遮罩
    ImageSegmenter.createFromOptions(visionInstance!, {
      baseOptions: {
        modelAssetPath: SELFIE_MODEL_PATH,
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    }),
    // DeepLab V3：输出类别遮罩 + 置信度遮罩
    ImageSegmenter.createFromOptions(visionInstance!, {
      baseOptions: {
        modelAssetPath: DEEPLAB_MODEL_PATH,
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      outputConfidenceMasks: true,
      outputCategoryMask: true,
    }),
  ]);

  selfieSegmenter = selfie;
  deeplabSegmenter = deeplab;
}

/**
 * 对图片执行前景分割（双模型融合）
 * 分别用两个模型分割，取置信度最大值作为最终遮罩
 * @param image 输入图片（HTMLImageElement 或 ImageBitmap）
 * @returns 分割结果
 */
export async function segment(
  image: HTMLImageElement | ImageBitmap,
): Promise<SegmentationResult> {
  if (!selfieSegmenter || !deeplabSegmenter) {
    throw new Error('分割模型尚未初始化，请先调用 initialize()');
  }

  const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height;

  // ── 模型 1：Selfie Segmenter ──
  const selfieConfidence = runSelfieSegmenter(image);

  // ── 模型 2：DeepLab V3 ──
  const deeplabConfidence = runDeeplabSegmenter(image);

  // 确定统一的遮罩尺寸（使用较大的那个）
  const maskW = Math.max(selfieConfidence.width, deeplabConfidence.width);
  const maskH = Math.max(selfieConfidence.height, deeplabConfidence.height);

  // ── 融合：取两个模型置信度的最大值 ──
  const merged = new Float32Array(maskW * maskH);
  for (let y = 0; y < maskH; y++) {
    for (let x = 0; x < maskW; x++) {
      const idx = y * maskW + x;

      // 从 selfie 遮罩采样
      const sx = Math.min(Math.floor((x / maskW) * selfieConfidence.width), selfieConfidence.width - 1);
      const sy = Math.min(Math.floor((y / maskH) * selfieConfidence.height), selfieConfidence.height - 1);
      const selfieVal = selfieConfidence.data[sy * selfieConfidence.width + sx];

      // 从 deeplab 遮罩采样
      const dx = Math.min(Math.floor((x / maskW) * deeplabConfidence.width), deeplabConfidence.width - 1);
      const dy = Math.min(Math.floor((y / maskH) * deeplabConfidence.height), deeplabConfidence.height - 1);
      const deeplabVal = deeplabConfidence.data[dy * deeplabConfidence.width + dx];

      // 取最大值（并集策略）
      merged[idx] = Math.max(selfieVal, deeplabVal);
    }
  }

  // 转换为 ImageData
  const foregroundMask = confidenceToImageData(merged, maskW, maskH, width, height);

  // 分析前景
  const { hasSubject, subjectBounds } = analyzeForeground(merged, maskW, maskH, width, height);

  return { mask: foregroundMask, hasSubject, subjectBounds };
}

/** Selfie Segmenter 的置信度结果 */
interface ConfidenceMap {
  data: Float32Array;
  width: number;
  height: number;
}

/**
 * 运行 Selfie Segmenter，返回前景置信度
 */
function runSelfieSegmenter(image: HTMLImageElement | ImageBitmap): ConfidenceMap {
  const result = selfieSegmenter!.segment(image);
  const masks = result.confidenceMasks;

  if (!masks || masks.length === 0) {
    result.close();
    return { data: new Float32Array(0), width: 0, height: 0 };
  }

  // Selfie 模型第一个置信度遮罩即为前景
  const data = masks[0].getAsFloat32Array().slice(); // 复制数据
  const w = masks[0].width;
  const h = masks[0].height;
  result.close();

  return { data, width: w, height: h };
}

/**
 * 运行 DeepLab V3，合并所有非背景类别的置信度
 */
function runDeeplabSegmenter(image: HTMLImageElement | ImageBitmap): ConfidenceMap {
  const result = deeplabSegmenter!.segment(image);
  const categoryMask = result.categoryMask;
  const confidenceMasks = result.confidenceMasks;

  if (!categoryMask) {
    result.close();
    return { data: new Float32Array(0), width: 0, height: 0 };
  }

  const catData = categoryMask.getAsUint8Array();
  const w = categoryMask.width;
  const h = categoryMask.height;

  // 找出所有前景类别
  const fgCategories = new Set<number>();
  for (let i = 0; i < catData.length; i++) {
    if (catData[i] !== DEEPLAB_BG_CATEGORY) {
      fgCategories.add(catData[i]);
    }
  }

  // 合并前景类别的置信度
  const merged = new Float32Array(w * h);
  if (confidenceMasks && confidenceMasks.length > 0) {
    for (const cat of fgCategories) {
      if (cat < confidenceMasks.length) {
        const catConf = confidenceMasks[cat].getAsFloat32Array();
        for (let i = 0; i < merged.length; i++) {
          merged[i] = Math.min(1.0, merged[i] + catConf[i]);
        }
      }
    }
  } else {
    // 无置信度遮罩时退化为二值
    for (let i = 0; i < catData.length; i++) {
      merged[i] = catData[i] !== DEEPLAB_BG_CATEGORY ? 1.0 : 0.0;
    }
  }

  result.close();
  return { data: merged, width: w, height: h };
}

/**
 * 释放所有模型资源
 */
export function dispose(): void {
  if (selfieSegmenter) {
    selfieSegmenter.close();
    selfieSegmenter = null;
  }
  if (deeplabSegmenter) {
    deeplabSegmenter.close();
    deeplabSegmenter = null;
  }
}

/**
 * 将置信度浮点数组转换为 RGBA ImageData
 * 保留 alpha 通道渐变以实现边缘抗锯齿
 */
function confidenceToImageData(
  maskData: Float32Array,
  maskW: number,
  maskH: number,
  targetW: number,
  targetH: number,
): ImageData {
  const imageData = new ImageData(targetW, targetH);
  const pixels = imageData.data;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.min(Math.floor((x / targetW) * maskW), maskW - 1);
      const srcY = Math.min(Math.floor((y / targetH) * maskH), maskH - 1);
      const confidence = maskData[srcY * maskW + srcX];

      const idx = (y * targetW + x) * 4;
      pixels[idx] = 255;     // R
      pixels[idx + 1] = 255; // G
      pixels[idx + 2] = 255; // B
      pixels[idx + 3] = Math.round(confidence * 255); // A
    }
  }

  return imageData;
}

/**
 * 分析前景遮罩，判断是否存在主体并计算边界框
 */
function analyzeForeground(
  maskData: Float32Array,
  maskW: number,
  maskH: number,
  targetW: number,
  targetH: number,
): { hasSubject: boolean; subjectBounds: BoundingBox } {
  const threshold = 0.3;
  let minX = maskW, minY = maskH, maxX = 0, maxY = 0;
  let foregroundCount = 0;
  const totalPixels = maskW * maskH;

  for (let y = 0; y < maskH; y++) {
    for (let x = 0; x < maskW; x++) {
      if (maskData[y * maskW + x] > threshold) {
        foregroundCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (foregroundCount / totalPixels < MIN_FOREGROUND_RATIO) {
    return { hasSubject: false, subjectBounds: { x: 0, y: 0, width: 0, height: 0 } };
  }

  const scaleX = targetW / maskW;
  const scaleY = targetH / maskH;

  return {
    hasSubject: true,
    subjectBounds: {
      x: Math.floor(minX * scaleX),
      y: Math.floor(minY * scaleY),
      width: Math.ceil((maxX - minX + 1) * scaleX),
      height: Math.ceil((maxY - minY + 1) * scaleY),
    },
  };
}


