// POST /api/interpret —— 流式解卦
// 请求: { values: number[6]（爻值 6/7/8/9，自下而上）, question?: string }
// 响应: SSE（text/event-stream）—— data: {"content":"..."} ... data: [DONE]
// 鉴权: X-Api-Key 必须等于环境变量 ACCESS_KEY
import { accessKeyConfigured, isAccessKeyValid } from "@/lib/auth";
import { cast, yaoFromValue, type YaoValue } from "@/lib/divination";
import { buildInterpretMessages } from "@/lib/prompt";
import { streamChat } from "@/lib/deepseek";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // 1) 鉴权
  if (!accessKeyConfigured()) {
    return Response.json(
      { error: "服务端未配置 ACCESS_KEY 环境变量，解卦接口不可用" },
      { status: 500 }
    );
  }
  if (!isAccessKeyValid(request)) {
    return Response.json({ error: "访问口令不正确" }, { status: 401 });
  }

  // 2) 解析与校验请求
  let body: { values?: unknown; question?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const values = body.values;
  if (
    !Array.isArray(values) ||
    values.length !== 6 ||
    !values.every((v) => typeof v === "number" && v >= 6 && v <= 9)
  ) {
    return Response.json({ error: "values 必须为 6 个爻值（6/7/8/9）" }, { status: 400 });
  }
  const question = typeof body.question === "string" ? body.question : "";
  if (question.length > 2000) {
    return Response.json({ error: "问题过长（上限 2000 字）" }, { status: 400 });
  }

  // 3) 服务端重建卦象（不信任客户端算好的卦）
  const yaos = values.map((v) => yaoFromValue(v as YaoValue));
  const result = cast(yaos);
  if (!result) {
    return Response.json({ error: "无法由该爻序列成卦" }, { status: 400 });
  }

  // 4) 构建 prompt
  const { system, user } = buildInterpretMessages(result, question);

  // 5) SSE 流式转发
  const encoder = new TextEncoder();
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // 先发送 SSE 注释，立即冲刷响应头，让客户端能展示“已连接、正在读取”。
        controller.enqueue(encoder.encode(": connected\n\n"));
        for await (const chunk of streamChat(
          [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          { signal: abort.signal }
        )) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        if (abort.signal.aborted) {
          // 客户端主动停止，静默关闭
        } else {
          const message = err instanceof Error ? err.message : "未知错误";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
        }
      } finally {
        try {
          controller.close();
        } catch {
          // 客户端已断开时 close 可能抛错，忽略
        }
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
