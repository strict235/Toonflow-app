import fs from "fs";
import path from "path";

const ROOT = path.join("data", "skills", "art_skills");
const TEMPLATE_2D = "2D_mature_urban_romance";
const TEMPLATE_3D = "3D_anime_render";

const styles = [
  {
    id: "2D_korean_webtoon",
    template: TEMPLATE_2D,
    displayName: "韩式网漫 Webtoon",
    readme: `# 韩式网漫 Webtoon 风格说明

本风格面向全球短剧/竖屏漫剧，对标 Naver Webtoon、Kakao、Lookism / Solo Leveling 等韩式网漫美学。

## 核心特征
- 清晰线稿 + 柔和渐变上色，人物比例修长（8-9头身）
- 高光眼神、柔肤质感、情绪表情夸张但精致
- 都市/校园/奇幻现代世界观，偏东亚面孔也可国际化
- 竖屏 9:16 友好，背景简化、主体突出

## 适用场景
- 海外竖屏短剧、恋爱/逆袭/霸总/奇幻网漫改编
- TikTok / Reels / YouTube Shorts 向内容

## 严禁
- 低幼Q版、粗糙草图感、写实照片风、中式古风元素
`,
    prefix: `# 全局美学基础 · 韩式网漫 Webtoon

---
必须严格、完整遵循下方全部风格约束与全局规则，并严格按提示词模板格式生成提示词；仅输出提示词正文，不得附加任何解释、说明、注释、标题或其他额外文本。

## 一、风格基因

| 维度 | 定义 |
|---|---|
| **一级风格** | Korean Webtoon / Manhwa — 韩式竖屏网漫 |
| **二级风格** | 精致线稿 · 柔光渐变 · 情绪驱动构图 |
| **情感基调** | 高张力浪漫 · 逆袭爽感 · 青春或都市戏剧 |
| **质感锚词** | clean line art, soft cel shading, glowing eyes, glossy hair, vertical composition |

## 二、人物与比例
- 头身比 8-9 头身，肩窄腰细，四肢修长
- 眼睛偏大、高光多层、睫毛清晰；肤色通透偏暖或冷白
- 发型块面清晰、发色饱和、发丝带光泽
- 表情可适度夸张（网漫式 shock/blush/sparkle eyes）

## 三、色彩与光影
- 主色饱和但不过曝，背景降饱和突出人物
- 柔光侧光 + 轻微 bloom，拒绝硬黑死影
- 浪漫场景：粉紫/暖金；冲突场景：冷蓝/深紫对比

## 四、场景世界观
- 现代都市：公寓、咖啡厅、学校、办公室、霓虹街景（可欧美/东亚混合）
- 允许轻奇幻现代设定（系统面板、魔法学院现代版）
- 严禁中国古风、汉服、仙侠；严禁纯日式90年代赛璐璐粗颗粒

## 五、全局约束（必守）
| 编号 | 规则 |
|---|---|
| W1 | 必须声明 \`Korean webtoon style, manhwa, vertical scroll composition\` |
| W2 | 必须 \`clean line art, soft gradient shading, detailed eyes with highlights\` |
| W3 | 必须指定情绪与镜头（close-up / medium / low angle） |
| W4 | 英文关键词与中文描述可混用，但以画面可执行性为准 |

## 六、严禁项
- 严禁 photorealistic / 3D render / flat vector icon style
- 严禁 gore, explicit content, hate symbols
- 严禁 watermark, text overlay, UI mockup unless story needs
`,
    replaceInFiles: [
      [/成熟都市言情动画/g, "韩式网漫 Webtoon"],
      [/成熟都市言情/g, "韩式网漫"],
      [/现代都市/g, "现代都市（国际化）"],
      [/赛璐璐/g, "网漫柔光渐变"],
      [/二次元动画风格/g, "韩式网漫风格"],
    ],
  },
  {
    id: "2D_western_graphic_novel",
    template: TEMPLATE_2D,
    displayName: "欧美图像小说 Graphic Novel",
    readme: `# 欧美图像小说 Graphic Novel 风格说明

对标《Arcane》《蜘蛛侠：平行宇宙》Ink 美学、Image/DC 独立漫画、欧美 YA 图像小说。

## 核心特征
- 粗粝 ink 线、有限色板、高对比光影
- 电影级构图，偏欧美面孔与西方都市/奇幻
- 适合悬疑、科幻、超英、黑色电影叙事

## 适用场景
- 欧美市场漫剧、悬疑/超英/科幻短剧

## 严禁
- 日式萌系、韩式美颜网漫、中国古风
`,
    prefix: `# 全局美学基础 · 欧美图像小说 Graphic Novel

---
必须严格、完整遵循下方全部风格约束与全局规则，并严格按提示词模板格式生成提示词；仅输出提示词正文，不得附加任何解释、说明、注释、标题或其他额外文本。

## 一、风格基因

| 维度 | 定义 |
|---|---|
| **一级风格** | Western Graphic Novel / Comic Art |
| **二级风格** | Bold ink lines · Limited palette · Cinematic noir lighting |
| **情感基调** | Gritty · Dramatic · Mature storytelling |
| **质感锚词** | heavy ink outlines, halftone texture, chiaroscuro, graphic novel panel |

## 二、视觉语法
- 线稿：粗细变化明显，外轮廓加重，内部排线/网点可选
- 上色：有限色板（3-5主色），大色块，避免塑料渐变
- 光影：强明暗对比，侧光/顶光/霓虹轮廓光
- 构图：电影宽银幕感，可 2.39:1 或 16:9

## 三、人物
- 欧美/多元族裔面孔，结构写实偏 stylized
- 体型多样，拒绝单一网红脸
- 服装：现代西方街头、战术、商务、奇幻装甲

## 四、场景
- 纽约/伦敦/洛杉矶式都市、仓库、地铁、雨夜 alley
- 科幻：赛博街区、实验室、废土（非东方修仙）

## 五、必守约束
| 编号 | 规则 |
|---|---|
| G1 | 必须含 \`western graphic novel style, bold ink lines, limited color palette\` |
| G2 | 必须 \`cinematic lighting, high contrast shadows\` |
| G3 | 禁止 kawaii / anime sparkle eyes / pastel webtoon skin |

## 六、严禁项
- 严禁 photorealistic photo, 3D Pixar, chibi
- 严禁 中国古风、日式校服萌系
`,
    replaceInFiles: [
      [/成熟都市言情动画/g, "欧美图像小说"],
      [/成熟都市言情/g, "欧美图像小说"],
      [/赛璐璐/g, "网点/Ink"],
      [/二次元动画风格/g, "欧美漫画风格"],
    ],
  },
  {
    id: "2D_modern_seinen_anime",
    template: TEMPLATE_2D,
    displayName: "现代青年向动画 Seinen",
    readme: `# 现代青年向动画 Seinen 风格说明

对标《咒术回战》《链锯人》《电锯人》式现代 dark anime，全球流媒体热门美学。

## 核心特征
- 锐利线稿、低饱和电影调色、动态透视
- 青年/成人向动作、悬疑、黑暗浪漫
- 国际化现代都市 + 轻超自然

## 适用场景
- 海外动作/黑暗浪漫/超自然短剧

## 严禁
- 低幼萌系、Bright pastel slice-of-life only
`,
    prefix: `# 全局美学基础 · 现代青年向动画 Seinen

---
必须严格、完整遵循下方全部风格约束与全局规则，并严格按提示词模板格式生成提示词；仅输出提示词正文，不得附加任何解释、说明、注释、标题或其他额外文本。

## 一、风格基因

| 维度 | 定义 |
|---|---|
| **一级风格** | Modern Seinen Anime — 2020s global streaming aesthetic |
| **二级风格** | Sharp linework · Desaturated cinematic color · Dynamic angles |
| **情感基调** | Intense · Melancholic · Action-driven |
| **质感锚词** | modern anime, MAPPA style, film grain, dramatic perspective, muted palette |

## 二、视觉规则
- 线稿清晰偏细，阴影用硬边 cel + 少量喷溅纹理
- 调色：低饱和、青橙/青紫电影感，高光克制
- 镜头：广角畸变、低角度、速度线、冲击帧
- 特效：咒力/能量/粒子可抽象化，避免过度Glow

## 三、人物
- 7-8头身，青年面孔，表情可极端
- 现代国际都市服装：连帽衫、制服、战术风
- 伤痕、汗水、脏污允许出现

## 四、场景
- 国际都市夜景、废弃建筑、学校、天台
- 超自然：暗色领域、裂隙、极简符号化背景

## 五、必守
| 编号 | 规则 |
|---|---|
| S1 | 必须 \`modern seinen anime, cinematic composition, desaturated colors\` |
| S2 | 必须 \`sharp anime lineart, dramatic lighting\` |
| S3 | 禁止 chibi, moe sparkle, pastel shoujo only |

## 六、严禁
- 严禁 photorealistic, 3D game render
- 严禁 中国古风仙侠
`,
    replaceInFiles: [
      [/成熟都市言情动画/g, "现代青年向动画"],
      [/成熟都市言情/g, "青年向动画"],
      [/赛璐璐/g, "现代硬边赛璐璐"],
      [/二次元动画风格/g, "现代日系动画风格"],
    ],
  },
  {
    id: "2D_cyberpunk_neonoir",
    template: TEMPLATE_2D,
    displayName: "赛博朋克 Neo-Noir",
    readme: `# 赛博朋克 Neo-Noir 风格说明

对标《赛博朋克：边缘行者》《银翼杀手2049》动画化美学，欧美科幻短剧热门风格。

## 核心特征
- 霓虹青紫/品红、雨夜反射、烟雾体积光
- 高科技低生活、义体、全息广告
- 16:9 电影宽屏或 9:16 竖屏霓虹人像

## 适用场景
- 海外科幻/悬疑/复仇赛博短剧

## 严禁
- 古代/田园/明亮童话风
`,
    prefix: `# 全局美学基础 · 赛博朋克 Neo-Noir

---
必须严格、完整遵循下方全部风格约束与全局规则，并严格按提示词模板格式生成提示词；仅输出提示词正文，不得附加任何解释、说明、注释、标题或其他额外文本。

## 一、风格基因

| 维度 | 定义 |
|---|---|
| **一级风格** | Cyberpunk Neo-Noir |
| **二级风格** | Neon noir · Rain-soaked streets · Holographic ads |
| **情感基调** | Dystopian · Lonely · High-tech low-life |
| **质感锚词** | neon lights, wet asphalt reflections, cyan and magenta, smoke, cybernetic implants |

## 二、色彩
- 主色：电青 #00F0FF、品红 #FF007A、深紫黑背景
- 肤色在霓虹下偏冷，轮廓光强烈
- 禁止大面积纯白天场景（除非叙事对比）

## 三、场景元素
- 雨夜街道、高架桥、唐人街霓虹（国际都市）、地下酒吧
- 全息 billboard、无人机、义体发光接口
- 室内：服务器房、黑客工作台、玻璃幕墙

## 四、人物
- 多元族裔，朋克/战术/未来街头服饰
- 允许义眼、机械臂、发光纹身

## 五、必守
| 编号 | 规则 |
|---|---|
| C1 | 必须 \`cyberpunk neo-noir, neon lighting, rain reflections\` |
| C2 | 必须 \`night scene, high contrast, cinematic sci-fi\` |
| C3 | 禁止 fantasy medieval, pastoral, bright slice-of-life |

## 六、严禁
- 严禁 中国古风、仙侠、蒸汽朋克维多利亚（除非混合赛博）
`,
    replaceInFiles: [
      [/成熟都市言情动画/g, "赛博朋克 Neo-Noir"],
      [/成熟都市言情/g, "赛博朋克"],
      [/现代都市/g, "赛博朋克都市"],
      [/赛璐璐/g, "霓虹赛璐璐"],
    ],
  },
  {
    id: "2D_gothic_romance_western",
    template: TEMPLATE_2D,
    displayName: "欧美哥特浪漫 Gothic Romance",
    readme: `# 欧美哥特浪漫 Gothic Romance 风格说明

对标 ReelShort / DramaBox 海外霸总、吸血鬼、黑暗浪漫竖屏短剧美学。

## 核心特征
- 暗调浪漫、强轮廓光、奢华室内/古堡现代混合
- idealized 欧美面孔、戏剧化妆容与服饰
- 9:16 竖屏人像构图，背景虚化

## 适用场景
- 海外 dark romance、 billionaire、 vampire、 werewolf 短剧

## 严禁
- 明亮儿童向、中式古风言情
`,
    prefix: `# 全局美学基础 · 欧美哥特浪漫 Gothic Romance

---
必须严格、完整遵循下方全部风格约束与全局规则，并严格按提示词模板格式生成提示词；仅输出提示词正文，不得附加任何解释、说明、注释、标题或其他额外文本。

## 一、风格基因

| 维度 | 定义 |
|---|---|
| **一级风格** | Western Gothic Romance — vertical short drama aesthetic |
| **二级风格** | Dark romantic · Luxury · Moody chiaroscuro |
| **情感基调** | Obsessive love · Power · Mystery |
| **质感锚词** | dramatic rim light, velvet textures, candlelight, stormy windows, pale skin, intense gaze |

## 二、视觉规则
- 调色：深红、黑、金、冷蓝月光；整体低明度
- 光：轮廓光/窗光/烛光，面部半明半暗
- 构图：竖屏半身/特写，浅景深，背景 bokeh
- 服饰：西装、晚礼服、斗篷、珠宝、哥特蕾丝

## 三、场景
- 现代豪宅、哥特式大厅、雨夜 balcony、图书馆
- 允许轻超自然符号（满月、玫瑰、十字架装饰）非恐怖血腥

## 四、人物
- 欧美 idealized 面孔，sharp jawline，dramatic eyes
- 年龄感成熟，禁止幼态

## 五、必守
| 编号 | 规则 |
|---|---|
| R1 | 必须 \`gothic romance, dark moody lighting, vertical portrait composition\` |
| R2 | 必须 \`luxury fashion, dramatic emotional expression\` |
| R3 | 禁止 bright pastel comedy, chibi, 中国古风

## 六、严禁
- 严禁 gore, horror monster, explicit sexual content
`,
    replaceInFiles: [
      [/成熟都市言情动画/g, "欧美哥特浪漫"],
      [/成熟都市言情/g, "哥特浪漫"],
      [/现代都市/g, "欧美都市"],
      [/赛璐璐/g, "暗调精致上色"],
    ],
  },
  {
    id: "3D_pixar_stylized",
    template: TEMPLATE_3D,
    displayName: "皮克斯风 3D Pixar",
    readme: `# 皮克斯风 3D Pixar 风格说明

对标 Pixar / Disney stylized 3D，全球家庭与轻喜剧短剧市场。

## 核心特征
- Stylized 3D，大眼睛、简化五官、柔和皮肤 SSS
- 饱和友好色彩、清晰轮廓、物理卡通化
- 国际化角色与场景

## 适用场景
- 海外全年龄、喜剧、冒险、温馨浪漫轻喜剧

## 严禁
- 恐怖写实、低模游戏感、日式2D
`,
    prefix: `# 全局美学基础 · 皮克斯风 3D Pixar

---
必须严格、完整遵循下方全部风格约束与全局规则，并严格按提示词模板格式生成提示词；仅输出提示词正文，不得附加任何解释、说明、注释、标题或其他额外文本。

## 一、风格基因

| 维度 | 定义 |
|---|---|
| **一级风格** | Pixar / Disney Stylized 3D |
| **二级风格** | Soft subsurface skin · Expressive eyes · Clean shapes |
| **情感基调** | Warm · Playful · Heartfelt |
| **质感锚词** | stylized 3D character, Pixar style, soft lighting, vibrant colors, subsurface scattering |

## 二、建模与材质
- 比例：头略大、眼大、手脚 stylized
- 皮肤：SSS 柔光，无真实毛孔
- 毛发：块状 clump 但精致
- 场景：简化几何 + 高质量贴图，饱和色

## 三、光影
- 三点布光为主，全局 illumination 柔和
- 拒绝 noir 极端对比（除非叙事需要）

## 四、必守
| 编号 | 规则 |
|---|---|
| P1 | 必须 \`Pixar style 3D render, stylized character, soft global illumination\` |
| P2 | 必须 \`family-friendly, vibrant color palette\` |
| P3 | 禁止 photorealistic human, anime 2D, horror gore |

## 五、严禁
- 严禁 uncanny realistic skin, low-poly game asset
- 严禁 中国古风、日式2D赛璐璐
`,
    replaceInFiles: [
      [/3D动漫渲染/g, "皮克斯风3D"],
      [/3D渲染/g, "皮克斯风3D渲染"],
      [/次世代/g, "风格化3D"],
    ],
  },
  {
    id: "3D_realistic_cartoon",
    template: TEMPLATE_3D,
    displayName: "3D写实卡通 Stylized Realistic",
    readme: `# 3D写实卡通 Stylized Realistic 风格说明

对标 Arcane、Fortnite 过场、HoYoverse cinematic 等海外热门「写实比例 + 卡通渲染」3D 美学。

## 核心特征
- 写实人体比例与面部结构，但保留 stylized 3D 材质与灯光
- 皮肤次表面散射 + 适度卡通轮廓，非照片级真人
- 电影级布光、景深、体积雾，适合动作/科幻/浪漫短剧

## 适用场景
- 海外 3D 漫剧、游戏风短剧、科幻/奇幻/恋爱

## 严禁
- 纯 Pixar Q版、2D 赛璐璐、照片级写实真人
`,
    prefix: `# 全局美学基础 · 3D写实卡通 Stylized Realistic

---
必须严格、完整遵循下方全部风格约束与全局规则，并严格按提示词模板格式生成提示词；仅输出提示词正文，不得附加任何解释、说明、注释、标题或其他额外文本。

## 一、风格基因

| 维度 | 定义 |
|---|---|
| **一级风格** | Stylized Realistic 3D — Arcane / cinematic game trailer aesthetic |
| **二级风格** | Realistic proportions · Painterly 3D shaders · Cinematic lighting |
| **情感基调** | Epic · Emotional · Modern global streaming |
| **质感锚词** | stylized realistic 3D, semi-realistic character, painterly textures, cinematic rim light, depth of field |

## 二、建模与材质
- 比例接近真人（7.5-8头身），五官结构写实但略 stylized
- 皮肤 SSS + 手绘感贴图边缘，非毛孔级写实
- 服装布料物理感 + 适度简化
- 场景：高精度环境 + 电影级雾与光斑

## 三、光影
- 三点布光 + 体积光 + 轮廓光
- 青橙/青紫电影调色常见
- 允许 lens flare、bokeh、motion blur 描述

## 四、必守
| 编号 | 规则 |
|---|---|
| R1 | 必须 \`stylized realistic 3D render, semi-realistic character, cinematic lighting\` |
| R2 | 必须 \`painterly 3D textures, depth of field\` |
| R3 | 禁止 chibi Pixar cute, flat 2D anime, photorealistic photograph |

## 五、严禁
- 严禁 uncanny hyper-realistic photo human
- 严禁 中国古风、低模手游廉价感
`,
    replaceInFiles: [
      [/3D动漫渲染/g, "3D写实卡通"],
      [/3D渲染/g, "3D写实卡通渲染"],
      [/次世代/g, "电影级风格化3D"],
    ],
  },
];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function walkFiles(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(p, cb);
    else if (entry.name.endsWith(".md")) cb(p);
  }
}

for (const style of styles) {
  const src = path.join(ROOT, style.template);
  const dest = path.join(ROOT, style.id);
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  copyDir(src, dest);

  fs.writeFileSync(path.join(dest, "README.md"), style.readme.trim() + "\n", "utf-8");
  fs.writeFileSync(path.join(dest, "prefix.md"), style.prefix.trim() + "\n", "utf-8");

  walkFiles(dest, (file) => {
    if (file.endsWith("README.md") || file.endsWith("prefix.md")) return;
    let text = fs.readFileSync(file, "utf-8");
    for (const [re, rep] of style.replaceInFiles) {
      text = text.replace(re, rep);
    }
    fs.writeFileSync(file, text, "utf-8");
  });

  const imagesDir = path.join(dest, "images");
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  console.log("Created:", style.id, "—", style.displayName);
}

console.log("Done. Added", styles.length, "overseas art styles.");
