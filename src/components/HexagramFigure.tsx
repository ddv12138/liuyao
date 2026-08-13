"use client";

// 卦象六爻图：自下而上绘制。阳爻实线，阴爻两段；动爻标 ○/×
export interface LineSpec {
  yang: boolean;
  moving?: boolean;
}

export function HexagramFigure({
  lines,
  className = "",
}: {
  lines: (LineSpec | null)[];
  className?: string;
}) {
  // 从最上爻画到最下爻（lines[0] = 初爻在底部）
  const rows = [...lines].reverse();
  return (
    <div className={`flex flex-col gap-[0.35rem] ${className}`} aria-hidden>
      {rows.map((spec, i) => {
        if (!spec) {
          return (
            <div key={i} className="yao-line justify-center">
              <div className="h-[0.5rem] w-24 rounded-sm border border-dashed border-[var(--line)]" />
            </div>
          );
        }
        const idx = rows.length - 1 - i; // 原始索引（自下而上）
        return (
          <div key={i} className="yao-line yao-appear justify-center">
            {spec.yang ? (
              <div className="yao-bar w-24" />
            ) : (
              <>
                <div className="yao-bar w-[2.8rem] yao-bar-yin-left" />
                <div className="yao-bar w-[2.8rem]" />
              </>
            )}
            {spec.moving && <span className="yao-marker">{spec.yang ? "○" : "×"}</span>}
            <span className="sr-only">{spec.yang ? "阳爻" : "阴爻"}{spec.moving ? "动" : ""} 第{idx + 1}爻</span>
          </div>
        );
      })}
    </div>
  );
}
