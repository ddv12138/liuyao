// 解卦 prompt 构建（服务端）
import type { CastResult } from "@/lib/divination";

const SYSTEM_PROMPT = `你是一位深通《周易》的解卦师，擅长六爻占卜的解卦。你的任务是依据用户起得的卦象，结合卦辞、爻辞原文，给出清晰、真诚、有分寸的解析。

解卦时必须遵守：
1. 先以白话准确转述相关卦辞、爻辞原文的含义，再结合卦象结构与动爻位置引申其意。
2. 按固定结构输出（用 Markdown 二级标题分节）：
   ## 卦象总览
   ## 本卦卦辞解读
   ## 动爻爻辞解读（若有动爻，逐爻解读）
   ## 变卦提示（若有变卦）
   ## 结合你的问题（若用户提供了问题）
   ## 给你的建议
   若用户未提供问题，则省略"结合你的问题"一节，其余照常。
3. 动爻是卦象变化的关键，逐一解读每个动爻的爻辞，并说明变卦带来的趋势转变。
4. 不要作宿命式断言，不要恐吓或承诺结果；给建议时务实、鼓励、留有余地。
5. 全文用简体中文，语言现代直白但不失古典韵味；总长度 400～800 字。
6. 结尾固定加一行：> 以上解析仅供娱乐参考，请理性看待，决定权始终在你手中。`;

/** 由成卦结果 + 可选问题构建对话消息 */
export function buildInterpretMessages(
  cast: CastResult,
  question?: string
): { system: string; user: string } {
  const { original, changed, moving, yaos } = cast;

  // 爻辞行：自下而上
  const yaoLines = original.lines
    .map((l, i) => `${l.name}${yaos[i]?.moving ? "（动爻）" : ""}：${l.text}`)
    .join("\n");

  const parts: string[] = [];
  parts.push(`【本卦】${original.name}（${original.image}，${original.lower}下${original.upper}上）`);
  parts.push(`【本卦卦辞】${original.guaci}`);
  parts.push(`【六爻爻辞】\n${yaoLines}`);

  if (moving.length > 0 && changed) {
    parts.push(`【动爻位置】第${moving.map((i) => i + 1).join("、")}爻（自下而上数）`);
    parts.push(`【变卦】${changed.name}（${changed.image}）`);
    parts.push(`【变卦卦辞】${changed.guaci}`);
    // 变卦中对应动爻位置的变爻爻辞（传统解卦看变爻）
    const bianLines = moving
      .map((i) => {
        const l = changed.lines[i];
        return l ? `第${i + 1}爻 ${l.name}：${l.text}` : null;
      })
      .filter((s): s is string => s !== null);
    if (bianLines.length > 0) parts.push(`【变卦变爻爻辞】\n${bianLines.join("\n")}`);
  } else {
    parts.push("【卦象】静卦，无动爻，以本卦卦辞为断。");
  }

  if (question && question.trim().length > 0) {
    parts.push(`【所问之事】${question.trim()}`);
  }

  return { system: SYSTEM_PROMPT, user: parts.join("\n\n") };
}
