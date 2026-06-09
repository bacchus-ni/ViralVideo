# 高级纯文本混剪模板解析与渲染方案

## 1. 目标

当前系统已经可以完成：

- 选择模板
- 输入自然语言需求
- DeepSeek 生成文案和基础分镜
- Remotion 渲染纯文本视频
- 千问上传 demo 视频后生成简单模板草稿

但当前模板能力仍偏简单，主要是：

- 单镜头只支持少量动画枚举，如 `fade`、`pop`、`zoom`
- 模板更多是配色、字体、背景层面的样式模板
- demo 视频解析只提取了浅层风格，没有拆出镜头结构、转场、节奏点和运镜方式

新的目标是：用户上传类似 `example_video/纯文本混剪20s.mp4` 这种高级纯文本混剪视频后，系统能解析出可复用的高级模板结构，并用 Remotion 渲染接近该样片复杂度的 kinetic typography 视频。

## 2. 参考样片能力拆解

参考视频和 `remotion-text-mixcut20` 体现的是一套强编排文字动画系统，不是普通字幕轮播。

关键特征：

- 横屏 16:9，25fps，约 20.57 秒
- 以帧为单位设计切点和镜头段落
- 有强节奏音乐和 flash cut
- 前半段和后半段使用不同配色复现类似结构
- 多个高辨识度 scene：
  - 色块擦入标题
  - 单词卡撞击入场
  - 文字上下裁切分裂
  - 斜杠装饰和斜体冲击字
  - 单字母散开再归位
  - 描边文字阵列滚动
  - logo/title hold
  - 空白撞色过渡

因此新系统要处理的是“高级时间线模板”，不是简单 `style + storyboard`。

## 3. 总体设计

新增一条高级模板链路：

```txt
上传 demo 视频
  -> 本地预处理，抽帧/取元信息/可选音频分析
  -> 千问多模态解析
  -> QwenVideoAnalysis JSON
  -> normalize / validate
  -> AdvancedTemplateSpec
  -> 保存为用户模板
  -> DeepSeek 根据用户需求填充文案槽位
  -> KineticTextComposition 渲染
```

注意：千问只负责理解和生成结构化模板 JSON，不直接生成 Remotion 代码。

## 4. 新数据协议

### 4.1 高级模板

```ts
type AdvancedTemplateSpec = {
  id: string;
  name: string;
  description: string;
  source: "preset" | "user" | "qwen-video";
  durationSec: number;
  fps: number;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "custom";
  style: AdvancedTemplateStyle;
  slots: TemplateSlot[];
  beatMarkers: number[];
  flashCuts: number[];
  audio?: TemplateAudioSpec;
};
```

### 4.2 镜头槽位

```ts
type TemplateSlot = {
  id: string;
  startSec: number;
  durationSec: number;
  sceneType: SceneType;
  textRole: "hook" | "keyword" | "point" | "brand" | "ending" | "filler";
  defaultText: string;
  maxChars?: number;
  layout: LayoutSpec;
  motion: MotionSpec;
  background: BackgroundSpec;
  transitionIn?: TransitionSpec;
  transitionOut?: TransitionSpec;
};
```

### 4.3 支持的 sceneType

第一阶段先支持这些类型：

```ts
type SceneType =
  | "intro-wipe"
  | "word-card"
  | "split-word"
  | "stomp-word"
  | "letter-scatter"
  | "outline-rows"
  | "logo-hold"
  | "blank-color"
  | "stacked-title";
```

后续再扩展：

```ts
type SceneType =
  | "text-tunnel"
  | "kinetic-paragraph"
  | "grid-repeat"
  | "mask-reveal"
  | "glitch-word"
  | "counter-title";
```

### 4.4 MotionSpec

```ts
type MotionSpec = {
  entrance:
    | "wipe"
    | "stomp"
    | "slide"
    | "scale"
    | "scatter"
    | "typewriter"
    | "none";
  emphasis?: Array<"jitter" | "flash" | "skew" | "clip-split" | "outline" | "repeat-rows">;
  camera?: {
    zoom?: number;
    panX?: number;
    panY?: number;
    rotate?: number;
  };
  easing?: "expo-out" | "linear" | "back-out" | "snap";
  intensity: number;
};
```

## 5. 千问解析输出

千问接口不再只输出：

```json
{
  "style": {
    "palette": "gold",
    "fontFamily": "hei"
  }
}
```

而是输出：

```json
{
  "name": "高燃文字快剪",
  "description": "强节奏纯文本混剪模板",
  "durationSec": 20.57,
  "fps": 25,
  "aspectRatio": "16:9",
  "style": {
    "palette": "custom",
    "colors": {
      "background": "#050505",
      "primary": "#f9f9f6",
      "accent": "#3bdf77",
      "secondary": "#ec004f"
    },
    "fontMood": "bold-condensed",
    "motionIntensity": 0.9
  },
  "beatMarkers": [0.48, 1.0, 1.52, 2.0],
  "flashCuts": [0.48, 1.0, 1.52],
  "slots": [
    {
      "id": "slot-1",
      "startSec": 0,
      "durationSec": 0.48,
      "sceneType": "intro-wipe",
      "textRole": "hook",
      "defaultText": "STYLISH",
      "motion": {
        "entrance": "wipe",
        "emphasis": ["flash"],
        "intensity": 0.8
      },
      "background": {
        "type": "solid",
        "colorRole": "background"
      },
      "transitionOut": {
        "type": "flash-cut"
      }
    }
  ]
}
```

## 6. 千问提示词策略

千问系统提示词要强调：

- 你是短视频模板拆解师，不是文案生成助手
- 不要只描述风格，要逐镜头拆解
- 所有 `sceneType` 必须从枚举里选择
- 识别开始时间、持续时间、切点、文字布局、转场、背景、运动方式
- 对无法精确判断的时间点允许估算，但必须保持顺序合理
- 输出 JSON，不要 Markdown

用户消息包含：

- demo 视频本身
- 视频元信息：时长、fps、分辨率
- 可选抽帧图
- 允许的 sceneType 和 motion 枚举
- 输出 JSON schema 摘要

## 7. 本地预处理

为了提高千问解析稳定性，上传 demo 后建议先做本地预处理。

第一阶段可做：

```txt
ffprobe 获取时长、fps、分辨率
ffmpeg 每 0.5 秒抽帧
ffmpeg 抽取 6 到 12 张关键帧
```

第二阶段可做：

```txt
默认复用原视频音频
检测画面差异，找切点
抽音频 envelope，估算 beat markers
将切点附近帧作为重点输入给千问
```

由于浏览器上传给 API route 的视频可能较大，需要限制：

- MVP：20MB 以内
- 后续：上传到对象存储，给千问传公网 URL

## 8. Remotion 渲染架构

新增：

```txt
remotion/KineticTextComposition.tsx
remotion/scenes/advanced/
  IntroWipeScene.tsx
  WordCardScene.tsx
  SplitWordScene.tsx
  StompWordScene.tsx
  LetterScatterScene.tsx
  OutlineRowsScene.tsx
  LogoHoldScene.tsx
  BlankColorScene.tsx
  StackedTitleScene.tsx
```

`KineticTextComposition` 接收：

```ts
type KineticTextCompositionProps = {
  template: AdvancedTemplateSpec;
  filledTexts: Record<string, string>;
};
```

渲染逻辑：

```txt
template.slots.map(slot)
  -> <Sequence from={slot.startSec * fps} duration={slot.durationSec * fps}>
       <SceneRenderer slot={slot} text={filledTexts[slot.id]} />
     </Sequence>
```

全局层：

- `AdvancedBackground`
- `FlashOverlay`
- `TemplateAudio`
- 可选 `SafeFrameGuides` 仅调试显示

## 9. DeepSeek 的角色变化

当前 DeepSeek 生成 `VideoPlan`。

高级模板链路中，DeepSeek 应该只做“槽位填充”：

输入：

```json
{
  "userPrompt": "做一个关于自律的高燃视频",
  "templateSlots": [
    {
      "id": "slot-1",
      "sceneType": "intro-wipe",
      "textRole": "hook",
      "maxChars": 8
    }
  ]
}
```

输出：

```json
{
  "filledTexts": {
    "slot-1": "立刻开始",
    "slot-2": "别再等了"
  }
}
```

这样可以保持复杂模板结构不被 LLM 改坏。

## 10. 模板管理 UI 变化

模板管理窗口新增高级解析结果预览：

```txt
上传 demo 视频
  -> 解析中
  -> 展示：
     模板名称
     时长 / fps / 比例
     镜头槽位数量
     动画类型分布
     beat markers 数量
     flash cuts 数量
  -> 用户可保存模板
```

不要让用户编辑所有高级字段，第一版只允许：

- 模板名称
- 描述
- 配色
- 字体
- 音乐
- 是否启用 flash cuts
- 是否保留解析出的节奏

高级 JSON 可放在“高级设置”折叠区。

## 11. 兼容现有系统

保留当前 `TextMixComposition`，不要直接替换。

模板分两类：

```ts
type TemplatePreset =
  | BasicTemplatePreset
  | AdvancedTemplatePreset;
```

基础模板继续走：

```txt
VideoPlan -> TextMixComposition
```

高级模板走：

```txt
AdvancedTemplateSpec + filledTexts -> KineticTextComposition
```

这样能逐步迁移，不破坏现有功能。

## 12. 分阶段实施

### 阶段 1：协议和内置高级模板

- 新增 `AdvancedTemplateSpec`
- 新增 `KineticTextComposition`
- 手工实现一个 `TextMixcut20` 风格内置模板
- 先不接千问，只验证 Remotion 效果

验收标准：

- 能渲染出接近 `纯文本混剪20s.mp4` 的强节奏纯文本视频
- 至少支持 6 类 sceneType
- 支持 flash cuts 和背景音乐

### 阶段 2：DeepSeek 槽位填充

- 给高级模板生成 slot summary
- DeepSeek 根据用户需求填充每个 slot 的文案
- 文案长度按 `maxChars` 控制

验收标准：

- 输入新主题后，高级模板能复用同一套动画结构
- 不会把结构改坏

### 阶段 3：千问解析 demo 视频

- 升级 `/api/analyze-template-video`
- 让千问输出 `AdvancedTemplateSpec`
- 增加 normalize 和 schema 校验
- 模板管理 UI 展示解析结果摘要

验收标准：

- 上传类似 `纯文本混剪20s.mp4` 的视频后，能识别出 8 到 15 个镜头槽位
- 能识别主要 sceneType
- 能识别切点和 flash cut

### 阶段 4：提高解析稳定性

- 加 ffmpeg 抽帧
- 加画面差异切点检测
- 加音频 envelope 估算 beat
- 把本地分析结果和视频一起传给千问

验收标准：

- 不同 demo 视频解析出来的镜头数量和时间点更稳定

## 13. 风险和约束

### 千问不一定能精确到帧

解决：

- 允许模型粗估
- 本地用画面差异和音频 envelope 辅助切点
- normalize 时把时间点吸附到合理帧

### 模型可能输出不支持的 sceneType

解决：

- 强制枚举
- normalize 时映射到最近支持类型
- 不支持的类型回退到 `word-card`

### demo 视频版权

解决：

- 产品文案明确：只提取节奏和结构，不复刻品牌、水印、商标


### 上传视频体积

解决：

- MVP 限制 20MB
- 后续对象存储 + 公网 URL

## 14. 最小可行下一步

下一轮真正落代码时，不建议一口气做完整千问解析链路。

推荐顺序：

1. 先手工实现 `AdvancedTemplateSpec` 和 `KineticTextComposition`
2. 手工内置一个 `TextMixcut20` 风格高级模板
3. 验证预览和导出效果
4. 再让 DeepSeek 填充 slot 文案
5. 最后升级千问 demo 视频解析

原因：如果没有稳定的高级 Remotion 渲染器，千问即使解析出结构，也没有地方可靠落地。
