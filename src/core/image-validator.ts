import type { ValidationResult } from '../types';
import { DEFAULT_CONFIG } from '../config';

/**
 * 验证上传的文件是否符合要求
 * 检查顺序：空文件 → 文件格式 → 文件大小
 * @param file 用户上传的文件
 * @returns 验证结果，包含是否通过和错误信息
 */
export function validate(file: File): ValidationResult {
  // 检查文件是否为空
  if (file.size === 0) {
    return {
      valid: false,
      error: { type: 'file_empty' },
    };
  }

  // 检查文件格式是否在支持列表中
  const supportedFormats = DEFAULT_CONFIG.SUPPORTED_FORMATS as readonly string[];
  if (!supportedFormats.includes(file.type)) {
    return {
      valid: false,
      error: {
        type: 'invalid_format',
        supportedFormats: [...DEFAULT_CONFIG.SUPPORTED_FORMATS],
      },
    };
  }

  // 检查文件大小是否超过限制
  if (file.size > DEFAULT_CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: {
        type: 'file_too_large',
        maxSizeMB: DEFAULT_CONFIG.MAX_FILE_SIZE / (1024 * 1024),
      },
    };
  }

  // 所有验证通过
  return { valid: true };
}
