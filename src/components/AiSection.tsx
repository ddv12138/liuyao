"use client";

// 解卦区：解卦按钮 → 问题弹窗 → 连接/读取/流式渲染 → 停止/重试
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShareLongImageButton } from "@/components/ShareLongImageButton";
import { cast, yaoFromValue, type YaoValue } from "@/lib/divination";
import { postSSE } from "@/lib/sse";
import { rehypeAnnotate } from "@/lib/rehype-annotate";
export type AiStatus =
  | "idle"
  | "dialog"
  | "connecting"
  | "reading"
  | "streaming"
  | "done"
  | "stopped"
  | "error";

export type AiFinishStatus = "completed" | "failed" | "interrupted";

const STATUS_LABELS: Partial<Record<AiStatus, string>> = {
  connecting: "正在连接解卦服务…",
  reading: "已连接，正在读取解卦结果…",
  streaming: "正在输出解读…",
  done: "解读完成",
  stopped: "已停止输出",
};

export function AiSection({
  values,
  apiKey,
  castAt,
  showPinyin = true,
  autoStart = false,
  autoStartQuestion = "",
  onStarted,
  onFinished,
  onUnauthorized,
}: {
  values: number[];
  apiKey: string;
  castAt: number;
  showPinyin?: boolean;
  autoStart?: boolean;
  autoStartQuestion?: string;
  onStarted?: (question: string) => void;
  onFinished: (answer: string, status: AiFinishStatus, question: string) => void;
  onUnauthorized: () => void;
}) {
  const [status, setStatus] = useState<AiStatus>("idle");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  const startRef = useRef<(question: string, automaticRetry?: boolean) => void>(() => {});
  const autoStartedRef = useRef(false);

  useEffect(
    () => () => {
      runIdRef.current += 1;
      abortRef.current?.abort();
    },
    [],
  );

  const start = useCallback(
    (q: string, isAutomaticRetry = false) => {
      abortRef.current?.abort();
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;
      let settled = false;
      let receivedContent = false;
      const abort = new AbortController();
      abortRef.current = abort;

      const isCurrent = () => runIdRef.current === runId;
      const saveResult = (resultStatus: AiFinishStatus) => {
        setAnswer((prev) => {
          onFinished(prev, resultStatus, q);
          return prev;
        });
      };

      setQuestion(q);
      setAnswer("");
      setErrorMsg(null);
      setStatus("connecting");
      onStarted?.(q);

      postSSE("/api/interpret", { values, question: q }, apiKey, abort.signal, {
        onConnected: () => {
          if (!isCurrent()) return;
          setStatus((current) => (current === "connecting" ? "reading" : current));
        },
        onContent: (chunk) => {
          if (!isCurrent() || settled) return;
          receivedContent = true;
          setStatus("streaming");
          setAnswer((prev) => prev + chunk);
        },
        onDone: () => {
          if (!isCurrent() || settled) return;
          settled = true;
          if (!receivedContent && !isAutomaticRetry) {
            // 保持流式体验：只有确认空正文后才重新发起一次请求。
            setStatus("connecting");
            setErrorMsg("模型未返回解读内容，正在自动重试…");
            startRef.current(q, true);
            return;
          }
          if (!receivedContent) {
            setStatus("error");
            setErrorMsg("模型未返回解读内容，请点击“再解一次”重试。");
            saveResult("failed");
            return;
          }
          setStatus("done");
          saveResult("completed");
        },
        onError: (message) => {
          if (!isCurrent() || settled) return;
          settled = true;
          setStatus("error");
          setErrorMsg(message);
          setAnswer((prev) => {
            onFinished(prev, prev ? "interrupted" : "failed", q);
            return prev;
          });
        },
        onStatus: (httpStatus) => {
          if (isCurrent() && httpStatus === 401) onUnauthorized();
        },
      }).catch((err) => {
        if (!isCurrent() || settled) return;
        settled = true;
        if ((err as Error)?.name === "AbortError") {
          setStatus("stopped");
          saveResult("interrupted");
        } else {
          setStatus("error");
          setErrorMsg("网络中断，请重试");
          saveResult(receivedContent ? "interrupted" : "failed");
        }
      });
    },
    [apiKey, onFinished, onStarted, onUnauthorized, values],
  );

  useEffect(() => {
    startRef.current = start;
  }, [start]);
  useEffect(() => {
    if (!autoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;
    const timer = setTimeout(() => start(autoStartQuestion), 0);
    return () => clearTimeout(timer);
  }, [autoStart, autoStartQuestion, start]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const isActive =
    status === "connecting" || status === "reading" || status === "streaming";
  const shareResult = cast(values.map((value) => yaoFromValue(value as YaoValue)));
  const shareStatus =
    status === "done"
      ? "completed"
      : status === "stopped"
        ? "interrupted"
        : status === "error"
          ? answer
            ? "interrupted"
            : "failed"
          : null;

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
      {status === "idle" && (
        <div className="text-center">
          <p className="mb-3 text-sm text-[var(--ink-soft)]">
            卦象已明。可结合卦辞爻辞为你解卦，也可附上你的问题。
          </p>
          <button
            onClick={() => setStatus("dialog")}
            className="rounded-xl bg-[var(--accent)] px-8 py-3 text-lg font-medium text-white shadow-sm transition hover:bg-[var(--accent-dark)]"
          >
            ✦ 解卦
          </button>
        </div>
      )}

      {status === "dialog" && (
        <div className="fade-in-up">
          <p className="mb-2 text-sm font-medium text-[var(--ink)]">是否附上你的问题？</p>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
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

      {(isActive || status === "done" || status === "stopped" || status === "error") && (
        <div className="fade-in-up">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="font-serif-cn text-base font-bold text-[var(--ink)]">解卦</h3>
            {question && (
              <span className="max-w-[60%] truncate rounded-md bg-[var(--bg)] px-2 py-0.5 text-xs text-[var(--ink-soft)]">
                问：{question}
              </span>
            )}
          </div>

          {STATUS_LABELS[status] && (
            <p className="mb-3 text-sm text-[var(--ink-soft)]" aria-live="polite">
              {STATUS_LABELS[status]}
            </p>
          )}

          {answer ? (
            <div className="prose-yi rounded-xl bg-[var(--bg)]/60 p-4">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[
                  [rehypeAnnotate, { enabled: showPinyin, mode: "modern", quoteMode: "classical" }],
                ]}
              >
                {answer}
              </ReactMarkdown>
              {status === "streaming" && <span className="stream-cursor" />}
            </div>
          ) : (
            <div className="rounded-xl bg-[var(--bg)]/60 p-6 text-center text-sm text-[var(--ink-soft)]">
              {STATUS_LABELS[status] ?? ""}
            </div>
          )}

          {status === "error" && (
            <p className="mt-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-2.5 text-sm text-[var(--accent)]">
              解卦失败：{errorMsg}
            </p>
          )}
          {shareStatus && shareResult && !isActive && (
            <div className="mt-3 flex justify-end">
              <ShareLongImageButton
                result={shareResult}
                question={question}
                answer={answer}
                status={shareStatus}
                ts={castAt}
                showPinyin={showPinyin}
              />
            </div>
          )}


          <div className="mt-3 flex gap-2">
            {isActive ? (
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
