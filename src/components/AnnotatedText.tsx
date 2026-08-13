import { annotateText, type AnnotationMode } from "@/lib/pinyin";

export function AnnotatedText({
  text,
  mode = "classical",
  enabled = true,
}: {
  text: string;
  mode?: AnnotationMode;
  enabled?: boolean;
}) {
  if (!enabled) return <>{text}</>;

  return (
    <>
      {annotateText(text, mode).map(({ text: char, pinyin }, index) =>
        pinyin ? (
          <ruby className="ruby-annotated" key={`${char}-${index}`}>
            {char}
            <rt>{pinyin}</rt>
          </ruby>
        ) : (
          <span key={`${char}-${index}`}>{char}</span>
        ),
      )}
    </>
  );
}
