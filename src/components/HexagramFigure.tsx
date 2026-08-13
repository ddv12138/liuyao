"use client";

// 卦象六爻图：自下而上绘制。阳爻实线，阴爻两段；动爻标 ○/×。
export interface LineSpec {
  yang: boolean;
  moving?: boolean;
}

export function HexagramFigure({
  lines,
  className = "",
  size = "normal",
  showMarkers = true,
}: {
  lines: (LineSpec | null)[];
  className?: string;
  size?: "compact" | "normal";
  showMarkers?: boolean;
}) {
  // 从最上爻画到最下爻（lines[0] = 初爻在底部）。
  const rows = [...lines].reverse();
  return (
    <div
      className={`hexagram-figure ${size === "compact" ? "hexagram-compact" : "hexagram-normal"} ${className}`}
    >
      {rows.map((spec, i) => {
        const idx = rows.length - 1 - i;
        return (
          <div key={i} className="yao-line yao-appear">
            <div className="yao-track">
              {spec ? (
                spec.yang ? (
                  <div className="yao-bar" />
                ) : (
                  <>
                    <div className="yao-bar yao-yin-segment" />
                    <div className="yao-bar yao-yin-segment" />
                  </>
                )
              ) : (
                <div className="yao-placeholder" />
              )}
            </div>
            {showMarkers && (
              <span
                className={`yao-marker ${spec?.moving ? "yao-marker-visible" : ""}`}
              >
                {spec?.moving ? (spec.yang ? "○" : "×") : "\u00a0"}
              </span>
            )}
            {spec && (
              <span className="sr-only">
                {spec.yang ? "阳爻" : "阴爻"}
                {spec.moving ? "动" : ""} 第{idx + 1}爻
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
