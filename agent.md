# Agent 落地说明：极简纯文混剪生成网页

## 1. 产品目标

做一个低门槛的纯文本混剪视频生成网页。用户不需要理解时间线、关键帧、镜头参数，只按照页面引导完成：

1. 选择模板
2. 用自然语言描述需求
3. 让 LLM 生成视频文案和分镜说明
4. 可选调整配色、字体、背景样式、节奏
5. 生成 Remotion 视频

当前 UI 方向以用户选中的预览图为准：左侧模板列表，中间是需求输入和 AI 生成结果，右侧是竖屏手机预览，底部是少量可选风格设置。

## 2. 核心原则

- 页面必须简单，不做专业剪辑台。
- 第一屏只保留一条主路径：选模板 -> 描述需求 -> AI 生成 -> 生成视频。
- 不暴露复杂时间线，只展示「文案」和「分镜」两类结果。
- 风格设置保持可选，默认值必须足够好。
- LLM 只生成结构化 JSON，不直接生成任意 Remotion 代码。
- DeepSeek API key 只能放在服务端环境变量中，不能写入前端代码，也不能提交到仓库。

## 3. 建议技术栈

- Web 框架：Next.js + TypeScript
- UI：React 组件 + CSS Modules / Tailwind 均可
- 视频预览：`@remotion/player`
- 视频渲染：Remotion + `@remotion/renderer`
- 参数校验：Zod
- LLM：DeepSeek Chat Completions API
- 存储：MVP 阶段可以先本地输出，后续再接 S3 / R2 / OSS

## 4. 页面信息架构

### 4.1 左侧：选择模板

展示 5 个预设模板：

- 爆款金句：适合励志、干货分享
- 情绪独白：适合情绪表达、治愈文案
- 知识快剪：适合知识科普、干货讲解
- 产品种草：适合好物推荐、种草测评
- 极简标题：适合极简风格、品牌宣传

每个模板包含：

```ts
type TemplatePreset = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  defaultStyle: StyleOptions;
  promptHint: string;
};
```

### 4.2 中间：描述需求

输入区：

- 文本框 placeholder：`描述你想做的视频，比如主题、平台、时长、语气`
- 示例 chips：
  - `励志主题，抖音，15秒，激励向`
  - `情感治愈，小红书，20秒，温暖`
  - `知识科普，视频号，30秒，清晰`
- 主按钮：`让AI生成`

输入后调用后端接口：

```txt
POST /api/generate-plan
```

### 4.3 中间：AI 生成结果

结果区只展示两个 Tab：

- 文案
- 分镜

文案 Tab 展示逐条文字内容。分镜 Tab 展示每个镜头的画面说明、文字、动画节奏。

### 4.4 底部：可选风格设置

默认折叠或弱化展示：

- 配色
- 字体
- 背景
- 节奏

建议做成简单下拉或 chips，不做复杂 inspector。

```ts
type StyleOptions = {
  palette: "gold" | "blue" | "white" | "dark" | "fresh";
  fontFamily: "hei" | "song" | "yuan" | "serif";
  backgroundStyle: "particles" | "gradient" | "solid" | "image";
  pace: "slow" | "medium" | "fast";
};
```

### 4.5 右侧：竖屏预览

右侧始终展示一个 9:16 手机画面：

- 没有生成时展示模板预览
- AI 生成后展示第一版 Remotion Player 预览
- 用户改样式后实时更新预览
- 下方主按钮：`生成视频`

## 5. 核心数据结构

LLM 输出必须统一成 `VideoPlan`：

```ts
type VideoPlan = {
  title: string;
  platform: "douyin" | "xiaohongshu" | "shipinhao" | "generic";
  durationSec: number;
  tone: string;
  templateId: string;
  script: ScriptLine[];
  storyboard: StoryboardShot[];
  style: StyleOptions;
};

type ScriptLine = {
  id: string;
  text: string;
  emphasis?: string[];
};

type StoryboardShot = {
  id: string;
  startSec: number;
  durationSec: number;
  text: string;
  visualDescription: string;
  animation: "fade" | "slide-up" | "pop" | "zoom" | "typewriter";
};
```

## 6. DeepSeek LLM 接入

### 6.1 环境变量

在项目根目录创建 `.env.local`，本地填入：

```bash
DEEPSEEK_API_KEY=你的 DeepSeek API Key
```

注意：

- 不要把真实 key 写进 `agent.md`
- 不要把真实 key 写进前端 bundle
- 不要提交 `.env.local`
- 仓库只保留 `.env.example`

`.env.example`：

```bash
DEEPSEEK_API_KEY=
```

### 6.2 推荐服务端调用方式

DeepSeek API 兼容 OpenAI 风格调用。服务端可以使用 OpenAI SDK，并把 `baseURL` 指向 DeepSeek：

```ts
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});
```

MVP 推荐：

- 快速生成：`deepseek-v4-flash`
- 质量优先：`deepseek-v4-pro`

DeepSeek 官方文档当前列出的 OpenAI 格式 Base URL 是 `https://api.deepseek.com`。截至 2026-06-09，`deepseek-chat` 和 `deepseek-reasoner` 仍可作为兼容名称使用，但官方文档说明它们将在 2026-07-24 15:59 UTC 后废弃，所以新项目优先使用 `deepseek-v4-flash` 或 `deepseek-v4-pro`。

示例调用：

```ts
const completion = await deepseek.chat.completions.create({
  model: "deepseek-v4-flash",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
  response_format: { type: "json_object" },
});
```

如果实际账号模型列表不同，则以 DeepSeek 控制台和官方文档为准。

### 6.3 `/api/generate-plan` 逻辑

输入：

```ts
type GeneratePlanRequest = {
  templateId: string;
  userPrompt: string;
  style?: Partial<StyleOptions>;
};
```

输出：

```ts
type GeneratePlanResponse = {
  plan: VideoPlan;
};
```

后端流程：

1. 根据 `templateId` 读取模板预设
2. 组合系统提示词和用户需求
3. 调用 DeepSeek
4. 要求模型只输出 JSON
5. 用 Zod 校验 `VideoPlan`
6. 如果字段缺失，做一次修复调用或使用默认值补全
7. 返回给前端展示

### 6.4 LLM 系统提示词草案

```txt
你是一个短视频纯文本混剪策划助手。
你需要根据用户需求和模板类型，生成适合竖屏短视频的文案和分镜。

要求：
1. 只输出 JSON，不要输出 Markdown。
2. 视频以文字表现为主，不要依赖复杂实拍素材。
3. 每句文案要短，适合屏幕大字展示。
4. 分镜说明要描述背景、文字入场、节奏和强调词。
5. durationSec 必须在 10 到 45 秒之间。
6. storyboard 中每个镜头必须包含 startSec、durationSec、text、visualDescription、animation。
7. animation 只能是 fade、slide-up、pop、zoom、typewriter。
```

用户提示词组装：

```txt
模板：{template.name}
模板说明：{template.description}
模板风格：{template.promptHint}
用户需求：{userPrompt}
可选样式：{style}

请生成 VideoPlan JSON。
```

## 7. Remotion 实现思路

### 7.1 Composition 设计

只做一个通用 Composition：

```txt
TextMixComposition
```

它接收：

```ts
type TextMixCompositionProps = {
  plan: VideoPlan;
};
```

Remotion 根据 `plan.storyboard` 生成 `<Sequence>`：

- `startSec * fps` -> `from`
- `durationSec * fps` -> `durationInFrames`
- `animation` -> 对应文字动画组件
- `style` -> 颜色、字体、背景样式

### 7.2 背景实现

MVP 先做 4 类背景：

- `particles`：黑金粒子感，可用 CSS/Canvas/静态纹理实现
- `gradient`：柔和渐变
- `solid`：纯色
- `image`：预设背景图

### 7.3 动画实现

Remotion 动画必须使用 `useCurrentFrame()` 和 `interpolate()` 驱动，不要用 CSS transition。

建议先实现：

- `fade`
- `slide-up`
- `pop`
- `zoom`
- `typewriter`

### 7.4 预览和渲染

前端预览：

```txt
@remotion/player + TextMixComposition
```

导出视频：

```txt
POST /api/render-video
```

MVP 可以先使用服务端本机渲染，后续再迁移到队列：

```txt
用户点击生成视频
  -> 创建 render job
  -> renderMedia 渲染 mp4
  -> 返回下载地址
```

## 8. 推荐目录结构

```txt
app/
  page.tsx
  api/
    generate-plan/route.ts
    render-video/route.ts
components/
  TemplatePicker.tsx
  PromptComposer.tsx
  GeneratedPlanCard.tsx
  StyleBar.tsx
  PhonePreview.tsx
  PrimaryAction.tsx
lib/
  deepseek.ts
  templates.ts
  schemas.ts
  render.ts
remotion/
  Root.tsx
  TextMixComposition.tsx
  scenes/
    TextScene.tsx
    Background.tsx
    animations.ts
public/
  templates/
  backgrounds/
```

## 9. 开发顺序

### 阶段 1：静态 UI

1. 搭出截图中的三栏布局
2. 写死模板列表
3. 写死一份 AI 生成结果
4. 手机预览先用静态 HTML/CSS 模拟
5. 保证页面简单、按钮路径清晰

### 阶段 2：DeepSeek 生成文案和分镜

1. 增加 `.env.example`
2. 实现 `lib/deepseek.ts`
3. 实现 `/api/generate-plan`
4. 用 Zod 校验模型输出
5. 前端接入 loading、错误态、空态

### 阶段 3：Remotion 预览

1. 安装 Remotion 和 `@remotion/player`
2. 实现 `TextMixComposition`
3. 把 `VideoPlan` 映射成 Remotion sequences
4. 根据 style 实时更新预览

### 阶段 4：生成视频

1. 实现 `/api/render-video`
2. 使用 `@remotion/renderer` 导出 MP4
3. 增加渲染中、成功、失败状态
4. 成功后提供下载按钮

### 阶段 5：体验增强

1. 增加「重新生成」
2. 增加「只改文案」
3. 增加「只改分镜」
4. 增加「保存为模板」
5. 增加用户上传 demo 视频生成模板

## 10. 关键验收标准

- 用户不看说明也能完成一次视频生成。
- 默认模板足够好，不设置配色也能出片。
- AI 输出结果稳定是合法 JSON。
- LLM 失败时页面有清晰错误提示。
- 手机预览和最终导出视频内容一致。
- API key 不出现在客户端代码、日志和提交文件中。
- 页面元素少，主按钮始终明确。

## 11. 后续可扩展能力

- 上传 demo 视频后抽帧、提取音频、分析节奏
- 从 demo 提取 TemplateSpec
- 保存用户自定义模板
- 添加 BGM 和音效
- 支持批量生成不同文案版本
- 支持小红书、抖音、视频号不同平台尺寸和节奏
