// ============================================================
// 照片出框效果 - 视频录制器
// 使用 Canvas + MediaRecorder 录制 Live Photo 动画为 WebM 视频
// ============================================================

import type { CompositeParams } from '../types';
import { compose } from './compositor';

/** 缓动函数：easeOutBack */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** 录制配置 */
interface RecordConfig {
  /** 冲出动画时长（毫秒） */
  burstDuration: number;
  /** 抖动循环时长（毫秒） */
  wobbleDuration: number;
  /** 抖动周期（毫秒） */
  wobblePeriod: number;
  /** 抖动幅度（像素） */
  wobbleAmplitude: number;
  /** 抖动缩放幅度 */
  wobbleScaleAmplitude: number;
  /** 帧率 */
  fps: number;
}

const DEFAULT_RECORD_CONFIG: RecordConfig = {
  burstDuration: 600,
  wobbleDuration: 2000,
  wobblePeriod: 2000,
  wobbleAmplitude: 3,
  wobbleScaleAmplitude: 0.008,
  fps: 30,
};

/**
 * 录制 Live Photo 动画为 WebM 视频 Blob
 * 逐帧合成并录制：冲出动画 + 抖动循环
 *
 * @param baseParams 基础合成参数（出框后的目标状态）
 * @param onProgress 进度回调（0~1）
 * @param config 录制配置
 * @returns WebM 视频 Blob
 */
export async function recordLivePhotoVideo(
  baseParams: CompositeParams,
  onProgress?: (progress: number) => void,
  config: Partial<RecordConfig> = {},
): Promise<Blob> {
  const cfg = { ...DEFAULT_RECORD_CONFIG, ...config };
  const totalDuration = cfg.burstDuration + cfg.wobbleDuration;
  const totalFrames = Math.ceil((totalDuration / 1000) * cfg.fps);
  const frameInterval = 1000 / cfg.fps;

  // 起始值（未出框状态）
  const targetScale = baseParams.photoScale;
  const targetOffsetX = baseParams.photoOffset.x;
  const targetOffsetY = baseParams.photoOffset.y;
  const photoW = baseParams.photo.width;
  const photoH = baseParams.photo.height;
  const photoRect = baseParams.frameLayout.photoRect;
  const startScale = 1.0;
  const startOffsetX = Math.round((photoRect.width - photoW) / 2);
  const startOffsetY = Math.round((photoRect.height - photoH) / 2);

  // 先合成第一帧确定画布尺寸
  const firstFrame = compose(baseParams);
  const canvasW = firstFrame.width;
  const canvasH = firstFrame.height;

  // 创建录制用 Canvas
  const recordCanvas = document.createElement('canvas');
  recordCanvas.width = canvasW;
  recordCanvas.height = canvasH;
  const recordCtx = recordCanvas.getContext('2d')!;

  // 使用 MediaRecorder 录制 Canvas 流
  const stream = recordCanvas.captureStream(0); // 手动控制帧
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 5000000,
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<Blob>((resolve, reject) => {
    mediaRecorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
    mediaRecorder.onerror = () => {
      reject(new Error('录制失败'));
    };

    mediaRecorder.start();

    // 逐帧渲染
    let frameIndex = 0;

    function renderNextFrame(): void {
      if (frameIndex >= totalFrames) {
        mediaRecorder.stop();
        return;
      }

      const elapsed = frameIndex * frameInterval;
      let currentScale: number;
      let currentOffsetX: number;
      let currentOffsetY: number;

      if (elapsed < cfg.burstDuration) {
        // 冲出动画阶段
        const t = elapsed / cfg.burstDuration;
        const eased = easeOutBack(Math.min(t, 1));
        currentScale = startScale + (targetScale - startScale) * eased;
        currentOffsetX = startOffsetX + (targetOffsetX - startOffsetX) * eased;
        currentOffsetY = startOffsetY + (targetOffsetY - startOffsetY) * eased;
      } else {
        // 抖动循环阶段
        const wobbleTime = elapsed - cfg.burstDuration;
        const phase = (wobbleTime / cfg.wobblePeriod) * Math.PI * 2;
        currentScale = targetScale + Math.sin(phase) * cfg.wobbleScaleAmplitude;
        currentOffsetX = targetOffsetX + Math.sin(phase * 1.3) * cfg.wobbleAmplitude;
        currentOffsetY = targetOffsetY + Math.cos(phase * 0.7) * cfg.wobbleAmplitude;
      }

      // 合成当前帧
      const frameCanvas = compose({
        ...baseParams,
        photoScale: currentScale,
        photoOffset: { x: currentOffsetX, y: currentOffsetY },
      });

      // 绘制到录制 Canvas
      recordCtx.clearRect(0, 0, canvasW, canvasH);
      recordCtx.drawImage(frameCanvas, 0, 0);

      // 手动推送帧到 MediaRecorder
      const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
      if (track.requestFrame) {
        track.requestFrame();
      }

      // 报告进度
      frameIndex++;
      if (onProgress) {
        onProgress(frameIndex / totalFrames);
      }

      // 使用 setTimeout 控制帧间隔，避免阻塞 UI
      setTimeout(renderNextFrame, 0);
    }

    renderNextFrame();
  });
}
