<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 六爻占卦（liuyao）

掷铜钱起卦的 Web 应用：前端起卦并展示《周易》卦辞/爻辞原文，后端把卦象组装成 prompt 调 DeepSeek 流式解卦。**前端全程无大模型参与**，大模型只出现在后端转发环节。UI 与输出均为简体中文。

## 代码地图

| 路径 | 职责 |
| --- | --- |
| `src/lib/data/yijing.ts` | 64 卦数据（唯一数据源） |
| `src/lib/divination.ts` | 起卦/成卦纯函数（前后端共用） |
| `src/lib/prompt.ts` | 解卦 prompt 构建（服务端） |
| `src/lib/deepseek.ts` | DeepSeek SSE 流式封装 |
| `src/lib/auth.ts` | ACCESS_KEY 鉴权 |
| `src/lib/storage.ts` / `sse.ts` | localStorage 历史 / 客户端 SSE 解析 |
| `src/app/api/interpret/route.ts` | SSE 解卦接口 |
| `src/app/api/verify/route.ts` | 门禁校验接口 |
| `src/components/` | UI（起卦区/卦象图/原文展示/AI 流式/门禁/历史） |

## 不可破坏的规则

**数据**：`yijing.ts` 只存文言原文（无白话译文），已对照王弼注本/ctext 校勘修正 20 余处讹误——**不要**从外部源重新导入或整批替换数据。乾/坤含用九/用六。bits 自下而上、1=阳。

**起卦**：三枚铜钱掷一次得一爻——背数 3/2/1/0 → 9老阳(动)/8少阴/7少阳/6老阴(动)。本卦=六爻阴阳；变卦=翻转动爻；静卦无变卦。**不允许重抛单爻**（占卜规矩），只能整卦"放弃重起"。

**解卦接口**：`POST /api/interpret`，body `{values: 6个爻值, question?}`，鉴权头 `X-Api-Key`；响应 SSE `data:{"content":"..."}` … `data:[DONE]`。prompt 固定分节（卦象总览/本卦卦辞解读/动爻爻辞解读/变卦提示/结合问题/建议，结尾免责声明）；模型 `deepseek-v4-flash`；跳过 `reasoning_content`。

## 环境变量

`DEEPSEEK_API_KEY`（必）、`ACCESS_KEY`（必，整页门禁口令）、`DEEPSEEK_MODEL`（可选）。注入方式：Cloudflare 用 wrangler secret；本地开发用 `.dev.vars`（Workers 预览）与 `.env.local`（next dev，本机已配好）；Docker 用 `-e`。

## 部署

- **主：Cloudflare Workers**（@opennextjs/cloudflare）。`npm run deploy` = 构建+部署；`npm run preview` = workerd 本地预览（:8787）。线上 https://liuyao.644077730.workers.dev；自动部署在 `.github/workflows/deploy-cf.yml`（push main 触发，只做 CF，不做 Docker）。
- **备：Docker standalone + nginx**（README 有配置；SSE 反代必须 `proxy_buffering off`）。

## Gotchas

- **本机代理**：`deepseek.ts` 双通道——存在 `http(s)_proxy` 环境变量时动态导入 undici 走代理（本机开发），否则全局 fetch（Workers/生产 Node）。改动时保持两条路径都可用，且 undici 不得静态导入（会进 Workers bundle）。
- **Workers 限制**：响应头不能设 `Connection`（已移除）；Worker gzip ≈1.2MB（免费 3MiB 内）；SSE 无时长上限、内容持续输出无需心跳。
- **React 19 lint**：effect 内同步 setState、渲染期 `Math.random` 都会被 eslint 拒绝——本项目用 setTimeout/事件驱动与渲染期派生规避（`page.tsx` 是范本，`CastArea` 起卦动画同）。
- **历史/门禁**：存 localStorage；历史变更由 `liuyao-history-changed` 事件驱动刷新（`storage.ts` 内派发，勿在组件里直接写 localStorage）。
- 改代码前先读上方 Next.js 16 官方提醒与 `node_modules/next/dist/docs/` 对应章节。

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues; use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five canonical triage labels as-is: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo using root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.
