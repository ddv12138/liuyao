import { afterEach, describe, expect, it, vi } from "vitest";
import { postSSE } from "@/lib/sse";

function responseFor(text: string): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}

describe("postSSE", () => {
  afterEach(() => vi.restoreAllMocks());

  it("delivers content and only completes after DONE", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      responseFor('data: {"content":"甲"}\r\n\r\ndata: [DONE]\r\n\r\n'),
    ));
    const content: string[] = [];
    const done = vi.fn();
    const error = vi.fn();

    await postSSE("/api/interpret", {}, "key", new AbortController().signal, {
      onContent: (chunk) => content.push(chunk),
      onDone: done,
      onError: error,
    });

    expect(content).toEqual(["甲"]);
    expect(done).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
  });

  it("reports a stream that closes without DONE instead of treating it as success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      responseFor('data: {"content":"半段"}\n\n'),
    ));
    const done = vi.fn();
    const error = vi.fn();

    await postSSE("/api/interpret", {}, "key", new AbortController().signal, {
      onContent: vi.fn(),
      onDone: done,
      onError: error,
    });

    expect(done).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("解卦流未正常结束，请重试");
  });

  it("passes server errors to the caller", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      responseFor('data: {"error":"上游失败"}\n\ndata: [DONE]\n\n'),
    ));
    const error = vi.fn();

    await postSSE("/api/interpret", {}, "key", new AbortController().signal, {
      onContent: vi.fn(),
      onDone: vi.fn(),
      onError: error,
    });

    expect(error).toHaveBeenCalledWith("上游失败");
  });
});
