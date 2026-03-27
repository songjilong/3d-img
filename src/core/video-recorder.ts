// ============================================================
// 照片出框效果 - 视频录制器
// 自动选择最佳编码方案：MP4 (WebCodecs) → WebM (MediaRecorder)
// ============================================================

import type { CompositeParams } from '../types';
import { compose } from './compositor';

/** 录制配置 */
interface RecordConfig {
  /** 总时长（毫秒） */
  totalDuration: number;
  /** 呼吸周期（毫秒） */
  wobblePeriod: number;
  /** 位移幅度（像素） */
  wobbleAmplitude: number;
  /** 缩放幅度 */
  wobbleScaleAmplitude: number;
  /** 帧率 */
  fps: number;
  /** 视频码率 */
  bitrate: number;
}

const DEFAULT_CONFIG: RecordConfig = {
  totalDuration: 7500,   // 7.5 秒（3 个周期）
  wobblePeriod: 2500,
  wobbleAmplitude: 1.5,
  wobbleScaleAmplitude: 0.015,
  fps: 30,
  bitrate: 5_000_000,
};

/** 录制结果 */
export interface RecordResult {
  blob: Blob;
  mimeType: string;
  extension: string;
}

/**
 * 计算某一帧的动画参数
 */
function computeFrameParams(
  baseParams: CompositeParams,
  elapsed: number,
  cfg: RecordConfig,
): CompositeParams {
  const phase = (elapsed / cfg.wobblePeriod) * Math.PI * 2;
  const breathFactor = (Math.sin(phase) + 1) / 2;

  return {
    ...baseParams,
    photoScale: baseParams.photoScale + (breathFactor * 2 - 1) * cfg.wobbleScaleAmplitude,
    photoOffset: {
      x: baseParams.photoOffset.x + Math.sin(phase * 0.7) * cfg.wobbleAmplitude,
      y: baseParams.photoOffset.y + Math.cos(phase * 0.5) * cfg.wobbleAmplitude,
    },
  };
}

/**
 * 检测是否支持 WebCodecs MP4 编码
 */
async function canUseWebCodecs(width: number, height: number, cfg: RecordConfig): Promise<string | null> {
  if (typeof VideoEncoder === 'undefined') return null;

  const codecs = ['avc1.42001f', 'avc1.640028', 'avc1.4d0028'];
  for (const codec of codecs) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec, width, height,
        bitrate: cfg.bitrate,
        framerate: cfg.fps,
      });
      if (support.supported) return codec;
    } catch { /* 继续尝试下一个 */ }
  }
  return null;
}

/**
 * 使用 WebCodecs + mp4-muxer 录制 MP4
 */
async function recordMP4(
  baseParams: CompositeParams,
  width: number,
  height: number,
  codec: string,
  cfg: RecordConfig,
  onProgress?: (progress: number) => void,
): Promise<RecordResult> {
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
  const totalFrames = Math.ceil((cfg.totalDuration / 1000) * cfg.fps);
  const frameInterval = 1000 / cfg.fps;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height },
    fastStart: 'in-memory',
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? undefined),
    error: (e) => console.error('编码错误：', e),
  });

  encoder.configure({ codec, width, height, bitrate: cfg.bitrate, framerate: cfg.fps });

  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = width;
  renderCanvas.height = height;
  const renderCtx = renderCanvas.getContext('2d')!;

  for (let i = 0; i < totalFrames; i++) {
    const elapsed = i * frameInterval;
    const frameCanvas = compose(computeFrameParams(baseParams, elapsed, cfg));

    renderCtx.fillStyle = baseParams.backgroundColor;
    renderCtx.fillRect(0, 0, width, height);
    renderCtx.drawImage(frameCanvas, 0, 0, width, height);

    const frame = new VideoFrame(renderCanvas, {
      timestamp: Math.round(elapsed * 1000),
      duration: Math.round(frameInterval * 1000),
    });
    encoder.encode(frame, { keyFrame: i % 30 === 0 });
    frame.close();

    if (onProgress) onProgress((i + 1) / totalFrames);
    if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  const target = muxer.target as InstanceType<typeof ArrayBufferTarget>;
  return {
    blob: new Blob([target.buffer], { type: 'video/mp4' }),
    mimeType: 'video/mp4',
    extension: 'mp4',
  };
}

/**
 * 使用 MediaRecorder 录制 WebM（降级方案）
 */
async function recordWebM(
  baseParams: CompositeParams,
  width: number,
  height: number,
  cfg: RecordConfig,
  onProgress?: (progress: number) => void,
): Promise<RecordResult> {
  const totalFrames = Math.ceil((cfg.totalDuration / 1000) * cfg.fps);
  const frameInterval = 1000 / cfg.fps;

  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = width;
  renderCanvas.height = height;
  const renderCtx = renderCanvas.getContext('2d')!;

  // 使用 captureStream + MediaRecorder
  const stream = renderCanvas.captureStream(0);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: cfg.bitrate,
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<RecordResult>((resolve, reject) => {
    mediaRecorder.onstop = () => {
      resolve({
        blob: new Blob(chunks, { type: 'video/webm' }),
        mimeType: 'video/webm',
        extension: 'webm',
      });
    };
    mediaRecorder.onerror = () => reject(new Error('WebM 录制失败'));

    mediaRecorder.start();

    let frameIndex = 0;
    function nextFrame(): void {
      if (frameIndex >= totalFrames) {
        mediaRecorder.stop();
        return;
      }

      const elapsed = frameIndex * frameInterval;
      const frameCanvas = compose(computeFrameParams(baseParams, elapsed, cfg));

      renderCtx.fillStyle = baseParams.backgroundColor;
      renderCtx.fillRect(0, 0, width, height);
      renderCtx.drawImage(frameCanvas, 0, 0, width, height);

      // 手动推帧
      const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
      if (track.requestFrame) track.requestFrame();

      frameIndex++;
      if (onProgress) onProgress(frameIndex / totalFrames);
      setTimeout(nextFrame, 0);
    }

    nextFrame();
  });
}

/**
 * 录制 Live Photo 动画视频（自动选择最佳格式）
 * 优先 MP4 (WebCodecs)，不支持时降级到 WebM (MediaRecorder)
 *
 * @param baseParams 基础合成参数
 * @param onProgress 进度回调（0~1）
 * @param config 录制配置
 * @returns 录制结果（含 blob、mimeType、extension）
 */
export async function recordLivePhotoVideo(
  baseParams: CompositeParams,
  onProgress?: (progress: number) => void,
  config: Partial<RecordConfig> = {},
): Promise<RecordResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 确定视频尺寸（偶数，限制最大 1920）
  const firstFrame = compose(baseParams);
  const maxDim = 1920;
  let w = firstFrame.width;
  let h = firstFrame.height;
  if (w > maxDim || h > maxDim) {
    const ratio = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }
  const width = w % 2 === 0 ? w : w + 1;
  const height = h % 2 === 0 ? h : h + 1;

  // 优先尝试 MP4
  const codec = await canUseWebCodecs(width, height, cfg);
  if (codec) {
    try {
      return await recordMP4(baseParams, width, height, codec, cfg, onProgress);
    } catch (e) {
      console.warn('MP4 录制失败，降级到 WebM：', e);
    }
  }

  // 降级到 WebM
  return recordWebM(baseParams, width, height, cfg, onProgress);
}
