/**
 * 测试环境初始化：为 Node.js 环境提供浏览器 Canvas API 的 polyfill
 */

// Path2D 在 Node.js 中不可用，提供简易 polyfill 用于测试
if (typeof globalThis.Path2D === 'undefined') {
  class Path2DPolyfill {
    /** 记录所有绘制操作，便于测试验证 */
    private operations: Array<{ type: string; args: number[] }> = [];

    rect(x: number, y: number, w: number, h: number): void {
      this.operations.push({ type: 'rect', args: [x, y, w, h] });
    }

    moveTo(x: number, y: number): void {
      this.operations.push({ type: 'moveTo', args: [x, y] });
    }

    lineTo(x: number, y: number): void {
      this.operations.push({ type: 'lineTo', args: [x, y] });
    }

    closePath(): void {
      this.operations.push({ type: 'closePath', args: [] });
    }

    /** 获取记录的操作列表（测试辅助方法） */
    getOperations(): Array<{ type: string; args: number[] }> {
      return this.operations;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Path2D = Path2DPolyfill;
}
