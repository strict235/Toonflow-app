/**
 * Toonflow AI供应商 - AIHubMix
 * @version 2.7
 *
 * 文档：https://docs.aihubmix.com/cn
 * 图片生成：OpenAI 兼容接口 /v1/images/generations 与 /v1/images/edits
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
declare const urlToBase64: (url: string) => Promise<string>;
declare const createOpenAI: any;
declare const createOpenAICompatible: any;
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

const vendor: VendorConfig = {
  id: "aihubmix",
  version: "2.7",
  author: "Toonflow",
  name: "AIHubMix",
  description:
    "AIHubMix 模型聚合平台，支持 OpenAI 兼容图片生成接口。\n\n[前往平台](https://aihubmix.com) | [文档](https://docs.aihubmix.com/cn)",
  inputs: [
    { key: "apiKey", label: "API密钥", type: "password", required: true, placeholder: "sk-..." },
    {
      key: "baseUrl",
      label: "请求地址",
      type: "url",
      required: true,
      placeholder: "以 v1 结束，示例：https://aihubmix.com/v1",
    },
  ],
  inputValues: {
    apiKey: "",
    baseUrl: "https://aihubmix.com/v1",
  },
  models: [
    {
      name: "GPT Image 2 Free",
      modelName: "gpt-image-2-free",
      type: "image",
      mode: ["text", "singleImage", "multiReference"],
    },
    {
      name: "GPT Image 1",
      modelName: "gpt-image-1",
      type: "image",
      mode: ["text", "singleImage", "multiReference"],
    },
    {
      name: "GPT Image 2",
      modelName: "gpt-image-2",
      type: "image",
      mode: ["text", "singleImage", "multiReference"],
    },
  ],
};

// ============================================================
// 辅助工具
// ============================================================

const getBaseUrl = () => vendor.inputValues.baseUrl.replace(/\/+$/, "");

const getBaseUrlCandidates = (): string[] => {
  const configured = getBaseUrl();
  const candidates = [configured, "https://aihubmix.com/v1"];
  return candidates.filter((item, index) => candidates.indexOf(item) === index);
};

const getAxiosConfig = (headers: Record<string, string>) => ({
  headers,
  timeout: 600000,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

const getApiKey = () => {
  if (!vendor.inputValues.apiKey) throw new Error("缺少 API Key");
  return vendor.inputValues.apiKey.replace(/^Bearer\s+/i, "");
};

const getAuthHeaders = () => ({
  Authorization: `Bearer ${getApiKey()}`,
  "Content-Type": "application/json",
});

const resolveImageSize = (size: ImageConfig["size"], aspectRatio: ImageConfig["aspectRatio"]): string => {
  const sizeTable: Record<string, Record<string, string>> = {
    "1K": {
      "1:1": "1024x1024",
      "16:9": "1536x1024",
      "9:16": "1024x1536",
    },
    "2K": {
      "1:1": "2048x2048",
      "16:9": "2848x1600",
      "9:16": "1600x2848",
    },
    "4K": {
      "1:1": "4096x4096",
      "16:9": "4096x2304",
      "9:16": "2304x4096",
    },
  };
  return sizeTable[size]?.[aspectRatio] || "auto";
};

const resolveQuality = (_size: ImageConfig["size"]): string => "auto";

const collectImageRefs = (config: ImageConfig): string[] => {
  const fromReferenceList = (config.referenceList || []).map((item) => item.base64).filter(Boolean);
  if (fromReferenceList.length > 0) return fromReferenceList;
  return (config.imageBase64 || []).filter(Boolean);
};

const normalizeB64Image = (b64: string): string => {
  if (b64.startsWith("data:")) return b64;
  return `data:image/png;base64,${b64}`;
};

const parseImageResponse = async (data: any): Promise<string> => {
  if (data?.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  const items = data?.data;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("图片生成失败：未返回有效结果");
  }
  for (const item of items) {
    if (item?.b64_json) return normalizeB64Image(item.b64_json);
    if (item?.url) return await urlToBase64(item.url);
    if (item?.error) {
      throw new Error(item.error.message || JSON.stringify(item.error));
    }
  }
  throw new Error("图片生成失败：响应中无可用图片");
};

const decodeBase64Image = (base64: string): { buffer: any; mime: string } => {
  const matched = base64.match(/^data:([^;]+);base64,(.+)$/);
  const mime = matched?.[1] || "image/png";
  const raw = matched?.[2] || base64.replace(/^data:[^;]+;base64,/, "");
  return { buffer: Buffer.from(raw, "base64"), mime };
};

const unwrapErrorMessage = (err: any): string => {
  const parts: string[] = [];
  const visited = new Set<any>();

  const visit = (error: any) => {
    if (!error || visited.has(error)) return;
    visited.add(error);

    if (Array.isArray(error.errors)) {
      for (const item of error.errors) visit(item);
    }
    if (error.cause && error.cause !== error) visit(error.cause);

    const code = error.code ? String(error.code) : "";
    const message = error.message ? String(error.message) : "";
    if (code && code !== "AggregateError" && !parts.includes(code)) parts.push(code);
    if (message && message !== "AggregateError" && !parts.includes(message)) parts.push(message);
  };

  visit(err);
  return parts.join("；") || "未知错误";
};

const isRetryableError = (err: any): boolean => {
  if (err?.response?.status) return false;
  const detail = unwrapErrorMessage(err);
  return /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ECONNABORTED|timeout|AggregateError|fetch failed/i.test(detail);
};

const formatRequestError = (err: any, action: string): Error => {
  const responseData = err?.response?.data;
  const status = err?.response?.status;
  const apiMessage = responseData?.error?.message || (typeof responseData === "string" ? responseData : "");

  if (status === 429 || /free model quota|reached the limit/i.test(apiMessage)) {
    return new Error(
      `${action}：免费模型额度已用尽（gpt-image-2-free）。请在 AIHubMix 控制台充值后使用 gpt-image-2，或在供应商中改用 gpt-image-1 / gpt-image-2 模型。`,
    );
  }
  if (/cannot be routed/i.test(apiMessage)) {
    return new Error(
      `${action}：当前模型暂时无法路由（${apiMessage}）。请稍后重试，或改用 gpt-image-1 / gpt-image-2 模型。`,
    );
  }
  if (apiMessage) return new Error(`${action}：${apiMessage}`);
  if (responseData) return new Error(`${action}：${JSON.stringify(responseData)}`);

  const detail = unwrapErrorMessage(err);
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ECONNABORTED|timeout|AggregateError|fetch failed/i.test(detail)) {
    return new Error(
      `${action}：网络连接失败（${detail}）。请确认本机可访问 AIHubMix，并检查供应商请求地址（推荐 https://aihubmix.com/v1）与 API Key 是否正确；如使用代理，请在系统中配置系统代理后重试。`,
    );
  }
  return new Error(`${action}：${detail}`);
};

const postJsonWithFallback = async (path: string, body: Record<string, any>) => {
  let lastErr: any;
  for (const baseUrl of getBaseUrlCandidates()) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        logger(`[AIHubMix] POST ${baseUrl}${path}（try ${attempt + 1}/3）`);
        return await axios.post(`${baseUrl}${path}`, body, getAxiosConfig(getAuthHeaders()));
      } catch (err) {
        lastErr = err;
        logger(`[AIHubMix] ${baseUrl}${path} 失败：${unwrapErrorMessage(err)}`);
        if (!isRetryableError(err)) break;
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
};

const postFormWithFallback = async (path: string, form: any) => {
  let lastErr: any;
  for (const baseUrl of getBaseUrlCandidates()) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        logger(`[AIHubMix] POST ${baseUrl}${path} (multipart)（try ${attempt + 1}/3）`);
        return await axios.post(`${baseUrl}${path}`, form, {
          ...getAxiosConfig({ Authorization: `Bearer ${getApiKey()}` }),
          headers: {
            Authorization: `Bearer ${getApiKey()}`,
            ...form.getHeaders(),
          },
        });
      } catch (err) {
        lastErr = err;
        logger(`[AIHubMix] ${baseUrl}${path} 失败：${unwrapErrorMessage(err)}`);
        if (!isRetryableError(err)) break;
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
};

// ============================================================
// 适配器函数
// ============================================================

const textRequest = (model: TextModel, think: boolean, thinkLevel: 0 | 1 | 2 | 3) => {
  const apiKey = getApiKey();
  const baseURL = getBaseUrl();
  const lowerName = model.modelName.toLowerCase();

  // DeepSeek 思考模式（经 AIHubMix 路由）
  if (lowerName.includes("deepseek") && model.think && think) {
    const effortMap: Record<0 | 1 | 2 | 3, "high" | "max"> = {
      0: "high",
      1: "high",
      2: "high",
      3: "max",
    };
    return createOpenAICompatible({
      name: "aihubmix",
      baseURL,
      apiKey,
      fetch: async (url: string, options?: RequestInit) => {
        const rawBody = JSON.parse((options?.body as string) ?? "{}");
        return await fetch(url, {
          ...options,
          body: JSON.stringify({
            ...rawBody,
            thinking: { type: "enabled" },
            reasoning_effort: effortMap[thinkLevel],
          }),
        });
      },
    }).chatModel(model.modelName);
  }

  logger(`[AIHubMix] 文本模型：${model.modelName}`);
  // fetch 在沙盒中已注入系统代理，与图片 axios 走同一路径
  return createOpenAI({ baseURL, apiKey, fetch }).chat(model.modelName);
};

const imageRequest = async (config: ImageConfig, model: ImageModel): Promise<string> => {
  const prompt = (config.prompt ?? "").trim();
  if (!prompt) {
    throw new Error("图片编辑请求失败：prompt 不能为空。请填写提示词后再进行参考图编辑/图生图。");
  }
  const resolvedSize = resolveImageSize(config.size, config.aspectRatio);
  const quality = resolveQuality(config.size);
  const imageRefs = collectImageRefs(config);

  if (imageRefs.length === 0) {
    logger(`[AIHubMix] 文生图，模型：${model.modelName}，尺寸：${resolvedSize}，质量：${quality}`);
    try {
      const response = await postJsonWithFallback("/images/generations", {
        model: model.modelName,
        prompt,
        n: 1,
        size: resolvedSize,
        quality,
      });
      return await parseImageResponse(response.data);
    } catch (err) {
      throw formatRequestError(err, "图片生成请求失败");
    }
  }

  logger(`[AIHubMix] 图生图/编辑，模型：${model.modelName}，参考图：${imageRefs.length} 张`);
  const form = new FormData();
  form.append("model", model.modelName);
  form.append("prompt", prompt);
  form.append("n", "1");
  form.append("size", resolvedSize);
  form.append("quality", quality);

  for (let i = 0; i < imageRefs.length; i++) {
    const { buffer, mime } = decodeBase64Image(imageRefs[i]);
    const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
    // AIHubMix / OpenAI-compatible edits：多图参考需使用数组语法 image[]
    form.append("image[]", buffer, { filename: `ref${i}.${ext}`, contentType: mime });
  }

  try {
    const editResp = await postFormWithFallback("/images/edits", form);
    return await parseImageResponse(editResp.data);
  } catch (err) {
    throw formatRequestError(err, "图片编辑请求失败");
  }
};

const videoRequest = async (config: VideoConfig, model: VideoModel): Promise<string> => {
  return "";
};

const ttsRequest = async (config: TTSConfig, model: TTSModel): Promise<string> => {
  return "";
};

const checkForUpdates = async (): Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }> => {
  return { hasUpdate: false, latestVersion: vendor.version, notice: "" };
};

const updateVendor = async (): Promise<string> => {
  return "";
};

// ============================================================
// 导出
// ============================================================

exports.vendor = vendor;
exports.textRequest = textRequest;
exports.imageRequest = imageRequest;
exports.videoRequest = videoRequest;
exports.ttsRequest = ttsRequest;
exports.checkForUpdates = checkForUpdates;
exports.updateVendor = updateVendor;

export {};
