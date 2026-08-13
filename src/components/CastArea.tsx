"use client";

// 起卦区：掷三枚铜钱得一爻，自下而上逐爻绘制；无重抛，可放弃重起
import { cast, formatYaoPosition, type TossedYao } from "@/lib/divination";
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
  const lastYao = yaos[nextIndex - 1];
  const completedCast = done ? cast(yaos) : null;
  const figureLines = [
    ...yaos.map((y, index) => ({
      yang: y.yang,
      moving: y.moving,
      label: completedCast
        ? formatYaoPosition(index, completedCast.original.lines[index]?.name ?? y.label)
        : undefined,
    })),
    ...Array(Math.max(0, 6 - yaos.length)).fill(null),
  ];

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif-cn text-lg font-bold text-[var(--ink)]">
          起卦
        </h2>
        {yaos.length > 0 && !done && (
          <button
            onClick={onRestart}
            className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            放弃重起
          </button>
        )}
      </div>

      <div
        className="mb-5 flex justify-center"
        aria-label={`已掷 ${yaos.length} 爻`}
      >
        <HexagramFigure lines={figureLines} size="compact" showLabels={done} />
      </div>

      {!done ? (
        <>
          <p className="mb-4 text-center text-sm text-[var(--ink-soft)]">
            掷 {6 - nextIndex} 次，每次点击掷三枚铜钱（自下而上得{nextIndex + 1}
            爻）
          </p>

          <div
            className="mb-3 flex items-center justify-center gap-4"
            aria-live="polite"
          >
            {(tossing
              ? [true, true, true]
              : (lastYao?.coins ?? [false, false, false])
            ).map((back, i) => (
              <Coin
                key={i}
                back={back}
                flipping={tossing}
                placeholder={!tossing && !lastYao}
              />
            ))}
          </div>
          {lastYao && !tossing && <CoinSummary yao={lastYao} />}

          <button
            onClick={onToss}
            disabled={tossing}
            className="mt-3 w-full rounded-xl bg-[var(--accent)] py-3 text-lg font-medium text-white shadow-sm transition hover:bg-[var(--accent-dark)] disabled:opacity-60"
          >
            {tossing
              ? "掷爻中…"
              : `掷第 ${nextIndex + 1} 爻（${POS_NAMES[nextIndex]}）`}
          </button>
        </>
      ) : (
        <p className="text-center text-sm font-medium text-[var(--ink-soft)]">
          六爻已齐
        </p>
      )}
    </section>
  );
}

function Coin({
  back,
  flipping,
  placeholder,
}: {
  back: boolean;
  flipping: boolean;
  placeholder: boolean;
}) {
  return (
    <div
      className="coin-scene"
      aria-label={placeholder ? "待掷铜钱" : back ? "铜钱背面" : "铜钱字面"}
    >
      <div
        className={`coin ${back ? "coin-show-back" : ""} ${flipping ? "coin-flipping" : ""}`}
      >
        <CoinFace />
        <CoinBack />
      </div>
    </div>
  );
}

function CoinFace() {
  return (
    <div className="coin-face" aria-hidden="true">
      <span className="coin-inscription coin-inscription-top">洪</span>
      <span className="coin-inscription coin-inscription-right">武</span>
      <span className="coin-inscription coin-inscription-bottom">通</span>
      <span className="coin-inscription coin-inscription-left">宝</span>
      <span className="coin-hole" />
    </div>
  );
}

function CoinBack() {
  return (
    <div className="coin-face coin-face-back" aria-hidden="true">
      <span className="coin-inscription coin-back-mark">十</span>
      <span className="coin-hole" />
    </div>
  );
}

function CoinSummary({ yao }: { yao: TossedYao }) {
  const backWord = ["零", "一", "二", "三"][yao.backs];
  const wordWord = ["三", "二", "一", "零"][yao.backs];
  return (
    <p className="coin-summary">
      {backWord}背{wordWord}字 → {yao.label}
    </p>
  );
}
