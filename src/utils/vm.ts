import { VM } from "vm2";
import sharp from "sharp";
import axios, { type AxiosInstance } from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createZhipu } from "zhipu-ai-provider";
import { createQwen } from "qwen-ai-provider-v5";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createXai } from "@ai-sdk/xai";
import { createMinimax } from "vercel-minimax-ai-provider";
import FormData from "form-data";
import jsonwebtoken from "jsonwebtoken";
import normalizeError from "@/utils/error";
import crypto from "node:crypto";
import https from "node:https";
import { Readable } from "node:stream";
import { execSync } from "node:child_process";

const httpsAgent = new https.Agent({ family: 4, keepAlive: true });

let cachedProxyUrl: string | null | undefined;

function readWindowsSystemProxy(): string | undefined {
  if (process.platform !== "win32") return undefined;
  try {
    const enableOut = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable',
      { encoding: "utf8", windowsHide: true },
    );
    if (!/0x1/.test(enableOut)) return undefined;
    const serverOut = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer',
      { encoding: "utf8", windowsHide: true },
    );
    const match = serverOut.match(/ProxyServer\s+REG_SZ\s+(\S+)/);
    if (!match) return undefined;
    const server = match[1].trim();
    return server.includes("://") ? server : `http://${server}`;
  } catch {
    return undefined;
  }
}

async function resolveProxyUrl(targetUrl: string): Promise<string | undefined> {
  const syncProxy = getProxyUrlSync();
  if (syncProxy) return syncProxy;

  try {
    if (process.versions.electron) {
      const { session } = require("electron") as typeof import("electron");
      const result = await session.defaultSession.resolveProxy(targetUrl);
      const proxyMatch = result.match(/(?:PROXY|HTTPS|HTTP)\s+([^;\s]+)/i);
      if (proxyMatch) {
        const host = proxyMatch[1];
        const url = host.includes("://") ? host : `http://${host}`;
        cachedProxyUrl = url;
        return url;
      }
    }
  } catch {
    // Electron 代理解析失败时忽略
  }

  return undefined;
}

function getProxyUrlSync(): string | undefined {
  if (cachedProxyUrl !== undefined) return cachedProxyUrl ?? undefined;

  const fromEnv =
    process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  if (fromEnv) {
    cachedProxyUrl = fromEnv;
    return fromEnv;
  }

  const systemProxy = readWindowsSystemProxy();
  cachedProxyUrl = systemProxy ?? null;
  return systemProxy;
}

function createAxiosClient(): AxiosInstance {
  const proxyUrl = getProxyUrlSync();
  if (proxyUrl) {
    return axios.create({
      httpAgent: new HttpProxyAgent(proxyUrl),
      httpsAgent: new HttpsProxyAgent(proxyUrl),
      proxy: false,
    });
  }
  return axios.create({ httpsAgent, proxy: false });
}

function headersToRecord(headers?: HeadersInit): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headers) return result;
  if (headers instanceof Headers) {
    headers.forEach((v, k) => {
      result[k] = v;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    for (const [k, v] of headers) result[k] = v;
    return result;
  }
  return { ...(headers as Record<string, string>) };
}

function isStreamRequest(init?: RequestInit): boolean {
  if (!init?.body || typeof init.body !== "string") return false;
  try {
    return JSON.parse(init.body).stream === true;
  } catch {
    return false;
  }
}

function nodeStreamToWebStream(stream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      stream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });
}

/** 供 AI SDK / fetch 使用，走与图片请求相同的系统代理 */
export function createProxiedFetch(client: AxiosInstance): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = headersToRecord(init?.headers);
    const streamRequest = isStreamRequest(init);

    const response = await client.request({
      url,
      method,
      headers,
      data: init?.body,
      responseType: streamRequest ? "stream" : "arraybuffer",
      validateStatus: () => true,
      signal: init?.signal ?? undefined,
      timeout: 600000,
    });

    const responseHeaders = new Headers();
    for (const [key, value] of Object.entries(response.headers)) {
      if (value === undefined) continue;
      responseHeaders.set(key, Array.isArray(value) ? value.join(", ") : String(value));
    }

    const raw = response.data;
    const body = streamRequest
      ? nodeStreamToWebStream(raw as Readable)
      : raw instanceof ArrayBuffer
        ? raw
        : new Uint8Array(raw as Buffer);

    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  };
}

export async function createAxios(targetUrl = "https://api.openai.com"): Promise<AxiosInstance> {
  const proxyUrl = (await resolveProxyUrl(targetUrl)) ?? getProxyUrlSync();
  if (proxyUrl) {
    return axios.create({
      httpAgent: new HttpProxyAgent(proxyUrl),
      httpsAgent: new HttpsProxyAgent(proxyUrl),
      proxy: false,
    });
  }
  return axios.create({ httpsAgent, proxy: false });
}
export default function runCode(code: string, vendor?: Record<string, any>) {
  code = code.replace(/export\s*\{\s*\};?/g, ""); // 去掉 export {} 以免沙盒环境报错
  const vendorAxios = createAxiosClient();
  const proxiedFetch = createProxiedFetch(vendorAxios);
  const proxyUrl = getProxyUrlSync();
  if (proxyUrl) logger(`[网络] 使用代理：${proxyUrl}`);
  // 创建一个沙盒
  const exports = {};
  const sandbox: Record<string, any> = {
    createOpenAI,
    createDeepSeek,
    createZhipu,
    createQwen,
    createAnthropic,
    createOpenAICompatible,
    createXai,
    createMinimax,
    createGoogleGenerativeAI,
    zipImage,
    zipImageResolution,
    urlToBase64,
    mergeImages,
    pollTask,
    fetch: proxiedFetch,
    proxiedFetch,
    exports,
    axios: vendorAxios,
    createAxios,
    FormData,
    httpsAgent: vendorAxios.defaults.httpsAgent ?? httpsAgent,
    logger,
    jsonwebtoken,
    crypto,
  };
  if (vendor !== undefined) {
    sandbox.vendor = vendor;
  }
  const vm = new VM({
    timeout: 0,
    sandbox,
    compiler: "javascript",
    eval: false,
    wasm: false,
  });

  vm.run(code);

  return exports as Record<string, any>;
}
export function logger(logstring: any) {
  console.log("【VM】" + JSON.stringify(logstring));
}
/**
 * 压缩图片，目标字节数不高于 size
 */
export async function zipImage(completeBase64: string, size: number): Promise<string> {
  let quality = 80;
  let buffer = Buffer.from(completeBase64.split(",")[1], "base64");
  let output = await sharp(buffer).jpeg({ quality }).toBuffer();
  while (output.length > size && quality > 10) {
    quality -= 10;
    output = await sharp(buffer).jpeg({ quality }).toBuffer();
  }
  return "data:image/jpeg;base64," + output.toString("base64");
}

export async function zipImageResolution(completeBase64: string, width: number, height: number): Promise<string> {
  const buffer = Buffer.from(completeBase64.split(",")[1], "base64");
  const out = await sharp(buffer).resize(width, height).toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

//url转Base64
export async function urlToBase64(url: string): Promise<string> {
  const client = await createAxios(url);
  let lastErr: unknown;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await client.get(url, { responseType: "arraybuffer", timeout: 600000 });
      const mime = res.headers["content-type"] || "image/jpeg";
      const b64 = Buffer.from(res.data).toString("base64");
      return `data:${mime};base64,${b64}`;
    } catch (e) {
      lastErr = e;
      if (!isTransientNetworkError(e) || i === 4) break;
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
  throw lastErr;
}

function isTransientNetworkError(err: unknown): boolean {
  const msg = normalizeError(err).message || "";
  return /ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|ECONNABORTED|socket disconnected|TLS|timeout|AggregateError|fetch failed/i.test(msg);
}

export async function pollTask(
  fn: () => Promise<{ completed: boolean; data?: string; error?: string }>,
  interval = 3000,
  timeout = 3000000,
): Promise<{ completed: boolean; data?: string; error?: string }> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const result = await fn();
      if (result.completed) return result;
      if (result?.error) return result;
    } catch (e: any) {
      if (isTransientNetworkError(e)) {
        await new Promise((res) => setTimeout(res, interval));
        continue;
      }
      return { completed: false, error: normalizeError(e).message || "poll error" };
    }
    await new Promise((res) => setTimeout(res, interval));
  }
  return { completed: false, error: "timeout" };
}

/**
 * 将多张图片横向拼接为一张，并确保输出大小不超过指定限制
 * @param imageBase64List - base64编码的图片数组
 * @param maxSize - 最大输出大小，支持格式如 "10mb", "5MB", "1024kb" 等
 * @returns 拼接后的图片base64字符串
 */
export async function mergeImages(imageBase64List: string[], maxSize = "10mb"): Promise<string> {
  if (imageBase64List.length === 0) {
    throw new Error("图片列表不能为空");
  }

  const maxBytes = parseSize(maxSize);
  const imageBuffers = imageBase64List.map(base64ToBuffer);
  const imageMetadatas = await Promise.all(imageBuffers.map((buffer) => sharp(buffer).metadata()));
  const maxHeight = Math.max(...imageMetadatas.map((m) => m.height || 0));

  // 计算各图片调整后的宽度
  const imageWidths = imageMetadatas.map((metadata) => {
    const aspectRatio = (metadata.width || 1) / (metadata.height || 1);
    return Math.round(maxHeight * aspectRatio);
  });
  const totalWidth = imageWidths.reduce((sum, w) => sum + w, 0);

  // 拼接图片
  const resizedImages = await Promise.all(
    imageBuffers.map(async (buffer, index) => {
      return sharp(buffer).resize(imageWidths[index], maxHeight, { fit: "cover" }).toBuffer();
    }),
  );

  let currentX = 0;
  const compositeInputs = resizedImages.map((buffer, index) => {
    const input = { input: buffer, left: currentX, top: 0 };
    currentX += imageWidths[index];
    return input;
  });

  const mergedBuffer = await sharp({
    create: {
      width: totalWidth,
      height: maxHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(compositeInputs)
    .jpeg({ quality: 90 })
    .toBuffer();

  // 复用压缩逻辑
  const resultBuffer = await compressToSize(mergedBuffer, maxBytes, totalWidth, maxHeight);
  return resultBuffer.toString("base64");
}

/**
 * 解析大小字符串为字节数
 */
function parseSize(size: string): number {
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb|b)?$/);
  if (!match) {
    throw new Error(`无效的大小格式: ${size}`);
  }
  const value = parseFloat(match[1]);
  const unit = match[2] || "b";
  const multipliers: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  return Math.floor(value * multipliers[unit]);
}

/**
 * 将base64字符串转换为Buffer
 */
function base64ToBuffer(base64: string): Buffer {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, "base64");
}

/**
 * 压缩Buffer到指定大小以内
 */
async function compressToSize(imageBuffer: Buffer, maxBytes: number, originalWidth: number, originalHeight: number): Promise<Buffer> {
  let quality = 90;
  let scale = 1;

  while (true) {
    const targetWidth = Math.round(originalWidth * scale);
    const targetHeight = Math.round(originalHeight * scale);

    const resultBuffer = await sharp(imageBuffer).resize(targetWidth, targetHeight, { fit: "fill" }).jpeg({ quality }).toBuffer();

    if (resultBuffer.length <= maxBytes) {
      return resultBuffer;
    }

    if (quality > 10) {
      quality -= 10;
    } else {
      quality = 90;
      scale *= 0.8;
    }
  }
}
