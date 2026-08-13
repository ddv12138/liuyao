"use client";

// AI 解卦区：解卦按钮 → 问题弹窗（可选）→ SSE 流式渲染 → 停止/重试
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { postSSE } from "@/lib/sse";
import { rehypeAnnotate } from "@/lib/rehype-annotate";

export type AiStatus = "idle" | "dialog" | "streaming" | "done" | "error";

export function AiSection({
  values,
  apiKey,
  showPinyin = true,
  onUnauthorized,
  onFinished,
}: {
  values: number[];
  apiKey: string;
  showPinyin?: boolean;
  /** 解析完成（含中断/出错）时回写历史 */
  onFinished: (answer: string, truncated: boolean, question: string) => void;
  onUnauthorized: () => void;
}) {
  const [status, setStatus] = useState<AiStatus>("idle");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const finishedRef = useRef(false);
  useEffect(() => () => abortRef.current?.abort(), []);

  const start = useCallback(
    (q: string) => {
      finishedRef.current = false;
      setQuestion(q);
      setAnswer("");
      setErrorMsg(null);
      setStatus("streaming");
      const abort = new AbortController();
      abortRef.current = abort;

      postSSE("/api/interpret", { values, question: q }, apiKey, abort.signal, {
        onContent: (chunk) => setAnswer((prev) => prev + chunk),
        onDone: () => {
          if (finishedRef.current) return;
          finishedRef.current = true;
          setStatus("done");
          setAnswer((prev) => {
            onFinished(prev, false, q);
            return prev;
          });
        },
        onError: (message) => {
          if (finishedRef.current) return;
          finishedRef.current = true;
          setStatus("error");
          setErrorMsg(message);
          setAnswer((prev) => {
            onFinished(prev, true, q);
            return prev;
          });
        },
        onStatus: (s) => {
          if (s === 401) onUnauthorized();
        },
      }).catch((err) => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        if ((err as Error)?.name === "AbortError") {
          setStatus("done");
          setAnswer((prev) => {
            onFinished(prev, true, q);
            return prev;
          });
        } else {
          setStatus("error");
          setErrorMsg("网络中断，请重试");
          setAnswer((prev) => {
            onFinished(prev, true, q);
            return prev;
          });
        }
      });
    },
    [values, apiKey, onFinished, onUnauthorized],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
      {status === "idle" && (
        <div className="text-center">
          <p className="mb-3 text-sm text-[var(--ink-soft)]">
            卦象已明。可让 AI 结合卦辞爻辞为你解卦，也可附上你的问题。
          </p>
          <button
            onClick={() => setStatus("dialog")}
            className="rounded-xl bg-[var(--accent)] px-8 py-3 text-lg font-medium text-white shadow-sm transition hover:bg-[var(--accent-dark)]"
          >
            ✦ AI 解卦
          </button>
        </div>
      )}

      {status === "dialog" && (
        <div className="fade-in-up">
          <p className="mb-2 text-sm font-medium text-[var(--ink)]">
            是否附上你的问题？
          </p>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="可输入所问之事，如：最近工作变动是否有利…（可不填）"
            rows={3}
            className="w-full resize-none rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => start(question.trim())}
              className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white transition hover:bg-[var(--accent-dark)]"
            >
              解卦{question.trim() ? "（附上问题）" : ""}
            </button>
            <button
              onClick={() => setStatus("idle")}
              className="rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {(status === "streaming" || status === "done" || status === "error") && (
        <div className="fade-in-up">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-serif-cn text-base font-bold text-[var(--ink)]">
              AI 解卦
            </h3>
            {question && (
              <span className="max-w-[60%] truncate rounded-md bg-[var(--bg)] px-2 py-0.5 text-xs text-[var(--ink-soft)]">
                问：{question}
              </span>
            )}
          </div>

          {answer ? (
            <div className="prose-yi rounded-xl bg-[var(--bg)]/60 p-4">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[
                  [rehypeAnnotate, { enabled: showPinyin, mode: "modern" }],
                ]}
              >
                {answer}
              </ReactMarkdown>
              {status === "streaming" && <span className="stream-cursor" />}
            </div>
          ) : (
            <div className="rounded-xl bg-[var(--bg)]/60 p-6 text-center text-sm text-[var(--ink-soft)]">
              {status === "streaming" ? "正在起卦解卦…" : ""}
            </div>
          )}

          {status === "error" && (
            <p className="mt-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-2.5 text-sm text-[var(--accent)]">
              解卦失败：{errorMsg}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            {status === "streaming" ? (
              <button
                onClick={stop}
                className="flex-1 rounded-lg border border-[var(--accent)] py-2.5 font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/5"
              >
                停止生成
              </button>
            ) : (
              <>
                <button
                  onClick={() => start(question)}
                  className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white transition hover:bg-[var(--accent-dark)]"
                >
                  再解一次
                </button>
                <button
                  onClick={() => setStatus("idle")}
                  className="flex-1 rounded-lg border border-[var(--line)] py-2.5 text-sm text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  收起
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
