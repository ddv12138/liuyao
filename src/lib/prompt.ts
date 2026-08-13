// 解卦 prompt 构建（服务端）
import {
  getInterpretationGuide,
  type CastResult,
} from "@/lib/divination";
import type { Hexagram } from "@/lib/data/yijing";

const SYSTEM_PROMPT = `你是一位深通《周易》的解卦师，擅长依六爻变爻取辞法解卦。你的任务是以卦辞、爻辞原文为依据，给出清晰、真诚、有分寸的解析。

必须遵守以下规则：
1. 严格按照用户提供的【传统取辞规则】区分主断依据与辅助依据，不得把所有材料平均解读。
2. 先引用或准确转述相关卦辞、爻辞，再解释本义，最后结合卦象、动爻位置和用户问题作有限推断。
3. 主要判断必须能追溯到主断原文；原文没有直接说出的内容，只能使用“提示”“可理解为”“可作……看”等非绝对措辞。
4. 不得编造卦辞之外的具体人物、事件、时间或结果，不作宿命式断言，不恐吓或承诺结果。
5. 引用《周易》原文时，必须单独使用 Markdown 引用块（每行以 > 开头），不要把古文和白话解释混在同一段。
6. 建议必须说明对应的辞意依据，避免泛泛的鸡汤或脱离卦辞的自由发挥。
7. 先用 1～2 句给出基于主断依据的简短卦象总览，再展开完整解读。
8. 按固定结构输出（使用 Markdown 二级标题）：
   ## 卦象总览
   ## 本卦卦辞解读
   ## 动爻与取辞解读（若有动爻）
   ## 变卦提示（若有变卦）
   ## 结合你的问题（若用户提供了问题）
   ## 给你的建议
   无用户问题时省略“结合你的问题”一节；无动爻时省略“动爻与取辞解读”；无变卦时省略“变卦提示”。
9. 全文用简体中文，语言现代直白但不失古典韵味；总长度控制在 400～800 字。
10. 结尾固定加一行：> 以上解析仅供娱乐参考，请理性看待，决定权始终在你手中。`;

function formatLine(hexagram: Hexagram, index: number): string {
  const line = hexagram.lines[index];
  return line ? `${line.name}：${line.text}` : `第${index + 1}爻：原文缺失`;
}

function formatMaterials(result: CastResult): {
  primary: string[];
  secondary: string[];
} {
  const { original, changed, moving } = result;
  const count = moving.length;

  if (count === 0) {
    return { primary: [`本卦卦辞：${original.guaci}`], secondary: [] };
  }

  if (count === 1) {
    return {
      primary: [formatLine(original, moving[0])],
      secondary: changed ? [`变卦卦辞：${changed.guaci}`] : [],
    };
  }

  if (count === 2) {
    const [lower, upper] = [...moving].sort((a, b) => a - b);
    return {
      primary: [formatLine(original, upper)],
      secondary: [
        formatLine(original, lower),
        ...(changed ? [`变卦卦辞：${changed.guaci}`] : []),
      ],
    };
  }

  if (count === 3) {
    return {
      primary: [
        `本卦卦辞：${original.guaci}`,
        ...(changed ? [`变卦卦辞：${changed.guaci}`] : []),
      ],
      secondary: moving.map((index) => `${formatLine(original, index)}（背景）`),
    };
  }

  const changedStatic = changed
    ? changed.lines
        .slice(0, 6)
        .map((_, index) => index)
        .filter((index) => !moving.includes(index))
        .sort((a, b) => a - b)
    : [];

  if (count === 4 && changed) {
    return {
      primary: [formatLine(changed, changedStatic[0])],
      secondary: [
        formatLine(changed, changedStatic[1]),
        `变卦卦辞：${changed.guaci}`,
      ],
    };
  }

  if (count === 5 && changed) {
    return {
      primary: [formatLine(changed, changedStatic[0])],
      secondary: [`变卦卦辞：${changed.guaci}`],
    };
  }

  const specialLine = original.name === "乾" ? 6 : original.name === "坤" ? 6 : -1;
  if (specialLine >= 0) {
    return {
      primary: [formatLine(original, specialLine)],
      secondary: changed ? [`变卦卦辞：${changed.guaci}`] : [],
    };
  }

  return {
    primary: changed ? [`变卦卦辞：${changed.guaci}`] : [],
    secondary: [`本卦卦辞：${original.guaci}`],
  };
}

/** 由成卦结果 + 可选问题构建对话消息 */
export function buildInterpretMessages(
  cast: CastResult,
  question?: string,
): { system: string; user: string } {
  const { original, changed, moving } = cast;
  const guide = getInterpretationGuide(cast);
  const materials = formatMaterials(cast);
  const parts: string[] = [];

  parts.push(`【传统取辞规则】${guide.rule}`);
  parts.push(`【主断依据】${guide.primary.join("；")}`);
  if (guide.secondary.length > 0) {
    parts.push(`【辅助依据】${guide.secondary.join("；")}`);
  }
  parts.push(`【本卦】${original.name}（${original.image}，${original.lower}下${original.upper}上）`);
  parts.push(`【本卦卦辞原文】${original.guaci}`);

  if (moving.length > 0 && changed) {
    parts.push(`【动爻位置】第${moving.map((i) => i + 1).join("、")}爻（自下而上数）`);
    parts.push(`【变卦】${changed.name}（${changed.image}，${changed.lower}下${changed.upper}上）`);
    parts.push(`【变卦卦辞原文】${changed.guaci}`);
    parts.push(`【主断原文】\n${materials.primary.join("\n")}`);
    if (materials.secondary.length > 0) {
      parts.push(`【辅助原文】\n${materials.secondary.join("\n")}`);
    }
  } else {
    parts.push("【卦象】静卦，无动爻，以本卦卦辞为断。");
    parts.push(`【主断原文】\n${materials.primary.join("\n")}`);
  }

  if (question && question.trim().length > 0) {
    parts.push(`【所问之事】${question.trim()}`);
  }

  return { system: SYSTEM_PROMPT, user: parts.join("\n\n") };
}
