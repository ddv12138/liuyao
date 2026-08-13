// DeepSeek API 流式调用封装（服务端专用）
// 官方文档: https://api-docs.deepseek.com —— OpenAI 兼容 /chat/completions，SSE 流式
// 双通道：
//  - 本机开发若配置了 http(s)_proxy（走代理的机器）→ undici（动态加载，Cloudflare 构建不执行）
//  - 生产 Node（Docker 直连）与 Cloudflare Workers → 全局 fetch

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
  init: { headers: Record<string, string>; body: string; signal?: AbortSignal }
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
  return {
    status: res.status,
    body: res.body as unknown as AsyncIterable<Uint8Array>,
    text: () => res.text(),
  };
}

/**
 * 调 DeepSeek 流式对话，逐段产出 content 增量。
 * 思考模型的 reasoning_content 被跳过，只吐正文。
 * 出错时抛 Error（含状态码与服务器消息）。
 */
export async function* streamChat(
  messages: ChatMessage[],
  opts: StreamCallOptions = {}
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
      max_tokens: opts.maxTokens ?? 2000,
    }),
    signal: opts.signal,
  });

  if (res.status !== 200) {
    const detail = await res.text().catch(() => "");
    throw new Error(`DeepSeek 请求失败 HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }

  // 统一 SSE 解析：按空行分帧，产出 content 增量
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk as Uint8Array, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta;
          const content: string | undefined = delta?.content;
          if (typeof content === "string" && content.length > 0) yield content;
        } catch {
          // 忽略无法解析的帧
        }
      }
    }
  }
}
