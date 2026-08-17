"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HexagramResult } from "@/components/HexagramResult";
import { rehypeAnnotate } from "@/lib/rehype-annotate";
import type { CastResult } from "@/lib/divination";
import type { HistoryStatus } from "@/lib/storage";

const STATUS_LABELS: Record<HistoryStatus, string> = {
  pending: "未进行解卦",
  generating: "解卦生成中",
  completed: "解卦完成",
  failed: "解析失败",
  interrupted: "生成中断",
};

export function ShareLongImageButton({
  result,
  question,
  answer,
  status,
  ts,

  showPinyin = false,
}: {
  result: CastResult;
  question?: string;
  answer?: string;
  status: HistoryStatus;
  ts: number;
  showPinyin?: boolean;
}) {
  const renderRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function share() {
    if (!renderRef.current || busy) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(renderRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#f7f3ea",
      });
      const file = await dataUrlToFile(dataUrl, `六爻-${result.original.name}.png`);
      const canShareFiles =
        typeof navigator.share === "function" &&
        (!navigator.canShare || navigator.canShare({ files: [file] }));

      if (canShareFiles) {
        try {
          await navigator.share({
            title: `六爻占卦 · ${result.original.name}`,
            text: question ? `问：${question}` : "六爻占卦结果",
            files: [file],
          });
        } catch (error) {
          if ((error as Error)?.name !== "AbortError") downloadDataUrl(dataUrl, file.name);
        }
      } else {
        downloadDataUrl(dataUrl, file.name);
      }
    } catch {
      // 图片生成失败时不打断占卦页面，按钮会恢复可用以便再次尝试。
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="rounded-lg border border-[var(--gold)] px-4 py-2.5 text-sm font-medium text-[var(--gold)] transition hover:bg-[var(--gold)]/10 disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "正在生成长图…" : "分享长图"}
      </button>
      <div ref={renderRef} className="share-render-root" aria-hidden="true">
        <div className="share-render-header">
          <div className="share-render-brand">六爻占卦</div>
          <div className="share-render-date">{new Date(ts).toLocaleString("zh-CN", { hour12: false })}</div>
        </div>
        <div className="share-render-status">{STATUS_LABELS[status]}</div>
        {question && (
          <div className="share-render-question">
            <strong>所问</strong>
            <p>{question}</p>
          </div>
        )}
        <HexagramResult result={result} showPinyin={showPinyin} shareMode />
        <section className="share-render-answer">
          <h2>解卦</h2>
          {answer ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[[rehypeAnnotate, { enabled: showPinyin, mode: "modern", quoteMode: "classical" }]]}
            >
              {answer}
            </ReactMarkdown>
          ) : (
            <p>本次没有生成有效的 AI 解读，以上为当时卦象快照。</p>
          )}
        </section>
        <p className="share-render-disclaimer">
          本内容仅供传统文化研究与个人参考，不构成医疗、法律、投资或其他专业建议。
        </p>
      </div>
    </>
  );
}

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const response = await fetch(dataUrl);
  return new File([await response.blob()], name, { type: "image/png" });
}

function downloadDataUrl(dataUrl: string, name: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = name;
  link.click();
}
