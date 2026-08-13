import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// 应用不使用 Next.js 增量缓存/ISR，无需 R2
export default defineCloudflareConfig();
