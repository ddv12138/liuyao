"use client";

// 起卦区：掷三枚铜钱得一爻，自下而上逐爻绘制；无重抛，可放弃重起
import type { TossedYao } from "@/lib/divination";
import { HexagramFigure } from "@/components/HexagramFigure";

const POS_NAMES = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

export function CastArea({
  yaos,
  tossing,
  onToss,
  onRestart,
}: {
  yaos: TossedYao[];
  tossing: boolean;
  onToss: () => void;
  onRestart: () => void;
}) {
  const done = yaos.length === 6;
  const nextIndex = yaos.length;

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif-cn text-lg font-bold text-[var(--ink)]">起卦</h2>
        {yaos.length > 0 && !done && (
          <button
            onClick={onRestart}
            className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            放弃重起
          </button>
        )}
      </div>

      {!done ? (
        <>
          <p className="mb-4 text-sm text-[var(--ink-soft)]">
            掷 {6 - nextIndex} 次，每次点击掷三枚铜钱（自下而上得{nextIndex + 1}爻）
          </p>

          {/* 铜钱区 */}
          <div className="mb-5 flex items-center justify-center gap-4">
            {tossing ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="coin coin-flipping coin-back">
                  爻
                </div>
              ))
            ) : yaos[nextIndex - 1] ? (
              yaos[nextIndex - 1].coins.map((back, i) => (
                <div key={i} className={`coin ${back ? "coin-back" : ""} fade-in-up`}>
                  {back ? "背" : "字"}
                </div>
              ))
            ) : (
              [0, 1, 2].map((i) => (
                <div key={i} className="coin opacity-25">
                  卦
                </div>
              ))
            )}
          </div>

          <button
            onClick={onToss}
            disabled={tossing}
            className="w-full rounded-xl bg-[var(--accent)] py-3 text-lg font-medium text-white shadow-sm transition hover:bg-[var(--accent-dark)] disabled:opacity-60"
          >
            {tossing ? "掷爻中…" : `掷第 ${nextIndex + 1} 爻（${POS_NAMES[nextIndex]}）`}
          </button>
        </>
      ) : (
        <p className="mb-3 text-sm font-medium text-[var(--ink-soft)]">六爻已齐</p>
      )}

      {/* 已掷出的爻，自下而上 */}
      <div className="mt-5 flex justify-center">
        <HexagramFigure lines={[...yaos, ...Array(Math.max(0, 6 - yaos.length)).fill(null)]} />
      </div>
    </section>
  );
}
