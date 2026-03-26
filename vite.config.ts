/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  // 开发服务器配置
  server: {
    open: true,
    headers: {
      // onnxruntime-web WASM 多线程需要这些 headers
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  // 构建配置
  build: {
    target: 'es2020',
  },
  // onnxruntime-web 的 WASM 文件需要排除在优化之外
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  // 测试配置
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
