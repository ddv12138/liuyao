# 六爻占卦

掷铜钱起卦（传统三枚铜钱法），自动成卦并展示《周易》卦辞/爻辞原文；可附上问题，由 DeepSeek 流式解卦。

## 功能

- **起卦**：每次点击掷三枚铜钱得一爻（背数 3/2/1/0 → 老阳9·动 / 少阴8 / 少阳7 / 老阴6·动），自下而上六次成卦；有铜钱动画；无重抛，可"放弃重起"
- **原文展示**（不涉及大模型）：
  - 静卦：本卦卦辞
  - 动卦：每个动爻爻辞 + 变卦卦辞 + 变卦对应位置的变爻爻辞
- **AI 解卦**：可选附上问题，后端调 DeepSeek（`deepseek-v4-flash`）SSE 流式返回，Markdown 渲染，可中途停止
- **鉴权**：整页门禁，恒定口令（`ACCESS_KEY`），每次请求带 `X-Api-Key` 头
- **历史**：存于浏览器 localStorage（上限 50 条），支持展开、单条删除、清空
- **移动端适配**

## 数据说明

64 卦卦辞 + 384 爻辞（含乾·用九、坤·用六）为文言原文，存放于 `src/lib/data/yijing.ts`。
整理流程：以 `liujuntao123/yijing` 仓库 JSON 为蓝本，与 Wikisource《周易》（王弼注本）逐卦比对，经 ctext.org 复核，修正了 20 余处讹误（如蒙卦"初噬告"→"初筮告"、讼卦"复自命"→"复即命"、坎卦"徽繹"→"徽纆"等）；版本分歧处从王弼注通行本（如革卦"巳日乃孚"）。

## 本地开发

```bash
cp .env.example .env.local   # 填入 DEEPSEEK_API_KEY 与 ACCESS_KEY
npm install
npm run dev                  # http://localhost:3000
```

```bash
npm run build
npm start                    # 生产模式
```

### 部署到 Cloudflare Workers（可选，与 Docker 二选一）

用 [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)（官方适配器，支持 Next.js 16，Node 运行时模式）。同一套代码，`wrangler.jsonc` / `open-next.config.ts` / `.dev.vars` / `public/_headers` 已就绪。

```bash
# 1) 登录（一次性）
npx wrangler login

# 2) 配置密钥（一次性，不写入仓库）
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put ACCESS_KEY

# 3) 本地预览（workerd 运行时，http://localhost:8787）
npm run preview

# 4) 部署
npm run deploy
```

- 部署后访问 `https://liuyao.<你的子域>.workers.dev`，或绑定自有域名（Cloudflare 控制台加自定义域即可，无需 nginx）。
- 代码里直接读 `process.env.DEEPSEEK_API_KEY` / `process.env.ACCESS_KEY`（Workers 的 nodejs_compat 会把 secret 注入 process.env）。
- 本机开发 `.dev.vars` 放本地密钥（已 gitignore）。
- **体积**：实测 gzip ≈ 1.2 MB，免费版 3 MiB 上限内。
- **流式**：Workers 对流式响应无时长硬上限（客户端不断开即可一直流）；DeepSeek 内容持续输出，不会触发 100 秒静默超时。
- 自动部署：`.github/workflows/deploy-cf.yml` 已就绪——push 到 `main` 即自动构建并发布到 Cloudflare（不构建 Docker）。首次使用需在 GitHub 仓库 Settings → Secrets and variables → Actions 配置四个 secret：
  - `CLOUDFLARE_API_TOKEN`：Cloudflare 控制台创建（Workers Scripts: Edit 权限）
  - `CLOUDFLARE_ACCOUNT_ID`：`wrangler whoami` 可查
  - `DEEPSEEK_API_KEY`、`ACCESS_KEY`：随部署注入 Worker secret
- 注意：适配器目前 pre-1.0，官方 2026 年内会迁移到 Next.js Adapter API，届时 `opennextjs-cloudflare` 升级即可。

### Docker

```bash
docker build -t liuyao .
# 国内/本机网络下可用镜像站加速：
docker build --build-arg NPM_REGISTRY=https://registry.npmmirror.com -t liuyao .

docker run -d --name liuyao -p 3000:3000 \
  -e DEEPSEEK_API_KEY=sk-xxx \
  -e ACCESS_KEY=your-access-key \
  liuyao
```

Docker 镜像构建不接入自动流水线（需要时在服务器上手动 `docker build`）。

### nginx 反代（HTTPS）

SSE 流式输出必须关闭缓冲，否则解析会卡住：

```nginx
server {
    listen 443 ssl http2;
    server_name your.domain.com;

    ssl_certificate     /path/fullchain.pem;
    ssl_certificate_key /path/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        proxy_cache off;
    }
}
```

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 是 | DeepSeek API 密钥（AI 解卦） |
| `ACCESS_KEY` | 是 | 页面访问口令（后端校验，与前端输入一致） |
| `DEEPSEEK_MODEL` | 否 | 模型 ID，默认 `deepseek-v4-flash` |

## 技术栈

Next.js 16（App Router）+ React 19 + Tailwind CSS 4 + TypeScript；DeepSeek 走 OpenAI 兼容接口（`https://api.deepseek.com`），SSE 流式转发。
