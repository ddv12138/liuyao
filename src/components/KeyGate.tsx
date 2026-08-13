"use client";

// 整页访问门禁：输入恒定口令，校验通过后进入应用
import { useState } from "react";

export function KeyGate({ onUnlock }: { onUnlock: (key: string) => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const key = input.trim();
    if (!key) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "X-Api-Key": key },
      });
      if (res.ok) {
        onUnlock(key);
        return;
      }
      if (res.status === 500) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "服务端未配置访问口令，请联系部署者检查 ACCESS_KEY 环境变量");
      } else {
        setError("访问口令不正确，请重试");
      }
    } catch {
      setError("网络错误，无法连接服务器");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-8 shadow-sm fade-in-up">
        <div className="mb-2 text-center text-4xl">☰</div>
        <h1 className="mb-1 text-center font-serif-cn text-2xl font-bold text-[var(--ink)]">六爻占卦</h1>
        <p className="mb-6 text-center text-sm text-[var(--ink-soft)]">请输入访问口令进入</p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="访问口令"
          autoFocus
          className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-center text-base outline-none focus:border-[var(--gold)]"
        />
        {error && <p className="mt-3 text-center text-sm text-[var(--accent)]">{error}</p>}
        <button
          onClick={submit}
          disabled={busy || !input.trim()}
          className="mt-5 w-full rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white transition hover:bg-[var(--accent-dark)] disabled:opacity-50"
        >
          {busy ? "校验中…" : "进入"}
        </button>
      </div>
    </div>
  );
}
