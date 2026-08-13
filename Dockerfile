# npm 镜像站（可选）：本机构建可用 --build-arg NPM_REGISTRY=https://registry.npmmirror.com 加速；
# 服务器构建不加参数则用官方源直连
ARG NPM_REGISTRY=https://registry.npmjs.org

# ---- 依赖 ----
FROM node:22-alpine AS deps
WORKDIR /app
ARG NPM_REGISTRY
COPY package.json package-lock.json ./
RUN npm ci --registry=$NPM_REGISTRY --no-audit --no-fund

# ---- 构建 ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- 运行（standalone）----
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
