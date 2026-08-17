"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AiSection } from "@/components/AiSection";
import { AnnotatedText } from "@/components/AnnotatedText";
import { HexagramResult } from "@/components/HexagramResult";
import { KeyGate } from "@/components/KeyGate";
import { ShareLongImageButton } from "@/components/ShareLongImageButton";
import { rehypeAnnotate } from "@/lib/rehype-annotate";
import {
  clearAccessKey,
  getAccessKey,
  setAccessKey,
  getHistoryEntry,
  getHistoryResult,
  HISTORY_EVENT,
  updateHistoryAnswer,
  updateHistoryStatus,
  type HistoryEntry,
} from "@/lib/storage";

function fmtTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString("zh-CN", { hour12: false });
}

const STATUS_LABELS = {
  pending: "未解卦",
  generating: "生成中",
  completed: "已完成",
  failed: "解析失败",
  interrupted: "生成中断",
} as const;

export function HistoryDetailClient({ id }: { id: string }) {
  const [ready, setReady] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [entry, setEntry] = useState<HistoryEntry | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const refresh = () => setEntry(getHistoryEntry(id));
    const timer = setTimeout(() => {
      setKey(getAccessKey());
      refresh();
      setReady(true);
    }, 0);
    window.addEventListener(HISTORY_EVENT, refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(HISTORY_EVENT, refresh);
    };
  }, [id]);

  if (!ready) return <div className="min-h-screen" />;
  if (!key) {
    return (
      <KeyGate
        onUnlock={(nextKey) => {
          setAccessKey(nextKey);
          setKey(nextKey);
        }}
      />
    );
  }
  if (!entry) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">← 返回起卦</Link>
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-8 text-center text-[var(--ink-soft)]">
          历史记录不存在或已被删除。
        </div>
      </main>
    );
  }

  const result = getHistoryResult(entry);
  if (!result) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">← 返回起卦</Link>
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-8 text-center text-[var(--accent)]">
          这条历史记录的卦象数据已损坏，无法还原。
        </div>
      </main>
    );
  }

  const currentEntry = entry;
  const status = currentEntry.status ?? (currentEntry.answer ? "completed" : "pending");

  function startRetry() {
    setRetrying(true);
  }

  function handleRetryStarted(question: string) {
    updateHistoryStatus(currentEntry.id, "generating", question);
  }

  function handleRetryFinished(
    answer: string,
    resultStatus: "completed" | "failed" | "interrupted",
    question: string,
  ) {
    updateHistoryAnswer(currentEntry.id, answer, resultStatus, question);
    setRetrying(false);
  }

  function lockout() {
    clearAccessKey();
    setKey(null);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 pb-16">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">← 返回起卦</Link>
        <button
          onClick={lockout}
          className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          退出
        </button>
      </header>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[var(--accent)]/10 px-2 py-1 text-xs font-bold text-[var(--accent)]">
            {STATUS_LABELS[status]}
          </span>
          <span className="text-xs text-[var(--ink-soft)]">起卦于 {fmtTime(entry.ts)}</span>
          {entry.interpretedAt && (
            <span className="text-xs text-[var(--ink-soft)]">· 解析于 {fmtTime(entry.interpretedAt)}</span>
          )}
        </div>
        <h1 className="mt-3 font-serif-cn text-2xl font-bold text-[var(--ink)]">
          <AnnotatedText text={entry.originalName} />
          {entry.changedName && <span className="text-[var(--gold)]"> → {entry.changedName}</span>}
        </h1>
        {entry.question && (
          <p className="mt-2 rounded-lg bg-[var(--bg)]/60 px-3 py-2 text-sm text-[var(--ink-soft)]">问：{entry.question}</p>
        )}
      </section>
      <HexagramResult result={result} />
      <div className="flex justify-end">
        <ShareLongImageButton
          result={result}
          question={entry.question}
          answer={entry.answer}
          status={status}
          ts={entry.ts}
        />
      </div>

      {entry.answer && !retrying && (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
          <h2 className="mb-3 font-serif-cn text-lg font-bold text-[var(--ink)]">解卦</h2>
          <div className="prose-yi rounded-xl bg-[var(--bg)]/60 p-4">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[[rehypeAnnotate, { enabled: true, mode: "modern", quoteMode: "classical" }]]}
            >
              {entry.answer}
            </ReactMarkdown>
          </div>
          {entry.truncated && (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">（本次解读因停止或中断而不完整）</p>
          )}
        </section>
      )}

      {!entry.answer && !retrying && (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 text-center shadow-sm">
          <p className="text-sm text-[var(--ink-soft)]">
            {status === "failed" ? "本次解析没有得到有效正文。" : status === "interrupted" ? "本次解读在输出过程中中断。" : "这次起卦还没有进行解卦。"}
          </p>
          <button
            onClick={startRetry}
            className="mt-3 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-dark)]"
          >
            重新解析
          </button>
        </section>
      )}

      {entry.answer && !retrying && (
        <div className="flex justify-center">
          <button
            onClick={startRetry}
            className="rounded-lg border border-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/5"
          >
            重新解析
          </button>
        </div>
      )}

      {retrying && (
        <AiSection
          key={`${entry.id}-${entry.attempts ?? 0}`}
          values={entry.values}
          apiKey={key}
          castAt={entry.ts}
          autoStart
          autoStartQuestion={entry.question ?? ""}
          onStarted={handleRetryStarted}
          onFinished={handleRetryFinished}
          onUnauthorized={lockout}
        />
      )}
    </main>
  );
}
