"use client";

// 卦象六爻图：自下而上绘制。阳爻实线，阴爻两段；动爻标 ○/×。
export interface YaoInfo {
  title: string;
  relation: string;
  text: string;
}

export interface LineSpec {
  yang: boolean;
  moving?: boolean;
  label?: string;
  labelTone?: "primary" | "secondary" | "changed" | "neutral";
  info?: YaoInfo;
}

export function HexagramFigure({
  lines,
  className = "",
  size = "normal",
  showMarkers = true,
  showLabels = false,
  showInfo = false,
  infoIdPrefix = "yao",
  openInfoId = null,
  onInfoToggle,
}: {
  lines: (LineSpec | null)[];
  className?: string;
  size?: "compact" | "normal";
  showMarkers?: boolean;
  showLabels?: boolean;
  showInfo?: boolean;
  infoIdPrefix?: string;
  openInfoId?: string | null;
  onInfoToggle?: (id: string) => void;
}) {
  // 从最上爻画到最下爻（lines[0] = 初爻在底部）。
  const rows = [...lines].reverse();
  return (
    <div
      className={`hexagram-figure ${size === "compact" ? "hexagram-compact" : "hexagram-normal"} ${showLabels ? "hexagram-with-labels" : ""} ${showInfo ? "hexagram-with-info" : ""} ${className}`}
    >
      {rows.map((spec, i) => {
        const idx = rows.length - 1 - i;
        const infoId = `${infoIdPrefix}-${idx}`;
        const infoOpen = Boolean(spec?.info && openInfoId === infoId);
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
            {showInfo && spec?.info && (
              <>
                <button
                  type="button"
                  className="yao-info-trigger"
                  data-yao-info-surface
                  aria-label={`查看${spec.info.title}信息`}
                  aria-expanded={infoOpen}
                  onClick={() => onInfoToggle?.(infoId)}
                >
                  ⓘ
                </button>
                {infoOpen && (
                  <div
                    className="yao-info-popover"
                    data-yao-info-surface
                    role="dialog"
                    aria-label={`${spec.info.title}信息`}
                  >
                    <strong>{spec.info.title}</strong>
                    <span>{spec.info.relation}</span>
                    <p>{spec.info.text}</p>
                  </div>
                )}
              </>
            )}
            {showLabels && (
              <span
                className={`yao-label yao-label-${spec?.labelTone ?? "neutral"}`}
                aria-hidden={!spec?.label}
              >
                {spec?.label ?? "\u00a0"}
              </span>
            )}
            {spec && (
              <span className="sr-only">
                {spec.yang ? "阳爻" : "阴爻"}
                {spec.moving ? "动" : ""} 第{idx + 1}爻
                {spec.label ? `，${spec.label}` : ""}
                {spec.info ? `，${spec.info.relation}` : ""}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
