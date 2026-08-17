"use client";

// 卦象六爻图：数据自下而上保存，视觉从上爻到初爻显示。阳爻实线，阴爻两段；动爻用 SVG 圆环/交叉标记。
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
              <svg
                className="yao-svg"
                viewBox="0 0 240 20"
                shapeRendering="geometricPrecision"
                aria-hidden="true"
                focusable="false"
              >
                {spec ? (
                  spec.yang ? (
                    <rect
                      className={`yao-svg-bar${spec.moving ? " yao-svg-bar-moving" : ""}`}
                      x="0"
                      y="5"
                      width="190"
                      height="10"
                      rx="1.8"
                    />
                  ) : (
                    <>
                      <rect
                        className={`yao-svg-bar${spec.moving ? " yao-svg-bar-moving" : ""}`}
                        x="0"
                        y="5"
                        width="87"
                        height="10"
                        rx="1.8"
                      />
                      <rect
                        className={`yao-svg-bar${spec.moving ? " yao-svg-bar-moving" : ""}`}
                        x="103"
                        y="5"
                        width="87"
                        height="10"
                        rx="1.8"
                      />
                    </>
                  )
                ) : (
                  <rect className="yao-svg-placeholder" x="0.75" y="5.25" width="188.5" height="9.5" rx="1.8" />
                )}
                {showMarkers && spec?.moving ? (
                  spec.yang ? (
                    <circle className="yao-svg-marker" cx="220" cy="10" r="5.5" />
                  ) : (
                    <path className="yao-svg-marker" d="M215 5 L225 15 M225 5 L215 15" />
                  )
                ) : null}
              </svg>
            </div>
            {showInfo && spec?.info && !spec?.moving && (
              <span className="yao-info-slot">
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
              </span>
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
