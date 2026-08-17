import { describe, expect, it } from "vitest";
import { SseParser } from "@/lib/sse-parser";

describe("SseParser", () => {
  it("parses frames split across chunks and supports CRLF", () => {
    const parser = new SseParser();
    expect(parser.push("data: {\"content\":\"先" )).toEqual([]);
    expect(parser.push("行\"}\r\n\r\ndata: [DONE]\r\n\r\n")).toEqual([
      { data: '{"content":"先行"}' },
      { data: "[DONE]" },
    ]);
  });

  it("joins standard multi-line data fields", () => {
    const parser = new SseParser();
    expect(parser.push("data: first\ndata: second\n\n")).toEqual([
      { data: "first\nsecond" },
    ]);
  });

  it("flushes a final frame without a trailing blank line", () => {
    const parser = new SseParser();
    parser.push('data: {"content":"尾帧"}');
    expect(parser.end()).toEqual([{ data: '{"content":"尾帧"}' }]);
  });

  it("ignores comments and non-data fields", () => {
    const parser = new SseParser();
    expect(parser.push(": connected\nretry: 1000\n\n")).toEqual([]);
  });
});
