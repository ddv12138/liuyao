// 客户端 SSE 流式请求工具
// 解析后端 /api/interpret 的 text/event-stream：data: {content} ... data: [DONE]

import { SseParser, type SseEvent } from "@/lib/sse-parser";

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
  handlers: StreamHandlers,
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
  const parser = new SseParser();
  let terminal = false;

  const handleEvent = (event: SseEvent) => {
    if (terminal) return;
    if (event.data === "[DONE]") {
      terminal = true;
      handlers.onDone();
      return;
    }

    try {
      const json = JSON.parse(event.data);
      if (typeof json?.content === "string" && json.content.length > 0) {
        handlers.onContent(json.content);
      } else if (typeof json?.error === "string") {
        terminal = true;
        handlers.onError(json.error);
      }
    } catch {
      // 非 JSON 的 data 帧不能结束正常流；若最终没有 DONE，会报告流异常。
    }
  };

  const handleEvents = (events: SseEvent[]) => {
    for (const event of events) {
      handleEvent(event);
      if (terminal) break;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      handleEvents(parser.push(decoder.decode(value, { stream: true })));
      if (terminal) return;
    }

    handleEvents(parser.push(decoder.decode()));
    if (terminal) return;
    handleEvents(parser.end());
    if (terminal) return;

    handlers.onError("解卦流未正常结束，请重试");
  } finally {
    reader.releaseLock();
  }
}
