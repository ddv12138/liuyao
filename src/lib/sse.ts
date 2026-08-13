// 客户端 SSE 流式请求工具
// 解析后端 /api/interpret 的 text/event-stream：data: {content} ... data: [DONE]

export interface StreamHandlers {
  onContent: (chunk: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
  /** 成功建立响应流、但还未收到模型内容时回调 */
  onConnected?: () => void;
  /** 非 2xx 响应时回调（如 401 口令失效） */
  onStatus?: (status: number) => void;
}

export async function postSSE(
  url: string,
  body: unknown,
  apiKey: string,
  signal: AbortSignal,
  handlers: StreamHandlers
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    handlers.onStatus?.(res.status);
    let message = `请求失败 (HTTP ${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.error === "string") message = data.error;
    } catch {
      /* 非 JSON 响应 */
    }
    handlers.onError(message);
    return;
  }
  if (!res.body) {
    handlers.onError("响应无内容流");
    return;
  }
  handlers.onConnected?.();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") {
            handlers.onDone();
            return;
          }
          try {
            const json = JSON.parse(payload);
            if (typeof json?.content === "string" && json.content.length > 0) {
              handlers.onContent(json.content);
            } else if (typeof json?.error === "string") {
              handlers.onError(json.error);
              return;
            }
          } catch {
            /* 忽略无法解析的帧 */
          }
        }
      }
    }
    handlers.onDone();
  } finally {
    reader.releaseLock();
  }
}
