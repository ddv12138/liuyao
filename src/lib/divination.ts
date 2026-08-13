// 六爻起卦核心逻辑（纯函数，前后端共用）
// 起卦法：三枚铜钱掷一次得一爻。背数 3→老阳(9·动) 2→少阴(8) 1→少阳(7) 0→老阴(6·动)
// 自下而上掷六次得本卦；动爻（老阳/老阴）翻转为变卦。

import { HEXAGRAMS, type Hexagram } from "@/lib/data/yijing";

export type YaoValue = 6 | 7 | 8 | 9;

export interface TossedYao {
  /** 6 老阴 / 7 少阳 / 8 少阴 / 9 老阳 */
  value: YaoValue;
  /** 阴阳：7/9 阳，6/8 阴 */
  yang: boolean;
  /** 是否动爻：6/9 */
  moving: boolean;
  label: "老阴" | "少阳" | "少阴" | "老阳";
  /** 背数 0-3 */
  backs: number;
  /** 三枚硬币各面：true=背，false=字 */
  coins: boolean[];
}

/** 掷一枚铜钱：50% 字 50% 背（Math.random，占卜用途足够） */
export function tossCoin(): boolean {
  return Math.random() < 0.5;
}

/** 掷三枚铜钱，得到一爻 */
export function tossYao(): TossedYao {
  const coins = [tossCoin(), tossCoin(), tossCoin()];
  const backs = coins.filter(Boolean).length;
  const value = (backs + 6) as YaoValue; // 0背→6老阴, 1背→7少阳, 2背→8少阴, 3背→9老阳
  const yang = value === 7 || value === 9;
  const moving = value === 6 || value === 9;
  const label = (
    value === 9 ? "老阳" : value === 8 ? "少阴" : value === 7 ? "少阳" : "老阴"
  ) as TossedYao["label"];
  return { value, yang, moving, label, backs, coins };
}

/** 由爻值(6/7/8/9)重建爻对象（服务端从客户端传值还原用） */
export function yaoFromValue(value: YaoValue): TossedYao {
  const yang = value === 7 || value === 9;
  const moving = value === 6 || value === 9;
  const label = (
    value === 9 ? "老阳" : value === 8 ? "少阴" : value === 7 ? "少阳" : "老阴"
  ) as TossedYao["label"];
  return { value, yang, moving, label, backs: (value - 6) as 0 | 1 | 2 | 3, coins: [] };
}

/** 爻值 → 阴阳位 (1=阳 0=阴) */
export function yaoToBit(yao: Pick<TossedYao, "yang">): 0 | 1 {
  return yao.yang ? 1 : 0;
}

const BY_BITS = new Map<string, Hexagram>(HEXAGRAMS.map((h) => [h.bits.join(""), h]));

/** 按六爻 bits（自下而上，1=阳 0=阴）查卦 */
export function hexagramByBits(bits: number[]): Hexagram | undefined {
  return BY_BITS.get(bits.join(""));
}

export interface CastResult {
  /** 本卦 */
  original: Hexagram;
  /** 动爻位置（自下而上 0-5） */
  moving: number[];
  /** 变卦；静卦（无动爻）为 null */
  changed: Hexagram | null;
  /** 六个爻（自下而上） */
  yaos: TossedYao[];
}

/**
 * 由六次掷爻结果成卦。
 * 本卦 = 六爻阴阳；变卦 = 翻转所有动爻后的卦；静卦无变卦。
 */
export function cast(yaos: TossedYao[]): CastResult | null {
  if (yaos.length !== 6) return null;
  const bits = yaos.map(yaoToBit);
  const original = hexagramByBits(bits);
  if (!original) return null;
  const moving = yaos.map((y, i) => (y.moving ? i : -1)).filter((i) => i >= 0);
  let changed: Hexagram | null = null;
  if (moving.length > 0) {
    const changedBits = bits.map((b, i) => (moving.includes(i) ? (b === 1 ? 0 : 1) : b));
    changed = hexagramByBits(changedBits) ?? null;
  }
  return { original, moving, changed, yaos };
}

export type InterpretationGuide = {
  rule: string;
  primary: string[];
  secondary: string[];
  changedStatic: number[];
};

/**
 * 依动爻数确定《周易》变爻取辞法的主次材料。
 * 位置均为自下而上 0-5；变卦静爻位置由 moving 的补集得到。
 */
export function getInterpretationGuide(result: CastResult): InterpretationGuide {
  const { original, changed, moving } = result;
  const count = moving.length;
  const movingNames = moving.map((i) => original.lines[i]?.name ?? `第${i + 1}爻`);
  const changedStatic = changed
    ? changed.lines
        .slice(0, 6)
        .map((_, i) => i)
        .filter((i) => !moving.includes(i))
    : [];

  if (count === 0) {
    return {
      rule: "无动爻：以本卦卦辞为断。",
      primary: ["本卦卦辞"],
      secondary: [],
      changedStatic,
    };
  }

  if (count === 1) {
    return {
      rule: `一爻动：以本卦${movingNames[0]}爻辞为主。`,
      primary: [`本卦${movingNames[0]}爻辞`],
      secondary: ["变卦卦辞（辅助趋势）"],
      changedStatic,
    };
  }

  if (count === 2) {
    const [lower, upper] = [...moving].sort((a, b) => a - b);
    const lowerName = original.lines[lower]?.name ?? `第${lower + 1}爻`;
    const upperName = original.lines[upper]?.name ?? `第${upper + 1}爻`;
    return {
      rule: `二爻动：以上爻（${upperName}）为主，下爻（${lowerName}）为辅。`,
      primary: [`本卦${upperName}爻辞`],
      secondary: [`本卦${lowerName}爻辞`, "变卦卦辞（辅助趋势）"],
      changedStatic,
    };
  }

  if (count === 3) {
    return {
      rule: "三爻动：以本卦卦辞与变卦卦辞共同判断。",
      primary: ["本卦卦辞", "变卦卦辞"],
      secondary: movingNames.map((name) => `本卦${name}爻辞（背景）`),
      changedStatic,
    };
  }

  if (count === 4) {
    const [lower, upper] = changedStatic.sort((a, b) => a - b);
    const lowerName = changed?.lines[lower]?.name ?? `第${lower + 1}爻`;
    const upperName = changed?.lines[upper]?.name ?? `第${upper + 1}爻`;
    return {
      rule: `四爻动：看变卦两个静爻，以下爻（${lowerName}）为主，上爻（${upperName}）为辅。`,
      primary: [`变卦${lowerName}爻辞`],
      secondary: [`变卦${upperName}爻辞`, "变卦卦辞（辅助趋势）"],
      changedStatic,
    };
  }

  if (count === 5) {
    const staticIndex = changedStatic[0];
    const staticName = changed?.lines[staticIndex]?.name ?? `第${staticIndex + 1}爻`;
    return {
      rule: `五爻动：以变卦唯一静爻（${staticName}）为主。`,
      primary: [`变卦${staticName}爻辞`],
      secondary: ["变卦卦辞（辅助趋势）"],
      changedStatic,
    };
  }

  const specialLine = original.name === "乾" ? "用九" : original.name === "坤" ? "用六" : null;
  return {
    rule: specialLine
      ? `六爻动：${original.name}卦取${specialLine}；变卦卦辞作趋势参考。`
      : "六爻动：以变卦卦辞为主。",
    primary: [specialLine ? `本卦${specialLine}爻辞` : "变卦卦辞"],
    secondary: [specialLine ? "变卦卦辞（辅助趋势）" : "本卦卦辞（背景）"],
    changedStatic,
  };
}

/** 爻位名 → 完整爻辞字符串（如 "初九 · 潜龙勿用。"） */
export function lineLabel(line: { name: string }): string {
  return line.name;
}
