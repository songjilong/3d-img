// ============================================================
// 照片出框效果 - EXIF 解析器
// 从照片文件中提取拍摄参数，并格式化为展示文字
// ============================================================

import ExifReader from 'exifreader';
import type { ExifData } from '../types';

/**
 * 创建全 null 的 ExifData 对象
 * 用于解析失败时的默认返回值
 */
function emptyExifData(): ExifData {
  return {
    cameraModel: null,
    iso: null,
    aperture: null,
    shutterSpeed: null,
    focalLength: null,
    dateTime: null,
  };
}

/**
 * 从照片文件中解析 EXIF 拍摄参数
 * 解析失败时静默处理，返回全 null 的 ExifData
 *
 * @param file 照片文件
 * @returns 解析后的拍摄参数
 */
export async function parse(file: File): Promise<ExifData> {
  try {
    const tags = await ExifReader.load(file);

    // 提取设备型号：优先使用 Model 标签
    const cameraModel = tags['Model']?.description ?? null;

    // 提取 ISO 感光度
    const isoTag = tags['ISOSpeedRatings'] ?? tags['PhotographicSensitivity'];
    const iso = isoTag?.value != null ? Number(isoTag.value) : null;

    // 提取光圈值（FNumber）
    const fNumberTag = tags['FNumber'];
    const aperture = fNumberTag?.description != null
      ? parseFloat(fNumberTag.description)
      : null;

    // 提取快门速度（ExposureTime），格式如 "1/250"
    const exposureTag = tags['ExposureTime'];
    const shutterSpeed = exposureTag?.description ?? null;

    // 提取焦距（mm）
    const focalTag = tags['FocalLength'];
    const focalLength = focalTag?.description != null
      ? parseFloat(focalTag.description)
      : null;

    // 提取拍摄日期
    const dateTag = tags['DateTimeOriginal'] ?? tags['DateTime'];
    const dateTime = dateTag?.description ?? null;

    return {
      cameraModel,
      iso: iso != null && !isNaN(iso) ? iso : null,
      aperture: aperture != null && !isNaN(aperture) ? aperture : null,
      shutterSpeed,
      focalLength: focalLength != null && !isNaN(focalLength) ? focalLength : null,
      dateTime,
    };
  } catch {
    // EXIF 解析失败时静默处理，返回全 null
    return emptyExifData();
  }
}

/**
 * 将 EXIF 数据格式化为简洁的展示文字
 * 非 null 字段会被包含在输出中，全 null 时返回空字符串
 *
 * @param data EXIF 数据
 * @returns 格式化后的展示文字
 */
export function formatForDisplay(data: ExifData): string {
  const parts: string[] = [];

  if (data.cameraModel != null) {
    parts.push(data.cameraModel);
  }

  if (data.focalLength != null) {
    parts.push(`${data.focalLength}mm`);
  }

  if (data.aperture != null) {
    parts.push(`f/${data.aperture}`);
  }

  if (data.shutterSpeed != null) {
    parts.push(`${data.shutterSpeed}s`);
  }

  if (data.iso != null) {
    parts.push(`ISO ${data.iso}`);
  }

  if (data.dateTime != null) {
    parts.push(data.dateTime);
  }

  return parts.join('  ');
}
