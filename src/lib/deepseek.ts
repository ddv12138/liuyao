// DeepSeek API 流式调用封装（服务端专用）
// 官方文档: https://api-docs.deepseek.com —— OpenAI 兼容 /chat/completions，SSE 流式
// 双通道：
//  - 本机开发若配置了 http(s)_proxy（走代理的机器）→ undici（动态加载，Cloudflare 构建不执行）
//  - 生产 Node（Docker 直连）与 Cloudflare Workers → 全局 fetch

import { SseParser, type SseEvent } from "@/lib/sse-parser";

const BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

interface UpstreamResponse {
  status: number;
  /** 按块产出 Uint8Array 的响应体 */
  body: AsyncIterable<Uint8Array>;
  text: () => Promise<string>;
}

/** 发起到 DeepSeek 的流式请求，返回统一的响应封装 */
async function doRequest(
  url: string,
  init: { headers: Record<string, string>; body: string; signal?: AbortSignal },
): Promise<UpstreamResponse> {
  const proxy = process.env.https_proxy || process.env.http_proxy;
  if (proxy) {
    // 本机开发：走代理（undici 动态导入，Workers 上因无代理环境变量不会执行）
    const { ProxyAgent: PA, request } = await import("undici");
    const res = await request(url, {
      method: "POST",
      headers: init.headers,
      body: init.body,
      signal: init.signal,
      dispatcher: new PA(proxy),
    });
    return {
      status: res.statusCode,
      body: res.body as AsyncIterable<Uint8Array>,
      text: () => res.body.text(),
    };
  }

  // 生产 Node / Cloudflare Workers：全局 fetch
  const res = await fetch(url, {
    method: "POST",
    headers: init.headers,
    body: init.body,
    signal: init.signal,
  });
  if (!res.body) {
    throw new Error("DeepSeek 响应没有内容流");
  }
  return {
    status: res.status,
    body: res.body as unknown as AsyncIterable<Uint8Array>,
    text: () => res.text(),
  };
}

/**
 * 调 DeepSeek 流式对话，逐段产出 content 增量。
 * 思考模型的 reasoning_content 被跳过，只吐正文。
 * 出错或上游提前结束时抛 Error（含状态码与服务器消息）。
 */
export async function* streamChat(
  messages: ChatMessage[],
  opts: StreamCallOptions = {},
): AsyncGenerator<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("服务端未配置 DEEPSEEK_API_KEY");
  const model = opts.model ?? process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;

  const res = await doRequest(`${BASE_URL}/chat/completions`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens ?? 1400,
    }),
    signal: opts.signal,
  });

  if (res.status !== 200) {
    const detail = await res.text().catch(() => "");
    throw new Error(`DeepSeek 请求失败 HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }

  const decoder = new TextDecoder();
  const parser = new SseParser();
  let done = false;

  const readEvents = (events: SseEvent[]): string[] => {
    const chunks: string[] = [];
    for (const event of events) {
      if (event.data === "[DONE]") {
        done = true;
        break;
      }
      try {
        const json = JSON.parse(event.data);
        const content = json.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content.length > 0) {
          chunks.push(content);
        }
      } catch {
        // 非法 JSON 帧不能伪造正文；最终没有 DONE 时会报告流异常。
      }
    }
    return chunks;
  };

  for await (const chunk of res.body) {
    for (const content of readEvents(parser.push(decoder.decode(chunk, { stream: true })))) {
      yield content;
    }
    if (done) return;
  }

  for (const content of readEvents(parser.push(decoder.decode()))) {
    yield content;
  }
  if (done) return;

  for (const content of readEvents(parser.end())) {
    yield content;
  }
  if (!done) {
    throw new Error("DeepSeek 流未正常结束");
  }
}
