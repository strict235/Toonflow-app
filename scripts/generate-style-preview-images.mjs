import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import axios from "axios";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";

const PROJECT_ROOT = process.cwd();
const PROJECT_SKILLS = path.join(PROJECT_ROOT, "data", "skills", "art_skills");
const USER_DATA_SKILLS = path.join(
  process.env.APPDATA || path.join(process.env.USERPROFILE, "AppData", "Roaming"),
  "toonflow",
  "data",
  "skills",
  "art_skills",
);

const MODEL = "gpt-image-2";
const BASE_URL = "https://aihubmix.com/v1";

const STYLE_PREVIEWS = [
  {
    id: "2D_korean_webtoon",
    images: [
      {
        file: "1.png",
        size: "1024x1536",
        prompt:
          "Korean webtoon manhwa style portrait of a stylish young woman, clean line art, soft gradient cel shading, glowing detailed eyes, glossy hair, emotional expression, vertical composition, modern international city fashion, no text, no watermark",
      },
      {
        file: "2.png",
        size: "1536x1024",
        prompt:
          "Korean webtoon manhwa style scene, modern cafe interior with large windows, soft romantic lighting, clean line art, gradient shading, cinematic composition, no characters, no text, no watermark",
      },
    ],
  },
  {
    id: "2D_western_graphic_novel",
    images: [
      {
        file: "1.png",
        size: "1024x1536",
        prompt:
          "Western graphic novel comic art portrait of a detective, bold ink outlines, limited color palette, halftone texture, chiaroscuro noir lighting, mature dramatic expression, no text, no watermark",
      },
      {
        file: "2.png",
        size: "1536x1024",
        prompt:
          "Western graphic novel rainy alley at night, bold ink lines, limited palette, high contrast shadows, neon reflections, cinematic noir composition, no text, no watermark",
      },
    ],
  },
  {
    id: "2D_modern_seinen_anime",
    images: [
      {
        file: "1.png",
        size: "1024x1536",
        prompt:
          "Modern seinen anime portrait, sharp lineart, desaturated cinematic colors, intense eyes, dynamic low angle, film grain, MAPPA style, urban youth, no text, no watermark",
      },
      {
        file: "2.png",
        size: "1536x1024",
        prompt:
          "Modern seinen anime rooftop at night, city skyline, desaturated teal orange grading, dramatic clouds, cinematic wide shot, sharp anime rendering, no text, no watermark",
      },
    ],
  },
  {
    id: "2D_cyberpunk_neonoir",
    images: [
      {
        file: "1.png",
        size: "1024x1536",
        prompt:
          "Cyberpunk neo-noir portrait, neon cyan and magenta rim light, cybernetic details, rain droplets on skin, dystopian fashion, high contrast sci-fi, no text, no watermark",
      },
      {
        file: "2.png",
        size: "1536x1024",
        prompt:
          "Cyberpunk neo-noir city street at night, rain soaked asphalt reflections, holographic billboards, smoke and volumetric neon light, cinematic sci-fi, no text, no watermark",
      },
    ],
  },
  {
    id: "2D_gothic_romance_western",
    images: [
      {
        file: "1.png",
        size: "1024x1536",
        prompt:
          "Western gothic romance portrait of handsome man in black suit, dramatic rim light, half face in shadow, intense gaze, luxury dark romantic mood, vertical composition, no text, no watermark",
      },
      {
        file: "2.png",
        size: "1536x1024",
        prompt:
          "Gothic romance luxury mansion hall, candlelight, velvet curtains, stormy window, dark crimson and gold palette, moody cinematic atmosphere, no text, no watermark",
      },
    ],
  },
  {
    id: "3D_pixar_stylized",
    images: [
      {
        file: "1.png",
        size: "1024x1536",
        prompt:
          "Pixar Disney stylized 3D friendly animated animal character portrait, big expressive eyes, soft subsurface scattering, vibrant friendly colors, family friendly, clean studio background, no text, no watermark",
      },
      {
        file: "2.png",
        size: "1536x1024",
        prompt:
          "Pixar style stylized 3D colorful town street, soft global illumination, playful architecture, warm sunlight, family friendly adventure mood, no text, no watermark",
      },
    ],
  },
  {
    id: "3D_realistic_cartoon",
    images: [
      {
        file: "1.png",
        size: "1024x1536",
        prompt:
          "Stylized realistic 3D character portrait like Arcane, semi-realistic face proportions, painterly 3D textures, cinematic rim light, depth of field, global streaming aesthetic, no text, no watermark",
      },
      {
        file: "2.png",
        size: "1536x1024",
        prompt:
          "Stylized realistic 3D cinematic city scene, painterly shaders, volumetric fog, teal orange movie lighting, epic atmosphere, semi-realistic environment, no text, no watermark",
      },
    ],
  },
];

function readWindowsSystemProxy() {
  try {
    const out = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable',
      { encoding: "utf8" },
    );
    if (!/0x1/.test(out)) return undefined;
    const serverOut = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer',
      { encoding: "utf8" },
    );
    const match = serverOut.match(/ProxyServer\s+REG_SZ\s+(.+)/i);
    const server = match?.[1]?.trim();
    if (!server) return undefined;
    if (server.includes("=")) {
      const httpsPart = server
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.toLowerCase().startsWith("https="));
      const host = (httpsPart || server.split(";")[0]).split("=")[1];
      return host.includes("://") ? host : `http://${host}`;
    }
    return server.includes("://") ? server : `http://${server}`;
  } catch {
    return undefined;
  }
}

function createClient() {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    readWindowsSystemProxy();
  if (proxyUrl) {
    console.log(`Using proxy: ${proxyUrl}`);
    return axios.create({
      httpAgent: new HttpProxyAgent(proxyUrl),
      httpsAgent: new HttpsProxyAgent(proxyUrl),
      proxy: false,
      timeout: 180000,
    });
  }
  return axios.create({ timeout: 180000 });
}

function loadApiKey() {
  if (process.env.AIHUBMIX_API_KEY) return process.env.AIHUBMIX_API_KEY;
  const dbPath = path.join(process.env.APPDATA || "", "toonflow", "data", "db2.sqlite");
  if (!fs.existsSync(dbPath)) throw new Error(`Database not found: ${dbPath}`);
  const raw = execSync(`sqlite3 "${dbPath}" "SELECT inputValues FROM o_vendorConfig WHERE id='aihubmix' AND enable=1;"`, {
    encoding: "utf8",
  }).trim();
  if (!raw) throw new Error("AIHubMix vendor not configured or disabled");
  const parsed = JSON.parse(raw);
  if (!parsed.apiKey) throw new Error("AIHubMix apiKey missing");
  return parsed.apiKey;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function saveImage(base64Data, ...targets) {
  const raw = base64Data.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(raw, "base64");
  for (const target of targets) {
    ensureDir(path.dirname(target));
    fs.writeFileSync(target, buffer);
  }
}

async function generateImage(client, apiKey, { prompt, size }) {
  const response = await client.post(
    `${BASE_URL}/images/generations`,
    {
      model: MODEL,
      prompt,
      n: 1,
      size,
      quality: "auto",
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const item = response.data?.data?.[0];
  if (item?.b64_json) return item.b64_json;
  if (item?.url) {
    const img = await client.get(item.url, { responseType: "arraybuffer" });
    return Buffer.from(img.data).toString("base64");
  }
  const msg = response.data?.error?.message || JSON.stringify(response.data);
  throw new Error(msg);
}

async function main() {
  const apiKey = loadApiKey();
  const client = createClient();
  const force = process.argv.includes("--force");

  for (const style of STYLE_PREVIEWS) {
    for (const image of style.images) {
      const projectPath = path.join(PROJECT_SKILLS, style.id, "images", image.file);
      const userDataPath = path.join(USER_DATA_SKILLS, style.id, "images", image.file);
      if (!force && fs.existsSync(projectPath) && fs.statSync(projectPath).size > 10000) {
        console.log(`Skip existing: ${style.id}/${image.file}`);
        ensureDir(path.dirname(userDataPath));
        fs.copyFileSync(projectPath, userDataPath);
        continue;
      }

      console.log(`Generating ${style.id}/${image.file} ...`);
      try {
        const b64 = await generateImage(client, apiKey, image);
        saveImage(b64, projectPath, userDataPath);
        console.log(`Saved ${style.id}/${image.file}`);
      } catch (err) {
        const detail = err?.response?.data?.error?.message || err.message;
        console.error(`Failed ${style.id}/${image.file}: ${detail}`);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
