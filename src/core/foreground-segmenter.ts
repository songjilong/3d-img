// ============================================================
// 前景分割器 - 基于 U²-Net (u2netp) 显著性目标检测
// 使用 onnxruntime-web 在浏览器中运行 U²-Net 轻量版模型
// 相比 MediaPipe 双模型方案，U²-Net 边缘质量更高、泛化能力更强
// ============================================================

import * as ort from 'onnxruntime-web';
import type { SegmentationResult, BoundingBox } from '../types';

// U²-Net 模型输入尺寸
const MODEL_WIDTH = 320;
const MODEL_HEIGHT = 320;

// ImageNet 标准化参数
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

// u2netp 轻量版 ONNX 模型路径（来自 rembg 项目，约 4.7MB，放在 public 目录下由 Vite 提供）
const MODEL_URL = '/u2netp.onnx';

// 前景像素占比最低阈值
const MIN_FOREGROUND_RATIO = 0.01;

/** ONNX 推理会话 */
let session: ort.InferenceSession | null = null;

/**
 * 初始化 U²-Net 模型
 * 先下载模型为 ArrayBuffer，再用 WASM 后端创建推理会话
 */
export async function initialize(): Promise<void> {
  if (session) return;

  console.log('[U2Net] 开始下载模型...');
  const response = await fetch(MODEL_URL);
  if (!response.ok) {
    throw new Error(`模型下载失败: ${response.status} ${response.statusText}`);
  }
  const modelBuffer = await response.arrayBuffer();
  console.log(`[U2Net] 模型下载完成, 大小: ${modelBuffer.byteLength} bytes`);

  console.log('[U2Net] 创建推理会话...');
  session = await ort.InferenceSession.create(modelBuffer, {
    executionProviders: ['wasm'],
  });
  console.log('[U2Net] 推理会话创建成功');
  console.log('[U2Net] 输入:', session.inputNames, '输出:', session.outputNames);
}

/**
 * 对图片执行前景分割
 * @param image 输入图片
 * @returns 分割结果（遮罩、是否有主体、主体边界框）
 */
export async function segment(
  image: HTMLImageElement | ImageBitmap,
): Promise<SegmentationResult> {
  if (!session) {
    throw new Error('分割模型尚未初始化，请先调用 initialize()');
  }

  const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height;

  // 预处理：缩放到 320×320 并做 ImageNet 标准化
  const inputTensor = preprocessImage(image, MODEL_WIDTH, MODEL_HEIGHT);

  // 推理（动态获取输入名称）
  const inputName = session.inputNames[0];
  const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor };
  const results = await session.run(feeds);

  // 取第一个输出（U²-Net 有多个输出头，第一个是最终融合结果）
  const outputNames = Object.keys(results);
  console.log('[U2Net] 输出张量:', outputNames);
  const outputTensor = results[outputNames[0]];
  console.log('[U2Net] 输出形状:', outputTensor.dims);
  const outputData = outputTensor.data as Float32Array;

  // 归一化输出到 [0, 1]
  const normalized = normalizeOutput(outputData);

  // 将 320×320 遮罩上采样到原图尺寸并转为 ImageData
  const foregroundMask = maskToImageData(normalized, MODEL_WIDTH, MODEL_HEIGHT, width, height);

  // 分析前景区域
  const { hasSubject, subjectBounds } = analyzeForeground(
    normalized, MODEL_WIDTH, MODEL_HEIGHT, width, height,
  );

  return { mask: foregroundMask, hasSubject, subjectBounds };
}

/**
 * 释放模型资源
 */
export function dispose(): void {
  if (session) {
    session.release();
    session = null;
  }
}

/**
 * 预处理图片：缩放到目标尺寸，提取 RGB 通道并做 ImageNet 标准化
 * 输出格式：NCHW [1, 3, H, W]
 */
function preprocessImage(
  image: HTMLImageElement | ImageBitmap,
  targetW: number,
  targetH: number,
): ort.Tensor {
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, targetW, targetH);

  const imageData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imageData.data;
  const pixels = new Float32Array(1 * 3 * targetW * targetH);

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcIdx = (y * targetW + x) * 4;
      const dstIdx = y * targetW + x;

      pixels[dstIdx] = (data[srcIdx] / 255 - MEAN[0]) / STD[0];                     // R
      pixels[dstIdx + targetW * targetH] = (data[srcIdx + 1] / 255 - MEAN[1]) / STD[1]; // G
      pixels[dstIdx + 2 * targetW * targetH] = (data[srcIdx + 2] / 255 - MEAN[2]) / STD[2]; // B
    }
  }

  return new ort.Tensor('float32', pixels, [1, 3, targetH, targetW]);
}

/**
 * 将模型输出归一化到 [0, 1] 范围
 * U²-Net 输出的是 sigmoid 后的显著性图，但数值范围可能不完全在 [0,1]
 */
function normalizeOutput(data: Float32Array): Float32Array {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }

  const range = max - min || 1;
  const result = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = (data[i] - min) / range;
  }
  return result;
}

/**
 * 将置信度遮罩转换为 RGBA ImageData（上采样到原图尺寸）
 */
function maskToImageData(
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
