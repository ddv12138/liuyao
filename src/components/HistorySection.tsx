"use client";

// 占卦历史：localStorage 存储，列表摘要 → 独立详情页，支持删除与清空
import Link from "next/link";
import { AnnotatedText } from "@/components/AnnotatedText";
import { HexagramFigure } from "@/components/HexagramFigure";
import { getHistoryResult, type HistoryEntry, type HistoryStatus } from "@/lib/storage";

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_LABELS: Record<HistoryStatus, string> = {
  pending: "未解卦",
  generating: "生成中",
  completed: "已完成",
  failed: "解析失败",
  interrupted: "生成中断",
};

export function HistorySection({
  entries,
  showPinyin = true,
  onDelete,
  onClear,
}: {
  entries: HistoryEntry[];
  showPinyin?: boolean;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  if (entries.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif-cn text-lg font-bold text-[var(--ink)]">
          历史记录
          <span className="ml-1.5 text-xs font-normal text-[var(--ink-soft)]">{entries.length} 条</span>
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
        {entries.map((entry) => {
          const result = getHistoryResult(entry);
          const lines = result?.yaos.map((yao) => ({ yang: yao.yang, moving: yao.moving })) ??
            entry.values.map((value) => ({ yang: value === 7 || value === 9, moving: value === 6 || value === 9 }));
          const status = entry.status ?? (entry.answer ? "completed" : "pending");

          return (
            <li key={entry.id} className="rounded-xl border border-[var(--line)] bg-white/60">
              <Link
                href={`/history/${encodeURIComponent(entry.id)}`}
                className="flex items-center gap-3 px-3.5 py-3 transition hover:bg-[var(--bg)]/50"
              >
                <span className="history-figure shrink-0" aria-hidden="true">
                  <HexagramFigure lines={lines} size="compact" showMarkers />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-[var(--accent)]/10 px-1.5 py-0.5 text-xs font-bold text-[var(--accent)]">
                      <AnnotatedText text={entry.originalName} enabled={showPinyin} />
                    </span>
                    {entry.changedName && (
                      <span className="rounded-md bg-[var(--gold)]/15 px-1.5 py-0.5 text-xs font-bold text-[var(--gold)]">
                        → <AnnotatedText text={entry.changedName} enabled={showPinyin} />
                      </span>
                    )}
                    <span className="rounded-md bg-[var(--bg)] px-1.5 py-0.5 text-xs text-[var(--ink-soft)]">
                      {STATUS_LABELS[status]}
                    </span>
                  </span>
                  {entry.question ? (
                    <span className="mt-1 block truncate text-sm text-[var(--ink-soft)]">问：{entry.question}</span>
                  ) : (
                    <span className="mt-1 block text-xs text-[var(--ink-soft)]">未附问题</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-[var(--ink-soft)]">{fmtTime(entry.ts)}</span>
                <span className="shrink-0 text-[var(--ink-soft)]" aria-hidden="true">›</span>
              </Link>
              <div className="flex items-center justify-between border-t border-[var(--line)] px-3.5 py-2">
                <Link
                  href={`/history/${encodeURIComponent(entry.id)}`}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  查看详情
                </Link>
                <button
                  onClick={() => onDelete(entry.id)}
                  className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  删除本条
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
