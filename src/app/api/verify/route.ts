import { NextResponse } from "next/server";
import { accessKeyConfigured, isAccessKeyValid } from "@/lib/auth";

export async function POST(request: Request) {
  if (!accessKeyConfigured()) {
    return NextResponse.json(
      { error: "服务端未配置 ACCESS_KEY 环境变量，无法进入" },
      { status: 500 }
    );
  }
  if (!isAccessKeyValid(request)) {
    return NextResponse.json({ error: "访问口令不正确" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
