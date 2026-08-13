// 访问口令校验（服务端）
// 恒定一个 key：部署时通过环境变量 ACCESS_KEY 注入；前端每次请求带 X-Api-Key 头

export function accessKeyConfigured(): boolean {
  return Boolean(process.env.ACCESS_KEY);
}

export function isAccessKeyValid(req: Request): boolean {
  const expected = process.env.ACCESS_KEY;
  if (!expected) return false;
  return req.headers.get("x-api-key") === expected;
}
