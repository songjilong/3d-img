# 实现计划：照片出框效果（Photo Pop-Out Frame）

## 概述

基于 TypeScript + Vite 构建纯前端照片出框效果应用。使用 HTML5 Canvas 2D 实现图层合成，MediaPipe Image Segmentation 实现前景分割，exifreader 解析 EXIF 数据。任务按模块递增构建，每个模块完成后可独立验证。

## 任务

- [x] 1. 初始化项目结构与核心类型定义
  - [x] 1.1 使用 Vite 初始化 TypeScript 项目，安装依赖（@mediapipe/tasks-vision、exifreader、fast-check、vitest）
    - 创建 `src/` 目录结构，配置 `tsconfig.json` 和 `vite.config.ts`
    - 安装运行时依赖：`@mediapipe/tasks-vision`、`exifreader`
    - 安装开发依赖：`vitest`、`fast-check`
    - _需求：全局_

  - [x] 1.2 定义核心接口和类型（types.ts）
    - 创建 `src/types.ts`，定义 `ValidationResult`、`ValidationError`、`SegmentationResult`、`BoundingBox`、`Size`、`FrameConfig`、`FrameLayout`、`Rect`、`CompositeParams`、`ExportFormat`、`ExifData`、`AppState`、`ProcessStage` 等所有接口和类型
    - 创建 `src/config.ts`，定义 `DEFAULT_CONFIG` 常量
    - _需求：全局_

- [x] 2. 实现图片验证器（ImageValidator）
  - [x] 2.1 实现 `src/core/image-validator.ts`
    - 实现 `validate(file: File): ValidationResult` 函数
    - 验证文件 MIME 类型是否在 `['image/jpeg', 'image/png', 'image/webp']` 中
    - 验证文件大小是否不超过 20MB
    - 验证文件是否为空
    - 返回精确匹配失败原因的错误类型
    - _需求：1.1, 1.2, 1.3, 1.4_

  - [ ]* 2.2 编写图片验证器单元测试
    - 创建 `tests/unit/image-validator.test.ts`
    - 测试合法格式通过、非法格式拒绝、超大文件拒绝、空文件拒绝等场景
    - _需求：1.2, 1.3, 1.4_

  - [ ]* 2.3 编写属性测试：文件验证正确性
    - 创建 `tests/property/validation.property.test.ts`
    - **属性 1：文件验证正确性**
    - 使用 fast-check 生成随机文件元数据（格式、大小），验证验证逻辑的正确性
    - **验证需求：1.2, 1.3, 1.4**

- [x] 3. 实现 EXIF 解析器（ExifParser）
  - [x] 3.1 实现 `src/core/exif-parser.ts`
    - 实现 `parse(file: File): Promise<ExifData>` 函数，使用 exifreader 库提取设备型号、ISO、光圈值、快门速度、焦距、拍摄日期
    - 实现 `formatForDisplay(data: ExifData): string` 函数，将 EXIF 数据格式化为简洁的展示文字
    - EXIF 解析失败时静默处理，返回全 null 的 ExifData
    - _需求：5.1, 5.2, 5.3_

  - [ ]* 3.2 编写 EXIF 解析器单元测试
    - 创建 `tests/unit/exif-parser.test.ts`
    - 测试正常 EXIF 数据解析、全 null 数据的格式化输出、解析失败的静默处理
    - _需求：5.1, 5.2, 5.3_

  - [ ]* 3.3 编写属性测试：EXIF 格式化完整性
    - 创建 `tests/property/exif.property.test.ts`
    - **属性 6：EXIF 格式化完整性**
    - 使用 fast-check 生成随机 ExifData 对象，验证非 null 字段值出现在格式化输出中
    - **验证需求：5.2**

- [x] 4. 实现相框生成器（FrameGenerator）
  - [x] 4.1 实现 `src/core/frame-generator.ts`
    - 实现 `generateFrame(photoSize: Size, config: FrameConfig): FrameLayout` 函数
    - 根据照片宽高比自动调整相框尺寸
    - 计算 `outerSize`、`photoRect`、`metadataRect`、`framePath`
    - 支持自定义边框宽度
    - _需求：3.1, 3.2, 3.3_

  - [ ]* 4.2 编写相框生成器单元测试
    - 创建 `tests/unit/frame-generator.test.ts`
    - 测试不同宽高比照片的相框生成、自定义边框宽度
    - _需求：3.1, 3.2, 3.3_

  - [ ]* 4.3 编写属性测试：相框布局计算正确性
    - 创建 `tests/property/frame.property.test.ts`
    - **属性 4：相框布局计算正确性**
    - 使用 fast-check 生成随机照片尺寸和配置，验证布局计算满足宽高比一致、尺寸公式正确
    - **验证需求：3.1, 3.2, 3.3**

- [x] 5. 检查点 - 确保核心模块测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [x] 6. 实现前景分割器（ForegroundSegmenter）
  - [x] 6.1 实现 `src/core/foreground-segmenter.ts`
    - 实现 `initialize(): Promise<void>` 函数，加载 MediaPipe Image Segmentation 模型
    - 实现 `segment(image): Promise<SegmentationResult>` 函数，执行前景分割并生成遮罩
    - 实现 `dispose(): void` 函数，释放模型资源
    - 确保遮罩尺寸与输入图片一致
    - 当无法识别前景主体时设置 `hasSubject: false`
    - _需求：2.1, 2.2, 2.3, 2.4_

  - [ ]* 6.2 编写属性测试：遮罩尺寸一致性与无主体检测
    - 创建 `tests/property/segmentation.property.test.ts`
    - **属性 2：遮罩尺寸一致性**
    - **属性 3：无主体时的检测反馈**
    - 使用 fast-check 生成随机尺寸验证遮罩输出尺寸，生成 hasSubject=false 的结果验证错误提示
    - **验证需求：2.2, 2.4**

- [x] 7. 实现图层合成器（Compositor）
  - [x] 7.1 实现 `src/core/compositor.ts`
    - 实现 `compose(params: CompositeParams): HTMLCanvasElement` 函数
    - 按顺序绘制四个图层：背景层 → 相框层 → 照片层（clip 到相框内部）→ 出框主体层（遮罩裁剪，不设 clip）
    - 支持照片偏移和缩放参数
    - 保留遮罩 alpha 通道实现边缘抗锯齿
    - _需求：4.1, 4.2, 4.3, 4.5, 7.2_

  - [x] 7.2 实现 `export` 导出函数
    - 在 `src/core/compositor.ts` 中实现 `export(canvas, format, quality): Promise<Blob>` 函数
    - 支持 PNG（保留透明度）和 JPEG 格式导出
    - 确保导出 Blob 的 MIME 类型正确
    - _需求：6.1, 6.2, 6.3_

  - [ ]* 7.3 编写合成器单元测试
    - 创建 `tests/unit/compositor.test.ts`
    - 测试图层合成顺序、出框效果裁剪、导出格式
    - _需求：4.1, 4.2, 6.1_

  - [ ]* 7.4 编写属性测试：出框效果合成与缩放比例
    - 创建 `tests/property/composite.property.test.ts`
    - **属性 5：出框效果图层合成正确性**
    - **属性 8：缩放比例应用正确性**
    - 使用 fast-check 生成随机合成参数，验证像素级合成正确性和缩放绘制尺寸
    - **验证需求：4.1, 4.2, 4.5, 3.4, 7.2**

  - [ ]* 7.5 编写属性测试：导出格式与分辨率正确性
    - 创建 `tests/property/export.property.test.ts`
    - **属性 7：导出格式与分辨率正确性**
    - 使用 fast-check 生成随机 Canvas 和格式，验证 Blob 类型和尺寸
    - **验证需求：6.1, 6.2, 6.3**

- [x] 8. 检查点 - 确保核心处理层测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [x] 9. 实现应用状态管理
  - [x] 9.1 实现 `src/state.ts` 应用状态管理
    - 定义 `AppState` 初始状态，使用 `DEFAULT_CONFIG` 中的默认值
    - 实现状态更新函数：`updateStage`、`updatePhotoOffset`、`updatePhotoScale`、`resetAdjustments`
    - `resetAdjustments` 将 `photoOffset` 恢复为自动计算的默认值，`photoScale` 恢复为 `DEFAULT_SCALE`
    - _需求：7.4_

  - [ ]* 9.2 编写属性测试：重置恢复默认值
    - 创建 `tests/property/state.property.test.ts`
    - **属性 9：重置恢复默认值**
    - 使用 fast-check 生成随机调整状态，验证重置后恢复默认值
    - **验证需求：7.4**

- [x] 10. 实现用户界面层
  - [x] 10.1 实现上传组件（`src/ui/upload.ts`）
    - 创建文件上传入口，支持拖拽和点击上传
    - 调用 ImageValidator 验证文件，显示错误提示
    - 上传成功后显示照片预览
    - _需求：1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 10.2 实现分割预览组件（`src/ui/segmentation-preview.ts`）
    - 展示分割结果预览，允许用户确认分割结果
    - 当无法识别主体时显示提示信息
    - _需求：2.4, 2.5_

  - [x] 10.3 实现调整控制面板（`src/ui/controls.ts`）
    - 实现拖拽调整照片位置功能
    - 实现缩放滑块控制照片缩放比例
    - 实现相框边框宽度调整
    - 实现背景颜色选择器
    - 实现拍摄参数文字编辑
    - 实现重置按钮
    - 实时更新合成预览
    - _需求：3.3, 3.4, 5.4, 7.1, 7.2, 7.3, 7.4_

  - [x] 10.4 实现导出组件（`src/ui/export.ts`）
    - 提供格式选择（PNG/JPEG）
    - 点击导出按钮触发下载
    - _需求：6.1, 6.2, 6.4_

- [x] 11. 集成与主入口
  - [x] 11.1 实现主入口文件（`src/main.ts`）和页面（`index.html`）
    - 创建 `index.html` 页面结构和基础样式
    - 在 `src/main.ts` 中串联完整流程：上传 → 验证 → 分割 → 预览 → 调整 → 合成 → 导出
    - 实现阶段切换逻辑，根据 `ProcessStage` 显示/隐藏对应 UI 组件
    - 接入错误处理，所有错误信息使用中文展示
    - _需求：1.5, 2.5, 4.4, 6.4_

  - [x] 11.2 实现合成效果实时预览
    - 在调整阶段，用户修改参数时实时调用 Compositor 重新合成并更新 Canvas 预览
    - 确保预览与最终导出效果一致
    - _需求：4.4, 7.3, 6.3_

- [x] 12. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号，确保可追溯性
- 检查点任务确保增量验证
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
- 所有代码注释和用户界面文字使用中文
