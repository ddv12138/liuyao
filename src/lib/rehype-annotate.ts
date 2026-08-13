import { getPinyin, type AnnotationMode } from "@/lib/pinyin";

type HastNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function textChildren(value: string, mode: AnnotationMode): HastNode[] {
  return Array.from(value, (char) => {
    const pinyin = getPinyin(char, mode);
    if (!pinyin) return { type: "text", value: char };
    return {
      type: "element",
      tagName: "ruby",
      properties: { className: ["ruby-annotated"] },
      children: [
        { type: "text", value: char },
        {
          type: "element",
          tagName: "rt",
          properties: {},
          children: [{ type: "text", value: pinyin }],
        },
      ],
    };
  });
}

function transformNode(
  node: HastNode,
  mode: AnnotationMode,
  quoteMode: AnnotationMode | undefined,
  parentTag?: string,
): void {
  if (
    !node.children ||
    parentTag === "code" ||
    parentTag === "pre" ||
    parentTag === "ruby" ||
    parentTag === "rt"
  )
    return;

  const activeMode = node.tagName === "blockquote" && quoteMode ? quoteMode : mode;
  const nextChildren: HastNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && child.value) {
      nextChildren.push(...textChildren(child.value, activeMode));
    } else {
      transformNode(child, activeMode, quoteMode, child.tagName ?? parentTag);
      nextChildren.push(child);
    }
  }
  node.children = nextChildren;
}

/** react-markdown 的 rehype 插件：只给可读文本节点中的表外字包 ruby。 */
export function rehypeAnnotate(
  options: {
    enabled?: boolean;
    mode?: AnnotationMode;
    quoteMode?: AnnotationMode;
  } = {},
) {
  return (tree: HastNode) => {
    if (options.enabled === false) return;
    transformNode(tree, options.mode ?? "modern", options.quoteMode);
  };
}
