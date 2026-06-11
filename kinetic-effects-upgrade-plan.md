# 纯文本混剪动效升级方案（对照「纯文本混剪1-1/1-2/1-3」样片）

## 0. 背景与目标

参考样片：`example_video/纯文本混剪1-1.mp4`、`纯文本混剪1-2.mp4`、`纯文本混剪1-3.mp4`。
三段均为 640×368、24fps 的黑底「踩点」动态文字视频，设计语言一致：

- 纯黑背景，超粗白色大字 + 小号衬线注释字混排
- 橙色 / 黄色行内强调词，部分强调词带高亮色块
- 所有文字切换严格卡鼓点

当前链路（上传 demo → 千问解析 → 模板 → DeepSeek 填文案 → Remotion 渲染）已经打通，
但渲染端一个 slot 只能渲染一段单色文字，对照样片缺以下原语：

1. 行内强调词变色 / 高亮块（数据已存在于 `plan.script[].emphasis`，渲染端被丢弃）
2. 大标题 + 小副标题复合排版（同屏两级字号）
3. 原位换词 / 渐进补全（跨节拍句架不动只换局部词）
4. 多实例散落爆发词（多个随机角度的「呼!」）
5. 大字间夹竖排小字、背景幽灵大数字
6. `motion.entrance` / `motion.camera` 已解析但渲染端未使用
7. 节拍精度：千问估算的 beatMarkers 不可靠，无本地鼓点检测

## 1. 总体设计原则

- 所有新字段加在 `templateSlotSchema` 上且**全部 optional**，旧模板零迁移
- 新能力拆四类：
  1. 一个共享富文本渲染组件（`RichWords`）
  2. 几个新 sceneType（`title-sub`、`word-swap`、`burst-words`、`char-annotation`）
  3. 两个槽位级图层（`backdrop` 幽灵字、槽内节拍轴 `beatFrames`）
  4. 一个本地鼓点检测步骤（`lib/beat-detect.ts`）
- UI 基本免费：`components/settings/MotionSettingsPanel.tsx` 的场景选择器从
  `advancedSceneTypes` 枚举自动渲染，新场景只需在 `sceneTypeLabels` 加中文标签
- 渲染内所有"随机"必须用 Remotion 的种子化 `random()`，保证逐帧确定性

## 2. 第 1 步：行内强调词变色 / 高亮块

最大收益、最小改动。数据链路已存在：
`lib/deepseek.ts` 提示词第 13 条已要求输出 `{"text":"短句","emphasis":["关键词"]}`，
归一化后保留在 `plan.script[].emphasis`，但
`remotion/KineticTextComposition.tsx` 的 `getSlotText` 只取了 `text`。

### 2.1 Schema（lib/schemas.ts）

```ts
// templateSlotSchema 新增
emphasisWords: z.array(z.string().min(1).max(12)).max(6).optional(), // 模板默认强调词
emphasisStyle: z.enum(["color", "highlight", "outline"]).optional(), // 默认 color
```

- `color`：强调词用 accent 色（样片 1 的橙色「鼓点」）
- `highlight`：accent 色块打底 + 深色字 + 轻微旋转（样片 3 压在「节奏」上的黄块）
- `outline`：描边空心字

### 2.2 渲染（remotion/scenes/KineticTextScene.tsx）

新增 `RichWords` 组件，替代 `WordBlock` 内部的纯文本输出：

- 对 `text` 按 `emphasis` 数组做**最长匹配优先**分词
- 命中子串渲染为 `<span>`，按 `emphasisStyle` 应用 accent 色 / 高亮块 / 描边
- 未命中部分保持原色
- `WordBlock` 增加 `emphasis?: string[]`、`emphasisStyle?` 入参，内部换用 `RichWords`

### 2.3 接线（remotion/KineticTextComposition.tsx）

```ts
// getSlotText -> getSlotContent
const getSlotContent = (plan, slotIndex, slot) => ({
  text: plan.storyboard[slotIndex]?.text || plan.script[slotIndex]?.text || slot.defaultText,
  emphasis: plan.script[slotIndex]?.emphasis?.length
    ? plan.script[slotIndex].emphasis
    : slot.emphasisWords ?? [],
});
```

优先级：script 行级 emphasis > slot 模板默认 emphasisWords。

### 2.4 提示词与归一化

- `lib/deepseek.ts`：加一条规则「emphasis 必须是对应 text 的原文子串，1~2 个词」；
  归一化时过滤非子串项（否则分词失败）
- `app/api/analyze-template-video/route.ts` systemPrompt 的 slot JSON 形状加
  `"emphasisWords": ["词"]`、`"emphasisStyle": "color|highlight|outline"`
- `lib/advanced-template.ts` normalize 中接住两个新字段并截断

### 2.5 编辑端（可选，components/GeneratedPlanCard.tsx）

文案大编辑框支持 `【强调词】` 行内标记：保存时解析进该行 emphasis 数组并去掉括号。
比每行单独加输入框轻得多。

## 3. 第 2 步：大标题 + 小副标题（title-sub）+ 背景幽灵大字（backdrop）

### 3.1 Schema

```ts
// templateSlotSchema 新增
subText: z.string().max(24).optional(),   // 副标题，# 前缀直接写在文本里
backdrop: z.object({                       // 幽灵背景字，可叠加在任何场景上
  text: z.string().min(1).max(4),
  opacity: z.number().min(0).max(0.4).default(0.12),
  scale: z.number().min(1).max(6).default(3.2),
}).optional(),

// advancedSceneTypes 新增 "title-sub"
// storyboardShotSchema 新增 subText: z.string().max(24).optional()
```

### 3.2 渲染

- `TitleSubScene`：大标题走现有 `textSize` 撞击入场；副标题约 0.18× 字号，
  延迟一拍淡入或打字入场；副标题同样走 `RichWords`（样片副标题强调词都变色）
- `backdrop` 不做场景，做成 `KineticTextScene` 里位于场景内容**之后**的一层：
  巨大 muted 色文字，`opacity`/`scale` 可调。「第一种 + 背后幽灵数字」即
  `title-sub` + `backdrop` 的组合

### 3.3 生成端

DeepSeek 提示词：高级槽位为 `title-sub` 时同时产出标题（text）与副标题（subText），
storyboard 元素带 `subText` 字段。

## 4. 第 3 步：让 motion.entrance / motion.camera 真正生效

两字段目前解析、存储、UI 全齐，渲染端完全没读。

### 4.1 entrance

抽共享 hook（放在 KineticTextScene.tsx 或新文件 `remotion/scenes/use-entrance.ts`）：

```ts
useEntrance(entrance, frame, durationFrames, intensity)
// 返回 { opacity, transform, revealCount }
// 实现：wipe / stomp / slide / scale / scatter / typewriter / none
```

- 已有自定义入场的场景（split-word、stomp-word 等）保持现状
- 简单场景（word-card、title-sub、logo-hold）改读该 hook
- `typewriter` 在此实现后，「渐进补全」的单槽匀速版免费获得

### 4.2 camera

`KineticTextScene` 最外层包一个变换层，按槽位时长插值
`slot.motion.camera` 的 `zoom / panX / panY / rotate`；
给 word-card 默认加极轻的持续推进（如 1.0 → 1.04），整体质感立刻接近样片。

## 5. 第 4 步：槽内节拍轴 + 三个新场景

复刻样片最关键的一步。核心：把 `template.beatMarkers` 切进槽位。

### 5.1 节拍轴接线（remotion/KineticTextComposition.tsx）

```ts
const beatFrames = (template.beatMarkers ?? [])
  .filter((b) => b >= slot.startSec && b < slot.startSec + slot.durationSec)
  .map((b) => Math.round((b - slot.startSec) * VIDEO_FPS));
// 作为 prop 传入 KineticTextScene；为空时各场景退化为匀速节奏
```

### 5.2 新场景

| sceneType | 新字段 | 行为 |
|---|---|---|
| `word-swap` | `swapWords: string[]`（≤6） | 句架静止，text 中第一个强调词位置每到一拍换下一个词并撞击入场（「可以是 人物→慢动作→缩放 镜头」） |
| `burst-words` | `burstWords: string[]`（≤8） | 每拍弹出一个词，位置/角度用 `random(slot.id + index)` 确定性伪随机，accent 大字 scale-pop（「呼! 呼! 哢!」） |
| `char-annotation` | 复用 `subText` | 2~4 个大字 space-between 拉开，subText 以 `writing-mode: vertical-rl` 竖排塞字间；可选计数文本逐拍 reveal（「切　换 + 镜头12345」） |

「渐进补全」（跟→跟上鼓→跟上鼓点放啥）= typewriter 的节拍版：
reveal 进度按 `beatFrames` 跳变而非匀速，作为 `progressive` 入场参数或独立场景实现。

### 5.3 Schema

```ts
// templateSlotSchema 新增
swapWords: z.array(z.string().min(1).max(8)).max(6).optional(),
burstWords: z.array(z.string().min(1).max(6)).max(8).optional(),
// advancedSceneTypes 新增 "word-swap" | "burst-words" | "char-annotation"
```

## 6. 第 5 步：本地鼓点检测

落点：`app/api/analyze-template-video/route.ts`（已在用 ffmpeg 抽音频）。

### 6.1 流程

1. `ffmpeg -i demo -ac 1 -ar 22050 -f s16le -` 解码单声道 PCM
2. 节拍检测（新文件 `lib/beat-detect.ts`），二选一：
   - **`music-tempo` npm 包**：纯 JS，输入 PCM 数组输出 BPM + 每拍时间点，
     零原生依赖 —— 推荐先用
   - 自写约百行能量 / 谱通量 onset 检测：无依赖，对鼓点强的混剪音乐足够
3. 检测结果**覆盖**千问估算的 `beatMarkers`
4. `lib/advanced-template.ts` 新增 `snapSlotsToBeats(slots, beats)`：
   槽位 `startSec / durationSec` 吸附到最近节拍；
   模板管理界面加「对齐节拍」开关（默认开）

### 6.2 注意

- ffmpeg 调用沿用现有 remotion bin → 系统 ffmpeg 的双回退模式
- 检测失败时静默回退到千问估算值，不阻塞解析流程
- 后续可复用同一检测给用户上传的背景音乐做对齐（本期不做）

## 7. 第 6 步：提示词、归一化与 UI 收尾

- 千问解析 prompt：注册新 sceneType 与新字段，加使用规则，例如
  「画面出现多个随机角度拟声词时用 burst-words 并列出 burstWords」、
  「大标题下有小注释/hashtag 时用 title-sub 并输出 subText」
- `lib/advanced-template.ts` 归一化上限：swapWords≤6、burstWords≤8、
  subText≤24、backdrop.text≤4、emphasisWords≤6
- `sceneTypeLabels`（MotionSettingsPanel.tsx）加中文标签：
  标题副标题、原位换词、爆发词、字间注释
- 单镜头高级设置面板加 subText / swapWords / burstWords 编辑（逗号分隔输入框）
- `lib/templates.ts` 预设模板里挑 1~2 个加入新场景做开箱示例

### 7.1 字体加分项（便宜但显著）

`remotion/scenes/theme.ts` 现用系统 PingFang，样片大字是「优设标题黑」类超粗标题字。

- `public/fonts/` 内置 1~2 个免费可商用标题字（站酷酷黑 / 思源黑体 Heavy），
  `@font-face` + `staticFile` 注册进 fontMap
- `subText` 默认用宋体：「黑体巨字 + 衬线小注」混排是这套设计语言的另一半签名
- 内置字体同时消除跨机器渲染差异

## 8. 实施顺序与验证

```txt
1. 行内强调（0.5~1天）
2. title-sub + backdrop（1天）
3. entrance / camera 生效（0.5~1天）
4. 槽内节拍轴 + word-swap / burst-words / char-annotation（2~3天）
5. 鼓点检测 + 节拍吸附（1~2天）
6. 提示词 / UI / 字体收尾（1~2天）
```

每步独立可合并、可预览。验证方式：

1. 手写一份对照「纯文本混剪1-1」的目标模板 JSON（fixture），
   注册进 Remotion Studio（`npm run remotion:studio`）逐镜头与原片比对
2. `npm run typecheck` 全程保持通过
3. 1~3 步完成后用真实链路（上传 demo → 千问解析）回归解析质量
4. 最终 `npm run remotion:render` 出片与样片并排对比

预期效果：1~3 步后复刻相似度从约五成提至七八成；4~5 步后可基本逐帧对齐样片。
