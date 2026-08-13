// 客户端本地存储：访问口令 + 占卦历史（localStorage）

export const KEY_STORAGE = "liuyao_access_key";
export const HISTORY_STORAGE = "liuyao_history_v1";
export const HISTORY_MAX = 50;
/** 历史记录变更事件：storage 变更后派发，页面监听刷新 */
export const HISTORY_EVENT = "liuyao-history-changed";

export interface HistoryEntry {
  id: string;
  ts: number;
  /** 六爻爻值（自下而上）6/7/8/9 */
  values: number[];
  originalName: string;
  originalImage: string;
  changedName?: string;
  changedImage?: string;
  question?: string;
  /** LLM 解析全文；未解卦或未完成时为 undefined */
  answer?: string;
  /** 解析是否因用户停止而中断 */
  truncated?: boolean;
}

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
    const list = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveHistory(list: HistoryEntry[]): void {
  window.localStorage.setItem(HISTORY_STORAGE, JSON.stringify(list));
}

/** 起卦完成时新增一条记录（尚无解析），返回记录 id */
export function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "ts">): string {
  const list = loadHistory();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  list.unshift({ ...entry, id, ts: Date.now() });
  saveHistory(list.slice(0, HISTORY_MAX));
  window.dispatchEvent(new Event(HISTORY_EVENT));
  return id;
}

/** 解析完成后回填 answer/question */
export function updateHistoryAnswer(
  id: string,
  answer: string,
  truncated: boolean,
  question?: string
): void {
  const list = loadHistory();
  const idx = list.findIndex((e) => e.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], answer, truncated, question: question ?? list[idx].question };
    saveHistory(list);
    window.dispatchEvent(new Event(HISTORY_EVENT));
  }
}

export function deleteHistoryEntry(id: string): void {
  saveHistory(loadHistory().filter((e) => e.id !== id));
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function clearHistory(): void {
  window.localStorage.removeItem(HISTORY_STORAGE);
  window.dispatchEvent(new Event(HISTORY_EVENT));
}
