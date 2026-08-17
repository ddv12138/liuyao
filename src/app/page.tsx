"use client";

// 主页面：门禁 → 起卦 → 卦象/原文 → 解卦（流式）→ 历史
import { useEffect, useRef, useState } from "react";
import {
  cast,
  tossYao,
  type CastResult,
  type TossedYao,
} from "@/lib/divination";
import {
  getAccessKey,
  setAccessKey,
  clearAccessKey,
  loadHistory,
  addHistoryEntry,
  updateHistoryStatus,
  updateHistoryAnswer,
  deleteHistoryEntry,
  clearHistory,
  type HistoryEntry,
  HISTORY_EVENT,
} from "@/lib/storage";
import { KeyGate } from "@/components/KeyGate";
import { CastArea } from "@/components/CastArea";
import { HexagramResult } from "@/components/HexagramResult";
import { AiSection, type AiFinishStatus } from "@/components/AiSection";
import { HistorySection } from "@/components/HistorySection";

export default function Page() {
  // 门禁：null=未确认，string=已存 key；booting 期间不渲染门禁避免闪烁
  const [key, setKey] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  const [yaos, setYaos] = useState<TossedYao[]>([]);
  const [castAt, setCastAt] = useState<number | null>(null);
  const [tossing, setTossing] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showPinyin, setShowPinyin] = useState(true);
  const historyIdRef = useRef<string | null>(null);
  const tossTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始读取 localStorage 里的口令（异步执行，避免 effect 内同步 setState）
  useEffect(() => {
    const k = getAccessKey();
    const t = setTimeout(() => {
      setKey(k);
      setBooting(false);
      setHistory(loadHistory());
      setShowPinyin(window.localStorage.getItem("liuyao_show_pinyin") !== "0");
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // 历史记录由 storage 变更事件驱动刷新
  useEffect(() => {
    const refresh = () => setHistory(loadHistory());
    window.addEventListener(HISTORY_EVENT, refresh);
    return () => window.removeEventListener(HISTORY_EVENT, refresh);
  }, []);

  useEffect(
    () => () => {
      if (tossTimer.current) clearTimeout(tossTimer.current);
    },
    [],
  );

  // 起卦：点击 → 动画 750ms → 出爻；第六爻落下即成卦并写入历史
  function handleToss() {
    if (tossing || yaos.length >= 6) return;
    setTossing(true);
    tossTimer.current = setTimeout(() => {
      const next = [...yaos, tossYao()];
      setYaos(next);
      setTossing(false);
      if (next.length === 6) {
        const r = cast(next);
        if (r) {
          setCastAt(Date.now());
          historyIdRef.current = addHistoryEntry({
            cast: r,
            values: next.map((y) => y.value),
            originalName: r.original.name,
            originalImage: r.original.image,
            changedName: r.changed?.name,
            changedImage: r.changed?.image,
          });
        }
      }
    }, 750);
  }

  // 渲染期派生成卦结果（无 setState）
  const result: CastResult | null = yaos.length === 6 ? cast(yaos) : null;

  function reset() {
    setYaos([]);
    setCastAt(null);
    historyIdRef.current = null;
  }

  function handleStarted(question: string) {
    if (historyIdRef.current) {
      updateHistoryStatus(historyIdRef.current, "generating", question);
    }
  }

  function handleFinished(
    answer: string,
    status: AiFinishStatus,
    question: string,
  ) {
    if (historyIdRef.current) {
      updateHistoryAnswer(historyIdRef.current, answer, status, question);
    }
  }

  function lockout() {
    clearAccessKey();
    setKey(null);
  }

  if (booting) {
    return <div className="min-h-screen" />;
  }

  if (!key) {
    return (
      <KeyGate
        onUnlock={(k) => {
          setAccessKey(k);
          setKey(k);
        }}
      />
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 pb-16">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif-cn text-2xl font-bold text-[var(--ink)]">
            六爻占卦
          </h1>
          <p className="text-xs text-[var(--ink-soft)]">
            铜钱起卦 · 卦辞爻辞 · 解卦
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !showPinyin;
              setShowPinyin(next);
              window.localStorage.setItem(
                "liuyao_show_pinyin",
                next ? "1" : "0",
              );
            }}
            aria-pressed={showPinyin}
            className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            title="显示或隐藏生僻字注音"
          >
            注音 {showPinyin ? "开" : "关"}
          </button>
          <button
            onClick={lockout}
            className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            title="清除口令并退出"
          >
            退出
          </button>
        </div>
      </header>

      <CastArea
        yaos={yaos}
        tossing={tossing}
        onToss={handleToss}
        onRestart={reset}
      />

      {result && (
        <>
          <HexagramResult result={result} showPinyin={showPinyin} />
          <AiSection
            values={result.yaos.map((y) => y.value)}
            apiKey={key}
            castAt={castAt ?? 0}
            showPinyin={showPinyin}
            onStarted={handleStarted}
            onFinished={handleFinished}
            onUnauthorized={lockout}
          />
          <div className="flex justify-center">
            <button
              onClick={reset}
              className="rounded-lg border border-[var(--line)] px-6 py-2.5 text-sm text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              再占一次
            </button>
          </div>
        </>
      )}

      <HistorySection
        entries={history}
        showPinyin={showPinyin}
        onDelete={(id) => {
          deleteHistoryEntry(id);
        }}
        onClear={() => {
          clearHistory();
        }}
      />
    </main>
  );
}
