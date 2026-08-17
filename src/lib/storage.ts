// 客户端本地存储：访问口令 + 占卦历史（localStorage）

import { cast, yaoFromValue, type CastResult, type YaoValue } from "@/lib/divination";

export const KEY_STORAGE = "liuyao_access_key";
export const HISTORY_STORAGE = "liuyao_history_v1";
export const HISTORY_MAX = 50;
/** 历史记录变更事件：storage 变更后派发，页面监听刷新 */
export const HISTORY_EVENT = "liuyao-history-changed";

export type HistoryStatus =
  | "pending"
  | "generating"
  | "completed"
  | "failed"
  | "interrupted";

export interface HistoryEntry {
  id: string;
  ts: number;
  /** 新记录保存完整成卦快照，旧记录没有此字段时由 values 重建。 */
  cast?: CastResult;
  /** 六爻爻值（自下而上）6/7/8/9 */
  values: number[];
  // 以下字段保留用于兼容 v1 数据和旧调用方；新记录同时从 cast 快照填充。
  originalName: string;
  originalImage: string;
  changedName?: string;
  changedImage?: string;
  question?: string;
  /** LLM 解析全文；未解卦或未完成时为空或 undefined */
  answer?: string;
  /** 当前解析状态 */
  status: HistoryStatus;
  /** 旧字段兼容：是否为不完整结果 */
  truncated?: boolean;
  /** 最近一次解析完成/失败/中断的时间 */
  interpretedAt?: number;
  /** 已发起的解析次数 */
  attempts?: number;
  /** 当前存储结构版本 */
  version: 2;
}

type HistoryEntryInput = Omit<
  HistoryEntry,
  "id" | "ts" | "version" | "status" | "truncated" | "interpretedAt" | "attempts"
> & {
  status?: HistoryStatus;
};

export function getAccessKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY_STORAGE);
}

export function setAccessKey(key: string): void {
  window.localStorage.setItem(KEY_STORAGE, key);
}

export function clearAccessKey(): void {
  window.localStorage.removeItem(KEY_STORAGE);
}

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    let migrated = false;
    const list = parsed
      .map((item) => {
        const normalized = normalizeEntry(item);
        if (normalized && JSON.stringify(normalized) !== JSON.stringify(item)) {
          migrated = true;
        }
        return normalized;
      })
      .filter((entry): entry is HistoryEntry => entry !== null)
      .slice(0, HISTORY_MAX);

    if (migrated) saveHistory(list);
    return list;
  } catch {
    return [];
  }
}

function saveHistory(list: HistoryEntry[]): void {
  try {
    window.localStorage.setItem(HISTORY_STORAGE, JSON.stringify(list));
  } catch {
    // 隐私模式、配额不足等情况下，页面仍应继续可用。
  }
}

function normalizeEntry(input: unknown): HistoryEntry | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Partial<HistoryEntry>;
  if (typeof value.id !== "string" || typeof value.ts !== "number") return null;
  if (!isValues(value.values)) return null;

  const rebuilt = cast(value.values.map((item) => yaoFromValue(item as YaoValue)));
  const snapshot = isCastResult(value.cast) ? value.cast : rebuilt ?? undefined;
  if (!snapshot && typeof value.originalName !== "string") return null;

  const answer = typeof value.answer === "string" ? value.answer : undefined;
  const status = value.status ?? inferLegacyStatus(answer, value.truncated);
  const originalName = value.originalName ?? snapshot?.original.name ?? "未知卦";
  const originalImage = value.originalImage ?? snapshot?.original.image ?? "";
  const changedName = value.changedName ?? snapshot?.changed?.name;
  const changedImage = value.changedImage ?? snapshot?.changed?.image;

  return {
    ...value,
    id: value.id,
    ts: value.ts,
    cast: snapshot,
    values: [...value.values],
    originalName,
    originalImage,
    changedName,
    changedImage,
    question: typeof value.question === "string" ? value.question : undefined,
    answer,
    status,
    truncated: status === "interrupted" || value.truncated === true,
    interpretedAt:
      typeof value.interpretedAt === "number" ? value.interpretedAt : undefined,
    attempts: typeof value.attempts === "number" ? value.attempts : 0,
    version: 2,
  };
}

function isValues(values: unknown): values is number[] {
  return (
    Array.isArray(values) &&
    values.length === 6 &&
    values.every(
      (value) =>
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 6 &&
        value <= 9,
    )
  );
}

function isCastResult(value: unknown): value is CastResult {
  if (!value || typeof value !== "object") return false;
  const castResult = value as CastResult;
  return (
    !!castResult.original &&
    Array.isArray(castResult.yaos) &&
    castResult.yaos.length === 6 &&
    Array.isArray(castResult.moving)
  );
}

function inferLegacyStatus(answer: string | undefined, truncated?: boolean): HistoryStatus {
  if (answer && !truncated) return "completed";
  if (truncated) return "interrupted";
  return "pending";
}

/** 起卦完成时新增一条记录（尚无解析），返回记录 id。 */
export function addHistoryEntry(entry: HistoryEntryInput): string {
  const list = loadHistory();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();
  const item: HistoryEntry = {
    ...entry,
    id,
    ts: now,
    version: 2,
    status: entry.status ?? "pending",
    attempts: 0,
  };
  list.unshift(item);
  saveHistory(list.slice(0, HISTORY_MAX));
  window.dispatchEvent(new Event(HISTORY_EVENT));
  return id;
}

/** 解析开始时记录状态，问题和尝试次数。 */
export function updateHistoryStatus(
  id: string,
  status: HistoryStatus,
  question?: string,
): void {
  const list = loadHistory();
  const idx = list.findIndex((entry) => entry.id === id);
  if (idx === -1) return;
  const current = list[idx];
  list[idx] = {
    ...current,
    status,
    question: question ?? current.question,
    attempts: status === "generating" ? (current.attempts ?? 0) + 1 : current.attempts,
    truncated: status === "interrupted",
  };
  saveHistory(list);
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

/** 解析结束后回填结果；一次起卦始终更新同一条历史记录。 */
export function updateHistoryAnswer(
  id: string,
  answer: string,
  status: Extract<HistoryStatus, "completed" | "failed" | "interrupted">,
  question?: string,
): void {
  const list = loadHistory();
  const idx = list.findIndex((entry) => entry.id === id);
  if (idx === -1) return;
  list[idx] = {
    ...list[idx],
    answer,
    status,
    truncated: status === "interrupted",
    question: question ?? list[idx].question,
    interpretedAt: Date.now(),
  };
  saveHistory(list);
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function getHistoryResult(entry: HistoryEntry): CastResult | null {
  if (entry.cast && isCastResult(entry.cast)) return entry.cast;
  if (!isValues(entry.values)) return null;
  return cast(entry.values.map((value) => yaoFromValue(value as YaoValue)));
}

export function getHistoryEntry(id: string): HistoryEntry | null {
  return loadHistory().find((entry) => entry.id === id) ?? null;
}

export function deleteHistoryEntry(id: string): void {
  saveHistory(loadHistory().filter((e) => e.id !== id));
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function clearHistory(): void {
  try {
    window.localStorage.removeItem(HISTORY_STORAGE);
  } catch {
    /* ignore storage errors */
  }
  window.dispatchEvent(new Event(HISTORY_EVENT));
}
