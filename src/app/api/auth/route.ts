import {
  AUTH_COOKIE,
  createSessionToken,
  getAccessPassword,
  isAuthEnabled,
  verifyPassword,
} from "@/lib/auth";
import { NextResponse } from "next/server";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ ok: true });
  }

  const expected = getAccessPassword();
  if (!expected) {
    return NextResponse.json({ ok: true });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = body.password?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!password || !verifyPassword(password, expected)) {
    return NextResponse.json({ error: "Access denied" }, { status: 401 });
  }

  const token = await createSessionToken(expected);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, token, sessionCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
