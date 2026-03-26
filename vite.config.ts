/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  // 开发服务器配置
  server: {
    open: true,
  },
  // 构建配置
  build: {
    target: 'es2020',
  },
  // 测试配置
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
