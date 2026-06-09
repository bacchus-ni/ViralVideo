# 纯文混剪极简原型

这是一个 Next.js + Remotion 的 MVP 原型，主流程是：

```txt
选择模板 -> 描述需求 -> DeepSeek 生成文案和分镜 -> 可选调整样式 -> 预览 -> 生成视频
```

## 本地运行

```bash
npm install
npm run dev
```

打开：

```txt
http://localhost:3010
```

## 配置 DeepSeek

复制 `.env.example` 为 `.env.local`，然后填入本地 API key：

```bash
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_MODEL=deepseek-v4-flash
```

`.env.local` 已在 `.gitignore` 中，不要提交。

如果没有配置 API key，页面仍可运行，会使用本地示例兜底，方便先调 UI 和 Remotion 预览。

## 常用命令

```bash
npm run typecheck
npm run build
npm run remotion:studio
```

## 当前状态

- 已实现极简三栏 UI
- 已实现模板选择
- 已实现 DeepSeek 生成接口
- 已实现 AI 结果展示
- 已实现整段文案编辑和分镜编辑
- 已实现配色弹窗，支持预设色系和本地保存自定义配色
- 已实现字体弹窗，支持字体、字号、字重
- 已实现背景弹窗，支持纯色、渐变、粒子、质感背景和上传图片
- 已实现比例弹窗，支持常见长宽比、自定义比例、720p/1080p/2K/自定义分辨率
- 已实现 Remotion Player 竖屏预览
- 已实现 Remotion CLI 本地 MP4 导出，输出到 `public/renders/`

注意：导出 1080p 或 2K 时需要启动浏览器逐帧渲染，会比预览慢很多。
