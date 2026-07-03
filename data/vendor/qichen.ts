/**
 * Toonflow AI供应商 - 七辰 API
 * @version 2.1
 *
 * 文档：https://api.qichen001.asia/docs
 * 视频：POST /v1/videos，轮询 GET /v1/videos/{id}
 */

// ============================================================
// 类型定义
// ============================================================

type VideoMode =
  | "singleImage"
  | "startEndRequired"
  | "endFrameOptional"
  | "startFrameOptional"
  | "text"
  | (`videoReference:${number}` | `imageReference:${number}` | `audioReference:${number}`)[];

interface TextModel {
  name: string;
  modelName: string;
  type: "text";
  think: boolean;
}

interface ImageModel {
  name: string;
  modelName: string;
  type: "image";
  mode: ("text" | "singleImage" | "multiReference")[];
  associationSkills?: string;
}

interface VideoModel {
  name: string;
  modelName: string;
  type: "video";
  mode: VideoMode[];
  associationSkills?: string;
  audio: "optional" | false | true;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
}

interface TTSModel {
  name: string;
  modelName: string;
  type: "tts";
  voices: { title: string; voice: string }[];
}

interface VendorConfig {
  id: string;
  version: string;
  name: string;
  author: string;
  description?: string;
  icon?: string;
  inputs: { key: string; label: string; type: "text" | "password" | "url"; required: boolean; placeholder?: string }[];
  inputValues: Record<string, string>;
  models: (TextModel | ImageModel | VideoModel | TTSModel)[];
}

type ReferenceList =
  | { type: "image"; sourceType: "base64"; base64: string }
  | { type: "audio"; sourceType: "base64"; base64: string }
  | { type: "video"; sourceType: "base64"; base64: string };

interface ImageConfig {
  prompt: string;
  referenceList?: Extract<ReferenceList, { type: "image" }>[];
  imageBase64?: string[];
  size: "1K" | "2K" | "4K";
  aspectRatio: `${number}:${number}`;
}

interface VideoConfig {
  duration: number;
  resolution: string;
  aspectRatio: "16:9" | "9:16";
  prompt: string;
  referenceList?: ReferenceList[];
  audio?: boolean;
  mode: VideoMode[];
}

interface TTSConfig {
  text: string;
  voice: string;
  speechRate: number;
  pitchRate: number;
  volume: number;
  referenceList?: Extract<ReferenceList, { type: "audio" }>[];
}

interface PollResult {
  completed: boolean;
  data?: string;
  error?: string;
}

// ============================================================
// 全局声明
// ============================================================

declare const axios: any;
declare const logger: (msg: string) => void;
declare const FormData: any;
declare const zipImage: (base64: string, size: number) => Promise<string>;
declare const urlToBase64: (url: string) => Promise<string>;
declare const pollTask: (fn: () => Promise<PollResult>, interval?: number, timeout?: number) => Promise<PollResult>;
declare const crypto: any;
declare const exports: {
  vendor: VendorConfig;
  textRequest: (m: TextModel, t: boolean, tl: 0 | 1 | 2 | 3) => any;
  imageRequest: (c: ImageConfig, m: ImageModel) => Promise<string>;
  videoRequest: (c: VideoConfig, m: VideoModel) => Promise<string>;
  ttsRequest: (c: TTSConfig, m: TTSModel) => Promise<string>;
  checkForUpdates?: () => Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }>;
  updateVendor?: () => Promise<string>;
};

// ============================================================
// 供应商配置
// ============================================================

const SD2_DURATION = 15;

const vendor: VendorConfig = {
  id: "qichen",
  version: "2.1",
  author: "Toonflow",
  name: "七辰 API",
  description:
    "七辰 API 聚合平台，支持 Seedance 2.0（sd2）视频生成。\n\n[文档](https://api.qichen001.asia/docs) | [控制台](https://api.qichen001.asia)\n\nsd2 固定 15 秒；参考图/视频/音频需公网可访问链接，本地素材将自动上传临时图床后提交。",
  inputs: [
    { key: "apiKey", label: "API密钥", type: "password", required: true, placeholder: "sk-..." },
    {
      key: "baseUrl",
      label: "请求地址",
      type: "url",
      required: true,
      placeholder: "以 v1 结束，示例：https://api.qichen001.asia/v1",
    },
  ],
  inputValues: {
    apiKey: "",
    baseUrl: "https://api.qichen001.asia/v1",
  },
  models: [
    {
      name: "Seedance 2.0 (SD2)",
      modelName: "sd2",
      type: "video",
      mode: ["text", ["imageReference:9", "videoReference:3", "audioReference:3"]],
      audio: false,
      durationResolutionMap: [{ duration: [SD2_DURATION], resolution: ["720p"] }],
    },
  ],
};

// ============================================================
// 辅助工具
// ============================================================

const getBaseUrl = () => vendor.inputValues.baseUrl.replace(/\/+$/, "");

const getApiKey = () => {
  if (!vendor.inputValues.apiKey) throw new Error("缺少 API Key");
  return vendor.inputValues.apiKey.replace(/^Bearer\s+/i, "");
};

const getAuthHeaders = () => ({
  Authorization: `Bearer ${getApiKey()}`,
  "Content-Type": "application/json",
});

const getAxiosConfig = (headers?: Record<string, string>) => ({
  headers: headers ?? getAuthHeaders(),
  timeout: 600000,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

const decodeBase64 = (base64: string): { buffer: any; mime: string; ext: string } => {
  const matched = base64.match(/^data:([^;]+);base64,(.+)$/);
  const mime = matched?.[1] || "application/octet-stream";
  const raw = matched?.[2] || base64.replace(/^data:[^;]+;base64,/, "");
  const extMap: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
  };
  return { buffer: Buffer.from(raw, "base64"), mime, ext: extMap[mime] || "bin" };
};

const isPublicUrl = (value: string) => /^https?:\/\//i.test(value);

const uploadToTempHost = async (source: string, kind: "image" | "video" | "audio"): Promise<string> => {
  let payload = source;
  if (kind === "image" && !isPublicUrl(source)) {
    payload = await zipImage(source, 8 * 1024 * 1024);
  }
  const { buffer, mime, ext } = decodeBase64(payload);
  const form = new FormData();
  form.append("file", buffer, { filename: `qichen-ref-${crypto.randomBytes(6).toString("hex")}.${ext}`, contentType: mime });
  const resp = await axios.post("https://tmpfiles.org/api/v1/upload", form, {
    headers: form.getHeaders(),
    timeout: 180000,
  });
  const pageUrl: string = resp.data?.data?.url || resp.data?.url || "";
  if (!pageUrl) throw new Error("参考素材上传临时图床失败");
  const idMatch = pageUrl.match(/tmpfiles\.org\/(\d+)/i);
  if (idMatch) return `https://tmpfiles.org/dl/${idMatch[1]}`;
  return pageUrl.replace(/^http:\/\//i, "https://");
};

const ensurePublicUrl = async (source: string, kind: "image" | "video" | "audio"): Promise<string> => {
  if (isPublicUrl(source)) return source;
  const url = await uploadToTempHost(source, kind);
  logger(`[七辰] 参考${kind}已上传：${url}`);
  return url;
};

const parseLimit = (mode: VideoMode[], type: "image" | "video" | "audio", fallback: number): number => {
  const key = `${type}Reference`;
  for (const item of mode) {
    if (Array.isArray(item)) {
      for (const token of item) {
        const m = token.match(new RegExp(`^${key}:(\\d+)$`));
        if (m) return Number(m[1]);
      }
    }
  }
  return fallback;
};

const collectReferenceUrls = async (config: VideoConfig): Promise<{ images: string[]; videos: string[]; audios: string[] }> => {
  const refs = config.referenceList || [];
  const mode = config.mode;
  const imageLimit = parseLimit(Array.isArray(mode) ? mode : [mode], "image", 9);
  const videoLimit = parseLimit(Array.isArray(mode) ? mode : [mode], "video", 3);
  const audioLimit = parseLimit(Array.isArray(mode) ? mode : [mode], "audio", 3);

  const images: string[] = [];
  const videos: string[] = [];
  const audios: string[] = [];

  if (typeof mode === "string") {
    switch (mode) {
      case "singleImage":
      case "startFrameOptional":
      case "endFrameOptional":
      case "startEndRequired": {
        const imageRefs = refs.filter((r) => r.type === "image").slice(0, imageLimit);
        for (const ref of imageRefs) images.push(await ensurePublicUrl(ref.base64, "image"));
        break;
      }
      default:
        break;
    }
    return { images, videos, audios };
  }

  for (const ref of refs) {
    if (ref.type === "image" && images.length < imageLimit) images.push(await ensurePublicUrl(ref.base64, "image"));
    if (ref.type === "video" && videos.length < videoLimit) videos.push(await ensurePublicUrl(ref.base64, "video"));
    if (ref.type === "audio" && audios.length < audioLimit) audios.push(await ensurePublicUrl(ref.base64, "audio"));
  }

  return { images, videos, audios };
};

const extractVideoUrl = (data: any): string | undefined => {
  return data?.url || data?.video_url || data?.metadata?.result_urls?.[0] || data?.metadata?.url;
};

const extractStatus = (data: any): string => {
  return String(data?.status || data?.state || data?.task_status || "").toLowerCase();
};

const isTransientNetworkError = (err: any): boolean => {
  const msg = err?.message || err?.code || "";
  return /ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|ECONNABORTED|socket disconnected|TLS|timeout|AggregateError/i.test(String(msg));
};

const requestWithRetry = async <T>(action: () => Promise<T>, label: string, retries = 5): Promise<T> => {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await action();
    } catch (err) {
      lastErr = err;
      if (!isTransientNetworkError(err) || i === retries - 1) break;
      logger(`[七辰] ${label} 网络异常，${3}s 后重试（${i + 1}/${retries}）：${err?.message || err}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw lastErr;
};
const formatRequestError = (err: any, action: string): Error => {
  const responseData = err?.response?.data;
  const apiMessage = responseData?.error?.message || responseData?.message;
  if (apiMessage) return new Error(`${action}：${apiMessage}`);
  if (responseData) return new Error(`${action}：${JSON.stringify(responseData)}`);
  return new Error(`${action}：${err?.message || "未知错误"}`);
};

const normalizeImageSize = (size: ImageConfig["size"], aspectRatio: ImageConfig["aspectRatio"]): string => {
  const table: Record<string, Record<string, string>> = {
    "1K": { "1:1": "1024x1024", "16:9": "1536x1024", "9:16": "1024x1536" },
    "2K": { "1:1": "2048x2048", "16:9": "2848x1600", "9:16": "1600x2848" },
    "4K": { "1:1": "4096x4096", "16:9": "3840x2160", "9:16": "2160x3840" },
  };
  return table[size]?.[aspectRatio] || "1024x1024";
};

const parseImageResponse = async (data: any): Promise<string> => {
  const items = data?.data;
  if (!Array.isArray(items) || items.length === 0) throw new Error("图片生成失败：未返回有效结果");
  for (const item of items) {
    if (item?.b64_json) return item.b64_json.startsWith("data:") ? item.b64_json : `data:image/png;base64,${item.b64_json}`;
    if (item?.url) return await urlToBase64(item.url);
  }
  throw new Error("图片生成失败：响应中无可用图片");
};

// ============================================================
// 适配器函数
// ============================================================

const textRequest = (_model: TextModel, _think: boolean, _thinkLevel: 0 | 1 | 2 | 3) => {
  throw new Error("七辰 API 当前供应商未配置文本模型");
};

const imageRequest = async (_config: ImageConfig, _model: ImageModel): Promise<string> => {
  throw new Error("七辰 API 请使用 sd2 视频模型；图片生成可在控制台单独配置 gpt-image-2");
};

const videoRequest = async (config: VideoConfig, model: VideoModel): Promise<string> => {
  if (model.modelName !== "sd2") throw new Error(`不支持的模型：${model.modelName}`);

  const duration = SD2_DURATION;
  const aspectRatio = config.aspectRatio === "9:16" ? "9:16" : "16:9";
  const body: Record<string, any> = {
    model: "sd2",
    prompt: config.prompt,
    duration,
    aspect_ratio: aspectRatio,
  };

  const refs = await collectReferenceUrls(config);
  if (refs.images.length > 0) {
    body.images = refs.images;
    body.Ingredients_images = refs.images;
  }
  if (refs.videos.length > 0) body.videos = refs.videos;
  if (refs.audios.length > 0) body.audios = refs.audios;

  logger(
    `[七辰] 提交 sd2 视频任务，时长 ${duration}s，比例 ${aspectRatio}，参考图 ${refs.images.length}，参考视频 ${refs.videos.length}，参考音频 ${refs.audios.length}`,
  );

  let submitData: any;
  try {
    const resp = await requestWithRetry(
      () => axios.post(`${getBaseUrl()}/videos`, body, getAxiosConfig()),
      "提交视频任务",
    );
    submitData = resp.data;
  } catch (err) {
    throw formatRequestError(err, "视频任务提交失败");
  }

  const taskId = submitData?.id;
  if (!taskId) throw new Error(`视频任务提交失败：未返回任务 ID，响应：${JSON.stringify(submitData).slice(0, 300)}`);

  logger(`[七辰] 任务已提交：${taskId}`);

  const pollResult = await pollTask(
    async (): Promise<PollResult> => {
      try {
        const resp = await axios.get(`${getBaseUrl()}/videos/${taskId}`, getAxiosConfig());
        const data = resp.data;
        const status = extractStatus(data);
        logger(`[七辰] 轮询 ${taskId}：${status}，进度 ${data?.progress ?? "-"}`);

        if (["completed", "succeeded", "success"].includes(status)) {
          const videoUrl = extractVideoUrl(data);
          if (!videoUrl) return { completed: true, error: "视频生成完成，但未返回下载地址" };
          return { completed: true, data: videoUrl };
        }
        if (["failed", "error", "cancelled", "canceled"].includes(status)) {
          return { completed: true, error: data?.error?.message || "视频生成失败" };
        }
        return { completed: false };
      } catch (err: any) {
        if (isTransientNetworkError(err)) {
          logger(`[七辰] 轮询网络抖动，继续等待：${err?.message || err}`);
          return { completed: false };
        }
        throw err;
      }
    },
    8000,
    1800000,
  );

  if (pollResult.error) throw new Error(pollResult.error);
  if (!pollResult.data) throw new Error("视频生成失败：轮询未返回结果");

  if (pollResult.data.startsWith("http")) return pollResult.data;
  return pollResult.data;
};

const ttsRequest = async (_config: TTSConfig, _model: TTSModel): Promise<string> => {
  return "";
};

const checkForUpdates = async () => ({ hasUpdate: false, latestVersion: vendor.version, notice: "" });
const updateVendor = async () => "";

exports.vendor = vendor;
exports.textRequest = textRequest;
exports.imageRequest = imageRequest;
exports.videoRequest = videoRequest;
exports.ttsRequest = ttsRequest;
exports.checkForUpdates = checkForUpdates;
exports.updateVendor = updateVendor;

export {};
