import fs from "fs";
import path from "path";

const ROOT = path.join("data", "skills", "art_skills");
const style = {
  id: "3D_realistic_cartoon",
  template: "3D_anime_render",
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
    [/都市言情约束/g, "海外短剧约束"],
    [/都市言情/g, "海外短剧"],
  ],
};

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

const src = path.join(ROOT, style.template);
const dest = path.join(ROOT, style.id);
if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
copyDir(src, dest);
fs.writeFileSync(path.join(dest, "README.md"), style.readme.trim() + "\n", "utf-8");
fs.writeFileSync(path.join(dest, "prefix.md"), style.prefix.trim() + "\n", "utf-8");
walkFiles(dest, (file) => {
  if (file.endsWith("README.md") || file.endsWith("prefix.md")) return;
  let text = fs.readFileSync(file, "utf-8");
  for (const [re, rep] of style.replaceInFiles) text = text.replace(re, rep);
  fs.writeFileSync(file, text, "utf-8");
});
fs.mkdirSync(path.join(dest, "images"), { recursive: true });
fs.writeFileSync(
  path.join(dest, "art_prompt", "art_storyboard_video.md"),
  `# 视频提示词 · 视觉风格约束

生成视频提示词时，必须注入以下视觉风格标签：

| 模式 | 风格标签 |
|------|----------|
| **通用多参模式（英文）** | \`stylized realistic 3D, semi-realistic character, painterly 3D textures, cinematic rim light, depth of field, volumetric fog, teal orange grading\` |
| **通用首尾帧模式（英文）** | \`stylized realistic 3D render, Arcane style, cinematic camera move, shallow depth of field, epic atmosphere\` |
| **Seedance 2.0（中文）** | \`3D写实卡通，半写实角色，手绘感3D材质，电影级轮廓光，景深，体积雾，流媒体级构图\` |
`,
  "utf-8",
);
console.log("Created", style.id);
