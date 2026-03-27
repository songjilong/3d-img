// ============================================================
// 照片出框效果 - Live Photo 动画引擎
// 先播放"冲出"动画，再无缝衔接轻微抖动循环
// ============================================================

import type { CompositeParams } from '../types';
import { compose } from './compositor';

/** 动画配置 */
interface AnimationConfig {
  /** 冲出动画时长（毫秒） */
  burstDuration: number;
  /** 抖动周期（毫秒） */
  wobblePeriod: number;
  /** 抖动幅度（像素） */
  wobbleAmplitude: number;
  /** 抖动缩放幅度 */
  wobbleScaleAmplitude: number;
}

/** 默认动画配置 */
const DEFAULT_ANIM_CONFIG: AnimationConfig = {
  burstDuration: 0,
  wobblePeriod: 2500,
  wobbleAmplitude: 1.5,
  wobbleScaleAmplitude: 0.015,
};

/** 缓动函数：easeInOutSine，平滑呼吸感 */
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/** 动画控制器 */
export interface AnimationController {
  /** 停止动画 */
  stop: () => void;
  /** 动画是否正在运行 */
  isRunning: () => boolean;
}

/**
 * 启动 Live Photo 动画
 * 阶段 1：冲出动画 — 照片从 scale=1.0/offset=0 渐变到目标值（easeOutBack 缓动）
 * 阶段 2：抖动循环 — 在目标值基础上做正弦微扰
 *
 * @param canvas 用于渲染的 Canvas 元素
 * @param baseParams 基础合成参数（目标状态，即出框后的最终参数）
 * @param config 动画配置（可选）
 * @returns 动画控制器
 */
export function startLivePhotoAnimation(
  canvas: HTMLCanvasElement,
  baseParams: CompositeParams,
  config: Partial<AnimationConfig> = {},
): AnimationController {
  const cfg = { ...DEFAULT_ANIM_CONFIG, ...config };
  const ctx = canvas.getContext('2d')!;

  // 目标值（出框后的状态）
  const targetScale = baseParams.photoScale;
  const targetOffsetX = baseParams.photoOffset.x;
  const targetOffsetY = baseParams.photoOffset.y;

  // 起始值（未出框状态：scale=1.0，居中无偏移）
  const startScale = 1.0;
  // 起始偏移：让照片在 scale=1.0 时居中于 photoRect
  const photoW = baseParams.photo.width;
  const photoH = baseParams.photo.height;
  const photoRect = baseParams.frameLayout.photoRect;
  const startOffsetX = Math.round((photoRect.width - photoW) / 2);
  const startOffsetY = Math.round((photoRect.height - photoH) / 2);

  let running = true;
  let animFrameId = 0;
  const startTime = performance.now();

  /** 渲染一帧 */
  function renderFrame(now: number): void {
    if (!running) return;

    const elapsed = now - startTime;

    // 近景/远景呼吸效果：平滑正弦缩放
    const phase = (elapsed / cfg.wobblePeriod) * Math.PI * 2;
    const breathFactor = easeInOutSine((Math.sin(phase) + 1) / 2);

    // 缩放在目标值基础上做微小变化（近景放大、远景缩小）
    const currentScale = targetScale + (breathFactor * 2 - 1) * cfg.wobbleScaleAmplitude;
    // 轻微位移增加自然感
    const currentOffsetX = targetOffsetX + Math.sin(phase * 0.7) * cfg.wobbleAmplitude;
    const currentOffsetY = targetOffsetY + Math.cos(phase * 0.5) * cfg.wobbleAmplitude;

    // 用当前帧参数合成
    const frameParams: CompositeParams = {
      ...baseParams,
      photoScale: currentScale,
      photoOffset: { x: currentOffsetX, y: currentOffsetY },
    };

    const frameCanvas = compose(frameParams);

    // 将合成结果绘制到目标 Canvas
    canvas.width = frameCanvas.width;
    canvas.height = frameCanvas.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(frameCanvas, 0, 0);

    animFrameId = requestAnimationFrame(renderFrame);
  }

  // 启动动画循环
  animFrameId = requestAnimationFrame(renderFrame);

  return {
    stop: () => {
      running = false;
      cancelAnimationFrame(animFrameId);
    },
    isRunning: () => running,
  };
}
