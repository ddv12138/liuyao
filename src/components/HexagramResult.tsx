"use client";

// 卦象与原文展示：本卦（卦辞 + 动爻爻辞/静卦提示）+ 变卦（卦辞 + 变爻爻辞）
// 此阶段不涉及大模型
import type { CastResult } from "@/lib/divination";
import { AnnotatedText } from "@/components/AnnotatedText";
import { HexagramFigure } from "@/components/HexagramFigure";

export function HexagramResult({
  result,
  showPinyin = true,
}: {
  result: CastResult;
  showPinyin?: boolean;
}) {
  const { original, changed, moving, yaos } = result;
  const isStatic = moving.length === 0;

  return (
    <section className="fade-in-up grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
        <div className="mb-3 flex justify-center">
          <HexagramFigure
            lines={yaos.map((y) => ({ yang: y.yang, moving: y.moving }))}
            size="normal"
          />
        </div>
        <div className="mb-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="rounded-md bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">
              本卦
            </span>
            <h3 className="font-serif-cn text-2xl font-bold text-[var(--ink)]">
              <AnnotatedText text={original.name} enabled={showPinyin} />
            </h3>
          </div>
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
        <div className="fade-in-up rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
          <div className="mb-3 flex justify-center">
            <HexagramFigure
              lines={changed.bits.map((b) => ({ yang: b === 1 }))}
              size="normal"
              showMarkers={false}
            />
          </div>
          <div className="mb-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="rounded-md bg-[var(--gold)] px-2 py-0.5 text-xs font-medium text-white">
                变卦
              </span>
              <h3 className="font-serif-cn text-2xl font-bold text-[var(--ink)]">
                <AnnotatedText text={changed.name} enabled={showPinyin} />
              </h3>
            </div>
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
