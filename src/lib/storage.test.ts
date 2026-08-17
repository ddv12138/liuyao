import { beforeEach, describe, expect, it } from "vitest";
import { cast, yaoFromValue } from "@/lib/divination";
import {
  addHistoryEntry,
  HISTORY_STORAGE,
  loadHistory,
  updateHistoryAnswer,
  updateHistoryStatus,
} from "@/lib/storage";

describe("history storage", () => {
  beforeEach(() => localStorage.clear());

  it("migrates legacy entries into complete cast snapshots", () => {
    localStorage.setItem(
      HISTORY_STORAGE,
      JSON.stringify([
        {
          id: "legacy",
          ts: 1700000000000,
          values: [7, 7, 7, 7, 7, 7],
          originalName: "乾",
          originalImage: "乾为天",
        },
      ]),
    );

    const [entry] = loadHistory();

    expect(entry.version).toBe(2);
    expect(entry.cast?.original.name).toBe("乾");
    expect(entry.status).toBe("pending");
    expect(JSON.parse(localStorage.getItem(HISTORY_STORAGE) ?? "[]")[0].cast).toBeTruthy();
  });

  it("keeps one cast record while tracking generation status and result", () => {
    const values = [7, 7, 7, 7, 7, 7] as const;
    const result = cast(values.map(yaoFromValue));
    if (!result) throw new Error("test cast should be valid");

    const id = addHistoryEntry({
      cast: result,
      values: [...values],
      originalName: result.original.name,
      originalImage: result.original.image,
    });
    updateHistoryStatus(id, "generating", "测试问题");
    expect(loadHistory()[0].attempts).toBe(1);
    updateHistoryAnswer(id, "## 解读", "completed", "测试问题");

    const [entry] = loadHistory();
    expect(entry.id).toBe(id);
    expect(entry.status).toBe("completed");
    expect(entry.answer).toBe("## 解读");
    expect(entry.question).toBe("测试问题");
  });
});
