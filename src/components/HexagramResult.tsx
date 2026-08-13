"use client";

// 卦象与原文展示：本卦（卦辞 + 动爻爻辞/静卦提示）+ 变卦（卦辞 + 变爻爻辞）
// 此阶段不涉及大模型
import { useEffect, useState } from "react";
import {
  formatYaoPosition,
  getInterpretationGuide,
  getYaoAnnotations,
  type CastResult,
  type YaoAnnotation,
} from "@/lib/divination";
import { AnnotatedText } from "@/components/AnnotatedText";
import { HexagramFigure, type LineSpec } from "@/components/HexagramFigure";

export function HexagramResult({
  result,
  showPinyin = true,
}: {
  result: CastResult;
  showPinyin?: boolean;
}) {
  const { original, changed, moving, yaos } = result;
  const guide = getInterpretationGuide(result);
  const [showAllLines, setShowAllLines] = useState(false);
  const [openInfoId, setOpenInfoId] = useState<string | null>(null);
  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-yao-info-surface]")) return;
      setOpenInfoId(null);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);
  const isStatic = moving.length === 0;
  const originalAnnotations = getYaoAnnotations(result, "original");
  const changedAnnotations = changed ? getYaoAnnotations(result, "changed") : [];
  const originalLines: LineSpec[] = yaos.map((yao, index) => {
    const name = original.lines[index]?.name ?? `第${index + 1}爻`;
    const annotation = originalAnnotations[index];
    return {
      yang: yao.yang,
      moving: yao.moving,
      label: getAnnotationLabel(index, name, annotation, showAllLines),
      labelTone: annotation?.tone ?? "neutral",
      info: getYaoInfo("本卦", name, annotation, original.lines[index]?.text ?? ""),
    };
  });
  const changedLines: LineSpec[] = changed
    ? changed.bits.map((bit, index) => {
        const name = changed.lines[index]?.name ?? `第${index + 1}爻`;
        const annotation = changedAnnotations[index];
        return {
          yang: bit === 1,
          label: getAnnotationLabel(index, name, annotation, showAllLines),
          labelTone: annotation?.tone ?? "neutral",
          info: getYaoInfo("变卦", name, annotation, changed.lines[index]?.text ?? ""),
        };
      })
    : [];
  const toggleInfo = (id: string) => {
    setOpenInfoId((current) => (current === id ? null : id));
  };

  return (
    <section className="fade-in-up grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2 rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-4 py-3 text-sm text-[var(--ink-soft)]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-medium text-[var(--gold)]">传统取辞</span>
          <span className="flex-1">{guide.rule}</span>
          {guide.special && (
            <span className="rounded-md bg-[var(--accent)]/10 px-2 py-0.5 font-medium text-[var(--accent)]">
              {guide.special} · 主断
            </span>
          )}
          <button
            type="button"
            aria-pressed={showAllLines}
            onClick={() => {
              setShowAllLines((current) => !current);
              setOpenInfoId(null);
            }}
            className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {showAllLines ? "收起爻位" : "显示全部爻位"}
          </button>
        </div>
      </div>

      <div className="relative rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
        <div className="mb-3 flex justify-center">
          <HexagramFigure
            lines={originalLines}
            size="normal"
            showLabels={showAllLines}
            showInfo={!showAllLines}
            infoIdPrefix="original"
            openInfoId={openInfoId}
            onInfoToggle={toggleInfo}
          />
        </div>
        <span className="absolute left-5 top-5 rounded-md bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">
          本卦
        </span>
        <div className="mb-3 text-center">
          <h3 className="font-serif-cn text-2xl font-bold text-[var(--ink)]">
            <AnnotatedText text={original.name} enabled={showPinyin} />
          </h3>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            <AnnotatedText text={original.image} enabled={showPinyin} /> ·{" "}
            <AnnotatedText
              text={`${original.lower}下${original.upper}上`}
              enabled={showPinyin}
            />
          </p>
        </div>

        <div className="rounded-xl bg-[var(--bg)]/60 p-3">
          <div className="mb-1 text-xs text-[var(--gold)]">卦辞</div>
          <p className="font-serif-cn text-[0.95rem] leading-relaxed">
            <AnnotatedText text={original.guaci} enabled={showPinyin} />
          </p>
        </div>

        {isStatic ? (
          <p className="mt-3 rounded-lg border border-dashed border-[var(--line)] p-2.5 text-center text-sm text-[var(--ink-soft)]">
            静卦 · 无动爻，以本卦卦辞为断
          </p>
        ) : (
          <div className="mt-3">
            <div className="mb-1.5 text-xs text-[var(--gold)]">
              动爻爻辞（{moving.length} 爻动）
            </div>
            <ul className="space-y-1.5">
              {moving.map((i) => (
                <LineItem
                  key={i}
                  name={original.lines[i]?.name ?? ""}
                  text={original.lines[i]?.text ?? ""}
                  badge={yaos[i].yang ? "○" : "×"}
                  badgeTone="move"
                  showPinyin={showPinyin}
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      {changed && (
        <div className="relative fade-in-up rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
          <div className="mb-3 flex justify-center">
            <HexagramFigure
              lines={changedLines}
              size="normal"
              showMarkers={false}
              showLabels={showAllLines}
              showInfo={!showAllLines}
              infoIdPrefix="changed"
              openInfoId={openInfoId}
              onInfoToggle={toggleInfo}
            />
          </div>
          <span className="absolute left-5 top-5 rounded-md bg-[var(--gold)] px-2 py-0.5 text-xs font-medium text-white">
            变卦
          </span>
          <div className="mb-3 text-center">
            <h3 className="font-serif-cn text-2xl font-bold text-[var(--ink)]">
              <AnnotatedText text={changed.name} enabled={showPinyin} />
            </h3>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              <AnnotatedText text={changed.image} enabled={showPinyin} /> ·{" "}
              <AnnotatedText
                text={`${changed.lower}下${changed.upper}上`}
                enabled={showPinyin}
              />
            </p>
          </div>

          <div className="rounded-xl bg-[var(--bg)]/60 p-3">
            <div className="mb-1 text-xs text-[var(--gold)]">变卦卦辞</div>
            <p className="font-serif-cn text-[0.95rem] leading-relaxed">
              <AnnotatedText text={changed.guaci} enabled={showPinyin} />
            </p>
          </div>

          <div className="mt-3">
            <div className="mb-1.5 text-xs text-[var(--gold)]">变爻爻辞</div>
            <ul className="space-y-1.5">
              {moving.map((i) => (
                <LineItem
                  key={i}
                  name={changed.lines[i]?.name ?? ""}
                  text={changed.lines[i]?.text ?? ""}
                  badge="变爻"
                  badgeTone="bian"
                  showPinyin={showPinyin}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function getAnnotationLabel(
  index: number,
  name: string,
  annotation: YaoAnnotation | null | undefined,
  showAllLines: boolean,
): string | undefined {
  if (!annotation) return showAllLines ? formatYaoPosition(index, name) : undefined;
  if (!showAllLines) return annotation.text;
  const suffix = annotation.text.startsWith(name)
    ? annotation.text.slice(name.length).replace(/^ · /, "")
    : annotation.text;
  return `${formatYaoPosition(index, name)} · ${suffix}`;
}

function getYaoInfo(
  section: string,
  name: string,
  annotation: YaoAnnotation | null | undefined,
  text: string,
): LineSpec["info"] {
  if (!annotation) return undefined;
  const relation = annotation.text.startsWith(name)
    ? annotation.text.slice(name.length).replace(/^ · /, "")
    : annotation.text;
  return { title: `${section} · ${name}`, relation, text };
}
function LineItem({
  name,
  text,
  badge,
  badgeTone,
  showPinyin,
}: {
  name: string;
  text: string;
  badge: string;
  badgeTone: "move" | "bian";
  showPinyin: boolean;
}) {
  return (
    <li className="flex items-start gap-2 rounded-lg bg-[var(--bg)]/60 px-3 py-2">
      <span
        className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${
          badgeTone === "move"
            ? "bg-[var(--accent)]/10 text-[var(--accent)]"
            : "bg-[var(--gold)]/15 text-[var(--gold)]"
        }`}
      >
        {badge}
      </span>
      <span className="font-serif-cn text-sm leading-relaxed">
        <b className="mr-1 font-bold text-[var(--ink)]">
          <AnnotatedText text={name} enabled={showPinyin} />
        </b>
        <AnnotatedText text={text} enabled={showPinyin} />
      </span>
    </li>
  );
}
