import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HexagramFigure } from "@/components/HexagramFigure";

function count(markup: string, fragment: string): number {
  return markup.split(fragment).length - 1;
}

describe("HexagramFigure", () => {
  it("maps yin/yang and moving states to SVG primitives", () => {
    const markup = renderToStaticMarkup(
      <HexagramFigure
        lines={[
          { yang: true, moving: false },
          { yang: false, moving: false },
          { yang: true, moving: true },
          { yang: false, moving: true },
        ]}
      />,
    );

    // Two yang bars plus two segments for each of the two yin lines.
    expect(count(markup, 'class="yao-svg-bar"')).toBe(3);
    expect(count(markup, 'class="yao-svg-bar yao-svg-bar-moving"')).toBe(3);
    expect(count(markup, 'class="yao-svg-marker"')).toBe(2);
    expect(markup).toContain('<circle class="yao-svg-marker"');
    expect(markup).toContain('<path class="yao-svg-marker"');
  });

  it("renders lines from the upper line to the first line", () => {
    const markup = renderToStaticMarkup(
      <HexagramFigure
        lines={[
          { yang: true, label: "初爻" },
          { yang: false, label: "二爻" },
          { yang: true, label: "上爻" },
        ]}
        showLabels
      />,
    );

    expect(markup.indexOf("上爻")).toBeLessThan(markup.indexOf("二爻"));
    expect(markup.indexOf("二爻")).toBeLessThan(markup.indexOf("初爻"));
  });

  it("renders an empty line as an SVG placeholder", () => {
    const markup = renderToStaticMarkup(<HexagramFigure lines={[null]} />);

    expect(count(markup, 'class="yao-svg-placeholder"')).toBe(1);
    expect(count(markup, 'class="yao-svg-bar"')).toBe(0);
    expect(markup).toContain('viewBox="0 0 240 20"');
    expect(markup).not.toContain("yao-svg-marker");
  });

  it("keeps the same SVG geometry when markers are disabled", () => {
    const markup = renderToStaticMarkup(
      <HexagramFigure lines={[{ yang: true, moving: true }]} showMarkers={false} />,
    );

    expect(markup).toContain('viewBox="0 0 240 20"');
    expect(markup).not.toContain("yao-svg-marker");
    expect(markup).toContain('class="yao-svg-bar yao-svg-bar-moving"');
  });

  it("renders info slots only for non-moving annotated rows", () => {
    const markup = renderToStaticMarkup(
      <HexagramFigure
        lines={[
          { yang: true, moving: false, info: { title: "九五", relation: "主断", text: "飞龙在天" } },
          { yang: true, moving: true, info: { title: "初九", relation: "动爻", text: "潜龙勿用" } },
        ]}
        showInfo
      />,
    );

    expect(count(markup, "yao-info-slot")).toBe(1);
    expect(count(markup, "yao-info-trigger")).toBe(1);
  });

  it("marks moving yao by color and omits its info slot", () => {
    const markup = renderToStaticMarkup(
      <HexagramFigure
        lines={[
          { yang: true, moving: true, info: { title: "初九", relation: "动爻", text: "潜龙勿用" } },
          { yang: false, moving: false },
        ]}
        showInfo
      />,
    );

    expect(count(markup, "yao-info-slot")).toBe(0);
    expect(count(markup, "yao-svg-bar-moving")).toBe(1);
  });
});
