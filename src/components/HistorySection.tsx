"use client";

// 占卦历史：localStorage 存储，可展开查看，支持单条删除与清空
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { HistoryEntry } from "@/lib/storage";

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function HistorySection({
  entries,
  onDelete,
  onClear,
}: {
  entries: HistoryEntry[];
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (entries.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif-cn text-lg font-bold text-[var(--ink)]">
          历史记录<span className="ml-1.5 text-xs font-normal text-[var(--ink-soft)]">{entries.length} 条</span>
        </h2>
        <button
          onClick={() => {
            if (window.confirm("确定清空全部历史记录？")) onClear();
          }}
          className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          清空
        </button>
      </div>

      <ul className="space-y-2">
        {entries.map((e) => {
          const open = openId === e.id;
          return (
            <li key={e.id} className="rounded-xl border border-[var(--line)] bg-white/60">
              <button
                onClick={() => setOpenId(open ? null : e.id)}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
              >
                <span className="shrink-0 rounded-md bg-[var(--accent)]/10 px-1.5 py-0.5 text-xs font-bold text-[var(--accent)]">
                  {e.originalName}
                </span>
                {e.changedName && (
                  <span className="shrink-0 rounded-md bg-[var(--gold)]/15 px-1.5 py-0.5 text-xs font-bold text-[var(--gold)]">
                    → {e.changedName}
                  </span>
                )}
                {e.question ? (
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--ink-soft)]">问：{e.question}</span>
                ) : (
                  <span className="flex-1 text-xs text-[var(--line)]">未附问题</span>
                )}
                <span className="shrink-0 text-xs text-[var(--ink-soft)]">{fmtTime(e.ts)}</span>
                <span className="shrink-0 text-[var(--ink-soft)]">{open ? "▾" : "▸"}</span>
              </button>

              {open && (
                <div className="border-t border-[var(--line)] px-4 py-3">
                  {e.answer ? (
                    <>
                      <div className="prose-yi text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{e.answer}</ReactMarkdown>
                      </div>
                      {e.truncated && (
                        <p className="mt-2 text-xs text-[var(--ink-soft)]">（因停止或中断，解析不完整）</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-[var(--ink-soft)]">本次只起卦，未进行 AI 解卦。</p>
                  )}
                  <div className="mt-3 text-right">
                    <button
                      onClick={() => onDelete(e.id)}
                      className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      删除本条
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
